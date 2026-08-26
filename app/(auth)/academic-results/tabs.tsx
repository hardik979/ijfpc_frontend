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
  useExpectedRosterByDate,
  useStudentMeta,
  attachStudentMeta,
  courseOptionsOf,
  filterByCourse,
  participationRate,
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
  DATA_ANALYST_COURSE_ID,
  REAL_HR_ALLOWED_COURSE_IDS,
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
  type MonthRange,
  type WithMeta,
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
  range,
  courseId,
  refreshKey,
}: {
  range: MonthRange;
  courseId: string;
  refreshKey: number;
}) {
  const course = courseId || undefined;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<QuizByDateRow, QuizAttemptRow>(
      range,
      (r) => fetchQuizMonth(r, course),
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
    fetchQuizMonthStudentCount(range, course)
      .then((n) => !cancelled && setMonthStudentCount(n))
      .catch(() => !cancelled && setMonthStudentCount(0));
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, courseId, refreshKey]);

  // Roster the monthly chart's percentages are taken against, per day.
  // Narrowed by the course filter so the rate compares like with like.
  const { expectedByDate } = useExpectedRosterByDate("quiz", range, refreshKey, course);
  const hasRoster = useMemo(
    () => Array.from(expectedByDate.values()).some((v) => v > 0),
    [expectedByDate]
  );
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => {
        const { expected, rate } = participationRate(
          r.uniqueStudentCount,
          expectedByDate.get(r.date) ?? 0
        );
        return { ...r, rate, expected };
      }),
    [byDate, expectedByDate]
  );

  // Unique students for the selected day, with per-status tallies, each carrying
  // their batch + course (quiz attempts key on the student's Clerk id).
  const lookupMeta = useStudentMeta(refreshKey);
  const allStudents = useMemo(
    () =>
      attachStudentMeta(
        groupQuizByStudent(dayRows),
        (r) => ({ clerkId: r.userId }),
        lookupMeta
      ),
    [dayRows, lookupMeta]
  );

  // Table-level course filter — narrows the rows shown, not the day's totals.
  const [tableCourse, setTableCourse] = useState("");
  const students = useMemo(
    () => filterByCourse(allStudents, tableCourse),
    [allStudents, tableCourse]
  );
  const courseOptions = useMemo(() => courseOptionsOf(allStudents), [allStudents]);
  const shownAttempts = useMemo(
    () => students.reduce((n, g) => n + g.total, 0),
    [students]
  );

  const dayStats = useMemo(
    () =>
      allStudents.reduce(
        (acc, g) => {
          acc.evaluated += g.evaluated;
          acc.pending += g.pending;
          return acc;
        },
        { evaluated: 0, pending: 0 }
      ),
    [allStudents]
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

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          items={[
            {
              label: "Total Attempts",
              value: dayRows.length,
              sub: `${allStudents.length} student${allStudents.length === 1 ? "" : "s"} attempted`,
              accent: "violet",
            },
            { label: "Evaluated", value: dayStats.evaluated, accent: "emerald" },
            { label: "Pending", value: dayStats.pending, accent: "amber" },
          ]}
        />
      ) : (
        <StatCards
          columns={5}
          items={[
            { label: "Total Attempts", value: monthTotals.totalAttempts, accent: "blue" },
            { label: "Students Attempted", value: monthStudentCount, accent: "violet" },
            { label: "Evaluated", value: monthTotals.evaluatedCount, accent: "emerald" },
            { label: "Pending", value: monthTotals.pendingCount, accent: "amber" },
            { label: "Student-days", value: monthTotals.uniqueStudentCount, accent: "slate" },
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
          range={range}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
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
          range={range}
          data={byDate}
          loading={loadingMonth}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalAttempts", label: "Attempts" },
            { key: "uniqueStudentCount", label: "Students", className: "text-blue-700" },
            { key: "evaluatedCount", label: "Evaluated", className: "text-emerald-800" },
            { key: "pendingCount", label: "Pending", className: "text-amber-700" },
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
            ? `${students.length} student${students.length === 1 ? "" : "s"} · ${shownAttempts} attempt${shownAttempts === 1 ? "" : "s"}`
            : undefined
        }
        attendedCount={students.length}
        rosterCourseId={course}
        courseFilter={tableCourse}
        onCourseFilterChange={setTableCourse}
        courseOptions={courseOptions}
      >
        <DataPresentationTable<WithMeta<QuizStudentRow>>
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

  const lookupMeta = useStudentMeta(refreshKey);
  const rows = useMemo(
    () =>
      attachStudentMeta(
        completed,
        (r) => ({ id: r.id, email: r.email }),
        lookupMeta
      ),
    [completed, lookupMeta]
  );

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
        <DataPresentationTable<WithMeta<MockCompletedRow>>
          data={rows}
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
  range,
  courseId,
  refreshKey,
}: {
  range: MonthRange;
  courseId: string;
  refreshKey: number;
}) {
  // "All courses" means the Mock roster's courses (Bootcamp + Data Analyst,
  // mirroring lms-backend lib/academicRoster.js); a selected course narrows
  // both the data and the expected roster, same as the Daily Quiz tab.
  const course =
    courseId || `${JOB_READY_BOOTCAMP_COURSE_ID},${DATA_ANALYST_COURSE_ID}`;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<MockByDateRow, MockAttemptRow>(
      range,
      (r) => fetchMockMonth(r, course),
      (d) => fetchMockDay(d, course),
      [courseId, refreshKey]
    );

  // Drill-down state: a student (level 2) and, within them, one interview (level 3).
  const [student, setStudent] = useState<MockStudentRow | null>(null);
  const [selected, setSelected] = useState<MockAttemptRow | null>(null);

  // Roster the monthly chart's percentages are taken against, per day.
  // Narrowed by the course filter so the rate compares like with like.
  const { expectedByDate } = useExpectedRosterByDate(
    "mock",
    range,
    refreshKey,
    courseId || undefined
  );
  const hasRoster = useMemo(
    () => Array.from(expectedByDate.values()).some((v) => v > 0),
    [expectedByDate]
  );
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => {
        const { expected, rate } = participationRate(
          r.uniqueUserCount,
          expectedByDate.get(r.date) ?? 0
        );
        return { ...r, rate, expected };
      }),
    [byDate, expectedByDate]
  );

  // Unique students for the selected day, with per-level tallies and their
  // batch + course (mock interviews key on the student's email).
  const lookupMeta = useStudentMeta(refreshKey);
  const allStudents = useMemo(
    () =>
      attachStudentMeta(
        groupMockByStudent(dayRows),
        (r) => ({ email: r.email }),
        lookupMeta
      ),
    [dayRows, lookupMeta]
  );

  // Table-level course filter — narrows the rows shown, not the day's totals.
  const [tableCourse, setTableCourse] = useState("");
  const students = useMemo(
    () => filterByCourse(allStudents, tableCourse),
    [allStudents, tableCourse]
  );
  const courseOptions = useMemo(() => courseOptionsOf(allStudents), [allStudents]);
  const shownInterviews = useMemo(
    () => students.reduce((n, g) => n + g.total, 0),
    [students]
  );

  // Day-level Strong/Average/Needs totals (each interview counted once).
  const dayStats = useMemo(
    () =>
      allStudents.reduce(
        (acc, g) => {
          acc.strong += g.strong;
          acc.average += g.average;
          acc.needs += g.needs;
          acc.unanalyzed += g.unanalyzed;
          return acc;
        },
        { strong: 0, average: 0, needs: 0, unanalyzed: 0 }
      ),
    [allStudents]
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
            { label: "Total Students", value: allStudents.length, accent: "blue" },
            { label: "Total Mock Interviews", value: dayRows.length, accent: "violet" },
            { label: "Strong", value: dayStats.strong, accent: "emerald" },
            { label: "Average", value: dayStats.average, accent: "amber" },
            { label: "Needs Work", value: dayStats.needs, accent: "rose" },
            { label: "Not Analyzed", value: dayStats.unanalyzed, accent: "slate" },
          ]}
        />
      ) : (
        <StatCards
          items={[
            { label: "Total Interviews", value: monthTotals.totalAttempts, accent: "blue" },
            { label: "Student-days", value: monthTotals.uniqueUserCount, accent: "emerald" },
          ]}
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
          range={range}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
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
          range={range}
          data={byDate}
          loading={loadingMonth}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalAttempts", label: "Interviews" },
            { key: "uniqueUserCount", label: "Students", className: "text-emerald-800" },
          ]}
        />
      </div>

      <AttendancePanel
        tab="mock"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        rosterCourseId={courseId || undefined}
        title={selectedDate ? `Students on ${selectedDate}` : "Mock interviews"}
        attendedSubtitle={
          selectedDate
            ? `${students.length} student${students.length === 1 ? "" : "s"} · ${shownInterviews} interview${shownInterviews === 1 ? "" : "s"}`
            : undefined
        }
        attendedCount={students.length}
        courseFilter={tableCourse}
        onCourseFilterChange={setTableCourse}
        courseOptions={courseOptions}
        extraAction={
          selectedDate && students.length > 0 ? (
            <button
              // Exports what the table currently shows (course filter included),
              // one row per interview, with the student's batch and course.
              onClick={() =>
                downloadCsv(
                  `mock-interviews-${selectedDate}.csv`,
                  ["Name", "Email", "Batch", "Course", "Interview Type", "Duration", "Attempt Time", "Result", "Status"],
                  students.flatMap((g) =>
                    g.interviews.map((r) => [
                      r.name ?? g.name ?? "",
                      r.email ?? g.email ?? "",
                      g.batch ?? "",
                      g.courseNames.join(" | "),
                      r.interviewType ?? "",
                      formatDuration(r.durationSeconds),
                      formatIST(r.startedAt),
                      mockInterviewLevel(r),
                      r.completed ? "Completed" : "Incomplete",
                    ])
                  )
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
        <DataPresentationTable<WithMeta<MockStudentRow>>
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
  range,
  courseId,
  refreshKey,
}: {
  range: MonthRange;
  courseId: string;
  refreshKey: number;
}) {
  // "All courses" means the AI HR roster's courses (Bootcamp + Data Analyst,
  // mirroring lms-backend lib/academicRoster.js); a selected course narrows
  // both the data and the expected roster, same as the Daily Quiz tab.
  const course =
    courseId || `${JOB_READY_BOOTCAMP_COURSE_ID},${DATA_ANALYST_COURSE_ID}`;
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<AiCallingByDateRow, AiCallingRow>(
      range,
      (r) => fetchAiMonth(r, course),
      (d) => fetchAiDay(d, course),
      [courseId, refreshKey]
    );

  // Drill-down state: a candidate (level 2) and, within them, one call (level 3).
  const [student, setStudent] = useState<AiStudentRow | null>(null);
  const [selected, setSelected] = useState<AiCallingRow | null>(null);

  // Roster the monthly chart's percentages are taken against, per day.
  // Narrowed by the course filter so the rate compares like with like.
  const { expectedByDate } = useExpectedRosterByDate(
    "ai",
    range,
    refreshKey,
    courseId || undefined
  );
  const hasRoster = useMemo(
    () => Array.from(expectedByDate.values()).some((v) => v > 0),
    [expectedByDate]
  );
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => {
        const { expected, rate } = participationRate(
          r.uniqueCandidateCount,
          expectedByDate.get(r.date) ?? 0
        );
        return { ...r, rate, expected };
      }),
    [byDate, expectedByDate]
  );

  // Unique candidates for the selected day, with per-status tallies and their
  // batch + course (AI calls carry a Clerk id and a phone number).
  const lookupMeta = useStudentMeta(refreshKey);
  const allStudents = useMemo(
    () =>
      attachStudentMeta(
        groupAiByStudent(dayRows),
        (r) => ({ clerkId: r.clerkId, phone: r.phone }),
        lookupMeta
      ),
    [dayRows, lookupMeta]
  );

  // ATTENDED = picked up at least one call. A student whose every call went
  // unanswered (all DNP) is not an attendee — they appear in the Absent list
  // instead, with the reason ("Did not pick — 3 calls"). Same rule as the
  // daily report and the /absent/ai endpoint.
  const attendedStudents = useMemo(
    () => allStudents.filter((g) => g.total > g.notAnswered),
    [allStudents]
  );

  // Table-level course filter — narrows the rows shown, not the day's totals.
  const [tableCourse, setTableCourse] = useState("");
  const students = useMemo(
    () => filterByCourse(attendedStudents, tableCourse),
    [attendedStudents, tableCourse]
  );
  const courseOptions = useMemo(() => courseOptionsOf(attendedStudents), [attendedStudents]);
  const shownCalls = useMemo(
    () => students.reduce((n, g) => n + g.total, 0),
    [students]
  );

  const dayStats = useMemo(
    () =>
      allStudents.reduce(
        (acc, g) => {
          acc.analyzed += g.analyzed;
          acc.notAnswered += g.notAnswered;
          acc.pending += g.pending;
          return acc;
        },
        { analyzed: 0, notAnswered: 0, pending: 0 }
      ),
    [allStudents]
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

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          items={[
            // Attended = picked up ≥1 call; DNP-only students sit in Absent.
            { label: "Attended", value: attendedStudents.length, accent: "blue" },
            { label: "Total Calls", value: dayRows.length, accent: "violet" },
            { label: "Analyzed", value: dayStats.analyzed, accent: "emerald" },
            { label: "Not Answered", value: dayStats.notAnswered, accent: "slate" },
          ]}
        />
      ) : (
        <StatCards
          items={[
            { label: "Total Calls", value: totals.totalCalls, accent: "blue" },
            { label: "Candidate-days", value: totals.uniqueCandidateCount, accent: "emerald" },
            { label: "Analyzed", value: totals.analyzedCount, accent: "violet" },
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
          range={range}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
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
          range={range}
          data={byDate}
          loading={loadingMonth}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalCalls", label: "Calls" },
            { key: "uniqueCandidateCount", label: "Candidates", className: "text-emerald-800" },
            { key: "analyzedCount", label: "Analyzed", className: "text-violet-700" },
          ]}
        />
      </div>

      <AttendancePanel
        tab="ai"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        rosterCourseId={courseId || undefined}
        title={selectedDate ? `Candidates on ${selectedDate}` : "AI HR calls"}
        attendedSubtitle={
          selectedDate
            ? `${students.length} candidate${students.length === 1 ? "" : "s"} · ${shownCalls} call${shownCalls === 1 ? "" : "s"}`
            : undefined
        }
        attendedCount={students.length}
        courseFilter={tableCourse}
        onCourseFilterChange={setTableCourse}
        courseOptions={courseOptions}
      >
        <DataPresentationTable<WithMeta<AiStudentRow>>
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
  range,
  courseId,
  refreshKey,
}: {
  range: MonthRange;
  courseId: string;
  refreshKey: number;
}) {
  // "All courses" means the Real HR roster's courses (Bootcamp + Data
  // Analyst, mirroring lms-backend lib/academicRoster.js); a selected course
  // narrows both the data and the expected roster, same as the other tabs.
  const course = courseId || REAL_HR_ALLOWED_COURSE_IDS.join(",");
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<RealHrByDateRow, RealHrRow>(
      range,
      (r) => fetchRealHrMonth(r, course),
      (d) => fetchRealHrDay(d, course),
      [courseId, refreshKey]
    );

  // Drill-down state: a lead/student (level 2) and, within them, one call (level 3).
  const [student, setStudent] = useState<RealHrStudentRow | null>(null);
  const [selected, setSelected] = useState<RealHrRow | null>(null);

  // Roster the monthly chart's percentages are taken against, per day.
  // Narrowed by the course filter so the rate compares like with like.
  const { expectedByDate } = useExpectedRosterByDate(
    "realhr",
    range,
    refreshKey,
    courseId || undefined
  );
  const hasRoster = useMemo(
    () => Array.from(expectedByDate.values()).some((v) => v > 0),
    [expectedByDate]
  );
  const rateByDate = useMemo(
    () =>
      byDate.map((r) => {
        const { expected, rate } = participationRate(
          r.uniqueLeadCount,
          expectedByDate.get(r.date) ?? 0
        );
        return { ...r, rate, expected };
      }),
    [byDate, expectedByDate]
  );

  // Unique leads/students for the selected day, with per-status tallies and
  // their batch + course (recordings hold the uploader's Clerk id in `leadId`).
  const lookupMeta = useStudentMeta(refreshKey);
  const allStudents = useMemo(
    () =>
      attachStudentMeta(
        groupRealHrByStudent(dayRows),
        (r) => ({ clerkId: r.clerkId, email: r.email, phone: r.phone }),
        lookupMeta
      ),
    [dayRows, lookupMeta]
  );

  // Table-level course filter — narrows the rows shown, not the day's totals.
  const [tableCourse, setTableCourse] = useState("");
  const students = useMemo(
    () => filterByCourse(allStudents, tableCourse),
    [allStudents, tableCourse]
  );
  const courseOptions = useMemo(() => courseOptionsOf(allStudents), [allStudents]);
  const shownCalls = useMemo(
    () => students.reduce((n, g) => n + g.total, 0),
    [students]
  );

  const dayStats = useMemo(
    () =>
      allStudents.reduce(
        (acc, g) => {
          acc.analyzed += g.analyzed;
          acc.pending += g.pending;
          acc.manual += g.manual;
          return acc;
        },
        { analyzed: 0, pending: 0, manual: 0 }
      ),
    [allStudents]
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

  const closeStudent = () => {
    setStudent(null);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {selectedDate ? (
        <StatCards
          items={[
            { label: "Total Students", value: allStudents.length, accent: "blue" },
            { label: "Total Calls", value: dayRows.length, accent: "violet" },
            { label: "Analyzed", value: dayStats.analyzed, accent: "emerald" },
            { label: "Pending", value: dayStats.pending, accent: "amber" },
          ]}
        />
      ) : (
        <StatCards
          items={[
            { label: "Total Calls", value: totals.totalCalls, accent: "blue" },
            { label: "Recorded", value: totals.recordedCount, accent: "emerald" },
            { label: "Analyzed", value: totals.analyzedCount, accent: "violet" },
            { label: "Lead-days", value: totals.uniqueLeadCount, accent: "amber" },
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
          yLabel={hasRoster ? "% of students" : "Number of Students "}
          range={range}
          data={hasRoster ? rateByDate : byDate}
          percent={hasRoster}
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
          range={range}
          data={byDate}
          loading={loadingMonth}
          onDateSelect={loadDay}
          metrics={[
            { key: "uniqueLeadCount", label: "Students" },
            { key: "totalCalls", label: "Calls", className: "text-emerald-800" },
          ]}
        />
      </div>

      <AttendancePanel
        tab="realhr"
        selectedDate={selectedDate}
        refreshKey={refreshKey}
        rosterCourseId={courseId || undefined}
        title={selectedDate ? `Students on ${selectedDate}` : "HR calls"}
        attendedSubtitle={
          selectedDate
            ? `${students.length} student${students.length === 1 ? "" : "s"} · ${shownCalls} call${shownCalls === 1 ? "" : "s"}`
            : undefined
        }
        attendedCount={students.length}
        courseFilter={tableCourse}
        onCourseFilterChange={setTableCourse}
        courseOptions={courseOptions}
      >
        <DataPresentationTable<WithMeta<RealHrStudentRow>>
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
