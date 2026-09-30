"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

export type PerformanceRange = "weekly" | "monthly" | "all";

/** The slice of the student-details API response this chart reads. */
export interface PerformanceSource {
  academicDetails?: {
    attempts?: {
      totalMarksObtained?: number;
      totalMarksPossible: number;
      attemptedAt: string;
    }[];
  };
  megaTestData?: {
    attempts?: {
      percentage?: number;
      obtainedMarks?: number;
      totalMarks?: number;
      evaluatedAt?: string | null;
    }[];
  };
  mockInterviewData?: {
    attempts?: {
      date?: string | null;
      createdAt?: string | null;
      startedAt?: string | null;
      percentage?: number;
      totalQuestions?: number;
      summary?: string;
      feedback?: string;
    }[];
  };
  callingAgentData?: {
    started_at?: string | null;
    analysis?: { scoreOutOf10?: number } | null;
  }[];
}

type Category = "quiz" | "megaTest" | "mock" | "aiCall";

interface ScorePoint {
  category: Category;
  at: Date;
  /** 0–100 */
  pct: number;
}

// Colours are the dataviz reference palette's dark steps, in its fixed slot
// order, validated (CVD + contrast) against the dashboard's slate surface.
// Keep the order if you add a series — it is what keeps adjacent lines
// distinguishable for colour-blind viewers.
const OVERALL_COLOR = "#3987e5";
const CATEGORIES: {
  key: Category;
  label: string;
  color: string;
  measures: string;
}[] = [
  { key: "quiz", label: "Daily Quiz", color: "#d95926", measures: "marks obtained ÷ marks possible" },
  { key: "megaTest", label: "Mega Test", color: "#199e70", measures: "evaluated mega test percentage" },
  { key: "mock", label: "Mock Interview", color: "#c98500", measures: "correct answers ÷ questions asked" },
  { key: "aiCall", label: "AI HR Call", color: "#d55181", measures: "AI rubric score out of 10, × 10" },
];

