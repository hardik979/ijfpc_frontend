"use client";

/**
 * Daily Staff Attendance — upload a biometric/HR Excel export and get back a
 * shareable PNG report card.
 *
 * The rule that drives everything: a person with both punches who worked less
 * than the half-day threshold (8h 30m by default) is a Half Day; at or above
 * it, a Full Day; a missing punch means Absent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import type * as XLSX from "xlsx";

import {
  type AttendanceStatus,
  DEFAULT_HALF_DAY_MINUTES,
  STATUS_LABEL,
  buildSummary,
  effectiveStatus,
  formatDateLabel,
  formatDuration,
  formatTime,
  sortRecords,
  todayKey,
} from "@/lib/attendance/attendance";
import {
  type ColumnMapping,
  type ParsedSheet,
  buildRecords,
  readSheet,
  readWorkbook,
} from "@/lib/attendance/parseWorkbook";
import {
  type CardData,
  renderAttendanceCard,
} from "@/lib/attendance/renderAttendanceCard";

const STATUS_CHIP: Record<AttendanceStatus, string> = {
  full: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  half: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  absent: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

/** "8:30" / "8.5" / "510" → minutes. Returns null on nonsense input. */
function parseThreshold(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const hhmm = raw.match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})$/);
  if (hhmm) {
    const minutes = Number(hhmm[2]);
    if (minutes > 59) return null;
    return Number(hhmm[1]) * 60 + minutes;
  }

  const decimal = Number(raw);
  if (!Number.isNaN(decimal) && decimal > 0) return Math.round(decimal * 60);

  return null;
}

