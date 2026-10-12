"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  Building,
  Calendar,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Search,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { API_LMS_URL } from "@/lib/api";

const LMS_API_KEY = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "";
const UNASSIGNED = "Not linked to a course";

interface CoursePlacementRow {
  _id: string;
  studentName: string;
  companyName: string;
  offerDate: string | null;
  joiningDate: string | null;
  createdAt: string;
  courses: string[];
}

type DateBasis = "offerDate" | "joiningDate";
type Preset = "7d" | "30d" | "90d" | "year" | "all" | "custom";
type Granularity = "auto" | "day" | "week" | "month";

interface PlacedRow {
  row: CoursePlacementRow;
  date: string; // yyyy-mm-dd (local)
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

const BASIS_OPTIONS: { key: DateBasis; label: string }[] = [
  { key: "offerDate", label: "Offer date" },
  { key: "joiningDate", label: "Joining date" },
];

const GRANULARITY_OPTIONS: { key: Granularity; label: string }[] = [
  { key: "auto", label: "Auto" },
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const BAR_COLORS = [
  "#7c3aed",
  "#6366f1",
  "#8b5cf6",
  "#4f46e5",
  "#a855f7",
  "#818cf8",
];

/* ───────── date helpers (all in local time, yyyy-mm-dd strings) ───────── */

const pad = (n: number) => String(n).padStart(2, "0");
const fmtYMD = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYMD = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const toYMD = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return fmtYMD(date);
};
const addDays = (s: string, days: number) => {
  const d = parseYMD(s);
  d.setDate(d.getDate() + days);
  return fmtYMD(d);
};
const diffDays = (a: string, b: string) =>
  Math.round((parseYMD(b).getTime() - parseYMD(a).getTime()) / 86400000);
const mondayOf = (s: string) => {
  const d = parseYMD(s);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return fmtYMD(d);
};
const monthStart = (s: string) => `${s.slice(0, 7)}-01`;
const nextMonthStart = (s: string) => {
  const d = parseYMD(monthStart(s));
  d.setMonth(d.getMonth() + 1);
  return fmtYMD(d);
};

const shortDate = (s: string) =>
  parseYMD(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const longDate = (s: string) =>
  parseYMD(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const monthLabel = (s: string) =>
  parseYMD(s).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

const bucketKeyFor = (date: string, unit: Exclude<Granularity, "auto">) =>
  unit === "day" ? date : unit === "week" ? mondayOf(date) : monthStart(date);

const bucketLabel = (key: string, unit: Exclude<Granularity, "auto">) =>
  unit === "month" ? monthLabel(key) : shortDate(key);

const bucketTitle = (key: string, unit: Exclude<Granularity, "auto">) =>
  unit === "day"
    ? longDate(key)
    : unit === "week"
      ? `Week of ${longDate(key)}`
      : parseYMD(key).toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        });

const pickUnit = (spanDays: number): Exclude<Granularity, "auto"> =>
  spanDays <= 62 ? "day" : spanDays <= 400 ? "week" : "month";

/* ───────── component ───────── */

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Bucket {
  key: string;
  label: string;
  count: number;
  names: string[];
}

const CoursePlacementAnalytics: React.FC<Props> = ({ open, onClose }) => {
  const [rows, setRows] = useState<CoursePlacementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [basis, setBasis] = useState<DateBasis>("offerDate");
  const [preset, setPreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("auto");
  const [course, setCourse] = useState<string | null>(null);
  const [bucket, setBucket] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState("");

  const load = useCallback(async () => {
    if (!API_LMS_URL) {
      setError("NEXT_PUBLIC_LMS_URL is not configured");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_LMS_URL.replace(/\/$/, "")}/api/offers/course-placements`,
        { headers: { "x-api-key": LMS_API_KEY }, cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load placement analytics");
      setRows((await res.json()) as CoursePlacementRow[]);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first open; keep data for later opens (refresh button re-fetches).
  useEffect(() => {
    if (open && !loaded && !loading) void load();
  }, [open, loaded, loading, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Offers that have a date for the chosen basis.
  const dated = useMemo<PlacedRow[]>(
    () =>
      rows
        .map((row) => ({ row, date: toYMD(row[basis]) }))
        .filter((item): item is PlacedRow => item.date !== ""),
    [rows, basis],
  );
  const undatedCount = rows.length - dated.length;

  const dataBounds = useMemo(() => {
    if (!dated.length) return null;
    const sorted = dated.map((d) => d.date).sort();
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }, [dated]);

  // Effective [from, to] window (inclusive).
  const range = useMemo(() => {
    const today = fmtYMD(new Date());
    if (preset === "7d") return { from: addDays(today, -6), to: today };
    if (preset === "30d") return { from: addDays(today, -29), to: today };
    if (preset === "90d") return { from: addDays(today, -89), to: today };
    if (preset === "year")
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    if (preset === "custom")
      return {
        from: customFrom || dataBounds?.min || today,
        to: customTo || dataBounds?.max || today,
      };
    return {
      from: dataBounds?.min || today,
      to: dataBounds?.max || today,
    };
  }, [preset, customFrom, customTo, dataBounds]);

  const rangeInvalid = range.from > range.to;

  const inRange = useMemo(
    () =>
      rangeInvalid
        ? []
        : dated.filter((d) => d.date >= range.from && d.date <= range.to),
    [dated, range, rangeInvalid],
  );

  // course → placed rows (each offer belongs to the course set on the offer).
  const byCourse = useMemo(() => {
    const map = new Map<string, PlacedRow[]>();
    for (const item of inRange) {
      const titles = item.row.courses.length ? item.row.courses : [UNASSIGNED];
      for (const title of titles) {
        const list = map.get(title);
        if (list) list.push(item);
        else map.set(title, [item]);
      }
    }
    return Array.from(map.entries())
      .map(([title, list]) => ({ title, list, count: list.length }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  }, [inRange]);

  // Selected course may disappear when the filter changes.
  const selected = useMemo(
    () => byCourse.find((c) => c.title === course) || null,
    [byCourse, course],
  );

  const spanDays = Math.max(diffDays(range.from, range.to) + 1, 1);
  const unit: Exclude<Granularity, "auto"> =
    granularity === "auto" ? pickUnit(spanDays) : granularity;

  const series = useMemo<Bucket[]>(() => {
    if (!selected || rangeInvalid) return [];
    const map = new Map<string, Bucket>();
    // Pre-fill every bucket in the window so quiet days show as zero.
    let cursor = bucketKeyFor(range.from, unit);
    const last = bucketKeyFor(range.to, unit);
    let guard = 0;
    while (cursor <= last && guard++ < 2000) {
      map.set(cursor, {
        key: cursor,
        label: bucketLabel(cursor, unit),
        count: 0,
        names: [],
      });
      cursor =
        unit === "day"
          ? addDays(cursor, 1)
          : unit === "week"
            ? addDays(cursor, 7)
            : nextMonthStart(cursor);
    }
    for (const item of selected.list) {
      const entry = map.get(bucketKeyFor(item.date, unit));
      if (entry) {
        entry.count += 1;
        entry.names.push(item.row.studentName);
      }
    }
    return Array.from(map.values());
  }, [selected, range, unit, rangeInvalid]);

  const peak = useMemo(
    () =>
      series.reduce<Bucket | null>(
        (best, b) => (b.count > (best?.count ?? 0) ? b : best),
        null,
      ),
    [series],
  );

  const visibleStudents = useMemo(() => {
    if (!selected) return [];
    const list = bucket
      ? selected.list.filter((i) => bucketKeyFor(i.date, unit) === bucket)
      : selected.list;
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, bucket, unit]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return q
      ? byCourse.filter((c) => c.title.toLowerCase().includes(q))
      : byCourse;
  }, [byCourse, courseSearch]);

  const maxCourseCount = byCourse[0]?.count || 1;
  const linkedCourses = byCourse.filter((c) => c.title !== UNASSIGNED);
  const topCourse = linkedCourses[0];
  const unassignedCount =
    byCourse.find((c) => c.title === UNASSIGNED)?.count ?? 0;

  const pickPreset = (next: Preset) => {
    setPreset(next);
    setBucket(null);
    if (next === "custom" && !customFrom && !customTo) {
      setCustomFrom(range.from);
      setCustomTo(range.to);
    }
  };

  if (!open) return null;

  const rangeText =
    preset === "all" && !dataBounds
      ? "No dated placements"
      : `${longDate(range.from)} – ${longDate(range.to)}`;

  const overviewData = byCourse.slice(0, 12).map((c) => ({
    name: c.title,
    count: c.count,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Course placement insights"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-purple-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Placement Insights
              </h2>
              <p className="text-sm text-gray-600">
                Students placed per course, over time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              title="Refresh data"
              aria-label="Refresh data"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 text-gray-600 transition-colors hover:bg-purple-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 border-b border-purple-100 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">
                Count by
              </span>
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {BASIS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setBasis(opt.key);
                      setBucket(null);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      basis === opt.key
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Calendar className="mr-1 h-4 w-4 text-gray-400" />
              {PRESETS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => pickPreset(opt.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    preset === opt.key
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="From date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setBucket(null);
                  }}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setBucket(null);
                  }}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">{rangeText}</span>
            {undatedCount > 0 && (
              <>
                {" "}
                · {undatedCount} record{undatedCount === 1 ? "" : "s"} without a{" "}
                {basis === "offerDate" ? "offer" : "joining"} date excluded
              </>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 px-5 py-5">
          {loading && !loaded ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-purple-700">
              <LoaderCircle className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Loading placements…</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-1 text-sm text-red-600 underline"
              >
                Try again
              </button>
            </div>
          ) : rangeInvalid ? (
            <EmptyState
              title="Invalid date range"
              body="The start date is after the end date. Adjust the custom range."
            />
          ) : inRange.length === 0 ? (
            <EmptyState
              title="No placements in this period"
              body="Try a wider date range or switch between offer date and joining date."
            />
          ) : (
            <div className="space-y-5">
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi
                  icon={<Users className="h-4 w-4" />}
                  label="Students placed"
                  value={inRange.length}
                  hint="unique offers in range"
                />
                <Kpi
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Courses with placements"
                  value={linkedCourses.length}
                />
                <Kpi
                  icon={<Trophy className="h-4 w-4" />}
                  label="Top course"
                  value={topCourse ? topCourse.count : 0}
                  hint={topCourse?.title || "—"}
                />
                <Kpi
                  icon={<Building className="h-4 w-4" />}
                  label="Course not linked"
                  value={unassignedCount}
                  hint="offers with no course selected"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                {/* Course list */}
                <div className="flex max-h-[34rem] flex-col rounded-xl border border-purple-100 bg-white shadow-sm">
                  <div className="border-b border-gray-100 p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder="Search courses..."
                        className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-500">
                      {byCourse.length} course{byCourse.length === 1 ? "" : "s"}{" "}
                      · click one to see its timeline
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto premium-scrollbar">
                    {filteredCourses.length === 0 ? (
                      <p className="p-6 text-center text-sm text-gray-500">
                        No matching course
                      </p>
                    ) : (
                      filteredCourses.map((c) => {
                        const active = selected?.title === c.title;
                        return (
                          <button
                            key={c.title}
                            type="button"
                            onClick={() => {
                              setCourse(active ? null : c.title);
                              setBucket(null);
                            }}
                            aria-pressed={active}
                            className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors ${
                              active
                                ? "bg-purple-50"
                                : "hover:bg-purple-50/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={`truncate text-sm font-medium ${
                                  c.title === UNASSIGNED
                                    ? "italic text-gray-500"
                                    : "text-gray-900"
                                }`}
                              >
                                {c.title}
                              </span>
                              <span className="shrink-0 text-sm font-bold text-purple-700">
                                {c.count}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                style={{
                                  width: `${Math.max(
                                    (c.count / maxCourseCount) * 100,
                                    3,
                                  )}%`,
                                }}
                              />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Detail */}
                <div className="min-w-0 rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
                  {!selected ? (
                    <>
                      <h3 className="text-base font-semibold text-gray-900">
                        Placements by course
                      </h3>
                      <p className="mb-3 text-xs text-gray-500">
                        Top {overviewData.length} courses in this period. Select
                        a course to see placements per{" "}
                        {unit === "day" ? "day" : unit}.
                      </p>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={overviewData}
                            margin={{ left: 0, right: 16, top: 24, bottom: 8 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#e5e7eb"
                            />
                            <XAxis
                              dataKey="name"
                              interval={0}
                              tick={{ fill: "#6b7280", fontSize: 11 }}
                              tickFormatter={(v: string) =>
                                v.length > 14 ? `${v.slice(0, 13)}…` : v
                              }
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                              label={{
                                value: "Students placed",
                                angle: -90,
                                position: "insideLeft",
                                style: {
                                  fill: "#9ca3af",
                                  fontSize: 12,
                                  textAnchor: "middle",
                                },
                              }}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(124,58,237,0.08)" }}
                              labelFormatter={(label) => String(label)}
                              formatter={(v) => [`${v} placed`, ""]}
                              separator=""
                            />
                            <Bar
                              dataKey="count"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={64}
                              cursor="pointer"
                              onClick={(data) => {
                                const d = data as unknown as { name?: string };
                                if (d?.name) setCourse(d.name);
                              }}
                            >
                              {overviewData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={BAR_COLORS[i % BAR_COLORS.length]}
                                />
                              ))}
                              <LabelList
                                dataKey="count"
                                position="top"
                                style={{
                                  fill: "#7c3aed",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCourse(null);
                              setBucket(null);
                            }}
                            className="mb-1 flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            All courses
                          </button>
                          <h3 className="truncate text-lg font-semibold text-gray-900">
                            {selected.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            <span className="font-semibold text-purple-700">
                              {selected.count}
                            </span>{" "}
                            placed
                            {peak && peak.count > 0 && (
                              <>
                                {" "}
                                · busiest {unit}:{" "}
                                <span className="font-semibold text-gray-700">
                                  {bucketTitle(peak.key, unit)}
                                </span>{" "}
                                ({peak.count})
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex rounded-lg bg-gray-100 p-0.5">
                          {GRANULARITY_OPTIONS.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setGranularity(opt.key);
                                setBucket(null);
                              }}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                granularity === opt.key
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={series}
                            margin={{ left: -12, right: 8, top: 8, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#e5e7eb"
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: "#6b7280", fontSize: 11 }}
                              minTickGap={18}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(124,58,237,0.08)" }}
                              content={(props) => {
                                const point = props.payload?.[0]?.payload as
                                  | Bucket
                                  | undefined;
                                if (!props.active || !point) return null;
                                return (
                                  <div className="max-w-xs rounded-lg border border-purple-100 bg-white px-3 py-2 text-xs shadow-lg">
                                    <p className="font-semibold text-gray-900">
                                      {bucketTitle(point.key, unit)}
                                    </p>
                                    <p className="text-purple-700">
                                      {point.count} placed
                                    </p>
                                    {point.names.slice(0, 5).map((n, i) => (
                                      <p key={i} className="text-gray-600">
                                        • {n}
                                      </p>
                                    ))}
                                    {point.names.length > 5 && (
                                      <p className="text-gray-400">
                                        +{point.names.length - 5} more
                                      </p>
                                    )}
                                  </div>
                                );
                              }}
                            />
                            <Bar
                              dataKey="count"
                              radius={[5, 5, 0, 0]}
                              maxBarSize={36}
                              cursor="pointer"
                              onClick={(data) => {
                                const d = data as unknown as Partial<Bucket>;
                                if (!d?.key || !d.count) return;
                                setBucket((cur) => (cur === d.key ? null : d.key!));
                              }}
                            >
                              {series.map((b) => (
                                <Cell
                                  key={b.key}
                                  fill={
                                    bucket && bucket !== b.key
                                      ? "#c4b5fd"
                                      : "#7c3aed"
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Click a bar to list only those students.
                      </p>

                      {/* Students */}
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Students{" "}
                            <span className="font-normal text-gray-500">
                              ({visibleStudents.length})
                            </span>
                          </h4>
                          {bucket && (
                            <button
                              type="button"
                              onClick={() => setBucket(null)}
                              className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
                            >
                              {bucketTitle(bucket, unit)}
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="max-h-56 divide-y divide-gray-100 overflow-y-auto premium-scrollbar rounded-lg border border-gray-100">
                          {visibleStudents.map(({ row, date }) => (
                            <div
                              key={`${row._id}-${date}`}
                              className="flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">
                                  {row.studentName}
                                </p>
                                <p className="flex items-center truncate text-xs text-gray-500">
                                  <Building className="mr-1 h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {row.companyName || "No company"}
                                  </span>
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-medium text-indigo-600">
                                {longDate(date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Each placement is counted under the course selected on its offer.
                Offers with no course selected appear under “{UNASSIGNED}”.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Kpi: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}> = ({ icon, label, value, hint }) => (
  <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700">
      {icon}
      {label}
    </div>
    <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    {hint && <p className="truncate text-xs text-gray-500">{hint}</p>}
  </div>
);

const EmptyState: React.FC<{ title: string; body: string }> = ({
  title,
  body,
}) => (
  <div className="flex h-64 flex-col items-center justify-center text-center">
    <BarChart3 className="mb-3 h-12 w-12 text-gray-300" />
    <h3 className="text-base font-medium text-gray-900">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-gray-600">{body}</p>
  </div>
);

export default CoursePlacementAnalytics;
