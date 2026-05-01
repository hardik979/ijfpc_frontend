"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Award,
  BarChart2,
} from "lucide-react";

/* ============================================================================
 * TYPES
 * ========================================================================== */

export interface ExternalInterviewRaw {
  _id: string;
  student: string;
  company: string;
  round: string;
  roundNumber: number;
  scheduledDate: string;
  scheduledTime: string;
  scheduledAt: string;
  estimatedDuration: number;
  status: string;
  adminReviewed: boolean;
  isMock: boolean;
  rescheduleHistory: any[];
  createdAt: string;
  updatedAt: string;
  actualStartTime?: string;
  actualEndTime?: string;
  studentName: string;
  studentEmail: string;
  studentBatch: string;
  studentRollNumber: string;
}

export interface GroupSummaryStudent {
  name: string;
  avgScore: number;
  evaluatedCalls: number;
  totalCalls: number;
}

export interface GroupSummary {
  totalStudents: number;
  totalCalls: number;
  wellPerforming: {
    count: number;
    students: GroupSummaryStudent[];
    summary: string;
  };
  underperforming: {
    count: number;
    students: GroupSummaryStudent[];
    summary: string;
  };
}

interface InterviewSummaryPanelProps {
  externalInterviews: ExternalInterviewRaw[];
  groupSummary: GroupSummary | null;
  selectedDate?: string;
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

const getRoundStatusColor = (status: string) => {
  const s = status.toLowerCase().trim();
  if (s === "completed" || s === "cleared" || s === "passed")
    return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", label: "Completed" };
  if (s === "failed" || s === "rejected")
    return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500", label: "Failed" };
  if (s === "scheduled" || s === "confirmed")
    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "Scheduled" };
  return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400", label: "Pending" };
};

const getScoreColor = (score: number) => {
  if (score > 0.3) return "text-green-700";
  if (score > 0) return "text-amber-700";
  return "text-red-700";
};

const getScoreBg = (score: number) => {
  if (score > 0.3) return "bg-green-50 border-green-200";
  if (score > 0) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
};

const formatTime = (iso?: string) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const formatDateShort = (iso: string) => {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ============================================================================
 * SUB-COMPONENTS
 * ========================================================================== */

const StudentScoreCard: React.FC<{ student: GroupSummaryStudent; rank: number }> = ({ student, rank }) => {
  const scorePercent = Math.round(student.avgScore * 100);
  const isPositive = student.avgScore > 0;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${getScoreBg(student.avgScore)}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center text-sm font-bold text-[#8B4513] shadow-sm border border-white/50">
            #{rank}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#3E2723] text-sm truncate">{student.name}</p>
            <p className="text-[10px] text-[#8A7968]">{student.evaluatedCalls}/{student.totalCalls} calls evaluated</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${getScoreColor(student.avgScore)} bg-white border border-white shadow-sm`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {scorePercent > 0 ? "+" : ""}{scorePercent}%
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isPositive ? "bg-green-500" : "bg-red-400"}`}
          style={{ width: `${Math.min(Math.abs(scorePercent) + 10, 100)}%` }}
        />
      </div>
    </div>
  );
};

/* ============================================================================
 * MAIN COMPONENT
 * ========================================================================== */

