// DataPresentationTable column definitions for each tab.
import React from "react";
import type { Column } from "@/healper/DataPresentationTable";
import {
  formatDuration,
  formatIST,
  MOCK_LEVEL_LABEL,
  type QuizAttemptRow,
  type MockAttemptRow,
  type MockLevel,
  type MockStudentRow,
  type AiCallingRow,
  type RealHrRow,
} from "./data";

const dash = <span className="text-gray-400">—</span>;

const chip = (text: string) => (
  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
    {text}
  </span>
);

const badge = (text: string, cls: string) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
  >
    {text}
  </span>
);

/* ----------------------------- Daily Quiz ----------------------------- */
export const quizColumns: Column<QuizAttemptRow>[] = [
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
    render: (r) => (r.quizTitle ? r.quizTitle : dash),
  },
  {
    key: "section",
    header: "Section",
    accessor: "section",
    sortable: true,
    render: (r) => (r.section ? chip(r.section) : dash),
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
        p >= 75 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600";
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
      r.isEvaluated
        ? badge("Evaluated", "bg-green-50 text-green-700")
        : badge("Pending", "bg-amber-50 text-amber-700"),
  },
  {
    key: "attemptedAt",
    header: "Attempted At",
    accessor: "attemptedAt",
    sortable: true,
    render: (r) => formatIST(r.attemptedAt),
  },
];

/* --------------------------- Mock Interview --------------------------- */
export const mockColumns: Column<MockAttemptRow>[] = [
  {
    key: "name",
    header: "Student",
    accessor: (r) => r.name ?? r.email ?? "—",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{r.name ?? "—"}</span>
        {r.email && <span className="text-xs text-gray-500">{r.email}</span>}
      </div>
    ),
  },
  {
    key: "interviewType",
    header: "Interview Type",
    accessor: "interviewType",
    sortable: true,
    searchable: true,
    render: (r) => (r.interviewType ? chip(r.interviewType) : dash),
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
      if (r.evaluation == null) return dash;
      const v = String(r.evaluation).toLowerCase();
      const color =
        v.includes("pass") || v === "true"
          ? "bg-green-50 text-green-700"
          : v.includes("fail") || v === "false"
          ? "bg-red-50 text-red-700"
          : "bg-gray-100 text-gray-700";
      return badge(String(r.evaluation), color);
    },
  },
  {
    key: "completed",
    header: "Status",
    accessor: "completed",
    sortable: true,
    align: "center",
    render: (r) =>
      r.completed
        ? badge("Completed", "bg-green-50 text-green-700")
        : badge("Incomplete", "bg-amber-50 text-amber-700"),
  },
  {
    key: "endedReason",
    header: "Ended Reason",
    accessor: "endedReason",
    sortable: true,
    render: (r) =>
      r.endedReason ? (
        <span className="text-xs text-gray-600">{r.endedReason}</span>
      ) : (
        dash
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
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:underline text-xs font-medium"
        >
          Listen
        </a>
      ) : (
        dash
      ),
  },
  {
    key: "createdAt",
    header: "Attempted At",
    accessor: "createdAt",
    sortable: true,
    render: (r) => formatIST(r.createdAt),
  },
];

/* ------------------ Mock Interview — unique students ------------------ */
const LEVEL_BADGE: Record<MockLevel, string> = {
  strong: "bg-emerald-50 text-emerald-700",
  average: "bg-amber-50 text-amber-700",
  needs: "bg-rose-50 text-rose-700",
};

/** Colored pill for a Strong / Average / Needs-work level. */
export function mockLevelBadge(level: MockLevel) {
  return badge(MOCK_LEVEL_LABEL[level], LEVEL_BADGE[level]);
}

// Solid saturated badges with white text so they stay high-contrast on both the
// light table and a darkened page; the colored box-shadow gives the glow.
const LEVEL_SOLID: Record<MockLevel, { bg: string; glow: string }> = {
  strong: { bg: "bg-emerald-600", glow: "rgba(16,185,129,0.75)" },
  average: { bg: "bg-amber-600", glow: "rgba(245,158,11,0.75)" },
  needs: { bg: "bg-rose-600", glow: "rgba(244,63,94,0.75)" },
};

