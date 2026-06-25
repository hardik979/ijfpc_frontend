"use client";

// The four Academic Results tabs. They share the same shape: stat cards, a
// calendar + monthly chart, a day table, and a drill-down modal — driven by
// the useMonthDay hook. Kept in one file so the pattern is easy to compare.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import DataPresentationTable from "@/healper/DataPresentationTable";
import {
  useMonthDay,
  formatDuration,
  formatIST,
  downloadCsv,
  groupMockByStudent,
  mockInterviewLevel,
  fetchQuizMonth,
  fetchQuizDay,
  fetchMockMonth,
  fetchMockDay,
  fetchAiMonth,
  fetchAiDay,
  fetchRealHrMonth,
  fetchRealHrDay,
  type QuizByDateRow,
  type QuizAttemptRow,
  type MockByDateRow,
  type MockAttemptRow,
  type MockStudentRow,
  type AiCallingByDateRow,
  type AiCallingRow,
  type RealHrByDateRow,
  type RealHrRow,
} from "./data";
import {
  quizColumns,
  mockStudentColumns,
  mockLevelBadge,
  aiColumns,
  realHrColumns,
} from "./columns";
import { MockEvaluationPanel } from "./mockEvaluation";
import {
  StatCards,
  MonthlyChart,
  ResultsCalendar,
  TablePanel,
  DrillDownModal,
  DetailRow,
} from "./ui";

