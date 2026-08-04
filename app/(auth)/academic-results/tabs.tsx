"use client";

// The four Academic Results tabs. They share the same shape: stat cards, a
// calendar + monthly chart, a per-day table of *unique students*, and a
// two-level drill-down (student → their records → one record's detail) — all
// driven by the useMonthDay hook. Kept in one file so the pattern is easy to
// compare. Every table is numbered 1, 2, 3… via the shared serial column.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, Users } from "lucide-react";
import DataPresentationTable from "@/healper/DataPresentationTable";
import {
  useMonthDay,
  useExpectedRoster,
  pct,
  pctLabel,
  countLabel,
  formatDuration,
  formatIST,
  downloadCsv,
  groupQuizByStudent,
  groupMockByStudent,
  groupAiByStudent,
  groupRealHrByStudent,
  mockInterviewLevel,
  isAiCallDnp,
  fetchQuizMonth,
  fetchQuizDay,
  fetchQuizMonthStudentCount,
  fetchMockMonth,
  fetchMockDay,
  fetchAiMonth,
  fetchAiDay,
  fetchRealHrMonth,
  fetchRealHrDay,
  fetchMockInterviewCompleted,
  JOB_READY_BOOTCAMP_COURSE_ID,
  type QuizByDateRow,
  type QuizAttemptRow,
  type QuizStudentRow,
  type MockByDateRow,
  type MockAttemptRow,
  type MockStudentRow,
  type MockCompletedRow,
  type AiCallingByDateRow,
  type AiCallingRow,
  type AiStudentRow,
  type RealHrByDateRow,
  type RealHrRow,
  type RealHrStudentRow,
} from "./data";
import {
  quizStudentColumns,
  mockStudentColumns,
  mockLevelBadge,
  mockCompletedColumns,
  aiStudentColumns,
  realHrStudentColumns,
} from "./columns";
import { MockEvaluationPanel } from "./mockEvaluation";
import { CallAnalysisPanel } from "./callAnalysis";
import {
  StatCards,
  MonthlyChart,
  ResultsCalendar,
  AttendancePanel,
  DrillDownModal,
  DetailRow,
  type StatItem,
} from "./ui";

/* ═══════════════════════ shared drill-down pieces ══════════════════════ */

