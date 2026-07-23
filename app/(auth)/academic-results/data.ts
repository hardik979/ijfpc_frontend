// Data layer for the Academic Results dashboard:
//   • shared row/column types for all four tabs
//   • small formatting helpers
//   • typed API fetchers (all four sources live on the LMS backend)
//   • the useMonthDay hook that every tab uses to load month + day data
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_LMS_URL } from "@/lib/api";

/* ════════════════════════════ TYPES ════════════════════════════ */

export type TabKey = "quiz" | "mock" | "ai" | "realhr";

/* ----------------------------- Daily Quiz ----------------------------- */
export type QuizByDateRow = {
  date: string; // YYYY-MM-DD
  totalAttempts: number;
  evaluatedCount: number;
  pendingCount: number;
  uniqueStudentCount: number;
};

export type QuizAttemptRow = {
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

/** One row per unique student for a selected day, with their attempts + tallies. */
export type QuizStudentRow = {
  key: string;
  studentName: string;
  section: string | null;
  attempts: QuizAttemptRow[];
  total: number;
  evaluated: number;
  pending: number;
  bestPercentage: number;
  lastAttemptAt: string | null;
};

/* --------------------------- Mock Interview --------------------------- */
export type MockByDateRow = {
  date: string;
  totalAttempts: number;
  uniqueUserCount: number;
};

/**
 * Rich rubric pulled from structuredData.interview_evaluation. The shape varies
 * by interview track, so only a few fields are guaranteed; the rest (e.g.
 * `linux_score`, `sql_score`, `technical_correctness`) are read dynamically.
 */
export type MockEvaluationDetail = {
  summary?: string;
  verdict?: string;
  strengths?: string;
  readiness_percent?: number;
  meets_threshold?: boolean;
  [key: string]: unknown;
};

export type MockAttemptRow = {
  id: string;
  email: string | null;
  name: string | null;
  interviewType: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endedReason: string | null;
  evaluation: string | number | null;
  evaluationDetail: MockEvaluationDetail | null;
  completed: boolean;
  recordingUrl: string | null;
  summaryPreview: string;
  createdAt: string;
};

/**
 * Performance level for a mock interview, mirroring the daily report.
 * `unanalyzed` is a non-performance state: Vapi returned no report at all, so
 * the attempt can't be graded (it must never be shown as "Needs work").
 */
export type MockLevel = "strong" | "average" | "needs" | "unanalyzed";

export const MOCK_LEVEL_LABEL: Record<MockLevel, string> = {
  strong: "Strong",
  average: "Average",
  needs: "Needs work",
  unanalyzed: "Not analyzed",
};

/** One row per unique student for a selected day, with their interviews + tallies. */
export type MockStudentRow = {
  key: string;
  name: string | null;
  email: string | null;
  interviews: MockAttemptRow[];
  total: number;
  strong: number;
  average: number;
  needs: number;
  unanalyzed: number;
  lastAttemptAt: string | null;
};

/* --------------------------- AI HR Calling ---------------------------- */
export type AiCallingByDateRow = {
  date: string;
  totalCalls: number;
  uniqueCandidateCount: number;
  analyzedCount: number;
};

export type AiCallingRow = {
  id: string;
  candidateName: string | null;
  phone: string | null;
  clerkId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endReason: string | null;
  analysisStatus: string | null;
  analyzed: boolean;
  analysis: unknown | null;
  hasTranscript: boolean;
};

/** One row per unique candidate for a selected day, with their calls + tallies. */
export type AiStudentRow = {
  key: string;
  candidateName: string | null;
  phone: string | null;
  calls: AiCallingRow[];
  total: number;
  analyzed: number;
  notAnswered: number;
  pending: number;
  lastCallAt: string | null;
};

/**
 * A "Did Not Pick" (DNP) AI HR call: the candidate never answered, so the call
 * produced no conversation and will never be analyzed. Showing "Pending" for
 * these is misleading — it's a terminal state, not a queued one. Mirrors
 * isAiCallDnp in lms-backend services/reportPdf.js so the families stay in sync.
 */
export function isAiCallDnp(row: Pick<AiCallingRow, "endReason">): boolean {
  const reason = String(row.endReason || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .trim();
  return /\b(no answer|did ?n[o']?t answer|no pick ?up|not picked|unanswered|voicemail|busy|unreachable)\b/.test(
    reason
  );
}

/* ------------------- Real HR Calling (call recordings) ---------------- */
export type RealHrByDateRow = {
  date: string;
  totalCalls: number;
  recordedCount: number;
  manualCount: number;
  analyzedCount: number;
  uniqueLeadCount: number;
  totalDuration: number;
};

export type RealHrRow = {
  id: string;
  leadId: string;
  studentName: string;
  email: string | null;
  phone: string | null;
  agentId: string | null;
  type: string; // "recording" | "manual"
  manualStatus: string | null;
  durationSeconds: number;
  durationLabel: string | null;
  status: string | null; // UPLOADED…DONE/FAILED
  recordingUrl: string | null;
  analyzed: boolean;
  analysis: unknown | null;
  hasTranscript: boolean;
  createdAt: string;
};

/**
 * One row per unique lead/student for a selected day, with their calls + tallies.
 * `analyzed` + `pending` + `manual` partition `total` (each call counted once).
 */
export type RealHrStudentRow = {
  key: string;
  studentName: string;
  email: string | null;
  phone: string | null;
  calls: RealHrRow[];
  total: number;
  analyzed: number; // calls with an analysis
  pending: number; // recordings not yet analyzed
  manual: number; // manual log entries (no recording / analysis)
  lastCallAt: string | null;
};

/* ------------------------- Absent students ---------------------------- */
// An *expected* active student (zone-based, per the daily report) who did not
// participate on the selected day. Same shape for all four tabs.
export type AbsentRow = {
  id: string;
  studentName: string;
  email: string | null;
  zone: string | null;
};

export type AbsentResult = {
  students: AbsentRow[];
  /** Size of the expected roster for the tab (absent + attended). */
  expected: number;
};

/* ------------------------------ Courses ------------------------------- */
export type Course = {
  _id: string;
  title?: string;
  name?: string;
};

/* ══════════════════════════ FORMATTING ═════════════════════════ */

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

export function formatIST(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

/**
 * Build a CSV from headers + rows and trigger a browser download.
 * Values are escaped for commas/quotes/newlines, and a BOM is prepended so
 * Excel reads UTF-8 (e.g. names) correctly.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
  // Prepend a UTF-8 BOM so Excel detects the encoding (names render correctly).
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════ MOCK SCORING ══════════════════════ */
// Frontend port of the daily-report logic (lms-backend services/reportPdf.js):
// turn a mock interview's evaluation into a 0–100 score, then a Strong/Average/
// Needs-work level. successEvaluation is usually just a pass/fail flag
// ("true"/"false"), so most interviews resolve to Average (pass) or Needs work
// (fail); Strong only appears when a genuine numeric score ≥75 is present.

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function parseScoreFromAny(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const slash = val.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/);
  if (slash) {
    const n = parseFloat(slash[1]);
    const d = parseFloat(slash[2]);
    if (d > 0) return Math.round((n / d) * 100);
  }
  const m = val.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    // A bare number ≤10 is treated as an out-of-10 rating, e.g. "7" → 70.
    return n <= 10 ? Math.round(n * 10) : Math.round(n);
  }
  return null;
}

function scoreFromSummary(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = String(text);
  let m = t.match(
    /out of\s*(\d+)\s*questions?[^.]*?(\d+)\s*(?:were|was|are|got)?[^.]*?answered\s*correct/i
  );
  if (m && +m[1] > 0) return clampScore(Math.round((+m[2] / +m[1]) * 100));
  m = t.match(
    /(\d+)\s*(?:out of|\/)\s*(\d+)\s*(?:questions?\s*)?(?:were\s*)?(?:answered\s*)?correct/i
  );
  if (m && +m[2] > 0) return clampScore(Math.round((+m[1] / +m[2]) * 100));
  m = t.match(/answered\s*(?:about\s*)?(\d+)[^.]*?correct[^.]*?out of\s*(\d+)/i);
  if (m && +m[2] > 0) return clampScore(Math.round((+m[1] / +m[2]) * 100));
  return null;
}

function scoreFromPassFail(val: string | number | null | undefined): number | null {
  const s = String(val ?? "").trim().toLowerCase();
  if (["true", "pass", "passed", "yes", "success"].includes(s)) return 70;
  if (["false", "fail", "failed", "no"].includes(s)) return 30;
  return null;
}

/**
 * The literal placeholder the backend stores (lms-backend routes/ai.routes.js)
 * when Vapi's end-of-call report arrives with no analysis/summary. It's a
 * provider-side failure — not the student's fault — so the UI must never show
 * it as real feedback or treat it as a low score.
 */
export const NO_VAPI_SUMMARY = "No summary from Vapi";

/** True when `text` is a real, student-facing summary (not empty / not the placeholder). */
export function hasVapiSummary(text: string | null | undefined): boolean {
  const t = String(text ?? "").trim();
  return t.length > 0 && t.toLowerCase() !== NO_VAPI_SUMMARY.toLowerCase();
}

/** True when an evaluation rubric carries at least one usable field. */
function hasEvaluationDetail(
  d: MockEvaluationDetail | null | undefined
): boolean {
  if (!d) return false;
  return Object.values(d).some(
    (v) =>
      (typeof v === "number" && Number.isFinite(v)) ||
      typeof v === "boolean" ||
      (typeof v === "string" && v.trim().length > 0)
  );
}

/**
 * True when Vapi never produced any analysis for this attempt — no pass/fail
 * evaluation, no rubric, and no real summary. These attempts must NOT be scored
 * as "Needs work" (a 0 score): the student did nothing wrong, the provider
 * simply failed to return a report.
 */
export function isMockInterviewUnanalyzed(
  row: Pick<MockAttemptRow, "evaluation" | "summaryPreview" | "evaluationDetail">
): boolean {
  return (
    row.evaluation == null &&
    !hasEvaluationDetail(row.evaluationDetail) &&
    !hasVapiSummary(row.summaryPreview)
  );
}

/** 0–100 score for a mock interview (mirrors mockInterviewScore in reportPdf.js). */
export function mockInterviewScore(
  row: Pick<MockAttemptRow, "evaluation" | "summaryPreview" | "evaluationDetail">
): number {
  // Prefer the rubric's own readiness percentage when the record has one — it's
  // the real overall score, far better than the pass/fail fallback below.
  const readiness = row.evaluationDetail?.readiness_percent;
  if (typeof readiness === "number" && Number.isFinite(readiness)) {
    return clampScore(readiness);
  }
  const fromEval = parseScoreFromAny(row.evaluation);
  if (fromEval != null) return clampScore(fromEval);
  const fromText = scoreFromSummary(row.summaryPreview);
  if (fromText != null) return fromText;
  const fromPF = scoreFromPassFail(row.evaluation);
  if (fromPF != null) return fromPF;
  return 0;
}

/** Strong (≥75) / Average (≥50) / Needs work — same thresholds as the report. */
export function mockInterviewLevel(
  row: Pick<MockAttemptRow, "evaluation" | "summaryPreview" | "evaluationDetail">
): MockLevel {
  // Vapi never returned a report → not a performance level, can't be graded.
  if (isMockInterviewUnanalyzed(row)) return "unanalyzed";
  const s = mockInterviewScore(row);
  if (s >= 75) return "strong";
  if (s >= 50) return "average";
  return "needs";
}

/** Group a day's attempts into unique students, each with per-level tallies. */
export function groupMockByStudent(rows: MockAttemptRow[]): MockStudentRow[] {
  const map = new Map<string, MockStudentRow>();
  for (const r of rows) {
    const key = (r.email?.toLowerCase() || r.name || r.id || "unknown").trim();
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        name: r.name,
        email: r.email,
        interviews: [],
        total: 0,
        strong: 0,
        average: 0,
        needs: 0,
        unanalyzed: 0,
        lastAttemptAt: null,
      };
      map.set(key, g);
    }
    g.interviews.push(r);
    g.total += 1;
    g[mockInterviewLevel(r)] += 1;
    if (!g.name && r.name) g.name = r.name;
    if (!g.email && r.email) g.email = r.email;
    if (!g.lastAttemptAt || (r.createdAt && r.createdAt > g.lastAttemptAt)) {
      g.lastAttemptAt = r.createdAt;
    }
  }
  for (const g of map.values()) {
    // Newest interview first within each student.
    g.interviews.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
  // Students with the most interviews first.
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Group a day's quiz attempts into unique students, each with per-status tallies. */
export function groupQuizByStudent(rows: QuizAttemptRow[]): QuizStudentRow[] {
  const map = new Map<string, QuizStudentRow>();
  for (const r of rows) {
    const key = (r.userId || r.studentName || r.attemptId || "unknown").trim();
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        studentName: r.studentName,
        section: r.section,
        attempts: [],
        total: 0,
        evaluated: 0,
        pending: 0,
        bestPercentage: 0,
        lastAttemptAt: null,
      };
      map.set(key, g);
    }
    g.attempts.push(r);
    g.total += 1;
    if (r.isEvaluated) g.evaluated += 1;
    else g.pending += 1;
    if (r.percentage > g.bestPercentage) g.bestPercentage = r.percentage;
    if (!g.section && r.section) g.section = r.section;
    if (!g.lastAttemptAt || (r.attemptedAt && r.attemptedAt > g.lastAttemptAt)) {
      g.lastAttemptAt = r.attemptedAt;
    }
  }
  for (const g of map.values()) {
    // Newest attempt first within each student.
    g.attempts.sort((a, b) =>
      (b.attemptedAt ?? "").localeCompare(a.attemptedAt ?? "")
    );
  }
  // Students with the most attempts first.
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Group a day's AI HR calls into unique candidates, each with per-status tallies. */
export function groupAiByStudent(rows: AiCallingRow[]): AiStudentRow[] {
  const map = new Map<string, AiStudentRow>();
  for (const r of rows) {
    const key = (
      r.clerkId ||
      r.phone ||
      r.candidateName ||
      r.id ||
      "unknown"
    ).trim();
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        candidateName: r.candidateName,
        phone: r.phone,
        calls: [],
        total: 0,
        analyzed: 0,
        notAnswered: 0,
        pending: 0,
        lastCallAt: null,
      };
      map.set(key, g);
    }
    g.calls.push(r);
    g.total += 1;
    if (r.analyzed) g.analyzed += 1;
    else if (isAiCallDnp(r)) g.notAnswered += 1;
    else g.pending += 1;
    if (!g.candidateName && r.candidateName) g.candidateName = r.candidateName;
    if (!g.phone && r.phone) g.phone = r.phone;
    if (!g.lastCallAt || (r.startedAt && r.startedAt > g.lastCallAt)) {
      g.lastCallAt = r.startedAt;
    }
  }
  for (const g of map.values()) {
    // Newest call first within each candidate.
    g.calls.sort((a, b) =>
      (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
    );
  }
  // Candidates with the most calls first.
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Group a day's HR recordings into unique leads/students, each with per-status tallies. */
export function groupRealHrByStudent(rows: RealHrRow[]): RealHrStudentRow[] {
  const map = new Map<string, RealHrStudentRow>();
  for (const r of rows) {
    const key = (
      r.leadId ||
      r.email?.toLowerCase() ||
      r.phone ||
      r.studentName ||
      r.id ||
      "unknown"
    ).trim();
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        studentName: r.studentName,
        email: r.email,
        phone: r.phone,
        calls: [],
        total: 0,
        analyzed: 0,
        pending: 0,
        manual: 0,
        lastCallAt: null,
      };
      map.set(key, g);
    }
    g.calls.push(r);
    g.total += 1;
    // Clean partition of total: analyzed → pending recording → manual log.
    if (r.analyzed) g.analyzed += 1;
    else if (r.type === "manual") g.manual += 1;
    else g.pending += 1;
    if ((!g.studentName || g.studentName === "—") && r.studentName) {
      g.studentName = r.studentName;
    }
    if (!g.email && r.email) g.email = r.email;
    if (!g.phone && r.phone) g.phone = r.phone;
    if (!g.lastCallAt || (r.createdAt && r.createdAt > g.lastCallAt)) {
      g.lastCallAt = r.createdAt;
    }
  }
  for (const g of map.values()) {
    // Newest call first within each lead/student.
    g.calls.sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );
  }
  // Leads/students with the most calls first.
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/* ════════════════════════════ FETCHERS ═════════════════════════ */