export default function InterviewSummaryPanel({
  externalInterviews,
  groupSummary,
  selectedDate,
}: InterviewSummaryPanelProps) {
  const [showAllInterviews, setShowAllInterviews] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<"well" | "under" | null>(null);

  /* ── Today's interviews ── */
  const todaysInterviews = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return externalInterviews.filter((iv) => iv.scheduledDate?.slice(0, 10) === today);
  }, [externalInterviews]);

  /* ── Group by company ── */
  const interviewsByCompany = useMemo(() => {
    const map = new Map<string, ExternalInterviewRaw[]>();
    for (const iv of externalInterviews) {
      const arr = map.get(iv.company) ?? [];
      arr.push(iv);
      map.set(iv.company, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [externalInterviews]);

  /* ── Unique students ── */
  const uniqueStudents = useMemo(() => {
    return new Set(externalInterviews.map((iv) => iv.studentEmail)).size;
  }, [externalInterviews]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts = { completed: 0, pending: 0, scheduled: 0, failed: 0 };
    for (const iv of externalInterviews) {
      const s = iv.status.toLowerCase().trim();
      if (s === "completed" || s === "cleared" || s === "passed") counts.completed++;
      else if (s === "failed" || s === "rejected") counts.failed++;
      else if (s === "scheduled" || s === "confirmed") counts.scheduled++;
      else counts.pending++;
    }
    return counts;
  }, [externalInterviews]);

  const displayedInterviews = showAllInterviews ? externalInterviews : externalInterviews.slice(0, 6);
  const hasNoData = externalInterviews.length === 0 && !groupSummary;

  if (hasNoData) return null;

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ═══════════════════ INTERVIEW OVERVIEW STATS ═══════════════════ */}
      {externalInterviews.length > 0 && (
        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Building2 className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2D1F16]">Interview Pipeline</h3>
                <p className="text-sm text-[#7A6753]">
                  {externalInterviews.length} total interviews · {uniqueStudents} students · {interviewsByCompany.length} companies
                </p>
              </div>
            </div>
            {selectedDate && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF5EC] border border-[#E5D9C6] px-3 py-1.5 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-[#8B4513]" />
                <span className="text-xs font-semibold text-[#5D4037]">{selectedDate}</span>
              </div>
            )}
          </div>

          {/* Status counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-center">
              <p className="text-2xl font-black text-green-800">{statusCounts.completed}</p>
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Completed</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-black text-blue-800">{statusCounts.scheduled}</p>
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Scheduled</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center">
              <p className="text-2xl font-black text-amber-800">{statusCounts.pending}</p>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center">
              <p className="text-2xl font-black text-red-800">{statusCounts.failed}</p>
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Failed</p>
            </div>
          </div>        

          {/* Interview table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E9E2D6]">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#FAF5EC] text-[#5D4037]">
                <tr>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Student</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Company</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Round</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Time</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Duration</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Batch</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Roll No.</th>
                  <th className="px-4 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E2D6] bg-white">
                {displayedInterviews.map((iv, idx) => {
                  const status = getRoundStatusColor(iv.status);
                  const startTime = formatTime(iv.actualStartTime) || iv.scheduledTime;
                  const endTime = formatTime(iv.actualEndTime);
                  return (
                    <tr key={iv._id + idx} className="hover:bg-[#FAF5EC]/40 transition-colors">
                      <td className="px-4 py-3 text-left align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                            {iv.studentName?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#3E2723] text-sm truncate">{iv.studentName || "—"}</p>
                            <p className="text-[10px] text-[#8A7968] truncate">{iv.studentEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-[#3E2723]">{iv.company || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                        <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                          Round {iv.round}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#8A7968]" />
                          <span className="text-xs font-semibold text-[#5D4037]">
                            {startTime}{endTime ? ` — ${endTime}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap text-xs text-[#5D4037]">
                        {iv.estimatedDuration ? `${iv.estimatedDuration} min` : "—"}
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                        <span className="text-[10px] font-semibold text-[#8A7968] uppercase tracking-wider">
                          {iv.studentBatch || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap text-xs text-[#8A7968]">
                        {iv.studentRollNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${status.bg} ${status.text} ${status.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {externalInterviews.length > 6 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllInterviews(!showAllInterviews)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border-2 border-[#E5D9C6] bg-white text-sm font-bold text-[#8B4513] hover:bg-[#FAF5EC] transition-all shadow-sm"
              >
                {showAllInterviews ? (
                  <><ChevronUp className="w-4 h-4" />Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4" />Show All {externalInterviews.length} Interviews</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ GROUP SUMMARY ═══════════════════ */}
      {groupSummary && (
        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-[#8B4513] rounded-xl shadow-md">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D1F16]">Group Performance Summary</h3>
              <p className="text-sm text-[#7A6753]">
                {groupSummary.totalStudents} students · {groupSummary.totalCalls} total calls
              </p>
            </div>
          </div>

          {/* Overview KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-[#E9E2D6] bg-[#FAF5EC] p-3 text-center">
              <p className="text-2xl font-black text-[#3E2723]">{groupSummary.totalStudents}</p>
              <p className="text-[10px] font-semibold text-[#8B4513] uppercase tracking-wider">Students</p>
            </div>
            <div className="rounded-2xl border border-[#E9E2D6] bg-[#FAF5EC] p-3 text-center">
              <p className="text-2xl font-black text-[#3E2723]">{groupSummary.totalCalls}</p>
              <p className="text-[10px] font-semibold text-[#8B4513] uppercase tracking-wider">Total Calls</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-center">
              <p className="text-2xl font-black text-green-800">{groupSummary.wellPerforming.count}</p>
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Top Performers</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center">
              <p className="text-2xl font-black text-red-800">{groupSummary.underperforming.count}</p>
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Need Improvement</p>
            </div>
          </div>

          {/* Well Performing Section */}
          <div className="mb-4">
            <button
              onClick={() => setExpandedSummary(expandedSummary === "well" ? null : "well")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-green-50 to-white border border-green-200 hover:border-green-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Award className="w-5 h-5 text-green-700" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-green-900 text-sm">Well Performing Students</p>
                  <p className="text-xs text-green-700">{groupSummary.wellPerforming.count} student{groupSummary.wellPerforming.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {expandedSummary === "well" ? <ChevronUp className="w-5 h-5 text-green-600" /> : <ChevronDown className="w-5 h-5 text-green-600" />}
            </button>

            {expandedSummary === "well" && (
              <div className="mt-3 space-y-3 px-2">
                {groupSummary.wellPerforming.students.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupSummary.wellPerforming.students.map((s, idx) => (
                        <StudentScoreCard key={s.name + idx} student={s} rank={idx + 1} />
                      ))}
                    </div>
                    {groupSummary.wellPerforming.summary && (
                      <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
                        <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Summary</p>
                        <p className="text-sm text-green-900 leading-relaxed">{groupSummary.wellPerforming.summary}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-2xl bg-green-50/50 border border-green-100 text-center">
                    <p className="text-sm text-green-700">{groupSummary.wellPerforming.summary || "No students in this category."}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Underperforming Section */}
          <div>
            <button
              onClick={() => setExpandedSummary(expandedSummary === "under" ? null : "under")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-50 to-white border border-red-200 hover:border-red-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-red-900 text-sm">Needs Improvement</p>
                  <p className="text-xs text-red-700">{groupSummary.underperforming.count} student{groupSummary.underperforming.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {expandedSummary === "under" ? <ChevronUp className="w-5 h-5 text-red-600" /> : <ChevronDown className="w-5 h-5 text-red-600" />}
            </button>

            {expandedSummary === "under" && (
              <div className="mt-3 space-y-3 px-2">
                {groupSummary.underperforming.students.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupSummary.underperforming.students.map((s, idx) => (
                        <StudentScoreCard key={s.name + idx} student={s} rank={idx + 1} />
                      ))}
                    </div>
                    {groupSummary.underperforming.summary && (
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                        <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">Detailed Feedback</p>
                        <p className="text-sm text-red-900 leading-relaxed whitespace-pre-line">{groupSummary.underperforming.summary}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-center">
                    <p className="text-sm text-red-700">{groupSummary.underperforming.summary || "No students in this category."}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}