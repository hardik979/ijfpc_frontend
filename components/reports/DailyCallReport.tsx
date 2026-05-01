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
  LabelList,
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
  Eye,
  Activity,
  Target,
  Zap,
  Award,
  Briefcase,
  Building2,
} from "lucide-react";
import {
  RecordingReport,
  InterviewRecord,
  StudentStats,
  CommonFeedbackGroup,
  Sentiment,
  SortKey,
  SortOrder,
  QUALITY_SCORE_MAP,
  formatDuration,
  getCallDurationSeconds,
  classifySentiment,
  scoreToOverview,
  getCategoryColor,
  pct,
  SortableHeader,
  PercentBar,
  KpiCard,
  buildInterviewMap,
  getLatestInterview,
  getInterviewStatusMeta,
  getRoundStatusMeta,
  normalizeDate,
} from "@/utils/Dailycallreport.utils";

import InterviewSummaryPanel, { type ExternalInterviewRaw, type GroupSummary } from "./Interviewsummarypanel";
import ChartSection from "./Chartsection";
interface DailyCallReportProps {
  reports: RecordingReport[];
  interviews?: InterviewRecord[];
  externalInterviews?: ExternalInterviewRaw[];
  groupSummary?: GroupSummary | null;
  selectedDate: string;
}

const formatDate = (value: string | Date) => {
  const date = new Date(value);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// ─── Star Rating ─────────────────────────────────────────────────────────────
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const normalizedRating = Math.max(0, Math.min(4, Math.round(rating)));
  const stars = [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 transition-all ${star <= normalizedRating
            ? "fill-amber-400 text-amber-400"
            : "fill-gray-200 text-gray-200"
            }`}
        />
      ))}
    </div>
  );
};

interface PlacedAwareXAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  placedStudents: Set<string>;
  interviewStudents: Set<string>;
}

const PlacedAwareXAxisTick: React.FC<PlacedAwareXAxisTickProps> = ({
  x = 0,
  y = 0,
  payload,
  placedStudents,
  interviewStudents,
}) => {
  if (!payload) return null;
  const isPlaced = placedStudents.has(payload.value);
  const hasInterview = interviewStudents.has(payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#5D4037" fontSize={11}>
        {payload.value}
      </text>
      {isPlaced && (
        <foreignObject x={hasInterview ? -20 : -9} y={18} width={18} height={18}>
          <div
            title="Placed"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, background: "#fef3c7",
              borderRadius: 4, border: "1px solid #fcd34d",
            }}
          >
            <Briefcase size={11} color="#d97706" strokeWidth={2} />
          </div>
        </foreignObject>
      )}
      {hasInterview && (
        <foreignObject x={isPlaced ? 2 : -9} y={18} width={18} height={18}>
          <div
            title="Interview Scheduled"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, background: "#eff6ff",
              borderRadius: 4, border: "1px solid #93c5fd",
            }}
          >
            <Building2 size={11} color="#2563eb" strokeWidth={2} />
          </div>
        </foreignObject>
      )}
    </g>
  );
};

// ─── Interview Mini Card ──────────────────────────────────────────────────────
const InterviewMiniCard: React.FC<{ interview: InterviewRecord }> = ({
  interview,
}) => {
  const statusMeta = getInterviewStatusMeta(interview.overallStatus);
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Building2 className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <p className="font-bold text-[#3E2723] text-sm">{interview.companyName}</p>
            <p className="text-xs text-[#8A7968]">
              {new Date(normalizeDate(interview.createdAt)).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
          {statusMeta.label}
        </span>
      </div>
      <div className="space-y-1.5">
        {interview.rounds.map((round, idx) => {
          const rm = getRoundStatusMeta(round.status);
          const roundDate = new Date(normalizeDate(round.date));
          return (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-blue-100"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${rm.dot}`} />
                <span className="text-xs font-semibold capitalize text-[#5D4037]">
                  {round.roundName} Round
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A7968]">
                <span>
                  {roundDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <span>{round.time}</span>
                <span className="font-bold">{rm.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DailyCallReport({
  reports,
  interviews = [],
  externalInterviews = [],
  groupSummary = null,
  selectedDate,
}: DailyCallReportProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    "positive" | "negative" | "neutral" | "total" | "students" | "totalDuration" | null
  >(null);
  const [selectedRecording, setSelectedRecording] = useState<RecordingReport | null>(null);
  const [showCommonFeedback, setShowCommonFeedback] = useState(false);
  const [infoPopup, setInfoPopup] = useState<{ title: string; text: string } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  /* Local filters scoped to the Top Student Performance chart only */
  const [perfChartDate, setPerfChartDate] = useState<string>("all");
  const [perfPlacedOnly, setPerfPlacedOnly] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("desc"); }
  };

  /* ── Build InterviewRecord[] from externalInterviews when not provided directly ── */
  const derivedInterviews = useMemo<InterviewRecord[]>(() => {
    if (interviews && interviews.length > 0) return interviews;
    const grouped = new Map<string, InterviewRecord>();
    externalInterviews.forEach((ev) => {
      const leadId = (ev as any).student || (ev as any).studentId || (ev as any).studentEmail || ev.studentName;
      const key = `${leadId}__${ev.company}`;
      const roundStatus: InterviewRecord["rounds"][number]["status"] =
        ev.status === "cleared" || ev.status === "selected" || ev.status === "passed"
          ? "cleared"
          : ev.status === "failed" || ev.status === "rejected"
          ? "failed"
          : ev.status === "scheduled"
          ? "scheduled"
          : "pending";
      const round = {
        roundName: ev.round || `Round ${ev.roundNumber ?? 1}`,
        time: ev.scheduledTime || "",
        date: ev.scheduledDate || ev.scheduledAt || ev.createdAt,
        status: roundStatus,
      };
      if (!grouped.has(key)) {
        grouped.set(key, {
          _id: ev._id,
          leadId: String(leadId),
          studentName: ev.studentName,
          companyName: ev.company,
          rounds: [round],
          overallStatus: "in-progress",
          createdAt: ev.createdAt,
        });
      } else {
        grouped.get(key)!.rounds.push(round);
      }
    });
    grouped.forEach((rec) => {
      const last = rec.rounds[rec.rounds.length - 1];
      rec.overallStatus =
        last.status === "cleared"
          ? "selected"
          : last.status === "failed"
          ? "rejected"
          : "in-progress";
    });
    return Array.from(grouped.values());
  }, [interviews, externalInterviews]);

  /* ── Interview map ── */
  const interviewMap = useMemo(() => buildInterviewMap(derivedInterviews), [derivedInterviews]);

  /* ══════════════════════════════════════════════════════════════════════════
   * ANALYTICS
   * ════════════════════════════════════════════════════════════════════════ */
  const analytics = useMemo(() => {
    let totalCalls = reports.length;
    let positive = 0, neutral = 0, negative = 0, manualLogs = 0, followUps = 0;
    let totalDurationSeconds = 0, callsWithDuration = 0;

    const studentStats: Record<string, {
      leadId: string; name: string; phone: string; email: string;
      total: number; manual: number; pos: number; neg: number; neutral: number;
      followUps: number; numbers: Set<string>; qualityScores: number[];
      calls: RecordingReport[]; totalDurationSeconds: number; placed: boolean;
    }> = {};

    const validReports = reports.filter(
      (r) => r.manualStatus !== "DNP" && r.type !== "manual"
    );

    validReports.forEach((r) => {
      const sentiment: Sentiment = classifySentiment(r);
      if (r.type === "manual") manualLogs++;
      if (sentiment === "pos") positive++;
      else if (sentiment === "neg") negative++;
      else neutral++;
      if (r.analysis?.followUpRequired) followUps++;

      const durationSeconds = getCallDurationSeconds(r);
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
          total: 0, manual: 0, pos: 0, neg: 0, neutral: 0,
          followUps: 0, numbers: new Set(), qualityScores: [], calls: [],
          totalDurationSeconds: 0, placed: r.Placed || false,
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
      if (durationSeconds > 0) current.totalDurationSeconds += durationSeconds;

      const quality = r?.analysis?.areasOfImprovement?.overallCallQuality?.toLowerCase();
      if (quality && QUALITY_SCORE_MAP[quality]) current.qualityScores.push(QUALITY_SCORE_MAP[quality]);

      const numberMatch = r.originalFileName?.match(/\d{10,}/)?.[0] || r.phone?.match(/\d{10,}/)?.[0];
      if (numberMatch) current.numbers.add(numberMatch);
    });

    const students: StudentStats[] = Object.values(studentStats).map((s) => {
      const avgQualityScore =
        s.qualityScores.length > 0
          ? s.qualityScores.reduce((sum, score) => sum + score, 0) / s.qualityScores.length
          : 0;
      const avgDurationSeconds = s.total > 0 ? Math.round(s.totalDurationSeconds / s.total) : 0;
      return {
        ...s,
        uniqueNumbers: s.numbers.size,
        conversionRate: pct(s.pos, s.total),
        negativeRate: pct(s.neg, s.total),
        neutralRate: pct(s.neutral, s.total),
        avgQualityScore: Number(avgQualityScore.toFixed(2)),
        overview: scoreToOverview(avgQualityScore),
        avgDurationSeconds,
      };
    });

    const totalStudents = students.length;
    const conversionRate = pct(positive, totalCalls);
    const negativeRate = pct(negative, totalCalls);
    const neutralRate = pct(neutral, totalCalls);
    const avgDurationSeconds =
      callsWithDuration > 0 ? Math.round(totalDurationSeconds / callsWithDuration) : 0;

    const sentimentData = [
      { name: "Positive", value: positive, color: "#16a34a", percent: conversionRate },
      { name: "Negative", value: negative, color: "#dc2626", percent: negativeRate },
      { name: "Neutral", value: neutral, color: "#d97706", percent: neutralRate },
    ].filter((item) => item.value > 0);

    const performanceData = [...students]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((s) => ({
        name: s.name.split(" ")[0] || "User",
        Positive: s.pos, Neutral: s.neutral, Negative: s.neg, Total: s.total,
        posPct: pct(s.pos, s.total),
        neutralPct: pct(s.neutral, s.total),
        negPct: pct(s.neg, s.total),
      }));

    const qualityDistribution = [
      { quality: "Excellent", count: 0, color: "#16a34a" },
      { quality: "Good", count: 0, color: "#0ea5e9" },
      { quality: "Average", count: 0, color: "#f59e0b" },
      { quality: "Poor", count: 0, color: "#dc2626" },
    ];
    students.forEach((s) => {
      if (s.avgQualityScore >= 3.5) qualityDistribution[0].count++;
      else if (s.avgQualityScore >= 2.5) qualityDistribution[1].count++;
      else if (s.avgQualityScore >= 1.5) qualityDistribution[2].count++;
      else if (s.avgQualityScore > 0) qualityDistribution[3].count++;
    });

    return {
      totalCalls, totalStudents, positive, negative, neutral, manualLogs,
      followUps, conversionRate, negativeRate, neutralRate, students,
      sentimentData, performanceData, totalDurationSeconds, avgDurationSeconds,
      callsWithDuration, qualityDistribution,
    };
  }, [reports]);

  /* ── Unique dates available in current reports (for chart-local date picker) ── */
  const perfAvailableDates = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.createdAt) set.add(r.createdAt.slice(0, 10));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  /* ── Top Student Performance: locally filtered performance data ── */
  const perfPerformanceData = useMemo(() => {
    const noLocal = perfChartDate === "all" && !perfPlacedOnly;
    if (noLocal) return analytics.performanceData;

    const filtered = reports.filter((r) => {
      if (r.manualStatus === "DNP" || r.type === "manual") return false;
      if (perfChartDate !== "all" && r.createdAt?.slice(0, 10) !== perfChartDate) return false;
      return true;
    });

    const map = new Map<string, {
      leadId: string; name: string; placed: boolean;
      total: number; pos: number; neg: number; neutral: number;
    }>();
    filtered.forEach((r) => {
      const s = classifySentiment(r);
      if (!map.has(r.leadId)) {
        map.set(r.leadId, {
          leadId: r.leadId,
          name: r.studentName || "Unknown Student",
          placed: r.Placed || false,
          total: 0, pos: 0, neg: 0, neutral: 0,
        });
      }
      const st = map.get(r.leadId)!;
      st.total++;
      if (s === "pos") st.pos++;
      else if (s === "neg") st.neg++;
      else if (s === "neutral") st.neutral++;
    });

    let arr = Array.from(map.values());
    if (perfPlacedOnly) arr = arr.filter((s) => s.placed);

    return arr
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((s) => ({
        name: s.name.split(" ")[0] || "User",
        Positive: s.pos,
        Neutral: s.neutral,
        Negative: s.neg,
        Total: s.total,
        posPct: pct(s.pos, s.total),
        neutralPct: pct(s.neutral, s.total),
        negPct: pct(s.neg, s.total),
      }));
  }, [reports, perfChartDate, perfPlacedOnly, analytics.performanceData]);

  /* ── Sets for chart axis ticks ── */
  const placedStudents = useMemo<Set<string>>(
    () => new Set(analytics.students.filter((s) => s.placed).map((s) => s.name.split(" ")[0])),
    [analytics.students]
  );

  const interviewStudents = useMemo<Set<string>>(() => {
    const interviewEmails = new Set(
      Array.from(interviewMap.values())
        .flat()
        .map((iv) => iv.studentEmail?.toLowerCase().trim())
        .filter(Boolean)
    );

    return new Set(
      analytics.students
        .filter((s) => interviewEmails.has(s.email?.toLowerCase().trim()))
        .map((s) => s.name.split(" ")[0])
    );
  }, [analytics.students, interviewMap]);

  /* ── Sorted students ── */
  const sortedStudents = useMemo(() => {
    const list = [...analytics.students];
    const dir = sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "total": return (a.total - b.total) * dir;
        case "avgDuration": return (a.avgDurationSeconds - b.avgDurationSeconds) * dir;
        case "positive": return (a.pos - b.pos) * dir;
        case "neutral": return (a.neutral - b.neutral) * dir;
        case "negative": return (a.neg - b.neg) * dir;
        case "followUps": return (a.followUps - b.followUps) * dir;
        case "conversion": return (a.conversionRate - b.conversionRate) * dir;
        case "quality": return (a.avgQualityScore - b.avgQualityScore) * dir;
        default: return 0;
      }
    });
    return list;
  }, [analytics.students, sortKey, sortOrder]);

  /* ── Common feedback ── */
  const commonFeedback = useMemo<CommonFeedbackGroup[]>(() => {
    const feedbackMap = new Map<string, CommonFeedbackGroup>();
    const validReports = reports.filter((r) => r.manualStatus !== "DNP" && r.type !== "manual");
    validReports.forEach((report) => {
      const issues = report.analysis?.areasOfImprovement?.issues;
      if (!issues || issues.length === 0) return;
      issues.forEach((issue) => {
        if (!issue.category || !issue.problem) return;
        const key = `${issue.category}::${issue.problem}`;
        if (feedbackMap.has(key)) {
          const existing = feedbackMap.get(key)!;
          if (!existing.students.some((s) => s.leadId === report.leadId)) {
            existing.count++;
            existing.students.push({
              name: report.studentName, email: report.email,
              leadId: report.leadId, evidenceQuote: issue.evidenceQuote,
            });
          }
        } else {
          feedbackMap.set(key, {
            category: issue.category, problem: issue.problem, count: 1,
            students: [{ name: report.studentName, email: report.email, leadId: report.leadId, evidenceQuote: issue.evidenceQuote }],
            suggestion: issue.suggestion || "N/A",
            whyItMatters: issue.whyItMatters || "N/A",
          });
        }
      });
    });
    return Array.from(feedbackMap.values()).filter((g) => g.count >= 2).sort((a, b) => b.count - a.count);
  }, [reports]);

  const topIssue = commonFeedback.length > 0 ? commonFeedback[0] : null;
  const selectedStudent = analytics.students.find((s) => s.leadId === selectedStudentId);
  const selectedStudentInterviews = selectedStudentId ? (interviewMap.get(selectedStudentId) ?? []) : [];
  const getStudentInterviewsByEmail = (email?: string) => {
    if (!email) return [];

    return Array.from(interviewMap.values())
      .flat()
      .filter(
        (iv) =>
          iv.studentEmail?.toLowerCase().trim() ===
          email.toLowerCase().trim()
      );
  };

  /* ── CSV Export ── */
  const downloadCSV = () => {
    const headers = [
      "Student Name", "Email", "Phone", "Placement Status", "Interview Status",
      "Total Calls", "Manual Logs", "Unique Numbers", "Positive", "Positive %",
      "Neutral", "Neutral %", "Negative", "Negative %", "Follow Ups",
      "Conversion Rate %", "Quality Score", "Quality Rating", "Avg Duration", "Total Talk Time",
    ];
    const rows = sortedStudents.map((s) => {
      const ivs = interviewMap.get(s.leadId) ?? [];
      const latestIv = getLatestInterview(ivs);
      const ivStatus = latestIv
        ? `${latestIv.companyName} - ${latestIv.overallStatus}`
        : "None";
      return [
        s.name, s.email, s.phone, s.placed ? "Placed" : "Not Placed",
        ivStatus, s.total, s.manual, s.uniqueNumbers,
        s.pos, s.conversionRate, s.neutral, s.neutralRate,
        s.neg, s.negativeRate, s.followUps, s.conversionRate,
        s.avgQualityScore.toFixed(2), s.overview,
        formatDuration(s.avgDurationSeconds), formatDuration(s.totalDurationSeconds),
      ];
    });
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daily_Call_Report_${selectedDate}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardBase =
    "rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm hover:shadow-md transition-all p-4 sm:p-5 lg:p-6";

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#FCFAF6] to-[#F5F1EB] px-3 sm:px-4 lg:px-6 pb-10 sm:pb-16 pt-4">
      <div className="space-y-5 sm:space-y-6 lg:space-y-8">
        {/* ═══════════════════ HEADER ═══════════════════ */}
        <div className="rounded-[2rem] border border-[#E5D9C6] bg-gradient-to-r from-white via-[#FAF5EC] to-white p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#8B4513] rounded-xl shadow-md">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#8B4513] uppercase tracking-wider">
                    Executive Dashboard
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#2D1F16] leading-tight">
                    Call Performance Analytics
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowCommonFeedback(true)}
                disabled={commonFeedback.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-purple-600 bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-sm font-bold text-white transition hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <AlertTriangle className="w-5 h-5" />
                Common Issues
              </button>
              <button
                onClick={downloadCSV}
                disabled={analytics.students.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#8B4513] bg-white px-5 py-3 text-sm font-bold text-[#8B4513] transition hover:bg-[#8B4513] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════ KPI CARDS ═══════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 sm:gap-5">
          <KpiCard
            label="Total Calls"
            value={analytics.totalCalls}
            subtitle="All recordings + manual entries"
            icon={<PhoneCall className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B4513]" />}
            iconBg="bg-[#FFF3E7]"
            borderHover="hover:border-[#8B4513]"
            onClick={() => setSelectedMetric("total")}
          />
          <KpiCard
            label="Students"
            value={analytics.totalStudents}
            subtitle="Unique students with call activity"
            icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />}
            iconBg="bg-blue-50"
            valueColor="text-blue-700"
            borderHover="hover:border-blue-600"
            onClick={() => setSelectedMetric("students")}
          />
          {/* ── TOTAL DURATION (replaces Avg Duration) ── */}
          <KpiCard
            label="Total Talk Time"
            value={formatDuration(analytics.totalDurationSeconds)}
            subtitle={`${analytics.callsWithDuration} calls measured`}
            icon={<Timer className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />}
            iconBg="bg-purple-50"
            valueColor="text-purple-700"
            borderHover="hover:border-purple-600"
            onClick={() => setSelectedMetric("totalDuration")}
          />
          <KpiCard
            label="Positive"
            value={analytics.positive}
            percent={analytics.conversionRate}
            subtitle={`${analytics.conversionRate}% of total calls`}
            icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />}
            iconBg="bg-green-50"
            valueColor="text-green-700"
            borderHover="hover:border-green-600"
            onClick={() => setSelectedMetric("positive")}
          />
          <KpiCard
            label="Neutral"
            value={analytics.neutral}
            percent={analytics.neutralRate}
            subtitle={`${analytics.neutralRate}% of total calls`}
            icon={<MinusCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700" />}
            iconBg="bg-amber-50"
            valueColor="text-amber-700"
            borderHover="hover:border-amber-600"
            onClick={() => setSelectedMetric("neutral")}
          />
          <KpiCard
            label="Negative"
            value={analytics.negative}
            percent={analytics.negativeRate}
            subtitle={`${analytics.negativeRate}% of total calls`}
            icon={<TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-700" />}
            iconBg="bg-red-50"
            valueColor="text-red-700"
            borderHover="hover:border-red-600"
            onClick={() => setSelectedMetric("negative")}
          />
        </div>

        {/* ═══════════════════ LEGEND ═══════════════════ */}
        <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[#EEE2D2] bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16]">
            How to Read This Dashboard
          </h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-green-50 p-4 border border-green-200">
              <p className="font-semibold text-green-800">Positive</p>
              <p className="mt-1 text-sm text-green-700 leading-relaxed">Resume requested, clear progress, successful response</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4 border border-red-200">
              <p className="font-semibold text-red-800">Negative</p>
              <p className="mt-1 text-sm text-red-700 leading-relaxed">Not interested, wrong number, invalid, no answer, dead call</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200">
              <p className="font-semibold text-amber-800">Neutral</p>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">Information shared, callback requested, still open</p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] p-4 border border-orange-200">
              <p className="font-semibold text-[#A86117]">Manual Logs</p>
              <p className="mt-1 text-sm text-[#A86117] leading-relaxed">Student manually entered outcome like DNP or invalid number</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════ OVERALL DISTRIBUTION BAR ═══════════════════ */}
        <div className={cardBase}>
          <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#2D1F16] flex items-center gap-2">
                <Target className="w-6 h-6 text-[#8B4513]" />
                Overall Call Outcome Distribution
              </h3>
              <p className="text-sm text-[#7A6753] mt-1">
                Success rate:{" "}
                <span className="font-bold text-green-700">{analytics.conversionRate}%</span>
                {" "}across {analytics.totalCalls} calls
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-green-600 shadow-md" />
                <span className="font-semibold text-[#5D4037]">Positive {analytics.conversionRate}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-amber-500 shadow-md" />
                <span className="font-semibold text-[#5D4037]">Neutral {analytics.neutralRate}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-red-600 shadow-md" />
                <span className="font-semibold text-[#5D4037]">Negative {analytics.negativeRate}%</span>
              </div>
            </div>
          </div>
          <PercentBar
            positive={analytics.positive} neutral={analytics.neutral}
            negative={analytics.negative} total={analytics.totalCalls}
            showLabels={false} height="h-8"
          />
        </div>

        {/* ═══════════════════ CHART SECTION (filterable analytics) ═══════════════════ */}
        <ChartSection
          reports={reports}
          interviews={derivedInterviews}
          availableDates={Array.from(new Set(reports.map((r) => r.createdAt))).sort((a, b) => b.localeCompare(a))}
        />

        {/* ═══════════════════ KEY METRICS ═══════════════════ 
        <div className="grid grid-cols-1 gap-6">
          <div className={cardBase}>
            <h3 className="text-lg font-bold text-[#2D1F16] mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Key Metrics Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PhoneForwarded className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-semibold uppercase">Total Talk Time</p>
                    <p className="text-xl font-black text-purple-900">
                      {formatDuration(analytics.totalDurationSeconds)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-600">Measured calls</p>
                  <p className="text-sm font-bold text-purple-900">{analytics.callsWithDuration}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-white rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Clock className="w-5 h-5 text-indigo-700" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-700 font-semibold uppercase">Avg Call Duration</p>
                    <p className="text-xl font-black text-indigo-900">
                      {formatDuration(analytics.avgDurationSeconds)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-600">Per call</p>
                  <p className="text-sm font-bold text-indigo-900">
                    {Math.round(analytics.avgDurationSeconds / 60)}m avg
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-semibold uppercase">Follow-ups Required</p>
                    <p className="text-xl font-black text-blue-900">{analytics.followUps}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600">Of total calls</p>
                  <p className="text-sm font-bold text-blue-900">
                    {pct(analytics.followUps, analytics.totalCalls)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs text-green-700 font-semibold uppercase">Success Rate</p>
                    <p className="text-xl font-black text-green-900">{analytics.conversionRate}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">Successful calls</p>
                  <p className="text-sm font-bold text-green-900">{analytics.positive}</p>
                </div>
              </div>
            </div>
          </div>
        </div>*/}

        {/* CHARTS section removed — covered by ChartSection above */}
        {false && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Sentiment Pie */}
          <div className="xl:col-span-2 rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white p-4 sm:p-6 shadow-lg">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#8B4513]" />
                Sentiment Distribution
              </h3>
              <p className="text-xs sm:text-sm text-[#7A6753]">Call results split with percentages</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FAF5EC] border border-[#E5D9C6] px-2.5 py-1">
                <Calendar className="w-3 h-3 text-[#8B4513]" />
                <span className="text-[11px] font-semibold text-[#5D4037]">{selectedDate}</span>
              </div>
            </div>
            <div className="h-[260px] sm:h-[320px] lg:h-[340px]">
              {analytics.sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sentimentData}
                      dataKey="value" nameKey="name"
                      innerRadius={55} outerRadius={95}
                      paddingAngle={5} stroke="none"
                      label={({ name, payload }) => `${name} ${payload.percent}%`}
                    >
                      {analytics.sentimentData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value} (${props.payload.percent}%)`, name,
                      ]}
                      contentStyle={{ borderRadius: 16, border: "1px solid #eee2d0", boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}
                    />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#9A8572] text-center px-4">
                  No chart data available for {selectedDate}
                </div>
              )}
            </div>
          </div>

          {/* Top Student Performance Bar Chart */}
          <div className="xl:col-span-3 rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white p-4 sm:p-6 shadow-lg">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#2D1F16] flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-[#8B4513]" />
                    Top Student Performance
                  </h3>
                  <p className="text-xs sm:text-sm text-[#7A6753]">students – call results breakdown</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {placedStudents.size > 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1">
                        <Briefcase size={10} color="#d97706" strokeWidth={2} />
                        <span className="text-[10px] font-semibold text-amber-700">= Placed</span>
                      </div>
                    )}
                    {interviewStudents.size > 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1">
                        <Building2 size={10} color="#2563eb" strokeWidth={2} />
                        <span className="text-[10px] font-semibold text-blue-700">= Interview</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-wrap items-center gap-2">
                  <div className="relative inline-flex items-center rounded-xl border border-[#E5D9C6] bg-[#FAF5EC] pl-7 pr-2 py-1.5 shadow-sm">
                    <Calendar className="absolute left-2 top-2 w-3.5 h-3.5 text-[#8B4513] pointer-events-none" />
                    <input
                      type="date"
                      value={perfChartDate === "all" ? "" : perfChartDate}
                      min={perfAvailableDates[perfAvailableDates.length - 1]}
                      max={perfAvailableDates[0]}
                      onChange={(e) =>
                        setPerfChartDate(e.target.value || "all")
                      }
                      className="bg-transparent text-xs font-bold text-[#3E2723] focus:outline-none cursor-pointer"
                    />
                    {perfChartDate !== "all" && (
                      <button
                        onClick={() => setPerfChartDate("all")}
                        title="Clear date"
                        className="ml-1 rounded p-0.5 hover:bg-[#E5D9C6]"
                      >
                        <X className="w-3 h-3 text-[#8B4513]" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setPerfPlacedOnly((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                      perfPlacedOnly
                        ? "bg-amber-600 text-white border-transparent shadow-md"
                        : "bg-white text-amber-700 border-[#E9E2D6] hover:border-amber-400"
                    }`}
                  >
                    <Briefcase size={12} strokeWidth={2.5} />
                    Placed only
                  </button>
                  {(perfChartDate !== "all" || perfPlacedOnly) && (
                    <button
                      onClick={() => {
                        setPerfChartDate("all");
                        setPerfPlacedOnly(false);
                      }}
                      className="text-xs font-semibold text-[#8B4513] hover:underline px-2 py-2"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="h-[280px] sm:h-[320px] lg:h-[340px]">
              {perfPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={perfPerformanceData}
                    margin={{ top: 25, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E9DF" />
                    <XAxis
                      dataKey="name" interval={0} height={50}
                      tick={(props) => (
                        <PlacedAwareXAxisTick
                          {...props}
                          placedStudents={placedStudents}
                          interviewStudents={interviewStudents}
                        />
                      )}
                    />
                    <YAxis
                      allowDecimals={false} tick={{ fontSize: 11 }}
                      label={{ value: "Uploded Recordings Quantity", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 12, fill: "#7A6753" } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #eee2d0" }}
                      formatter={(value: number, name: string, props: any) => {
                        const d = props.payload;
                        let percent = name === "Positive" ? d.posPct : name === "Neutral" ? d.neutralPct : d.negPct;
                        return [`${value} calls (${percent}%)`, name];
                      }}
                      labelFormatter={(label: string, payload: any) =>
                        payload?.length ? `${label} — Total: ${payload[0].payload.Total}` : label
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                    <Bar dataKey="Positive" stackId="a" fill="#16a34a" />
                    <Bar dataKey="Neutral" stackId="a" fill="#d97706" />
                    <Bar dataKey="Negative" stackId="a" fill="#dc2626" radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="Total" position="top"
                        style={{ fontSize: "11px", fill: "#5D4037", fontWeight: 600 }}
                        formatter={(value: React.ReactNode) => `${value} calls`}
                      />
                      <LabelList
                        dataKey="posPct" position="top" offset={18}
                        style={{ fontSize: "10px", fill: "#16a34a", fontWeight: 700 }}
                        formatter={(value: React.ReactNode) => `${value}% pos`}
                      />
                    </Bar>
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
        )}        

        {/* ═══════════════════ MOBILE CARDS ═══════════════════ */}
        <div className="md:hidden space-y-4">
          <div className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-4">
            <h3 className="text-base font-semibold text-[#2D1F16]">Student Call Details</h3>
            <p className="mt-1 text-sm text-[#7A6753]">Click any student for detailed analytics</p>
          </div>
          {sortedStudents.length > 0 ? (
            sortedStudents.map((s, index) => {
              const studentInterviews = getStudentInterviewsByEmail(s.email);
              const latestIv = getLatestInterview(studentInterviews);
              return (
                <div
                  key={s.leadId + index}
                  onClick={() => setSelectedStudentId(s.leadId)}
                  className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-4 cursor-pointer hover:border-[#8B4513] transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EEDC] font-semibold text-[#8B4513] shrink-0">
                      {s.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[#2D1F16] truncate">{s.name}</p>
                        {s.placed && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 shrink-0">
                            <Briefcase size={10} color="#d97706" strokeWidth={2} />
                            <span className="text-[10px] font-semibold text-amber-700">Placed</span>
                          </span>
                        )}
                        {latestIv && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 shrink-0">
                            <Building2 size={10} color="#2563eb" strokeWidth={2} />
                            <span className="text-[10px] font-semibold text-blue-700">
                              {latestIv.companyName}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8A7968] break-all">{s.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#8A7968]">Total</p>
                      <p className="text-lg font-bold text-[#8B4513]">{s.total}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <PercentBar positive={s.pos} neutral={s.neutral} negative={s.neg} total={s.total} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-green-50 p-2 text-center border border-green-200">
                      <p className="text-green-700 font-semibold">{s.pos}</p>
                      <p className="text-[10px] text-green-600">{s.conversionRate}% Pos</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-center border border-amber-200">
                      <p className="text-amber-700 font-semibold">{s.neutral}</p>
                      <p className="text-[10px] text-amber-600">{s.neutralRate}% Neu</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center border border-red-200">
                      <p className="text-red-700 font-semibold">{s.neg}</p>
                      <p className="text-[10px] text-red-600">{s.negativeRate}% Neg</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-purple-700">
                      <Clock className="w-3 h-3" />
                      {formatDuration(s.avgDurationSeconds)} avg
                    </span>
                    <span className="text-[#7A6753]">Follow-up: {s.followUps}</span>
                    <StarRating rating={s.avgQualityScore} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-8 text-center text-sm text-[#9A8572]">
              No records found for this date.
            </div>
          )}
        </div>

        {/* ═══════════════════ DESKTOP TABLE ═══════════════════ */}
        <div className="hidden md:block overflow-hidden rounded-[2rem] border-2 border-[#E9E2D6] bg-white shadow-xl">
          <div className="border-b-2 border-[#F3ECE2] px-6 py-5 flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-[#FBF8F3] to-white">
            <div>
              <h3 className="text-lg font-bold text-[#2D1F16] flex items-center gap-2">
                <Users className="w-6 h-6 text-[#8B4513]" />
                Student Call Details Overview
              </h3>
              <p className="mt-1 text-sm text-[#7A6753]">
                Click column headers to sort · Click rows for details · Sorted by{" "}
                <span className="font-semibold text-[#8B4513]">{sortKey}</span>{" "}
                ({sortOrder.toUpperCase()})
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border-2 border-[#8B4513]">
              <Users className="w-4 h-4 text-[#8B4513]" />
              <span className="text-sm font-bold text-[#8B4513]">{sortedStudents.length} students</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gradient-to-r from-[#FBF8F3] to-[#F5F1EA]">
                <tr>
                  <SortableHeader label="Student" sortKey="name" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} align="left" className="pl-6" />
                  <SortableHeader label="Total" sortKey="total" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Avg Dur" sortKey="avgDuration" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Positive" sortKey="positive" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Neutral" sortKey="neutral" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Negative" sortKey="negative" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Follow-up" sortKey="followUps" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Quality" sortKey="conversion" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader label="Rating" sortKey="quality" currentSort={sortKey} currentOrder={sortOrder} onSort={handleSort} />
                  {/* Static interview column — no sort needed */}
                  <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B5A]">
                    Interview
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F7F0E6]">
                {sortedStudents.length > 0 ? (
                  sortedStudents.map((s, index) => {
                    const studentInterviews = getStudentInterviewsByEmail(s.email);
                    const latestIv = getLatestInterview(studentInterviews);
                    const ivMeta = latestIv ? getInterviewStatusMeta(latestIv.overallStatus) : null;

                    return (
                      <tr
                        key={s.leadId + index}
                        onClick={() => setSelectedStudentId(s.leadId)}
                        className="hover:bg-gradient-to-r hover:from-[#FFFDF9] hover:to-[#FFF8F0] cursor-pointer transition-all group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5EEDC] to-[#E9DECF] font-semibold text-[#8B4513] shadow-sm group-hover:shadow-md transition-shadow">
                              {s.name?.charAt(0)?.toUpperCase() || "S"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-[#2D1F16]">{s.name}</p>
                                {s.placed && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                    <Briefcase size={10} color="#d97706" strokeWidth={2} />
                                    <span className="text-[10px] font-semibold text-amber-700">Placed</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#8A7968]">{s.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[40px] h-8 rounded-xl bg-gradient-to-br from-[#F7F1E8] to-[#EDE3D5] font-semibold text-[#2D1F16] shadow-sm">
                            {s.total}
                          </span>
                        </td>

                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 px-3 py-1 border border-purple-200">
                            <Clock className="w-3.5 h-3.5 text-purple-700" />
                            <span className="text-xs font-semibold text-purple-700">
                              {formatDuration(s.avgDurationSeconds)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200 shadow-sm">
                              {s.pos}
                            </span>
                            <span className="text-[10px] text-green-600 mt-0.5 font-medium">{s.conversionRate}%</span>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shadow-sm">
                              {s.neutral}
                            </span>
                            <span className="text-[10px] text-amber-600 mt-0.5 font-medium">{s.neutralRate}%</span>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="rounded-xl bg-gradient-to-br from-red-50 to-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200 shadow-sm">
                              {s.neg}
                            </span>
                            <span className="text-[10px] text-red-600 mt-0.5 font-medium">{s.negativeRate}%</span>
                          </div>
                        </td>

                        <td className="px-4 py-5 text-center">
                          <span className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-sm">
                            {s.followUps}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <div className="mx-auto w-[140px]">
                            <PercentBar
                              positive={s.pos} neutral={s.neutral} negative={s.neg} total={s.total}
                              showLabels={false} height="h-2.5"
                            />
                            <div className="mt-1 text-center text-[10px] font-semibold text-[#7A6753]">
                              {s.conversionRate}% conv
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <div className="flex flex-col items-center gap-1">
                            <StarRating rating={s.avgQualityScore} />
                            <span className="text-xs font-bold text-[#8B4513]">
                              {s.avgQualityScore.toFixed(1)}/4.0
                            </span>
                          </div>
                        </td>

                        {/* ── Interview column ── */}
                        <td className="px-4 py-5 text-center">
                          {latestIv && ivMeta ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <Building2 size={11} className="text-blue-600" />
                                <span className="text-xs font-bold text-[#3E2723] max-w-[90px] truncate">
                                  {latestIv.companyName}
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ivMeta.bg} ${ivMeta.text} ${ivMeta.border}`}>
                                {ivMeta.label}
                              </span>
                              <span className="text-[9px] text-[#8A7968]">
                                {latestIv.rounds.length} round{latestIv.rounds.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#B0A090]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center text-sm text-[#9A8572]">
                      No records found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
       * STUDENT DETAIL MODAL (with interview section)
       * ══════════════════════════════════════════════════════════════════ */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#FDFBF7] w-full max-w-7xl max-h-[95vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-[#F5F5DC] rounded-[1.2rem] flex items-center justify-center text-2xl font-medium text-[#8B4513]">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-medium text-[#3E2723]">{selectedStudent.name}</h2>
                    {selectedStudent.placed && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1">
                        <Briefcase size={13} color="#d97706" strokeWidth={2} />
                        <span className="text-xs font-bold text-amber-700">Placed</span>
                      </span>
                    )}
                    {selectedStudentInterviews.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-300 px-2.5 py-1">
                        <Building2 size={13} className="text-blue-600" />
                        <span className="text-xs font-bold text-blue-700">
                          {selectedStudentInterviews.length} Interview{selectedStudentInterviews.length !== 1 ? "s" : ""}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="text-[#8D6E63] font-medium text-sm mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {selectedStudent.email}
                    </span>
                    <span className="w-1 h-1 bg-[#D2B48C] rounded-full" />
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

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FFFDFB] custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Call Distribution */}
                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5" />
                    Call Distribution
                  </h3>
                  <div className="mb-5">
                    <PercentBar positive={selectedStudent.pos} neutral={selectedStudent.neutral} negative={selectedStudent.neg} total={selectedStudent.total} height="h-4" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-sm font-medium text-green-800">✓ Positive Calls</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-semibold">{selectedStudent.conversionRate}%</span>
                        <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-700">{selectedStudent.pos} calls</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <span className="text-sm font-medium text-amber-800">~ Neutral Calls</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-600 font-semibold">{selectedStudent.neutralRate}%</span>
                        <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700">{selectedStudent.neutral} calls</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <span className="text-sm font-medium text-red-800">✗ Negative Calls</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-semibold">{selectedStudent.negativeRate}%</span>
                        <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700">{selectedStudent.neg} calls</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">✎ Manual Logs</span>
                      <span className="text-sm font-bold text-gray-700">{selectedStudent.manual} logs</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Average Quality Score", value: `${selectedStudent.avgQualityScore.toFixed(1)}/4.0` },
                      { label: "Average Call Duration", value: formatDuration(selectedStudent.avgDurationSeconds) },
                      { label: "Total Talk Time", value: formatDuration(selectedStudent.totalDurationSeconds) },
                      { label: "Unique Phone Numbers", value: String(selectedStudent.uniqueNumbers) },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 bg-[#FAF9F6] rounded-xl">
                        <span className="text-sm font-medium text-[#5D4037]">{item.label}</span>
                        <span className="text-lg font-bold text-[#8B4513]">{item.value}</span>
                      </div>
                    ))}
                    <div className="p-3 bg-[#FAF9F6] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#5D4037]">Conversion Rate</span>
                        <span className="text-lg font-bold text-green-700">{selectedStudent.conversionRate}%</span>
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

              {/* ── INTERVIEW SECTION ── */}
              {selectedStudentInterviews.length > 0 && (
                <div className="bg-white border border-blue-100 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-[#3E2723] mb-5 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    Interview History ({selectedStudentInterviews.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudentInterviews.map((iv, idx) => (
                      <InterviewMiniCard key={idx} interview={iv} />
                    ))}
                  </div>
                </div>
              )}

              {/* CALL HISTORY TABLE */}
              <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-[#3E2723] mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Complete Call History ({selectedStudent.calls.length} Calls)
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-[#F3EBDD]">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-[#FBF8F3]">
                      <tr>
                        {["Sr", "Date & Time", "Outcome", "Duration", "Quality", "Status", "Summary", "Feedback", "Action"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7B5A]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F7F0E6]">
                      {selectedStudent.calls.map((call, index) => {
                        const quality = call.analysis?.areasOfImprovement?.overallCallQuality || "N/A";
                        const callDuration = getCallDurationSeconds(call);
                        return (
                          <tr key={call._id} className="hover:bg-[#FFFDF9] transition-all">
                            <td className="px-4 py-4 font-semibold text-[#2D1F16]">
                              {selectedStudent.calls.length - index}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-[#3E2723]">{formatDate(call.createdAt)}</span>
                                <span className="text-xs text-[#8A7968] mt-1">
                                  {new Date(call.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-[#3E2723]">
                              {call.analysis?.outcome || call.manualStatus || "N/A"}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                <Clock className="w-3 h-3" />
                                {callDuration > 0 ? formatDuration(callDuration) : "N/A"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${quality === "excellent" ? "bg-green-50 text-green-700 border border-green-200"
                                : quality === "good" ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : quality === "average" ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : quality === "poor" ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-gray-50 text-gray-700 border border-gray-200"
                                }`}>
                                {quality}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${call.status === "DONE" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                                }`}>
                                {call.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {call.analysis?.summary ? (
                                <button
                                  onClick={() => setInfoPopup({ title: "Summary", text: call.analysis?.summary || "" })}
                                  className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              ) : <span className="text-xs text-[#8A7968]">No</span>}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {call.analysis?.areasOfImprovement?.studentResponseFeedback ? (
                                <button
                                  onClick={() => setInfoPopup({ title: "Feedback", text: call.analysis?.areasOfImprovement?.studentResponseFeedback || "" })}
                                  className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              ) : <span className="text-xs text-[#8A7968]">No</span>}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => setSelectedRecording(call)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B4513] px-3 py-2 text-xs font-medium text-white hover:bg-[#5D4037] transition-all"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INFO POPUP, RECORDING MODAL, METRIC MODAL, COMMON FEEDBACK MODAL — unchanged from original */}
      {infoPopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white border border-[#F3EBDD] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5EAD9] bg-[#FCFAF6]">
              <h4 className="text-base font-semibold text-[#3E2723]">{infoPopup.title}</h4>
              <button onClick={() => setInfoPopup(null)} className="w-9 h-9 rounded-xl border border-[#EADFCF] flex items-center justify-center text-[#8B4513] hover:bg-red-50 hover:text-red-600 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm leading-relaxed text-[#5D4037] whitespace-pre-wrap">{infoPopup.text}</p>
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setInfoPopup(null)} className="w-full rounded-xl bg-[#8B4513] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5D4037] transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecording && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl">
          <div className="bg-[#FDFBF7] w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
            <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-[#8B4513] rounded-xl flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-[#3E2723]">Complete Call Analysis</h2>
                  <p className="text-[#8D6E63] font-medium text-xs flex items-center gap-2">
                    {selectedRecording.studentName} • {new Date(selectedRecording.createdAt).toLocaleDateString()}
                    {getCallDurationSeconds(selectedRecording) > 0 && (
                      <><span className="w-1 h-1 bg-[#D2B48C] rounded-full" /><Clock className="w-3 h-3" />{formatDuration(getCallDurationSeconds(selectedRecording))}</>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedRecording(null)} className="w-10 h-10 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {selectedRecording.publicUrl && (
                <div className="bg-white border border-[#F5F5DC] rounded-[2rem] p-8 shadow-sm flex items-center gap-8">
                  <Play className="w-10 h-10 text-[#8B4513] fill-[#8B4513] hidden md:block" />
                  <div className="flex-1 w-full space-y-3">
                    <p className="font-medium text-[#5D4037] text-lg">🎧 Playback Recording</p>
                    <audio controls src={selectedRecording.publicUrl} className="w-full h-10 rounded-full" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-[2rem] p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                    <BarChart2 className="w-5 h-5" /> AI Analysis Outcome
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: "Outcome Code", value: selectedRecording.analysis?.outcomeCode || "N/A" },
                      { label: "Outcome", value: selectedRecording.analysis?.outcome || "N/A" },
                      { label: "Confidence", value: selectedRecording.analysis?.confidence || "N/A" },
                    ].map((item) => (
                      <div key={item.label}>
                        <span className="text-xs font-medium text-blue-700 uppercase tracking-widest">{item.label}</span>
                        <p className="text-xl font-bold text-blue-900 mt-1 capitalize">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-[2rem] p-6 shadow-sm">
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-purple-900 mb-4">
                    <FileText className="w-5 h-5" /> Call Summary
                  </h4>
                  <p className="text-purple-900 leading-relaxed text-sm font-medium">
                    {selectedRecording.analysis?.summary || "Summary not available"}
                  </p>
                  {selectedRecording.analysis?.followUpRequired && (
                    <div className="mt-4 p-4 bg-amber-100 border border-amber-300 rounded-xl">
                      <p className="text-xs uppercase tracking-wider text-amber-800 mb-1 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Follow-up Required
                      </p>
                      <p className="text-sm text-amber-900">{selectedRecording.analysis.followUpAction || "Action needed"}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-[#3E2723]">
                    <FileText className="w-5 h-5 text-[#8B4513]" /> Conversation Transcript
                  </h4>
                  <div className="bg-white p-6 rounded-[2rem] border border-[#F5F5DC] h-[400px] overflow-y-auto custom-scrollbar shadow-sm">
                    <p className="text-[#5D4037] leading-relaxed text-sm font-medium whitespace-pre-wrap">
                      {selectedRecording.transcriptClean || selectedRecording.transcriptRaw || "Transcript not available"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-lg font-semibold text-[#3E2723]">
                    <Star className="w-5 h-5 text-[#8B4513]" /> Call Quality Analysis
                  </h4>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-[2rem] border border-amber-200 shadow-sm">
                    <p className={`text-3xl font-bold mt-2 capitalize ${selectedRecording.analysis?.areasOfImprovement?.overallCallQuality === "excellent" ? "text-green-700"
                      : selectedRecording.analysis?.areasOfImprovement?.overallCallQuality === "good" ? "text-blue-700"
                        : selectedRecording.analysis?.areasOfImprovement?.overallCallQuality === "average" ? "text-amber-700"
                          : "text-red-700"
                      }`}>
                      {selectedRecording.analysis?.areasOfImprovement?.overallCallQuality || "N/A"}
                    </p>
                    {selectedRecording.analysis?.areasOfImprovement?.studentResponseFeedback && (
                      <div className="bg-white rounded-xl p-4 border border-amber-200 mt-3">
                        <p className="text-xs uppercase tracking-wider text-amber-700 mb-2 font-semibold">Student Performance</p>
                        <p className="text-sm text-amber-900 leading-relaxed">{selectedRecording.analysis.areasOfImprovement.studentResponseFeedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMetric && (() => {
        let filteredReports: RecordingReport[] = [];
        if (selectedMetric === "total") filteredReports = reports;
        else if (selectedMetric === "students") {
          const seen = new Set<string>();
          filteredReports = reports.filter((r) => { if (!seen.has(r.leadId)) { seen.add(r.leadId); return true; } return false; });
        } else if (selectedMetric === "totalDuration") {
          filteredReports = reports.filter((r) => getCallDurationSeconds(r) > 0);
        } else {
          filteredReports = reports.filter((r) => {
            const s = classifySentiment(r);
            return s === ({ positive: "pos", negative: "neg", neutral: "neutral" } as Record<string, string>)[selectedMetric];
          });
        }

        const titles: Record<string, string> = {
          total: "All Calls", students: "All Students",
          totalDuration: "Calls with Duration", positive: "Positive Calls",
          negative: "Negative Calls", neutral: "Neutral Calls",
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A2C2A]/40 backdrop-blur-xl">
            <div className="bg-[#FDFBF7] w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/50">
              <div className="px-8 py-6 border-b border-[#F5F5DC] flex justify-between items-center bg-white/80 shrink-0">
                <div>
                  <h2 className="text-2xl font-medium text-[#3E2723]">{titles[selectedMetric]}</h2>
                  <p className="text-[#8D6E63] font-medium text-sm mt-1">{filteredReports.length} records · {selectedDate}</p>
                </div>
                <button onClick={() => setSelectedMetric(null)} className="w-12 h-12 bg-white border border-[#EFEBE9] rounded-xl flex items-center justify-center text-[#D2B48C] hover:text-red-500 hover:bg-red-50 transition-all shadow-sm">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-[#FFFDFB] custom-scrollbar">
                {filteredReports.length > 0 ? (
                  <div className="overflow-x-auto rounded-[1.5rem] border border-[#F5F5DC] bg-white shadow-sm">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-[#F8F5EF] text-[#8D6E63] uppercase text-xs tracking-wider">
                        <tr>
                          {["Student Name", "Outcome", "Duration", "Call Quality", "Date", "Time"].map((h) => (
                            <th key={h} className="px-6 py-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map((call) => {
                          const quality = call.analysis?.areasOfImprovement?.overallCallQuality || "N/A";
                          const dur = getCallDurationSeconds(call);
                          return (
                            <tr key={call._id} className="border-t border-[#F5F5DC] hover:bg-[#FCFAF7] transition">
                              <td className="px-4 py-3 font-medium text-[#3E2723]">{call.studentName || "N/A"}</td>
                              <td className="px-4 py-3 text-[#5D4037]">{call.analysis?.outcome || call.manualStatus || "N/A"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                  <Clock className="w-3 h-3" />{dur > 0 ? formatDuration(dur) : "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${quality === "excellent" ? "bg-green-50 text-green-700"
                                  : quality === "good" ? "bg-blue-50 text-blue-700"
                                    : quality === "average" ? "bg-amber-50 text-amber-700"
                                      : quality === "poor" ? "bg-red-50 text-red-700"
                                        : "bg-gray-50 text-gray-600"
                                  }`}>
                                  {quality}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#5D4037]">{formatDate(call.createdAt)}</td>
                              <td className="px-4 py-3 text-[#5D4037]">
                                {new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 text-[#8D6E63]">No calls found</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showCommonFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xl">
          <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border-4 border-purple-200">
            <div className="px-8 py-6 border-b-2 border-purple-100 bg-gradient-to-r from-purple-50 via-white to-purple-50 shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-9 h-9 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-[#3E2723]">Common Performance Issues</h2>
                </div>
                <button onClick={() => setShowCommonFeedback(false)} className="w-12 h-12 bg-white border-2 border-red-300 rounded-2xl flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gradient-to-br from-purple-50/30 to-white custom-scrollbar">
              {topIssue ? (
                <div className="rounded-3xl bg-gradient-to-r from-red-100 to-red-50 p-6 shadow-xl border-2 border-red-300">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="px-4 py-2 rounded-full text-xs font-black bg-white text-purple-900 shadow-md border-2 border-purple-200 uppercase">{topIssue.category}</span>
                    <span className="px-4 py-2 rounded-full text-xs font-black bg-red-600 text-white uppercase">CRITICAL</span>
                    <span className="px-4 py-2 rounded-full text-xs font-black bg-white text-red-900 shadow-md border-2 border-red-200">
                      {topIssue.count} Student{topIssue.count !== 1 ? "s" : ""} ({pct(topIssue.count, analytics.totalStudents)}%)
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-red-900 mb-6">{topIssue.problem}</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                    <div className="p-5 bg-orange-50 border-2 border-orange-300 rounded-2xl">
                      <p className="text-xs font-black text-orange-900 uppercase mb-3">Why It Matters</p>
                      <p className="text-sm text-orange-900 leading-relaxed font-semibold">{topIssue.whyItMatters}</p>
                    </div>
                    <div className="p-5 bg-green-50 border-2 border-green-300 rounded-2xl">
                      <p className="text-xs font-black text-green-900 uppercase mb-3">Recommended Action</p>
                      <p className="text-sm text-green-900 leading-relaxed font-semibold">{topIssue.suggestion}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topIssue.students.map((student, idx) => (
                      <div
                        key={idx}
                        onClick={() => { setShowCommonFeedback(false); setSelectedStudentId(student.leadId); }}
                        className="bg-white border border-gray-200 rounded-xl p-3 hover:border-[#8B4513] hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#F5EEDC] to-[#E9DECF] rounded-lg flex items-center justify-center text-xs font-bold text-[#8B4513]">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#3E2723] truncate text-sm">{student.name}</p>
                            <p className="text-xs text-[#8D6E63] truncate">{student.email}</p>
                          </div>
                        </div>
                        {student.evidenceQuote && (
                          <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-[#5D4037] italic line-clamp-2">"{student.evidenceQuote}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                  <p className="text-2xl font-bold text-[#8D6E63]">No common issues found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ INTERVIEW & GROUP SUMMARY ═══════════════════ */}
      <div className="text-center py-10">
        <InterviewSummaryPanel
          externalInterviews={externalInterviews}
          groupSummary={groupSummary}
          selectedDate={selectedDate}
        />
        </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #faf5ec; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#d7ccc8 0%,#bcaaa4 100%); border-radius: 10px; border: 2px solid #faf5ec; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg,#bcaaa4 0%,#a1887f 100%); }
      `}</style>
    </div>
  );
}