// A numbered, clickable row used in every drill-down record list (level 2):
// a 1,2,3… badge on the left, caller-supplied content in the middle, and a
// chevron on the right hinting at the detail view.
function RecordButton({
  index,
  onClick,
  children,
}: {
  index: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-extrabold text-slate-900 ring-1 ring-indigo-300">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        {children}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

// "← Back to …" link shown at the top of a record's detail (level 3), returning
// to that student's record list (level 2).
function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

const pill = (text: string, cls: string) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
  >
    {text}
  </span>
);

const pctClass = (p: number) =>
  p >= 75 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600";

/* ═════════════════════ shared percentage helpers ═══════════════════════ */
// Every headline figure on these tabs is a rate, with the underlying counts
// kept as the small sub-line so it stays checkable. Participation rates divide
// by the tab's expected roster; status rates divide by the records in the same
// window — see the "Percentages" block in data.ts for why the two never mix.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The roster card each tab opens with — the 100% everything else is a share of. */
const assignedCard = (expected: number, noun: string): StatItem => ({
  label: "Assigned",
  value: pctLabel(expected, expected),
  sub: expected > 0 ? `${plural(expected, noun)} expected` : "roster unavailable",
  accent: "blue",
});

type DayRowLike = Record<string, unknown>;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * A calendar-cell figure as a percentage. Falls back to the raw count when the
 * denominator is missing (roster fetch failed, or a day with no records), so a
 * cell degrades to the old display instead of showing "—" all month.
 */
const cellRate =
  (part: (r: DayRowLike) => number, whole: (r: DayRowLike) => number) =>
  (r: DayRowLike) => {
    const w = whole(r);
    return w > 0 ? pctLabel(part(r), w) : String(part(r));
  };

// Per-call status pills for the drill-down call lists.
function aiCallStatusBadge(c: AiCallingRow) {
  if (c.analyzed) return pill("Analyzed", "bg-green-50 text-green-700");
  if (isAiCallDnp(c)) return pill("Not Answered", "bg-slate-100 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300");
  return pill(c.analysisStatus ?? "Pending", "bg-amber-50 text-amber-700");
}

function realHrCallStatusBadge(c: RealHrRow) {
  if (c.analyzed) return pill("Analyzed", "bg-green-50 text-green-700");
  if (c.type === "manual")
    return pill(c.manualStatus ?? "Manual", "bg-slate-100 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300");
  if ((c.status ?? "").toUpperCase() === "FAILED")
    return pill("Failed", "bg-rose-50 text-rose-700 dark:bg-rose-500/15");
  return pill(c.status ?? "Pending", "bg-amber-50 text-amber-700");
}

/* ═══════════════════════════ Daily Quiz ════════════════════════ */
export function DailyQuizTab({
  month,
  courseId,
  refreshKey,
  onMonthChange,
}: {
  month: string;
  courseId: string;
  refreshKey: number;
  onMonthChange: (m: string) => void;
}) {
  const course = courseId || undefined;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<QuizByDateRow, QuizAttemptRow>(
      month,
      (m) => fetchQuizMonth(m, course),
      (d) => fetchQuizDay(d, course),
      [courseId, refreshKey]
    );

  // Drill-down state: a student (level 2) and, within them, one attempt (level 3).
  const [student, setStudent] = useState<QuizStudentRow | null>(null);
  const [selected, setSelected] = useState<QuizAttemptRow | null>(null);

  // Distinct students who attempted at least once this month (counted once even
  // if they attempted on several days). Loaded alongside the month summary.
  const [monthStudentCount, setMonthStudentCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchQuizMonthStudentCount(month, course)
      .then((n) => !cancelled && setMonthStudentCount(n))
      .catch(() => !cancelled && setMonthStudentCount(0));
    return () => {
      cancelled = true;
    };
  }, [month, courseId, refreshKey]);

  // Students the quiz is assigned to — the denominator for every participation
  // percentage on this tab. Narrowed by the course filter, so the rate always
  // compares like with like.
  const { expected } = useExpectedRoster("quiz", month, refreshKey, course);
  const hasRoster = expected > 0;

  // Unique students for the selected day, with per-status tallies.
  const students = useMemo(() => groupQuizByStudent(dayRows), [dayRows]);

  const dayStats = useMemo(
    () =>
      students.reduce(
        (acc, g) => {
          acc.evaluated += g.evaluated;
          acc.pending += g.pending;
          return acc;
        },
        { evaluated: 0, pending: 0 }
      ),
    [students]
  );

  const monthTotals = useMemo(
    () =>
      byDate.reduce(
        (acc, r) => {
          acc.totalAttempts += r.totalAttempts;
          acc.evaluatedCount += r.evaluatedCount;
          acc.pendingCount += r.pendingCount;
          acc.uniqueStudentCount += r.uniqueStudentCount;
          return acc;
        },
        { totalAttempts: 0, evaluatedCount: 0, pendingCount: 0, uniqueStudentCount: 0 }
      ),
    [byDate]
  );

  // Daily attendance as a share of the roster, for the monthly chart.
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => ({
        ...r,
        rate: pct(r.uniqueStudentCount, expected) ?? 0,
      })),
    [byDate, expected]
  );

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          items={[
            assignedCard(expected, "student"),
            {
              label: "Attempted",
              value: pctLabel(students.length, expected),
              sub: countLabel(students.length, expected, "student"),
              accent: "violet",
            },
            {
              // Status is a property of an attempt, so these are shares of the
              // day's attempts — not of the class.
              label: "Evaluated",
              value: pctLabel(dayStats.evaluated, dayRows.length),
              sub: countLabel(dayStats.evaluated, dayRows.length, "attempt"),
              accent: "emerald",
            },
            {
              label: "Pending",
              value: pctLabel(dayStats.pending, dayRows.length),
              sub: countLabel(dayStats.pending, dayRows.length, "attempt"),
              accent: "amber",
            },
          ]}
        />
      ) : (
        <StatCards
          columns={5}
          items={[
            assignedCard(expected, "student"),
            {
              // Distinct students who attempted at least once this month.
              label: "Students Attempted",
              value: pctLabel(monthStudentCount, expected),
              sub: countLabel(monthStudentCount, expected, "student"),
              accent: "violet",
            },
            {
              label: "Evaluated",
              value: pctLabel(monthTotals.evaluatedCount, monthTotals.totalAttempts),
              sub: countLabel(
                monthTotals.evaluatedCount,
                monthTotals.totalAttempts,
                "attempt"
              ),
              accent: "emerald",
            },
            {
              label: "Pending",
              value: pctLabel(monthTotals.pendingCount, monthTotals.totalAttempts),
              sub: countLabel(
                monthTotals.pendingCount,
                monthTotals.totalAttempts,
                "attempt"
              ),
              accent: "amber",
            },
            {
              // Student-days ÷ (roster × days the quiz actually ran): the share
              // of the class that turned up on a typical active day.
              label: "Avg Daily Attendance",
              value: pctLabel(monthTotals.uniqueStudentCount, expected * byDate.length),
              sub: `${monthTotals.uniqueStudentCount} student-days · ${plural(
                byDate.length,
                "active day"
              )}`,
              accent: "slate",
            },
          ]}
        />
      )}

      <div className="space-y-4">
        <MonthlyChart
          title={
            hasRoster
              ? "Percentage of students who attempted, per day"
              : "Number of students per day"
          }
          yLabel={hasRoster ? "% of students" : "Number of students"}
          month={month}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
          percentBase={expected}
          series={[
            hasRoster
              ? {
                  key: "rate",
                  name: "Students attempted",
                  color: "#3b82f6",
                  countKey: "uniqueStudentCount",
                }
              : {
                  key: "uniqueStudentCount",
                  name: "Number of students",
                  color: "#3b82f6",
                },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            {
              key: "uniqueStudentCount",
              label: "Students",
              className: "text-blue-700",
              display: cellRate(
                (r) => num(r.uniqueStudentCount),
                () => expected
              ),
            },
            {
              key: "evaluatedCount",
              label: "Evaluated",
              className: "text-emerald-800",
              display: cellRate(
                (r) => num(r.evaluatedCount),
                (r) => num(r.totalAttempts)
              ),
            },
            {
              key: "pendingCount",
              label: "Pending",
              className: "text-amber-700",
              display: cellRate(
                (r) => num(r.pendingCount),
                (r) => num(r.totalAttempts)
              ),
            },
          ]}
        />
      </div>

      <AttendancePanel
        tab="quiz"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        title={selectedDate ? `Students on ${selectedDate}` : "Quiz attempts"}
        attendedSubtitle={
          selectedDate
            ? `${pctLabel(students.length, expected)} attended · ${countLabel(
                students.length,
                expected,
                "student"
              )} · ${plural(dayRows.length, "attempt")}`
            : undefined
        }
        attendedCount={students.length}
        courseId={course}
      >
        <DataPresentationTable<QuizStudentRow>
          data={students}
          columns={quizStudentColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="key"
          stickyHeader
          onRowClick={(r) => {
            setStudent(r);
            setSelected(null);
          }}
          emptyMessage="No quiz attempts for this date"
        />
      </AttendancePanel>

      {/* Two-level drill-down: a student's attempts → one attempt's details. */}
      <DrillDownModal
        open={!!student}
        title={student?.studentName ?? "Student"}
        subtitle={
          selected
            ? selected.quizTitle ?? undefined
            : student
            ? `${student.total} attempt${student.total === 1 ? "" : "s"}${selectedDate ? ` on ${selectedDate}` : ""}`
            : undefined
        }
        onClose={closeStudent}
      >
        {student && !selected && (
          <div className="space-y-2">
            {student.attempts.map((a, i) => (
              <RecordButton key={a.attemptId} index={i} onClick={() => setSelected(a)}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {a.quizTitle ?? "Quiz attempt"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatIST(a.attemptedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`text-sm font-semibold ${pctClass(a.percentage)}`}>
                    {a.percentage}%
                  </span>
                  {a.isEvaluated
                    ? pill("Evaluated", "bg-green-50 text-green-700")
                    : pill("Pending", "bg-amber-50 text-amber-700")}
                </div>
              </RecordButton>
            ))}
          </div>
        )}

        {student && selected && (
          <div className="space-y-4">
            <BackButton label="Back to attempts" onClick={() => setSelected(null)} />
            <div>
              <DetailRow label="Student" value={selected.studentName} />
              <DetailRow label="Quiz" value={selected.quizTitle ?? "—"} />
              <DetailRow label="Section" value={selected.section ?? "—"} />
              <DetailRow
                label="Marks"
                value={`${selected.totalMarksObtained} / ${selected.totalMarksPossible}`}
              />
              <DetailRow label="Percentage" value={`${selected.percentage}%`} />
              <DetailRow
                label="Status"
                value={selected.isEvaluated ? "Evaluated" : "Pending"}
              />
              <DetailRow label="Attempted At" value={formatIST(selected.attemptedAt)} />
            </div>
          </div>
        )}
      </DrillDownModal>
    </div>
  );
}

