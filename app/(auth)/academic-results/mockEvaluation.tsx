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
} from "lucide-react";
import {
  formatDuration,
  formatIST,
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

function ReadinessRing({ value }: { value: number }) {
  const tone = toneFor(value, 100);
  const deg = Math.max(0, Math.min(100, value)) * 3.6;
  return (
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${tone.hex} ${deg}deg, #e5e7eb ${deg}deg)`,
        filter: `drop-shadow(0 0 8px ${tone.glow})`,
      }}
    >
      <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white">
        <span className={`text-lg font-bold ${tone.text}`}>
          {Math.round(value)}%
        </span>
      </div>
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
    <div className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-center">
      {/* soft colored halo behind the icon */}
      <span
        className="pointer-events-none absolute -top-5 h-16 w-16 rounded-full blur-2xl"
        style={{ background: tone.glow }}
      />
      <Icon
        className={`relative h-7 w-7 ${tone.text}`}
        style={{ filter: `drop-shadow(0 0 7px ${tone.glow})` }}
      />
      <span className="relative text-xs font-medium text-gray-600">{label}</span>
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
        <span className="text-gray-600">{label}</span>
        <span className={`font-semibold ${tone.text}`}>
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
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
      <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
      <p className="whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
        {text}
      </p>
    </div>
  );
}

export function MockEvaluationPanel({ interview }: { interview: MockAttemptRow }) {
  const d = interview.evaluationDetail;
  const level = mockInterviewLevel(interview);

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
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        {readiness != null && <ReadinessRing value={readiness} />}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {mockLevelBadge(level)}
            {meets != null &&
              (meets ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Meets bar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                  <XCircle className="h-3.5 w-3.5" /> Below bar
                </span>
              ))}
          </div>
          {verdict ? (
            <p className="text-sm text-gray-600">{verdict}</p>
          ) : (
            readiness == null &&
            interview.evaluation != null && (
              <p className="text-xs text-gray-500">
                Evaluation: {String(interview.evaluation)}
              </p>
            )
          )}
        </div>
      </div>

      {/* Subjects with glowing icons */}
      {subjects.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">
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
          <h4 className="text-sm font-semibold text-gray-800">
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
                className="text-blue-600 hover:underline"
              >
                Listen
              </a>
            ) : (
              "—"
            )
          }
        />
      </div>

      {summary && <TextBlock label="Summary" text={summary} />}
    </div>
  );
}