export default function AttendanceDesignPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  const [mapping, setMapping] = useState<ColumnMapping>({
    name: -1,
    inTime: -1,
    outTime: -1,
    date: -1,
  });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState("8:30");

  const [brand, setBrand] = useState("IT Jobs Factory");
  const [title, setTitle] = useState("Daily Staff Attendance");
  const [logoText, setLogoText] = useState("IJF");
  const [footerNote, setFooterNote] = useState("IT Jobs Factory Automation");

  const [overrides, setOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [hidden, setHidden] = useState<string[]>([]);

  // Canvas text metrics depend on the webfont, so hold the first paint until
  // fonts have settled — otherwise the preview reflows once they land.
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const thresholdMin = parseThreshold(thresholdInput) ?? DEFAULT_HALF_DAY_MINUTES;
  const thresholdValid = parseThreshold(thresholdInput) !== null;

  const rawRecords = useMemo(() => {
    if (!sheet) return [];
    return buildRecords(sheet.rows, {
      mapping,
      dateKey: sheet.dateKeys.length > 0 ? dateKey : null,
      halfDayThresholdMin: thresholdMin,
    });
  }, [sheet, mapping, dateKey, thresholdMin]);

  const records = useMemo(() => {
    const hiddenSet = new Set(hidden);
    return sortRecords(
      rawRecords
        .filter((record) => !hiddenSet.has(record.id))
        .map((record) =>
          overrides[record.id] ? { ...record, manualStatus: overrides[record.id] } : record
        )
    );
  }, [rawRecords, overrides, hidden]);

  const summary = useMemo(() => buildSummary(records), [records]);

  const effectiveDateLabel = useMemo(
    () => formatDateLabel(dateKey ?? todayKey()),
    [dateKey]
  );

  const cardData: CardData = useMemo(
    () => ({
      brand,
      title,
      logoText,
      footerNote,
      dateLabel: effectiveDateLabel,
      records,
      summary,
    }),
    [brand, title, logoText, footerNote, effectiveDateLabel, records, summary]
  );

  useEffect(() => {
    if (!canvasRef.current || !fontsReady || records.length === 0) return;
    renderAttendanceCard(canvasRef.current, cardData);
  }, [cardData, fontsReady, records.length]);

  /* ── File handling ───────────────────────────────────────────── */

  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const book = await readWorkbook(file);
      if (book.SheetNames.length === 0) throw new Error("This workbook has no sheets.");

      const parsed = await readSheet(book, book.SheetNames[0]);

      setWorkbook(book);
      setSheet(parsed);
      setMapping(parsed.mapping);
      setDateKey(parsed.dateKeys[0] ?? null);
      setFileName(file.name);
      setOverrides({});
      setHidden([]);

      if (parsed.mapping.name < 0) {
        setError(
          "Couldn't spot a Name column — pick the right columns under Column mapping below."
        );
      } else if (parsed.mapping.inTime < 0 && parsed.mapping.outTime < 0) {
        setError(
          "Couldn't spot In/Out time columns — pick them under Column mapping below."
        );
      }
    } catch (err) {
      setSheet(null);
      setWorkbook(null);
      setError(
        err instanceof Error ? err.message : "Could not read that file. Is it a valid .xlsx/.csv?"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile]
  );

  const switchSheet = useCallback(
    async (name: string) => {
      if (!workbook) return;
      const parsed = await readSheet(workbook, name);
      setSheet(parsed);
      setMapping(parsed.mapping);
      setDateKey(parsed.dateKeys[0] ?? null);
      setOverrides({});
      setHidden([]);
    },
    [workbook]
  );

  const reset = useCallback(() => {
    setWorkbook(null);
    setSheet(null);
    setFileName("");
    setError(null);
    setOverrides({});
    setHidden([]);
    setDateKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  /* ── Export ──────────────────────────────────────────────────── */

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${dateKey ?? todayKey()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [dateKey]);

  const copyImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ClipboardItem === "undefined") {
      setError("Copying images isn't supported in this browser — use Download instead.");
      return;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard write was blocked — use Download instead.");
    }
  }, []);

  const hasData = records.length > 0;

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Attendance Report Builder
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Upload the daily punch export — anyone under{" "}
              <span className="font-semibold text-amber-300">
                {formatDuration(thresholdMin)}
              </span>{" "}
              is flagged as a half day.
            </p>
          </div>

          {sheet && (
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
                New file
              </button>
              <button
                onClick={copyImage}
                disabled={!hasData}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy image"}
              </button>
              <button
                onClick={downloadPng}
                disabled={!hasData}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </button>
            </div>
          )}
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-amber-300/70 hover:text-amber-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!sheet ? (
          <Dropzone
            dragging={dragging}
            loading={loading}
            inputRef={fileInputRef}
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onPick={(file) => void loadFile(file)}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            {/* ── Controls ─────────────────────────────────────── */}
            <div className="space-y-5">
              <Panel>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span className="truncate font-medium">{fileName}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {sheet.rows.length} data rows · {rawRecords.length} staff detected
                </p>

                {sheet.sheetNames.length > 1 && (
                  <Field label="Sheet">
                    <Select
                      value={sheet.activeSheet}
                      onChange={(name) => void switchSheet(name)}
                    >
                      {sheet.sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                {sheet.dateKeys.length > 0 && (
                  <Field label={`Date (${sheet.dateKeys.length} found)`}>
                    <Select value={dateKey ?? ""} onChange={(value) => setDateKey(value)}>
                      {sheet.dateKeys.map((key) => (
                        <option key={key} value={key}>
                          {formatDateLabel(key)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                <Field label="Half-day threshold (h:mm)">
                  <input
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    placeholder="8:30"
                    className={`w-full rounded-lg border bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:ring-2 ${
                      thresholdValid
                        ? "border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/30"
                        : "border-rose-500/50 focus:ring-rose-500/30"
                    }`}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Worked time below this is a Half Day. Missing In or Out = Absent.
                  </p>
                </Field>
              </Panel>

              <Panel>
                <SectionHeading icon={<Settings2 className="h-4 w-4 text-indigo-400" />}>
                  Column mapping
                </SectionHeading>
                <p className="-mt-1 mb-3 text-xs text-slate-500">
                  Auto-detected from the header row — correct anything that looks wrong.
                </p>

                {(
                  [
                    ["name", "Name"],
                    ["inTime", "In time"],
                    ["outTime", "Out time"],
                    ["date", "Date (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Select
                      value={String(mapping[key])}
                      onChange={(value) =>
                        setMapping((prev) => ({ ...prev, [key]: Number(value) }))
                      }
                    >
                      <option value="-1">— none —</option>
                      {sheet.headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={String(index)}>
                          {header}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </Panel>

              <Panel>
                <SectionHeading>Branding</SectionHeading>
                <Field label="Logo text">
                  <TextInput value={logoText} onChange={setLogoText} maxLength={4} />
                </Field>
                <Field label="Brand line">
                  <TextInput value={brand} onChange={setBrand} />
                </Field>
                <Field label="Title">
                  <TextInput value={title} onChange={setTitle} />
                </Field>
                <Field label="Footer note">
                  <TextInput value={footerNote} onChange={setFooterNote} />
                </Field>
              </Panel>

              {hasData && (
                <Panel>
                  <SectionHeading>
                    Overrides
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {records.length} rows
                    </span>
                  </SectionHeading>
                  <p className="-mt-1 mb-3 text-xs text-slate-500">
                    Force a status for leave, on-duty or field staff.
                  </p>

                  <div className="premium-scrollbar max-h-96 space-y-1.5 overflow-y-auto pr-1">
                    {records.map((record) => {
                      const status = effectiveStatus(record);
                      const overridden = Boolean(overrides[record.id]);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/40 px-2.5 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {record.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatTime(record.inMin)} → {formatTime(record.outMin)}
                              {record.totalMin !== null && ` · ${formatDuration(record.totalMin)}`}
                            </p>
                          </div>

                          <select
                            value={status}
                            onChange={(e) => {
                              const next = e.target.value as AttendanceStatus;
                              setOverrides((prev) => {
                                const draft = { ...prev };
                                if (next === record.status) delete draft[record.id];
                                else draft[record.id] = next;
                                return draft;
                              });
                            }}
                            className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold outline-none ${STATUS_CHIP[status]} ${
                              overridden ? "ring-1 ring-indigo-400/50" : ""
                            }`}
                          >
                            {(["full", "half", "absent"] as const).map((value) => (
                              <option key={value} value={value} className="bg-slate-900 text-slate-200">
                                {STATUS_LABEL[value]}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => setHidden((prev) => [...prev, record.id])}
                            title="Remove from report"
                            className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {hidden.length > 0 && (
                    <button
                      onClick={() => setHidden([])}
                      className="mt-3 text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      Restore {hidden.length} removed row{hidden.length > 1 ? "s" : ""}
                    </button>
                  )}
                </Panel>
              )}
            </div>

            {/* ── Preview ──────────────────────────────────────── */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <Panel>
                <SectionHeading>Preview</SectionHeading>
                {hasData ? (
                  <div className="premium-scrollbar max-h-[calc(100vh-13rem)] overflow-y-auto rounded-xl bg-slate-950/50 p-3">
                    <canvas
                      ref={canvasRef}
                      className="mx-auto block max-w-[772px] rounded-lg shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-slate-500">
                    No staff rows yet — check the column mapping on the left.
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Small presentational helpers ──────────────────────────────── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-xl backdrop-blur">
      {children}
    </section>
  );
}

function SectionHeading({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
      {icon}
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
    >
      {children}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <input
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
    />
  );
}

function Dropzone({
  dragging,
  loading,
  inputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onPick,
}: {
  dragging: boolean;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onPick: (file: File) => void;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`mx-auto flex max-w-2xl cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-8 py-20 text-center transition ${
        dragging
          ? "border-indigo-400 bg-indigo-500/10"
          : "border-white/15 bg-slate-900/40 hover:border-indigo-500/40 hover:bg-slate-900/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
        }}
      />

      {loading ? (
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      ) : (
        <div className="rounded-2xl bg-indigo-500/15 p-4">
          <Upload className="h-8 w-8 text-indigo-300" />
        </div>
      )}

      <p className="mt-5 text-lg font-semibold text-white">
        {loading ? "Reading workbook…" : "Drop the attendance export here"}
      </p>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        .xlsx, .xls or .csv with a name column and punch In / Out times. Columns are
        detected automatically and stay editable.
      </p>
    </div>
  );
}
