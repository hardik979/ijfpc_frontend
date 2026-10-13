"use client";

import { decodeStudentRef } from "@/lib/studentRef";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AcademicPerformance, { type AcademicData } from "./AcademicPerformance";
import type { ParticipationData } from "./academic/types";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ModalType =
  | "att-present" | "att-absent"
  | "quiz-present" | "quiz-absent"
  | "mega-exams"
  | "mock-present" | "mock-absent"
  | "ai-days" | "ai-absent"
  | "real-days" | "real-absent"
  | null;

const MODAL_TITLES: Record<Exclude<ModalType, null>, string> = {
  "att-present": "Days Present (punched in & out)",
  "att-absent": "Days Absent",
  "quiz-present": "Quiz Days Attempted",
  "quiz-absent": "Quiz Days Missed",
  "mega-exams": "Mega Test Results",
  "mock-present": "AI Mock Interview Days Attempted",
  "mock-absent": "AI Mock Interview Days Missed",
  "ai-days": "AI HR Calls by Day",
  "ai-absent": "AI HR Days Not Answered",
  "real-days": "HR Calls by Day",
  "real-absent": "HR Days Without a Recording",
};

const REASON_LABELS: Record<string, string> = {
  no_punch: "No punch",
  no_punch_out: "Missed punch-out",
  DNP: "Did not pick",
  INVALID_NUMBER: "Invalid number",
  OUT_OF_SERVICE: "Out of service",
  NOT_CONNECTED: "Not connected",
};