const LMS = API_LMS_URL;

/* ----------------------------- Daily Quiz ----------------------------- */
export async function fetchQuizMonth(
  month: string,
  courseId?: string
): Promise<QuizByDateRow[]> {
  const { data } = await axios.get(
    `${LMS}/api/daily-quiz/students-results/by-date`,
    { params: { month, ...(courseId ? { courseId } : {}) } }
  );
  return data?.data ?? [];
}

export async function fetchQuizDay(
  date: string,
  courseId?: string
): Promise<QuizAttemptRow[]> {
  const { data } = await axios.get(`${LMS}/api/daily-quiz/quiz-result/table`, {
    params: { date, ...(courseId ? { courseId } : {}) },
  });
  return data?.attempts ?? [];
}

/**
 * Count of DISTINCT students who attempted at least once in the month (a student
 * who attempts on several days is counted once). Course-optional. Comes from the
 * same by-date endpoint's `distinctStudentCount`, so it stays in sync with the
 * calendar/chart data without summing per-day uniques (which is student-days).
 */
export async function fetchQuizMonthStudentCount(
  month: string,
  courseId?: string
): Promise<number> {
  const { data } = await axios.get(
    `${LMS}/api/daily-quiz/students-results/by-date`,
    { params: { month, ...(courseId ? { courseId } : {}) } }
  );
  return typeof data?.distinctStudentCount === "number" ? data.distinctStudentCount : 0;
}