function renderAnalysis(analysis: unknown): string {
  if (analysis == null) return "—";
  if (typeof analysis === "string") return analysis;
  try {
    return JSON.stringify(analysis, null, 2);
  } catch {
    return String(analysis);
  }
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

  const [selected, setSelected] = useState<QuizAttemptRow | null>(null);

  const totals = useMemo(
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

  return (
    <div className="space-y-6">
      <StatCards
        items={[
          { label: "Total Attempts", value: totals.totalAttempts, accent: "blue" },
          { label: "Evaluated", value: totals.evaluatedCount, accent: "emerald" },
          { label: "Pending", value: totals.pendingCount, accent: "amber" },
          { label: "Student-days", value: totals.uniqueStudentCount, accent: "violet" },
        ]}
      />

      <div className="space-y-4">
        <MonthlyChart
          title="Number of students per day"
          yLabel="Number of students"
          month={month}
          data={byDate}
          series={[
            { key: "uniqueStudentCount", name: "Number of students", color: "#3b82f6" },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalAttempts", label: "Attempts" },
            { key: "evaluatedCount", label: "Evaluated", className: "text-emerald-400" },
            { key: "pendingCount", label: "Pending", className: "text-amber-400" },
          ]}
        />
      </div>

      <TablePanel
        title={selectedDate ? `Quiz attempts on ${selectedDate}` : "Quiz attempts"}
        subtitle={selectedDate ? `${dayRows.length} attempt${dayRows.length === 1 ? "" : "s"}` : undefined}
        empty={!selectedDate}
      >
        <DataPresentationTable<QuizAttemptRow>
          data={dayRows}
          columns={quizColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="attemptId"
          stickyHeader
          onRowClick={(r) => setSelected(r)}
          emptyMessage="No attempts for this date"
        />
      </TablePanel>

      <DrillDownModal
        open={!!selected}
        title={selected?.studentName ?? "Quiz attempt"}
        subtitle={selected?.quizTitle ?? undefined}
        onClose={() => setSelected(null)}
      >
        {selected && (
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
        )}
      </DrillDownModal>
    </div>
  );
}

/* ═════════════════════════ Mock Interview ══════════════════════ */
export function MockInterviewTab({
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
    useMonthDay<MockByDateRow, MockAttemptRow>(
      month,
      (m) => fetchMockMonth(m, course),
      (d) => fetchMockDay(d, course),
      [courseId, refreshKey]
    );

  // Drill-down state: a student (level 2) and, within them, one interview (level 3).
  const [student, setStudent] = useState<MockStudentRow | null>(null);
  const [selected, setSelected] = useState<MockAttemptRow | null>(null);

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
          return acc;
        },
        { strong: 0, average: 0, needs: 0 }
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
            { label: "Total Students", value: students.length, accent: "blue" },
            { label: "Total Mock Interviews", value: dayRows.length, accent: "violet" },
            { label: "Strong", value: dayStats.strong, accent: "emerald" },
            { label: "Average", value: dayStats.average, accent: "amber" },
            { label: "Needs Work", value: dayStats.needs, accent: "rose" },
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
          title="Unique students per day"
          yLabel="Number of students"
          month={month}
          data={byDate}
          series={[
            { key: "uniqueUserCount", name: "Unique students", color: "#3b82f6" },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalAttempts", label: "Interviews" },
            { key: "uniqueUserCount", label: "Students", className: "text-emerald-400" },
          ]}
        />
      </div>

      <TablePanel
        title={selectedDate ? `Students on ${selectedDate}` : "Mock interviews"}
        subtitle={
          selectedDate
            ? `${students.length} student${students.length === 1 ? "" : "s"} · ${dayRows.length} interview${dayRows.length === 1 ? "" : "s"}`
            : undefined
        }
        empty={!selectedDate}
        action={
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
      </TablePanel>

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
            {student.interviews.map((iv) => (
              <button
                key={iv.id}
                onClick={() => setSelected(iv)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
              >
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
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      iv.completed
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {iv.completed ? "Completed" : "Incomplete"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {student && selected && (
          <div className="space-y-4">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to interviews
            </button>
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
    useMonthDay<AiCallingByDateRow, AiCallingRow>(
      month,
      (m) => fetchAiMonth(m, course),
      (d) => fetchAiDay(d, course),
      [courseId, refreshKey]
    );

  const [selected, setSelected] = useState<AiCallingRow | null>(null);

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

  return (
    <div className="space-y-6">
      <StatCards
        items={[
          { label: "Total Calls", value: totals.totalCalls, accent: "blue" },
          { label: "Candidate-days", value: totals.uniqueCandidateCount, accent: "emerald" },
          { label: "Analyzed", value: totals.analyzedCount, accent: "violet" },
        ]}
      />

      <div className="space-y-4">
        <MonthlyChart
          title="Unique candidates per day"
          yLabel="Unique candidates"
          month={month}
          data={byDate}
          series={[
            { key: "uniqueCandidateCount", name: "Unique candidates", color: "#3b82f6" },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalCalls", label: "Calls" },
            { key: "uniqueCandidateCount", label: "Candidates", className: "text-emerald-400" },
            { key: "analyzedCount", label: "Analyzed", className: "text-violet-400" },
          ]}
        />
      </div>

      <TablePanel
        title={selectedDate ? `AI HR calls on ${selectedDate}` : "AI HR calls"}
        subtitle={selectedDate ? `${dayRows.length} call${dayRows.length === 1 ? "" : "s"}` : undefined}
        empty={!selectedDate}
      >
        <DataPresentationTable<AiCallingRow>
          data={dayRows}
          columns={aiColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="id"
          stickyHeader
          onRowClick={(r) => setSelected(r)}
          emptyMessage="No AI calls for this date"
        />
      </TablePanel>

      <DrillDownModal
        open={!!selected}
        title={selected?.candidateName ?? selected?.phone ?? "AI HR call"}
        subtitle={selected?.phone ?? undefined}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <DetailRow label="Candidate" value={selected.candidateName ?? "—"} />
              <DetailRow label="Phone" value={selected.phone ?? "—"} />
              <DetailRow label="Duration" value={formatDuration(selected.durationSeconds)} />
              <DetailRow label="End Reason" value={selected.endReason ?? "—"} />
              <DetailRow
                label="Analysis Status"
                value={selected.analyzed ? "Analyzed" : selected.analysisStatus ?? "Pending"}
              />
              <DetailRow label="Transcript" value={selected.hasTranscript ? "Available" : "—"} />
              <DetailRow label="Started" value={formatIST(selected.startedAt)} />
              <DetailRow label="Ended" value={formatIST(selected.endedAt)} />
            </div>
            {selected.analysis != null && (
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">Analysis</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  {renderAnalysis(selected.analysis)}
                </pre>
              </div>
            )}
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
  const { byDate, loadingMonth, selectedDate, dayRows, loadingDay, loadDay } =
    useMonthDay<RealHrByDateRow, RealHrRow>(
      month,
      (m) => fetchRealHrMonth(m),
      (d) => fetchRealHrDay(d),
      [refreshKey]
    );

  const [selected, setSelected] = useState<RealHrRow | null>(null);

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

  return (
    <div className="space-y-6">
      <StatCards
        items={[
          { label: "Total Calls", value: totals.totalCalls, accent: "blue" },
          { label: "Recorded", value: totals.recordedCount, accent: "emerald" },
          { label: "Analyzed", value: totals.analyzedCount, accent: "violet" },
          { label: "Lead-days", value: totals.uniqueLeadCount, accent: "amber" },
        ]}
      />

      <div className="space-y-4">
        <MonthlyChart
          title="Unique leads per day"
          yLabel="Number of Students "
          month={month}
          data={byDate}
          series={[
            { key: "uniqueLeadCount", name: "Unique leads", color: "#3b82f6" },
          ]}
        />
        <ResultsCalendar
          month={month}
          data={byDate}
          loading={loadingMonth}
          onMonthChange={onMonthChange}
          onDateSelect={loadDay}
          metrics={[
            { key: "totalCalls", label: "Calls" },
            { key: "recordedCount", label: "Recorded", className: "text-emerald-400" },
            { key: "analyzedCount", label: "Analyzed", className: "text-violet-400" },
          ]}
        />
      </div>

      <TablePanel
        title={selectedDate ? `HR calls on ${selectedDate}` : "HR calls"}
        subtitle={selectedDate ? `${dayRows.length} call${dayRows.length === 1 ? "" : "s"}` : undefined}
        empty={!selectedDate}
      >
        <DataPresentationTable<RealHrRow>
          data={dayRows}
          columns={realHrColumns}
          loading={loadingDay}
          searchable
          paginated
          pageSize={15}
          rowKey="id"
          stickyHeader
          onRowClick={(r) => setSelected(r)}
          emptyMessage="No HR calls for this date"
        />
      </TablePanel>

      <DrillDownModal
        open={!!selected}
        title={selected?.studentName ?? "HR call"}
        subtitle={selected?.phone ?? selected?.email ?? undefined}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
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
            {selected.analysis != null && (
              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">Analysis</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  {renderAnalysis(selected.analysis)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DrillDownModal>
    </div>
  );
}
