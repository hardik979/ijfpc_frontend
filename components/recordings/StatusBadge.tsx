import { RecordingStatus } from "@/lib/types";

const map: Record<RecordingStatus, { label: string; cls: string }> = {
  UPLOADING: {
    label: "Uploading",
    cls: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  },
  UPLOADED: {
    label: "Uploaded",
    cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  TRANSCRIBING: {
    label: "Transcribing",
    cls: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  },
  CLEANING: {
    label: "Cleaning",
    cls: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  },
  ANALYZING: {
    label: "Analyzing",
    cls: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  },
  DONE: {
    label: "Done",
    cls: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  },
  FAILED: {
    label: "Failed",
    cls: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  },
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
