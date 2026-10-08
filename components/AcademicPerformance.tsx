"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

type Range = "7d" | "30d" | "all";
type ActivityKey = "dailyQuiz" | "megaTest" | "mockInterview" | "aiHrCalling";
type Level = "strong" | "developing" | "at-risk" | "no-data";

interface Activity {
  key: ActivityKey;
  label: string;
  score: number | null;
  attempts: number;
  change: number | null;
  /** false when the student's zone doesn't feed this activity into the overall score */
  counted?: boolean;
}

interface TrendPoint {
  date: string;
  overall: number | null;
  dailyQuiz: number | null;
  megaTest: number | null;
  mockInterview: number | null;
  aiHrCalling: number | null;
}

interface AcademicData {
  studentName: string;
  range: Range;
  zone?: string | null;
  countedActivities?: ActivityKey[];
  overview: {
    score: number | null;
    level: Level;
    previousScore: number | null;
    change: number | null;
    gradedActivities: number;
    activeDays: number;
    lastActive: string | null;
  };
  activities: Activity[];
  strongest: ActivityKey | null;
  focusArea: ActivityKey | null;
  thresholds: { strong: number; atRisk: number };
  trend: TrendPoint[];
}

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

const COLORS: Record<ActivityKey, string> = {
  dailyQuiz: "#a78bfa",
  megaTest: "#f472b6",
  mockInterview: "#fb923c",
  aiHrCalling: "#22d3ee",
};

// Four score bands, used by the gauge, the activity rows, the summary and the chart,
// so one colour/label always means the same score everywhere.
const BANDS = [
  { key: "needs-improvement", label: "Needs improvement", from: 0, to: 25, color: "#f87171", blurb: "needs improvement" },
  { key: "developing", label: "Developing", from: 25, to: 50, color: "#fbbf24", blurb: "developing" },
  { key: "good", label: "Good", from: 50, to: 75, color: "#38bdf8", blurb: "good" },
  { key: "strong", label: "Strong", from: 75, to: 100, color: "#34d399", blurb: "strong" },
] as const;

const NO_DATA_BAND = { key: "no-data", label: "No data", from: 0, to: 0, color: "#94a3b8", blurb: "not yet graded" };

function getBand(score: number | null | undefined) {
  if (score === null || score === undefined) return NO_DATA_BAND;
  // Band on the rounded score so it always agrees with the number shown on screen.
  const rounded = Math.round(score);
  return BANDS.find((b) => rounded <= b.to) ?? BANDS[BANDS.length - 1];
}

