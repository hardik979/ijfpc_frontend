"use client";

import { decodeStudentRef } from "@/lib/studentRef";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import AcademicPerformance, { type AcademicData } from "./AcademicPerformance";
import { CallAnalysisPanel } from "@/app/(auth)/academic-results/callAnalysis";
import KpiDashboard from "./academic/KpiDashboard";
import type {
  AiCallDetail,
  AttendanceParticipation,
  DailyQuizParticipation,
  DrillDown,
  ParticipationData,
  QuizOptions,
  RealHrRecording,
} from "./academic/types";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ModalType = DrillDown | null;

const MODAL_TITLES: Record<Exclude<ModalType, null>, string> = {
  "att-present": "Days Present (punched in & out)",
  "att-absent": "Days Absent",
  "quiz-attempted": "Quizzes Attempted",
  "quiz-absent": "Missed Days · Uploaded Question Papers",
  "mega-exams": "Mega Test Results",
  "mock-present": "AI Mock Interviews · Feedback by Date",
  "ai-answered": "AI HR Calls · Days Answered",
  "ai-absent": "AI HR Calls · Days Not Answered",
  "real-uploaded": "HR Calls · Days With Recordings",
  "real-missing": "HR Calls · Days Without a Recording",
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

// ── date helpers (IST day keys, no timezone shifting) ───────────────────────────
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDaysKey(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Monday of the week a day falls in (weeks run Monday to Saturday; Sunday is never counted).
function weekStartKey(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  return addDaysKey(key, -((d.getUTCDay() + 6) % 7));
}

function formatWeekday(key: string) {
  return `${WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()]}, ${formatKey(key)}`;
}

function groupByWeek<T extends { date: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const start = weekStartKey(item.date);
    if (!map.has(start)) map.set(start, []);
    map.get(start)!.push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([start, list]) => ({
      start,
      end: addDaysKey(start, 5),
      items: list.sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

function formatClock(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

function formatWorked(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return "—";
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ── shared drill-down pieces ─────────────────────────────────────────────────────
function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-slate-400">{text}</p>;
}

function SummaryBar({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function OptionList({ options }: { options: QuizOptions | null }) {
  const entries = Object.entries(options ?? {}).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs text-slate-300">
      {entries.map(([k, v]) => (
        <li key={k}>
          <span className="font-semibold text-slate-200">{k}.</span> {v}
        </li>
      ))}
    </ul>
  );
}

// Light card: the shared call-analysis panel is designed for a white background.
function AnalysisBox({ analysis }: { analysis: unknown }) {
  if (!analysis) {
    return <p className="mt-3 text-xs text-slate-400">Analysis isn&apos;t available for this call yet.</p>;
  }
  return (
    <div className="mt-3 rounded-xl bg-white p-4 text-gray-900">
      <CallAnalysisPanel analysis={analysis} />
    </div>
  );
}

// Attendance, split Monday to Saturday week by week.
function AttendanceWeeks({
  days,
  status,
}: {
  days: AttendanceParticipation["days"];
  status: "present" | "absent";
}) {
  const weeks = groupByWeek(days.filter((d) => d.status === status));
  if (!weeks.length) return <Empty text={status === "present" ? "No days present" : "No days absent"} />;

  return (
    <div className="space-y-5">
      {weeks.map((week) => (
        <div key={week.start}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              Week · {formatKey(week.start)} – {formatKey(week.end)}
            </p>
            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
              {plural(week.items.length, "day")} {status} of 6
            </span>
          </div>
          <div className="space-y-2">
            {week.items.map((d) => (
              <DayRow
                key={d.date}
                left={formatWeekday(d.date)}
                tone={status === "present" ? "good" : "bad"}
                badge={status === "present" ? "Present" : REASON_LABELS[d.reason ?? ""] ?? "Absent"}
                right={
                  <span>
                    In {d.inTime ?? "—"} · Out {d.outTime ?? "—"}
                    {status === "present" ? ` · ${formatWorked(d.workedMinutes)}` : ""}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Every quiz the student attempted, with their answers, marks and the total score.
function QuizAttemptedList({ quiz }: { quiz: DailyQuizParticipation }) {
  const items = [...quiz.attemptedQuizzes].reverse();
  if (!items.length) return <Empty text="No quizzes attempted" />;

  return (
    <div>
      <SummaryBar
        items={[
          { label: "Total score", value: `${quiz.scoreObtained} / ${quiz.scorePossible}` },
          { label: "Percentage", value: pct(quiz.scorePercentage) },
          { label: "Quizzes", value: quiz.attemptedQuizzes.length },
          { label: "Days", value: quiz.daysAttempted },
        ]}
      />
      <div className="space-y-3">
        {items.map((item) => {
          const color = scoreColor(item.percentage);
          return (
            <details key={item.quizId} className="rounded-lg border border-slate-700 bg-slate-800/50">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="font-semibold text-white">{item.title ?? "Quiz"}</span>
                  {item.category && (
                    <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-200">
                      {item.category}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-slate-400">{formatKey(item.date)}</span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="text-white">
                    {item.totalMarksObtained} / {item.totalMarksPossible}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color, background: `${color}22` }}>
                    {item.isEvaluated ? pct(item.percentage) : "Not evaluated"}
                  </span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-slate-700 p-4">
                {item.questions.length === 0 && <Empty text="Question paper unavailable" />}
                {item.questions.map((q, i) => (
                  <div key={i} className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-white">
                        Q{i + 1}. {q.question}
                      </p>
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-200">
                        {q.marksObtained ?? "—"} / {q.marks ?? "—"}
                      </span>
                    </div>
                    <OptionList options={q.options} />
                    <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-400">Student answer</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-200">{q.studentAnswer ?? "Not answered"}</p>
                    {q.correctAnswer && (
                      <p className="mt-1 text-xs text-emerald-300">Correct answer: {q.correctAnswer}</p>
                    )}
                    {q.remark && <p className="mt-1 text-xs text-amber-200">Feedback: {q.remark}</p>}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// Question paper of every quiz that was uploaded on a day the student attempted nothing.
function QuizAbsentList({ quiz }: { quiz: DailyQuizParticipation }) {
  const days = [...quiz.absentQuizzes].reverse();
  if (!days.length) return <Empty text="No missed quiz days" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        {plural(days.length, "day")} with a quiz uploaded and nothing attempted · Sundays are never counted
      </p>
      {days.map((day) => (
        <details key={day.date} className="rounded-lg border border-rose-500/30 bg-rose-500/5">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="font-semibold text-white">{formatWeekday(day.date)}</span>
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300">
              {plural(day.quizzes.length, "quiz")} missed
            </span>
          </summary>
          <div className="space-y-4 border-t border-slate-700 p-4">
            {day.quizzes.map((q) => (
              <div key={q.quizId}>
                <p className="mb-2 text-sm font-semibold text-white">
                  {q.title ?? "Quiz"}
                  {q.category && (
                    <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-200">
                      {q.category}
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  {q.questions.map((question, i) => (
                    <div key={i} className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-white">
                          Q{i + 1}. {question.question}
                        </p>
                        <span className="whitespace-nowrap text-xs text-slate-300">{question.marks ?? "—"} marks</span>
                      </div>
                      <OptionList options={question.options} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function groupCallsByDay<T extends { date: string }>(calls: T[]) {
  const map = new Map<string, T[]>();
  for (const call of calls) {
    if (!map.has(call.date)) map.set(call.date, []);
    map.get(call.date)!.push(call);
  }
  return map;
}

// AI HR calls the student picked up, day by day, each with its analysis.
function AiAnsweredList({ ai }: { ai: ParticipationData["aiHrCalling"] }) {
  const byDay = groupCallsByDay(ai.callDetails);
  const days = ai.days.filter((d) => d.picked).reverse();
  if (!days.length) return <Empty text="No answered AI HR calls" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        {plural(days.length, "day")} answered · {ai.callsPicked} calls picked up · {ai.callsDnp} not answered
      </p>
      {days.map((day) => {
        const calls = byDay.get(day.date) ?? [];
        const answered = calls.filter((c: AiCallDetail) => !c.dnp);
        const missed = calls.length - answered.length;
        return (
          <details key={day.date} className="rounded-lg border border-slate-700 bg-slate-800/50">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="font-semibold text-white">{formatWeekday(day.date)}</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-300">
                  {plural(answered.length, "call")} answered
                </span>
                {missed > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 font-semibold text-amber-300">
                    {missed} missed
                  </span>
                )}
              </span>
            </summary>
            <div className="space-y-4 border-t border-slate-700 p-4">
              {answered.map((call, i) => {
                const score = (call.analysis as { scoreOutOf10?: number } | null)?.scoreOutOf10;
                return (
                  <div key={call.id}>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                      <span className="font-semibold text-white">Call {i + 1}</span>
                      <span>{formatClock(call.startedAt)}</span>
                      <span>· {formatDuration(call.durationSeconds)}</span>
                      {typeof score === "number" && (
                        <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                          AI score {score}/10
                        </span>
                      )}
                    </p>
                    {call.recordingUrl && <audio controls preload="none" src={call.recordingUrl} className="mt-2 w-full" />}
                    <AnalysisBox analysis={call.analysis} />
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// Days every AI HR call was missed, with the DNP calls grouped under each day.
function AiAbsentList({ ai }: { ai: ParticipationData["aiHrCalling"] }) {
  const byDay = groupCallsByDay(ai.callDetails);
  const days = ai.days.filter((d) => !d.picked && !d.pending).reverse();
  if (!days.length) return <Empty text="No days with every call missed" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        {plural(days.length, "day")} where every call was missed · {days.reduce((n, d) => n + d.calls, 0)} DNP calls in total
      </p>
      {days.map((day) => {
        const calls = byDay.get(day.date) ?? [];
        return (
          <div key={day.date} className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-white">{formatWeekday(day.date)}</p>
              <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300">
                {plural(day.calls, "DNP call")}
              </span>
            </div>
            {calls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {calls.map((call, i) => (
                  <span key={call.id} className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300">
                    #{i + 1} · {formatClock(call.startedAt)}
                    {call.endReason ? ` · ${call.endReason.replace(/[_-]+/g, " ")}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AI mock interviews: every interview grouped by date, with all of its feedback ─────
const RUBRIC_SCORES = [
  "technical_correctness",
  "troubleshooting_depth",
  "communication_structure",
  "confidence_delivery",
  "behavioral_fit",
];
const prettyKey = (k: string) => k.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// One rubric dimension scored out of 5, drawn as five segments.
function ScoreMeter({ label, value }: { label: string; value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  const tone = filled >= 4 ? "bg-emerald-400" : filled === 3 ? "bg-sky-400" : filled === 2 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold tabular-nums text-white">{value} / 5</span>
      </div>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= filled ? tone : "bg-slate-700"}`} />
        ))}
      </div>
    </div>
  );
}

// The interview_evaluation rubric. Known scores get meters; every other field the
// evaluation carries (strengths, verdict, weaknesses...) is shown too, so nothing is dropped.
function MockEvaluation({ evaluation, summary }: { evaluation: Record<string, unknown>; summary: string | null }) {
  const scores = Object.entries(evaluation).filter(
    ([k, v]) => typeof v === "number" && (RUBRIC_SCORES.includes(k) || k.endsWith("_score"))
  ) as [string, number][];
  const handled = new Set(["readiness_percent", "meets_threshold", ...scores.map(([k]) => k)]);

  const readiness = typeof evaluation.readiness_percent === "number" ? evaluation.readiness_percent : null;
  const meets = typeof evaluation.meets_threshold === "boolean" ? evaluation.meets_threshold : null;

  const extras = Object.entries(evaluation).filter(([k, v]) => {
    if (handled.has(k) || v === null || v === undefined || v === "") return false;
    // the rubric's own summary is the same text as the feedback summary above it
    if (k === "summary" && typeof v === "string" && v.trim() === (summary ?? "").trim()) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {(readiness !== null || meets !== null) && (
        <div className="flex flex-wrap items-center gap-2">
          {readiness !== null && (
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/30">
              Interview readiness {readiness}%
            </span>
          )}
          {meets !== null && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                meets
                  ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 ring-amber-500/30"
              }`}
            >
              {meets ? "Meets the threshold" : "Below the threshold"}
            </span>
          )}
        </div>
      )}

      {scores.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map(([k, v]) => (
            <ScoreMeter key={k} label={prettyKey(k.replace(/_score$/, ""))} value={v} />
          ))}
        </div>
      )}

      {extras.map(([k, v]) => (
        <div key={k}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{prettyKey(k)}</p>
          {Array.isArray(v) ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-200">
              {v.map((item, i) => (
                <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MockInterviewList({ mock }: { mock: ParticipationData["aiMockInterview"] }) {
  const byDay = groupCallsByDay(mock.interviews);
  const days = [...byDay.keys()].sort().reverse();
  if (!days.length) return <Empty text="No AI mock interviews in this period" />;

  return (
    <div className="space-y-6">
      <SummaryBar
        items={[
          { label: "Interviews", value: mock.interviews.length },
          { label: "Days", value: days.length },
          { label: "Attempts used", value: `${mock.attemptsUsed} / ${mock.attemptLimit}` },
          { label: "Attempts left", value: mock.attemptsLeft },
        ]}
      />
      {days.map((day) => {
        const list = byDay.get(day) ?? [];
        return (
          <div key={day}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{formatWeekday(day)}</p>
              <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
                {plural(list.length, "interview")}
              </span>
            </div>
            <div className="space-y-3">
              {list.map((item, i) => {
                const tone = !item.analyzed
                  ? "bg-slate-600/40 text-slate-300"
                  : item.status === "PASS"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300";
                return (
                  <details
                    key={item.id}
                    open={day === days[0] && i === 0}
                    className="rounded-lg border border-slate-700 bg-slate-800/50"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-white">Interview {i + 1}</span>
                        <span className="text-slate-300">{formatClock(item.startedAt)}</span>
                        <span className="text-slate-400">· {formatDuration(item.durationSeconds)}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        {item.score && (
                          <span className="rounded-full bg-violet-500/20 px-2.5 py-1 font-semibold text-violet-300">
                            {item.score.correctAnswers !== null && item.score.totalQuestions !== null
                              ? `${item.score.correctAnswers}/${item.score.totalQuestions} · `
                              : ""}
                            {item.score.percentage}%
                          </span>
                        )}
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${tone}`}>
                          {item.analyzed ? item.status : "Not analyzed"}
                        </span>
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-slate-700 p-4">
                      {item.analyzed ? (
                        <>
                          {item.summary && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Feedback summary</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{item.summary}</p>
                            </div>
                          )}
                          {item.evaluation && <MockEvaluation evaluation={item.evaluation} summary={item.summary} />}
                        </>
                      ) : (
                        <p className="text-sm leading-relaxed text-slate-300">
                          The interview system couldn&apos;t generate a report for this attempt — a technical issue on the
                          provider&apos;s side. It doesn&apos;t count against the student or mean they failed.
                        </p>
                      )}
                      {item.recordingUrl && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recording</p>
                          <audio controls preload="none" src={item.recordingUrl} className="w-full" />
                        </div>
                      )}
                      {item.endedReason && (
                        <p className="text-xs text-slate-400">Ended: {item.endedReason.replace(/[-_.]+/g, " ")}</p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Real HR recordings, day by day, each with its analysis.
function RealUploadedList({ real }: { real: Extract<ParticipationData["realHrCalling"], { applicable: true }> }) {
  const byDay = groupCallsByDay(real.recordings);
  const days = real.days.filter((d) => d.picked).reverse();
  if (!days.length) return <Empty text="No recordings uploaded" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        {plural(days.length, "day")} with a recording · {real.callsConnected} recordings in total
      </p>
      {days.map((day) => {
        const recordings = (byDay.get(day.date) ?? []).filter((r: RealHrRecording) => r.type === "recording");
        return (
          <details key={day.date} className="rounded-lg border border-slate-700 bg-slate-800/50">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
              <span className="font-semibold text-white">{formatWeekday(day.date)}</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                {plural(recordings.length, "recording")}
              </span>
            </summary>
            <div className="space-y-4 border-t border-slate-700 p-4">
              {recordings.map((rec, i) => {
                const outcome = (rec.analysis as { outcome?: string } | null)?.outcome;
                return (
                  <div key={rec.id}>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                      <span className="font-semibold text-white">Recording {i + 1}</span>
                      <span>{formatClock(rec.time)}</span>
                      <span>· {rec.durationLabel ?? formatDuration(rec.durationSeconds)}</span>
                      {outcome && (
                        <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
                          {String(outcome).replace(/_/g, " ")}
                        </span>
                      )}
                    </p>
                    {rec.publicUrl && <audio controls preload="none" src={rec.publicUrl} className="mt-2 w-full" />}
                    <AnalysisBox analysis={rec.analysis} />
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// Days HR called but no recording was uploaded (DNP, invalid number, out of service...).
function RealMissingList({ real }: { real: Extract<ParticipationData["realHrCalling"], { applicable: true }> }) {
  const byDay = groupCallsByDay(real.recordings);
  const days = real.days.filter((d) => !d.picked && !d.pending).reverse();
  if (!days.length) return <Empty text="No days without a recording" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{plural(days.length, "day")} with no recording uploaded</p>
      {days.map((day) => (
        <div key={day.date} className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-white">{formatWeekday(day.date)}</p>
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300">
              {REASON_LABELS[day.reason ?? ""] ?? "Not connected"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(byDay.get(day.date) ?? []).map((rec, i) => (
              <span key={rec.id} className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300">
                #{i + 1} · {formatClock(rec.time)}
                {rec.manualStatus ? ` · ${REASON_LABELS[rec.manualStatus] ?? rec.manualStatus}` : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
    const real = data.realHrCalling;
    const mega = data.weeklyTest;

    switch (activeModal) {
      case "att-present":
        return <AttendanceWeeks days={data.attendance.days} status="present" />;
      case "att-absent":
        return <AttendanceWeeks days={data.attendance.days} status="absent" />;

      case "quiz-attempted":
        return <QuizAttemptedList quiz={data.dailyQuiz} />;
      case "quiz-absent":
        return <QuizAbsentList quiz={data.dailyQuiz} />;

      case "mock-present":
        return <MockInterviewList mock={data.aiMockInterview} />;

      case "ai-answered":
        return <AiAnsweredList ai={data.aiHrCalling} />;
      case "ai-absent":
        return <AiAbsentList ai={data.aiHrCalling} />;

      case "real-uploaded":
        return real.applicable ? <RealUploadedList real={real} /> : null;
      case "real-missing":
        return real.applicable ? <RealMissingList real={real} /> : null;

      case "mega-exams": {
        const exams = [...mega.exams].reverse();
        if (exams.length === 0) {
          return <Empty text="No evaluated mega tests found" />;
        }
        return (
          <div className="space-y-3">
            <SummaryBar
              items={[
                { label: "Exams", value: mega.evaluatedAttempts },
                { label: "Total marks", value: `${mega.totalObtained} / ${mega.totalPossible}` },
                { label: "Overall", value: pct(mega.overallPercentage) },
                { label: "Average", value: pct(mega.averagePercentage) },
              ]}
            />
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
                  <div className="space-y-3 border-t border-slate-700 p-4 text-sm text-slate-200">
                    <p className="text-xs text-slate-400">
                      {exam.questionsFullMarks} full marks · {exam.questionsPartial} partial · {exam.questionsZero} zero ({exam.questionsTotal} questions)
                    </p>
                    {exam.overallFeedback && (
                      <p className="whitespace-pre-wrap rounded-md bg-slate-900/60 p-3">{exam.overallFeedback}</p>
                    )}
                    {exam.questionWiseResult.map((q, i) => (
                      <div key={i} className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-white">
                            Q{q.questionNo ?? i + 1}. {q.question ?? "—"}
                          </p>
                          <span className="whitespace-nowrap text-xs font-semibold text-slate-200">
                            {q.marksAwarded ?? "—"} / {q.maxMarks ?? "—"}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-400">Student answer</p>
                        <p className="whitespace-pre-wrap text-sm text-slate-200">{q.studentAnswer || "Not answered"}</p>
                        {q.feedback && <p className="mt-1 text-xs text-amber-200">Feedback: {q.feedback}</p>}
                      </div>
                    ))}
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-4">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              title="Back"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-white transition hover:bg-slate-700"
            >
              <Undo2 className="h-5 w-5" />
            </button>
            <div>
              <h1 className="mb-1 text-4xl font-bold tracking-tight text-white">
                Student Dashboard
              </h1>
              <p className="text-slate-400">
                {applied
                  ? `Performance overview for ${MONTHS[applied.month - 1]} ${applied.year}`
                  : "Complete academic performance overview"}
              </p>
            </div>
            {/* Filters: sit on the same row as the title, pushed to the right (wraps below on narrow screens) */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 backdrop-blur-sm lg:ml-auto">
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
              {/* <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
              </div> */}
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

            <KpiDashboard data={data} onOpen={setActiveModal} />
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
