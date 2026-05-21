"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CalendarDays, RefreshCw, X } from "lucide-react";
import DataPresentationTable, {
  Column,
} from "../healper/DataPresentationTable";
import CalendarFormate from "../healper/calendarFormate";
import { API_LMS_URL } from "../lib/api";

type Mode = "quiz" | "mock";

type QuizByDateRow = {
  date: string;
  totalAttempts: number;
  evaluatedCount: number;
  pendingCount: number;
  uniqueStudentCount: number;
};

type QuizAttemptRow = {
  attemptId: string;
  userId: string;
  studentName: string;
  quizTitle: string | null;
  section: string | null;
  courseId: string | null;
  isEvaluated: boolean;
  totalMarksObtained: number;
  totalMarksPossible: number;
  percentage: number;
  attemptedAt: string;
};

type MockByDateRow = {
  date: string;
  totalAttempts: number;
  uniqueUserCount: number;
};

type MockAttemptRow = {
  id: string;
  email: string | null;
  name: string | null;
  interviewType: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endedReason: string | null;
  evaluation: string | number | null;
  completed: boolean;
  recordingUrl: string | null;
  summaryPreview: string;
  createdAt: string;
};

type AnyByDate = QuizByDateRow | MockByDateRow;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDuration(sec: number) {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

export default function AcademicResultsPage() {
  const [mode, setMode] = useState<Mode>("quiz");
  const [month, setMonth] = useState<string>(currentMonth());

  const [quizByDate, setQuizByDate] = useState<QuizByDateRow[]>([]);
  const [mockByDate, setMockByDate] = useState<MockByDateRow[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRow[]>([]);
  const [mockAttempts, setMockAttempts] = useState<MockAttemptRow[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const fetchMonth = async (m: string, currentMode: Mode) => {
    setLoadingMonth(true);
    try {
      if (currentMode === "quiz") {
        const { data } = await axios.get(
          `${API_LMS_URL}/api/daily-quiz/students-results/by-date`,
          { params: { month: m } }
        );
        setQuizByDate(data?.data ?? []);
      } else {
        const { data } = await axios.get(
          `${API_LMS_URL}/api/mocinterview-result/mockinterview-result/calendar`,
          { params: { month: m } }
        );
        setMockByDate(data?.data ?? []);
      }
    } catch (err) {
      console.error(err);
      if (currentMode === "quiz") setQuizByDate([]);
      else setMockByDate([]);
    } finally {
      setLoadingMonth(false);
    }
  };

  const fetchDay = async (d: string, currentMode: Mode) => {
    setLoadingDay(true);
    try {
      if (currentMode === "quiz") {
        const { data } = await axios.get(
          `${API_LMS_URL}/api/daily-quiz/quiz-result/table`,
          { params: { date: d } }
        );
        setQuizAttempts(data?.attempts ?? []);
      } else {
        const { data } = await axios.get(
          `${API_LMS_URL}/api/mocinterview-result/get-result-table/by-date`,
          { params: { date: d, limit: 100 } }
        );
        setMockAttempts(data?.data?.attempts ?? []);
      }
    } catch (err) {
      console.error(err);
      if (currentMode === "quiz") setQuizAttempts([]);
      else setMockAttempts([]);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    fetchMonth(month, mode);
    setSelectedDate(null);
    setQuizAttempts([]);
    setMockAttempts([]);
  }, [month, mode]);

  const byDate: AnyByDate[] = mode === "quiz" ? quizByDate : mockByDate;

  const monthTotals = useMemo(() => {
    if (mode === "quiz") {
      return quizByDate.reduce(
        (acc, r) => {
          acc.totalAttempts += r.totalAttempts;
          acc.evaluatedCount += r.evaluatedCount;
          acc.pendingCount += r.pendingCount;
          return acc;
        },
        { totalAttempts: 0, evaluatedCount: 0, pendingCount: 0 }
      );
    }
    return mockByDate.reduce(
      (acc, r) => {
        acc.totalAttempts += r.totalAttempts;
        acc.uniqueUserCount += r.uniqueUserCount;
        return acc;
      },
      { totalAttempts: 0, uniqueUserCount: 0 }
    );
  }, [mode, quizByDate, mockByDate]);

  const quizColumns: Column<QuizAttemptRow>[] = [
    {
      key: "studentName",
      header: "Student",
      accessor: "studentName",
      sortable: true,
      searchable: true,
    },
    {
      key: "quizTitle",
      header: "Quiz",
      accessor: "quizTitle",
      sortable: true,
      searchable: true,
    },
    {
      key: "section",
      header: "Section",
      accessor: "section",
      sortable: true,
      render: (r) =>
        r.section ? (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
            {r.section}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "marks",
      header: "Marks",
      align: "right",
      sortable: true,
      accessor: (r) => r.totalMarksObtained,
      render: (r) => (
        <span>
          {r.totalMarksObtained}{" "}
          <span className="text-gray-400">/ {r.totalMarksPossible}</span>
        </span>
      ),
    },
    {
      key: "percentage",
      header: "Percentage",
      accessor: "percentage",
      sortable: true,
      align: "right",
      render: (r) => {
        const p = r.percentage;
        const color =
          p >= 75
            ? "text-green-600"
            : p >= 40
            ? "text-amber-600"
            : "text-red-600";
        return <span className={`font-semibold ${color}`}>{p}%</span>;
      },
    },
    {
      key: "isEvaluated",
      header: "Status",
      accessor: "isEvaluated",
      sortable: true,
      align: "center",
      render: (r) =>
        r.isEvaluated ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            Evaluated
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
            Pending
          </span>
        ),
    },
    {
      key: "attemptedAt",
      header: "Attempted At",
      accessor: "attemptedAt",
      sortable: true,
      render: (r) =>
        new Date(r.attemptedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
    },
  ];

  const mockColumns: Column<MockAttemptRow>[] = [
    {
      key: "name",
      header: "Student",
      accessor: (r) => r.name ?? r.email ?? "—",
      sortable: true,
      searchable: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{r.name ?? "—"}</span>
          {r.email && (
            <span className="text-xs text-slate-500">{r.email}</span>
          )}
        </div>
      ),
    },
    {
      key: "interviewType",
      header: "Interview Type",
      accessor: "interviewType",
      sortable: true,
      searchable: true,
      render: (r) =>
        r.interviewType ? (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
            {r.interviewType}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      sortable: true,
      accessor: (r) => r.durationSeconds,
      render: (r) => <span>{formatDuration(r.durationSeconds)}</span>,
    },
    {
      key: "evaluation",
      header: "Evaluation",
      accessor: (r) => (r.evaluation == null ? "" : String(r.evaluation)),
      sortable: true,
      align: "center",
      render: (r) => {
        if (r.evaluation == null)
          return <span className="text-gray-400">—</span>;
        const v = String(r.evaluation).toLowerCase();
        const color =
          v.includes("pass") || v === "true"
            ? "bg-green-50 text-green-700"
            : v.includes("fail") || v === "false"
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-700";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
          >
            {String(r.evaluation)}
          </span>
        );
      },
    },
    {
      key: "completed",
      header: "Status",
      accessor: "completed",
      sortable: true,
      align: "center",
      render: (r) =>
        r.completed ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
            Incomplete
          </span>
        ),
    },
    {
      key: "endedReason",
      header: "Ended Reason",
      accessor: "endedReason",
      sortable: true,
      render: (r) =>
        r.endedReason ? (
          <span className="text-xs text-slate-600">{r.endedReason}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "recording",
      header: "Recording",
      accessor: (r) => (r.recordingUrl ? 1 : 0),
      align: "center",
      render: (r) =>
        r.recordingUrl ? (
          <a
            href={r.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline text-xs font-medium"
          >
            Listen
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Attempted At",
      accessor: "createdAt",
      sortable: true,
      render: (r) =>
        new Date(r.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Academic Results
            </h1>
            <p className="text-sm text-slate-400">
              {mode === "quiz"
                ? "Daily quiz performance overview — click a date to see student attempts."
                : "Mock interview activity — click a date to see student attempts."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-700 bg-slate-900 p-0.5">
              <button
                onClick={() => setMode("quiz")}
                className={`px-3 py-1 text-sm rounded ${
                  mode === "quiz"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                Daily Quiz
              </button>
              <button
                onClick={() => setMode("mock")}
                className={`px-3 py-1 text-sm rounded ${
                  mode === "mock"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                Mock Interview
              </button>
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-700 rounded-md bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
              />
            </div>
            <button
              onClick={() => {
                fetchMonth(month, mode);
                if (selectedDate) fetchDay(selectedDate, mode);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 text-slate-100 rounded-md hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total Attempts"
            value={monthTotals.totalAttempts}
            accent="blue"
          />
          {mode === "quiz" ? (
            <>
              <StatCard
                label="Evaluated"
                value={
                  (monthTotals as { evaluatedCount: number }).evaluatedCount
                }
                accent="emerald"
              />
              <StatCard
                label="Pending"
                value={(monthTotals as { pendingCount: number }).pendingCount}
                accent="amber"
              />
            </>
          ) : (
            <StatCard
              label="Unique Students"
              value={
                (monthTotals as { uniqueUserCount: number }).uniqueUserCount
              }
              accent="emerald"
            />
          )}
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <CalendarFormate
            title="Monthly Summary"
            initialMonth={month}
            loading={loadingMonth}
            data={byDate}
            onMonthChange={(m) => setMonth(m)}
            onDateSelect={(date, dayData) => {
              if (!dayData) return;
              setSelectedDate(date);
              fetchDay(date, mode);
            }}
            renderCell={({ date, inMonth, isToday, isSelected, dayData }) => {
              const d = dayData as AnyByDate | null;
              const dow = new Date(date).getDay();
              const dayNum = new Date(date).getDate();
              const numColor = !inMonth
                ? "text-slate-600"
                : dow === 0
                ? "text-red-400"
                : dow >= 1 && dow <= 5
                ? "text-emerald-400"
                : "text-slate-300";
              return (
                <div
                  className={[
                    "h-full w-full rounded-md px-1.5 py-1 flex flex-col transition border",
                    isSelected
                      ? "bg-blue-600/25 border-blue-500"
                      : isToday
                      ? "bg-blue-500/10 border-blue-400/40"
                      : d
                      ? "bg-emerald-500/[0.07] border-emerald-500/20 hover:bg-emerald-500/15"
                      : "border-transparent hover:bg-white/5",
                  ].join(" ")}
                >
                  <div
                    className={`text-sm font-semibold leading-none ${numColor}`}
                  >
                    {dayNum}
                  </div>
                  {d && (
                    <div className="mt-auto space-y-0.5 text-[10px] leading-tight">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Attempts</span>
                        <span className="font-semibold text-white">
                          {d.totalAttempts}
                        </span>
                      </div>
                      {mode === "quiz" ? (
                        <>
                          <div className="flex justify-between text-emerald-400">
                            <span>Evaluated</span>
                            <span className="font-semibold">
                              {(d as QuizByDateRow).evaluatedCount}
                            </span>
                          </div>
                          <div className="flex justify-between text-amber-400">
                            <span>Pending</span>
                            <span className="font-semibold">
                              {(d as QuizByDateRow).pendingCount}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-emerald-400">
                          <span>Students</span>
                          <span className="font-semibold">
                            {(d as MockByDateRow).uniqueUserCount}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          />
        </div>

        {selectedDate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setSelectedDate(null);
              setQuizAttempts([]);
              setMockAttempts([]);
            }}
          >
            <div
              className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {mode === "quiz" ? "Quiz" : "Mock Interview"} attempts on{" "}
                    {selectedDate}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {(mode === "quiz" ? quizAttempts : mockAttempts).length}{" "}
                    attempt
                    {(mode === "quiz" ? quizAttempts : mockAttempts).length ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setQuizAttempts([]);
                    setMockAttempts([]);
                  }}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {mode === "quiz" ? (
                  <DataPresentationTable<QuizAttemptRow>
                    data={quizAttempts}
                    columns={quizColumns}
                    loading={loadingDay}
                    searchable
                    paginated
                    pageSize={15}
                    rowKey="attemptId"
                    stickyHeader
                    emptyMessage="No attempts for this date"
                  />
                ) : (
                  <DataPresentationTable<MockAttemptRow>
                    data={mockAttempts}
                    columns={mockColumns}
                    loading={loadingDay}
                    searchable
                    paginated
                    pageSize={15}
                    rowKey="id"
                    stickyHeader
                    emptyMessage="No mock interviews for this date"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ACCENTS = {
  blue: {
    value: "text-blue-400",
    ring: "from-blue-500/20 to-transparent",
    bar: "bg-blue-500",
  },
  emerald: {
    value: "text-emerald-400",
    ring: "from-emerald-500/20 to-transparent",
    bar: "bg-emerald-500",
  },
  amber: {
    value: "text-amber-400",
    ring: "from-amber-500/20 to-transparent",
    bar: "bg-amber-500",
  },
} as const;

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: keyof typeof ACCENTS;
}) {
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
