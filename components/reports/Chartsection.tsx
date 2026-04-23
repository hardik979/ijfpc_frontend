"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
} from "recharts";
import {
  Activity,
  BarChart2,
  Calendar,
  Briefcase,
  Building2,
  ChevronDown,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  Star,
} from "lucide-react";
import {
  RecordingReport,
  InterviewRecord,
  StudentStats,
  buildInterviewMap,
  getLatestInterview,
  getInterviewStatusMeta,
  getRoundStatusMeta,
  normalizeDate,
  classifySentiment,
  getCallDurationSeconds,
  formatDuration,
  pct,
  QUALITY_SCORE_MAP,
  scoreToOverview,
  PercentBar,
} from "@/utils/Dailycallreport.utils";

/* ============================================================================
 * TYPES
 * ========================================================================== */

type StudentFilter = "all" | "placed" | "interview" | "active";

type DateFilter =
  | { mode: "all" }
  | { mode: "day"; date: string }
  | { mode: "month"; year: number; month: number }
  | { mode: "year"; year: number };

interface ChartSectionProps {
  reports: RecordingReport[];
  interviews: InterviewRecord[];
  /** all available dates (ISO strings) already present in the dataset */
  availableDates: string[];
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const isSameDay = (iso: string, dateStr: string): boolean => {
  return iso.slice(0, 10) === dateStr;
};

const isSameMonth = (iso: string, year: number, month: number): boolean => {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};

const isSameYear = (iso: string, year: number): boolean => {
  return new Date(iso).getFullYear() === year;
};

const filterByDate = (
  reports: RecordingReport[],
  df: DateFilter
): RecordingReport[] => {
  if (df.mode === "all") return reports;
  if (df.mode === "day")
    return reports.filter((r) => isSameDay(r.createdAt, df.date));
  if (df.mode === "month")
    return reports.filter((r) =>
      isSameMonth(r.createdAt, df.year, df.month)
    );
  if (df.mode === "year")
    return reports.filter((r) => isSameYear(r.createdAt, df.year));
  return reports;
};

/* ============================================================================
 * SUB-COMPONENTS
 * ========================================================================== */

interface PlacedAwareTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  placedSet: Set<string>;
  interviewSet: Set<string>;
}

const PlacedAwareTick: React.FC<PlacedAwareTickProps> = ({
  x = 0,
  y = 0,
  payload,
  placedSet,
  interviewSet,
}) => {
  if (!payload) return null;
  const isPlaced = placedSet.has(payload.value);
  const hasInterview = interviewSet.has(payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#5D4037" fontSize={11}>
        {payload.value}
      </text>
      <g>
        {isPlaced && (
          <foreignObject x={hasInterview ? -20 : -9} y={18} width={18} height={18}>
            <div
              title="Placed"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 18, height: 18, background: "#fef3c7",
                borderRadius: 4, border: "1px solid #fcd34d",
              }}
            >
              <Briefcase size={11} color="#d97706" strokeWidth={2} />
            </div>
          </foreignObject>
        )}
        {hasInterview && (
          <foreignObject x={isPlaced ? 2 : -9} y={18} width={18} height={18}>
            <div
              title="Interview Scheduled"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 18, height: 18, background: "#eff6ff",
                borderRadius: 4, border: "1px solid #93c5fd",
              }}
            >
              <Building2 size={11} color="#2563eb" strokeWidth={2} />
            </div>
          </foreignObject>
        )}
      </g>
    </g>
  );
};

/* ============================================================================
 * DATE FILTER PICKER
 * ========================================================================== */

interface DateFilterPickerProps {
  filter: DateFilter;
  onChange: (f: DateFilter) => void;
  availableDates: string[];
}

