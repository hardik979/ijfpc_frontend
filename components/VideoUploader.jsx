"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Upload, X, Check, Loader2, Pause, Play, AlertTriangle } from "lucide-react";

const CHUNK_SIZE = 64 * 1024 * 1024; // must stay a multiple of 262144 bytes
const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];
const MAX_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10GB
const STORAGE_PREFIX = "video-upload:";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function isRetryableStatus(status) {
  return status === 408 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isSessionExpiredStatus(status) {
  return status === 404 || status === 410;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function storageKey(batchId, name, size, lastModified) {
  return `${STORAGE_PREFIX}${batchId}:${name}:${size}:${lastModified}`;
}

function readLocalRecord(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalRecord(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

function clearLocalRecord(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// Sends one chunk, retrying transient failures with exponential backoff.
// Resolves to { status: 308 } for an intermediate chunk or
// { status: 200|201, body } with the Drive file resource for the final chunk.
async function putChunkWithRetry({ sessionUri, chunk, start, end, total, signal }) {
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(sessionUri, {
        method: "PUT",
        signal,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${total}`,
        },
        body: chunk,
      });

      if (response.status === 308) {
        return { status: 308 };
      }
      if (response.status === 200 || response.status === 201) {
        const body = await response.json();
        return { status: response.status, body };
      }
      if (isSessionExpiredStatus(response.status)) {
        const err = new Error("Upload session expired");
        err.code = "SESSION_EXPIRED";
        throw err;
      }
      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }

      const errText = await response.text().catch(() => "");
      throw new Error(`Chunk upload failed with status ${response.status}: ${errText}`);
    } catch (err) {
      if (err.name === "AbortError" || err.code === "SESSION_EXPIRED") throw err;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

// Asks Drive how many bytes it has actually confirmed, so a resume never
// re-sends already-confirmed bytes.
async function probeOffset({ sessionUri, total, signal }) {
  let response;
  try {
    response = await fetch(sessionUri, {
      method: "PUT",
      signal,
      headers: {
        "Content-Range": `bytes */${total}`,
      },
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error(`Network error while checking upload status: ${err.message}`);
  }

  if (response.status === 308) {
    const range = response.headers.get("range");
    if (!range) return { offset: 0 };
    const match = /bytes=0-(\d+)/.exec(range);
    return { offset: match ? Number(match[1]) + 1 : 0 };
  }
  if (response.status === 200 || response.status === 201) {
    const body = await response.json();
    return { done: true, body };
  }
  if (isSessionExpiredStatus(response.status)) {
    const err = new Error("Upload session expired");
    err.code = "SESSION_EXPIRED";
    throw err;
  }

  const errText = await response.text().catch(() => "");
  throw new Error(`Failed to check upload status: ${response.status} ${errText}`);
}

export default function VideoUploader({ batchId, onUploadComplete }) {
  const { getToken } = useAuth();

  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | starting | uploading | paused | finishing | done | error
  const [errorMessage, setErrorMessage] = useState("");
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [speedBps, setSpeedBps] = useState(0);
  const [result, setResult] = useState(null);

  const assetIdRef = useRef(null);
  const sessionUriRef = useRef(null);
  const storageKeyRef = useRef(null);
  const controlRef = useRef({ paused: false, cancelled: false, abortController: null });
  const speedSampleRef = useRef({ time: null, bytes: 0, smoothed: 0 });

  const totalBytes = file?.size ?? 0;
  const percent = totalBytes > 0 ? Math.min(100, (bytesUploaded / totalBytes) * 100) : 0;
  const remainingBytes = Math.max(0, totalBytes - bytesUploaded);
  const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : Infinity;

  const resetAll = useCallback(() => {
    controlRef.current = { paused: false, cancelled: false, abortController: null };
    speedSampleRef.current = { time: null, bytes: 0, smoothed: 0 };
    assetIdRef.current = null;
    sessionUriRef.current = null;
    storageKeyRef.current = null;
    setFile(null);
    setPhase("idle");
    setErrorMessage("");
    setBytesUploaded(0);
    setSpeedBps(0);
    setResult(null);
  }, []);

  const recordSpeedSample = useCallback((bytes) => {
    const now = Date.now();
    const sample = speedSampleRef.current;
    if (sample.time != null) {
      const dtSeconds = (now - sample.time) / 1000;
      const dBytes = bytes - sample.bytes;
      if (dtSeconds > 0.05 && dBytes >= 0) {
        const instantBps = dBytes / dtSeconds;
        sample.smoothed = sample.smoothed === 0 ? instantBps : sample.smoothed * 0.6 + instantBps * 0.4;
        setSpeedBps(sample.smoothed);
      }
    }
    sample.time = now;
    sample.bytes = bytes;
  }, []);

  const handleSessionExpired = useCallback(() => {
    if (storageKeyRef.current) clearLocalRecord(storageKeyRef.current);
    assetIdRef.current = null;
    sessionUriRef.current = null;
    setPhase("error");
    setErrorMessage("Upload session expired. Please restart the upload.");
  }, []);

  const finalizeUpload = useCallback(
    async (driveFileBody) => {
      const driveFileId = driveFileBody?.id;
      if (!driveFileId) {
        setPhase("error");
        setErrorMessage("Drive did not return a file id for the completed upload");
        return;
      }

      setPhase("finishing");

      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(
          `${API_BASE_URL}/api/videos/${assetIdRef.current}/complete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ driveFileId }),
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Failed to finalize upload (${response.status})`);
        }

        const asset = await response.json();
        if (storageKeyRef.current) clearLocalRecord(storageKeyRef.current);
        setBytesUploaded(totalBytes);
        setResult(asset);
        setPhase("done");
        onUploadComplete?.(asset);
      } catch (err) {
        setPhase("error");
        setErrorMessage(err.message || "Failed to finalize upload");
      }
    },
    [getToken, onUploadComplete, totalBytes]
  );

  const runUpload = useCallback(async () => {
    const currentFile = file;
    if (!currentFile || !sessionUriRef.current || !assetIdRef.current) return;

    const total = currentFile.size;
    controlRef.current.paused = false;
    setPhase("uploading");
    setErrorMessage("");

    try {
      const probeController = new AbortController();
      controlRef.current.abortController = probeController;

      let probeResult;
      try {
        probeResult = await probeOffset({
          sessionUri: sessionUriRef.current,
          total,
          signal: probeController.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          setPhase(controlRef.current.cancelled ? "idle" : "paused");
          return;
        }
        if (err.code === "SESSION_EXPIRED") {
          handleSessionExpired();
          return;
        }
        throw err;
      }

      if (probeResult.done) {
        await finalizeUpload(probeResult.body);
        return;
      }

      let offset = probeResult.offset;
      setBytesUploaded(offset);
      recordSpeedSample(offset);

      while (offset < total) {
        if (controlRef.current.cancelled) {
          setPhase("idle");
          return;
        }
        if (controlRef.current.paused) {
          setPhase("paused");
          return;
        }

        const end = Math.min(offset + CHUNK_SIZE, total) - 1;
        const chunk = currentFile.slice(offset, end + 1);

        const chunkController = new AbortController();
        controlRef.current.abortController = chunkController;

        let chunkResult;
        try {
          chunkResult = await putChunkWithRetry({
            sessionUri: sessionUriRef.current,
            chunk,
            start: offset,
            end,
            total,
            signal: chunkController.signal,
          });
        } catch (err) {
          if (err.name === "AbortError") {
            setPhase(controlRef.current.cancelled ? "idle" : "paused");
            return;
          }
          if (err.code === "SESSION_EXPIRED") {
            handleSessionExpired();
            return;
          }
          throw err;
        }

        if (chunkResult.status === 308) {
          offset = end + 1;
          setBytesUploaded(offset);
          recordSpeedSample(offset);
          continue;
        }

        await finalizeUpload(chunkResult.body);
        return;
      }
    } catch (err) {
      setPhase("error");
      setErrorMessage(err.message || "Upload failed");
    }
  }, [file, finalizeUpload, handleSessionExpired, recordSpeedSample]);

  const handleFileChange = useCallback(
    async (e) => {
      const selected = e.target.files?.[0];
      e.target.value = "";
      if (!selected) return;

      resetAll();

      if (!selected.type.startsWith("video/")) {
        setErrorMessage("Please choose a video file");
        setPhase("error");
        return;
      }
      if (selected.size > MAX_SIZE_BYTES) {
        setErrorMessage("File exceeds the 10GB limit");
        setPhase("error");
        return;
      }
      if (!batchId) {
        setErrorMessage("Missing batchId for this upload");
        setPhase("error");
        return;
      }

      setFile(selected);

      const key = storageKey(batchId, selected.name, selected.size, selected.lastModified);
      storageKeyRef.current = key;
      const stored = readLocalRecord(key);
      if (!stored?.assetId) return;

      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/videos/${stored.assetId}/session`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 404 || response.status === 409 || response.status === 410) {
            clearLocalRecord(key);
          }
          return;
        }

        const data = await response.json();
        assetIdRef.current = stored.assetId;
        sessionUriRef.current = data.sessionUri;
      } catch {
        // couldn't recover the old session — user can just start a fresh one
      }
    },
    [batchId, getToken, resetAll]
  );

  const handlePrimaryAction = useCallback(async () => {
    if (!file) return;

    if (sessionUriRef.current && assetIdRef.current) {
      runUpload();
      return;
    }

    setPhase("starting");
    setErrorMessage("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api/videos/upload-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          batchId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to start upload (${response.status})`);
      }

      const { assetId, sessionUri } = await response.json();
      assetIdRef.current = assetId;
      sessionUriRef.current = sessionUri;
      if (storageKeyRef.current) {
        writeLocalRecord(storageKeyRef.current, { assetId });
      }

      runUpload();
    } catch (err) {
      setPhase("error");
      setErrorMessage(err.message || "Failed to start upload");
    }
  }, [file, batchId, getToken, runUpload]);

  const handlePause = useCallback(() => {
    controlRef.current.paused = true;
    controlRef.current.abortController?.abort();
  }, []);

  const handleCancel = useCallback(() => {
    controlRef.current.cancelled = true;
    controlRef.current.abortController?.abort();
    if (storageKeyRef.current) clearLocalRecord(storageKeyRef.current);
    resetAll();
  }, [resetAll]);

  const statusLabel = useMemo(() => {
    switch (phase) {
      case "starting":
        return "Starting upload session...";
      case "uploading":
        return "Uploading...";
      case "paused":
        return "Paused";
      case "finishing":
        return "Finalizing...";
      case "done":
        return "Upload complete";
      case "error":
        return "Error";
      default:
        return file ? "Ready to upload" : "No file selected";
    }
  }, [phase, file]);

  return (
    <div className="glass-card w-full max-w-lg p-6 space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Upload className="w-5 h-5 text-indigo-400" />
        Upload Video
      </h2>

      {phase === "idle" || phase === "error" ? (
        <div className="relative group">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className={`glass-input w-full py-8 flex flex-col items-center justify-center border-dashed ${
              file ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 hover:border-white/20"
            }`}
          >
            <Upload className={`w-8 h-8 mb-2 ${file ? "text-indigo-400" : "text-slate-500"}`} />
            <span className="text-sm text-slate-400">
              {file ? file.name : "Click to select a video file"}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-300 truncate">{file?.name}</div>
      )}

      {phase === "error" && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {(phase === "uploading" || phase === "paused" || phase === "finishing" || phase === "done") &&
        file && (
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{percent.toFixed(1)}%</span>
              <span>
                {formatMB(bytesUploaded)} MB / {formatMB(totalBytes)} MB
              </span>
            </div>
            {phase === "uploading" && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>{(speedBps / (1024 * 1024)).toFixed(2)} MB/s</span>
                <span>ETA {formatEta(etaSeconds)}</span>
              </div>
            )}
          </div>
        )}

      <div className="text-xs text-slate-500">{statusLabel}</div>

      {phase === "done" && result && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
          <Check className="w-4 h-4 shrink-0" />
          <span>Uploaded successfully</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {(phase === "idle" || phase === "error") && file && (
          <button onClick={handlePrimaryAction} className="glass-button flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {assetIdRef.current ? "Resume Upload" : "Start Upload"}
          </button>
        )}

        {phase === "starting" && (
          <button disabled className="glass-button opacity-50 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Starting...
          </button>
        )}

        {phase === "uploading" && (
          <>
            <button onClick={handlePause} className="glass-button flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </>
        )}

        {phase === "paused" && (
          <>
            <button onClick={handlePrimaryAction} className="glass-button flex items-center gap-2">
              <Play className="w-4 h-4" />
              Resume
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </>
        )}

        {phase === "finishing" && (
          <button disabled className="glass-button opacity-50 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finalizing...
          </button>
        )}

        {phase === "done" && (
          <button onClick={resetAll} className="glass-button flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Another
          </button>
        )}
      </div>
    </div>
  );
}
