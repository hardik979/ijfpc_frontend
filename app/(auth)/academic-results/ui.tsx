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
import { fetchCourses, type Course, type TabKey } from "./data";

/* ═══════════════════════════ CourseFilter ══════════════════════ */
export function CourseFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  return (
    <div className="relative">
      <BookOpen className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All courses</option>
        {courses.map((c) => (
          <option key={c._id} value={c._id}>
            {c.title ?? c.name ?? c._id}
          </option>
        ))}
      </select>
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
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            active === t.key
              ? "bg-blue-600 text-white shadow"
              : "text-slate-300 hover:bg-slate-800"
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
} as const;

export type Accent = keyof typeof ACCENTS;

export type StatItem = {
  label: string;
  value: number | string;
  accent: Accent;
};

export function StatCards({
  items,
  columns = 4,
}: {
  items: StatItem[];
  /** Max columns at the widest breakpoint (so 5-card layouts don't squash). */
  columns?: 2 | 3 | 4 | 5;
}) {
  const grid =
    columns === 5
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

function StatCard({ label, value, accent }: StatItem) {
  const a = ACCENTS[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${a.bar}`} />
      <div
        className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${a.ring} blur-2xl`}
      />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-wider text-slate-400">
          {label}
        </div>
        <div className={`mt-1 text-3xl font-semibold ${a.value}`}>{value}</div>
      </div>
    </div>
  );
}

/* ═════════════════════════════ MonthlyChart ════════════════════ */
export type ChartSeries = { key: string; name: string; color: string };

export function MonthlyChart({
  data,
  series,
  title,
  yLabel,
  month,
}: {
  data: Array<{ date: string } & Record<string, unknown>>;
  series: ChartSeries[];
  title?: string;
  /** Optional rotated label for the Y-axis (e.g. "Students attempted"). */
  yLabel?: string;
  /**
   * Month as "YYYY-MM". When provided, every day of the month gets a bar —
   * days with no records show 0 instead of being skipped.
   */
  month?: string;
}) {
  // Show the day-of-month on the x-axis for a compact monthly view.
  const chartData = useMemo(() => {
    if (!month) {
      return data.map((d) => ({ ...d, day: d.date?.slice(8) ?? d.date }));
    }
    const [year, mon] = month.split("-").map(Number);
    // Day 0 of the next month is the last day of this one.
    const daysInMonth = new Date(year, mon, 0).getDate();
    const byDate = new Map(data.map((d) => [d.date, d]));
    const zeros = Object.fromEntries(series.map((s) => [s.key, 0]));
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dd = String(i + 1).padStart(2, "0");
      const date = `${month}-${dd}`;
      const existing = byDate.get(date);
      return existing ? { ...existing, day: dd } : { ...zeros, date, day: dd };
    });
  }, [data, month, series]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      {title && (
        <h3 className="mb-3 text-sm font-medium text-slate-300">{title}</h3>
      )}
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
          No data for this month
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 6, right: 8, left: yLabel ? 12 : -18, bottom: 0 }}
          >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                label={
                  yLabel
                    ? {
                        value: yLabel,
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                        fontSize: 11,
                        style: { textAnchor: "middle" },
                      }
                    : undefined
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
                labelStyle={{ color: "#e2e8f0" }}
                labelFormatter={(label) => `Day ${label}`}
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  <LabelList
                    dataKey={s.key}
                    position="top"
                    fontSize={10}
                    fill="#e2e8f0"
                    formatter={(v) => (v ? `${v}` : "")}
                  />
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
  month,
  data,
  loading,
  metrics,
  onMonthChange,
  onDateSelect,
}: {
  month: string;
  data: DayRow[];
  loading: boolean;
  metrics: CalendarMetric[];
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
}) {
  return (
    <CalendarFormate
      // Remount when the month changes externally (top picker / tab switch)
      // so the internal cursor stays in sync.
      key={month}
      title="Monthly Summary"
      initialMonth={month}
      loading={loading}
      data={data}
      onMonthChange={onMonthChange}
      onDateSelect={(date, dayData) => {
        if (dayData) onDateSelect(date);
      }}
      renderCell={({ date, inMonth, isToday, isSelected, dayData }) => {
        const d = dayData as DayRow | null;
        const dow = new Date(date).getDay();
        const dayNum = new Date(date).getDate();
        const numColor = !inMonth
          ? "text-gray-400"
          : dow === 0
          ? "text-red-400"
          : dow >= 1 && dow <= 5
          ? "text-emerald-400"
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
                : "border-transparent hover:bg-white/5",
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
                    className={`flex justify-between ${
                      m.className ?? "text-gray-500"
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="font-semibold">
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