/* --------------------------- Mock Interview --------------------------- */
export async function fetchMockMonth(
  month: string,
  courseId?: string
): Promise<MockByDateRow[]> {
  const { data } = await axios.get(
    `${LMS}/api/mocinterview-result/mockinterview-result/calendar`,
    { params: { month, ...(courseId ? { courseId } : {}) } }
  );
  return data?.data ?? [];
}

export async function fetchMockDay(
  date: string,
  courseId?: string
): Promise<MockAttemptRow[]> {
  const { data } = await axios.get(
    `${LMS}/api/mocinterview-result/get-result-table/by-date`,
    { params: { date, limit: 100, ...(courseId ? { courseId } : {}) } }
  );
  return data?.data?.attempts ?? [];
}

/* --------------------------- AI HR Calling ---------------------------- */
export async function fetchAiMonth(
  month: string,
  courseId?: string
): Promise<AiCallingByDateRow[]> {
  const { data } = await axios.get(
    `${LMS}/api/callingAgent/calling-data/calendar`,
    { params: { month, ...(courseId ? { courseId } : {}) } }
  );
  return data?.data ?? [];
}

export async function fetchAiDay(
  date: string,
  courseId?: string
): Promise<AiCallingRow[]> {
  const { data } = await axios.get(
    `${LMS}/api/callingAgent/calling-data/by-date`,
    { params: { date, ...(courseId ? { courseId } : {}) } }
  );
  return data?.attempts ?? [];
}

