"use client";

// Rich detail view for a single mock interview. Renders the structuredData
// rubric (readiness %, per-subject scores, competencies, verdict, strengths,
// summary). Subject scores (linux, sql, …) are shown as cards with a glowing,
// score-colored icon. Falls back to basic facts + summary for older records
// that have no evaluationDetail.
import React from "react";
import {
  Activity,
  Award,
  Cloud,
  Database,
  Network,
  Terminal,
  Workflow,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import {
  formatDuration,
  formatIST,
  hasVapiSummary,
  isMockInterviewUnanalyzed,
  mockInterviewLevel,
  type MockAttemptRow,
} from "./data";
import { DetailRow } from "./ui";
import { mockLevelBadge } from "./columns";

type IconType = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

const ACRONYMS = new Set([
  "sql",
  "itil",
  "aws",
  "api",
  "etl",
  "ml",
  "os",
  "ci",
  "cd",
  "hr",
]);

// Subject (the part before "_score") → an evocative icon.
const SUBJECT_ICONS: Record<string, IconType> = {
  linux: Terminal,
  shell: Terminal,
  sql: Database,
  database: Database,
  monitoring: Activity,
  observability: Activity,
  itil: Workflow,
  process: Workflow,
  network: Network,
  networking: Network,
  cloud: Cloud,
};

function prettyLabel(key: string): string {
  const base = key.replace(/_score$/i, "").replace(/_/g, " ").trim();
  return base
    .split(/\s+/)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

function subjectIcon(key: string): IconType {
  return SUBJECT_ICONS[key.replace(/_score$/i, "").toLowerCase()] ?? Award;
}

// Score → color tone. Driven by ratio so it works for both 0–5 and 0–100.
function toneFor(score: number, max: number) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.7)
    return { text: "text-emerald-500", bar: "bg-emerald-500", hex: "#10b981", glow: "rgba(16,185,129,0.55)" };
  if (pct >= 0.5)
    return { text: "text-amber-500", bar: "bg-amber-500", hex: "#f59e0b", glow: "rgba(245,158,11,0.55)" };
  return { text: "text-rose-500", bar: "bg-rose-500", hex: "#f43f5e", glow: "rgba(244,63,94,0.55)" };
}

// Donut is drawn with a radial mask instead of an opaque inner disc, so the
// hole shows the card behind it — correct on both the light surface and the
// dark glass panel (an inner `bg-white` used to punch a white hole in dark).
const RING_MASK =
  "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px))";

