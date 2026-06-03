"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import {ResponsiveContainer,ComposedChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,LineChart,Line,ReferenceLine,ReferenceArea,PieChart,Pie,Cell,Legend} from "recharts";
import {ArrowLeft,Calendar,Users,TrendingUp,TrendingDown,Award,BookOpen,Search,X,Send,Loader2,ChevronRight,Activity,Plus,Layers,Sparkles,Upload,Download,FileSpreadsheet,CheckCircle2,AlertTriangle} from "lucide-react";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

// ───────────────────────── Types ─────────────────────────

type View = "overview" | "course" | "student";
type RemarkEnum = "Excellent" | "Good" | "Average" | "Bad";
type BatchRange = "week" | "month";

// One day of aggregated batch performance (from /get-overall-batch-remarks).
// Rendered as a candlestick: `open` is the previous bucket's unique-student
// count, `unique` (the close) is this bucket's count, and `body` is the
// [low, high] span the candle body covers.
type BatchDay = {
  date: string; // x-axis label (weekday name for week, date number for month)
  iso: string; // YYYY-MM-DD for sorting
  unique: number; // close — unique students remarked that day
  open: number; // previous bucket's unique-student count
  avg: number; // average score that day (tooltip only)
  count: number; // assessments that day (tooltip only)
  body: [number, number]; // [min(open,close), max(open,close)]
  dir: "up" | "down" | "flat"; // candle direction → color
};

// A slice of the remark-distribution pie.
type RemarkSlice = {
  name: RemarkEnum;
  value: number;
  color: string;
};

type BatchRemark = {
  _id: string;
  clerkId: string;
  remark?: RemarkEnum;
  score?: number | string;
  createdAt: string;
};

type BatchSummary = {
  totalAssessments: number;
  uniqueStudents: number;
  remarkCounts: Record<string, number>;
  averageScore: number | null;
};

type Student = {
  _id?: string;
  clerkId: string;
  fullName?: string;
  email?: string;
  zone?: string;
  joinedMonth?: string;
  feePlan?: string;
  isPlaced?: boolean;
  isRealUser?: boolean;
  purchasedCourses?: string[];
  batchHistory?: { to?: string; from?: string | null; changedAt?: string }[];
};

type Course = { _id: string; title?: string };

type UploadSkip = { row: number; name?: string; email?: string; reason: string };
type UploadResult = {
  inserted: number;
  skippedCount: number;
  skipped: UploadSkip[];
  matchedStudents: { clerkId: string; fullName?: string; email?: string }[];
  totalRows: number;
};

type Remark = {
  _id: string;
  clerkId: string;
  fullName?: string;
  areaOfImprovement?: string;
  areaOfStrength?: string;
  practiceTask?: string;
  remark?: RemarkEnum;
  score?: number;
  assessedBy?: { fullName?: string; email?: string } | string;
  createdAt: string;
};

type Candle = {
  name: string;
  open: number;
  close: number;
  high: number;
  low: number;
  avg: number;
  count: number;
  range: [number, number];
  meta?: any;
};

type CourseStack = {
  name: string;
  poor: number;
  average: number;
  good: number;
  excellent: number;
  poorAvg: number;
  averageAvg: number;
  goodAvg: number;
  excellentAvg: number;
  total: number;
  overallAvg: number;
};

// ───────────────────────── Constants ─────────────────────────

const STRENGTH_OPTIONS = [
  "Good communication flow",
  "Clear pronunciation and voice clarity",
  "Confident speaking style",
  "Good understanding of interview questions",
];

const IMPROVEMENT_OPTIONS = [
  "Needs to improve fluency",
  "Needs better sentence formation",
  "Needs more confidence while speaking",
  "Needs to reduce hesitation and pauses",
];

const PRACTICE_TASK_OPTIONS = [
  "Practice daily self-introduction",
  "Practice HR interview questions",
  "Record and review speaking practice",
  "Practice explaining technical projects/skills",
];

const REMARK_OPTIONS: RemarkEnum[] = ["Excellent", "Good", "Average", "Bad"];

// CSV columns the upload endpoint understands. "Email" + "Remark" + "Score" are
// what drive matching and the charts; the rest are stored as free text.
const CSV_HEADERS = [
  "S. No.",
  "Student Name",
  "Email",
  "Area of Strength",
  "Area of Improvement",
  "Teacher Remark / Sentence",
  "Practice Task",
  "Follow-up Status",
  "Remark",
  "Score",
];
const CSV_TEMPLATE_ROW = [
  "1",
  "Shweta Malviya",
  "student@example.com",
  "Confidence",
  "Fluency",
  "Speaks confidently but needs to reduce pauses while explaining answers.",
  "Speak for 4 minutes daily on one topic.",
  "Improving",
  "Good",
  "7",
];

// Fixed color per remark tier — shared by the pie chart + legend.
const REMARK_COLOR: Record<RemarkEnum, string> = {
  Excellent: "#8b5cf6",
  Good: "#10b981",
  Average: "#f59e0b",
  Bad: "#ef4444",
};

const BATCH_RANGES: { label: string; value: BatchRange }[] = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const REMARK_PILL: Record<RemarkEnum, string> = {
  Excellent: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
  Good: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  Average: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  Bad: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
};

const COURSE_GRADIENTS = [
  "from-violet-500/20 via-violet-500/10 to-transparent",
  "from-sky-500/20 via-sky-500/10 to-transparent",
  "from-emerald-500/20 via-emerald-500/10 to-transparent",
  "from-amber-500/20 via-amber-500/10 to-transparent",
  "from-rose-500/20 via-rose-500/10 to-transparent",
  "from-fuchsia-500/20 via-fuchsia-500/10 to-transparent",
];

const COURSE_RING = [
  "ring-violet-500/30",
  "ring-sky-500/30",
  "ring-emerald-500/30",
  "ring-amber-500/30",
  "ring-rose-500/30",
  "ring-fuchsia-500/30",
];

const COURSE_ICON_BG = [
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20 text-sky-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-fuchsia-500/20 text-fuchsia-300",
];

// ───────────────────────── Helpers ─────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const fmt = (n: number, d = 1) =>
  Number.isFinite(n) ? Number(n).toFixed(d) : "—";

// Local-time YYYY-MM-DD (so day-bucketing matches the user's calendar, not UTC).
const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const getCurrentBatch = (s: Student): string => {
  const h = s.batchHistory;
  if (!h?.length) return "Unassigned";
  return h[h.length - 1]?.to || "Unassigned";
};

const getErr = (e: unknown, fb = "Something went wrong") =>
  e instanceof Error ? e.message : fb;

// Quote a CSV cell if it contains a comma, quote, or newline.
const csvCell = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

// Trigger a browser download of a blank remark-tracker CSV template.
const downloadCsvTemplate = () => {
  const csv = [CSV_HEADERS, CSV_TEMPLATE_ROW]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "communication-remarks-template.csv";
  a.click();
  URL.revokeObjectURL(url);
};

function buildCandle(
  name: string,
  records: { score: number; createdAt: string }[],
  meta?: any
): Candle | null {
  const sorted = [...records]
    .filter((r) => typeof r.score === "number")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  if (!sorted.length) return null;
  const scores = sorted.map((r) => r.score);
  const open = scores[0];
  const close = scores[scores.length - 1];
  const high = Math.max(...scores);
  const low = Math.min(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    name,
    open,
    close,
    high,
    low,
    avg,
    count: scores.length,
    range: [low, high],
    meta,
  };
}

// ───────────────────── Candlestick custom shape ─────────────────────

