import { apiGet } from "@/lib/api";
import { Recording } from "@/lib/types";
import AudioPlayer from "@/components/recording/AudioPlayer";
import TranscriptTabs from "@/components/recording/TranscriptTabs";
import AnalysisCard from "@/components/recording/AnalysisCard";
import StatusBadge from "@/components/recordings/StatusBadge";
import Link from "next/link";

type Resp = { ok: boolean; recording: Recording };

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiGet<Resp>(`/recordings/${id}`);
  const r = data.recording;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/staff/recordings"
            className="text-sm text-slate-600 hover:underline"
          >
            ← Back to recordings
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {r.leadId} <span className="text-slate-400">/</span>{" "}
            {r.agentId || "—"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <StatusBadge status={r.status} />
            <span>Created: {fmtDate(r.createdAt)}</span>
            {r.sizeBytes ? (
              <span>Size: {Math.round(r.sizeBytes / 1024)} KB</span>
            ) : null}
          </div>
        </div>
      </div>

      {r.status === "FAILED" && r.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold">Processing failed</div>
          <div className="mt-1">{r.error}</div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AudioPlayer src={r.publicUrl} />
        <AnalysisCard analysis={r.analysis} />
      </div>

      <TranscriptTabs raw={r.transcriptRaw} clean={r.transcriptClean} />
    </div>
  );
}
