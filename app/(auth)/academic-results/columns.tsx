// DataPresentationTable column definitions for each tab.
import React from "react";
import type { Column } from "@/healper/DataPresentationTable";
import {
  formatDuration,
  formatIST,
  type QuizAttemptRow,
  type MockAttemptRow,
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