const DateFilterPicker: React.FC<DateFilterPickerProps> = ({
  filter,
  onChange,
  availableDates,
}) => {
  const [mode, setMode] = useState<"all" | "day" | "month" | "year">(
    filter.mode
  );

  const uniqueYears = useMemo(
    () =>
      Array.from(new Set(availableDates.map((d) => new Date(d).getFullYear()))).sort(
        (a, b) => b - a
      ),
    [availableDates]
  );

  const uniqueDays = useMemo(
    () =>
      Array.from(new Set(availableDates.map((d) => d.slice(0, 10)))).sort(
        (a, b) => b.localeCompare(a)
      ),
    [availableDates]
  );

  const currentYear = new Date().getFullYear();

  const handleModeChange = (m: typeof mode) => {
    setMode(m);
    if (m === "all") onChange({ mode: "all" });
    else if (m === "day")
      onChange({ mode: "day", date: uniqueDays[0] ?? "" });
    else if (m === "month")
      onChange({ mode: "month", year: currentYear, month: new Date().getMonth() });
    else if (m === "year")
      onChange({ mode: "year", year: currentYear });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Mode tabs */}
      <div className="flex rounded-xl border border-[#E9E2D6] bg-[#FAF7F2] p-1 gap-1">
        {(["all", "day", "month", "year"] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              mode === m
                ? "bg-[#8B4513] text-white shadow-sm"
                : "text-[#8B4513] hover:bg-[#F0E8DC]"
            }`}
          >
            {m === "all" ? "All Days" : m}
          </button>
        ))}
      </div>

      {/* Day selector */}
      {mode === "day" && (
        <div className="relative">
          <select
            value={filter.mode === "day" ? filter.date : ""}
            onChange={(e) => onChange({ mode: "day", date: e.target.value })}
            className="appearance-none rounded-xl border border-[#E9E2D6] bg-white px-3 py-2 pr-8 text-xs font-semibold text-[#3E2723] focus:outline-none focus:border-[#8B4513] cursor-pointer"
          >
            {uniqueDays.map((d) => (
              <option key={d} value={d}>
                {new Date(d).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-[#8B4513] pointer-events-none" />
        </div>
      )}

      {/* Month selector */}
      {mode === "month" && (
        <>
          <div className="relative">
            <select
              value={filter.mode === "month" ? filter.month : new Date().getMonth()}
              onChange={(e) =>
                onChange({
                  mode: "month",
                  year: filter.mode === "month" ? filter.year : currentYear,
                  month: Number(e.target.value),
                })
              }
              className="appearance-none rounded-xl border border-[#E9E2D6] bg-white px-3 py-2 pr-8 text-xs font-semibold text-[#3E2723] focus:outline-none focus:border-[#8B4513] cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-[#8B4513] pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filter.mode === "month" ? filter.year : currentYear}
              onChange={(e) =>
                onChange({
                  mode: "month",
                  year: Number(e.target.value),
                  month: filter.mode === "month" ? filter.month : new Date().getMonth(),
                })
              }
              className="appearance-none rounded-xl border border-[#E9E2D6] bg-white px-3 py-2 pr-8 text-xs font-semibold text-[#3E2723] focus:outline-none focus:border-[#8B4513] cursor-pointer"
            >
              {uniqueYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-[#8B4513] pointer-events-none" />
          </div>
        </>
      )}

      {/* Year selector */}
      {mode === "year" && (
        <div className="relative">
          <select
            value={filter.mode === "year" ? filter.year : currentYear}
            onChange={(e) => onChange({ mode: "year", year: Number(e.target.value) })}
            className="appearance-none rounded-xl border border-[#E9E2D6] bg-white px-3 py-2 pr-8 text-xs font-semibold text-[#3E2723] focus:outline-none focus:border-[#8B4513] cursor-pointer"
          >
            {uniqueYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-[#8B4513] pointer-events-none" />
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * STUDENT FILTER TABS
 * ========================================================================== */

interface StudentFilterTabsProps {
  active: StudentFilter;
  onChange: (f: StudentFilter) => void;
  counts: Record<StudentFilter, number>;
}

const StudentFilterTabs: React.FC<StudentFilterTabsProps> = ({
  active,
  onChange,
  counts,
}) => {
  const tabs: { key: StudentFilter; label: string; color: string; activeColor: string }[] = [
    { key: "all", label: "All Students", color: "text-[#8B4513]", activeColor: "bg-[#8B4513]" },
    { key: "placed", label: "Placed", color: "text-amber-700", activeColor: "bg-amber-600" },
    { key: "interview", label: "Interview Scheduled", color: "text-blue-700", activeColor: "bg-blue-600" },
    { key: "active", label: "Active", color: "text-green-700", activeColor: "bg-green-600" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
            active === t.key
              ? `${t.activeColor} text-white border-transparent shadow-md`
              : `bg-white ${t.color} border-[#E9E2D6] hover:border-current`
          }`}
        >
          {t.label}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
              active === t.key ? "bg-white/30" : "bg-gray-100"
            }`}
          >
            {counts[t.key]}
          </span>
        </button>
      ))}
    </div>
  );
};

