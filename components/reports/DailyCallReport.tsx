"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Download,
  Users,
  PhoneCall,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  RefreshCw,
  PhoneForwarded,
  X,
  BarChart2,
  Calendar,
  Star,
  Play,
  FileText,
  Headphones,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Timer,
  Search,
} from "lucide-react";

interface ImprovementIssue {
  category?: string;
  problem?: string;
  suggestion?: string;
  whyItMatters?: string;
  evidenceQuote?: string;
}

interface RecordingReport {
  _id: string;
  leadId: string;
  originalFileName: string;
  status: string;
  analysis?: {
    outcome?: string;
    outcomeCode?: string;
    confidence?: string;
    summary?: string;
    followUpRequired?: boolean;
    followUpAction?: string | null;
    keyDetails?: {
      studentName?: string | null;
      hrName?: string | null;
      callDuration?: string | null;
      languageUsed?: string | null;
    };
    areasOfImprovement?: {
      overallCallQuality?: "poor" | "average" | "good" | "excellent";
      improvementNeeded?: boolean;
      issues?: ImprovementIssue[];
      hrPerformanceFeedback?: string;
      studentResponseFeedback?: string;
    };
    flags?: string[];
  };
  type?: "recording" | "manual";
  manualStatus?: string;
  studentName: string;
  phone: string;
  email: string;
  createdAt: string;
  publicUrl?: string;
  transcriptClean?: string;
  transcriptRaw?: string;
}

interface DailyCallReportProps {
  reports: RecordingReport[];
  selectedDate: string;
}

type Sentiment = "pos" | "neg" | "neutral";

interface StudentStats {
  leadId: string;
  name: string;
  phone: string;
  email: string;
  total: number;
  manual: number;
  pos: number;
  neg: number;
  neutral: number;
  followUps: number;
  numbers: Set<string>;
  qualityScores: number[];
  uniqueNumbers: number;
  conversionRate: number;
  avgQualityScore: number;
  overview: "poor" | "average" | "good" | "excellent";
  calls: RecordingReport[];
  totalDurationSeconds: number;
  avgDurationSeconds: number;
}

// Helper function to parse duration string to seconds
const parseDurationToSeconds = (duration: string | null | undefined): number => {
  if (!duration) return 0;

  // Handle formats like "5:30", "05:30", "1:05:30" (HH:MM:SS or MM:SS)
  const parts = duration.split(':').map(p => parseInt(p, 10));

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // Just seconds
    return parts[0];
  }

  return 0;
};