/**
 * Standing roster (not date-scoped): students who've used all 7 of their AI
 * mock-interview attempts. Self-contained (own fetch + modal) so it can sit
 * next to the TabBar as a persistent action, instead of floating inside the
 * Mock Interview tab's day/month content.
 */
export function MockCompletedButton({ refreshKey }: { refreshKey: number }) {
  const [completed, setCompleted] = useState<MockCompletedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMockInterviewCompleted()
      .then((rows) => !cancelled && setCompleted(rows))
      .catch(() => !cancelled && setCompleted([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--panel-border-strong)] bg-[var(--panel-card)] px-3 py-1.5 text-sm font-medium text-[var(--panel-text-primary)] shadow-sm transition hover:bg-[var(--panel-card)]"
      >
        <Users className="h-4 w-4" />
        Completed 7 Interviews
        <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-bold text-white">
          {completed.length}
        </span>
      </button>

      <DrillDownModal
        open={open}
        title="Completed 7 Mock Interviews"
        subtitle={`${completed.length} student${completed.length === 1 ? "" : "s"} reached the interview limit`}
        onClose={() => setOpen(false)}
      >
        <DataPresentationTable<MockCompletedRow>
          data={completed}
          columns={mockCompletedColumns}
          loading={loading}
          searchable
          paginated
          pageSize={15}
          rowKey="id"
          stickyHeader
          emptyMessage="No students have completed 7 mock interviews yet"
        />
      </DrillDownModal>
    </>
  );
}