const ZONES: Record<string, { label: string; color: string; rule: string }> = {
  blue: { label: "Blue zone", color: "#60a5fa", rule: "Scored on Mega Test (weekly) and Daily Quiz" },
  yellow: { label: "Yellow zone", color: "#fbbf24", rule: "Scored on Daily Quiz, Mega Test, AI Mock Interview and AI HR Call" },
  green: { label: "Green zone", color: "#34d399", rule: "Activities are optional: whatever the student has done is counted" },
  newly_enrolled: { label: "Newly enrolled", color: "#94a3b8", rule: "Whatever the student has done is counted" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);

const avg = (values: (number | null)[]) => {
  const valid = values.filter((v): v is number => v !== null && v !== undefined);
  return valid.length ? Number((valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(1)) : null;
};

function formatDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

function daysAgo(dateKey: string | null) {
  if (!dateKey) return "—";
  const [y, m, d] = dateKey.split("-").map(Number);
  const diff = Math.round((Date.now() - new Date(y, m - 1, d).getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

interface Candle {
  key: string;
  label: string;
  fullLabel: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  days: number;
  dailyQuiz: number | null;
  megaTest: number | null;
  mockInterview: number | null;
  aiHrCalling: number | null;
}

const ACTIVITY_KEYS: ActivityKey[] = ["dailyQuiz", "megaTest", "mockInterview", "aiHrCalling"];
const ACTIVITY_LABELS: Record<ActivityKey, string> = {
  dailyQuiz: "Daily Quiz",
  megaTest: "Mega Test",
  mockInterview: "Mock Interview",
  aiHrCalling: "AI HR Call",
};

// Overall for a period = average of the counted activities that have a score, matching how the
// backend builds the headline number.
function overallOf(c: Candle, counted: ActivityKey[]) {
  return avg(counted.map((k) => c[k]));
}

// One stacked bar per period; its height is the overall score and each colour is an activity's
// share of it. The tooltip lists the real per-activity scores.
function ScoreChart({ candles, counted }: { candles: Candle[]; counted: ActivityKey[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const compact = width < 560;
  const height = 320;
  const m = { top: 22, right: compact ? 12 : 140, bottom: 32, left: 44 };
  const plotW = Math.max(width - m.left - m.right, 50);
  const plotH = height - m.top - m.bottom;
  const y = (v: number) => m.top + plotH * (1 - v / 100);
  const slot = plotW / candles.length;
  const x = (i: number) => m.left + slot * (i + 0.5);
  const barW = Math.min(48, Math.max(12, slot * 0.5));
  const labelEvery = Math.ceil(candles.length / Math.max(1, Math.floor(plotW / 70)));
  const totals = candles.map((c) => overallOf(c, counted));
  const hovered = hover !== null ? candles[hover] : null;
  const hoveredTotal = hover !== null ? totals[hover] : null;

  return (
    <div ref={wrapRef} className="relative mt-4 w-full">
      <svg width={width} height={height} className="block" onMouseLeave={() => setHover(null)}>
        {BANDS.map((b) => (
          <g key={b.key}>
            <rect x={m.left} y={y(b.to)} width={plotW} height={y(b.from) - y(b.to)} fill={b.color} opacity={0.08} />
            {!compact && (
              <>
                <rect x={m.left + plotW + 10} y={(y(b.from) + y(b.to)) / 2 - 4} width={8} height={8} rx={2} fill={b.color} />
                <text x={m.left + plotW + 24} y={(y(b.from) + y(b.to)) / 2 + 4} fill="#ffffff" fontSize={12}>
                  {b.label}
                </text>
              </>
            )}
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + plotW} y1={y(t)} y2={y(t)} stroke="#334155" strokeDasharray={t % 100 === 0 ? undefined : "2 4"} />
            <text x={m.left - 8} y={y(t) + 4} fill="#ffffff" fontSize={11} textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        {candles.map((c, i) => {
          const total = totals[i];
          if (total === null) return null;
          // Single stacked bar: each activity's slice is its score divided by the number of
          // scored activities, so the bar's total height equals the overall score.
          const scored = counted.filter((k) => c[k] !== null).length;
          let acc = 0;
          return (
            <g key={c.key} onMouseEnter={() => setHover(i)}>
              <rect x={x(i) - slot / 2} y={m.top} width={slot} height={plotH} fill="transparent" />
              {hover === i && <rect x={x(i) - slot / 2} y={m.top} width={slot} height={plotH} fill="#fff" opacity={0.06} />}
              {counted.map((k) => {
                const v = c[k];
                if (v === null) return null;
                const share = v / scored;
                const y1 = y(acc + share);
                const h = y(acc) - y1;
                acc += share;
                return (
                  <rect key={k} x={x(i) - barW / 2} y={y1} width={barW} height={Math.max(h, 0.5)} fill={COLORS[k]} stroke="#0b1220" strokeWidth={1} />
                );
              })}
              <text x={x(i)} y={y(total) - 7} fill="#ffffff" fontSize={12} fontWeight={700} textAnchor="middle">
                {Math.round(total)}%
              </text>
            </g>
          );
        })}

        {candles.map((c, i) =>
          i % labelEvery === 0 ? (
            <text key={c.key} x={x(i)} y={height - 10} fill="#ffffff" fontSize={11} textAnchor="middle">
              {c.label}
            </text>
          ) : null
        )}
      </svg>

      {hovered && hover !== null && hoveredTotal !== null && (
        <div
          className="pointer-events-none absolute z-10 w-56 rounded-lg border border-slate-500 bg-slate-950 p-3 text-xs shadow-xl"
          style={{ left: Math.min(Math.max(x(hover) - 112, 0), Math.max(width - 224, 0)), top: 0 }}
        >
          <p className="font-semibold text-white">{hovered.fullLabel}</p>
          <p className="mb-1.5 text-white">
            {hovered.days} active day{hovered.days === 1 ? "" : "s"}
          </p>
          <div className="space-y-1 text-white">
            {counted.map((k) => (
              <p key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[k] }} />
                {ACTIVITY_LABELS[k]}
                <span className="ml-auto text-white">{fmt(hovered[k])}</span>
              </p>
            ))}
          </div>
          <p className="mt-2 flex border-t border-slate-600 pt-1.5 font-semibold text-white">
            Overall
            <span className="ml-auto" style={{ color: getBand(hoveredTotal).color }}>
              {hoveredTotal}% · {getBand(hoveredTotal).label}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function formatFilterDate(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-");

  return `${day}-${month}-${year}`;
}

export default function AcademicPerformance({ clerkId }: { clerkId: string | null }) {
  const [range, setRange] = useState<Range>("all");
  const [data, setData] = useState<AcademicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const isCustomRange = Boolean(fromDate && toDate);

  // Both dates are needed for a custom range; an inverted range is ignored until fixed.
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  useEffect(() => {
    if (!clerkId) return;
    if (invalidRange) return;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `${API_LMS_URL}/api/admin/get-acadmic-data?clerkId=${encodeURIComponent(clerkId)}`;
        url += fromDate && toDate ? `&from=${fromDate}&to=${toDate}` : `&range=${range}`;

        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to fetch academic data");
        setData(result.data);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(err);
        setError(err?.message || "Something went wrong");
        setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [clerkId, range, fromDate, toDate, invalidRange]);

  // Drop the previous student's data as soon as the selection changes.
  useEffect(() => {
    setData(null);
    setError(null);
  }, [clerkId]);

  const pickRange = (r: Range) => {
    setRange(r);
    setFromDate("");
    setToDate("");
  };

  // One candle per bucket: all-time -> month, 30 days -> week, 7 days / custom -> day.
  const candles = useMemo<Candle[]>(() => {
    if (!data) return [];
    const buckets = new Map<string, TrendPoint[]>();

    data.trend.forEach((point) => {
      const [y, m, d] = point.date.split("-").map(Number);
      let key = point.date;

      if (!isCustomRange && range === "all") {
        key = point.date.slice(0, 7);
      }

      if (!isCustomRange && range === "30d") {
        const dt = new Date(
          Date.UTC(y, m - 1, d)
        );

        dt.setUTCDate(
          dt.getUTCDate() -
          ((dt.getUTCDay() + 6) % 7)
        );

        key = dt.toISOString().slice(0, 10);
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(point);
    });

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, points]) => {
        const [y, m, d] = key.split("-").map(Number);
        const overall = points.map((p) => p.overall).filter((v): v is number => v !== null);
        const everything = overall;
        const day = `${d} ${MONTHS[m - 1]}`;
        const monthly = !isCustomRange && range === "all";
        const weekly = !isCustomRange && range === "30d";
        const label = monthly ? `${MONTHS[m - 1]} ${y}` : weekly ? `Wk ${day}` : day;
        const fullLabel = monthly ? `${MONTHS[m - 1]} ${y}` : weekly ? `Week of ${day} ${y}` : `${day} ${y}`;
        return {
          key,
          label,
          fullLabel,
          open: overall[0] ?? null,
          close: overall[overall.length - 1] ?? null,
          low: everything.length ? Math.min(...everything) : null,
          high: everything.length ? Math.max(...everything) : null,
          days: points.length,
          dailyQuiz: avg(points.map((p) => p.dailyQuiz)),
          megaTest: avg(points.map((p) => p.megaTest)),
          mockInterview: avg(points.map((p) => p.mockInterview)),
          aiHrCalling: avg(points.map((p) => p.aiHrCalling)),
        };
      });
  }, [data, range, isCustomRange]);

  const labelOf = (key: ActivityKey | null) => data?.activities.find((a) => a.key === key);

  const periodLabel = isCustomRange
    ? `${formatFilterDate(fromDate)} to ${formatFilterDate(toDate)}`
    : RANGES.find((r) => r.key === range)?.label.toLowerCase();
  const showChange = !isCustomRange && range !== "all";
  const overview = data?.overview;
  const band = getBand(overview?.score);
  const strongest = labelOf(data?.strongest ?? null);
  const focus = labelOf(data?.focusArea ?? null);
  const countedKeys = data?.countedActivities ?? ACTIVITY_KEYS;
  const zone = data?.zone ? ZONES[data.zone] : undefined;
  const scoredCount = data?.activities.filter((a) => countedKeys.includes(a.key) && a.score !== null).length ?? 0;

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 text-white">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Academic Performance</h2>
          <p className="mt-1 text-sm text-white">
            One score combining daily quizzes, mega tests, mock interviews and AI HR calls
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {/* <div className="flex rounded-lg border border-slate-600 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => pickRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  !isCustomRange && range === r.key ? "bg-blue-600 text-white" : "text-white hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}sss
          </div> */}

          <div>
            <label className="mb-1 block text-xs text-white">Start date</label>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none [color-scheme:dark] focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white">End date</label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none [color-scheme:dark] focus:border-blue-500"
            />
          </div>

          {(fromDate || toDate) && (
            <button
              onClick={() => pickRange(range)}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {fromDate !== "" && toDate === "" && (
        <p className="mb-3 text-xs text-amber-200">Pick an end date to apply the custom range.</p>
      )}
      {invalidRange && <p className="mb-3 text-xs text-red-300">The start date must be before the end date.</p>}

      {/* Band legend: what each colour/label means, everywhere on this card */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white">
        {BANDS.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: b.color }} />
            <span style={{ color: b.color }}>{b.label}</span>
            {b.from === 0 ? "0" : b.from + 1}–{b.to}%
          </span>
        ))}
      </div>

      {zone && (
        <p className="mb-4 text-xs text-white">
          <span
            className="mr-2 rounded-full border px-2.5 py-0.5 font-semibold"
            style={{ color: zone.color, borderColor: `${zone.color}80`, background: `${zone.color}1a` }}
          >
            {zone.label}
          </span>
          {zone.rule}
        </p>
      )}

      {!clerkId ? (
        <p className="text-sm text-white">No student selected.</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-white">{loading ? "Loading academic performance…" : invalidRange ? "Fix the date range to see data." : "No data"}</p>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Overall score */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-5 lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white">
                Overall score · {periodLabel}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-6xl font-bold text-white">
                  {overview!.score === null ? "—" : Math.round(overview!.score)}
                </span>
                {overview!.score !== null && <span className="mt-4 text-2xl text-white">%</span>}
                <span
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{ color: band.color, borderColor: `${band.color}80`, background: `${band.color}1a` }}
                >
                  {band.label}
                </span>
              </div>

              <div className="mt-5">
                <div className="relative flex h-2 overflow-hidden rounded-full">
                  {BANDS.map((b) => (
                    <div
                      key={b.key}
                      style={{ width: `${b.to - b.from}%`, background: b.color, opacity: b.key === band.key ? 1 : 0.35 }}
                    />
                  ))}
                  {overview!.score !== null && (
                    <div
                      className="absolute top-0 h-2 w-1 -translate-x-1/2 bg-white"
                      style={{ left: `${overview!.score}%` }}
                    />
                  )}
                </div>
                <div className="relative mt-1 h-4 text-[10px] text-white">
                  <span className="absolute left-0">0</span>
                  {[25, 50, 75].map((t) => (
                    <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
                      {t}
                    </span>
                  ))}
                  <span className="absolute right-0">100</span>
                </div>
              </div>

              {showChange && overview!.change !== null && (
                <p className={`mt-3 text-sm ${overview!.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {overview!.change >= 0 ? "▲ Up" : "▼ Down"} {Math.abs(overview!.change)} pts{" "}
                  <span className="text-white">vs previous {range === "7d" ? "7" : "30"} days</span>
                </p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-700/60 pt-4 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white">Graded</p>
                  <p className="mt-1 text-lg font-semibold text-white">{overview!.gradedActivities}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white">Active days</p>
                  <p className="mt-1 text-lg font-semibold text-white">{overview!.activeDays}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white">Last active</p>
                  <p className="mt-1 text-lg font-semibold text-white">{daysAgo(overview!.lastActive)}</p>
                </div>
              </div>
            </div>

            {/* Score by activity */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-5 lg:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white">
                Score by activity · {periodLabel}
              </p>
              <div className="mt-4 space-y-5">
                {data.activities.map((a) => {
                  const ab = getBand(a.score);
                  const isCounted = countedKeys.includes(a.key);
                  return (
                    <div key={a.key} className={isCounted ? "" : "opacity-70"}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[a.key] }} />
                          <span className="font-semibold text-white">{a.label}</span>
                          {!isCounted && (
                            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                              Not counted for {zone?.label ?? "this zone"}
                            </span>
                          )}
                          {isCounted && scoredCount > 1 && data.strongest === a.key && (
                            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Best</span>
                          )}
                          {isCounted && scoredCount > 1 && data.focusArea === a.key && data.strongest !== a.key && (a.score ?? 100) <= 75 && (
                            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                              Focus area
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          {a.score !== null && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ color: ab.color, background: `${ab.color}1f` }}
                            >
                              {ab.label}
                            </span>
                          )}
                          <span className="font-semibold text-white">{fmt(a.score)}</span>
                          <span className="text-xs text-white">
                            {a.attempts} attempt{a.attempts === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <div className="relative mt-2 h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${a.score ?? 0}%`, background: ab.color }}
                        />
                        {[25, 50, 75].map((t) => (
                          <div key={t} className="absolute -top-0.5 h-3 w-px bg-slate-500/70" style={{ left: `${t}%` }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 text-[11px] text-white">
                Bar colour = score band (ticks at 25 / 50 / 75%). Activities with no attempts are left out of the overall score.
              </p>
            </div>
          </div>

          {/* Summary sentence */}
          <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-relaxed text-white">
            {overview!.score === null ? (
              <>No graded activity for {periodLabel}.</>
            ) : (
              <>
                <strong className="text-white">{data.studentName}</strong> is averaging{" "}
                <strong className="text-white">{Math.round(overview!.score)}%</strong> across{" "}
                <strong className="text-white">{overview!.gradedActivities}</strong> graded activities for {periodLabel} —{" "}
                <span style={{ color: band.color }}>{band.blurb}</span>.
                {showChange && overview!.change !== null && (
                  <>
                    {" "}That&apos;s {overview!.change >= 0 ? "up" : "down"}{" "}
                    <strong className="text-white">{Math.abs(overview!.change)} points</strong> vs the previous period.
                  </>
                )}
                {strongest && focus && strongest.key !== focus.key && (
                  <>
                    {" "}Strongest in <strong className="text-white">{strongest.label}</strong> ({fmt(strongest.score)});
                    lowest in <strong className="text-white">{focus.label}</strong> ({fmt(focus.score)}).
                  </>
                )}
              </>
            )}
          </div>

          {/* Trend */}
          <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Score over time</p>
                <p className="text-xs text-white">
                  One bar per {isCustomRange
                    ? "day"
                    : range === "all"
                      ? "month"
                      : range === "30d"
                        ? "week"
                        : "day"} · bar height = overall score · each colour is an activity's share of it · hover for exact scores
                </p>
              </div>
              <button
                onClick={() => setAsTable((v) => !v)}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-white hover:bg-slate-800"
              >
                {asTable ? "View as chart" : "View as table"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white">
              {data.activities.filter((a) => countedKeys.includes(a.key)).map((a) => (
                <span key={a.key} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[a.key] }} /> {a.label}
                </span>
              ))}
              <span>Bar height = overall score</span>
            </div>

            {candles.length === 0 ? (
              <p className="py-12 text-center text-sm text-white">No scored activity in this period.</p>
            ) : asTable ? (
              <div className="mt-4 max-h-80 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-2">{isCustomRange
                        ? "Date"
                        : range === "all"
                          ? "Month"
                          : range === "30d"
                            ? "Week"
                            : "Date"}</th>
                      <th className="px-3 py-2">Overall</th>
                      <th className="px-3 py-2">Band</th>
                      {data.activities.filter((a) => countedKeys.includes(a.key)).map((a) => (
                        <th key={a.key} className="px-3 py-2">{a.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {candles.map((c) => {
                      const total = overallOf(c, countedKeys);
                      const cb = getBand(total);
                      return (
                        <tr key={c.key} className="border-t border-slate-800">
                          <td className="px-3 py-2">{c.label}</td>
                          <td className="px-3 py-2 font-semibold text-white">{fmt(total)}</td>
                          <td className="px-3 py-2" style={{ color: cb.color }}>{cb.label}</td>
                          {data.activities.filter((a) => countedKeys.includes(a.key)).map((a) => (
                            <td key={a.key} className="px-3 py-2">{fmt(c[a.key])}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ScoreChart candles={candles} counted={countedKeys} />
            )}
          </div>

          <details className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4 text-sm">
            <summary className="cursor-pointer font-medium text-white">How is this score calculated?</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-white">
              <li>Daily Quiz — total marks obtained ÷ total marks possible across evaluated quizzes.</li>
              <li>Mega Test — average percentage of completed, evaluated mega tests.</li>
              <li>Mock Interview — average interview readiness percent from the AI evaluation.</li>
              <li>AI HR Call — average AI rubric score out of 10, × 10.</li>
              <li>Overall — the average of the counted activities that have at least one graded attempt. Which activities count depends on the zone: Blue = Daily Quiz + Mega Test; Yellow = all four; Green = optional, whatever the student has done.</li>
              <li>Bands — Needs improvement 0–25%, Developing 26–50%, Good 51–75%, Strong 76–100%.</li>
              <li>Chart — each bar is one period; its segments are every scored activity's average divided by the number of scored activities, so the bar height is the overall score.</li>
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}