// Per-student bar that starts at 0 and rises to the latest score.
// Color is based on the performance tier band.
const tierColor = (score: number) => {
  if (score >= 8) return "#8b5cf6"; // excellent
  if (score >= 6) return "#10b981"; // good
  if (score >= 4) return "#f59e0b"; // average
  return "#ef4444"; // poor
};

const StudentBarShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  const { close } = payload as Candle;
  const color = tierColor(close);
  const barWidth = Math.max(Math.min(width * 0.55, 36), 10);
  const barX = x + (width - barWidth) / 2;
  const r = Math.min(6, barWidth / 2);

  return (
    <g>
      <defs>
        <linearGradient id={`grad-${barX}-${y}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect
        x={barX}
        y={y}
        width={barWidth}
        height={height}
        fill={`url(#grad-${barX}-${y})`}
        rx={r}
      />
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fill={color}
        fontSize={11}
        fontWeight={600}
      >
        {Number(close).toFixed(1)}
      </text>
    </g>
  );
};

const TIER_META: { key: keyof CourseStack; avgKey: keyof CourseStack; label: string; color: string }[] = [
  { key: "poor", avgKey: "poorAvg", label: "Poor", color: "#ef4444" },
  { key: "average", avgKey: "averageAvg", label: "Average", color: "#f59e0b" },
  { key: "good", avgKey: "goodAvg", label: "Good", color: "#10b981" },
  { key: "excellent", avgKey: "excellentAvg", label: "Excellent", color: "#8b5cf6" },
];

const TierStackTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CourseStack;
  return (
    <div className="rounded-lg border border-[#312a63] bg-[#0f0b24]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-white">{d.name}</p>
      <div className="space-y-0.5">
        {TIER_META.map((t) => {
          const count = d[t.key] as number;
          const avg = d[t.avgKey] as number;
          return (
            <div key={t.label} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: t.color }} />
              <span className="text-[#a8a0d6]">{t.label}</span>
              <span className="ml-auto text-white">
                {count} {count === 1 ? "remark" : "remarks"}
                {count > 0 ? (
                  <span className="ml-1 text-[#8f87bf]">· avg {fmt(avg, 1)}</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between border-t border-[#312a63] pt-1 text-[11px]">
        <span className="text-[#a8a0d6]">Total</span>
        <span className="text-white">
          {d.total} · overall avg {fmt(d.overallAvg, 1)}
        </span>
      </div>
    </div>
  );
};

const CandleTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Candle;
  const delta = d.close - d.open;
  return (
    <div className="rounded-lg border border-[#312a63] bg-[#0f0b24]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-white">{d.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[#a8a0d6]">
        <span>Open</span>
        <span className="text-right text-white">{fmt(d.open, 1)}</span>
        <span>Close</span>
        <span className="text-right text-white">{fmt(d.close, 1)}</span>
        <span>High</span>
        <span className="text-right text-emerald-300">{fmt(d.high, 1)}</span>
        <span>Low</span>
        <span className="text-right text-rose-300">{fmt(d.low, 1)}</span>
        <span>Average</span>
        <span className="text-right text-violet-300">{fmt(d.avg, 1)}</span>
        <span>Assessments</span>
        <span className="text-right text-white">{d.count}</span>
      </div>
      <p
        className={`mt-1 text-right text-[11px] font-medium ${
          delta >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {delta >= 0 ? "▲" : "▼"} {fmt(Math.abs(delta), 1)}
      </p>
    </div>
  );
};

// ───────────────────── Date Range Filter ─────────────────────

const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: "7D", days: 6 },
  { label: "30D", days: 29 },
  { label: "90D", days: 89 },
];

function DateRangeFilter({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
}: {
  fromDate: string;
  toDate: string;
  setFromDate: (v: string) => void;
  setToDate: (v: string) => void;
}) {
  const applyPreset = (days: number) => {
    setFromDate(daysAgoISO(days));
    setToDate(todayISO());
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#312a63] bg-[#120f2d]/80 p-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#9a92c9]">
          From
        </label>
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8b5cf6] [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#9a92c9]">
          To
        </label>
        <input
          type="date"
          value={toDate}
          min={fromDate}
          max={todayISO()}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8b5cf6] [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
        />
      </div>
      <div className="flex items-center gap-1.5">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-1.5 text-xs font-medium text-[#a8a0d6] transition hover:border-[#8b5cf6] hover:text-white"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────── Stat card ─────────────────────

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "violet",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "violet" | "emerald" | "amber" | "rose" | "sky";
}) {
  const accentMap = {
    violet: "text-violet-300 bg-violet-500/15 ring-violet-500/30",
    emerald: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30",
    amber: "text-amber-300 bg-amber-500/15 ring-amber-500/30",
    rose: "text-rose-300 bg-rose-500/15 ring-rose-500/30",
    sky: "text-sky-300 bg-sky-500/15 ring-sky-500/30",
  };
  return (
    <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${accentMap[accent]}`}
        >
          {icon}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#9a92c9]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#a8a0d6]">{hint}</p> : null}
    </div>
  );
}

// ───────────────────────── Main ─────────────────────────

export default function CommunicationAnalytics() {
  const router = useRouter();
  const { user } = useUser();
  console.log('user: ', user);

  // ── navigation state ──
  const [view, setView] = useState<View>("overview");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarkTarget, setRemarkTarget] = useState<Student | null>(null);
  const [remarkCourseId, setRemarkCourseId] = useState<string | null>(null);

  // ── data ──
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [studentRemarks, setStudentRemarks] = useState<Remark[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [loadingStudentRemarks, setLoadingStudentRemarks] = useState(false);

  // ── batch overview (per-course) ──
  const [batchRemarks, setBatchRemarks] = useState<BatchRemark[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [batchRange, setBatchRange] = useState<BatchRange>("week");
  const [loadingBatch, setLoadingBatch] = useState(false);

  // ── filters ──
  const [fromDate, setFromDate] = useState<string>(todayISO());
  const [toDate, setToDate] = useState<string>(todayISO());
  const [studentSearch, setStudentSearch] = useState("");

  // ── add remark modal ──
  const [showAddRemark, setShowAddRemark] = useState(false);
  const [areaOfStrength, setAreaOfStrength] = useState("");
  const [areaOfImprovement, setAreaOfImprovement] = useState("");
  const [practiceTask, setPracticeTask] = useState("");
  const [remark, setRemark] = useState<RemarkEnum>("Average");
  const [score, setScore] = useState<number>(7);
  const [submitting, setSubmitting] = useState(false);

  // ── CSV upload modal ──
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // bump to force a re-fetch of batch remarks (after a CSV upload)
  const [batchRefreshTick, setBatchRefreshTick] = useState(0);

  // ── fetch courses ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!API_LMS_URL) return;
        const res = await fetch(`${API_LMS_URL}/api/courses/list`, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled || !res.ok) return;
        setCourses(Array.isArray(json) ? json : []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── fetch students ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudents(true);
        if (!API_LMS_URL) throw new Error("NEXT_PUBLIC_LMS_URL is missing");
        const res = await fetch(
          `${API_LMS_URL}/api/users/active-placement-students?status=all`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success)
          throw new Error(json.message || "Failed to load students");
        const list: Student[] = (json.students ?? []).filter(
          (s: Student) =>
            s.isRealUser !== true &&
            s.isPlaced !== true &&
            Array.isArray(s.purchasedCourses) &&
            s.purchasedCourses.length > 0
        );
        setStudents(list);
      } catch (e) {
        toast.error(getErr(e));
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── fetch remarks in date range ──
  const fetchRangeRemarks = async () => {
    try {
      setLoadingRemarks(true);
      const res = await fetch(
        `${API_LMS_URL}/api/student-management/get-remarks-range?from=${fromDate}&to=${toDate}`
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Failed to load remarks");
      setRemarks(json.data ?? []);
    } catch (e) {
      setRemarks([]);
      toast.error(getErr(e));
    } finally {
      setLoadingRemarks(false);
    }
  };

  useEffect(() => {
    fetchRangeRemarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  // ── fetch student remarks (for student view, all-time) ──
  useEffect(() => {
    if (view !== "student" || !selectedStudent) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudentRemarks(true);
        const y = new Date().getFullYear();
        const res = await fetch(
          `${API_LMS_URL}/api/student-management/get-student-remarks?clerkId=${encodeURIComponent(
            selectedStudent.clerkId
          )}&year=${y}`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) throw new Error(json.message);
        setStudentRemarks(json.data ?? []);
      } catch {
        setStudentRemarks([]);
      } finally {
        if (!cancelled) setLoadingStudentRemarks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedStudent]);

  // ── fetch overall batch remarks (course view, rolling week/month/year) ──
  useEffect(() => {
    if (view !== "course" || !selectedCourse) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingBatch(true);
        const res = await fetch(
          `${API_LMS_URL}/api/student-management/get-overall-batch-remarks?courseId=${encodeURIComponent(
            selectedCourse._id
          )}&range=${batchRange}`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success)
          throw new Error(json.message || "Failed to load batch remarks");
        setBatchRemarks(json.data ?? []);
        setBatchSummary(json.summary ?? null);
      } catch (e) {
        if (!cancelled) {
          setBatchRemarks([]);
          setBatchSummary(null);
        }
      } finally {
        if (!cancelled) setLoadingBatch(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedCourse, batchRange, batchRefreshTick]);

  // ── derived: course lookup ──
  const courseById = useMemo(() => {
    const m = new Map<string, Course>();
    courses.forEach((c) => m.set(String(c._id), c));
    return m;
  }, [courses]);

  // ── derived: students grouped by course ──
  const studentsByCourse = useMemo(() => {
    const m = new Map<string, Student[]>();
    students.forEach((s) => {
      (s.purchasedCourses ?? []).forEach((cid) => {
        const k = String(cid);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(s);
      });
    });
    return m;
  }, [students]);

  // ── derived: clerkId → student ──
  const studentByClerkId = useMemo(() => {
    const m = new Map<string, Student>();
    students.forEach((s) => m.set(s.clerkId, s));
    return m;
  }, [students]);

  // ── derived: remarks grouped by course ──
  const remarksByCourse = useMemo(() => {
    const m = new Map<string, Remark[]>();
    remarks.forEach((r) => {
      const s = studentByClerkId.get(r.clerkId);
      if (!s) return;
      (s.purchasedCourses ?? []).forEach((cid) => {
        const k = String(cid);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(r);
      });
    });
    return m;
  }, [remarks, studentByClerkId]);

  // ── overview: course cards with stats ──
  const courseCards = useMemo(() => {
    return courses
      .map((c, idx) => {
        const list = studentsByCourse.get(String(c._id)) ?? [];
        const rmks = remarksByCourse.get(String(c._id)) ?? [];
        const scores = rmks
          .filter((r) => typeof r.score === "number")
          .map((r) => r.score as number);
        const avg = scores.length
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
        const sorted = [...rmks]
          .filter((r) => typeof r.score === "number")
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()
          );
        const delta =
          sorted.length >= 2
            ? (sorted[sorted.length - 1].score as number) -
              (sorted[0].score as number)
            : 0;
        return {
          course: c,
          idx,
          studentCount: list.length,
          remarkCount: rmks.length,
          avgScore: avg,
          delta,
        };
      })
      .filter((c) => c.studentCount > 0)
      .sort((a, b) => b.studentCount - a.studentCount);
  }, [courses, studentsByCourse, remarksByCourse]);

  // ── overview: stacked tier breakdown per course ──
  const courseStacks = useMemo<CourseStack[]>(() => {
    const arr: CourseStack[] = [];
    courseCards.forEach(({ course }) => {
      const rmks = (remarksByCourse.get(String(course._id)) ?? []).filter(
        (r) => typeof r.score === "number"
      );
      if (!rmks.length) return;
      const buckets = { poor: [] as number[], average: [] as number[], good: [] as number[], excellent: [] as number[] };
      rmks.forEach((r) => {
        const s = r.score as number;
        if (s >= 8) buckets.excellent.push(s);
        else if (s >= 6) buckets.good.push(s);
        else if (s >= 4) buckets.average.push(s);
        else buckets.poor.push(s);
      });
      const mean = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const allScores = rmks.map((r) => r.score as number);
      arr.push({
        name: course.title || "Untitled",
        poor: buckets.poor.length,
        average: buckets.average.length,
        good: buckets.good.length,
        excellent: buckets.excellent.length,
        poorAvg: mean(buckets.poor),
        averageAvg: mean(buckets.average),
        goodAvg: mean(buckets.good),
        excellentAvg: mean(buckets.excellent),
        total: rmks.length,
        overallAvg: mean(allScores),
      });
    });
    return arr;
  }, [courseCards, remarksByCourse]);

  // ── overview: top/bottom students by average score (min 3 remarks) ──

  // ── course view: students in this course ──
  const courseStudents = useMemo(() => {
    if (!selectedCourse) return [];
    const list = studentsByCourse.get(String(selectedCourse._id)) ?? [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.fullName ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
    );
  }, [selectedCourse, studentsByCourse, studentSearch]);

  // ── course view: remarks scoped to this course ──
  const courseRemarks = useMemo(() => {
    if (!selectedCourse) return [];
    return remarksByCourse.get(String(selectedCourse._id)) ?? [];
  }, [selectedCourse, remarksByCourse]);

  // ── course view: batch progress per day, as candlesticks ──
  // Y = unique students remarked per day. The buckets span the *whole* current
  // week (Mon→Sun) or current month (1→last day) so the axis is stable, and the
  // candle direction (up/down/flat) compares each day to the previous one.
  const batchTrend = useMemo<BatchDay[]>(() => {
    // 1. aggregate remarks by local calendar day
    const byDay = new Map<
      string,
      { ids: Set<string>; sum: number; n: number; count: number }
    >();
    batchRemarks.forEach((r) => {
      const iso = localISO(new Date(r.createdAt));
      if (!byDay.has(iso))
        byDay.set(iso, { ids: new Set(), sum: 0, n: 0, count: 0 });
      const bucket = byDay.get(iso)!;
      bucket.ids.add(r.clerkId);
      bucket.count += 1;
      const s = Number(r.score);
      if (Number.isFinite(s)) {
        bucket.sum += s;
        bucket.n += 1;
      }
    });

    // 2. build the full list of day buckets for the current period
    const days: Date[] = [];
    const now = new Date();
    if (batchRange === "week") {
      const start = new Date(now);
      const dow = (start.getDay() + 6) % 7; // days since Monday
      start.setDate(start.getDate() - dow);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } else {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= lastDay; i++) days.push(new Date(year, month, i));
    }

    // 3. map each day to a candle, carrying the previous count as `open`
    let prev = 0;
    return days.map((d) => {
      const iso = localISO(d);
      const b = byDay.get(iso);
      const unique = b ? b.ids.size : 0;
      const open = prev;
      const dir: BatchDay["dir"] =
        unique > open ? "up" : unique < open ? "down" : "flat";
      const row: BatchDay = {
        iso,
        date:
          batchRange === "week"
            ? d.toLocaleDateString(undefined, { weekday: "short" })
            : String(d.getDate()),
        unique,
        open,
        avg: b && b.n ? b.sum / b.n : 0,
        count: b ? b.count : 0,
        body: [Math.min(open, unique), Math.max(open, unique)],
        dir,
      };
      prev = unique;
      return row;
    });
  }, [batchRemarks, batchRange]);

  // day-over-day change in the most recent batch average score
  const batchDelta = useMemo(() => {
    const scored = batchTrend.filter((d) => d.avg > 0);
    if (scored.length < 2) return 0;
    return scored[scored.length - 1].avg - scored[scored.length - 2].avg;
  }, [batchTrend]);

  // ── course view: remark distribution for the pie chart ──
  const batchPie = useMemo<RemarkSlice[]>(() => {
    const counts: Record<RemarkEnum, number> = {
      Excellent: 0,
      Good: 0,
      Average: 0,
      Bad: 0,
    };
    batchRemarks.forEach((r) => {
      if (r.remark && counts[r.remark] !== undefined) counts[r.remark] += 1;
    });
    return REMARK_OPTIONS.map((name) => ({
      name,
      value: counts[name],
      color: REMARK_COLOR[name],
    })).filter((s) => s.value > 0);
  }, [batchRemarks]);

  // ── course view: per-student candles ──
  const studentCandles = useMemo(() => {
    if (!selectedCourse) return [];
    const list = studentsByCourse.get(String(selectedCourse._id)) ?? [];
    const nameById = new Map<string, string>();
    list.forEach((s) =>
      nameById.set(s.clerkId, s.fullName || s.email || s.clerkId)
    );

    const grouped = new Map<string, { score: number; createdAt: string }[]>();
    courseRemarks.forEach((r) => {
      if (typeof r.score !== "number") return;
      if (!nameById.has(r.clerkId)) return;
      if (!grouped.has(r.clerkId)) grouped.set(r.clerkId, []);
      grouped
        .get(r.clerkId)!
        .push({ score: r.score as number, createdAt: r.createdAt });
    });

    const arr: Candle[] = [];
    grouped.forEach((records, cid) => {
      const c = buildCandle(nameById.get(cid) || cid, records, { clerkId: cid });
      if (c) arr.push(c);
    });
    return arr.sort((a, b) => b.avg - a.avg);
  }, [selectedCourse, studentsByCourse, courseRemarks]);

  // ── course view: per-student stats in this course ──
  const courseStudentStats = useMemo(() => {
    if (!selectedCourse) return new Map<string, { avg: number; count: number; last?: RemarkEnum }>();
    const m = new Map<
      string,
      { avg: number; count: number; last?: RemarkEnum }
    >();
    const grouped = new Map<string, Remark[]>();
    courseRemarks.forEach((r) => {
      if (!grouped.has(r.clerkId)) grouped.set(r.clerkId, []);
      grouped.get(r.clerkId)!.push(r);
    });
    grouped.forEach((rs, cid) => {
      const scored = rs.filter((r) => typeof r.score === "number");
      const avg = scored.length
        ? scored.reduce((a, b) => a + (b.score as number), 0) / scored.length
        : 0;
      const sortedDesc = [...rs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      m.set(cid, {
        avg,
        count: rs.length,
        last: sortedDesc[0]?.remark,
      });
    });
    return m;
  }, [selectedCourse, courseRemarks]);

  // ── student view: trend data ──
  const studentTrend = useMemo(() => {
    return [...studentRemarks]
      .filter((r) => typeof r.score === "number")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((r) => ({
        date: new Date(r.createdAt).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
        }),
        score: r.score as number,
        remark: r.remark,
      }));
  }, [studentRemarks]);

  const studentAvg = useMemo(() => {
    if (!studentTrend.length) return 0;
    return (
      studentTrend.reduce((a, b) => a + b.score, 0) / studentTrend.length
    );
  }, [studentTrend]);

  const studentDelta = useMemo(() => {
    if (studentTrend.length < 2) return 0;
    return (
      studentTrend[studentTrend.length - 1].score - studentTrend[0].score
    );
  }, [studentTrend]);

  // ── totals for header ──
  const totals = useMemo(() => {
    const scored = remarks.filter((r) => typeof r.score === "number");
    const avg = scored.length
      ? scored.reduce((a, b) => a + (b.score as number), 0) / scored.length
      : 0;
    return {
      students: students.length,
      courses: courseCards.length,
      remarks: remarks.length,
      avg,
    };
  }, [remarks, students, courseCards]);

  // ── handlers ──
  const goOverview = () => {
    setView("overview");
    setSelectedCourse(null);
    setSelectedStudent(null);
    setStudentSearch("");
  };

  const openCourse = (c: Course) => {
    setSelectedCourse(c);
    setSelectedStudent(null);
    setStudentSearch("");
    setView("course");
  };

  const openStudent = (s: Student) => {
    setSelectedStudent(s);
    setView("student");
  };

  const resetRemarkForm = () => {
    setAreaOfStrength("");
    setAreaOfImprovement("");
    setPracticeTask("");
    setRemark("Average");
    setScore(7);
  };

  const openAddRemarkFor = (s: Student) => {
    setRemarkTarget(s);
    // share the purchased course as courseId — prefer the course in context
    setRemarkCourseId(
      selectedCourse?._id ?? s.purchasedCourses?.[0] ?? null
    );
    resetRemarkForm();
    setShowAddRemark(true);
  };

  const closeAddRemark = () => {
    setShowAddRemark(false);
    setRemarkTarget(null);
  };

  const submitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkTarget) return;
    try {
      setSubmitting(true);
      if (!areaOfStrength || !areaOfImprovement || !practiceTask) {
        throw new Error("Please fill all fields");
      }
      const res = await fetch(
        `${API_LMS_URL}/api/student-management/submit-communication-remark`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: remarkTarget.clerkId,
            fullName: remarkTarget.fullName,
            courseId: remarkCourseId,
            areaOfStrength,
            areaOfImprovement,
            practiceTask,
            remark,
            score,
            assessorId: user?.id,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Failed to submit");
      toast.success("Remark submitted");
      closeAddRemark();
      resetRemarkForm();
      // refresh data
      fetchRangeRemarks();
      // also refresh student remarks if we're viewing this student
      if (selectedStudent && selectedStudent.clerkId === remarkTarget.clerkId) {
        const y = new Date().getFullYear();
        const sr = await fetch(
          `${API_LMS_URL}/api/student-management/get-student-remarks?clerkId=${encodeURIComponent(
            selectedStudent.clerkId
          )}&year=${y}`
        );
        const sj = await sr.json();
        if (sr.ok && sj.success) setStudentRemarks(sj.data ?? []);
      }
    } catch (e) {
      toast.error(getErr(e));
    } finally {
      setSubmitting(false);
    }
  };

  // ── CSV upload handlers ──
  const openUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
    setShowUpload(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setShowUpload(false);
    setUploadFile(null);
  };

  const submitCsvUpload = async () => {
    if (!uploadFile || !selectedCourse) return;
    try {
      setUploading(true);
      setUploadResult(null);
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("courseId", selectedCourse._id);
      if (user?.id) form.append("assessorId", user.id);

      const res = await fetch(
        `${API_LMS_URL}/api/student-management/upload-communication-remarks-csv`,
        { method: "POST", body: form }
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Upload failed");

      setUploadResult({
        inserted: json.inserted ?? 0,
        skippedCount: json.skippedCount ?? 0,
        skipped: json.skipped ?? [],
        matchedStudents: json.matchedStudents ?? [],
        totalRows: json.totalRows ?? 0,
      });

      if (json.inserted > 0) {
        toast.success(`Uploaded ${json.inserted} remark(s)`);
        // clear the file so the same CSV can't be submitted twice by accident
        setUploadFile(null);
        // refresh the date-range remarks (overview/course charts) and the batch
        fetchRangeRemarks();
        setBatchRefreshTick((t) => t + 1);
      } else {
        toast.warn("No remarks were inserted — check the skipped rows.");
      }
    } catch (e) {
      toast.error(getErr(e));
    } finally {
      setUploading(false);
    }
  };

  // ───────────────────────── Render ─────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#312a63] bg-[#120f2d] px-3 py-2 text-xs font-medium text-[#a8a0d6] transition hover:border-[#8b5cf6] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <Sparkles className="h-6 w-6 text-[#8b5cf6]" />
              Communication Analytics
            </h1>
            <p className="mt-1 text-sm text-[#a8a0d6]">
              Track communication performance across courses, batches, and
              students.
            </p>
          </div>
        </div>

        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
        />
      </div>

      {/* ─── Breadcrumb ─── */}
      {view !== "overview" ? (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={goOverview}
            className="text-[#a8a0d6] transition hover:text-white"
          >
            Overview
          </button>
          {selectedCourse ? (
            <>
              <ChevronRight className="h-4 w-4 text-[#5b537d]" />
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setView("course");
                }}
                className={
                  view === "course"
                    ? "font-medium text-white"
                    : "text-[#a8a0d6] transition hover:text-white"
                }
              >
                {selectedCourse.title}
              </button>
            </>
          ) : null}
          {selectedStudent && view === "student" ? (
            <>
              <ChevronRight className="h-4 w-4 text-[#5b537d]" />
              <span className="font-medium text-white">
                {selectedStudent.fullName}
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ─── Top KPI strip (always) ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Active Students"
          value={totals.students}
          accent="violet"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Courses"
          value={totals.courses}
          accent="sky"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Remarks Logged"
          value={totals.remarks}
          hint={`Between ${fromDate} → ${toDate}`}
          accent="emerald"
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Average Score"
          value={
            <>
              {fmt(totals.avg, 1)}
              <span className="text-base font-normal text-[#8f87bf]">/10</span>
            </>
          }
          accent="amber"
        />
      </div>

      {/* ─── View body ─── */}
      {loadingStudents ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#312a63] bg-[#120f2d] py-20 text-[#a8a0d6]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading students…
        </div>
      ) : view === "overview" ? (
        <OverviewView
          courseCards={courseCards}
          courseStacks={courseStacks}
          loadingRemarks={loadingRemarks}
          openCourse={openCourse}
        />
      ) : view === "course" && selectedCourse ? (
        <CourseView
          course={selectedCourse}
          students={courseStudents}
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          studentCandles={studentCandles}
          loadingRemarks={loadingRemarks}
          stats={courseStudentStats}
          openStudent={openStudent}
          onAddRemark={openAddRemarkFor}
          onUploadRemarks={openUpload}
          batchTrend={batchTrend}
          batchPie={batchPie}
          batchSummary={batchSummary}
          batchRange={batchRange}
          setBatchRange={setBatchRange}
          batchDelta={batchDelta}
          loadingBatch={loadingBatch}
        />
      ) : view === "student" && selectedStudent ? (
        <StudentView
          student={selectedStudent}
          remarks={studentRemarks}
          loading={loadingStudentRemarks}
          trend={studentTrend}
          avg={studentAvg}
          delta={studentDelta}
          onAddRemark={() => openAddRemarkFor(selectedStudent)}
          courseTitles={(selectedStudent.purchasedCourses ?? [])
            .map((cid) => courseById.get(String(cid))?.title)
            .filter(Boolean) as string[]}
        />
      ) : null}

      {/* ─── Add Remark Modal ─── */}
      {showAddRemark && remarkTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !submitting && closeAddRemark()}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#312a63] bg-[#0f0b24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#312a63] px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Add Communication Remark
                </h3>
                <p className="mt-0.5 text-xs text-[#a8a0d6]">
                  {remarkTarget.fullName}
                  {remarkTarget.email ? ` • ${remarkTarget.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && closeAddRemark()}
                className="rounded-lg p-1.5 text-[#a8a0d6] hover:bg-[#1c1642] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={submitRemark}
              className="flex-1 space-y-4 overflow-y-auto p-6"
            >
              <Field label="Area of Strength" required>
                <select
                  value={areaOfStrength}
                  onChange={(e) => setAreaOfStrength(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#312a63] bg-[#120f2d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8b5cf6]"
                >
                  <option value="">Select an area of strength</option>
                  {STRENGTH_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Area of Improvement" required>
                <select
                  value={areaOfImprovement}
                  onChange={(e) => setAreaOfImprovement(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#312a63] bg-[#120f2d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8b5cf6]"
                >
                  <option value="">Select an area of improvement</option>
                  {IMPROVEMENT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Practice Task" required>
                <select
                  value={practiceTask}
                  onChange={(e) => setPracticeTask(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#312a63] bg-[#120f2d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8b5cf6]"
                >
                  <option value="">Select a practice task</option>
                  {PRACTICE_TASK_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Overall Remark">
                  <select
                    value={remark}
                    onChange={(e) => setRemark(e.target.value as RemarkEnum)}
                    className="w-full rounded-xl border border-[#312a63] bg-[#120f2d] px-3 py-2.5 text-sm text-white outline-none focus:border-[#8b5cf6]"
                  >
                    {REMARK_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Score (${score}/10)`}>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="mt-2 w-full accent-[#8b5cf6]"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-[#8f87bf]">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#312a63] pt-4">
                <button
                  type="button"
                  onClick={closeAddRemark}
                  disabled={submitting}
                  className="rounded-xl border border-[#312a63] bg-[#120f2d] px-4 py-2 text-xs font-medium text-[#a8a0d6] transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#7c3aed] disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Submit Remark
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ─── Upload Remarks (CSV) Modal ─── */}
      {showUpload ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeUpload}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#312a63] bg-[#0f0b24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#312a63] px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                  <FileSpreadsheet className="h-4 w-4 text-[#8b5cf6]" />
                  Upload Remarks via CSV
                </h3>
                <p className="mt-0.5 text-xs text-[#a8a0d6]">
                  {selectedCourse?.title} • students are matched by their{" "}
                  <span className="text-white">email</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="rounded-lg p-1.5 text-[#a8a0d6] hover:bg-[#1c1642] hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {/* Instructions */}
              <div className="rounded-xl border border-[#312a63] bg-[#120f2d] p-4 text-xs text-[#a8a0d6]">
                <p className="mb-2 font-medium text-white">
                  Required columns
                </p>
                <p>
                  Your CSV needs an <b className="text-white">Email</b> column
                  (used to find each student), a{" "}
                  <b className="text-white">Remark</b> column (Excellent / Good /
                  Average / Bad), and a <b className="text-white">Score</b> (0–10).
                  Optional: Student Name, Area of Strength, Area of Improvement,
                  Teacher Remark / Sentence, Practice Task, Follow-up Status.
                </p>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-1.5 font-medium text-[#a8a0d6] transition hover:border-[#8b5cf6] hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV template
                </button>
              </div>

              {/* File input */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#a8a0d6]">
                  CSV file <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={uploading}
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] ?? null);
                    setUploadResult(null);
                  }}
                  className="block w-full cursor-pointer rounded-xl border border-[#312a63] bg-[#120f2d] text-sm text-white outline-none file:mr-3 file:cursor-pointer file:border-0 file:bg-[#8b5cf6] file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#7c3aed]"
                />
                {uploadFile ? (
                  <p className="mt-1.5 text-xs text-[#a8a0d6]">
                    Selected: <span className="text-white">{uploadFile.name}</span>
                  </p>
                ) : null}
              </div>

              {/* Result summary */}
              {uploadResult ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {uploadResult.inserted} inserted
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-300 ring-1 ring-amber-500/30">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {uploadResult.skippedCount} skipped
                    </span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 font-medium text-[#a8a0d6] ring-1 ring-[#312a63]">
                      {uploadResult.totalRows} rows total
                    </span>
                  </div>

                  {uploadResult.matchedStudents.length ? (
                    <div className="rounded-xl border border-[#312a63] bg-[#120f2d] p-3">
                      <p className="mb-2 text-xs font-medium text-white">
                        Uploaded for {uploadResult.matchedStudents.length} student(s)
                      </p>
                      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                        {uploadResult.matchedStudents.map((s, i) => (
                          <span
                            key={`${s.clerkId}-${i}`}
                            className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200 ring-1 ring-violet-500/30"
                          >
                            {s.fullName || s.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {uploadResult.skipped.length ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="mb-2 text-xs font-medium text-amber-200">
                        Skipped rows
                      </p>
                      <div className="max-h-40 overflow-y-auto text-xs text-[#a8a0d6]">
                        {uploadResult.skipped.map((s, i) => (
                          <div
                            key={i}
                            className="flex justify-between gap-3 border-t border-[#312a63]/60 py-1 first:border-0"
                          >
                            <span>
                              Row {s.row}
                              {s.name ? ` — ${s.name}` : ""}
                              {s.email ? ` (${s.email})` : ""}
                            </span>
                            <span className="shrink-0 text-amber-300">
                              {s.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#312a63] px-6 py-4">
              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="rounded-xl border border-[#312a63] bg-[#120f2d] px-4 py-2 text-xs font-medium text-[#a8a0d6] transition hover:text-white disabled:opacity-50"
              >
                {uploadResult ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={submitCsvUpload}
                disabled={uploading || !uploadFile}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#7c3aed] disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploadResult ? "Upload another" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────── Subviews ─────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#a8a0d6]">
        {label} {required ? <span className="text-rose-400">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function OverviewView({
  courseCards,
  courseStacks,
  loadingRemarks,
  openCourse,
}: {
  courseCards: {
    course: Course;
    idx: number;
    studentCount: number;
    remarkCount: number;
    avgScore: number;
    delta: number;
  }[];
  courseStacks: CourseStack[];
  loadingRemarks: boolean;
  openCourse: (c: Course) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Course cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9a92c9]">
            Courses
          </h2>
          <p className="text-xs text-[#8f87bf]">Click a course to drill in</p>
        </div>
        {courseCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#312a63] bg-[#120f2d]/50 p-10 text-center text-sm text-[#a8a0d6]">
            No courses have active placement students.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courseCards.map(
              ({ course, idx, studentCount, remarkCount, avgScore, delta }) => {
                const grad = COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];
                const ring = COURSE_RING[idx % COURSE_RING.length];
                const iconBg = COURSE_ICON_BG[idx % COURSE_ICON_BG.length];
                return (
                  <button
                    key={course._id}
                    type="button"
                    onClick={() => openCourse(course)}
                    className={`group relative overflow-hidden rounded-2xl border border-[#312a63] bg-gradient-to-br ${grad} bg-[#120f2d] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#8b5cf6] hover:shadow-[0_10px_30px_rgba(139,92,246,0.15)]`}
                  >
                    <div
                      className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${iconBg} ${ring}`}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <p
                      className="line-clamp-2 text-sm font-semibold text-white"
                      title={course.title}
                    >
                      {course.title || "Untitled course"}
                    </p>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-white">
                          {studentCount}
                        </p>
                        <p className="text-[11px] uppercase tracking-wider text-[#9a92c9]">
                          Students
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {fmt(avgScore, 1)}
                          <span className="text-[11px] text-[#8f87bf]">/10</span>
                        </p>
                        <p
                          className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium ${
                            delta > 0
                              ? "text-emerald-300"
                              : delta < 0
                              ? "text-rose-300"
                              : "text-[#8f87bf]"
                          }`}
                        >
                          {delta > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : delta < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          {delta > 0 ? "+" : ""}
                          {fmt(delta, 1)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#312a63]/60 pt-3 text-[11px] text-[#a8a0d6]">
                      <span>{remarkCount} remarks</span>
                      <span className="inline-flex items-center gap-1 text-[#8b5cf6] opacity-0 transition group-hover:opacity-100">
                        Open <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* Course tier breakdown */}
      <section className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Activity className="h-4 w-4 text-[#8b5cf6]" />
              Course Performance — Tier Breakdown
            </h2>
            <p className="mt-0.5 text-xs text-[#a8a0d6]">
              Each bar shows how many remarks fell into Poor / Average / Good /
              Excellent tiers for that course.
            </p>
          </div>
          <PerformanceBandLegend />
        </div>

        {loadingRemarks ? (
          <div className="flex items-center justify-center py-16 text-[#a8a0d6]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Crunching numbers…
          </div>
        ) : courseStacks.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#a8a0d6]">
            No scored remarks in this date range.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={courseStacks}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#312a63"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#a8a0d6"
                  fontSize={11}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  stroke="#a8a0d6"
                  fontSize={11}
                  allowDecimals={false}
                  width={70}
                  label={{
                    value: "Total Students Remarked",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { textAnchor: "middle", fontSize: 12, fill: "#a8a0d6", fontWeight: 500 },
                  }}
                />
                <Tooltip
                  content={<TierStackTooltip />}
                  cursor={{ fill: "rgba(139,92,246,0.05)" }}
                />
                <Bar dataKey="poor" stackId="t" fill="#ef4444" radius={[0, 0, 4, 4]} isAnimationActive={false} />
                <Bar dataKey="average" stackId="t" fill="#f59e0b" isAnimationActive={false} />
                <Bar dataKey="good" stackId="t" fill="#10b981" isAnimationActive={false} />
                <Bar dataKey="excellent" stackId="t" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function PerformanceBandLegend() {
  const bands: { label: string; color: string; range: string }[] = [
    { label: "Poor", color: "bg-rose-500", range: "0–4" },
    { label: "Average", color: "bg-amber-500", range: "4–6" },
    { label: "Good", color: "bg-emerald-500", range: "6–8" },
    { label: "Excellent", color: "bg-violet-500", range: "8–10" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#a8a0d6]">
      {bands.map((b) => (
        <span key={b.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm ${b.color}`} />
          <span className="text-white">{b.label}</span>
          <span className="text-[#8f87bf]">({b.range})</span>
        </span>
      ))}
    </div>
  );
}

const BatchTrendTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as BatchDay;
  const delta = d.unique - d.open;
  return (
    <div className="rounded-lg border border-[#312a63] bg-[#0f0b24]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-white">{d.date}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[#a8a0d6]">
        <span>Students remarked</span>
        <span className="text-right text-violet-300">{d.unique}</span>
        <span>Assessments</span>
        <span className="text-right text-white">{d.count}</span>
        <span>Avg score</span>
        <span className="text-right text-emerald-300">{fmt(d.avg, 1)}/10</span>
      </div>
      <p
        className={`mt-1 text-right text-[11px] font-medium ${
          delta > 0
            ? "text-emerald-300"
            : delta < 0
            ? "text-rose-300"
            : "text-[#8f87bf]"
        }`}
      >
        {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {Math.abs(delta)} vs prev
      </p>
    </div>
  );
};

// Candlestick body for the batch chart. The bound `Bar` uses dataKey="unique"
// (0 → close), so it always renders; we derive the `open` pixel from the linear
// Y scale and draw only the body span between open and close.
const BatchCandleShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  const { open, unique, dir } = payload as BatchDay;
  if (unique <= 0) return null; // empty day → nothing to draw
  const color =
    dir === "up" ? "#10b981" : dir === "down" ? "#ef4444" : "#8b5cf6";
  const pxPerUnit = height / unique; // px per student (Y axis is linear)
  const closeY = y; // top of the 0→unique bar = the close
  const openY = y + (unique - open) * pxPerUnit;
  let top = Math.min(openY, closeY);
  let bodyH = Math.abs(openY - closeY);
  if (bodyH < 2) {
    // flat candle (close === open) → thin doji line
    bodyH = 2;
    top = closeY - 1;
  }
  const bw = Math.max(Math.min(width * 0.6, 30), 6);
  const bx = x + (width - bw) / 2;
  return (
    <g>
      <rect
        x={bx}
        y={top}
        width={bw}
        height={bodyH}
        rx={2}
        fill={color}
        fillOpacity={0.85}
        stroke={color}
      />
      <text
        x={x + width / 2}
        y={closeY - 5}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight={600}
      >
        {unique}
      </text>
    </g>
  );
};

const PieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={11}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
};

function BatchOverview({
  batchTrend,
  batchPie,
  batchSummary,
  batchRange,
  setBatchRange,
  batchDelta,
  loadingBatch,
}: {
  batchTrend: BatchDay[];
  batchPie: RemarkSlice[];
  batchSummary: BatchSummary | null;
  batchRange: BatchRange;
  setBatchRange: (r: BatchRange) => void;
  batchDelta: number;
  loadingBatch: boolean;
}) {
  const totalPie = batchPie.reduce((a, b) => a + b.value, 0);
  const hasTrend = batchTrend.some((d) => d.unique > 0);

  return (
    <section className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <TrendingUp className="h-4 w-4 text-[#8b5cf6]" />
            Batch Progress
          </h3>
          <p className="mt-0.5 text-xs text-[#a8a0d6]">
            Unique students remarked per day (candles) and the overall remark mix
            for this batch over the {batchRange === "week" ? "current week" : "current month"}.
          </p>
        </div>

        {/* Range switch */}
        <div className="flex items-center gap-1.5">
          {BATCH_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setBatchRange(r.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                batchRange === r.value
                  ? "border-[#8b5cf6] bg-[#8b5cf6]/15 text-white"
                  : "border-[#312a63] bg-[#0f0b24] text-[#a8a0d6] hover:border-[#8b5cf6] hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 font-medium text-violet-300 ring-1 ring-violet-500/30">
          Avg {batchSummary?.averageScore != null ? fmt(batchSummary.averageScore, 1) : "—"}/10
        </span>
        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-300 ring-1 ring-sky-500/30">
          {batchSummary?.uniqueStudents ?? 0} students assessed
        </span>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300 ring-1 ring-emerald-500/30">
          {batchSummary?.totalAssessments ?? 0} assessments
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ring-1 ${
            batchDelta > 0
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
              : batchDelta < 0
              ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
              : "bg-white/5 text-[#a8a0d6] ring-[#312a63]"
          }`}
        >
          {batchDelta > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : batchDelta < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : null}
          {batchDelta > 0 ? "+" : ""}
          {fmt(batchDelta, 1)} vs prev day
        </span>
      </div>

      {loadingBatch ? (
        <div className="flex items-center justify-center py-16 text-[#a8a0d6]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading batch data…
        </div>
      ) : (!hasTrend && totalPie === 0) ? (
        <div className="py-16 text-center text-sm text-[#a8a0d6]">
          No assessments recorded for this batch in the selected period.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Daily unique-students candlestick chart */}
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-[#9a92c9]">
                Students Remarked (Unique)
              </p>
              <div className="flex items-center gap-3 text-[10px] text-[#a8a0d6]">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Up
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
                  Down
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-500" />
                  Flat
                </span>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={batchTrend}
                  margin={{ top: 16, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#312a63"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#a8a0d6"
                    fontSize={batchRange === "month" ? 10 : 11}
                    interval={0}
                    angle={batchRange === "month" ? -45 : 0}
                    textAnchor={batchRange === "month" ? "end" : "middle"}
                    height={batchRange === "month" ? 46 : 28}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (max: number) => Math.max(2, max + 1)]}
                    stroke="#a8a0d6"
                    fontSize={11}
                    width={70}
                    label={{
                      value: "Unique Students Remarked",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: {
                        textAnchor: "middle",
                        fontSize: 11,
                        fill: "#a8a0d6",
                        fontWeight: 500,
                      },
                    }}
                  />
                  <Tooltip
                    content={<BatchTrendTooltip />}
                    cursor={{ fill: "rgba(139,92,246,0.05)" }}
                  />
                  <Bar
                    dataKey="unique"
                    shape={<BatchCandleShape />}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Remark distribution pie chart */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9a92c9]">
              Remark Distribution
            </p>
            {totalPie === 0 ? (
              <div className="flex h-72 items-center justify-center text-center text-sm text-[#a8a0d6]">
                No remarks in this period.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={batchPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      labelLine={false}
                      label={<PieLabel />}
                      isAnimationActive={false}
                    >
                      {batchPie.map((s) => (
                        <Cell key={s.name} fill={s.color} stroke="#0f0b24" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f0b24",
                        border: "1px solid #312a63",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(v: any, n: any) => [
                        `${v} (${Math.round((Number(v) / totalPie) * 100)}%)`,
                        n,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-[#a8a0d6]">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CourseView({
  course,
  students,
  studentSearch,
  setStudentSearch,
  studentCandles,
  loadingRemarks,
  stats,
  openStudent,
  onAddRemark,
  onUploadRemarks,
  batchTrend,
  batchPie,
  batchSummary,
  batchRange,
  setBatchRange,
  batchDelta,
  loadingBatch,
}: {
  course: Course;
  students: Student[];
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  studentCandles: Candle[];
  loadingRemarks: boolean;
  stats: Map<string, { avg: number; count: number; last?: RemarkEnum }>;
  openStudent: (s: Student) => void;
  onAddRemark: (s: Student) => void;
  onUploadRemarks: () => void;
  batchTrend: BatchDay[];
  batchPie: RemarkSlice[];
  batchSummary: BatchSummary | null;
  batchRange: BatchRange;
  setBatchRange: (r: BatchRange) => void;
  batchDelta: number;
  loadingBatch: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Course header */}
      <div className="rounded-2xl border border-[#312a63] bg-gradient-to-br from-violet-500/10 via-transparent to-transparent bg-[#120f2d] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{course.title}</h2>
              <p className="text-xs text-[#a8a0d6]">
                {students.length} active student(s) • Batch performance below
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onUploadRemarks}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Remarks (CSV)
          </button>
        </div>
      </div>

      {/* Batch progress + remark distribution */}
      <BatchOverview
        batchTrend={batchTrend}
        batchPie={batchPie}
        batchSummary={batchSummary}
        batchRange={batchRange}
        setBatchRange={setBatchRange}
        batchDelta={batchDelta}
        loadingBatch={loadingBatch}
      />

      {/* Student candlestick */}
      <section className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Layers className="h-4 w-4 text-[#8b5cf6]" />
              Student Performance
            </h3>
            <p className="mt-0.5 text-xs text-[#a8a0d6]">
              Each bar starts at 0 and rises to the student's latest score. Bar
              color reflects the performance tier.
            </p>
          </div>
          <PerformanceBandLegend />
        </div>

        {loadingRemarks ? (
          <div className="flex items-center justify-center py-16 text-[#a8a0d6]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : studentCandles.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#a8a0d6]">
            No scored remarks for any student in this period.
          </div>
        ) : (
          <div
            className="w-full"
            style={{ height: Math.max(240, studentCandles.length * 24 + 80) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={studentCandles}
                margin={{ top: 10, right: 20, left: -10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#312a63"
                  vertical={false}
                />
                <ReferenceArea
                  y1={0}
                  y2={4}
                  fill="#ef4444"
                  fillOpacity={0.06}
                  ifOverflow="visible"
                />
                <ReferenceArea
                  y1={4}
                  y2={6}
                  fill="#f59e0b"
                  fillOpacity={0.06}
                  ifOverflow="visible"
                />
                <ReferenceArea
                  y1={6}
                  y2={8}
                  fill="#10b981"
                  fillOpacity={0.05}
                  ifOverflow="visible"
                />
                <ReferenceArea
                  y1={8}
                  y2={10}
                  fill="#8b5cf6"
                  fillOpacity={0.08}
                  ifOverflow="visible"
                />
                <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="2 4" strokeOpacity={0.5} />
                <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="2 4" strokeOpacity={0.5} />
                <ReferenceLine y={8} stroke="#10b981" strokeDasharray="2 4" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  stroke="#a8a0d6"
                  fontSize={11}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  stroke="#a8a0d6"
                  fontSize={11}
                />
                <Tooltip content={<CandleTooltip />} cursor={{ fill: "rgba(139,92,246,0.05)" }} />
                <Bar dataKey="close" shape={<StudentBarShape />} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Students table */}
      <section className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">
            Students
            <span className="ml-2 text-xs font-normal text-[#a8a0d6]">
              ({students.length})
            </span>
          </h3>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f87bf]" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#8f87bf] focus:border-[#8b5cf6]"
            />
          </div>
        </div>

        {students.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#a8a0d6]">
            No students match this filter.
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto rounded-xl border border-[#312a63]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#0f0b24] text-[11px] uppercase tracking-wider text-[#9a92c9]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-left font-medium">Batch</th>
                  <th className="px-4 py-3 text-left font-medium">Avg Score</th>
                  <th className="px-4 py-3 text-left font-medium">Last Remark</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const st = stats.get(s.clerkId);
                  return (
                    <tr
                      key={s.clerkId}
                      className="border-t border-[#312a63] transition hover:bg-[#1c1642]/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {s.fullName || "—"}
                        </p>
                        <p className="text-xs text-[#a8a0d6]">
                          {s.email || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#cdc7eb]">
                        {getCurrentBatch(s)}
                      </td>
                      <td className="px-4 py-3">
                        {st && st.count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30">
                            {fmt(st.avg, 1)}/10
                          </span>
                        ) : (
                          <span className="text-xs text-[#8f87bf]">
                            No data
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {st?.last ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${REMARK_PILL[st.last]}`}
                          >
                            {st.last}
                          </span>
                        ) : (
                          <span className="text-xs text-[#8f87bf]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAddRemark(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#8b5cf6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#7c3aed]"
                          >
                            <Plus className="h-3 w-3" /> Add Remark
                          </button>
                          <button
                            type="button"
                            onClick={() => openStudent(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-1.5 text-xs font-medium text-[#a8a0d6] transition hover:border-[#8b5cf6] hover:text-white"
                          >
                            View <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StudentView({
  student,
  remarks,
  loading,
  trend,
  avg,
  delta,
  onAddRemark,
  courseTitles,
}: {
  student: Student;
  remarks: Remark[];
  loading: boolean;
  trend: { date: string; score: number; remark?: RemarkEnum }[];
  avg: number;
  delta: number;
  onAddRemark: () => void;
  courseTitles: string[];
}) {
  return (
    <div className="space-y-6">
      {/* Student header */}
      <div className="rounded-2xl border border-[#312a63] bg-gradient-to-br from-violet-500/10 via-transparent to-transparent bg-[#120f2d] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-lg font-semibold text-violet-200 ring-1 ring-violet-500/30">
              {student.fullName?.[0] ?? "?"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {student.fullName}
              </h2>
              <p className="text-xs text-[#a8a0d6]">{student.email}</p>
              <p className="mt-1 text-[11px] text-[#8f87bf]">
                Batch: {getCurrentBatch(student)}
                {courseTitles.length
                  ? ` • Courses: ${courseTitles.join(", ")}`
                  : ""}
                {student.zone ? ` • Zone: ${student.zone}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAddRemark}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Remark
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Average Score"
          value={
            <>
              {fmt(avg, 1)}
              <span className="text-base font-normal text-[#8f87bf]">/10</span>
            </>
          }
          accent="violet"
        />
        <StatCard
          icon={
            delta >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
          }
          label="Improvement"
          value={
            <span
              className={delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-white"}
            >
              {delta > 0 ? "+" : ""}
              {fmt(delta, 1)}
            </span>
          }
          accent={delta >= 0 ? "emerald" : "rose"}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Assessments"
          value={remarks.length}
          accent="sky"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Last Assessed"
          value={
            remarks[0]?.createdAt
              ? new Date(remarks[0].createdAt).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                })
              : "—"
          }
          accent="amber"
        />
      </div>

      {/* Trend chart */}
      <section className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
        <h3 className="mb-1 text-base font-semibold text-white">Score Trend</h3>
        <p className="mb-4 text-xs text-[#a8a0d6]">
          Per-session score over the current year
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#a8a0d6]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : trend.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#a8a0d6]">
            No scored remarks yet.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#312a63"
                  vertical={false}
                />
                <XAxis dataKey="date" stroke="#a8a0d6" fontSize={11} />
                <YAxis domain={[0, 10]} stroke="#a8a0d6" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f0b24",
                    border: "1px solid #312a63",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#cbd5e1" }}
                />
                {avg > 0 ? (
                  <ReferenceLine
                    y={avg}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    label={{
                      value: `avg ${fmt(avg, 1)}`,
                      fill: "#c4b5fd",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Past remarks */}
      <section className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
        <h3 className="mb-4 text-base font-semibold text-white">
          Remark History
          <span className="ml-2 text-xs font-normal text-[#a8a0d6]">
            ({remarks.length})
          </span>
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-[#a8a0d6]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : remarks.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#a8a0d6]">
            No remarks yet. Click "Add Remark" to record one.
          </div>
        ) : (
          <div className="space-y-3">
            {remarks.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-[#312a63] bg-[#0f0b24] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {r.remark ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REMARK_PILL[r.remark]}`}
                    >
                      {r.remark}
                    </span>
                  ) : null}
                  {typeof r.score === "number" ? (
                    <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30">
                      Score: {r.score}/10
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-[#a8a0d6]">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#9a92c9]">
                      Strength
                    </dt>
                    <dd className="mt-0.5 text-white">
                      {r.areaOfStrength || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#9a92c9]">
                      Improvement
                    </dt>
                    <dd className="mt-0.5 text-white">
                      {r.areaOfImprovement || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-[#9a92c9]">
                      Practice
                    </dt>
                    <dd className="mt-0.5 text-white">
                      {r.practiceTask || "—"}
                    </dd>
                  </div>
                </dl>
                {r.assessedBy && typeof r.assessedBy === "object" ? (
                  <p className="mt-3 text-xs text-[#8f87bf]">
                    Assessed by {r.assessedBy.fullName ?? "—"}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
