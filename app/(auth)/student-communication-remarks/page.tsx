"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Search,
  Send,
  Eye,
  Star,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  User2,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

type RemarkEnum = "Good" | "Bad" | "Average";

interface ActiveStudent {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string;
  zone?: string;
  isPlaced?: boolean;
  isRealUser?: boolean;
  purchasedCourses?: unknown[];
}

interface RemarkRecord {
  _id: string;
  clerkId: string;
  fullName?: string;
  areaOfImprovement?: string;
  areaOfStrength?: string;
  practiceTask?: string;
  remark?: RemarkEnum;
  score?: number;
  assessedBy?: { fullName?: string; email?: string; clerkId?: string } | null;
  createdAt: string;
  updatedAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

const remarkColor: Record<RemarkEnum, string> = {
  Good: "#10b981",
  Average: "#f59e0b",
  Bad: "#ef4444",
};

const remarkBadge: Record<RemarkEnum, string> = {
  Good: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  Average: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  Bad: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
};

const fmtDate = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function StudentCommunicationRemarksPage() {
  const { user } = useUser();
  const now = new Date();

  const [tab, setTab] = useState<"submit" | "view">("submit");

  // shared student list
  const [students, setStudents] = useState<ActiveStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // submit form state
  const [selectedSubmitStudent, setSelectedSubmitStudent] =
    useState<ActiveStudent | null>(null);
  const [submitSearch, setSubmitSearch] = useState("");
  const [submitDropdownOpen, setSubmitDropdownOpen] = useState(false);
  const submitBoxRef = useRef<HTMLDivElement | null>(null);

  const [areaOfStrength, setAreaOfStrength] = useState("");
  const [areaOfImprovement, setAreaOfImprovement] = useState("");
  const [practiceTask, setPracticeTask] = useState("");
  const [remark, setRemark] = useState<RemarkEnum>("Average");
  const [score, setScore] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // view state
  const [selectedViewStudent, setSelectedViewStudent] =
    useState<ActiveStudent | null>(null);
  const [viewSearch, setViewSearch] = useState("");
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewBoxRef = useRef<HTMLDivElement | null>(null);

  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState<number>(now.getFullYear());
  const [allMonths, setAllMonths] = useState(false);

  const [remarks, setRemarks] = useState<RemarkRecord[]>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);

  // ── Fetch active students ──
  useEffect(() => {
    (async () => {
      try {
        setStudentsLoading(true);
        const res = await fetch(
          `${API_LMS_URL}/api/users/active-placement-students?status=notplaced`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
            },
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed");
        const list: ActiveStudent[] = Array.isArray(json.students)
          ? json.students
          : Array.isArray(json.data)
          ? json.data
          : [];
        const filtered = list.filter(
          (s) =>
            s.isRealUser !== true &&
            s.isPlaced !== true &&
            Array.isArray(s.purchasedCourses) &&
            s.purchasedCourses.length > 0
        );
        setStudents(filtered);
      } catch (e) {
        console.error("active students load error:", e);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    })();
  }, []);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        submitBoxRef.current &&
        !submitBoxRef.current.contains(e.target as Node)
      ) {
        setSubmitDropdownOpen(false);
      }
      if (
        viewBoxRef.current &&
        !viewBoxRef.current.contains(e.target as Node)
      ) {
        setViewDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filterStudents = (q: string) => {
    const t = q.trim().toLowerCase();
    if (!t) return students.slice(0, 50);
    return students
      .filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(t) ||
          (s.email || "").toLowerCase().includes(t)
      )
      .slice(0, 50);
  };

  const submitSuggestions = useMemo(
    () => filterStudents(submitSearch),
    [submitSearch, students]
  );
  const viewSuggestions = useMemo(
    () => filterStudents(viewSearch),
    [viewSearch, students]
  );