// Helper function to format seconds to MM:SS or HH:MM:SS
const formatDuration = (seconds: number): string => {
  if (seconds === 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const StarRating = ({ rating }: { rating: number }) => {
  const stars = [1, 2, 3, 4];

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating
            ? "fill-amber-400 text-amber-400"
            : "fill-gray-200 text-gray-200"
            }`}
        />
      ))}
    </div>
  );
};

export default function DailyCallReport({
  reports,
  selectedDate,
}: DailyCallReportProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<"positive" | "negative" | "neutral" | "total" | "students" | "avgDuration" | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<RecordingReport | null>(null);
  const [showCommonFeedback, setShowCommonFeedback] = useState(false);

  const analytics = useMemo(() => {
    let totalCalls = reports.length;
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let manualLogs = 0;
    let followUps = 0;
    let totalDurationSeconds = 0;
    let callsWithDuration = 0;

    const studentStats: Record<string, {
      leadId: string;
      name: string;
      phone: string;
      email: string;
      total: number;
      manual: number;
      pos: number;
      neg: number;
      neutral: number;
      followUps: number;
      numbers: Set<string>;
      qualityScores: number[];
      calls: RecordingReport[];
      totalDurationSeconds: number;
    }> = {};

    const qualityScoreMap: Record<string, number> = {
      poor: 1,
      average: 2,
      good: 3,
      excellent: 4,
    };

    const scoreToOverview = (score: number): "poor" | "average" | "good" | "excellent" => {
      if (score >= 3.5) return "excellent";
      if (score >= 2.5) return "good";
      if (score >= 1.5) return "average";
      return "poor";
    };

    reports.forEach((r) => {
      const outcome = (r.analysis?.outcome || "").toUpperCase();
      const code = (r.analysis?.outcomeCode || "").toUpperCase();

      const hasNegative = [
        "NOT_INTERESTED",
        "DISCONNECTED",
        "WRONG_NUMBER",
        "REJECTED",
        "NO_OPENING",
        "INVALID_NUMBER",
        "DNP",
      ].some((s) => outcome.includes(s) || code.includes(s));

      const hasPositive = [
        "INTERESTED",
        "SUCCESS",
        "CALLBACK",
        "CALLBACK_REQUESTED",
        "INFO_SHARED",
        "RESUME_REQUESTED",
      ].some((s) => outcome.includes(s) || code.includes(s));

      let sentiment: Sentiment = "neutral";

      if (r.type === "manual") {
        sentiment = "neg";
        manualLogs++;
      } else if (hasNegative) {
        sentiment = "neg";
      } else if (hasPositive) {
        if (
          outcome.includes("INFO_SHARED") ||
          code.includes("INFO_SHARED") ||
          outcome.includes("CALLBACK_REQUESTED") ||
          code.includes("CALLBACK_REQUESTED")
        ) {
          sentiment = "neutral";
        } else {
          sentiment = "pos";
        }
      }

      if (sentiment === "pos") positive++;
      else if (sentiment === "neg") negative++;
      else neutral++;

      if (r.analysis?.followUpRequired) followUps++;

      // Parse call duration
      const durationSeconds = parseDurationToSeconds(r.analysis?.keyDetails?.callDuration);
      if (durationSeconds > 0) {
        totalDurationSeconds += durationSeconds;
        callsWithDuration++;
      }

      if (!studentStats[r.leadId]) {
        studentStats[r.leadId] = {
          leadId: r.leadId,
          name: r.studentName || "Unknown Student",
          phone: r.phone || "N/A",
          email: r.email || "N/A",
          total: 0,
          manual: 0,
          pos: 0,
          neg: 0,
          neutral: 0,
          followUps: 0,
          numbers: new Set(),
          qualityScores: [],
          calls: [],
          totalDurationSeconds: 0,
        };
      }

      const current = studentStats[r.leadId];
      current.total++;
      current.calls.push(r);

      if (r.type === "manual") current.manual++;
      if (sentiment === "pos") current.pos++;
      if (sentiment === "neg") current.neg++;
      if (sentiment === "neutral") current.neutral++;
      if (r.analysis?.followUpRequired) current.followUps++;

      if (durationSeconds > 0) {
        current.totalDurationSeconds += durationSeconds;
      }

      const quality =
        r.analysis?.areasOfImprovement?.overallCallQuality?.toLowerCase() ||
        "average";

      const qualityScore = qualityScoreMap[quality] || 2;
      current.qualityScores.push(qualityScore);

      const numberMatch =
        r.originalFileName?.match(/\d{10,}/)?.[0] ||
        r.phone?.match(/\d{10,}/)?.[0];

      if (numberMatch) current.numbers.add(numberMatch);
    });

    const students: StudentStats[] = Object.values(studentStats)
      .map((s) => {
        const avgQualityScore =
          s.qualityScores.length > 0
            ? s.qualityScores.reduce((sum, score) => sum + score, 0) /
            s.qualityScores.length
            : 2;

        const overview = scoreToOverview(avgQualityScore);

        const avgDurationSeconds = s.total > 0 ? Math.round(s.totalDurationSeconds / s.total) : 0;

        return {
          ...s,
          uniqueNumbers: s.numbers.size,
          conversionRate:
            s.total > 0 ? Math.round((s.pos / s.total) * 100) : 0,
          avgQualityScore: Number(avgQualityScore.toFixed(2)),
          overview,
          avgDurationSeconds,
        };
      })
      .sort((a, b) => b.total - a.total);

    const totalStudents = students.length;
    const conversionRate =
      totalCalls > 0 ? Math.round((positive / totalCalls) * 100) : 0;
    const negativeRate =
      totalCalls > 0 ? Math.round((negative / totalCalls) * 100) : 0;
    const neutralRate =
      totalCalls > 0 ? Math.round((neutral / totalCalls) * 100) : 0;

    const avgDurationSeconds = callsWithDuration > 0 ? Math.round(totalDurationSeconds / callsWithDuration) : 0;

    const sentimentData = [
      { name: "Positive", value: positive, color: "#16a34a" },
      { name: "Negative", value: negative, color: "#dc2626" },
      { name: "Neutral", value: neutral, color: "#d97706" },
    ].filter((item) => item.value > 0);

    const performanceData = students.slice(0, 8).map((s) => ({
      name: s.name.split(" ")[0],
      Positive: s.pos,
      Negative: s.neg,
      Neutral: s.neutral,
    }));

    return {
      totalCalls,
      totalStudents,
      positive,
      negative,
      neutral,
      manualLogs,
      followUps,
      conversionRate,
      negativeRate,
      neutralRate,
      students,
      sentimentData,
      performanceData,
      totalDurationSeconds,
      avgDurationSeconds,
      callsWithDuration,
    };
  }, [reports]);

  const commonFeedback = useMemo(() => {
    const feedbackMap = new Map<string, {
      category: string;
      problem: string;
      count: number;
      students: {
        name: string;
        email: string;
        leadId: string;
        evidenceQuote?: string;
      }[];
      suggestion: string;
      whyItMatters: string;
    }>();

    reports.forEach((report) => {
      const issues = report.analysis?.areasOfImprovement?.issues;
      if (!issues || issues.length === 0) return;

      issues.forEach((issue) => {
        if (!issue.category || !issue.problem) return;

        const key = `${issue.category}::${issue.problem}`;

        if (feedbackMap.has(key)) {
          const existing = feedbackMap.get(key)!;
          existing.count++;
          existing.students.push({
            name: report.studentName,
            email: report.email,
            leadId: report.leadId,
            evidenceQuote: issue.evidenceQuote,
          });
        } else {
          feedbackMap.set(key, {
            category: issue.category,
            problem: issue.problem,
            count: 1,
            students: [{
              name: report.studentName,
              email: report.email,
              leadId: report.leadId,
              evidenceQuote: issue.evidenceQuote,
            }],
            suggestion: issue.suggestion || "N/A",
            whyItMatters: issue.whyItMatters || "N/A",
          });
        }
      });
    });

    return Array.from(feedbackMap.values()).sort((a, b) => b.count - a.count);
  }, [reports]);

  const selectedStudent = analytics.students.find(
    (s) => s.leadId === selectedStudentId
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Opening: "border-blue-400",
      "Need Discovery": "border-purple-400",
      "Pitch Clarity": "border-green-400",
      "Objection Handling": "border-red-400",
      Closing: "border-yellow-400",
      "Rapport Building": "border-pink-400",
      "Follow-up Clarity": "border-indigo-400",
    };
    return colors[category] || "border-gray-400";
  };

  const downloadCSV = () => {
    const headers = [
      "Student Name",
      "Email",
      "Total Calls",
      "Manual Logs",
      "Unique Numbers",
      "Positive",
      "Negative",
      "Neutral",
      "Follow Ups",
      "Conversion Rate %",
      "Quality Rating",
      "Avg Duration",
    ];

    const rows = analytics.students.map((s) => [
      s.name,
      s.email,
      s.total,
      s.manual,
      s.uniqueNumbers,
      s.pos,
      s.neg,
      s.neutral,
      s.followUps,
      s.conversionRate,
      `${Math.round(s.avgQualityScore)}/4`,
      formatDuration(s.avgDurationSeconds),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Daily_Call_Report_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardBase =
    "rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm p-4 sm:p-5 lg:p-6";
  const labelClass =
    "text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#9A7B5A] font-medium";
  const valueClass = "text-2xl sm:text-3xl font-semibold text-[#2D1F16]";

  return (
    <div className="flex-1 overflow-y-auto bg-[#FCFAF6] px-3 sm:px-4 lg:px-6 pb-10 sm:pb-16 pt-4">
      <div className="space-y-5 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#EEE6D9] bg-gradient-to-r from-white to-[#FAF5EC] p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#A1784E]">
                Daily Call Intelligence
              </p>
              <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-[#2D1F16] leading-tight">
                Call Performance Dashboard
              </h2>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCommonFeedback(true)}
                disabled={commonFeedback.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E7D9C6] bg-gradient-to-r from-purple-500 to-purple-600 px-4 sm:px-5 py-3 text-sm font-medium text-white transition hover:from-purple-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              >
                <Search className="h-4 w-4" />
                Common Issues ({commonFeedback.length})
              </button>

              <button
                onClick={downloadCSV}
                disabled={analytics.students.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E7D9C6] bg-white px-4 sm:px-5 py-3 text-sm font-medium text-[#8B4513] transition hover:bg-[#8B4513] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 sm:gap-5">
          <div
            onClick={() => setSelectedMetric("total")}
            className={`${cardBase} cursor-pointer hover:border-[#8B4513] hover:shadow-lg transition-all active:scale-[0.98]`}
          >
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#FFF3E7]">
              <PhoneCall className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B4513]" />
            </div>
            <p className={labelClass}>Total Calls</p>
            <p className={valueClass}>{analytics.totalCalls}</p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              All recordings + manual entries
            </p>
          </div>

          <div
            onClick={() => setSelectedMetric("students")}
            className={`${cardBase} cursor-pointer hover:border-[#8B4513] hover:shadow-lg transition-all active:scale-[0.98]`}
          >
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#F4EFE7]">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B4513]" />
            </div>
            <p className={labelClass}>Students</p>
            <p className={valueClass}>{analytics.totalStudents}</p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              Unique students with call activity
            </p>
          </div>

          <div
            onClick={() => setSelectedMetric("avgDuration")}
            className={`${cardBase} cursor-pointer hover:border-purple-600 hover:shadow-lg transition-all active:scale-[0.98]`}
          >
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-purple-50">
              <Timer className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />
            </div>
            <p className={labelClass}>Avg Duration</p>
            <p className="text-2xl sm:text-3xl font-semibold text-purple-700">
              {formatDuration(analytics.avgDurationSeconds)}
            </p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              Average call length today
            </p>
          </div>

          <div
            onClick={() => setSelectedMetric("positive")}
            className={`${cardBase} cursor-pointer hover:border-green-600 hover:shadow-lg transition-all active:scale-[0.98]`}
          >
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-green-50">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
            </div>
            <p className={labelClass}>Positive</p>
            <p className="text-2xl sm:text-3xl font-semibold text-green-700">
              {analytics.positive}
            </p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              Resume requested / success-type calls
            </p>
          </div>

          <div
            onClick={() => setSelectedMetric("negative")}
            className={`${cardBase} cursor-pointer hover:border-red-600 hover:shadow-lg transition-all active:scale-[0.98]`}
          >
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-red-50">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-700" />
            </div>
            <p className={labelClass}>Negative</p>
            <p className="text-2xl sm:text-3xl font-semibold text-red-700">
              {analytics.negative}
            </p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              Rejected / invalid / failed calls
            </p>
          </div>

          <div
            onClick={() => setSelectedMetric("neutral")}
            className={`${cardBase} cursor-pointer hover:border-amber-600 hover:shadow-lg transition-all active:scale-[0.98]`}
          >
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-50">
              <MinusCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700" />
            </div>
            <p className={labelClass}>Neutral</p>
            <p className="text-2xl sm:text-3xl font-semibold text-amber-700">
              {analytics.neutral}
            </p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              In-progress / info shared / no final outcome
            </p>
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className={cardBase}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-green-50 shrink-0">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div className="min-w-0">
                <p className={labelClass}>Conversion Rate</p>
                <p className="text-xl sm:text-2xl font-semibold text-[#2D1F16]">
                  {analytics.conversionRate}%
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#7A6753]">
              Positive calls out of total calls
            </p>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#FFF4EA] shrink-0">
                <RefreshCw className="h-5 w-5 text-[#C47A21]" />
              </div>
              <div className="min-w-0">
                <p className={labelClass}>Follow-up Required</p>
                <p className="text-xl sm:text-2xl font-semibold text-[#2D1F16]">
                  {analytics.followUps}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#7A6753]">
              Calls that still need next action
            </p>
          </div>

          <div className={cardBase}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#F7F1E8] shrink-0">
                <PhoneForwarded className="h-5 w-5 text-[#8B4513]" />
              </div>
              <div className="min-w-0">
                <p className={labelClass}>Call Mix</p>
                <p className="text-lg sm:text-2xl font-semibold text-[#2D1F16] break-words">
                  {analytics.positive} / {analytics.neutral} /{" "}
                  {analytics.negative}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#7A6753]">
              Positive / Neutral / Negative split
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          <div className="xl:col-span-2 rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16]">
                Sentiment Distribution
              </h3>
              <p className="text-xs sm:text-sm text-[#7A6753]">
                Overall call outcome split for the selected day
              </p>
            </div>

            <div className="h-[260px] sm:h-[320px] lg:h-[340px]">
              {analytics.sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sentimentData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {analytics.sentimentData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid #eee2d0",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#9A8572] text-center px-4">
                  No chart data available for {selectedDate}
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-3 rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16]">
                Top Student Performance
              </h3>
              <p className="text-xs sm:text-sm text-[#7A6753]">
                Compare positive, neutral, and negative outcomes by student
              </p>
            </div>

            <div className="h-[280px] sm:h-[320px] lg:h-[340px]">
              {analytics.performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.performanceData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E9DF" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid #eee2d0",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="Positive"
                      fill="#16a34a"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Neutral"
                      fill="#d97706"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Negative"
                      fill="#dc2626"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#9A8572] text-center px-4">
                  No student chart data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend / help box */}
        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#EEE2D2] bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16]">
            How to Read This Dashboard
          </h3>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="font-semibold text-green-800">Positive</p>
              <p className="mt-1 text-sm text-green-700 leading-relaxed">
                Resume requested, clear progress, successful response
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 p-4">
              <p className="font-semibold text-red-800">Negative</p>
              <p className="mt-1 text-sm text-red-700 leading-relaxed">
                Not interested, wrong number, invalid, dead call
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="font-semibold text-amber-800">Neutral</p>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                Information shared, callback requested, still open
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFF7ED] p-4">
              <p className="font-semibold text-[#A86117]">Manual Logs</p>
              <p className="mt-1 text-sm text-[#A86117] leading-relaxed">
                Student manually entered outcome like DNP or invalid number
              </p>
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          <div className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-4">
            <h3 className="text-base font-semibold text-[#2D1F16]">
              Student Call Details
            </h3>
            <p className="mt-1 text-sm text-[#7A6753]">
              Student-wise activity overview • Click for details
            </p>
          </div>

          {analytics.students.length > 0 ? (
            analytics.students.map((s, index) => (
              <div
                key={s.leadId + index}
                onClick={() => setSelectedStudentId(s.leadId)}
                className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-4 cursor-pointer hover:border-[#8B4513] transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EEDC] font-semibold text-[#8B4513] shrink-0">
                    {s.name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D1F16] truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-[#8A7968] break-all">
                      {s.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[#FBF8F3] p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#9A7B5A]">
                      Total
                    </p>
                    <p className="mt-1 font-semibold text-[#2D1F16]">
                      {s.total}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FBF8F3] p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#9A7B5A]">
                      Avg Duration
                    </p>
                    <p className="mt-1 font-semibold text-[#2D1F16]">
                      {formatDuration(s.avgDurationSeconds)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-green-700">
                      Positive
                    </p>
                    <p className="mt-1 font-semibold text-green-700">
                      {s.pos}
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-amber-700">
                      Neutral
                    </p>
                    <p className="mt-1 font-semibold text-amber-700">
                      {s.neutral}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-red-700">
                      Negative
                    </p>
                    <p className="mt-1 font-semibold text-red-700">
                      {s.neg}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F7F3EA] p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#7A5A3A]">
                      Follow-up
                    </p>
                    <p className="mt-1 font-semibold text-[#7A5A3A]">
                      {s.followUps}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-[#7A6753]">Conversion</span>
                    <span className="font-semibold text-[#2D1F16]">
                      {s.conversionRate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F2EADF]">
                    <div
                      className="h-full rounded-full bg-green-600"
                      style={{ width: `${s.conversionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-8 text-center text-sm text-[#9A8572]">
              No records found for this date.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm">
          <div className="border-b border-[#F3ECE2] px-6 py-5">
            <h3 className="text-lg font-semibold text-[#2D1F16]">
              Student Call Details Overview
            </h3>
            <p className="mt-1 text-sm text-[#7A6753]">
              Student-wise activity, quality, and follow-up visibility • Click
              any row for detailed analytics
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#FBF8F3]">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Student
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Total
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Avg Duration
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-green-700">
                    Positive
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Neutral
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700">
                    Negative
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Follow-up
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Conversion
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Quality
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F7F0E6]">
                {analytics.students.length > 0 ? (
                  analytics.students.map((s, index) => (

                    <tr
                      key={s.leadId + index}
                      onClick={() => setSelectedStudentId(s.leadId)}
                      className="hover:bg-[#FFFDF9] cursor-pointer transition-all hover:shadow-md"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EEDC] font-semibold text-[#8B4513]">
                            {s.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <p className="font-medium text-[#2D1F16]">
                              {s.name}
                            </p>
                            <p className="text-xs text-[#8A7968]">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5 text-center font-semibold text-[#2D1F16]">
                        {s.total}
                      </td>

                      <td className="px-4 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1">
                          <Clock className="w-3.5 h-3.5 text-purple-700" />
                          <span className="text-xs font-semibold text-purple-700">
                            {formatDuration(s.avgDurationSeconds)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <span className="rounded-xl bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {s.pos}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <span className="rounded-xl bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {s.neutral}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <span className="rounded-xl bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          {s.neg}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <span className="rounded-xl bg-[#F7F3EA] px-3 py-1 text-xs font-semibold text-[#7A5A3A]">
                          {s.followUps}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <div className="mx-auto w-[90px]">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#2D1F16]">
                              {s.conversionRate}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#F2EADF]">
                            <div
                              className="h-full rounded-full bg-green-600"
                              style={{ width: `${s.conversionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex justify-center">
                          <StarRating rating={Math.round(s.avgQualityScore)} />

                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-16 text-center text-sm text-[#9A8572]"
                    >
                      No records found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student Detail Modal with Full Call Analytics */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#FDFBF7] w-full max-w-7xl max-h-[95vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-[#F5F5DC] rounded-[1.2rem] flex items-center justify-center text-2xl font-medium text-[#8B4513]">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-[#3E2723]">
                    {selectedStudent.name}
                  </h2>
                  <p className="text-[#8D6E63] font-medium text-sm mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {selectedStudent.email}
                    </span>
                    <span className="w-1 h-1 bg-[#D2B48C] rounded-full"></span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {selectedStudent.phone}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="w-12 h-12 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FFFDFB] custom-scrollbar">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-gradient-to-br from-[#8B4513] to-[#A0522D] rounded-[2rem] p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <PhoneCall className="w-8 h-8" />
                    <div className="text-sm opacity-90">Total Calls</div>
                  </div>
                  <div className="text-5xl font-bold">{selectedStudent.total}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Timer className="w-8 h-8" />
                    <div className="text-sm opacity-90">Avg Duration</div>
                  </div>
                  <div className="text-4xl font-bold">
                    {formatDuration(selectedStudent.avgDurationSeconds)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-[2rem] p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="w-8 h-8" />
                    <div className="text-sm opacity-90">Success Rate</div>
                  </div>
                  <div className="text-5xl font-bold">
                    {selectedStudent.conversionRate}%
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Star className="w-8 h-8 fill-white" />
                    <div className="text-sm opacity-90">Quality</div>
                  </div>
                  <div className="text-4xl font-bold capitalize">
                    {selectedStudent.overview}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <RefreshCw className="w-8 h-8" />
                    <div className="text-sm opacity-90">Follow-ups</div>
                  </div>
                  <div className="text-5xl font-bold">
                    {selectedStudent.followUps}
                  </div>
                </div>
              </div>

              {/* Call Distribution and Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5" />
                    Call Distribution
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-sm font-medium text-green-800">
                        ✓ Positive Calls
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-700">
                        {selectedStudent.pos} calls
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <span className="text-sm font-medium text-amber-800">
                        ~ Neutral Calls
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                        {selectedStudent.neutral} calls
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <span className="text-sm font-medium text-red-800">
                        ✗ Negative Calls
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700">
                        {selectedStudent.neg} calls
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">
                        ✎ Manual Logs
                      </span>
                      <span className="text-sm font-bold text-gray-700">
                        {selectedStudent.manual} logs
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#FAF9F6] rounded-xl">
                      <span className="text-sm font-medium text-[#5D4037]">
                        Average Quality Score
                      </span>
                      <span className="text-lg font-bold text-[#8B4513]">
                        {selectedStudent.avgQualityScore}/4.0
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#FAF9F6] rounded-xl">
                      <span className="text-sm font-medium text-[#5D4037]">
                        Average Call Duration
                      </span>
                      <span className="text-lg font-bold text-[#8B4513]">
                        {formatDuration(selectedStudent.avgDurationSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#FAF9F6] rounded-xl">
                      <span className="text-sm font-medium text-[#5D4037]">
                        Unique Phone Numbers
                      </span>
                      <span className="text-lg font-bold text-[#8B4513]">
                        {selectedStudent.uniqueNumbers}
                      </span>
                    </div>
                    <div className="p-3 bg-[#FAF9F6] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#5D4037]">
                          Conversion Rate
                        </span>
                        <span className="text-lg font-bold text-green-700">
                          {selectedStudent.conversionRate}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                          style={{ width: `${selectedStudent.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Calls Timeline */}
              <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-[#3E2723] mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Complete Call History ({selectedStudent.calls.length} Calls)
                </h3>

                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                  {selectedStudent.calls.map((call, index) => {
                    const callDuration = parseDurationToSeconds(call.analysis?.keyDetails?.callDuration);

                    return (
                      <div
                        key={call._id}
                        className="border border-[#F5F5DC] rounded-2xl p-5 hover:bg-[#FAF9F6] hover:border-[#8B4513] transition-all cursor-pointer"
                        onClick={() => setSelectedRecording(call)}
                      >
                        {/* Call Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#8B4513] rounded-xl flex items-center justify-center text-white font-bold">
                              #{selectedStudent.calls.length - index}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#3E2723] flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(call.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              <p className="text-xs text-[#A1887F] flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {new Date(call.createdAt).toLocaleTimeString(
                                  undefined,
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                                {callDuration > 0 && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <Timer className="w-3 h-3" />
                                    {formatDuration(callDuration)}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${call.analysis?.areasOfImprovement
                                ?.overallCallQuality === "excellent"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : call.analysis?.areasOfImprovement
                                  ?.overallCallQuality === "good"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : call.analysis?.areasOfImprovement
                                    ?.overallCallQuality === "average"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                                }`}
                            >
                              {call.analysis?.areasOfImprovement
                                ?.overallCallQuality || "N/A"}
                            </span>
                            {call.type === "manual" && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                Manual Log
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Call Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="bg-[#FAF9F6] rounded-xl p-3">
                            <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                              Outcome
                            </p>
                            <p className="font-semibold text-[#3E2723] text-sm">
                              {call.analysis?.outcome ||
                                call.manualStatus ||
                                "N/A"}
                            </p>
                          </div>

                          <div className="bg-[#FAF9F6] rounded-xl p-3">
                            <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                              Confidence
                            </p>
                            <p className="font-semibold text-[#3E2723] text-sm capitalize">
                              {call.analysis?.confidence || "N/A"}
                            </p>
                          </div>

                          <div className="bg-[#FAF9F6] rounded-xl p-3">
                            <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                              Status
                            </p>
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${call.status === "DONE"
                                ? "bg-green-50 text-green-700"
                                : "bg-orange-50 text-orange-700"
                                }`}
                            >
                              {call.status}
                            </span>
                          </div>
                        </div>

                        {/* Summary */}
                        {call.analysis?.summary && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                            <p className="text-xs uppercase tracking-wider text-blue-700 mb-1 font-semibold">
                              📝 AI Summary
                            </p>
                            <p className="text-sm text-blue-900 leading-relaxed">
                              {call.analysis.summary}
                            </p>
                          </div>
                        )}

                        {/* Follow-up Required */}
                        {call.analysis?.followUpRequired && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                            <p className="text-xs uppercase tracking-wider text-amber-700 mb-1 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Follow-up Required
                            </p>
                            <p className="text-sm text-amber-900">
                              {call.analysis.followUpAction ||
                                "Action required on this call"}
                            </p>
                          </div>
                        )}

                        {/* Issues Preview */}
                        {call.analysis?.areasOfImprovement?.issues &&
                          call.analysis.areasOfImprovement.issues.length > 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                              <p className="text-xs uppercase tracking-wider text-red-700 mb-2 font-semibold">
                                ⚠️ {call.analysis.areasOfImprovement.issues.length}{" "}
                                Issue(s) Found
                              </p>
                              <div className="space-y-2">
                                {call.analysis.areasOfImprovement.issues
                                  .slice(0, 2)
                                  .map((issue, idx) => (
                                    <div key={idx} className="text-sm">
                                      <p className="font-semibold text-red-800">
                                        {issue.category}
                                      </p>
                                      <p className="text-red-700 text-xs">
                                        {issue.problem}
                                      </p>
                                    </div>
                                  ))}
                                {call.analysis.areasOfImprovement.issues.length >
                                  2 && (
                                    <p className="text-xs text-red-600 italic">
                                      +
                                      {call.analysis.areasOfImprovement.issues
                                        .length - 2}{" "}
                                      more issues (click to view all)
                                    </p>
                                  )}
                              </div>
                            </div>
                          )}

                        {/* View Full Details Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecording(call);
                          }}
                          className="mt-4 w-full px-4 py-2.5 bg-[#8B4513] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#5D4037] transition-all"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          View Complete Analysis & Recording
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Recording Detail Modal (Same as CallAnalysis) */}
      {selectedRecording && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#FDFBF7] w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-[#8B4513] rounded-xl flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-[#3E2723]">
                    Complete Call Analysis
                  </h2>
                  <p className="text-[#8D6E63] font-medium text-xs font-sans flex items-center gap-2">
                    {selectedRecording.studentName} •{" "}
                    {new Date(selectedRecording.createdAt).toLocaleDateString()}
                    {selectedRecording.analysis?.keyDetails?.callDuration && (
                      <>
                        <span className="w-1 h-1 bg-[#D2B48C] rounded-full"></span>
                        <Clock className="w-3 h-3" />
                        {selectedRecording.analysis.keyDetails.callDuration}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecording(null)}
                className="w-10 h-10 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {selectedRecording.type === "manual" ? (
                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-10 shadow-sm text-center space-y-4">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <Phone className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-medium text-[#3E2723]">
                    Manual Call Log
                  </h3>
                  <p className="text-[#8D6E63] font-medium">
                    This report was manually logged by the student.
                  </p>
                  <div className="inline-block px-8 py-4 bg-[#FAF9F6] border border-[#F5F5DC] rounded-2xl text-xl font-bold text-[#8B4513]">
                    {selectedRecording.manualStatus?.replace("_", " ")}
                  </div>
                </div>
              ) : (
                <>
                  {/* Audio Player */}
                  {selectedRecording.publicUrl && (
                    <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
                      <Play className="w-10 h-10 text-[#8B4513] fill-[#8B4513] hidden md:block" />
                      <div className="flex-1 w-full space-y-3">
                        <p className="font-medium text-[#5D4037] text-lg">
                          🎧 Playback Recording
                        </p>
                        <audio
                          controls
                          src={selectedRecording.publicUrl}
                          className="w-full h-10 rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Key Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-[2rem] p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                        <BarChart2 className="w-5 h-5" /> AI Analysis Outcome
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-widest">
                            Outcome Code
                          </span>
                          <p className="text-2xl font-bold text-blue-900 mt-1">
                            {selectedRecording.analysis?.outcomeCode || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-widest">
                            Outcome
                          </span>
                          <p className="text-xl font-semibold text-blue-800 mt-1">
                            {selectedRecording.analysis?.outcome || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-widest">
                            Confidence Level
                          </span>
                          <p className="text-lg font-semibold text-blue-800 mt-1 capitalize">
                            {selectedRecording.analysis?.confidence || "N/A"}
                          </p>
                        </div>
                        {selectedRecording.analysis?.keyDetails?.callDuration && (
                          <div>
                            <span className="text-xs font-medium text-blue-700 uppercase tracking-widest">
                              Call Duration
                            </span>
                            <p className="text-lg font-semibold text-blue-800 mt-1 flex items-center gap-2">
                              <Timer className="w-4 h-4" />
                              {selectedRecording.analysis.keyDetails.callDuration}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-[2rem] p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-purple-900 mb-4">
                        <FileText className="w-5 h-5" /> Call Summary
                      </h4>
                      <p className="text-purple-900 leading-relaxed text-sm font-medium">
                        {selectedRecording.analysis?.summary ||
                          "Summary not available"}
                      </p>
                      {selectedRecording.analysis?.followUpRequired && (
                        <div className="mt-4 p-4 bg-amber-100 border border-amber-300 rounded-xl">
                          <p className="text-xs uppercase tracking-wider text-amber-800 mb-1 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Follow-up Required
                          </p>
                          <p className="text-sm text-amber-900">
                            {selectedRecording.analysis.followUpAction ||
                              "Action needed"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transcript and Quality */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-[#3E2723]">
                        <FileText className="w-5 h-5 text-[#8B4513]" />{" "}
                        Conversation Transcript
                      </h4>
                      <div className="bg-white p-6 rounded-[2rem] border border-[#F5F5DC] h-[400px] overflow-y-auto custom-scrollbar shadow-sm">
                        <p className="text-[#5D4037] leading-relaxed text-sm font-medium whitespace-pre-wrap">
                          {selectedRecording.transcriptClean ||
                            selectedRecording.transcriptRaw ||
                            "Transcript not available"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-[#3E2723]">
                        <Star className="w-5 h-5 text-[#8B4513]" /> Call
                        Quality Analysis
                      </h4>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-[2rem] border border-amber-200 shadow-sm">
                        <div className="mb-4">
                          <span className="text-xs font-medium text-amber-700 uppercase tracking-widest">
                            Overall Quality
                          </span>
                          <p
                            className={`text-3xl font-bold mt-2 capitalize ${selectedRecording.analysis?.areasOfImprovement
                              ?.overallCallQuality === "excellent"
                              ? "text-green-700"
                              : selectedRecording.analysis?.areasOfImprovement
                                ?.overallCallQuality === "good"
                                ? "text-blue-700"
                                : selectedRecording.analysis?.areasOfImprovement
                                  ?.overallCallQuality === "average"
                                  ? "text-amber-700"
                                  : "text-red-700"
                              }`}
                          >
                            {selectedRecording.analysis?.areasOfImprovement
                              ?.overallCallQuality || "N/A"}
                          </p>
                        </div>

                        {selectedRecording.analysis?.areasOfImprovement
                          ?.studentResponseFeedback && (
                            <div className="bg-white rounded-xl p-4 border border-amber-200">
                              <p className="text-xs uppercase tracking-wider text-amber-700 mb-2 font-semibold">
                                Student Performance
                              </p>
                              <p className="text-sm text-amber-900 leading-relaxed">
                                {
                                  selectedRecording.analysis.areasOfImprovement
                                    .studentResponseFeedback
                                }
                              </p>
                            </div>
                          )}

                        {selectedRecording.analysis?.areasOfImprovement
                          ?.hrPerformanceFeedback && (
                            <div className="bg-white rounded-xl p-4 border border-amber-200 mt-3">
                              <p className="text-xs uppercase tracking-wider text-amber-700 mb-2 font-semibold">
                                HR Performance
                              </p>
                              <p className="text-sm text-amber-900 leading-relaxed">
                                {
                                  selectedRecording.analysis.areasOfImprovement
                                    .hrPerformanceFeedback
                                }
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Issues Found */}
                  {selectedRecording.analysis?.areasOfImprovement?.issues &&
                    selectedRecording.analysis.areasOfImprovement.issues
                      .length > 0 && (
                      <div className="bg-white border border-red-100 rounded-[2rem] p-8 shadow-sm">
                        <h4 className="text-xl font-semibold text-[#3E2723] mb-6 flex items-center gap-2">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                          Areas for Improvement (
                          {
                            selectedRecording.analysis.areasOfImprovement.issues
                              .length
                          }{" "}
                          Issues)
                        </h4>

                        <div className="space-y-4">
                          {selectedRecording.analysis.areasOfImprovement.issues.map(
                            (issue, index) => (
                              <div
                                key={index}
                                className={`rounded-2xl border-l-4 ${getCategoryColor(
                                  issue.category || "Other"
                                )} bg-gradient-to-r from-red-50 to-white p-6 space-y-3`}
                              >
                                <p className="text-base font-bold text-red-900">
                                  {issue.category || "Issue"} #{index + 1}
                                </p>

                                <div className="space-y-2">
                                  <div>
                                    <span className="text-xs font-semibold text-red-700 uppercase">
                                      Problem:
                                    </span>
                                    <p className="text-sm text-red-900 mt-1">
                                      {issue.problem || "N/A"}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-semibold text-orange-700 uppercase">
                                      Why it matters:
                                    </span>
                                    <p className="text-sm text-orange-900 mt-1">
                                      {issue.whyItMatters || "N/A"}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-xs font-semibold text-green-700 uppercase">
                                      Suggestion:
                                    </span>
                                    <p className="text-sm text-green-900 mt-1">
                                      {issue.suggestion || "N/A"}
                                    </p>
                                  </div>

                                  {issue.evidenceQuote && (
                                    <div className="rounded-xl bg-white border border-red-200 px-4 py-3 text-xs text-red-800 italic">
                                      <span className="font-semibold not-italic">
                                        Evidence:
                                      </span>{" "}
                                      "{issue.evidenceQuote}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>

            <div className="p-8 bg-white/80 border-t border-[#F5F5DC] flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRecording(null)}
                className="px-10 py-4 bg-[#3E2723] text-white rounded-2xl font-medium hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMetric &&
        (() => {
          let filteredReports: RecordingReport[] = [];

          // Handle different metric types
          if (selectedMetric === "total") {
            filteredReports = reports;
          } else if (selectedMetric === "students") {
            // Show all students - get unique by leadId
            const uniqueLeadIds = new Set<string>();
            filteredReports = reports.filter(r => {
              if (!uniqueLeadIds.has(r.leadId)) {
                uniqueLeadIds.add(r.leadId);
                return true;
              }
              return false;
            });
          } else if (selectedMetric === "avgDuration") {
            // Show calls with duration
            filteredReports = reports.filter(r => {
              const duration = parseDurationToSeconds(r.analysis?.keyDetails?.callDuration);
              return duration > 0;
            });
          } else {
            // Existing sentiment filtering logic
            filteredReports = reports.filter((r) => {
              const outcome = (r.analysis?.outcome || "").toUpperCase();
              const code = (r.analysis?.outcomeCode || "").toUpperCase();

              const hasNegative = [
                "NOT_INTERESTED",
                "DISCONNECTED",
                "WRONG_NUMBER",
                "REJECTED",
                "NO_OPENING",
                "INVALID_NUMBER",
                "DNP",
              ].some((s) => outcome.includes(s) || code.includes(s));

              const hasPositive = [
                "INTERESTED",
                "SUCCESS",
                "CALLBACK",
                "CALLBACK_REQUESTED",
                "INFO_SHARED",
                "RESUME_REQUESTED",
              ].some((s) => outcome.includes(s) || code.includes(s));

              let sentiment: Sentiment = "neutral";

              if (r.type === "manual") {
                sentiment = "neg";
              } else if (hasNegative) {
                sentiment = "neg";
              } else if (hasPositive) {
                if (
                  outcome.includes("INFO_SHARED") ||
                  code.includes("INFO_SHARED") ||
                  outcome.includes("CALLBACK_REQUESTED") ||
                  code.includes("CALLBACK_REQUESTED")
                ) {
                  sentiment = "neutral";
                } else {
                  sentiment = "pos";
                }
              }

              const sentimentMap: Record<"positive" | "negative" | "neutral", Sentiment> = {
                positive: "pos",
                negative: "neg",
                neutral: "neutral",
              };

              return sentiment === sentimentMap[selectedMetric as "positive" | "negative" | "neutral"];
            });
          }

          const metricConfig = selectedMetric === "total" ? {
            title: "All Calls",
            color: "#8B4513",
            bgGradient: "from-[#8B4513] to-[#A0522D]",
            icon: PhoneCall,
          } : selectedMetric === "students" ? {
            title: "All Students",
            color: "#8B4513",
            bgGradient: "from-[#8B4513] to-[#A0522D]",
            icon: Users,
          } : selectedMetric === "avgDuration" ? {
            title: "Calls with Duration",
            color: "purple",
            bgGradient: "from-purple-500 to-purple-600",
            icon: Timer,
          } : {
            positive: {
              title: "Positive Calls",
              color: "green",
              bgGradient: "from-green-500 to-green-600",
              icon: TrendingUp,
            },
            negative: {
              title: "Negative Calls",
              color: "red",
              bgGradient: "from-red-500 to-red-600",
              icon: TrendingDown,
            },
            neutral: {
              title: "Neutral Calls",
              color: "amber",
              bgGradient: "from-amber-500 to-amber-600",
              icon: MinusCircle,
            },
          }[selectedMetric];

          const Icon = metricConfig.icon;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-[#FDFBF7] w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
                <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80 shrink-0">
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${metricConfig.bgGradient} rounded-[1.2rem] flex items-center justify-center text-white shadow-lg`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-medium text-[#3E2723]">
                        {metricConfig.title}
                      </h2>
                      <p className="text-[#8D6E63] font-medium text-sm mt-1">
                        {filteredReports.length} calls • {selectedDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMetric(null)}
                    className="w-12 h-12 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#FFFDFB] custom-scrollbar">
                  {filteredReports.length > 0 ? (
                    filteredReports.map((call) => {
                      const callDuration = parseDurationToSeconds(call.analysis?.keyDetails?.callDuration);

                      return (
                        <div
                          key={call._id}
                          className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-[#F5EEDC] rounded-xl flex items-center justify-center text-lg font-semibold text-[#8B4513]">
                                {call.studentName?.charAt(0)?.toUpperCase() ||
                                  "S"}
                              </div>
                              <div>
                                <p className="font-semibold text-[#3E2723]">
                                  {call.studentName}
                                </p>
                                <p className="text-sm text-[#8D6E63]">
                                  {call.email}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-[#3E2723] flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(call.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-[#A1887F] mt-1 flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" />
                                {new Date(call.createdAt).toLocaleTimeString(
                                  undefined,
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                                {callDuration > 0 && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <Timer className="w-3 h-3" />
                                    {formatDuration(callDuration)}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#FAF9F6] rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                                Outcome
                              </p>
                              <p className="font-medium text-[#3E2723]">
                                {call.analysis?.outcome ||
                                  call.manualStatus ||
                                  "N/A"}
                              </p>
                            </div>

                            <div className="bg-[#FAF9F6] rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                                Status
                              </p>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${call.status === "DONE"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-orange-50 text-orange-700"
                                  }`}
                              >
                                {call.status}
                              </span>
                            </div>

                            {call.analysis?.areasOfImprovement
                              ?.overallCallQuality && (
                                <div className="bg-[#FAF9F6] rounded-xl p-4">
                                  <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                                    Call Quality
                                  </p>
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${call.analysis.areasOfImprovement
                                      .overallCallQuality === "excellent"
                                      ? "bg-green-50 text-green-700"
                                      : call.analysis.areasOfImprovement
                                        .overallCallQuality === "good"
                                        ? "bg-blue-50 text-blue-700"
                                        : call.analysis.areasOfImprovement
                                          .overallCallQuality === "average"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-red-50 text-red-700"
                                      }`}
                                  >
                                    {
                                      call.analysis.areasOfImprovement
                                        .overallCallQuality
                                    }
                                  </span>
                                </div>
                              )}

                            <div className="bg-[#FAF9F6] rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-1">
                                Phone
                              </p>
                              <p className="font-medium text-[#3E2723]">
                                {call.phone || "N/A"}
                              </p>
                            </div>
                          </div>

                          {call.analysis?.summary && (
                            <div className="mt-4 bg-[#FAF9F6] rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wider text-[#A1887F] mb-2">
                                Summary
                              </p>
                              <p className="text-sm text-[#5D4037] leading-relaxed">
                                {call.analysis.summary}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16">
                      <Icon className="w-16 h-16 text-[#D2B48C] mx-auto mb-4" />
                      <p className="text-[#8D6E63] font-medium">
                        No calls found in this category
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Common Feedback Analysis Modal */}
      {showCommonFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#FDFBF7] w-full max-w-6xl max-h-[95vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg">
                  <Search className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-[#3E2723]">
                    Common Issues Analysis
                  </h2>
                  <p className="text-[#8D6E63] font-medium text-sm mt-1">
                    {commonFeedback.length} unique issues found across {reports.length} calls
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommonFeedback(false)}
                className="w-12 h-12 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FFFDFB] custom-scrollbar">
              {commonFeedback.length > 0 ? (
                commonFeedback.map((group, index) => (
                  <div
                    key={index}
                    className={`rounded-[2rem] border-l-4 ${getCategoryColor(group.category)} bg-gradient-to-r from-red-50 to-white p-6 shadow-sm`}
                  >
                    {/* Issue Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                            {group.category}
                          </span>
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            {group.count} {group.count === 1 ? 'Student' : 'Students'} Affected
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-red-900">
                          {group.problem}
                        </h3>
                      </div>
                    </div>

                    {/* Why It Matters */}
                    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <p className="text-xs uppercase tracking-wider text-orange-700 mb-2 font-semibold">
                        📊 Why It Matters
                      </p>
                      <p className="text-sm text-orange-900 leading-relaxed">
                        {group.whyItMatters}
                      </p>
                    </div>

                    {/* Suggestion */}
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-xs uppercase tracking-wider text-green-700 mb-2 font-semibold">
                        💡 Suggested Improvement
                      </p>
                      <p className="text-sm text-green-900 leading-relaxed">
                        {group.suggestion}
                      </p>
                    </div>

                    {/* Affected Students */}
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wider text-[#9A7B5A] mb-3 font-semibold">
                        👥 Affected Students ({group.students.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.students.map((student, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedStudentId(student.leadId)}
                            className="bg-white border border-[#F5F5DC] rounded-xl p-4 hover:border-[#8B4513] hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-[#F5EEDC] rounded-xl flex items-center justify-center text-sm font-semibold text-[#8B4513]">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#3E2723] truncate">
                                  {student.name}
                                </p>
                                <p className="text-xs text-[#8D6E63] truncate">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                            {student.evidenceQuote && (
                              <div className="mt-2 p-3 bg-[#FAF9F6] rounded-lg border border-[#F0E9DF]">
                                <p className="text-xs text-[#5D4037] italic">
                                  "{student.evidenceQuote}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <Search className="w-16 h-16 text-[#D2B48C] mx-auto mb-4" />
                  <p className="text-[#8D6E63] font-medium">
                    No common issues found in the selected calls
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #efebe9;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d7ccc8;
        }
      `}</style>
    </div>
  );
}