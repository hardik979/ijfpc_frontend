"use client";

// Rich, schema-flexible detail view for a single AI HR / Real HR call analysis.
//
// Two analysis shapes flow through here:
//
//  • AI HR calling (lms-backend workers/transcription.worker.js):
//      { overallRating: "good"|"average"|"bad", scoreOutOf10, confidence,
//        summary, reason, questionWiseAnalysis[], strengths[], weaknesses[],
//        improvementNeeded, whatToImprove[], recommendedTraining[], flags[] }
//
//  • Real HR recordings (analysis on the Recording doc):
//      { outcome, outcomeCode, confidence, summary, followUpRequired,
//        followUpAction, keyDetails{ studentName, hrName, callDuration,
//        languageUsed }, areasOfImprovement{ overallCallQuality,
//        improvementNeeded, issues[]{ category, problem, whyItMatters,
//        suggestion, evidenceQuote }, hrPerformanceFeedback,
//        studentResponseFeedback }, flags[] }
//
// Every recognized field gets a purpose-built block; anything left over renders
// as tidy key/value rows — so neither source ever drops to a raw JSON blob.
import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Languages,
  Lightbulb,
  MessageSquareText,
  Target,
  ThumbsDown,
  ThumbsUp,
  User,
  UserCog,
} from "lucide-react";

/* ───────────────────────────── value coercion ──────────────────────────── */
function asString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}
function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function asBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "yes", "1"].includes(s)) return true;
    if (["false", "no", "0"].includes(s)) return false;
  }
  return null;
}
function asStringList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => asString(x)).filter((s): s is string => !!s);
  }
  const single = asString(v);
  return single ? [single] : [];
}
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function prettyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/* ───────────────────────────── rating tones ────────────────────────────── */
type Tone = {
  text: string;
  bg: string;
  ring: string;
  dot: string;
  hex: string;
  glow: string;
};
const TONE_GOOD: Tone = { text: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", hex: "#10b981", glow: "rgba(16,185,129,0.55)" };
const TONE_MID: Tone = { text: "text-amber-600", bg: "bg-amber-50 text-amber-700", ring: "ring-amber-200", dot: "bg-amber-500", hex: "#f59e0b", glow: "rgba(245,158,11,0.55)" };
const TONE_BAD: Tone = { text: "text-rose-600", bg: "bg-rose-50 text-rose-700", ring: "ring-rose-200", dot: "bg-rose-500", hex: "#f43f5e", glow: "rgba(244,63,94,0.55)" };
const TONE_NEUTRAL: Tone = { text: "text-slate-600", bg: "bg-slate-100 text-slate-700", ring: "ring-slate-200", dot: "bg-slate-400", hex: "#64748b", glow: "rgba(100,116,139,0.45)" };

// Map a free-text rating / outcome word to a tone. Negative is tested first so
// "not interested" doesn't trip the "interested" branch.
function toneForRating(value: string): Tone {
  const t = value.toLowerCase().replace(/_/g, " ");
  if (/\b(bad|poor|negative|weak|not interested|rejected|no answer|no response|wrong number|disconnected|fail)\b/.test(t))
    return TONE_BAD;
  if (/\b(good|excellent|positive|strong|interested|interview|callback|follow.?up|resume|selected|shortlisted|scheduled|success)\b/.test(t))
    return TONE_GOOD;
  if (/\b(average|neutral|medium|moderate|info shared|incomplete)\b/.test(t))
    return TONE_MID;
  return TONE_NEUTRAL;
}
function toneForScore(score: number, max: number): Tone {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.7) return TONE_GOOD;
  if (pct >= 0.45) return TONE_MID;
  return TONE_BAD;
}