  // ── Submit handler ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMsg(null);
    if (!selectedSubmitStudent) {
      setSubmitMsg({ type: "err", text: "Please select a student." });
      return;
    }
    try {
      setSubmitting(true);
      const payload: Record<string, unknown> = {
        clerkId: selectedSubmitStudent.clerkId,
        fullName: selectedSubmitStudent.fullName,
        areaOfImprovement: areaOfImprovement.trim(),
        areaOfStrength: areaOfStrength.trim(),
        practiceTask: practiceTask.trim(),
        remark,
        score,
      };
      if (user?.id) payload.assessorClerkId = user.id;

      const res = await fetch(
        `${API_LMS_URL}/api/student-management/submit-communication-remark`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to submit");
      }
      setSubmitMsg({
        type: "ok",
        text: `Remark submitted for ${selectedSubmitStudent.fullName}.`,
      });
      setAreaOfImprovement("");
      setAreaOfStrength("");
      setPracticeTask("");
      setRemark("Average");
      setScore(5);
    } catch (err: any) {
      setSubmitMsg({
        type: "err",
        text: err?.message || "Could not submit remark.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Fetch remarks for selected view student ──
  const fetchRemarks = async () => {
    if (!selectedViewStudent) return;
    try {
      setRemarksLoading(true);
      const params = new URLSearchParams();
      params.set("clerkId", selectedViewStudent.clerkId);
      if (!allMonths) {
        params.set("month", String(month));
        params.set("year", String(year));
      } else {
        params.set("year", String(year));
      }
      const res = await fetch(
        `${API_LMS_URL}/api/student-management/get-student-remarks?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to fetch");
      }
      setRemarks(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.error("fetchRemarks error:", e);
      setRemarks([]);
    } finally {
      setRemarksLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "view" && selectedViewStudent) {
      fetchRemarks();
    }
  }, [tab, selectedViewStudent, month, year, allMonths]);

  // ── Derived chart data ──
  const remarkDistribution = useMemo(() => {
    const counts: Record<RemarkEnum, number> = {
      Good: 0,
      Average: 0,
      Bad: 0,
    };
    remarks.forEach((r) => {
      if (r.remark && counts[r.remark] !== undefined) counts[r.remark] += 1;
    });
    return (Object.keys(counts) as RemarkEnum[]).map((k) => ({
      name: k,
      value: counts[k],
      color: remarkColor[k],
    }));
  }, [remarks]);

  const scoreTrend = useMemo(() => {
    return [...remarks]
      .filter((r) => typeof r.score === "number")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((r) => ({
        date: new Date(r.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        score: r.score,
      }));
  }, [remarks]);

  const monthlyBars = useMemo(() => {
    // counts of remarks per month for the selected year
    const arr = MONTHS.map((m, i) => ({
      month: m.slice(0, 3),
      Good: 0,
      Average: 0,
      Bad: 0,
    }));
    remarks.forEach((r) => {
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== year) return;
      const idx = d.getMonth();
      const key = (r.remark as RemarkEnum) || "Average";
      arr[idx][key] += 1;
    });
    return arr;
  }, [remarks, year]);

  const avgScore = useMemo(() => {
    const arr = remarks.filter((r) => typeof r.score === "number");
    if (!arr.length) return 0;
    const sum = arr.reduce((acc, r) => acc + Number(r.score || 0), 0);
    return Math.round((sum / arr.length) * 10) / 10;
  }, [remarks]);

  const totalCounts = {
    total: remarks.length,
    good: remarks.filter((r) => r.remark === "Good").length,
    average: remarks.filter((r) => r.remark === "Average").length,
    bad: remarks.filter((r) => r.remark === "Bad").length,
  };

  const years = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()]);
    for (let i = 0; i < 4; i++) ys.add(now.getFullYear() - i);
    return Array.from(ys).sort((a, b) => b - a);
  }, []);

  return (
    <div className="min-h-screen bg-[#09061a] p-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Sparkles className="h-7 w-7 text-[#8b5cf6]" />
              Student Communication Remarks
            </h1>
            <p className="mt-2 text-[#a8a0d6]">
              Track each active student's communication progress. Submit
              structured feedback and review trends over time.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-[#312a63] bg-[#0f0b24] p-1">
            <button
              onClick={() => setTab("submit")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "submit"
                  ? "bg-[#8b5cf6] text-white shadow"
                  : "text-[#a8a0d6] hover:text-white"
              }`}
            >
              <Send className="h-4 w-4" />
              Submit Remark
            </button>
            <button
              onClick={() => setTab("view")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "view"
                  ? "bg-[#8b5cf6] text-white shadow"
                  : "text-[#a8a0d6] hover:text-white"
              }`}
            >
              <Eye className="h-4 w-4" />
              View Remarks
            </button>
          </div>
        </div>

        {/* ──────── SUBMIT TAB ──────── */}
        {tab === "submit" && (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          >
            {/* Left: student select + remark dropdown */}
            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#a8a0d6]">
                  <User2 className="h-4 w-4" /> Active Student
                </label>
                <div ref={submitBoxRef} className="relative">
                  <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#9a92c9]" />
                  <input
                    type="text"
                    value={
                      selectedSubmitStudent
                        ? selectedSubmitStudent.fullName
                        : submitSearch
                    }
                    onChange={(e) => {
                      setSelectedSubmitStudent(null);
                      setSubmitSearch(e.target.value);
                      setSubmitDropdownOpen(true);
                    }}
                    onFocus={() => setSubmitDropdownOpen(true)}
                    placeholder={
                      studentsLoading
                        ? "Loading students..."
                        : "Search by name or email"
                    }
                    className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-[#8f87bf] focus:border-[#8b5cf6]"
                  />
                  {submitDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#312a63] bg-[#120f2d] shadow-2xl">
                      {submitSuggestions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-[#a8a0d6]">
                          No active students found
                        </div>
                      ) : (
                        <ul className="max-h-80 overflow-y-auto py-2">
                          {submitSuggestions.map((s) => (
                            <li key={s._id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSubmitStudent(s);
                                  setSubmitSearch("");
                                  setSubmitDropdownOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#1c1642]"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">
                                    {s.fullName || "Unnamed"}
                                  </p>
                                  <p className="truncate text-sm text-[#a8a0d6]">
                                    {s.email}
                                  </p>
                                </div>
                                {s.zone && (
                                  <span className="ml-3 shrink-0 rounded-full bg-[#1c1642] px-2 py-0.5 text-xs text-[#a8a0d6]">
                                    {s.zone}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {selectedSubmitStudent && (
                  <div className="mt-4 rounded-xl border border-[#312a63] bg-[#0f0b24] p-4">
                    <p className="text-xs uppercase tracking-wider text-[#9a92c9]">
                      Selected
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {selectedSubmitStudent.fullName}
                    </p>
                    <p className="text-sm text-[#a8a0d6]">
                      {selectedSubmitStudent.email}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#a8a0d6]">
                  <Star className="h-4 w-4" /> Overall Remark
                </label>
                <select
                  value={remark}
                  onChange={(e) => setRemark(e.target.value as RemarkEnum)}
                  className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                >
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Bad">Bad</option>
                </select>

                <div className="mt-5">
                  <label className="mb-2 flex items-center justify-between text-sm font-semibold text-[#a8a0d6]">
                    <span>Score (0 – 10)</span>
                    <span className="rounded-md bg-[#0f0b24] px-2 py-0.5 text-[#8b5cf6]">
                      {score}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full accent-[#8b5cf6]"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-[#8f87bf]">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: text fields */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Area of Strength
                </label>
                <select
                  value={areaOfStrength}
                  onChange={(e) => setAreaOfStrength(e.target.value)}
                  className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] p-4 text-white outline-none focus:border-emerald-400"
                >
                  <option value="">Select an area of strength</option>
                  {STRENGTH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <TrendingUp className="h-4 w-4" />
                  Area of Improvement
                </label>
                <select
                  value={areaOfImprovement}
                  onChange={(e) => setAreaOfImprovement(e.target.value)}
                  className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] p-4 text-white outline-none focus:border-amber-400"
                >
                  <option value="">Select an area of improvement</option>
                  {IMPROVEMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#a8a0d6]">
                  <ClipboardList className="h-4 w-4" />
                  Practice Task
                </label>
                <select
                  value={practiceTask}
                  onChange={(e) => setPracticeTask(e.target.value)}
                  className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] p-4 text-white outline-none focus:border-[#8b5cf6]"
                >
                  <option value="">Select a practice task</option>
                  {PRACTICE_TASK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                {submitMsg ? (
                  <p
                    className={`text-sm ${
                      submitMsg.type === "ok"
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }`}
                  >
                    {submitMsg.text}
                  </p>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={submitting || !selectedSubmitStudent}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-6 py-3 font-medium text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Remark"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ──────── VIEW TAB ──────── */}
        {tab === "view" && (
          <div className="space-y-6">
            {/* Picker + filters */}
            <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
                <div ref={viewBoxRef} className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#9a92c9]" />
                  <input
                    type="text"
                    value={
                      selectedViewStudent
                        ? selectedViewStudent.fullName
                        : viewSearch
                    }
                    onChange={(e) => {
                      setSelectedViewStudent(null);
                      setViewSearch(e.target.value);
                      setViewDropdownOpen(true);
                    }}
                    onFocus={() => setViewDropdownOpen(true)}
                    placeholder={
                      studentsLoading
                        ? "Loading students..."
                        : "Select an active student to view remarks"
                    }
                    className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-[#8f87bf] focus:border-[#8b5cf6]"
                  />
                  {viewDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#312a63] bg-[#120f2d] shadow-2xl">
                      {viewSuggestions.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-[#a8a0d6]">
                          No active students found
                        </div>
                      ) : (
                        <ul className="max-h-80 overflow-y-auto py-2">
                          {viewSuggestions.map((s) => (
                            <li key={s._id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedViewStudent(s);
                                  setViewSearch("");
                                  setViewDropdownOpen(false);
                                }}
                                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#1c1642]"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">
                                    {s.fullName || "Unnamed"}
                                  </p>
                                  <p className="truncate text-sm text-[#a8a0d6]">
                                    {s.email}
                                  </p>
                                </div>
                                {s.zone && (
                                  <span className="ml-3 shrink-0 rounded-full bg-[#1c1642] px-2 py-0.5 text-xs text-[#a8a0d6]">
                                    {s.zone}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={allMonths ? "all" : String(month)}
                    onChange={(e) => {
                      if (e.target.value === "all") {
                        setAllMonths(true);
                      } else {
                        setAllMonths(false);
                        setMonth(Number(e.target.value));
                      }
                    }}
                    className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                  >
                    <option value="all">All Months</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setMonth(now.getMonth() + 1);
                      setYear(now.getFullYear());
                      setAllMonths(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-sm text-white transition hover:bg-[#1b1640]"
                  >
                    <Calendar className="h-4 w-4" />
                    This Month
                  </button>
                </div>
              </div>
            </div>

            {!selectedViewStudent ? (
              <div className="rounded-2xl border border-dashed border-[#312a63] bg-[#120f2d]/50 p-12 text-center text-[#a8a0d6]">
                Select a student above to see their remark history,
                strengths/weaknesses and progress charts.
              </div>
            ) : remarksLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#8b5cf6]" />
                  <p className="mt-4 text-[#a8a0d6]">Loading remarks...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#312a63] bg-gradient-to-br from-[#1c1642] to-[#120f2d] p-5">
                    <p className="text-xs uppercase tracking-wider text-[#9a92c9]">
                      Total Remarks
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[#8b5cf6]">
                      {totalCounts.total}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0f2a22] to-[#120f2d] p-5">
                    <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Good
                    </p>
                    <p className="mt-2 text-3xl font-bold text-emerald-400">
                      {totalCounts.good}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#2a200f] to-[#120f2d] p-5">
                    <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-amber-200">
                      <MinusCircle className="h-3 w-3" /> Average
                    </p>
                    <p className="mt-2 text-3xl font-bold text-amber-400">
                      {totalCounts.average}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-[#2a0f1a] to-[#120f2d] p-5">
                    <p className="flex items-center gap-1 text-xs uppercase tracking-wider text-rose-200">
                      <XCircle className="h-3 w-3" /> Bad
                    </p>
                    <p className="mt-2 text-3xl font-bold text-rose-400">
                      {totalCounts.bad}
                    </p>
                  </div>
                </div>

                {remarks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#312a63] bg-[#120f2d]/50 p-12 text-center text-[#a8a0d6]">
                    No remarks found for{" "}
                    <span className="font-semibold text-white">
                      {selectedViewStudent.fullName}
                    </span>{" "}
                    in this period.
                  </div>
                ) : (
                  <>
                    {/* Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      {/* Pie */}
                      <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
                        <h3 className="mb-1 text-lg font-semibold text-white">
                          Remark Distribution
                        </h3>
                        <p className="mb-3 text-sm text-[#a8a0d6]">
                          Breakdown of Good / Average / Bad
                        </p>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={remarkDistribution.filter(
                                  (d) => d.value > 0
                                )}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={90}
                                innerRadius={50}
                                paddingAngle={2}
                              >
                                {remarkDistribution.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                wrapperStyle={{ color: "#a8a0d6" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#120f2d",
                                  border: "1px solid #312a63",
                                  borderRadius: "8px",
                                  color: "#fff",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Score trend */}
                      <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 lg:col-span-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              Score Trend
                            </h3>
                            <p className="text-sm text-[#a8a0d6]">
                              Per-session score over the selected period
                            </p>
                          </div>
                          <div className="rounded-lg bg-[#0f0b24] px-3 py-2">
                            <p className="text-xs text-[#9a92c9]">Avg Score</p>
                            <p className="text-xl font-bold text-[#8b5cf6]">
                              {avgScore}
                              <span className="text-xs text-[#a8a0d6]"> /10</span>
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={scoreTrend}>
                              <CartesianGrid
                                stroke="#312a63"
                                strokeDasharray="3 3"
                              />
                              <XAxis dataKey="date" stroke="#a8a0d6" />
                              <YAxis
                                domain={[0, 10]}
                                stroke="#a8a0d6"
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#120f2d",
                                  border: "1px solid #312a63",
                                  borderRadius: "8px",
                                  color: "#fff",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#8b5cf6" }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Monthly stacked bar (only when allMonths) */}
                    {allMonths && (
                      <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
                        <h3 className="mb-1 text-lg font-semibold text-white">
                          Monthly Breakdown — {year}
                        </h3>
                        <p className="mb-3 text-sm text-[#a8a0d6]">
                          Remarks per month
                        </p>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyBars}>
                              <CartesianGrid
                                stroke="#312a63"
                                strokeDasharray="3 3"
                              />
                              <XAxis dataKey="month" stroke="#a8a0d6" />
                              <YAxis stroke="#a8a0d6" allowDecimals={false} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#120f2d",
                                  border: "1px solid #312a63",
                                  borderRadius: "8px",
                                  color: "#fff",
                                }}
                              />
                              <Legend wrapperStyle={{ color: "#a8a0d6" }} />
                              <Bar
                                dataKey="Good"
                                stackId="a"
                                fill={remarkColor.Good}
                                radius={[0, 0, 0, 0]}
                              />
                              <Bar
                                dataKey="Average"
                                stackId="a"
                                fill={remarkColor.Average}
                              />
                              <Bar
                                dataKey="Bad"
                                stackId="a"
                                fill={remarkColor.Bad}
                                radius={[6, 6, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Remarks list */}
                    <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
                      <h3 className="mb-4 text-lg font-semibold text-white">
                        All Remarks{" "}
                        <span className="text-sm font-normal text-[#a8a0d6]">
                          ({remarks.length})
                        </span>
                      </h3>
                      <div className="space-y-4">
                        {remarks.map((r) => (
                          <div
                            key={r._id}
                            className="rounded-xl border border-[#312a63] bg-[#0f0b24] p-5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    remarkBadge[
                                      (r.remark as RemarkEnum) || "Average"
                                    ]
                                  }`}
                                >
                                  {r.remark || "Average"}
                                </span>
                                {typeof r.score === "number" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1c1642] px-3 py-1 text-xs font-semibold text-[#8b5cf6]">
                                    <Star className="h-3 w-3" />
                                    {r.score} / 10
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#a8a0d6]">
                                {fmtDate(r.createdAt)}
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                              <div>
                                <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> Strength
                                </p>
                                <p className="text-sm text-white">
                                  {r.areaOfStrength || (
                                    <span className="text-[#8f87bf]">—</span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                                  <TrendingUp className="h-3 w-3" /> Improvement
                                </p>
                                <p className="text-sm text-white">
                                  {r.areaOfImprovement || (
                                    <span className="text-[#8f87bf]">—</span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#a8a0d6]">
                                  <ClipboardList className="h-3 w-3" /> Practice
                                </p>
                                <p className="text-sm text-white">
                                  {r.practiceTask || (
                                    <span className="text-[#8f87bf]">—</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {r.assessedBy?.fullName && (
                              <p className="mt-3 text-xs text-[#8f87bf]">
                                Assessed by{" "}
                                <span className="text-[#a8a0d6]">
                                  {r.assessedBy.fullName}
                                </span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
