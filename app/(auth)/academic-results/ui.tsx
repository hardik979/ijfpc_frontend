"use client";

// Shared presentational components for the Academic Results dashboard:
// CourseFilter, TabBar, StatCards, MonthlyChart, ResultsCalendar, TablePanel,
// and DrillDownModal (+ DetailRow). Kept together since each is small.
import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  Bot,
  CalendarDays,
  Phone,
  Video,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CalendarFormate from "@/healper/calendarFormate";
import DataPresentationTable from "@/healper/DataPresentationTable";
import {
  attachStudentMeta,
  courseOptionsOf,
  datesInRange,
  fetchCourses,
  filterByCourse,
  isSingleMonth,
  mergeCourseOptions,
  monthShortLabel,
  monthsInRange,
  rangeLabel,
  useAbsent,
  useStudentMeta,
  type Course,
  type CourseOption,
  type MonthRange,
  type TabKey,
  type AbsentRow,
  type WithMeta,
} from "./data";
import { absentColumns, absentColumnsWithReason } from "./columns";

/* ═══════════════════════════ CourseFilter ══════════════════════ */
export function CourseFilter({
  value,
  onChange,
  allowedIds,
}: {
  value: string;
  onChange: (v: string) => void;
  /** When set, only these course ids are selectable (others are hidden). */
  allowedIds?: string[];
}) {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  const visibleCourses = allowedIds
    ? courses.filter((c) => allowedIds.includes(c._id))
    : courses;

  return (
    <div className="relative">
      <BookOpen className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-muted)]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--panel-border-strong)] bg-[var(--panel-card)] py-1.5 pl-8 pr-3 text-sm text-[var(--panel-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All courses</option>
        {visibleCourses.map((c) => (
          <option key={c._id} value={c._id}>
            {c.title ?? c.name ?? c._id}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ════════════════════════════ MonthRangePicker ═════════════════ */
/**
 * From/To month selection. Both default to the current month, so out of the box
 * this behaves exactly like the single month picker it replaces — you only
 * notice the range when you move one end.
 *
 * Reversed input is not blocked while typing: the two months are ordered where
 * they are consumed (normalizeRange), so dragging To behind From shows that span
 * rather than an error state mid-edit.
 */
export function MonthRangePicker({
  value,
  onChange,
  theme,
}: {
  value: MonthRange;
  onChange: (r: MonthRange) => void;
  /** Drives the native picker's colour scheme so it matches the page theme. */
  theme?: string;
}) {
  const months = monthsInRange(value);
  const field =
    "rounded-md border border-[var(--panel-border-strong)] bg-[var(--panel-card)] py-1.5 pl-8 pr-2 text-sm text-[var(--panel-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-muted)]" />
        <input
          type="month"
          aria-label="From month"
          title="From month"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          style={{ colorScheme: theme }}
          className={field}
        />
      </div>
      <span className="text-sm text-[var(--panel-text-muted)]">to</span>
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-muted)]" />
        <input
          type="month"
          aria-label="To month"
          title="To month"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          style={{ colorScheme: theme }}
          className={field}
        />
      </div>
      {months.length > 1 && (
        <span className="whitespace-nowrap rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
          {months.length} months
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════ TabBar ════════════════════════ */
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "quiz", label: "Daily Quiz", icon: <BookOpenCheck className="h-4 w-4" /> },
  { key: "mock", label: "Mock Interview", icon: <Video className="h-4 w-4" /> },
  { key: "ai", label: "AI HR Calling", icon: <Bot className="h-4 w-4" /> },
  { key: "realhr", label: "Real HR Calling", icon: <Phone className="h-4 w-4" /> },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--panel-border-strong)] bg-[var(--panel-card)] p-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            active === t.key
              ? "bg-blue-600 text-white shadow"
              : "text-[var(--panel-text-secondary)] hover:text-[var(--panel-text-primary)]"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════ StatCards ══════════════════════ */
export const ACCENTS = {
  blue: { value: "text-blue-400", ring: "from-blue-500/20 to-transparent", bar: "bg-blue-500" },
  emerald: { value: "text-emerald-400", ring: "from-emerald-500/20 to-transparent", bar: "bg-emerald-500" },
  amber: { value: "text-amber-400", ring: "from-amber-500/20 to-transparent", bar: "bg-amber-500" },
  violet: { value: "text-violet-400", ring: "from-violet-500/20 to-transparent", bar: "bg-violet-500" },
  rose: { value: "text-rose-400", ring: "from-rose-500/20 to-transparent", bar: "bg-rose-500" },
  slate: { value: "text-slate-400", ring: "from-slate-500/20 to-transparent", bar: "bg-slate-500" },
} as const;

export type Accent = keyof typeof ACCENTS;

export type StatItem = {
  label: string;
  value: number | string;
  accent: Accent;
  /** Optional small secondary line under the value (e.g. "22 students"). */
  sub?: string;
};

export function StatCards({
  items,
  columns = 4,
}: {
  items: StatItem[];
  /** Max columns at the widest breakpoint (so 5-card layouts don't squash). */
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  const grid =
    columns === 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : columns === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : columns === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : columns === 2
      ? "grid-cols-2"
      : "grid-cols-2 sm:grid-cols-4";
  return (
    <div className={`grid ${grid} gap-3`}>
      {items.map((it) => (
        <StatCard key={it.label} {...it} />
      ))}
    </div>
  );
}

function StatCard({ label, value, accent, sub }: StatItem) {
  const a = ACCENTS[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--panel-border-strong)] bg-[var(--panel-card)] p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${a.bar}`} />
      <div
        className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${a.ring} blur-2xl`}
      />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-wider text-[var(--panel-text-muted)]">
          {label}
        </div>
        <div className={`mt-1 text-3xl font-semibold ${a.value}`}>{value}</div>
        {sub && (
          <div className="mt-0.5 text-xs font-medium text-[var(--panel-text-muted)]">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════ MonthlyChart ════════════════════ */
export type ChartSeries = {
  key: string;
  name: string;
  color: string;
  /**
   * Field holding the raw count behind `key`. Only used in `percent` mode, to
   * show "40% (12 of 30)" in the tooltip so the rate stays verifiable.
   */
  countKey?: string;
};

export function MonthlyChart({
  data,
  series,
  title,
  yLabel,
  range,
  percent = false,
}: {
  data: Array<{ date: string } & Record<string, unknown>>;
  series: ChartSeries[];
  title?: string;
  /** Optional rotated label for the Y-axis (e.g. "Students attempted"). */
  yLabel?: string;
  /**
   * The span being shown. When provided, every day in it gets a bar — days with
   * no records show 0 instead of being skipped, so gaps read as "nobody turned
   * up" rather than silently collapsing the axis.
   */
  range?: MonthRange;
  /**
   * Plot the series as percentages: axis ticks, bar labels and tooltips all get
   * a "%" suffix and the axis runs to at least 100. The axis is *not* capped at
   * 100 — a day can exceed the roster (e.g. a student who has since been placed
   * still counts as having attended), and clamping would hide that.
   */
  percent?: boolean;
}) {
  // A single month keeps the compact "01…31" axis it always had; a span that
  // crosses months needs the month too, or day 3 of January and day 3 of March
  // would be indistinguishable.
  const spansMonths = range ? !isSingleMonth(range) : false;

  const chartData = useMemo(() => {
    if (!range) {
      return data.map((d) => ({ ...d, day: d.date?.slice(8) ?? d.date }));
    }
    const label = (date: string) =>
      spansMonths
        ? `${date.slice(8)} ${monthShortLabel(date.slice(0, 7))}`
        : date.slice(8);
    const byDate = new Map(data.map((d) => [d.date, d]));
    // `expected` is the per-day denominator (percent mode); zero-filled days
    // carry it too so the tooltip never falls back to a stale prior value.
    const zeros = Object.fromEntries([
      ...series.flatMap((s) => (s.countKey ? [[s.key, 0], [s.countKey, 0]] : [[s.key, 0]])),
      ["expected", 0],
    ]);
    return datesInRange(range).map((date) => {
      const existing = byDate.get(date);
      return existing
        ? { ...existing, day: label(date) }
        : { ...zeros, date, day: label(date) };
    });
  }, [data, range, series, spansMonths]);

  // ~31 bars fit their labels; a multi-month span does not, so thin the ticks to
  // roughly one per week and angle them rather than letting them overlap.
  const tickInterval = chartData.length > 40 ? Math.ceil(chartData.length / 12) : 0;

  return (
    <div className="rounded-2xl border border-[var(--panel-border-strong)] bg-[var(--panel-card)] p-4">
      {title && (
        <h3 className="mb-3 text-sm font-medium text-[var(--panel-text-secondary)]">{title}</h3>
      )}
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-[var(--panel-text-faint)]">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{
              top: 6,
              right: 8,
              left: yLabel ? 12 : -18,
              // Angled labels on a multi-month span need room underneath.
              bottom: spansMonths ? 18 : 0,
            }}
          >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border-strong)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--panel-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--panel-border-strong)" }}
                interval={tickInterval}
                angle={spansMonths ? -35 : 0}
                textAnchor={spansMonths ? "end" : "middle"}
                height={spansMonths ? 46 : undefined}
              />
              <YAxis
                tick={{ fill: "var(--panel-text-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={
                  percent
                    ? [0, (max: number) => Math.max(100, Math.ceil(max))]
                    : undefined
                }
                tickFormatter={percent ? (v) => `${v}%` : undefined}
                label={
                  yLabel
                    ? {
                        value: yLabel,
                        angle: -90,
                        position: "insideLeft",
                        fill: "var(--panel-text-muted)",
                        fontSize: 11,
                        style: { textAnchor: "middle" },
                      }
                    : undefined
                }
              />
              <Tooltip
                contentStyle={{
                  background: "var(--panel-bg-900)",
                  border: "1px solid var(--panel-border-strong)",
                  borderRadius: 8,
                  color: "var(--panel-text-secondary)",
                }}
                labelStyle={{ color: "var(--panel-text-secondary)" }}
                labelFormatter={(label) => (spansMonths ? `${label}` : `Day ${label}`)}
                // In percent mode show the rate plus the counts behind it, so a
                // bar can be checked against the table without leaving the page.
                // The denominator is per-day (each row carries its own
                // `expected`), not a single figure for the whole chart — the
                // roster size can genuinely differ from one day to the next.
                formatter={
                  percent
                    ? (value: unknown, name: unknown, item: any) => {
                        const s = series.find((x) => x.name === name);
                        const count = s?.countKey
                          ? item?.payload?.[s.countKey]
                          : undefined;
                        const base = item?.payload?.expected;
                        return typeof count === "number" &&
                          typeof base === "number" &&
                          base > 0
                          ? `${value}% (${count} of ${base})`
                          : `${value}%`;
                      }
                    : undefined
                }
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--panel-text-muted)" }} />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {/* Per-bar values are legible for a month; across a span the
                      bars are too narrow and the labels collide, so the tooltip
                      carries the exact figure instead. */}
                  {chartData.length <= 40 && (
                    <LabelList
                      dataKey={s.key}
                      position="top"
                      fontSize={10}
                      fill="var(--panel-text-secondary)"
                      formatter={(v) => (v ? (percent ? `${v}%` : `${v}`) : "")}
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ════════════════════════════ ResultsCalendar ══════════════════ */
export type CalendarMetric = {
  /** Field on the day row to display. */
  key: string;
  label: string;
  /** Tailwind text color class for the metric line. */
  className?: string;
};

type DayRow = { date: string } & Record<string, unknown>;

export function ResultsCalendar({
  range,
  data,
  loading,
  metrics,
  onDateSelect,
}: {
  range: MonthRange;
  data: DayRow[];
  loading: boolean;
  metrics: CalendarMetric[];
  onDateSelect: (date: string) => void;
}) {
  // A calendar is a month grid, so a multi-month span is shown one month at a
  // time. Its arrows now page *within* the selected span instead of changing
  // what the page is showing — the From/To pickers own that. `data` already
  // covers the whole span, so paging needs no refetch.
  const months = monthsInRange(range);
  const [viewIndex, setViewIndex] = useState(0);

  // Land on the span's first month whenever the span itself changes, and never
  // leave the cursor past the end of a span that just got shorter.
  useEffect(() => {
    setViewIndex(0);
  }, [range.from, range.to]);

  const safeIndex = Math.min(viewIndex, Math.max(0, months.length - 1));
  const viewMonth = months[safeIndex] ?? range.from;

  return (
    <CalendarFormate
      // Remount when the displayed month changes (span change, tab switch, or
      // paging) so the component's internal cursor stays in sync.
      key={viewMonth}
      title={
        months.length > 1
          ? `Summary — ${rangeLabel(range)} (month ${safeIndex + 1} of ${months.length})`
          : "Monthly Summary"
      }
      initialMonth={viewMonth}
      loading={loading}
      data={data}
      onMonthChange={(next) => {
        // Clamp paging to the span: stepping past either end is a no-op rather
        // than silently showing a month the totals above don't include.
        const i = months.indexOf(next);
        if (i >= 0) setViewIndex(i);
      }}
      onDateSelect={(date) => {
        // Select the day even with zero interviews — the Absent panel still
        // needs to load, since a zero-attempt day means everyone expected
        // that day is absent, not that there's nothing to show.
        onDateSelect(date);
      }}
      renderCell={({ date, inMonth, isToday, isSelected, dayData }) => {
        const d = dayData as DayRow | null;
        const dow = new Date(date).getDay();
        const dayNum = new Date(date).getDate();
        const numColor = !inMonth
          ? "text-gray-400"
          : dow === 0
          ? "text-red-800"
          : dow >= 1 && dow <= 5
          ? "text-emerald-800"
          : "text-gray-700";
        return (
          <div
            className={[
              "flex h-full w-full flex-col rounded-md border px-1.5 py-1 transition",
              isSelected
                ? "border-blue-500 bg-blue-600/25"
                : isToday
                ? "border-blue-400/40 bg-blue-500/10"
                : d
                ? "border-emerald-500/20 bg-emerald-500/[0.07] hover:bg-emerald-500/15"
                : "border-transparent hover:bg-[var(--panel-card)]",
            ].join(" ")}
          >
            <div className={`text-sm font-semibold leading-none ${numColor}`}>
              {dayNum}
            </div>
            {d && (
              <div className="mt-auto space-y-0.5 text-[10px] leading-tight">
                {metrics.map((m) => (
                  <div
                    key={m.key}
                    className={`flex justify-between font-semibold ${
                      m.className ?? "text-gray-600"
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="font-bold">
                      {String(d[m.key] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

/* ══════════════════════════════ TablePanel ═════════════════════ */
export function TablePanel({
  title,
  subtitle,
  empty,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  /** When true, show a friendly hint instead of the table. */
  empty?: boolean;
  /** Optional control rendered on the right of the header (e.g. a download button). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
          <CalendarDays className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500">
            Select a highlighted day on the calendar to see attempts.
          </p>
        </div>
      ) : (
        <div className="p-4">{children}</div>
      )}
    </div>
  );
}

/* ════════════════════════════ DrillDownModal ═══════════════════ */
/* ════════════════════════════ AttendancePanel ══════════════════════ */
// A TablePanel with an Attended / Absent toggle. "Attended" shows the per-day
// table passed as children; "Absent" shows the expected-but-didn't-participate
// roster (zone-based, loaded lazily once a day is selected).
function AttendanceToggle({
  view,
  onChange,
  attendedCount,
  absentCount,
}: {
  view: "attended" | "absent";
  onChange: (v: "attended" | "absent") => void;
  attendedCount: number;
  absentCount: number;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-gray-300 bg-gray-50 p-0.5 text-sm">
      <button
        onClick={() => onChange("attended")}
        className={`rounded-md px-3 py-1 font-medium transition ${
          view === "attended"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Attended <span className="text-xs text-gray-400">({attendedCount})</span>
      </button>
      <button
        onClick={() => onChange("absent")}
        className={`rounded-md px-3 py-1 font-medium transition ${
          view === "absent"
            ? "bg-white text-rose-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Absent <span className="text-xs text-gray-400">({absentCount})</span>
      </button>
    </div>
  );
}

/** Course dropdown that narrows the table itself (both Attended and Absent). */
function TableCourseFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: CourseOption[];
}) {
  if (options.length === 0) return null;
  return (
    <div className="relative shrink-0">
      <BookOpen className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter table by course"
        className="rounded-lg border border-gray-300 bg-white py-1 pl-7 pr-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All courses</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AttendancePanel({
  tab,
  selectedDate,
  refreshKey,
  title,
  attendedSubtitle,
  attendedCount,
  rosterCourseId,
  courseFilter,
  onCourseFilterChange,
  courseOptions = [],
  extraAction,
  children,
}: {
  tab: TabKey;
  selectedDate: string | null;
  refreshKey: number;
  /** Header title shown in the "Attended" view. */
  title: string;
  attendedSubtitle?: string;
  attendedCount: number;
  /**
   * The dashboard's course selection (Daily Quiz only). It narrows the absent
   * roster itself — who was *expected* that day — rather than just hiding rows,
   * so the panel's "expected" agrees with the chart's denominator.
   */
  rosterCourseId?: string;
  /**
   * Course filter shared by both views. The tab owns the state because it also
   * has to narrow its own (attended) rows with it.
   */
  courseFilter: string;
  onCourseFilterChange: (courseId: string) => void;
  /** Courses present in the attended rows; merged with the absent roster's. */
  courseOptions?: CourseOption[];
  /** Extra control (e.g. a download button) shown only in the Attended view. */
  extraAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"attended" | "absent">("attended");
  const { rows: absentRows, expected, loading: absentLoading } = useAbsent(
    tab,
    selectedDate,
    refreshKey,
    rosterCourseId
  );

  // Absent rows are the eligible roster, so they carry a User _id — the most
  // reliable key into the directory; email is only a fallback.
  const lookupMeta = useStudentMeta(refreshKey);
  const absentWithMeta = useMemo(
    () =>
      attachStudentMeta(
        absentRows,
        (r) => ({ id: r.id, email: r.email }),
        lookupMeta
      ),
    [absentRows, lookupMeta]
  );
  const absentFiltered = useMemo(
    () => filterByCourse(absentWithMeta, courseFilter),
    [absentWithMeta, courseFilter]
  );
  // Offer every course either view can show, so switching views never silently
  // drops the current selection out of the dropdown.
  const options = useMemo(
    () => mergeCourseOptions(courseOptions, courseOptionsOf(absentWithMeta)),
    [courseOptions, absentWithMeta]
  );

  return (
    <TablePanel
      title={view === "absent" && selectedDate ? `Absent on ${selectedDate}` : title}
      subtitle={
        !selectedDate
          ? undefined
          : view === "absent"
          ? `${absentFiltered.length} absent · ${expected} expected`
          : attendedSubtitle
      }
      empty={!selectedDate}
      action={
        selectedDate ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {view === "attended" && extraAction}
            <TableCourseFilter
              value={courseFilter}
              onChange={onCourseFilterChange}
              options={options}
            />
            <AttendanceToggle
              view={view}
              onChange={setView}
              attendedCount={attendedCount}
              absentCount={absentFiltered.length}
            />
          </div>
        ) : null
      }
    >
      {view === "absent" ? (
        <DataPresentationTable<WithMeta<AbsentRow>>
          data={absentFiltered}
          // The Reason column appears only when the tab sends one (AI HR:
          // "Did not pick — N calls" / "Not called").
          columns={
            absentFiltered.some((r) => r.reason)
              ? absentColumnsWithReason
              : absentColumns
          }
          loading={absentLoading}
          searchable
          paginated
          pageSize={15}
          rowKey="id"
          stickyHeader
          emptyMessage={
            courseFilter && absentWithMeta.length > 0
              ? "No absent students in this course for this date"
              : "No absent students for this date 🎉"
          }
        />
      ) : (
        children
      )}
    </TablePanel>
  );
}

/* ════════════════════════════ DrillDownModal ═══════════════════ */
export function DrillDownModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/** A simple label/value row used inside drill-down detail panels. */
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">
        {value ?? "—"}
      </span>
    </div>
  );
}