/* ------------------- Real HR Calling (call recordings) ---------------- */
export async function fetchRealHrMonth(
  month: string
): Promise<RealHrByDateRow[]> {
  const { data } = await axios.get(`${LMS}/api/recordings/calendar`, {
    params: { month },
  });
  return data?.data ?? [];
}

export async function fetchRealHrDay(date: string): Promise<RealHrRow[]> {
  const { data } = await axios.get(`${LMS}/api/recordings/by-date`, {
    params: { date },
  });
  return data?.attempts ?? [];
}

/* ------------------------------ Courses ------------------------------- */
export async function fetchCourses(): Promise<Course[]> {
  const { data } = await axios.get(`${LMS}/api/courses/list`);
  return Array.isArray(data) ? data : [];
}

/* -------------------------- Absent students --------------------------- */
// The absent roster is zone-based (mirrors the daily report) and therefore
// course-independent, so no courseId is sent.
export async function fetchAbsent(
  tab: TabKey,
  date: string
): Promise<AbsentResult> {
  const { data } = await axios.get(
    `${LMS}/api/academic-results/absent/${tab}`,
    { params: { date } }
  );
  return {
    students: data?.students ?? [],
    expected: typeof data?.expected === "number" ? data.expected : 0,
  };
}

/* ══════════════════════════ useMonthDay ════════════════════════ */