/* ───────────────────────────── small pieces ────────────────────────────── */
function ScoreRing({ score, max }: { score: number; max: number }) {
  const tone = toneForScore(score, max);
  const pct = Math.max(0, Math.min(100, max > 0 ? (score / max) * 100 : 0));
  const deg = pct * 3.6;
  return (
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${tone.hex} ${deg}deg, #e5e7eb ${deg}deg)`,
        filter: `drop-shadow(0 0 8px ${tone.glow})`,
      }}
    >
      <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white">
        <span className={`text-base font-bold leading-none ${tone.text}`}>
          {score}
          <span className="text-[10px] font-medium text-gray-500">/{max}</span>
        </span>
      </div>
    </div>
  );
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.bg} ring-1 ${tone.ring}`}>
      {children}
    </span>
  );
}

function TextBlock({
  label,
  text,
  Icon,
  accent = "text-gray-700",
}: {
  label: string;
  text: string;
  Icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div>
      <p className={`mb-1 flex items-center gap-1.5 text-sm font-medium ${accent}`}>
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </p>
      <p className="whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
        {text}
      </p>
    </div>
  );
}

function ListSection({
  title,
  items,
  Icon,
  tone,
}: {
  title: string;
  items: string[];
  Icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <Icon className={`h-4 w-4 ${tone.text}`} />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-600">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────── follow-up action callout ───────────────────────── */
function FollowUpCallout({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-white p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <Target className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Next action <ArrowRight className="h-3.5 w-3.5" />
        </p>
        <p className="mt-0.5 text-sm font-medium leading-relaxed text-gray-900">
          {text}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────────── key details grid ─────────────────────────── */
function KeyDetailsGrid({ details }: { details: Record<string, unknown> }) {
  const fields: { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "studentName", label: "Student", Icon: User },
    { key: "hrName", label: "HR / Caller", Icon: UserCog },
    { key: "callDuration", label: "Call duration", Icon: Clock },
    { key: "languageUsed", label: "Language", Icon: Languages },
  ];
  const present = fields
    .map((f) => ({ ...f, value: asString(details[f.key]) }))
    .filter((f) => f.value);
  if (present.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {present.map(({ key, label, Icon, value }) => (
        <div key={key} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-gray-800" title={value!}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── improvement issue cards ──────────────────────── */
type IssueItem = {
  category?: string;
  problem?: string;
  whyItMatters?: string;
  suggestion?: string;
  evidenceQuote?: string;
};

function IssueCards({ items }: { items: IssueItem[] }) {
  const issues = items.filter(
    (it) => asString(it.problem) || asString(it.category) || asString(it.suggestion)
  );
  if (issues.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Areas to improve
        <span className="text-xs font-normal text-gray-500">({issues.length})</span>
      </h4>
      <div className="space-y-2.5">
        {issues.map((it, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <div className="border-l-[3px] border-amber-400 p-3.5">
              {asString(it.category) && (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                  {asString(it.category)}
                </span>
              )}
              {asString(it.problem) && (
                <p className="mt-2 text-sm font-medium leading-relaxed text-gray-900">
                  {asString(it.problem)}
                </p>
              )}
              {asString(it.whyItMatters) && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  <span className="font-semibold text-gray-600">Why it matters: </span>
                  {asString(it.whyItMatters)}
                </p>
              )}
              {asString(it.suggestion) && (
                <p className="mt-2 flex gap-1.5 rounded-lg bg-emerald-50 p-2.5 text-xs leading-relaxed text-emerald-800">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>
                    <span className="font-semibold">Suggestion: </span>
                    {asString(it.suggestion)}
                  </span>
                </p>
              )}
              {asString(it.evidenceQuote) && (
                <p className="mt-2 border-l-2 border-gray-200 pl-2 text-xs italic leading-relaxed text-gray-500">
                  “{asString(it.evidenceQuote)}”
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── question-wise Q&A cards (AI HR) ─────────────────── */
type QwaItem = {
  agentQuestion?: string;
  studentAnswer?: string;
  answerQualityReason?: string;
  improvement?: string;
};

function QuestionCards({ items }: { items: QwaItem[] }) {
  const qs = items.filter((q) => asString(q.agentQuestion) || asString(q.studentAnswer));
  if (qs.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <MessageSquareText className="h-4 w-4 text-indigo-500" />
        Question-wise analysis
        <span className="text-xs font-normal text-gray-500">({qs.length})</span>
      </h4>
      <div className="space-y-2.5">
        {qs.map((q, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-3.5">
            <p className="flex gap-2 text-sm font-medium text-gray-900">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600">
                {i + 1}
              </span>
              <span>{asString(q.agentQuestion) ?? "—"}</span>
            </p>
            {asString(q.studentAnswer) != null ? (
              <p className="mt-2 rounded-lg bg-gray-50 p-2.5 text-sm leading-relaxed text-gray-600">
                <span className="font-medium text-gray-500">Answer: </span>
                {asString(q.studentAnswer)}
              </p>
            ) : (
              <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-600">
                No answer given.
              </p>
            )}
            {asString(q.answerQualityReason) && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                {asString(q.answerQualityReason)}
              </p>
            )}
            {asString(q.improvement) && (
              <p className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-amber-700">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {asString(q.improvement)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────── flags ─────────────────────────────────── */
// Flags come as either string[] (Real HR) or { flag, evidenceQuote }[] (AI HR).
function FlagsSection({ items }: { items: unknown[] }) {
  const flags = items
    .map((f) => {
      if (typeof f === "string") return { flag: f.trim(), evidenceQuote: null as string | null };
      const r = asRecord(f);
      return r ? { flag: asString(r.flag), evidenceQuote: asString(r.evidenceQuote) } : null;
    })
    .filter((f): f is { flag: string; evidenceQuote: string | null } => !!f && !!f.flag);
  if (flags.length === 0) return null;
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
        Flags
      </h4>
      <div className="space-y-2">
        {flags.map((f, i) => (
          <div key={i} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm font-medium text-rose-700">{f.flag}</p>
            {f.evidenceQuote && (
              <p className="mt-1 border-l-2 border-rose-300 pl-2 text-xs italic leading-relaxed text-rose-600">
                “{f.evidenceQuote}”
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────── generic fallback for extra keys ─────────────────── */
const KNOWN_KEYS = new Set([
  "overallRating", "rating", "scoreOutOf10", "score", "confidence",
  "summary", "reason", "questionWiseAnalysis", "strengths", "weaknesses",
  "improvementNeeded", "whatToImprove", "recommendedTraining", "flags",
  "outcome", "outcomeCode", "callOutcome", "sentiment", "result", "followUpRequired",
  "followUpAction", "keyDetails", "areasOfImprovement",
]);

function GenericFields({ data }: { data: Record<string, unknown> }) {
  const extra = Object.entries(data).filter(
    ([k, v]) => !KNOWN_KEYS.has(k) && v != null && v !== ""
  );
  if (extra.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h4 className="text-sm font-semibold text-gray-800">Other details</h4>
      <div className="rounded-lg border border-gray-200 bg-white">
        {extra.map(([k, v]) => {
          const list = Array.isArray(v) ? asStringList(v) : null;
          return (
            <div
              key={k}
              className="flex items-start justify-between gap-4 border-b border-gray-100 px-3 py-2 last:border-0"
            >
              <span className="text-sm text-gray-500">{prettyLabel(k)}</span>
              <span className="max-w-[60%] text-right text-sm font-medium text-gray-800">
                {list && list.length
                  ? list.join(", ")
                  : typeof v === "object"
                  ? JSON.stringify(v)
                  : String(v)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ──────────────────────────────── panel ─────────────────────────────────── */
export function CallAnalysisPanel({ analysis }: { analysis: unknown }) {
  // A plain-string analysis (older records) — just show it as a summary.
  if (typeof analysis === "string") {
    const text = analysis.trim();
    return text ? <TextBlock label="Analysis" text={text} /> : <NoAnalysis />;
  }
  if (!analysis || typeof analysis !== "object") return <NoAnalysis />;

  const data = analysis as Record<string, unknown>;
  const aoi = asRecord(data.areasOfImprovement) ?? {};

  // Rating: AI HR uses overallRating; Real HR carries overallCallQuality.
  const ratingRaw =
    asString(data.overallRating) ??
    asString(data.rating) ??
    asString(aoi.overallCallQuality);
  const score = asNumber(data.scoreOutOf10) ?? asNumber(data.score);
  const confidence = asString(data.confidence);
  const summary = asString(data.summary);
  const reason = asString(data.reason);
  const outcome = asString(data.outcomeCode) ?? asString(data.outcome) ?? asString(data.callOutcome);
  const sentiment = asString(data.sentiment);
  const improvementNeeded =
    asBool(data.improvementNeeded) ?? asBool(aoi.improvementNeeded);
  const followUpRequired = asBool(data.followUpRequired);
  const followUpAction = asString(data.followUpAction);

  const keyDetails = asRecord(data.keyDetails);
  const strengths = asStringList(data.strengths);
  const weaknesses = asStringList(data.weaknesses);
  const whatToImprove = asStringList(data.whatToImprove);
  const recommendedTraining = asStringList(data.recommendedTraining);
  const qwa = Array.isArray(data.questionWiseAnalysis)
    ? (data.questionWiseAnalysis as QwaItem[])
    : [];
  const issues = Array.isArray(aoi.issues) ? (aoi.issues as IssueItem[]) : [];
  const hrFeedback = asString(aoi.hrPerformanceFeedback);
  const studentFeedback = asString(aoi.studentResponseFeedback);
  const flags = Array.isArray(data.flags) ? (data.flags as unknown[]) : [];

  const ratingTone = ratingRaw ? toneForRating(ratingRaw) : null;
  const hasHeader = ratingRaw || score != null || outcome || sentiment || confidence;

  return (
    <div className="space-y-5">
      {/* Header: score ring + rating / outcome / confidence chips */}
      {hasHeader && (
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {score != null && <ScoreRing score={score} max={10} />}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {ratingRaw && ratingTone && (
                <Chip tone={ratingTone}>
                  {ratingTone === TONE_GOOD ? (
                    <ThumbsUp className="h-3.5 w-3.5" />
                  ) : ratingTone === TONE_BAD ? (
                    <ThumbsDown className="h-3.5 w-3.5" />
                  ) : null}
                  {prettyLabel(ratingRaw)}
                </Chip>
              )}
              {outcome && <Chip tone={toneForRating(outcome)}>{prettyLabel(outcome)}</Chip>}
              {sentiment && <Chip tone={toneForRating(sentiment)}>{prettyLabel(sentiment)}</Chip>}
              {confidence && (
                <Chip tone={TONE_NEUTRAL}>{prettyLabel(confidence)} confidence</Chip>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {improvementNeeded != null &&
                (improvementNeeded ? (
                  <Chip tone={TONE_MID}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Improvement needed
                  </Chip>
                ) : (
                  <Chip tone={TONE_GOOD}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> On track
                  </Chip>
                ))}
              {followUpRequired != null &&
                (followUpRequired ? (
                  <Chip tone={TONE_MID}>Follow-up required</Chip>
                ) : (
                  <Chip tone={TONE_NEUTRAL}>No follow-up</Chip>
                ))}
            </div>
          </div>
        </div>
      )}

      {followUpAction && <FollowUpCallout text={followUpAction} />}

      {keyDetails && <KeyDetailsGrid details={keyDetails} />}

      {summary && <TextBlock label="Summary" text={summary} />}
      {reason && <TextBlock label="Reason" text={reason} />}

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ListSection title="Strengths" items={strengths} Icon={ThumbsUp} tone={TONE_GOOD} />
          <ListSection title="Weaknesses" items={weaknesses} Icon={ThumbsDown} tone={TONE_BAD} />
        </div>
      )}

      <ListSection title="What to improve" items={whatToImprove} Icon={Lightbulb} tone={TONE_MID} />
      <ListSection
        title="Recommended training"
        items={recommendedTraining}
        Icon={GraduationCap}
        tone={TONE_NEUTRAL}
      />

      <IssueCards items={issues} />
      <QuestionCards items={qwa} />

      {(hrFeedback || studentFeedback) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {studentFeedback && (
            <TextBlock
              label="Student response"
              text={studentFeedback}
              Icon={User}
              accent="text-blue-700"
            />
          )}
          {hrFeedback && (
            <TextBlock
              label="HR performance"
              text={hrFeedback}
              Icon={UserCog}
              accent="text-violet-700"
            />
          )}
        </div>
      )}

      <FlagsSection items={flags} />
      <GenericFields data={data} />
    </div>
  );
}

function NoAnalysis() {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
      No analysis available for this call yet.
    </div>
  );
}
