"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X, Search, Send, BarChart3, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

type RemarkEnum = "Good" | "Bad" | "Average";

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
  purchasedCourses?: unknown[];
  batchHistory?: { to?: string; from?: string | null; changedAt?: string }[];
};

type Course = { _id: string; title?: string };

type CommunicationRemark = {
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

type Mode = "submit" | "view";

const REMARK_OPTIONS: RemarkEnum[] = ["Good", "Average", "Bad"];

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REMARK_PILL: Record<RemarkEnum, string> = {
  Good: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  Average: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30",
  Bad: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
};

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}

export default function CommunicationAnalytics() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("submit");

  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [studentsError, setStudentsError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<Student | null>(null);

  // Submit form
  const [areaOfImprovement, setAreaOfImprovement] = useState("");
  const [areaOfStrength, setAreaOfStrength] = useState("");
  const [practiceTask, setPracticeTask] = useState("");
  const [remark, setRemark] = useState<RemarkEnum>("Average");
  const [score, setScore] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submittedThisSession, setSubmittedThisSession] = useState<
    { clerkId: string; fullName?: string; email?: string; remark: RemarkEnum; score?: number; at: string }[]
  >([]);
  const submittedIds = useMemo(
    () => new Set(submittedThisSession.map((s) => s.clerkId)),
    [submittedThisSession]
  );

  // View remarks
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [remarks, setRemarks] = useState<CommunicationRemark[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [remarksError, setRemarksError] = useState("");

  // Day-wise remarks (all students on a single date)
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dayDate, setDayDate] = useState<string>(todayISO);
  const [dayRemarks, setDayRemarks] = useState<CommunicationRemark[]>([]);
  const [loadingDayRemarks, setLoadingDayRemarks] = useState(false);

  const fetchDayRemarks = async (date: string) => {
    try {
      setLoadingDayRemarks(true);
      const res = await fetch(
        `${API_LMS_URL}/api/student-management/get-day-remarks?date=${encodeURIComponent(date)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      setDayRemarks(json.data ?? []);
    } catch {
      setDayRemarks([]);
    } finally {
      setLoadingDayRemarks(false);
    }
  };

  useEffect(() => {
    fetchDayRemarks(dayDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayDate, submittedThisSession.length]);

  const dayChartData = useMemo(() => {
    return [...dayRemarks]
      .filter((r) => typeof r.score === "number")
      .map((r) => ({
        name: r.fullName || r.clerkId,
        score: r.score as number,
        remark: r.remark || "—",
      }));
  }, [dayRemarks]);

  // ----- Fetch active placement students -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudents(true);
        setStudentsError("");
        if (!API_LMS_URL) throw new Error("NEXT_PUBLIC_LMS_URL is missing in .env");

        const res = await fetch(
          `${API_LMS_URL}/api/users/active-placement-students?status=all`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load students");
        }
        const activeStudents = (json.students ?? []).filter(
          (s: Student) =>
            s.isRealUser !== true &&
            s.isPlaced !== true &&
            Array.isArray(s.purchasedCourses) &&
            s.purchasedCourses.length > 0
        );
        setStudents(activeStudents);
      } catch (error) {
        if (!cancelled) setStudentsError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Fetch courses for course-name resolution -----
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
        // non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(String(c._id), c.title || "Untitled"));
    return map;
  }, [courses]);

  const selectedCourseTitles = useMemo(() => {
    if (!selected?.purchasedCourses?.length) return [] as string[];
    return selected.purchasedCourses
      .map((id) => courseTitleById.get(String(id)) || String(id))
      .filter(Boolean);
  }, [selected, courseTitleById]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.fullName ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const resetForm = () => {
    setAreaOfImprovement("");
    setAreaOfStrength("");
    setPracticeTask("");
    setRemark("Average");
    setScore("");
    setSubmitMsg(null);
  };

  const openStudent = (student: Student) => {
    setSelected(student);
    resetForm();
    setRemarks([]);
    setRemarksError("");
    if (mode === "view") {
      fetchRemarks(student, filterMonth, filterYear);
    }
  };

  const closeModal = () => {
    setSelected(null);
    resetForm();
    setRemarks([]);
    setRemarksError("");
  };

  // ----- Submit -----
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    try {
      setSubmitting(true);
      setSubmitMsg(null);

      if (!areaOfImprovement.trim() || !areaOfStrength.trim() || !practiceTask.trim()) {
        throw new Error("All fields are required");
      }
      const scoreNum = score === "" ? undefined : Number(score);
      if (scoreNum !== undefined && (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
        throw new Error("Score must be between 0 and 10");
      }

      const res = await fetch(
        `${API_LMS_URL}/api/student-management/submit-communication-remark`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: selected.clerkId,
            fullName: selected.fullName,
            areaOfImprovement: areaOfImprovement.trim(),
            areaOfStrength: areaOfStrength.trim(),
            practiceTask: practiceTask.trim(),
            remark,
            score: scoreNum,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit remark");
      }
      toast.success("Remark submitted successfully");
      setSubmittedThisSession((prev) => [
        {
          clerkId: selected.clerkId,
          fullName: selected.fullName,
          email: selected.email,
          remark,
          score: scoreNum,
          at: new Date().toISOString(),
        },
        ...prev.filter((p) => p.clerkId !== selected.clerkId),
      ]);
      resetForm();
      closeModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSubmitMsg({ ok: false, text: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  // ----- View remarks -----
  const fetchRemarks = async (student: Student, month: number, year: number) => {
    try {
      setLoadingRemarks(true);
      setRemarksError("");
      const url = `${API_LMS_URL}/api/student-management/get-student-remarks?clerkId=${encodeURIComponent(
        student.clerkId
      )}&month=${month}&year=${year}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load remarks");
      }
      setRemarks(json.data ?? []);
    } catch (error) {
      setRemarksError(getErrorMessage(error));
    } finally {
      setLoadingRemarks(false);
    }
  };

  useEffect(() => {
    if (selected && mode === "view") {
      fetchRemarks(selected, filterMonth, filterYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, filterYear]);

  // ----- Chart data (reactive to current remarks) -----
  const REMARK_SCORE: Record<RemarkEnum, number> = { Bad: 3, Average: 6, Good: 9 };

  const scoreTrend = useMemo(() => {
    return [...remarks]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((r, i) => {
        const value =
          typeof r.score === "number"
            ? r.score
            : r.remark
            ? REMARK_SCORE[r.remark]
            : null;
        return {
          idx: i + 1,
          date: new Date(r.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: value,
          remark: r.remark ?? "—",
        };
      })
      .filter((d) => d.score !== null) as {
      idx: number;
      date: string;
      score: number;
      remark: string;
    }[];
  }, [remarks]);

  const improvementDelta = useMemo(() => {
    if (scoreTrend.length < 2) return 0;
    return scoreTrend[scoreTrend.length - 1].score - scoreTrend[0].score;
  }, [scoreTrend]);

  const avgScore = useMemo(() => {
    if (scoreTrend.length === 0) return 0;
    const sum = scoreTrend.reduce((acc, d) => acc + d.score, 0);
    return Math.round((sum / scoreTrend.length) * 10) / 10;
  }, [scoreTrend]);

  const remarkDistribution = useMemo(() => {
    const counts: Record<RemarkEnum, number> = { Good: 0, Average: 0, Bad: 0 };
    remarks.forEach((r) => {
      if (r.remark) counts[r.remark] += 1;
    });
    return REMARK_OPTIONS.map((r) => ({ remark: r, count: counts[r] }));
  }, [remarks]);

  const REMARK_COLOR: Record<RemarkEnum, string> = {
    Good: "#10b981",
    Average: "#eab308",
    Bad: "#ef4444",
  };

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- UI ----------
  return (
    <div className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-slate-700/60">

      
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
          <h3 className="text-lg font-semibold text-slate-100">
            Communication Analytics
          </h3>
          <p className="text-xs text-slate-400">
            Submit and review student communication remarks
          </p>
          </div>
        </div>

        <div className="flex rounded-xl bg-slate-800/60 p-1 ring-1 ring-slate-700">
          <button
            type="button"
            onClick={() => {
              setMode("submit");
              closeModal();
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === "submit"
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Send className="h-3.5 w-3.5" /> Submit Remark
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("view");
              closeModal();
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === "view"
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> View Remarks
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search active placement students by name or email…"
          className="w-full rounded-xl bg-slate-800/60 py-2 pl-9 pr-3 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

        {/* Day-wise scores chart */}
      {mode === "submit" ? (
        <div className="mt-6 rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Day-wise Student Scores
              </p>
              <p className="text-xs text-slate-500">
                All students remarked on the selected date
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Date
              </label>
              <input
                type="date"
                value={dayDate}
                max={todayISO}
                onChange={(e) => setDayDate(e.target.value)}
                className="rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
              />
            </div>
          </div>

          {loadingDayRemarks ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : dayChartData.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No scored remarks on this date.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayChartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                    cursor={{ fill: "rgba(99,102,241,0.08)" }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={28}>
                    <LabelList
                      dataKey="score"
                      position="top"
                      fill="#e2e8f0"
                      fontSize={11}
                      fontWeight={600}
                      formatter={(v) => `${v}/10`}
                    />
                    {dayChartData.map((d, i) => {
                      const color =
                        d.score >= 7
                          ? "#10b981"
                          : d.score >= 4
                          ? "#eab308"
                          : "#ef4444";
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : null}


      {/* Students list */}
      {loadingStudents ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading students…
        </div>
      ) : studentsError ? (
        <div className="text-sm text-red-400">{studentsError}</div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          No active placement students found.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto rounded-xl ring-1 ring-slate-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase text-slate-400 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => (
                <tr
                  key={s._id ?? s.clerkId ?? idx}
                  className="border-t border-slate-800 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2 text-slate-100">{s.fullName || "—"}</td>
                  <td className="px-4 py-2 text-slate-300">{s.email || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {mode === "submit" && submittedIds.has(s.clerkId) ? (
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-lg bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 opacity-70"
                      >
                        Remark Submitted
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openStudent(s)}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        {mode === "submit" ? "Add Remark" : "View Remarks"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submitted this session */}
      {mode === "submit" && submittedThisSession.length > 0 ? (
        <div className="mt-6 rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            Submitted this session ({submittedThisSession.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Remark</th>
                  <th className="px-3 py-2 text-left font-medium">Score</th>
                  <th className="px-3 py-2 text-left font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submittedThisSession.map((s) => (
                  <tr key={s.clerkId} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-slate-100">{s.fullName || "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{s.email || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${REMARK_PILL[s.remark]}`}
                      >
                        {s.remark}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {typeof s.score === "number" ? `${s.score}/10` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(s.at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

    
      {/* Modal */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-xl ring-1 ring-slate-700"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-700/70 px-5 py-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  {mode === "submit" ? "Submit Communication Remark" : "Communication Remarks"}
                </h4>
                <p className="text-xs text-slate-400">
                  {selected.fullName} {selected.email ? `• ${selected.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {mode === "submit" ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Area of Strength
                    </label>
                    <select
                      value={areaOfStrength}
                      onChange={(e) => setAreaOfStrength(e.target.value)}
                      required
                      className="w-full rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="">Select an area of strength</option>
                      {STRENGTH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Area of Improvement
                    </label>
                    <select
                      value={areaOfImprovement}
                      onChange={(e) => setAreaOfImprovement(e.target.value)}
                      required
                      className="w-full rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="">Select an area of improvement</option>
                      {IMPROVEMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Practice Task
                    </label>
                    <select
                      value={practiceTask}
                      onChange={(e) => setPracticeTask(e.target.value)}
                      required
                      className="w-full rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="">Select a practice task</option>
                      {PRACTICE_TASK_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Remark
                      </label>
                      <select
                        value={remark}
                        onChange={(e) => setRemark(e.target.value as RemarkEnum)}
                        className="w-full rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                      >
                        {REMARK_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Score (0–10)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step="0.5"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-full rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {submitMsg ? (
                    <div
                      className={`rounded-lg p-2 text-xs ${
                        submitMsg.ok
                          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                          : "bg-red-500/10 text-red-300 ring-1 ring-red-500/30"
                      }`}
                    >
                      {submitMsg.text}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Submit
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Filters */}
                  <div className="mb-4 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Month
                      </label>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(Number(e.target.value))}
                        className="rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                      >
                        {MONTHS.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">
                        Year
                      </label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="rounded-lg bg-slate-800/60 p-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-500"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="ml-auto text-xs text-slate-400">
                      {remarks.length} record(s)
                    </span>
                  </div>

                  {loadingRemarks ? (
                    <div className="flex items-center justify-center py-10 text-slate-400">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
                    </div>
                  ) : remarksError ? (
                    <div className="text-sm text-red-400">{remarksError}</div>
                  ) : remarks.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                      No remarks found for the selected period.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Student info */}
                      <div className="rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                          Student Details
                        </p>
                        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <dt className="text-xs text-slate-400">Name</dt>
                            <dd className="text-slate-100">{selected.fullName || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-400">Email</dt>
                            <dd className="break-all text-slate-100">{selected.email || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-400">Course(s)</dt>
                            <dd className="text-slate-100">
                              {selectedCourseTitles.length > 0
                                ? selectedCourseTitles.join(", ")
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-400">Zone</dt>
                            <dd className="text-slate-100">{selected.zone || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-400">Batch</dt>
                            <dd className="text-slate-100">
                              {selected.batchHistory?.length
                                ? selected.batchHistory[selected.batchHistory.length - 1]?.to || "—"
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-400">Joined</dt>
                            <dd className="text-slate-100">
                              {selected.joinedMonth
                                ? new Date(selected.joinedMonth).toLocaleDateString(undefined, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Remarks list */}
                      {remarks.map((r) => (
                        <div
                          key={r._id}
                          className="rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {r.remark ? (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REMARK_PILL[r.remark]}`}
                              >
                                {r.remark}
                              </span>
                            ) : null}
                            {typeof r.score === "number" ? (
                              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30">
                                Score: {r.score}/10
                              </span>
                            ) : null}
                            <span className="ml-auto text-xs text-slate-400">
                              {new Date(r.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                            <div>
                              <dt className="text-xs text-slate-400">Strength</dt>
                              <dd className="text-slate-100">
                                {r.areaOfStrength || "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-400">Improvement</dt>
                              <dd className="text-slate-100">
                                {r.areaOfImprovement || "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-400">Practice Task</dt>
                              <dd className="text-slate-100">
                                {r.practiceTask || "—"}
                              </dd>
                            </div>
                          </dl>

                          {r.assessedBy && typeof r.assessedBy === "object" ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Assessed by {r.assessedBy.fullName ?? "—"}
                            </p>
                          ) : null}
                        </div>
                      ))}

                      {/* Analytics charts (moved to bottom) */}
                      <div className="mt-6 border-t border-slate-700/60 pt-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                          Analytics
                        </p>
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <div className="rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700/60">
                          <p className="text-xs text-slate-400">Average Score</p>
                          <p className="text-2xl font-semibold text-slate-100">
                            {avgScore}
                            <span className="text-sm text-slate-500">/10</span>
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700/60">
                          <p className="text-xs text-slate-400">
                            Improvement (first → last)
                          </p>
                          <p
                            className={`text-2xl font-semibold ${
                              improvementDelta > 0
                                ? "text-emerald-400"
                                : improvementDelta < 0
                                ? "text-red-400"
                                : "text-slate-100"
                            }`}
                          >
                            {improvementDelta > 0 ? "+" : ""}
                            {improvementDelta.toFixed(1)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700/60">
                          <p className="text-xs text-slate-400">Total Assessments</p>
                          <p className="text-2xl font-semibold text-slate-100">
                            {remarks.length}
                          </p>
                        </div>
                      </div>

                      {scoreTrend.length > 0 ? (
                        <div className="rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
                          <p className="mb-2 text-xs font-medium text-slate-300">
                            Score Trend
                          </p>
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={scoreTrend}
                                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#334155"
                                />
                                <XAxis
                                  dataKey="date"
                                  stroke="#94a3b8"
                                  fontSize={11}
                                />
                                <YAxis
                                  domain={[0, 10]}
                                  stroke="#94a3b8"
                                  fontSize={11}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#0f172a",
                                    border: "1px solid #334155",
                                    borderRadius: 8,
                                    fontSize: 12,
                                  }}
                                  labelStyle={{ color: "#cbd5e1" }}
                                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                                />
                                {avgScore > 0 ? (
                                  <ReferenceLine
                                    y={avgScore}
                                    stroke="#6366f1"
                                    strokeDasharray="4 4"
                                    label={{
                                      value: `avg ${avgScore}`,
                                      fill: "#a5b4fc",
                                      fontSize: 10,
                                      position: "insideTopRight",
                                    }}
                                  />
                                ) : null}
                                <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={28}>
                                  {scoreTrend.map((d) => {
                                    const color =
                                      d.score >= 7
                                        ? "#10b981"
                                        : d.score >= 4
                                        ? "#eab308"
                                        : "#ef4444";
                                    return <Cell key={d.idx} fill={color} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
                        <p className="mb-2 text-xs font-medium text-slate-300">
                          Remark Distribution
                        </p>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={remarkDistribution}
                              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#334155"
                              />
                              <XAxis
                                dataKey="remark"
                                stroke="#94a3b8"
                                fontSize={11}
                              />
                              <YAxis
                                stroke="#94a3b8"
                                fontSize={11}
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#0f172a",
                                  border: "1px solid #334155",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                                labelStyle={{ color: "#cbd5e1" }}
                                cursor={{ fill: "rgba(99,102,241,0.08)" }}
                              />
                              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {remarkDistribution.map((d) => (
                                  <Cell
                                    key={d.remark}
                                    fill={REMARK_COLOR[d.remark as RemarkEnum]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
