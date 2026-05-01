"use client";

import React from "react";
import { Star, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

/* ============================================================================
 * TYPES
 * ========================================================================== */

export interface ImprovementIssue {
  category?: string;
  problem?: string;
  suggestion?: string;
  whyItMatters?: string;
  evidenceQuote?: string;
}

export interface RecordingReport {
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
  Placed: boolean;
  createdAt: string;
  updatedAt?: string;
  sizeBytes?: number;
  publicUrl?: string;
  transcriptClean?: string;
  transcriptRaw?: string;
  durationSeconds?: number;
}

/* ============================================================================
 * INTERVIEW TYPES
 * ========================================================================== */

export interface InterviewRound {
  roundName: string;
  time: string;
  date: string | { $date: string };
  status: "cleared" | "failed" | "pending" | "scheduled";
}

export interface InterviewRecord {
  _id: string | { $oid: string };
  leadId: string;
  studentName: string;
  companyName: string;
  rounds: InterviewRound[];
  overallStatus: "in-progress" | "selected" | "rejected" | "completed";
  createdAt: string | { $date: string };
  updatedAt?: string | { $date: string };
  student?: string;
  studentEmail?:string;
}

/** Normalize mongo extended JSON dates to ISO string */
export const normalizeDate = (
  d: string | { $date: string } | undefined
): string => {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.$date;
};

/** Given an array of InterviewRecord, build a Map<leadId, InterviewRecord[]> */
export const buildInterviewMap = (
  interviews: InterviewRecord[]
): Map<string, InterviewRecord[]> => {
  const map = new Map<string, InterviewRecord[]>();

  interviews.forEach((iv) => {
    const key = iv.leadId || iv.student;

    if (!key) return;

    const existing = map.get(key) ?? [];
    existing.push(iv);
    map.set(key, existing);
  });

  return map;
};

/** Latest interview for a leadId */
export const getLatestInterview = (
  interviews: InterviewRecord[]
): InterviewRecord | null => {
  if (!interviews.length) return null;
  return interviews.reduce((latest, curr) => {
    const latestDate = new Date(normalizeDate(latest.createdAt)).getTime();
    const currDate = new Date(normalizeDate(curr.createdAt)).getTime();
    return currDate > latestDate ? curr : latest;
  });
};

/** Number of distinct companies a student has interviews at */
export const getInterviewCompanyCount = (
  interviews: InterviewRecord[]
): number => {
  return new Set(interviews.map((iv) => iv.companyName)).size;
};

/** Overall status label + color */
export const getInterviewStatusMeta = (
  status: InterviewRecord["overallStatus"]
): { label: string; bg: string; text: string; border: string } => {
  switch (status) {
    case "selected":
      return {
        label: "Selected",
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-300",
      };
    case "rejected":
      return {
        label: "Rejected",
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-300",
      };
    case "in-progress":
      return {
        label: "In Progress",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-300",
      };
    case "completed":
      return {
        label: "Completed",
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-300",
      };
    default:
      return {
        label: status,
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-300",
      };
  }
};

export const getRoundStatusMeta = (
  status: InterviewRound["status"]
): { dot: string; label: string } => {
  switch (status) {
    case "cleared":
      return { dot: "bg-green-500", label: "Cleared" };
    case "failed":
      return { dot: "bg-red-500", label: "Failed" };
    case "scheduled":
      return { dot: "bg-blue-500", label: "Scheduled" };
    default:
      return { dot: "bg-amber-400", label: "Pending" };
  }
};

export type Sentiment = "pos" | "neg" | "neutral";

export interface StudentStats {
  leadId: string;
  name: string;
  phone: string;
  email: string;
  placed: boolean;
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
  negativeRate: number;
  neutralRate: number;
  avgQualityScore: number;
  overview: "poor" | "average" | "good" | "excellent";
  calls: RecordingReport[];
  totalDurationSeconds: number;
  avgDurationSeconds: number;
}

export interface CommonFeedbackGroup {
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
}

export type SortKey =
  | "name"
  | "total"
  | "avgDuration"
  | "positive"
  | "neutral"
  | "negative"
  | "followUps"
  | "conversion"
  | "quality";

export type SortOrder = "asc" | "desc";

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

export const NEGATIVE_OUTCOMES = [
  "NOT_INTERESTED",
  "DISCONNECTED",
  "WRONG_NUMBER",
  "REJECTED",
  "NO_OPENING",
  "INVALID_NUMBER",
  "DNP",
  "NO_ANSWER",
];

export const POSITIVE_OUTCOMES = [
  "INTERESTED",
  "SUCCESS",
  "CALLBACK",
  "CALLBACK_REQUESTED",
  "INFO_SHARED",
  "RESUME_REQUESTED",
];

export const QUALITY_SCORE_MAP: Record<string, number> = {
  poor: 1,
  average: 2,
  good: 3,
  excellent: 4,
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

export const parseDurationToSeconds = (
  duration: string | null | undefined
): number => {
  if (!duration) return 0;
  if (/^\d+(\.\d+)?$/.test(duration.trim()))
    return Math.round(parseFloat(duration));
  if (duration.includes(":")) {
    const parts = duration.split(":").map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
  }
  let total = 0;
  const hrMatch = duration.match(/(\d+)\s*(?:h|hr|hour)/i);
  const minMatch = duration.match(/(\d+)\s*(?:m|min|minute)/i);
  const secMatch = duration.match(/(\d+)\s*(?:s|sec|second)/i);
  if (hrMatch) total += parseInt(hrMatch[1], 10) * 3600;
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  if (secMatch) total += parseInt(secMatch[1], 10);
  return total;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export const estimateDurationFromBytes = (
  sizeBytes: number | undefined
): number => {
  if (!sizeBytes || sizeBytes <= 0) return 0;
  return Math.round(sizeBytes / 16000);
};

export const getCallDurationSeconds = (r: RecordingReport): number => {
  if (r.durationSeconds && r.durationSeconds > 0)
    return Math.round(r.durationSeconds);
  const fromAnalysis = parseDurationToSeconds(
    r.analysis?.keyDetails?.callDuration
  );
  if (fromAnalysis > 0) return fromAnalysis;
  return estimateDurationFromBytes(r.sizeBytes);
};

export const classifySentiment = (r: RecordingReport): Sentiment => {
  if (r.type === "manual") return "neg";
  const outcome = (r.analysis?.outcome || "").toUpperCase();
  const code = (r.analysis?.outcomeCode || "").toUpperCase();
  const hasNegative = NEGATIVE_OUTCOMES.some(
    (s) => outcome.includes(s) || code.includes(s)
  );
  if (hasNegative) return "neg";
  const hasPositive = POSITIVE_OUTCOMES.some(
    (s) => outcome.includes(s) || code.includes(s)
  );
  if (hasPositive) {
    if (
      outcome.includes("INFO_SHARED") ||
      code.includes("INFO_SHARED") ||
      outcome.includes("CALLBACK_REQUESTED") ||
      code.includes("CALLBACK_REQUESTED")
    )
      return "neutral";
    return "pos";
  }
  return "neutral";
};

export const scoreToOverview = (
  score: number
): "poor" | "average" | "good" | "excellent" => {
  if (score >= 3.5) return "excellent";
  if (score >= 2.5) return "good";
  if (score >= 1.5) return "average";
  return "poor";
};

export const getCategoryColor = (category: string): string => {
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

export const pct = (value: number, total: number): number => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

/* ============================================================================
 * SHARED UI COMPONENTS
 * ========================================================================== */

export const StarRating: React.FC<{ rating: number; showScore?: boolean }> = ({
  rating,
  showScore = false,
}) => {
  const normalizedRating = Math.max(0, Math.min(4, rating));
  const stars = [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 transition-all ${
              star <= normalizedRating
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-300"
            }`}
          />
        ))}
      </div>
      {showScore && (
        <span className="text-xs font-bold text-[#8B4513] ml-1">
          {normalizedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

interface SortIconProps {
  active: boolean;
  order: SortOrder;
}

export const SortIcon: React.FC<SortIconProps> = ({ active, order }) => {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return order === "asc" ? (
    <ArrowUp className="w-3 h-3" />
  ) : (
    <ArrowDown className="w-3 h-3" />
  );
};

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentOrder: SortOrder;
  onSort: (key: SortKey) => void;
  align?: "left" | "center";
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  align = "center",
  className = "",
}) => {
  const isActive = currentSort === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-4 text-${align} text-[11px] font-semibold uppercase tracking-[0.2em] cursor-pointer select-none hover:bg-[#F3EBDD] transition ${
        isActive ? "text-[#8B4513]" : "text-[#9A7B5A]"
      } ${className}`}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        <span>{label}</span>
        <SortIcon active={isActive} order={currentOrder} />
      </div>
    </th>
  );
};

/* ============================================================================
 * PERCENTAGE BAR COMPONENT
 * ========================================================================== */

interface PercentBarProps {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  showLabels?: boolean;
  height?: string;
}

export const PercentBar: React.FC<PercentBarProps> = ({
  positive,
  neutral,
  negative,
  total,
  showLabels = true,
  height = "h-3",
}) => {
  const posPct = pct(positive, total);
  const neuPct = pct(neutral, total);
  const negPct = pct(negative, total);

  return (
    <div className="w-full">
      <div
        className={`w-full ${height} flex overflow-hidden rounded-full bg-[#F2EADF]`}
      >
        {posPct > 0 && (
          <div
            className="bg-green-600 h-full transition-all"
            style={{ width: `${posPct}%` }}
            title={`Positive: ${posPct}%`}
          />
        )}
        {neuPct > 0 && (
          <div
            className="bg-amber-500 h-full transition-all"
            style={{ width: `${neuPct}%` }}
            title={`Neutral: ${neuPct}%`}
          />
        )}
        {negPct > 0 && (
          <div
            className="bg-red-600 h-full transition-all"
            style={{ width: `${negPct}%` }}
            title={`Negative: ${negPct}%`}
          />
        )}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex justify-between text-[10px] font-medium">
          <span className="text-green-700">{posPct}% Pos</span>
          <span className="text-amber-700">{neuPct}% Neu</span>
          <span className="text-red-700">{negPct}% Neg</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * KPI CARD
 * ========================================================================== */

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  percent?: number;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  borderHover: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtitle,
  percent,
  icon,
  iconBg,
  valueColor = "text-[#2D1F16]",
  borderHover,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm p-4 sm:p-5 lg:p-6 cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg ${borderHover}`}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div
          className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl ${iconBg}`}
        >
          {icon}
        </div>
        {percent !== undefined && (
          <div className="rounded-full bg-[#FBF8F3] px-2.5 py-1 text-[10px] font-bold text-[#8B4513]">
            {percent}%
          </div>
        )}
      </div>
      <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#9A7B5A] font-medium">
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-semibold ${valueColor}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};