function ReadinessRing({ value }: { value: number }) {
  const tone = toneFor(value, 100);
  const deg = Math.max(0, Math.min(100, value)) * 3.6;
  return (
    // Outer wrapper carries the glow: `filter` is applied before `mask`, so the
    // drop-shadow has to live on a parent or the mask would clip it away.
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center"
      style={{ filter: `drop-shadow(0 0 8px ${tone.glow})` }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${tone.hex} ${deg}deg, var(--panel-border-strong) ${deg}deg)`,
          WebkitMask: RING_MASK,
          mask: RING_MASK,
        }}
      />
      <span className={`relative text-lg font-bold ${tone.text}`}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

function SubjectCard({
  label,
  score,
  max,
  Icon,
}: {
  label: string;
  score: number;
  max: number;
  Icon: IconType;
}) {
  const tone = toneFor(score, max);
  return (
    <div className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] p-3 text-center">
      {/* soft colored halo behind the icon */}
      <span
        className="pointer-events-none absolute -top-5 h-16 w-16 rounded-full blur-2xl"
        style={{ background: tone.glow }}
      />
      <Icon
        className={`relative h-7 w-7 ${tone.text}`}
        style={{ filter: `drop-shadow(0 0 7px ${tone.glow})` }}
      />
      <span className="relative text-xs font-medium text-[var(--panel-text-muted)]">
        {label}
      </span>
      <span className={`relative text-sm font-bold ${tone.text}`}>
        {score}/{max}
      </span>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const tone = toneFor(score, max);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--panel-text-secondary)]">{label}</span>
        <span className={`font-semibold ${tone.text}`}>
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${Math.min(100, (score / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-[var(--panel-text-primary)]">
        {label}
      </p>
      <p className="whitespace-pre-line rounded-lg border border-[var(--panel-border)] bg-[var(--panel-card-soft)] p-3 text-sm leading-relaxed text-[var(--panel-text-secondary)]">
        {text}
      </p>
    </div>
  );
}

// Shown when Vapi returned no analysis at all. Makes it explicit that this is a
// provider-side failure, not a poor performance by the student.
function VapiUnavailableNotice({ hasRecording }: { hasRecording: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--panel-bg-900)] text-[var(--panel-text-muted)]">
        <Info className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--panel-text-primary)]">
          Analysis unavailable
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--panel-text-secondary)]">
          The interview provider didn’t return an evaluation for this attempt.
          This is a processing issue on the provider’s side and does{" "}
          <span className="font-medium">not</span> reflect the student’s
          performance — the attempt simply could not be scored.
          {hasRecording
            ? " You can still review the recording below to assess it manually."
            : ""}
        </p>
      </div>
    </div>
  );
}

// Call metadata (type, duration, status, timing, recording) — shared by the
// full evaluation view and the "analysis unavailable" fallback.
function CallFacts({ interview }: { interview: MockAttemptRow }) {
  return (
    <div>
      <DetailRow label="Interview Type" value={interview.interviewType ?? "—"} />
      <DetailRow label="Duration" value={formatDuration(interview.durationSeconds)} />
      <DetailRow
        label="Status"
        value={interview.completed ? "Completed" : "Incomplete"}
      />
      <DetailRow label="Ended Reason" value={interview.endedReason ?? "—"} />
      <DetailRow label="Started" value={formatIST(interview.startedAt)} />
      <DetailRow label="Ended" value={formatIST(interview.endedAt)} />
      <DetailRow
        label="Recording"
        value={
          interview.recordingUrl ? (
            <a
              href={interview.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline dark:text-blue-300"
            >
              Listen
            </a>
          ) : (
            "—"
          )
        }
      />
    </div>
  );
}

export function MockEvaluationPanel({ interview }: { interview: MockAttemptRow }) {
  const d = interview.evaluationDetail;
  const level = mockInterviewLevel(interview);

  // Vapi produced nothing to grade: show a neutral notice + the call facts
  // instead of an empty rubric topped with a misleading "Needs work" badge.
  if (isMockInterviewUnanalyzed(interview)) {
    return (
      <div className="space-y-5">
        <VapiUnavailableNotice hasRecording={Boolean(interview.recordingUrl)} />
        <CallFacts interview={interview} />
      </div>
    );
  }

  // Numeric rubric fields, split into subjects (*_score) and competencies.
  const numeric = d
    ? Object.entries(d).filter(
        ([k, v]) => typeof v === "number" && k !== "readiness_percent"
      )
    : [];
  const subjects = numeric.filter(([k]) => /_score$/i.test(k));
  const competencies = numeric.filter(([k]) => !/_score$/i.test(k));
  // Scores are usually 0–5; bump to 0–10 if any value exceeds 5.
  const scoreMax = numeric.some(([, v]) => (v as number) > 5) ? 10 : 5;

  const readiness =
    typeof d?.readiness_percent === "number" ? d.readiness_percent : null;
  const meets = typeof d?.meets_threshold === "boolean" ? d.meets_threshold : null;
  const verdict = typeof d?.verdict === "string" ? d.verdict : null;
  const strengths = typeof d?.strengths === "string" ? d.strengths : null;
  const summary =
    (typeof d?.summary === "string" && d.summary) || interview.summaryPreview || "";

  return (
    <div className="space-y-5">
      {/* Header: readiness ring + level / threshold + verdict */}
      <div className="flex items-center gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] p-4">
        {readiness != null && <ReadinessRing value={readiness} />}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {mockLevelBadge(level)}
            {meets != null &&
              (meets ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:ring-emerald-400/30">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Meets bar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/15 dark:ring-rose-400/30">
                  <XCircle className="h-3.5 w-3.5" /> Below bar
                </span>
              ))}
          </div>
          {verdict ? (
            <p className="text-sm leading-relaxed text-[var(--panel-text-secondary)]">
              {verdict}
            </p>
          ) : (
            readiness == null &&
            interview.evaluation != null && (
              <p className="text-xs text-[var(--panel-text-muted)]">
                Evaluation: {String(interview.evaluation)}
              </p>
            )
          )}
        </div>
      </div>

      {/* Subjects with glowing icons */}
      {subjects.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--panel-text-primary)]">
            Subject proficiency
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {subjects.map(([k, v]) => (
              <SubjectCard
                key={k}
                label={prettyLabel(k)}
                score={v as number}
                max={scoreMax}
                Icon={subjectIcon(k)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Competency bars */}
      {competencies.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-sm font-semibold text-[var(--panel-text-primary)]">
            Interview competencies
          </h4>
          <div className="space-y-2.5">
            {competencies.map(([k, v]) => (
              <ScoreBar
                key={k}
                label={prettyLabel(k)}
                score={v as number}
                max={scoreMax}
              />
            ))}
          </div>
        </section>
      )}

      {strengths && <TextBlock label="Strengths" text={strengths} />}

      {/* Call facts */}
      <CallFacts interview={interview} />

      {/* Only show a real summary — never the "No summary from Vapi" placeholder. */}
      {hasVapiSummary(summary) && <TextBlock label="Summary" text={summary} />}
    </div>
  );
}