const levelPill = (level: MockLevel, count: number) => {
  const g = LEVEL_SOLID[level];
  return (
    <span
      key={level}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${g.bg}`}
      style={{ boxShadow: `0 0 10px 0 ${g.glow}` }}
    >
      {MOCK_LEVEL_LABEL[level]}
      {count > 1 ? ` ×${count}` : ""}
    </span>
  );
};

// One compact "Result" cell: a glowing label per level the student actually hit
// (no sea of dashes), e.g. [Average] or [Strong ×2] [Needs work ×1].
const resultBadges = (r: MockStudentRow) => {
  const levels = (["strong", "average", "needs"] as MockLevel[]).filter(
    (l) => r[l] > 0
  );
  if (levels.length === 0) return dash;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {levels.map((l) => levelPill(l, r[l]))}
    </div>
  );
};

const glowTotal = (n: number) => (
  <span
    className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-indigo-600 px-2 text-sm font-bold text-white"
    style={{ boxShadow: "0 0 10px 0 rgba(99,102,241,0.75)" }}
  >
    {n}
  </span>
);

export const mockStudentColumns: Column<MockStudentRow>[] = [
  {
    key: "name",
    header: "Student",
    accessor: (r) => r.name ?? r.email ?? "—",
    sortable: true,
    searchable: true,
    render: (r) => {
      const hasName = Boolean(r.name && r.name.trim());
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {hasName ? r.name : r.email ?? "Unknown student"}
          </span>
          {hasName && r.email && (
            <span className="text-xs text-gray-500">{r.email}</span>
          )}
        </div>
      );
    },
  },
  {
    key: "total",
    header: "Interviews",
    accessor: (r) => r.total,
    sortable: true,
    align: "center",
    render: (r) => glowTotal(r.total),
  },
  {
    key: "result",
    header: "Result",
    // Sort by performance: more/stronger results rank higher.
    accessor: (r) => r.strong * 100 + r.average * 10 + r.needs,
    sortable: true,
    align: "center",
    render: (r) => resultBadges(r),
  },
  {
    key: "lastAttemptAt",
    header: "Last Attempt",
    accessor: "lastAttemptAt",
    sortable: true,
    render: (r) => formatIST(r.lastAttemptAt),
  },
];

/* --------------------------- AI HR Calling ---------------------------- */
export const aiColumns: Column<AiCallingRow>[] = [
  {
    key: "candidateName",
    header: "Candidate",
    accessor: (r) => r.candidateName ?? r.phone ?? "—",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {r.candidateName ?? "—"}
        </span>
        {r.phone && <span className="text-xs text-gray-500">{r.phone}</span>}
      </div>
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
    key: "endReason",
    header: "End Reason",
    accessor: "endReason",
    sortable: true,
    render: (r) =>
      r.endReason ? (
        <span className="text-xs text-gray-600">{r.endReason}</span>
      ) : (
        dash
      ),
  },
  {
    key: "analyzed",
    header: "Analysis",
    accessor: "analyzed",
    sortable: true,
    align: "center",
    render: (r) =>
      r.analyzed
        ? badge("Analyzed", "bg-green-50 text-green-700")
        : badge(r.analysisStatus ?? "Pending", "bg-amber-50 text-amber-700"),
  },
  {
    key: "transcript",
    header: "Transcript",
    accessor: (r) => (r.hasTranscript ? 1 : 0),
    align: "center",
    render: (r) =>
      r.hasTranscript
        ? badge("Available", "bg-gray-100 text-gray-700")
        : dash,
  },
  {
    key: "startedAt",
    header: "Called At",
    accessor: "startedAt",
    sortable: true,
    render: (r) => formatIST(r.startedAt),
  },
];

/* ------------------- Real HR Calling (call recordings) ---------------- */
function recordingStatusBadge(status: string | null) {
  if (!status) return dash;
  const s = status.toUpperCase();
  if (s === "DONE") return badge("Done", "bg-green-50 text-green-700");
  if (s === "FAILED") return badge("Failed", "bg-red-50 text-red-700");
  return badge(status, "bg-amber-50 text-amber-700");
}

export const realHrColumns: Column<RealHrRow>[] = [
  {
    key: "studentName",
    header: "Lead / Student",
    accessor: "studentName",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{r.studentName}</span>
        {r.email && <span className="text-xs text-gray-500">{r.email}</span>}
      </div>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    accessor: "phone",
    sortable: true,
    searchable: true,
    render: (r) =>
      r.phone ? <span className="text-xs text-gray-600">{r.phone}</span> : dash,
  },
  {
    key: "type",
    header: "Type",
    accessor: "type",
    sortable: true,
    align: "center",
    render: (r) =>
      r.type === "manual"
        ? badge(r.manualStatus ?? "Manual", "bg-gray-100 text-gray-700")
        : chip("Recording"),
  },
  {
    key: "duration",
    header: "Duration",
    align: "right",
    sortable: true,
    accessor: (r) => r.durationSeconds,
    render: (r) => (
      <span>{r.durationLabel ?? formatDuration(r.durationSeconds)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: "status",
    sortable: true,
    align: "center",
    render: (r) => recordingStatusBadge(r.status),
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
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:underline text-xs font-medium"
        >
          Listen
        </a>
      ) : (
        dash
      ),
  },
  {
    key: "createdAt",
    header: "Called At",
    accessor: "createdAt",
    sortable: true,
    render: (r) => formatIST(r.createdAt),
  },
];
