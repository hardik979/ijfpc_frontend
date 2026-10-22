"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { API_LMS_URL } from "@/lib/api";
import { Upload, X, Check, Loader2, Music } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UploadRecording() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [leadId, setLeadId] = useState("");
  const [uploading, setUploading] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !leadId) return;

    try {
      setUploading(true);
      const token = await getToken();
      if (!token) throw new Error("No token");

      // Proxied through the backend (lms-backend uploads straight to R2 on
      // the server side) rather than a presigned direct-to-R2 PUT — see
      // routes/recording.routes.js's POST /upload there.
      const formData = new FormData();
      formData.append("userId", leadId);
      formData.append("files", file);

      const res = await fetch(`${API_LMS_URL}/api/recordings/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Upload failed: ${res.status}`);
      }

      setIsOpen(false);
      setFile(null);
      setLeadId("");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="glass-button flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload Recording
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-400" />
              Upload Recording
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Lead ID
                </label>
                <input
                  type="text"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  placeholder="e.g. LEAD-123"
                  className="glass-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Audio File
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className={`glass-input w-full py-8 flex flex-col items-center justify-center border-dashed ${file ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 hover:border-white/20"}`}
                  >
                    <Upload
                      className={`w-8 h-8 mb-2 ${file ? "text-indigo-400" : "text-slate-500"}`}
                    />
                    <span className="text-sm text-slate-400">
                      {file ? file.name : "Click to select or drag file here"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || !leadId || uploading}
                  className="glass-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
