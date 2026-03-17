import { RecordingStatus } from "@/lib/types";

const map: Record<RecordingStatus, { label: string; cls: string }> = {
  UPLOADING: { label: "Uploading", cls: "bg-slate-100 text-slate-700" },
  UPLOADED: { label: "Uploaded", cls: "bg-blue-100 text-blue-700" },
  TRANSCRIBING: { label: "Transcribing", cls: "bg-amber-100 text-amber-800" },
  CLEANING: { label: "Cleaning", cls: "bg-amber-100 text-amber-800" },
  ANALYZING: { label: "Analyzing", cls: "bg-amber-100 text-amber-800" },
  DONE: { label: "Done", cls: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Failed", cls: "bg-rose-100 text-rose-800" },
};

export default function StatusBadge({ status }: { status: RecordingStatus }) {
  const m = map[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