// "YYYY-MM-DD" (an IST day key from the API) -> "12 Oct 2026", without any timezone shifting.
function formatKey(key?: string | null): string {
  if (!key) return "—";
  const [y, m, d] = key.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

// First and last day of a calendar month as YYYY-MM-DD.
function monthBounds(month: number, year: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);

function scoreColor(p: number | null | undefined) {
  if (p === null || p === undefined) return "#94a3b8";
  if (p >= 75) return "#10b981";
  if (p >= 50) return "#38bdf8";
  if (p >= 25) return "#fbbf24";
  return "#ef4444";
}

function participationColor(p: number | null | undefined) {
  if (p === null || p === undefined) return "#94a3b8";
  if (p >= 80) return "#10b981";
  if (p >= 60) return "#f59e0b";
  return "#ef4444";
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function ClickableStatCard({
  label,
  value,
  sub,
  accent,
  icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accent: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 p-5 text-left backdrop-blur-sm transition-all hover:border-slate-600/70 hover:shadow-lg hover:shadow-black/20 disabled:cursor-default disabled:hover:border-slate-700/50 disabled:hover:shadow-none"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20" style={{ backgroundColor: accent }} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <h3 className="mb-1 text-3xl font-bold transition-colors" style={{ color: accent }}>
            {value}
          </h3>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>

        <div className="ml-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/30 transition-colors group-hover:bg-slate-700/50" style={{ color: accent }}>
          {icon}
        </div>
      </div>

      {onClick && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
          <span>View Details</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-800/95 px-6 py-4 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// A grid of day chips (newest first), used for every "which days" drill-down.
function DateChips({ dates, tone, empty }: { dates: string[]; tone: "good" | "bad"; empty: string }) {
  if (!dates.length) return <p className="py-8 text-center text-slate-400">{empty}</p>;
  const cls =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-rose-500/30 bg-rose-500/10 text-rose-200";

  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">{dates.length} day{dates.length === 1 ? "" : "s"} · Sundays are never counted</p>
      <div className="flex flex-wrap gap-2">
        {[...dates].reverse().map((d) => (
          <span key={d} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${cls}`}>
            {formatKey(d)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DayRow({ left, right, badge, tone }: { left: string; right?: React.ReactNode; badge: string; tone: "good" | "bad" | "wait" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/20 text-emerald-300"
      : tone === "bad"
        ? "bg-rose-500/20 text-rose-300"
        : "bg-amber-500/20 text-amber-300";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      <p className="font-semibold text-white">{left}</p>
      <div className="flex items-center gap-3 text-sm text-slate-300">
        {right}
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{badge}</span>
      </div>
    </div>
  );
}

const icons = {
  calendar: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  doc: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  chart: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  check: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  cross: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  phone: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  people: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  clock: <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

export default function StudentDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // The Clerk ID travels encoded (?ref=) so it isn't readable in the URL.
  // A legacy ?clerkId= link still works.
  const clerkId = decodeStudentRef(searchParams.get("ref")) || searchParams.get("clerkId");

  const now = new Date();

  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  // The month/year the current `data` was actually fetched for (null = all time).
  const [applied, setApplied] = useState<{ month: number; year: number } | null>(null);
  const [data, setData] = useState<ParticipationData | null>(null);
  // All-time academic score, fetched in parallel with `data` so the card appears with the page.
  const [academic, setAcademic] = useState<AcademicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isPlaced, setIsPlaced] = useState<boolean>(false);
  const [placementUpdating, setPlacementUpdating] = useState(false);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsPlaced(Boolean(data?.student?.isPlaced));
  }, [data?.student?._id, data?.student?.isPlaced]);

  const updatePlacementStatus = async (next: boolean) => {
    if (!data?.student?._id) return;
    try {
      setPlacementUpdating(true);
      setPlacementMessage(null);
      const res = await fetch(
        `${API_LMS_URL}/api/users/student-placement-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: data.student._id, isPlaced: next }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Update failed");
      setIsPlaced(next);
      setPlacementMessage(json?.message || "Updated successfully");
    } catch (err: any) {
      setPlacementMessage(err.message || "Failed to update placement status");
    } finally {
      setPlacementUpdating(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // First / last quiz day in the selected period, shown as the student's "Active Period".
  const activePeriod = useMemo(() => {
    const days = data?.dailyQuiz?.presentDates ?? [];
    return days.length ? `${formatKey(days[0])} - ${formatKey(days[days.length - 1])}` : "—";
  }, [data]);

  const fetchStudentDetails = async (filter?: {
    month?: number | null;
    year?: number | null;
  }) => {
    if (!clerkId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("clerkId", clerkId);

      const monthly = Boolean(filter?.month && filter?.year);
      if (monthly) {
        const { from, to } = monthBounds(filter!.month!, filter!.year!);
        params.append("from", from);
        params.append("to", to);
      }

      // Both requests go out together; the score card is optional, so its failure never blocks the page.
      const [res, academicRes] = await Promise.all([
        fetch(`${API_LMS_URL}/api/admin/get-acadmic-participation?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`${API_LMS_URL}/api/admin/get-acadmic-data?clerkId=${encodeURIComponent(clerkId)}&range=all`, {
          cache: "no-store",
        }).catch(() => null),
      ]);

      const json = await res.json();
      const academicJson = academicRes?.ok ? await academicRes.json().catch(() => null) : null;
      setAcademic(academicJson?.data ?? null);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to fetch student details");
      }

      setData(json.data);
      setApplied(monthly ? { month: filter!.month!, year: filter!.year! } : null);
    } catch (err: any) {
      console.error("fetchStudentDetails error:", err);
      setError(err.message || "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!month || !year) {
      alert("Please select month and year");
      return;
    }

    fetchStudentDetails({ month, year });
  };

  const handleReset = () => {
    setMonth(null);
    setYear(null);
    fetchStudentDetails();
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [clerkId]);

  const renderModalContent = () => {
    if (!data) return null;
    const att = data.attendance;
    const quiz = data.dailyQuiz;
    const mock = data.aiMockInterview;
    const ai = data.aiHrCalling;
    const real = data.realHrCalling;
    const mega = data.weeklyTest;

    switch (activeModal) {
      case "att-present":
      case "att-absent": {
        const wanted = activeModal === "att-present" ? "present" : "absent";
        const days = att.days.filter((d) => d.status === wanted).reverse();
        if (days.length === 0) {
          return <p className="py-8 text-center text-slate-400">No days found</p>;
        }
        return (
          <div className="space-y-2">
            {days.map((d) => (
              <DayRow
                key={d.date}
                left={formatKey(d.date)}
                tone={d.status === "present" ? "good" : "bad"}
                badge={d.status === "present" ? "Present" : REASON_LABELS[d.reason ?? ""] ?? "Absent"}
                right={
                  <span>
                    In {d.inTime ?? "—"} · Out {d.outTime ?? "—"}
                  </span>
                }
              />
            ))}
          </div>
        );
      }

      case "quiz-present":
        return <DateChips dates={quiz.presentDates} tone="good" empty="No quiz days attempted" />;
      case "quiz-absent":
        return <DateChips dates={quiz.absentDates} tone="bad" empty="No missed quiz days" />;
      case "mock-present":
        return <DateChips dates={mock.presentDates} tone="good" empty="No mock interview days" />;
      case "mock-absent":
        return <DateChips dates={mock.absentDates} tone="bad" empty="No missed mock interview days" />;
      case "ai-absent":
        return <DateChips dates={ai.absentDates} tone="bad" empty="No days with every call missed" />;
      case "real-absent":
        return real.applicable ? (
          <DateChips dates={real.absentDates} tone="bad" empty="No days without a recording" />
        ) : null;

      case "ai-days": {
        const days = [...ai.days].reverse();
        if (days.length === 0) {
          return <p className="py-8 text-center text-slate-400">No AI HR calls found</p>;
        }
        return (
          <div className="space-y-2">
            {days.map((d) => (
              <DayRow
                key={d.date}
                left={formatKey(d.date)}
                tone={d.pending ? "wait" : d.picked ? "good" : "bad"}
                badge={d.pending ? "Pending" : d.picked ? "Picked up" : "All not answered"}
                right={<span>{d.calls} call{d.calls === 1 ? "" : "s"}</span>}
              />
            ))}
          </div>
        );
      }

      case "real-days": {
        if (!real.applicable) return null;
        const days = [...real.days].reverse();
        if (days.length === 0) {
          return <p className="py-8 text-center text-slate-400">No HR calls found</p>;
        }
        return (
          <div className="space-y-2">
            {days.map((d) => (
              <DayRow
                key={d.date}
                left={formatKey(d.date)}
                tone={d.pending ? "wait" : d.picked ? "good" : "bad"}
                badge={d.pending ? "Pending" : d.picked ? "Recorded" : REASON_LABELS[d.reason ?? ""] ?? "Not connected"}
                right={<span>{d.calls} call{d.calls === 1 ? "" : "s"} · {d.recordings} recorded</span>}
              />
            ))}
          </div>
        );
      }

      case "mega-exams": {
        const exams = [...mega.exams].reverse();
        if (exams.length === 0) {
          return <p className="py-8 text-center text-slate-400">No evaluated mega tests found</p>;
        }
        return (
          <div className="space-y-3">
            {exams.map((exam) => {
              const color = scoreColor(exam.percentage);
              return (
                <details key={exam.id} className="rounded-lg border border-slate-700 bg-slate-800/50">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span>
                      <span className="font-semibold text-white">{exam.examTitle}</span>
                      <span className="ml-2 text-xs text-slate-400">{formatKey(exam.date)}</span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-white">
                        {exam.obtainedMarks ?? "—"} / {exam.totalMarks ?? "—"}
                      </span>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color, background: `${color}22` }}>
                        {pct(exam.percentage)}{exam.grade ? ` · ${exam.grade}` : ""}
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-slate-700 px-4 py-3 text-sm text-slate-200">
                    <p className="text-xs text-slate-400">
                      {exam.questionsFullMarks} full marks · {exam.questionsPartial} partial · {exam.questionsZero} zero ({exam.questionsTotal} questions)
                    </p>
                    {exam.overallFeedback && (
                      <p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-900/60 p-3">{exam.overallFeedback}</p>
                    )}
                    {exam.questionWiseResult.length > 0 && (
                      <div className="mt-3 max-h-72 overflow-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-900 text-slate-400">
                            <tr>
                              <th className="px-2 py-1.5">#</th>
                              <th className="px-2 py-1.5">Question</th>
                              <th className="px-2 py-1.5">Marks</th>
                              <th className="px-2 py-1.5">Feedback</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exam.questionWiseResult.map((q, i) => (
                              <tr key={i} className="border-t border-slate-800 align-top">
                                <td className="px-2 py-1.5">{q.questionNo ?? i + 1}</td>
                                <td className="px-2 py-1.5">{q.question ?? "—"}</td>
                                <td className="whitespace-nowrap px-2 py-1.5 font-semibold text-white">
                                  {q.marksAwarded ?? "—"} / {q.maxMarks ?? "—"}
                                </td>
                                <td className="px-2 py-1.5">{q.feedback ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
            {mega.notEvaluated.length > 0 && (
              <p className="text-xs text-amber-300">
                {mega.notEvaluated.length} not evaluated yet:{" "}
                {mega.notEvaluated.map((e) => `${e.examTitle} (${e.status})`).join(", ")}
              </p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Absent days are always counted; for zones where the activity isn't compulsory the card says so.
  const optionalNote = (compulsory: boolean) => (compulsory ? "" : " · optional for this zone");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            ← Back
          </button>
          <div className="mb-6">
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">
              Student Dashboard
            </h1>
            <p className="text-slate-400">
              {applied
                ? `Performance overview for ${MONTHS[applied.month - 1]} ${applied.year}`
                : "Complete academic performance overview"}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm">
            <select
              value={month ?? ""}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Year</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              disabled={!month || !year || loading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Apply Filter"}
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="rounded-lg border border-slate-600 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-16 text-center backdrop-blur-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
            <p className="mt-4 text-slate-400">Loading student details...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-10 text-center text-rose-300">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Student Info */}
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 p-6 backdrop-blur-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Student Information</h2>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${isPlaced
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-600/40 text-slate-300"
                      }`}
                  >
                    {isPlaced ? "Placed" : "Not Placed"}
                  </span>
                  <button
                    onClick={() => updatePlacementStatus(!isPlaced)}
                    disabled={placementUpdating || !data.student?._id}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isPlaced
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                  >
                    {placementUpdating
                      ? "Updating..."
                      : isPlaced
                        ? "Mark as Not Placed"
                        : "Mark as Placed"}
                  </button>
                </div>
              </div>
              {placementMessage && (
                <p className="mb-3 text-sm text-slate-300">{placementMessage}</p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="Full Name" value={data.student?.fullName} />
                <InfoCard label="Email" value={data.student?.email} />
                <InfoCard label="Joined" value={data.student?.joinedMonth} />
                <InfoCard label="Batch" value={data.student?.batch} />
                <InfoCard label="Active Period" value={activePeriod} />
                <InfoCard label="Course" value={data.student?.courseName} />
              </div>
            </div>

            {/* Academic performance from the admin API (own range filter) */}
            <AcademicPerformance clerkId={clerkId} initialData={academic} />

            {/* Class Attendance */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Class Attendance</h2>
              {data.attendance.matched ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ClickableStatCard
                    label="Days Present"
                    value={data.attendance.presentDays}
                    sub="Punched in and out"
                    accent="#10b981"
                    icon={icons.check}
                    onClick={() => setActiveModal("att-present")}
                  />
                  <ClickableStatCard
                    label="Days Absent"
                    value={data.attendance.absentDays}
                    sub={
                      data.attendance.noPunchOutDays
                        ? `${data.attendance.noPunchOutDays} missed punch-out`
                        : "No punch or missed punch-out"
                    }
                    accent="#ef4444"
                    icon={icons.cross}
                    onClick={() => setActiveModal("att-absent")}
                  />
                  <ClickableStatCard
                    label="Attendance"
                    value={pct(data.attendance.attendancePercentage)}
                    sub={`Of ${data.attendance.expectedDays} expected days`}
                    accent={participationColor(data.attendance.attendancePercentage)}
                    icon={icons.chart}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-sm text-slate-400">
                  Attendance isn&apos;t tracked for this student yet — no biometric ID is linked.
                </div>
              )}
            </div>

            {/* Quiz Performance */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Quiz Performance</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ClickableStatCard
                  label="Days Attempted"
                  value={data.dailyQuiz.daysAttempted}
                  sub={`Of ${data.dailyQuiz.daysUploaded} days a quiz was uploaded`}
                  accent="#3b82f6"
                  icon={icons.calendar}
                  onClick={() => setActiveModal("quiz-present")}
                />
                <ClickableStatCard
                  label="Days Absent"
                  value={data.dailyQuiz.absentDays}
                  sub={`Quiz uploaded, none attempted${optionalNote(data.dailyQuiz.compulsory)}`}
                  accent="#ef4444"
                  icon={icons.cross}
                  onClick={() => setActiveModal("quiz-absent")}
                />
                <ClickableStatCard
                  label="Quizzes Attempted"
                  value={`${data.dailyQuiz.quizzesAttempted} / ${data.dailyQuiz.quizzesUploaded}`}
                  sub="Uploaded for the student's batch"
                  accent="#f97316"
                  icon={icons.doc}
                />
                <ClickableStatCard
                  label="Participation"
                  value={pct(data.dailyQuiz.attendancePercentage)}
                  sub={`${data.dailyQuiz.presentDays} present · ${data.dailyQuiz.absentDays} absent`}
                  accent={participationColor(data.dailyQuiz.attendancePercentage)}
                  icon={icons.chart}
                />
              </div>
            </div>

            {/* Mega Test */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Mega Test Performance</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ClickableStatCard
                  label="Exams Taken"
                  value={data.weeklyTest.evaluatedAttempts}
                  sub={
                    data.weeklyTest.notEvaluatedAttempts
                      ? `${data.weeklyTest.notEvaluatedAttempts} awaiting evaluation`
                      : "Evaluated mega tests"
                  }
                  accent="#f472b6"
                  icon={icons.doc}
                  onClick={() => setActiveModal("mega-exams")}
                />
                <ClickableStatCard
                  label="Marks Scored"
                  value={`${data.weeklyTest.totalObtained} / ${data.weeklyTest.totalPossible}`}
                  sub={`Overall ${pct(data.weeklyTest.overallPercentage)}`}
                  accent="#10b981"
                  icon={icons.chart}
                  onClick={() => setActiveModal("mega-exams")}
                />
                <ClickableStatCard
                  label="Average Score"
                  value={pct(data.weeklyTest.averagePercentage)}
                  sub={
                    data.weeklyTest.change === null
                      ? "Mean of all exams"
                      : `${data.weeklyTest.change >= 0 ? "Up" : "Down"} ${Math.abs(data.weeklyTest.change)} pts vs previous exam`
                  }
                  accent={scoreColor(data.weeklyTest.averagePercentage)}
                  icon={icons.chart}
                />
                <ClickableStatCard
                  label="Best Score"
                  value={pct(data.weeklyTest.highest?.percentage)}
                  sub={data.weeklyTest.highest?.examTitle ?? "No exam yet"}
                  accent="#a78bfa"
                  icon={icons.check}
                />
              </div>
            </div>

            {/* AI Mock Interviews */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">AI Mock Interview Performance</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ClickableStatCard
                  label="Total Attempts"
                  value={`${data.aiMockInterview.attemptsUsed} / ${data.aiMockInterview.attemptLimit}`}
                  sub={`${data.aiMockInterview.attemptsLeft} attempt${data.aiMockInterview.attemptsLeft === 1 ? "" : "s"} left`}
                  accent="#f97316"
                  icon={icons.people}
                />
                <ClickableStatCard
                  label="Days Attempted"
                  value={data.aiMockInterview.daysAttempted}
                  sub="Days with an interview"
                  accent="#10b981"
                  icon={icons.check}
                  onClick={() => setActiveModal("mock-present")}
                />
                <ClickableStatCard
                  label="Days Absent"
                  value={data.aiMockInterview.absentDays}
                  sub={`Working days with no interview${optionalNote(data.aiMockInterview.compulsory)}`}
                  accent="#ef4444"
                  icon={icons.cross}
                  onClick={() => setActiveModal("mock-absent")}
                />
                <ClickableStatCard
                  label="Participation"
                  value={pct(data.aiMockInterview.attendancePercentage)}
                  sub={`Of ${data.aiMockInterview.expectedDays} expected days`}
                  accent={participationColor(data.aiMockInterview.attendancePercentage)}
                  icon={icons.chart}
                />
              </div>
            </div>

            {/* AI HR Calling */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">AI HR Calling</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ClickableStatCard
                  label="Total Calls"
                  value={data.aiHrCalling.totalCalls}
                  sub={`Up to ${data.aiHrCalling.maxCallsPerDay} calls a day`}
                  accent="#3b82f6"
                  icon={icons.phone}
                  onClick={() => setActiveModal("ai-days")}
                />
                <ClickableStatCard
                  label="Picked Up"
                  value={data.aiHrCalling.callsPicked}
                  sub={`${data.aiHrCalling.presentDays} day${data.aiHrCalling.presentDays === 1 ? "" : "s"} answered`}
                  accent="#10b981"
                  icon={icons.check}
                />
                <ClickableStatCard
                  label="Not Answered"
                  value={data.aiHrCalling.callsDnp}
                  sub="Calls never picked up"
                  accent="#f59e0b"
                  icon={icons.cross}
                />
                <ClickableStatCard
                  label="Days Absent"
                  value={data.aiHrCalling.absentDays}
                  sub="Every call of the day missed"
                  accent="#ef4444"
                  icon={icons.cross}
                  onClick={() => setActiveModal("ai-absent")}
                />
              </div>
            </div>

            {/* HR Calls — green zone only */}
            {data.realHrCalling.applicable && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-white">HR Call Records</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ClickableStatCard
                    label="Total Calls"
                    value={data.realHrCalling.totalCalls}
                    sub="All logged calls"
                    accent="#3b82f6"
                    icon={icons.phone}
                    onClick={() => setActiveModal("real-days")}
                  />
                  <ClickableStatCard
                    label="Recorded"
                    value={data.realHrCalling.callsConnected}
                    sub="Calls with a recording"
                    accent="#10b981"
                    icon={icons.check}
                  />
                  <ClickableStatCard
                    label="Not Connected"
                    value={data.realHrCalling.callsNotConnected}
                    sub="DNP, invalid or out of service"
                    accent="#f59e0b"
                    icon={icons.clock}
                  />
                  <ClickableStatCard
                    label="Days Absent"
                    value={data.realHrCalling.absentDays}
                    sub="Called but never recorded"
                    accent="#ef4444"
                    icon={icons.cross}
                    onClick={() => setActiveModal("real-absent")}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-16 text-center backdrop-blur-sm">
            <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-4 text-slate-400">
              {!clerkId
                ? "Please select a student from the overview list"
                : "No data available"}
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={activeModal ? MODAL_TITLES[activeModal] : ""}
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