// A tab loads a monthly summary (calendar/chart data) and, when a date is
// clicked, the per-day rows for the table. Re-runs whenever `month` or any of
// the extra `deps` (e.g. courseId, refreshKey) change.
export function useMonthDay<MRow, DRow>(
  month: string,
  fetchMonth: (month: string) => Promise<MRow[]>,
  fetchDay: (date: string) => Promise<DRow[]>,
  deps: ReadonlyArray<unknown> = []
) {
  const [byDate, setByDate] = useState<MRow[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayRows, setDayRows] = useState<DRow[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  // Keep the latest fetchers in refs so the callbacks below capture current
  // closures (e.g. the live courseId) without changing identity every render.
  const fetchMonthRef = useRef(fetchMonth);
  fetchMonthRef.current = fetchMonth;
  const fetchDayRef = useRef(fetchDay);
  fetchDayRef.current = fetchDay;

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    try {
      setByDate(await fetchMonthRef.current(month));
    } catch (err) {
      console.error("[useMonthDay] month load failed", err);
      setByDate([]);
    } finally {
      setLoadingMonth(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, ...deps]);

  const loadDay = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setLoadingDay(true);
      try {
        setDayRows(await fetchDayRef.current(date));
      } catch (err) {
        console.error("[useMonthDay] day load failed", err);
        setDayRows([]);
      } finally {
        setLoadingDay(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps]
  );

  // Reload the month (and reset the day selection) whenever inputs change.
  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
    setDayRows([]);
  }, [loadMonth]);

  const clearDay = useCallback(() => {
    setSelectedDate(null);
    setDayRows([]);
  }, []);

  return {
    byDate,
    loadingMonth,
    selectedDate,
    dayRows,
    loadingDay,
    loadDay,
    clearDay,
  };
}

/* ══════════════════════════════ useAbsent ══════════════════════════════ */

// Loads the absent roster for a tab whenever a day is selected (or refreshed).
// Returns nothing until a date is picked. Eager so the toggle can show counts.
export function useAbsent(
  tab: TabKey,
  date: string | null,
  refreshKey: number
) {
  const [rows, setRows] = useState<AbsentRow[]>([]);
  const [expected, setExpected] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setRows([]);
      setExpected(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAbsent(tab, date)
      .then((res) => {
        if (cancelled) return;
        setRows(res.students);
        setExpected(res.expected);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useAbsent] load failed", err);
        setRows([]);
        setExpected(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, date, refreshKey]);

  return { rows, expected, loading };
}