/* ============================================================================
 * INTERVIEW MINI CARD
 * ========================================================================== */

const InterviewMiniCard: React.FC<{ interview: InterviewRecord }> = ({
  interview,
}) => {
  const statusMeta = getInterviewStatusMeta(interview.overallStatus);
  const latestRound = interview.rounds[interview.rounds.length - 1];

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Building2 className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <p className="font-bold text-[#3E2723] text-sm">{interview.companyName}</p>
            <p className="text-xs text-[#8A7968]">
              {new Date(normalizeDate(interview.createdAt)).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="space-y-1.5">
        {interview.rounds.map((round, idx) => {
          const rm = getRoundStatusMeta(round.status);
          const roundDate = new Date(normalizeDate(round.date));
          return (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-blue-100"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${rm.dot}`} />
                <span className="text-xs font-semibold capitalize text-[#5D4037]">
                  {round.roundName} Round
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A7968]">
                <span>{roundDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <span>{round.time}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full font-bold ${rm.dot.replace("bg-", "text-").replace("-500", "-700")} bg-opacity-10`}
                >
                  {rm.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * MAIN CHART SECTION
 * ========================================================================== */

export default function ChartSection({
  reports,
  interviews,
  availableDates,
}: ChartSectionProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>({ mode: "all" });
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");

  /* ── Interview map ── */
  const interviewMap = useMemo(
    () => buildInterviewMap(interviews),
    [interviews]
  );

  /* ── Date-filtered reports ── */
  const dateFilteredReports = useMemo(
    () => filterByDate(reports, dateFilter),
    [reports, dateFilter]
  );

  /* ── Compute per-student stats from date-filtered reports ── */
  const studentStatsMap = useMemo(() => {
    const map = new Map<string, {
      leadId: string; name: string; phone: string; email: string;
      placed: boolean; total: number; pos: number; neg: number;
      neutral: number; followUps: number; qualityScores: number[];
      totalDurationSeconds: number; calls: RecordingReport[];
    }>();

    dateFilteredReports
      .filter((r) => r.manualStatus !== "DNP" && r.type !== "manual")
      .forEach((r) => {
        const s = classifySentiment(r);
        if (!map.has(r.leadId)) {
          map.set(r.leadId, {
            leadId: r.leadId, name: r.studentName || "Unknown",
            phone: r.phone, email: r.email, placed: r.Placed || false,
            total: 0, pos: 0, neg: 0, neutral: 0, followUps: 0,
            qualityScores: [], totalDurationSeconds: 0, calls: [],
          });
        }
        const st = map.get(r.leadId)!;
        st.total++;
        st.calls.push(r);
        if (s === "pos") st.pos++;
        if (s === "neg") st.neg++;
        if (s === "neutral") st.neutral++;
        if (r.analysis?.followUpRequired) st.followUps++;
        const dur = getCallDurationSeconds(r);
        if (dur > 0) st.totalDurationSeconds += dur;
        const q = r.analysis?.areasOfImprovement?.overallCallQuality?.toLowerCase();
        if (q && QUALITY_SCORE_MAP[q]) st.qualityScores.push(QUALITY_SCORE_MAP[q]);
      });

    return map;
  }, [dateFilteredReports]);

  /* ── Enrich students with interview data ── */
  const allStudents = useMemo(() => {
    return Array.from(studentStatsMap.values()).map((s) => {
      const ivs = interviewMap.get(s.leadId) ?? [];
      const avgQ =
        s.qualityScores.length > 0
          ? s.qualityScores.reduce((a, b) => a + b, 0) / s.qualityScores.length
          : 0;
      return {
        ...s,
        avgQualityScore: Number(avgQ.toFixed(2)),
        overview: scoreToOverview(avgQ),
        conversionRate: pct(s.pos, s.total),
        negativeRate: pct(s.neg, s.total),
        neutralRate: pct(s.neutral, s.total),
        avgDurationSeconds: s.total > 0 ? Math.round(s.totalDurationSeconds / s.total) : 0,
        interviews: ivs,
        hasInterview: ivs.length > 0,
        latestInterview: getLatestInterview(ivs),
      };
    });
  }, [studentStatsMap, interviewMap]);

  /* ── Student filter counts ── */
  const filterCounts: Record<StudentFilter, number> = useMemo(() => ({
    all: allStudents.length,
    placed: allStudents.filter((s) => s.placed).length,
    interview: allStudents.filter((s) => s.hasInterview).length,
    active: allStudents.filter((s) => !s.placed && !s.hasInterview).length,
  }), [allStudents]);

  /* ── Apply student filter ── */
  const filteredStudents = useMemo(() => {
    switch (studentFilter) {
      case "placed":   return allStudents.filter((s) => s.placed);
      case "interview":return allStudents.filter((s) => s.hasInterview);
      case "active":   return allStudents.filter((s) => !s.placed && !s.hasInterview);
      default:         return allStudents;
    }
  }, [allStudents, studentFilter]);

  /* ── Aggregates from filtered students ── */
  const agg = useMemo(() => {
    const totalCalls = filteredStudents.reduce((a, s) => a + s.total, 0);
    const pos = filteredStudents.reduce((a, s) => a + s.pos, 0);
    const neg = filteredStudents.reduce((a, s) => a + s.neg, 0);
    const neutral = filteredStudents.reduce((a, s) => a + s.neutral, 0);
    const totalDur = filteredStudents.reduce((a, s) => a + s.totalDurationSeconds, 0);
    const interviewStudents = filteredStudents.filter((s) => s.hasInterview);
    const placedStudents = filteredStudents.filter((s) => s.placed);

    /* Sentiment donut */
    const sentimentData = [
      { name: "Positive", value: pos, color: "#16a34a", percent: pct(pos, totalCalls) },
      { name: "Negative", value: neg, color: "#dc2626", percent: pct(neg, totalCalls) },
      { name: "Neutral",  value: neutral, color: "#d97706", percent: pct(neutral, totalCalls) },
    ].filter((d) => d.value > 0);

    /* Bar chart: top 8 by total */
    const performanceData = [...filteredStudents]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((s) => ({
        name: s.name.split(" ")[0],
        fullName: s.name,
        Positive: s.pos,
        Neutral: s.neutral,
        Negative: s.neg,
        Total: s.total,
        posPct: pct(s.pos, s.total),
        neutralPct: pct(s.neutral, s.total),
        negPct: pct(s.neg, s.total),
        placed: s.placed,
        hasInterview: s.hasInterview,
      }));

    /* Quality distribution */
    const qualityDist = [
      { quality: "Excellent", count: 0, color: "#16a34a" },
      { quality: "Good",      count: 0, color: "#0ea5e9" },
      { quality: "Average",   count: 0, color: "#f59e0b" },
      { quality: "Poor",      count: 0, color: "#dc2626" },
    ];
    filteredStudents.forEach((s) => {
      if (s.avgQualityScore >= 3.5) qualityDist[0].count++;
      else if (s.avgQualityScore >= 2.5) qualityDist[1].count++;
      else if (s.avgQualityScore >= 1.5) qualityDist[2].count++;
      else if (s.avgQualityScore > 0) qualityDist[3].count++;
    });

    /* Interview status breakdown */
    const interviewStatusCounts: Record<string, number> = {};
    interviewStudents.forEach((s) => {
      s.interviews.forEach((iv) => {
        interviewStatusCounts[iv.overallStatus] =
          (interviewStatusCounts[iv.overallStatus] ?? 0) + 1;
      });
    });
    const interviewChartData = Object.entries(interviewStatusCounts).map(
      ([status, count]) => {
        const meta = getInterviewStatusMeta(status as InterviewRecord["overallStatus"]);
        return { name: status, label: meta.label, value: count };
      }
    );

    /* Company-wise interviews */
    const companyMap = new Map<string, number>();
    interviewStudents.forEach((s) => {
      s.interviews.forEach((iv) => {
        companyMap.set(iv.companyName, (companyMap.get(iv.companyName) ?? 0) + 1);
      });
    });
    const companyChartData = Array.from(companyMap.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalCalls, pos, neg, neutral, totalDur,
      conversionRate: pct(pos, totalCalls),
      negativeRate: pct(neg, totalCalls),
      neutralRate: pct(neutral, totalCalls),
      sentimentData, performanceData, qualityDist,
      interviewChartData, companyChartData,
      interviewStudents, placedStudents,
    };
  }, [filteredStudents]);

  /* ── Placed + interview sets for axis tick ── */
  const placedSet = useMemo(
    () => new Set(filteredStudents.filter((s) => s.placed).map((s) => s.name.split(" ")[0])),
    [filteredStudents]
  );
  const interviewSet = useMemo(
    () => new Set(filteredStudents.filter((s) => s.hasInterview).map((s) => s.name.split(" ")[0])),
    [filteredStudents]
  );

  const cardBase =
    "rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm hover:shadow-md transition-all p-4 sm:p-5 lg:p-6";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ═══════════════════ FILTER BAR ═══════════════════ */}
      <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#F5EEDC] rounded-lg">
              <Filter className="w-4 h-4 text-[#8B4513]" />
            </div>
            <span className="text-sm font-bold text-[#3E2723]">Chart Filters</span>
          </div>
          <div className="h-px flex-1 bg-[#F0E8DC]" />
          <span className="text-xs text-[#8A7968]">
            Showing <strong className="text-[#8B4513]">{filteredStudents.length}</strong> students · <strong className="text-[#8B4513]">{agg.totalCalls}</strong> calls
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Date filter */}
          <DateFilterPicker
            filter={dateFilter}
            onChange={setDateFilter}
            availableDates={availableDates}
          />

          {/* Student type filter */}
          <StudentFilterTabs
            active={studentFilter}
            onChange={setStudentFilter}
            counts={filterCounts}
          />
        </div>
      </div>

      {/* ═══════════════════ QUICK STATS ROW ═══════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#E9E2D6] bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-[#9A7B5A] font-semibold">Total Calls</p>
          <p className="text-2xl font-black text-[#2D1F16]">{agg.totalCalls}</p>
          <div className="mt-2">
            <PercentBar
              positive={agg.pos} neutral={agg.neutral}
              negative={agg.neg} total={agg.totalCalls}
              showLabels={false} height="h-1.5"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-green-700 font-semibold">Total Talk Time</p>
          <p className="text-2xl font-black text-green-900">{formatDuration(agg.totalDur)}</p>
          <p className="text-[10px] text-green-600 mt-1 font-medium">Across {filteredStudents.length} students</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold">Placed</p>
          <p className="text-2xl font-black text-amber-900">{agg.placedStudents.length}</p>
          <p className="text-[10px] text-amber-600 mt-1 font-medium">
            {pct(agg.placedStudents.length, filteredStudents.length)}% of students
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-blue-700 font-semibold">Interviews</p>
          <p className="text-2xl font-black text-blue-900">{agg.interviewStudents.length}</p>
          <p className="text-[10px] text-blue-600 mt-1 font-medium">Students with interviews</p>
        </div>
      </div>

      {/* ═══════════════════ SENTIMENT + PERFORMANCE CHARTS ═══════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
        {/* Sentiment Pie */}
        <div className="xl:col-span-2 rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white p-4 sm:p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#8B4513]" />
              Sentiment Distribution
            </h3>
            <p className="text-xs sm:text-sm text-[#7A6753] mt-1">
              {studentFilter !== "all"
                ? `${studentFilter.charAt(0).toUpperCase() + studentFilter.slice(1)} students`
                : "All students"} · {agg.totalCalls} calls
            </p>
          </div>
          <div className="h-[280px] sm:h-[320px]">
            {agg.sentimentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agg.sentimentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={5}
                    stroke="none"
                    label={({ name, payload }) => `${name} ${payload.percent}%`}
                  >
                    {agg.sentimentData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percent}%)`, name,
                    ]}
                    contentStyle={{ borderRadius: 16, border: "1px solid #eee2d0" }}
                  />
                  <Legend
                    verticalAlign="bottom" iconType="circle"
                    wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#9A8572] text-center">
                No data for current filters
              </div>
            )}
          </div>
        </div>

        {/* Performance Bar Chart */}
        <div className="xl:col-span-3 rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white p-4 sm:p-6 shadow-lg">
          <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16] flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#8B4513]" />
                Top Student Performance
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {placedSet.size > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1">
                    <Briefcase size={10} color="#d97706" strokeWidth={2} />
                    <span className="text-[10px] font-semibold text-amber-700">= Placed</span>
                  </div>
                )}
                {interviewSet.size > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2 py-1">
                    <Building2 size={10} color="#2563eb" strokeWidth={2} />
                    <span className="text-[10px] font-semibold text-blue-700">= Interview</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="h-[300px] sm:h-[340px]">
            {agg.performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={agg.performanceData}
                  margin={{ top: 25, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E9DF" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    height={50}
                    tick={(props) => (
                      <PlacedAwareTick
                        {...props}
                        placedSet={placedSet}
                        interviewSet={interviewSet}
                      />
                    )}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Recordings",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle", fontSize: 11, fill: "#7A6753" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #eee2d0" }}
                    formatter={(value: number, name: string, props: any) => {
                      const d = props.payload;
                      const pctVal = name === "Positive" ? d.posPct : name === "Neutral" ? d.neutralPct : d.negPct;
                      return [`${value} calls (${pctVal}%)`, name];
                    }}
                    labelFormatter={(label: string, payload: any) =>
                      payload?.length ? `${payload[0]?.payload?.fullName ?? label} — Total: ${payload[0].payload.Total}` : label
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                  <Bar dataKey="Positive" stackId="a" fill="#16a34a" />
                  <Bar dataKey="Neutral"  stackId="a" fill="#d97706" />
                  <Bar dataKey="Negative" stackId="a" fill="#dc2626" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="Total" position="top"
                      style={{ fontSize: "11px", fill: "#5D4037", fontWeight: 600 }}
                      formatter={(v: React.ReactNode) => `${v}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#9A8572] text-center">
                No student data for current filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ QUALITY + INTERVIEW STATUS ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <div className={cardBase}>
          <h3 className="text-lg font-bold text-[#2D1F16] mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            A.I. Call Quality Distribution
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agg.qualityDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E9DF" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="quality" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee2d0" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {agg.qualityDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="count" position="right"
                    style={{ fontSize: 12, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interview Status Chart */}
        <div className={cardBase}>
          <h3 className="text-lg font-bold text-[#2D1F16] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Interview Pipeline
          </h3>
          {agg.interviewStudents.length > 0 ? (
            <>
              {/* Status breakdown */}
              {agg.interviewChartData.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#9A7B5A] uppercase tracking-widest mb-2">
                    By Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agg.interviewChartData.map((d) => {
                      const meta = getInterviewStatusMeta(d.name as InterviewRecord["overallStatus"]);
                      return (
                        <div
                          key={d.name}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${meta.bg} ${meta.border}`}
                        >
                          <span className={`text-sm font-black ${meta.text}`}>{d.value}</span>
                          <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Company breakdown */}
              {agg.companyChartData.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#9A7B5A] uppercase tracking-widest mb-2">
                    By Company
                  </p>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={agg.companyChartData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                        <XAxis dataKey="company" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #bfdbfe" }} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          <LabelList
                            dataKey="count" position="top"
                            style={{ fontSize: 11, fontWeight: 700, fill: "#1d4ed8" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-center">
              <Building2 className="w-12 h-12 text-blue-200 mb-3" />
              <p className="text-sm text-[#9A8572] font-medium">
                No interview data
              </p>
              <p className="text-xs text-[#B0A090] mt-1">
                {studentFilter === "interview"
                  ? "No interviews for current date filter"
                  : "Switch to 'Interview Scheduled' tab to see pipeline"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ INTERVIEW STUDENT CARDS ═══════════════════ */}
      {studentFilter === "interview" && agg.interviewStudents.length > 0 && (
        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#2D1F16] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Students with Interviews ({agg.interviewStudents.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agg.interviewStudents.map((s) => (
              <div
                key={s.leadId}
                className="rounded-2xl border border-[#E9E2D6] bg-white shadow-sm p-4"
              >
                {/* Student header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5EEDC] to-[#E9DECF] flex items-center justify-center text-sm font-bold text-[#8B4513]">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#3E2723] text-sm truncate">{s.name}</p>
                      {s.placed && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                          <Briefcase size={9} color="#d97706" strokeWidth={2} />
                          <span className="text-[9px] font-bold text-amber-700">Placed</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8A7968] truncate">{s.email}</p>
                  </div>
                </div>

                {/* Call stats */}
                <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                  <div className="rounded-lg bg-green-50 border border-green-100 p-1.5">
                    <p className="text-sm font-black text-green-700">{s.pos}</p>
                    <p className="text-[9px] text-green-600">Positive</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-1.5">
                    <p className="text-sm font-black text-amber-700">{s.neutral}</p>
                    <p className="text-[9px] text-amber-600">Neutral</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-1.5">
                    <p className="text-sm font-black text-red-700">{s.neg}</p>
                    <p className="text-[9px] text-red-600">Negative</p>
                  </div>
                </div>

                {/* Interview cards */}
                <div className="space-y-2">
                  {s.interviews.map((iv, idx) => (
                    <InterviewMiniCard key={idx} interview={iv} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}