const RANGES: { key: PerformanceRange; label: string }[] = [
  { key: "weekly", label: "Last 7 days" },
  { key: "monthly", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

// Same cut-offs as getGrade in StudentDashboard: A/A+ ≥ 75, B/C 45–74, D < 45.
const STRONG_AT = 75;
const AT_RISK_BELOW = 45;

// Fixed status colours — used only where the colour *means* good/bad, and
// always alongside an icon and a word, never on their own.
const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors hasVapiSummary in StudentDashboard: a mock attempt with no Vapi
// report was never graded, so its 0% must not drag the average down.
const NO_VAPI_SUMMARY = "no summary from vapi";

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clampPct = (n: number) => Math.min(100, Math.max(0, n));

function validDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function relativeDays(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return formatShortDate(d);
}

/** Flatten every scored academic activity into one list of 0–100 points. */
function collectScores(src: PerformanceSource | null | undefined): ScorePoint[] {
  const points: ScorePoint[] = [];
  if (!src) return points;

  for (const a of src.academicDetails?.attempts ?? []) {
    const at = validDate(a.attemptedAt);
    // Absent (no marks) is not a 0 — same rule as the quiz modal.
    if (!at || a.totalMarksObtained == null || !(a.totalMarksPossible > 0)) continue;
    points.push({
      category: "quiz",
      at,
      pct: clampPct((a.totalMarksObtained / a.totalMarksPossible) * 100),
    });
  }

  for (const m of src.megaTestData?.attempts ?? []) {
    const at = validDate(m.evaluatedAt);
    if (!at) continue;
    const pct =
      typeof m.percentage === "number"
        ? m.percentage
        : m.totalMarks && m.obtainedMarks != null
          ? (m.obtainedMarks / m.totalMarks) * 100
          : null;
    if (pct == null || !Number.isFinite(pct)) continue;
    points.push({ category: "megaTest", at, pct: clampPct(pct) });
  }

  for (const m of src.mockInterviewData?.attempts ?? []) {
    const at = validDate(m.date || m.createdAt || m.startedAt);
    const text = (m.feedback || m.summary || "").trim().toLowerCase();
    const graded = text.length > 0 && text !== NO_VAPI_SUMMARY;
    if (!at || !graded || !m.totalQuestions || typeof m.percentage !== "number") continue;
    points.push({ category: "mock", at, pct: clampPct(m.percentage) });
  }

  for (const c of src.callingAgentData ?? []) {
    const at = validDate(c.started_at);
    const score = c.analysis?.scoreOutOf10;
    if (!at || typeof score !== "number" || !Number.isFinite(score)) continue;
    points.push({ category: "aiCall", at, pct: clampPct(score * 10) });
  }

  return points.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function categoryAvg(points: ScorePoint[], key: Category): number | null {
  const xs = points.filter((p) => p.category === key).map((p) => p.pct);
  return xs.length ? avg(xs) : null;
}

/**
 * A student's overall score is the mean of their per-category averages, so a
 * student who sat 30 quizzes and one mega test isn't judged almost entirely on
 * quizzes.
 */
function overallOf(points: ScorePoint[]): number | null {
  const perCategory = CATEGORIES.map((c) => categoryAvg(points, c.key)).filter(
    (v): v is number => v != null
  );
  return perCategory.length ? avg(perCategory) : null;
}

interface Band {
  label: string;
  icon: string;
  color: string;
  note: string;
}

function bandOf(pct: number | null): Band | null {
  if (pct == null) return null;
  if (pct >= STRONG_AT)
    return { label: "Strong", icon: "✓", color: STATUS.good, note: "Performing at A-grade level" };
  if (pct >= AT_RISK_BELOW)
    return { label: "Developing", icon: "!", color: STATUS.warning, note: "On track, with room to improve" };
  return { label: "Needs attention", icon: "▲", color: STATUS.critical, note: "Below the 45% at-risk line" };
}

interface Windows {
  current: ScorePoint[];
  previous: ScorePoint[];
  /** How the delta is described, e.g. "vs previous 7 days". */
  compareLabel: string;
  /** How the period is described in the summary sentence. */
  periodLabel: string;
}

/**
 * The period being shown and the one it is compared against. Weekly/monthly
 * compare with the equal-length window just before; all-time compares the
 * student's latest 30 days of activity with their first 30 — "how far have
 * they come since joining".
 */
function windowsFor(points: ScorePoint[], range: PerformanceRange): Windows {
  if (range !== "all") {
    const days = range === "weekly" ? 7 : 30;
    const now = Date.now();
    const start = now - days * DAY_MS;
    const prevStart = start - days * DAY_MS;
    return {
      current: points.filter((p) => p.at.getTime() >= start),
      previous: points.filter((p) => p.at.getTime() >= prevStart && p.at.getTime() < start),
      compareLabel: `vs previous ${days} days`,
      periodLabel: `in the last ${days} days`,
    };
  }

  if (!points.length) {
    return { current: [], previous: [], compareLabel: "", periodLabel: "overall" };
  }
  const first = points[0].at.getTime();
  const last = points[points.length - 1].at.getTime();
  const span = last - first;
  return {
    current: points,
    // Too short a history to compare "first month" with "latest month".
    previous: span >= 60 * DAY_MS ? points.filter((p) => p.at.getTime() <= first + 30 * DAY_MS) : [],
    compareLabel: "latest 30 days vs first 30 days",
    periodLabel: `since ${formatShortDate(points[0].at)}`,
  };
}

function latestWindowOverall(points: ScorePoint[]): number | null {
  if (!points.length) return null;
  const last = points[points.length - 1].at.getTime();
  return overallOf(points.filter((p) => p.at.getTime() >= last - 30 * DAY_MS));
}

type ChartRow = {
  label: string;
  overall: number | null;
  total: number;
} & Partial<Record<Category, number | null>> &
  Partial<Record<`${Category}Count`, number>>;

function buildRows(points: ScorePoint[], range: PerformanceRange): ChartRow[] {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  let keyOf: (d: Date) => string;

  if (range === "all") {
    if (!points.length) return [];
    keyOf = monthKey;
    const cursor = new Date(points[0].at.getFullYear(), points[0].at.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end) {
      buckets.push({
        key: monthKey(cursor),
        label: cursor.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    keyOf = dayKey;
    const days = range === "weekly" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({
        key: dayKey(d),
        label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      });
    }
  }

  const byBucket = new Map<string, ScorePoint[]>();
  for (const p of points) {
    const k = keyOf(p.at);
    const list = byBucket.get(k);
    if (list) list.push(p);
    else byBucket.set(k, [p]);
  }

  return buckets.map(({ key, label }) => {
    const inBucket = byBucket.get(key) ?? [];
    const overall = overallOf(inBucket);
    const row: ChartRow = {
      label,
      overall: overall == null ? null : round1(overall),
      total: inBucket.length,
    };
    for (const c of CATEGORIES) {
      const xs = inBucket.filter((p) => p.category === c.key).map((p) => p.pct);
      row[c.key] = xs.length ? round1(avg(xs)) : null;
      row[`${c.key}Count`] = xs.length;
    }
    return row;
  });
}

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value == null) {
    return <p className="text-sm text-slate-400">Not enough history to compare yet</p>;
  }
  const flat = Math.abs(value) < 0.5;
  const up = value > 0;
  const color = flat ? "#94a3b8" : up ? STATUS.good : STATUS.critical;
  return (
    <p className="text-sm text-slate-300">
      <span className="font-semibold" style={{ color }}>
        {flat ? "● Steady" : `${up ? "▲ Up" : "▼ Down"} ${Math.abs(round1(value))} pts`}
      </span>{" "}
      <span className="text-slate-400">{label}</span>
    </p>
  );
}

function ChartTooltip({
  active,
  row,
  visible,
}: {
  active?: boolean;
  row?: ChartRow;
  visible: Set<Category>;
}) {
  if (!active || !row) return null;
  if (row.overall == null) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs text-slate-300 shadow-xl">
        <p className="font-semibold text-white">{row.label}</p>
        <p className="mt-1 text-slate-400">No graded activity</p>
      </div>
    );
  }
  const band = bandOf(row.overall);
  return (
    <div className="min-w-[220px] rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-white">{row.label}</p>
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-slate-800 pb-2">
        <span className="flex items-center gap-2 text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OVERALL_COLOR }} />
          Overall
        </span>
        <span className="font-bold tabular-nums text-white">
          {row.overall}%{" "}
          {band && (
            <span className="font-medium" style={{ color: band.color }}>
              {band.icon} {band.label}
            </span>
          )}
        </span>
      </div>
      {CATEGORIES.map((c) => {
        const v = row[c.key];
        const n = row[`${c.key}Count`] ?? 0;
        return (
          <div
            key={c.key}
            className={`flex items-center justify-between gap-4 py-0.5 ${
              visible.has(c.key) ? "" : "opacity-60"
            }`}
          >
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
            <span className="tabular-nums text-slate-200">
              {v == null ? "—" : `${v}%`}
              {n > 0 && <span className="ml-1 text-slate-500">({n})</span>}
            </span>
          </div>
        );
      })}
      <p className="mt-2 text-[11px] text-slate-500">
        {row.total} graded {row.total === 1 ? "activity" : "activities"}
      </p>
    </div>
  );
}

export default function StudentPerformanceChart({
  data,
  studentName,
}: {
  /** Must be the UNFILTERED (all-time) student-details response. */
  data: PerformanceSource | null;
  studentName?: string;
}) {
  const [range, setRange] = useState<PerformanceRange>("monthly");
  // Overall is always drawn; category lines are opt-in so the headline trend
  // isn't lost in five overlapping lines.
  const [visible, setVisible] = useState<Set<Category>>(new Set());
  const [showTable, setShowTable] = useState(false);

  const allPoints = useMemo(() => collectScores(data), [data]);
  const win = useMemo(() => windowsFor(allPoints, range), [allPoints, range]);
  const rows = useMemo(() => buildRows(allPoints, range), [allPoints, range]);

  const current = win.current;
  const overall = overallOf(current);
  const band = bandOf(overall);

  // For all-time, the delta is growth since joining: latest 30 days vs first 30.
  const headlineForDelta = range === "all" ? latestWindowOverall(allPoints) : overall;
  const previousOverall = overallOf(win.previous);
  const delta =
    headlineForDelta != null && previousOverall != null
      ? headlineForDelta - previousOverall
      : null;

  const perCategory = CATEGORIES.map((c) => {
    const cur = categoryAvg(current, c.key);
    const prev = categoryAvg(win.previous, c.key);
    return {
      ...c,
      count: current.filter((p) => p.category === c.key).length,
      avg: cur == null ? null : round1(cur),
      delta: range !== "all" && cur != null && prev != null ? cur - prev : null,
    };
  });

  const scored = perCategory.filter((c) => c.avg != null);
  const strongest = scored.length >= 2 ? scored.reduce((a, b) => (b.avg! > a.avg! ? b : a)) : null;
  const weakest = scored.length >= 2 ? scored.reduce((a, b) => (b.avg! < a.avg! ? b : a)) : null;

  const activeDays = new Set(current.map((p) => dayKey(p.at))).size;
  const lastActivity = allPoints.length ? allPoints[allPoints.length - 1].at : null;
  const firstName = (studentName || "").trim().split(/\s+/)[0] || "This student";

  const hasData = current.length > 0;
  const tableRows = rows.filter((r) => r.overall != null).reverse();

  const toggle = (key: Category) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 p-6 backdrop-blur-sm">
      {/* Header + range */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Academic Performance</h2>
          <p className="mt-1 text-sm text-slate-400">
            One score combining daily quizzes, mega tests, mock interviews and AI HR calls
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Time range"
          className="inline-flex rounded-lg border border-slate-600 bg-slate-900/60 p-1"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                range === r.key ? "bg-blue-600 text-white shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
          <p className="text-base font-medium text-slate-300">
            No graded activity {win.periodLabel}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {lastActivity
              ? `Last graded activity was ${relativeDays(lastActivity)}. Try a longer range.`
              : "Scores will appear here once the student completes a quiz, test or interview."}
          </p>
        </div>
      ) : (
        <>
          {/* Headline + breakdown */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5 lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Overall score
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <span className="text-6xl font-bold leading-none text-white">
                  {round1(overall!)}
                  <span className="text-3xl text-slate-400">%</span>
                </span>
                {band && (
                  <span
                    className="mb-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
                    style={{ color: band.color, borderColor: `${band.color}66`, backgroundColor: `${band.color}1a` }}
                  >
                    <span aria-hidden>{band.icon}</span>
                    {band.label}
                  </span>
                )}
              </div>

              {/* Where the score sits on the grade scale */}
              <div className="mt-5">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="absolute inset-y-0 left-0" style={{ width: `${AT_RISK_BELOW}%`, backgroundColor: `${STATUS.critical}40` }} />
                  <div
                    className="absolute inset-y-0"
                    style={{ left: `${AT_RISK_BELOW}%`, width: `${STRONG_AT - AT_RISK_BELOW}%`, backgroundColor: `${STATUS.warning}40` }}
                  />
                  <div className="absolute inset-y-0 right-0" style={{ width: `${100 - STRONG_AT}%`, backgroundColor: `${STATUS.good}40` }} />
                  <div
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white shadow"
                    style={{ left: `${overall}%` }}
                  />
                </div>
                <div className="relative mt-1.5 h-4 text-[11px] text-slate-500">
                  <span className="absolute left-0">0</span>
                  <span className="absolute -translate-x-1/2" style={{ left: `${AT_RISK_BELOW}%` }}>45</span>
                  <span className="absolute -translate-x-1/2" style={{ left: `${STRONG_AT}%` }}>75</span>
                  <span className="absolute right-0">100</span>
                </div>
              </div>

              <div className="mt-4">
                <Delta value={delta} label={win.compareLabel} />
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4 text-center">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Graded</dt>
                  <dd className="text-lg font-semibold text-white">{current.length}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Active days</dt>
                  <dd className="text-lg font-semibold text-white">{activeDays}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Last active</dt>
                  <dd className="text-sm font-semibold leading-7 text-white">
                    {lastActivity ? relativeDays(lastActivity) : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Score by activity
              </p>
              <ul className="mt-4 space-y-4">
                {perCategory.map((c) => (
                  <li key={c.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                        {strongest?.key === c.key && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                            Best
                          </span>
                        )}
                        {weakest?.key === c.key && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                            Focus area
                          </span>
                        )}
                      </span>
                      <span className="flex items-baseline gap-2 text-sm">
                        {c.delta != null && Math.abs(c.delta) >= 0.5 && (
                          <span
                            className="text-xs font-semibold"
                            style={{ color: c.delta > 0 ? STATUS.good : STATUS.critical }}
                          >
                            {c.delta > 0 ? "▲" : "▼"} {Math.abs(round1(c.delta))}
                          </span>
                        )}
                        <span className="font-semibold text-white">{c.avg == null ? "—" : `${c.avg}%`}</span>
                        <span className="text-xs text-slate-500">
                          {c.count} {c.count === 1 ? "attempt" : "attempts"}
                        </span>
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full bg-slate-800">
                      {c.avg != null && (
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${Math.max(c.avg, 1.5)}%`, backgroundColor: c.color }}
                        />
                      )}
                      <div
                        className="absolute inset-y-[-3px] w-px bg-slate-500/60"
                        style={{ left: `${STRONG_AT}%` }}
                        title="75% — strong"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-slate-500">
                Tick mark = 75% (A grade). Activities with no attempts are left out of the overall score.
              </p>
            </div>
          </div>

          {/* Plain-English summary */}
          <p className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-white">{firstName}</span> is averaging{" "}
            <span className="font-semibold text-white">{round1(overall!)}%</span> across{" "}
            {current.length} graded {current.length === 1 ? "activity" : "activities"} {win.periodLabel}
            {band && (
              <>
                {" "}— <span className="font-semibold" style={{ color: band.color }}>{band.label.toLowerCase()}</span>
                {" "}({band.note.toLowerCase()})
              </>
            )}
            .
            {delta != null && Math.abs(delta) >= 0.5 && (
              <>
                {" "}That&apos;s {delta > 0 ? "up" : "down"}{" "}
                <span className="font-semibold text-white">{Math.abs(round1(delta))} points</span>{" "}
                ({win.compareLabel}).
              </>
            )}
            {strongest && weakest && strongest.key !== weakest.key && (
              <>
                {" "}Strongest in <span className="font-semibold text-white">{strongest.label}</span> ({strongest.avg}%);
                most room to grow in <span className="font-semibold text-white">{weakest.label}</span> ({weakest.avg}%).
              </>
            )}
          </p>

          {/* Trend chart */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Score over time</p>
                <p className="text-xs text-slate-400">
                  {range === "all" ? "Monthly average" : "Daily average"} · hover a point for details
                </p>
              </div>
              <button
                onClick={() => setShowTable((v) => !v)}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {showTable ? "View as chart" : "View as table"}
              </button>
            </div>

            {/* Legend — also the toggle for category lines */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: OVERALL_COLOR, height: 3 }} />
                Overall
              </span>
              <span className="mx-1 text-xs text-slate-500">Compare with:</span>
              {CATEGORIES.map((c) => {
                const on = visible.has(c.key);
                const disabled = !perCategory.find((p) => p.key === c.key)?.count;
                return (
                  <button
                    key={c.key}
                    onClick={() => toggle(c.key)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-slate-500 bg-slate-700 text-white"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border"
                      style={{
                        borderColor: c.color,
                        backgroundColor: on ? c.color : "transparent",
                      }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {showTable ? (
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">{range === "all" ? "Month" : "Day"}</th>
                      <th className="px-3 py-2 text-right font-medium">Overall</th>
                      {CATEGORIES.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-right font-medium">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 tabular-nums">
                    {tableRows.map((r) => (
                      <tr key={r.label} className="text-slate-300">
                        <td className="px-3 py-2 text-slate-200">{r.label}</td>
                        <td className="px-3 py-2 text-right font-semibold text-white">{r.overall}%</td>
                        {CATEGORIES.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-right">
                            {r[c.key] == null ? "—" : `${r[c.key]}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 12, right: 24, left: -12, bottom: 4 }}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#475569"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      stroke="#475569"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ReferenceLine
                      y={STRONG_AT}
                      stroke={STATUS.good}
                      strokeOpacity={0.5}
                      strokeDasharray="6 4"
                      label={{ value: "Strong 75%", position: "insideTopRight", fill: "#94a3b8", fontSize: 11 }}
                    />
                    <ReferenceLine
                      y={AT_RISK_BELOW}
                      stroke={STATUS.critical}
                      strokeOpacity={0.5}
                      strokeDasharray="6 4"
                      label={{ value: "At-risk 45%", position: "insideBottomRight", fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ stroke: "#64748b", strokeWidth: 1 }}
                      content={({ active, payload }) => (
                        <ChartTooltip
                          active={active}
                          row={payload?.[0]?.payload as ChartRow | undefined}
                          visible={visible}
                        />
                      )}
                    />
                    {CATEGORIES.map((c) => (
                      <Line
                        key={c.key}
                        type="monotone"
                        dataKey={c.key}
                        name={c.label}
                        stroke={c.color}
                        strokeWidth={2}
                        strokeOpacity={0.85}
                        dot={{ r: 3, fill: c.color, stroke: "#0f172a", strokeWidth: 2 }}
                        activeDot={{ r: 5, stroke: "#0f172a", strokeWidth: 2 }}
                        connectNulls
                        hide={!visible.has(c.key)}
                        isAnimationActive={false}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="overall"
                      name="Overall"
                      stroke={OVERALL_COLOR}
                      strokeWidth={3}
                      dot={{ r: 4, fill: OVERALL_COLOR, stroke: "#0f172a", strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: "#0f172a", strokeWidth: 2 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Methodology — so nobody has to guess what the number means */}
      <details className="group mt-5 rounded-xl border border-slate-700/60 bg-slate-900/30 px-4 py-3 text-sm text-slate-300">
        <summary className="cursor-pointer list-none font-medium text-slate-200 marker:hidden">
          <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
          How is this score calculated?
        </summary>
        <div className="mt-3 space-y-3 pl-5 text-slate-400">
          <p>Every graded activity is converted to a percentage:</p>
          <ul className="space-y-1">
            {CATEGORIES.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span>
                  <span className="text-slate-200">{c.label}</span> — {c.measures}
                </span>
              </li>
            ))}
          </ul>
          <p>
            Each activity type is averaged separately, then the <span className="text-slate-200">overall score is
            the average of those</span> — so one activity type can&apos;t dominate just because it happens more often.
          </p>
          <p>
            Absences, mock interviews the system couldn&apos;t evaluate, and unanswered AI calls are{" "}
            <span className="text-slate-200">excluded, not counted as zero</span>.
          </p>
          <p>
            Bands follow the dashboard grades: <span style={{ color: STATUS.good }}>✓ Strong</span> ≥ 75% (A),{" "}
            <span style={{ color: STATUS.warning }}>! Developing</span> 45–74% (B/C),{" "}
            <span style={{ color: STATUS.critical }}>▲ Needs attention</span> below 45% (D).
          </p>
          <p>
            This section always uses the student&apos;s full history; the month filter at the top of the page
            doesn&apos;t change it.
          </p>
        </div>
      </details>
    </section>
  );
}