/* ═════════════════════════ Mock Interview ══════════════════════ */
export function MockInterviewTab({
  month,
  refreshKey,
  onMonthChange,
}: {
  month: string;
  refreshKey: number;
  onMonthChange: (m: string) => void;
}) {
  // Fixed to the 100% Job-Ready Bootcamp only — not a user-selectable filter.
  const course = JOB_READY_BOOTCAMP_COURSE_ID;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<MockByDateRow, MockAttemptRow>(
      month,
      (m) => fetchMockMonth(m, course),
      (d) => fetchMockDay(d, course),
      [refreshKey]
    );

  // Drill-down state: a student (level 2) and, within them, one interview (level 3).
  const [student, setStudent] = useState<MockStudentRow | null>(null);
  const [selected, setSelected] = useState<MockAttemptRow | null>(null);

  // Students the mock interview is assigned to — the participation denominator.
  const { expected } = useExpectedRoster("mock", month, refreshKey);
  const hasRoster = expected > 0;

  // Unique students for the selected day, with per-level tallies.
  const students = useMemo(() => groupMockByStudent(dayRows), [dayRows]);

  // Day-level Strong/Average/Needs totals (each interview counted once).
  const dayStats = useMemo(
    () =>
      students.reduce(
        (acc, g) => {
          acc.strong += g.strong;
          acc.average += g.average;
          acc.needs += g.needs;
          acc.unanalyzed += g.unanalyzed;
          return acc;
        },
        { strong: 0, average: 0, needs: 0, unanalyzed: 0 }
      ),
    [students]
  );

  // Month-level totals shown before a day is picked.
  const monthTotals = useMemo(
    () =>
      byDate.reduce(
        (acc, r) => {
          acc.totalAttempts += r.totalAttempts;
          acc.uniqueUserCount += r.uniqueUserCount;
          return acc;
        },
        { totalAttempts: 0, uniqueUserCount: 0 }
      ),
    [byDate]
  );

  // Daily attendance as a share of the roster, for the monthly chart.
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => ({ ...r, rate: pct(r.uniqueUserCount, expected) ?? 0 })),
    [byDate, expected]
  );

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          columns={6}
          items={[
            assignedCard(expected, "student"),
            {
              label: "Attempted",
              value: pctLabel(students.length, expected),
              sub: countLabel(students.length, expected, "student"),
              accent: "violet",
            },
            // Strong / Average / Needs work / Not analyzed partition the day's
            // interviews, so each is a share of dayRows.length (not of the class).
            {
              label: "Strong",
              value: pctLabel(dayStats.strong, dayRows.length),
              sub: countLabel(dayStats.strong, dayRows.length, "interview"),
              accent: "emerald",
            },
            {
              label: "Average",
              value: pctLabel(dayStats.average, dayRows.length),
              sub: countLabel(dayStats.average, dayRows.length, "interview"),
              accent: "amber",
            },
            {
              label: "Needs Work",
              value: pctLabel(dayStats.needs, dayRows.length),
              sub: countLabel(dayStats.needs, dayRows.length, "interview"),
              accent: "rose",
            },
            {
              label: "Not Analyzed",
              value: pctLabel(dayStats.unanalyzed, dayRows.length),
              sub: countLabel(dayStats.unanalyzed, dayRows.length, "interview"),
              accent: "slate",
            },
          ]}
        />
      ) : (
        <StatCards
          items={[
            assignedCard(expected, "student"),
            {
              // Student-days ÷ (roster × days interviews actually ran).
              label: "Avg Daily Attendance",
              value: pctLabel(monthTotals.uniqueUserCount, expected * byDate.length),
              sub: `${monthTotals.uniqueUserCount} student-days · ${plural(
                monthTotals.totalAttempts,
                "interview"
              )} · ${plural(byDate.length, "active day")}`,
              accent: "emerald",
            },
          ]}
          columns={2}
        />
      )}

      <div className="space-y-4">
        <MonthlyChart
          title={
            hasRoster
              ? "Percentage of students who attempted, per day"
              : "Unique students per day"
          }
          yLabel={hasRoster ? "% of students" : "Number of students"}
          month={month}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
          percentBase={expected}
          series={[
            hasRoster
              ? {
                  key: "rate",
                  name: "Students attempted",
                  color: "#3b82f6",
                  countKey: "uniqueUserCount",
                }
              : { key: "uniqueUserCount", name: "Unique students", color: "#3b82f6" },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            {
              key: "uniqueUserCount",
              label: "Students",
              className: "text-emerald-800",
              display: cellRate(
                (r) => num(r.uniqueUserCount),
                () => expected
              ),
            },
          ]}
        />
      </div>

      <AttendancePanel
        tab="mock"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        title={selectedDate ? `Students on ${selectedDate}` : "Mock interviews"}
        attendedSubtitle={
          selectedDate
            ? `${pctLabel(students.length, expected)} attended · ${countLabel(
                students.length,
                expected,
                "student"
              )} · ${plural(dayRows.length, "interview")}`
            : undefined
        }
        attendedCount={students.length}
        extraAction={
          selectedDate && dayRows.length > 0 ? (
            <button
              onClick={() =>
                downloadCsv(
                  `mock-interviews-${selectedDate}.csv`,
                  ["Name", "Email", "Interview Type", "Duration", "Attempt Time", "Result", "Status"],
                  dayRows.map((r) => [
                    r.name ?? "",
                    r.email ?? "",
                    r.interviewType ?? "",
                    formatDuration(r.durationSeconds),
                    formatIST(r.startedAt),
                    mockInterviewLevel(r),
                    r.completed ? "Completed" : "Incomplete",
                  ])
                )
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          ) : null
        }
      >
        <DataPresentationTable<MockStudentRow>
          data={students}
          columns={mockStudentColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="key"
          stickyHeader
          onRowClick={(r) => {
            setStudent(r);
            setSelected(null);
          }}
          emptyMessage="No mock interviews for this date"
        />
      </AttendancePanel>

      {/* Two-level drill-down: a student's interviews → one interview's details. */}
      <DrillDownModal
        open={!!student}
        title={student?.name ?? student?.email ?? "Student"}
        subtitle={
          selected
            ? selected.interviewType ?? undefined
            : student
            ? `${student.total} interview${student.total === 1 ? "" : "s"}${selectedDate ? ` on ${selectedDate}` : ""}`
            : undefined
        }
        onClose={closeStudent}
      >
        {student && !selected && (
          <div className="space-y-2">
            {student.interviews.map((iv, i) => (
              <RecordButton key={iv.id} index={i} onClick={() => setSelected(iv)}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {mockLevelBadge(mockInterviewLevel(iv))}
                    {iv.interviewType && (
                      <span className="text-xs text-gray-500">{iv.interviewType}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatIST(iv.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-gray-600">
                    {formatDuration(iv.durationSeconds)}
                  </span>
                  {iv.completed
                    ? pill("Completed", "bg-green-50 text-green-700")
                    : pill("Incomplete", "bg-amber-50 text-amber-700")}
                </div>
              </RecordButton>
            ))}
          </div>
        )}

        {student && selected && (
          <div className="space-y-4">
            <BackButton label="Back to interviews" onClick={() => setSelected(null)} />
            <MockEvaluationPanel interview={selected} />
          </div>
        )}
      </DrillDownModal>
    </div>
  );
}

/* ═══════════════════════════ AI HR Calling ═════════════════════ */
export function AiHrCallingTab({
  month,
  refreshKey,
  onMonthChange,
}: {
  month: string;
  refreshKey: number;
  onMonthChange: (m: string) => void;
}) {
  // Fixed to the 100% Job-Ready Bootcamp only — not a user-selectable filter.
  const course = JOB_READY_BOOTCAMP_COURSE_ID;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<AiCallingByDateRow, AiCallingRow>(
      month,
      (m) => fetchAiMonth(m, course),
      (d) => fetchAiDay(d, course),
      [refreshKey]
    );

  // Drill-down state: a candidate (level 2) and, within them, one call (level 3).
  const [student, setStudent] = useState<AiStudentRow | null>(null);
  const [selected, setSelected] = useState<AiCallingRow | null>(null);

  // Candidates the AI HR agent is meant to call — the participation denominator.
  const { expected } = useExpectedRoster("ai", month, refreshKey);
  const hasRoster = expected > 0;

  // Unique candidates for the selected day, with per-status tallies.
  const students = useMemo(() => groupAiByStudent(dayRows), [dayRows]);

  const dayStats = useMemo(
    () =>
      students.reduce(
        (acc, g) => {
          acc.analyzed += g.analyzed;
          acc.notAnswered += g.notAnswered;
          acc.pending += g.pending;
          return acc;
        },
        { analyzed: 0, notAnswered: 0, pending: 0 }
      ),
    [students]
  );

  const totals = useMemo(
    () =>
      byDate.reduce(
        (acc, r) => {
          acc.totalCalls += r.totalCalls;
          acc.uniqueCandidateCount += r.uniqueCandidateCount;
          acc.analyzedCount += r.analyzedCount;
          return acc;
        },
        { totalCalls: 0, uniqueCandidateCount: 0, analyzedCount: 0 }
      ),
    [byDate]
  );

  // Daily reach as a share of the roster, for the monthly chart.
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => ({
        ...r,
        rate: pct(r.uniqueCandidateCount, expected) ?? 0,
      })),
    [byDate, expected]
  );

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          columns={5}
          items={[
            assignedCard(expected, "candidate"),
            {
              label: "Called",
              value: pctLabel(students.length, expected),
              sub: countLabel(students.length, expected, "candidate"),
              accent: "violet",
            },
            // Analyzed / Not answered / Pending partition the day's calls.
            {
              label: "Analyzed",
              value: pctLabel(dayStats.analyzed, dayRows.length),
              sub: countLabel(dayStats.analyzed, dayRows.length, "call"),
              accent: "emerald",
            },
            {
              label: "Not Answered",
              value: pctLabel(dayStats.notAnswered, dayRows.length),
              sub: countLabel(dayStats.notAnswered, dayRows.length, "call"),
              accent: "slate",
            },
            {
              label: "Pending",
              value: pctLabel(dayStats.pending, dayRows.length),
              sub: countLabel(dayStats.pending, dayRows.length, "call"),
              accent: "amber",
            },
          ]}
        />
      ) : (
        <StatCards
          columns={3}
          items={[
            assignedCard(expected, "candidate"),
            {
              // Candidate-days ÷ (roster × days calls actually ran).
              label: "Avg Daily Reach",
              value: pctLabel(totals.uniqueCandidateCount, expected * byDate.length),
              sub: `${totals.uniqueCandidateCount} candidate-days · ${plural(
                totals.totalCalls,
                "call"
              )} · ${plural(byDate.length, "active day")}`,
              accent: "emerald",
            },
            {
              label: "Analyzed",
              value: pctLabel(totals.analyzedCount, totals.totalCalls),
              sub: countLabel(totals.analyzedCount, totals.totalCalls, "call"),
              accent: "violet",
            },
          ]}
        />
      )}

      <div className="space-y-4">
        <MonthlyChart
          title={
            hasRoster
              ? "Percentage of candidates reached, per day"
              : "Unique candidates per day"
          }
          yLabel={hasRoster ? "% of candidates" : "Unique candidates"}
          month={month}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
          percentBase={expected}
          series={[
            hasRoster
              ? {
                  key: "rate",
                  name: "Candidates reached",
                  color: "#3b82f6",
                  countKey: "uniqueCandidateCount",
                }
              : {
                  key: "uniqueCandidateCount",
                  name: "Unique candidates",
                  color: "#3b82f6",
                },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            {
              key: "uniqueCandidateCount",
              label: "Candidates",
              className: "text-emerald-800",
              display: cellRate(
                (r) => num(r.uniqueCandidateCount),
                () => expected
              ),
            },
            {
              key: "analyzedCount",
              label: "Analyzed",
              className: "text-violet-700",
              display: cellRate(
                (r) => num(r.analyzedCount),
                (r) => num(r.totalCalls)
              ),
            },
          ]}
        />
      </div>

      <AttendancePanel
        tab="ai"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        title={selectedDate ? `Candidates on ${selectedDate}` : "AI HR calls"}
        attendedSubtitle={
          selectedDate
            ? `${pctLabel(students.length, expected)} reached · ${countLabel(
                students.length,
                expected,
                "candidate"
              )} · ${plural(dayRows.length, "call")}`
            : undefined
        }
        attendedCount={students.length}
      >
        <DataPresentationTable<AiStudentRow>
          data={students}
          columns={aiStudentColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="key"
          stickyHeader
          onRowClick={(r) => {
            setStudent(r);
            setSelected(null);
          }}
          emptyMessage="No AI calls for this date"
        />
      </AttendancePanel>

      {/* Two-level drill-down: a candidate's calls → one call's analysis. */}
      <DrillDownModal
        open={!!student}
        title={student?.candidateName ?? student?.phone ?? "Candidate"}
        subtitle={
          selected
            ? selected.phone ?? undefined
            : student
            ? `${student.total} call${student.total === 1 ? "" : "s"}${selectedDate ? ` on ${selectedDate}` : ""}`
            : undefined
        }
        onClose={closeStudent}
      >
        {student && !selected && (
          <div className="space-y-2">
            {student.calls.map((c, i) => (
              <RecordButton key={c.id} index={i} onClick={() => setSelected(c)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDuration(c.durationSeconds)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatIST(c.startedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {aiCallStatusBadge(c)}
                </div>
              </RecordButton>
            ))}
          </div>
        )}

        {student && selected && (
          <div className="space-y-5">
            <BackButton label="Back to calls" onClick={() => setSelected(null)} />
            {selected.analysis != null ? (
              <CallAnalysisPanel analysis={selected.analysis} />
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                {isAiCallDnp(selected)
                  ? "Candidate didn't answer — there's no conversation to analyze."
                  : selected.analysisStatus
                  ? `Analysis ${selected.analysisStatus.toLowerCase()}.`
                  : "This call has not been analyzed yet."}
              </div>
            )}

            <section>
              <h4 className="mb-1 text-sm font-semibold text-gray-800">Call details</h4>
              <div>
                <DetailRow label="Candidate" value={selected.candidateName ?? "—"} />
                <DetailRow label="Phone" value={selected.phone ?? "—"} />
                <DetailRow label="Duration" value={formatDuration(selected.durationSeconds)} />
                <DetailRow label="End Reason" value={selected.endReason ?? "—"} />
                <DetailRow
                  label="Analysis Status"
                  value={
                    selected.analyzed
                      ? "Analyzed"
                      : isAiCallDnp(selected)
                      ? "Not Answered"
                      : selected.analysisStatus ?? "Pending"
                  }
                />
                <DetailRow label="Transcript" value={selected.hasTranscript ? "Available" : "—"} />
                <DetailRow label="Started" value={formatIST(selected.startedAt)} />
                <DetailRow label="Ended" value={formatIST(selected.endedAt)} />
              </div>
            </section>
          </div>
        )}
      </DrillDownModal>
    </div>
  );
}

/* ════════════════════ Real HR Calling (recordings) ═════════════ */
export function RealHrCallingTab({
  month,
  refreshKey,
  onMonthChange,
}: {
  month: string;
  refreshKey: number;
  onMonthChange: (m: string) => void;
}) {
  // Fixed to the 100% Job-Ready Bootcamp only — not a user-selectable filter.
  const course = JOB_READY_BOOTCAMP_COURSE_ID;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<RealHrByDateRow, RealHrRow>(
      month,
      (m) => fetchRealHrMonth(m, course),
      (d) => fetchRealHrDay(d, course),
      [refreshKey]
    );

  // Drill-down state: a lead/student (level 2) and, within them, one call (level 3).
  const [student, setStudent] = useState<RealHrStudentRow | null>(null);
  const [selected, setSelected] = useState<RealHrRow | null>(null);

  // Students expected to log HR calls — the participation denominator.
  const { expected } = useExpectedRoster("realhr", month, refreshKey);
  const hasRoster = expected > 0;

  // Unique leads/students for the selected day, with per-status tallies.
  const students = useMemo(() => groupRealHrByStudent(dayRows), [dayRows]);

  const dayStats = useMemo(
    () =>
      students.reduce(
        (acc, g) => {
          acc.analyzed += g.analyzed;
          acc.pending += g.pending;
          acc.manual += g.manual;
          return acc;
        },
        { analyzed: 0, pending: 0, manual: 0 }
      ),
    [students]
  );

  const totals = useMemo(
    () =>
      byDate.reduce(
        (acc, r) => {
          acc.totalCalls += r.totalCalls;
          acc.recordedCount += r.recordedCount;
          acc.analyzedCount += r.analyzedCount;
          acc.uniqueLeadCount += r.uniqueLeadCount;
          return acc;
        },
        { totalCalls: 0, recordedCount: 0, analyzedCount: 0, uniqueLeadCount: 0 }
      ),
    [byDate]
  );

  // Daily participation as a share of the roster, for the monthly chart.
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => ({ ...r, rate: pct(r.uniqueLeadCount, expected) ?? 0 })),
    [byDate, expected]
  );

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          columns={5}
          items={[
            assignedCard(expected, "student"),
            {
              label: "Attempted",
              value: pctLabel(students.length, expected),
              sub: countLabel(students.length, expected, "student"),
              accent: "violet",
            },
            // Analyzed / Pending / Manual partition the day's calls.
            {
              label: "Analyzed",
              value: pctLabel(dayStats.analyzed, dayRows.length),
              sub: countLabel(dayStats.analyzed, dayRows.length, "call"),
              accent: "emerald",
            },
            {
              label: "Pending",
              value: pctLabel(dayStats.pending, dayRows.length),
              sub: countLabel(dayStats.pending, dayRows.length, "call"),
              accent: "amber",
            },
            {
              label: "Manual",
              value: pctLabel(dayStats.manual, dayRows.length),
              sub: countLabel(dayStats.manual, dayRows.length, "call"),
              accent: "slate",
            },
          ]}
        />
      ) : (
        <StatCards
          items={[
            assignedCard(expected, "student"),
            {
              // Lead-days ÷ (roster × days calls actually ran).
              label: "Avg Daily Attendance",
              value: pctLabel(totals.uniqueLeadCount, expected * byDate.length),
              sub: `${totals.uniqueLeadCount} lead-days · ${plural(
                byDate.length,
                "active day"
              )}`,
              accent: "emerald",
            },
            {
              label: "Recorded",
              value: pctLabel(totals.recordedCount, totals.totalCalls),
              sub: countLabel(totals.recordedCount, totals.totalCalls, "call"),
              accent: "violet",
            },
            {
              label: "Analyzed",
              value: pctLabel(totals.analyzedCount, totals.totalCalls),
              sub: countLabel(totals.analyzedCount, totals.totalCalls, "call"),
              accent: "amber",
            },
          ]}
        />
      )}

      <div className="space-y-4">
        <MonthlyChart
          title={
            hasRoster
              ? "Percentage of students who logged a call, per day"
              : "Unique leads per day"
          }
          yLabel={hasRoster ? "% of students" : "Number of students"}
          month={month}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
          percentBase={expected}
          series={[
            hasRoster
              ? {
                  key: "rate",
                  name: "Students who called",
                  color: "#3b82f6",
                  countKey: "uniqueLeadCount",
                }
              : { key: "uniqueLeadCount", name: "Unique leads", color: "#3b82f6" },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            {
              key: "uniqueLeadCount",
              label: "Students",
              display: cellRate(
                (r) => num(r.uniqueLeadCount),
                () => expected
              ),
            },
            {
              key: "recordedCount",
              label: "Recorded",
              className: "text-emerald-800",
              display: cellRate(
                (r) => num(r.recordedCount),
                (r) => num(r.totalCalls)
              ),
            },
            {
              key: "analyzedCount",
              label: "Analyzed",
              className: "text-violet-700",
              display: cellRate(
                (r) => num(r.analyzedCount),
                (r) => num(r.totalCalls)
              ),
            },
          ]}
        />
      </div>

      <AttendancePanel
        tab="realhr"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        title={selectedDate ? `Students on ${selectedDate}` : "HR calls"}
        attendedSubtitle={
          selectedDate
            ? `${pctLabel(students.length, expected)} attended · ${countLabel(
                students.length,
                expected,
                "student"
              )} · ${plural(dayRows.length, "call")}`
            : undefined
        }
        attendedCount={students.length}
      >
        <DataPresentationTable<RealHrStudentRow>
          data={students}
          columns={realHrStudentColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="key"
          stickyHeader
          onRowClick={(r) => {
            setStudent(r);
            setSelected(null);
          }}
          emptyMessage="No HR calls for this date"
        />
      </AttendancePanel>

      {/* Two-level drill-down: a lead's calls → one recording's analysis. */}
      <DrillDownModal
        open={!!student}
        title={student?.studentName ?? "Student"}
        subtitle={
          selected
            ? selected.phone ?? selected.email ?? undefined
            : student
            ? `${student.total} call${student.total === 1 ? "" : "s"}${selectedDate ? ` on ${selectedDate}` : ""}`
            : undefined
        }
        onClose={closeStudent}
      >
        {student && !selected && (
          <div className="space-y-2">
            {student.calls.map((c, i) => (
              <RecordButton key={c.id} index={i} onClick={() => setSelected(c)}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {pill(
                      c.type === "manual" ? "Manual" : "Recording",
                      "bg-gray-100 text-gray-700"
                    )}
                    <span className="text-xs text-gray-600">
                      {c.durationLabel ?? formatDuration(c.durationSeconds)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatIST(c.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {realHrCallStatusBadge(c)}
                </div>
              </RecordButton>
            ))}
          </div>
        )}

        {student && selected && (
          <div className="space-y-5">
            <BackButton label="Back to calls" onClick={() => setSelected(null)} />
            {selected.analysis != null ? (
              <CallAnalysisPanel analysis={selected.analysis} />
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                {selected.type === "manual"
                  ? "Manual call — no recording to analyze."
                  : selected.status && selected.status.toUpperCase() !== "DONE"
                  ? `Recording ${selected.status.toLowerCase()} — analysis pending.`
                  : "This recording has not been analyzed yet."}
              </div>
            )}

            <section>
              <h4 className="mb-1 text-sm font-semibold text-gray-800">Call details</h4>
              <div>
                <DetailRow label="Lead / Student" value={selected.studentName} />
                <DetailRow label="Email" value={selected.email ?? "—"} />
                <DetailRow label="Phone" value={selected.phone ?? "—"} />
                <DetailRow label="Agent" value={selected.agentId ?? "—"} />
                <DetailRow
                  label="Type"
                  value={selected.type === "manual" ? selected.manualStatus ?? "Manual" : "Recording"}
                />
                <DetailRow
                  label="Duration"
                  value={selected.durationLabel ?? formatDuration(selected.durationSeconds)}
                />
                <DetailRow label="Status" value={selected.status ?? "—"} />
                <DetailRow label="Transcript" value={selected.hasTranscript ? "Available" : "—"} />
                <DetailRow
                  label="Recording"
                  value={
                    selected.recordingUrl ? (
                      <a
                        href={selected.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Listen
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailRow label="Called At" value={formatIST(selected.createdAt)} />
              </div>
            </section>
          </div>
        )}
      </DrillDownModal>
    </div>
  );
}
