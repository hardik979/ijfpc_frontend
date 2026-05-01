"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Users,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface RecordingReport {
  _id: string;
  leadId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  r2ObjectKey: string;
  publicUrl: string;
  status: string;
  transcriptRaw?: string;
  transcriptClean?: string;
  analysis?: any;
  type?: "recording" | "manual";
  manualStatus?: string;
  studentName: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface CallAnalysisProps {
  reports: RecordingReport[];
}

type TimeFilter = "today" | "week" | "month" | "year";

interface DayStats {
  date: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
}

interface StudentStats {
  studentName: string;
  leadId: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
}

interface DayComparison {
  label: string;
  dateKey: string;
  uploads: number;
  positiveCount: number;
  positivePercentage: number;
  negativeCount: number;
  neutralCount: number;
}

// ─── Upload Quality Comparison Chart ────────────────────────────────────────

interface UploadQualityChartProps {
  data: DayComparison[];
  timeFilter: TimeFilter;
}

function UploadQualityChart({ data, timeFilter }: UploadQualityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const loadChart = async () => {
      // Dynamically import Chart.js to avoid SSR issues
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

      const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
      const labelColor = isDark ? "#a8b4cc" : "#5D4037";

      const maxUploads = Math.max(...data.map((d) => d.uploads), 10);
      const yLeftMax = Math.ceil(maxUploads * 1.3 / 10) * 10;

      chartRef.current = new Chart(canvasRef.current!, {
        data: {
          labels: data.map((d) => d.label),
          datasets: [
            {
              type: "bar" as const,
              label: "Recordings Uploaded",
              data: data.map((d) => d.uploads),
              backgroundColor: isDark
                ? "rgba(55,138,221,0.35)"
                : "rgba(55,138,221,0.25)",
              borderColor: "#378ADD",
              borderWidth: 1.5,
              borderRadius: 6,
              borderSkipped: false,
              yAxisID: "yLeft",
              order: 2,
            },
            {
              type: "line" as const,
              label: "Positive Response %",
              data: data.map((d) => d.positivePercentage),
              borderColor: "#10b981",
              backgroundColor: "rgba(16,185,129,0.08)",
              borderWidth: 2.5,
              pointBackgroundColor: "#10b981",
              pointBorderColor: isDark ? "#1c2333" : "#fff",
              pointBorderWidth: 2.5,
              pointRadius: 6,
              pointHoverRadius: 9,
              tension: 0.4,
              fill: true,
              yAxisID: "yRight",
              order: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          animation: { duration: 600, easing: "easeInOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? "#1c2333" : "#ffffff",
              borderColor: isDark ? "#2e3a55" : "#E9E2D6",
              borderWidth: 1,
              titleColor: isDark ? "#f0f4ff" : "#2D1F16",
              bodyColor: isDark ? "#a8b4cc" : "#5D4037",
              padding: 14,
              cornerRadius: 10,
              callbacks: {
                label: (ctx: any) => {
                  if (ctx.dataset.label === "Recordings Uploaded")
                    return `  Uploads: ${ctx.parsed.y}`;
                  return `  Positive rate: ${ctx.parsed.y}%`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: {
                color: labelColor,
                font: { size: 12 },
                maxRotation: 45,
                autoSkip: data.length > 15,
              },
              border: { color: gridColor },
            },
            yLeft: {
              type: "linear",
              position: "left",
              min: 0,
              max: yLeftMax,
              grid: { color: gridColor },
              ticks: {
                color: "#378ADD",
                font: { size: 12 },
                callback: (v: any) => v,
              },
              title: {
                display: true,
                text: "Recordings uploaded",
                color: "#378ADD",
                font: { size: 12 },
              },
              border: { color: gridColor },
            },
            yRight: {
              type: "linear",
              position: "right",
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false },
              ticks: {
                color: "#10b981",
                font: { size: 12 },
                stepSize: 20,
                callback: (v: any) => v + "%",
              },
              title: {
                display: true,
                text: "Positive response %",
                color: "#10b981",
                font: { size: 12 },
              },
              border: { color: "transparent" },
            },
          },
        },
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, theme]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8572]">
        <div className="text-center">
          <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No data for this period</p>
        </div>
      </div>
    );
  }

  // Summary metrics
  const totalUploads = data.reduce((s, d) => s + d.uploads, 0);
  const avgPositive =
    data.length > 0
      ? Math.round(
          data.reduce((s, d) => s + d.positivePercentage, 0) / data.length
        )
      : 0;

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstAvgRate =
    firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d.positivePercentage, 0) /
        firstHalf.length
      : 0;
  const secondAvgRate =
    secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d.positivePercentage, 0) /
        secondHalf.length
      : 0;
  const rateTrend = secondAvgRate - firstAvgRate;

  const firstAvgUploads =
    firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d.uploads, 0) / firstHalf.length
      : 0;
  const secondAvgUploads =
    secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d.uploads, 0) / secondHalf.length
      : 0;
  const uploadTrend =
    firstAvgUploads > 0
      ? ((secondAvgUploads - firstAvgUploads) / firstAvgUploads) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Mini metric strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            Total Uploads
          </p>
          <p className="text-2xl font-bold text-blue-400">{totalUploads}</p>
          <div className="flex items-center gap-1 mt-1">
            {uploadTrend >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span
              className={`text-xs font-medium ${uploadTrend >= 0 ? "text-blue-400" : "text-slate-400"}`}
            >
              {uploadTrend >= 0 ? "+" : ""}
              {Math.abs(uploadTrend).toFixed(1)}% vs prior half
            </span>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Avg Positive Rate
          </p>
          <p className="text-2xl font-bold text-emerald-400">{avgPositive}%</p>
          <div className="flex items-center gap-1 mt-1">
            {rateTrend >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
            )}
            <span
              className={`text-xs font-medium ${rateTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {rateTrend >= 0 ? "+" : ""}
              {Math.abs(rateTrend).toFixed(1)}% trend
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl p-4 border ${
            uploadTrend > 0 && rateTrend < 0
              ? "bg-red-500/5 border-red-500/20"
              : uploadTrend > 0 && rateTrend >= 0
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-amber-500/5 border-amber-500/20"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
              uploadTrend > 0 && rateTrend < 0
                ? "text-red-400"
                : uploadTrend > 0 && rateTrend >= 0
                  ? "text-emerald-400"
                  : "text-amber-400"
            }`}
          >
            Quality Signal
          </p>
          <p
            className={`text-sm font-bold ${
              uploadTrend > 0 && rateTrend < 0
                ? "text-red-400"
                : uploadTrend > 0 && rateTrend >= 0
                  ? "text-emerald-400"
                  : "text-amber-400"
            }`}
          >
            {uploadTrend > 0 && rateTrend < 0
              ? "Volume ↑, Quality ↓"
              : uploadTrend > 0 && rateTrend >= 0
                ? "Volume ↑, Quality ↑"
                : rateTrend < 0
                  ? "Quality Declining"
                  : "Stable"}
          </p>
          <p className="text-xs text-[#9A8572] mt-1">
            {uploadTrend > 0 && rateTrend < 0
              ? "Quantity outpacing quality"
              : uploadTrend > 0 && rateTrend >= 0
                ? "Scaling successfully"
                : "Review call approach"}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-[#7A6753]">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-500/60 inline-block" />
          Recordings uploaded (left axis)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-emerald-500 inline-block rounded" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block -ml-2" />
          Positive response % (right axis)
        </span>
      </div>

      {/* Chart canvas */}
      <div className="relative w-full" style={{ height: "300px" }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Dual axis chart: upload volume as bars and positive response rate as line over time"
        />
      </div>

      {/* Day-by-day breakdown table */}
      {data.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E9E2D6]">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-[#9A8572] uppercase tracking-wider">
                  Period
                </th>
                <th className="text-right py-2 pr-4 text-xs font-semibold text-[#9A8572] uppercase tracking-wider">
                  Uploads
                </th>
                <th className="text-right py-2 pr-4 text-xs font-semibold text-[#9A8572] uppercase tracking-wider">
                  Positive
                </th>
                <th className="text-right py-2 pr-4 text-xs font-semibold text-[#9A8572] uppercase tracking-wider">
                  Negative
                </th>
                <th className="text-right py-2 text-xs font-semibold text-[#9A8572] uppercase tracking-wider">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.dateKey}
                  className={`border-b border-[#F3ECE2] ${i % 2 === 0 ? "bg-[#FBF8F3]" : ""}`}
                >
                  <td className="py-2.5 pr-4 text-[#2D1F16] font-medium">
                    {row.label}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-blue-400 font-semibold">
                    {row.uploads}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-emerald-400">
                    {row.positiveCount}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-red-400">
                    {row.negativeCount}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                        row.positivePercentage >= 20
                          ? "bg-emerald-500/10 text-emerald-400"
                          : row.positivePercentage >= 10
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {row.positivePercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CallAnalysis({ reports }: CallAnalysisProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");

  const getOutcomeCategory = (
    rec: RecordingReport
  ): "positive" | "negative" | "neutral" => {
    if (rec.type === "manual") {
      const status = rec.manualStatus?.toLowerCase() || "";
      if (status.includes("interested") || status.includes("callback"))
        return "positive";
      if (
        status.includes("not_interested") ||
        status.includes("declined")
      )
        return "negative";
      return "neutral";
    }

    const outcome = rec.analysis?.outcome?.toLowerCase() || "";
    const quality =
      rec.analysis?.areasOfImprovement?.overallCallQuality?.toLowerCase() ||
      "";

    if (
      outcome.includes("interested") ||
      outcome.includes("positive") ||
      outcome.includes("callback") ||
      quality === "good" ||
      quality === "excellent"
    )
      return "positive";

    if (
      outcome.includes("not interested") ||
      outcome.includes("negative") ||
      outcome.includes("rejected") ||
      quality === "poor"
    )
      return "negative";

    return "neutral";
  };

  const filteredReports = useMemo(() => {
    if (!reports || reports.length === 0) return [];
    const now = new Date();
    const filterDate = new Date();

    switch (timeFilter) {
      case "today":
        filterDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        filterDate.setDate(now.getDate() - 7);
        filterDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        filterDate.setMonth(now.getMonth() - 1);
        filterDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        filterDate.setFullYear(now.getFullYear() - 1);
        filterDate.setHours(0, 0, 0, 0);
        break;
    }

    return reports.filter((r) => new Date(r.createdAt) >= filterDate);
  }, [reports, timeFilter]);

  const dailyStats = useMemo(() => {
    const statsMap: Record<string, DayStats> = {};

    filteredReports.forEach((rec) => {
      const dateKey = new Date(rec.createdAt).toISOString().split("T")[0];

      if (!statsMap[dateKey]) {
        statsMap[dateKey] = {
          date: dateKey,
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          positivePercentage: 0,
        };
      }

      statsMap[dateKey].total++;
      statsMap[dateKey][getOutcomeCategory(rec)]++;
    });

    Object.values(statsMap).forEach((stat) => {
      stat.positivePercentage =
        stat.total > 0 ? Math.round((stat.positive / stat.total) * 100) : 0;
    });

    return Object.values(statsMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredReports]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (timeFilter === "today")
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    if (timeFilter === "year")
      return date.toLocaleDateString("en-US", { month: "short" });
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // ── Upload quality comparison data ──
  const comparisonData = useMemo((): DayComparison[] => {
    return dailyStats.map((day) => ({
      label: formatDate(day.date),
      dateKey: day.date,
      uploads: day.total,
      positiveCount: day.positive,
      negativeCount: day.negative,
      neutralCount: day.neutral,
      positivePercentage: day.positivePercentage,
    }));
  }, [dailyStats]);

  const studentStats = useMemo(() => {
    const statsMap: Record<string, StudentStats> = {};

    filteredReports.forEach((rec) => {
      const key = rec.leadId;
      if (!statsMap[key]) {
        statsMap[key] = {
          studentName: rec.studentName,
          leadId: rec.leadId,
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          positivePercentage: 0,
        };
      }
      statsMap[key].total++;
      statsMap[key][getOutcomeCategory(rec)]++;
    });

    Object.values(statsMap).forEach((stat) => {
      stat.positivePercentage =
        stat.total > 0 ? (stat.positive / stat.total) * 100 : 0;
    });

    return Object.values(statsMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredReports]);

  const overallStats = useMemo(() => {
    const total = filteredReports.length;
    const positive = filteredReports.filter(
      (r) => getOutcomeCategory(r) === "positive"
    ).length;
    const negative = filteredReports.filter(
      (r) => getOutcomeCategory(r) === "negative"
    ).length;
    const neutral = filteredReports.filter(
      (r) => getOutcomeCategory(r) === "neutral"
    ).length;

    const positivePercentage = total > 0 ? (positive / total) * 100 : 0;
    const negativePercentage = total > 0 ? (negative / total) * 100 : 0;
    const neutralPercentage = total > 0 ? (neutral / total) * 100 : 0;

    const half = Math.floor(dailyStats.length / 2);
    const previousPeriod = dailyStats.slice(0, half);
    const currentPeriod = dailyStats.slice(half);

    const prevAvg =
      previousPeriod.length > 0
        ? previousPeriod.reduce((sum, s) => sum + s.positivePercentage, 0) /
          previousPeriod.length
        : 0;

    const currAvg =
      currentPeriod.length > 0
        ? currentPeriod.reduce((sum, s) => sum + s.positivePercentage, 0) /
          currentPeriod.length
        : 0;

    return {
      total,
      positive,
      negative,
      neutral,
      positivePercentage,
      negativePercentage,
      neutralPercentage,
      trend: currAvg - prevAvg,
    };
  }, [filteredReports, dailyStats]);

  const getTimeFilterLabel = () => {
    const now = new Date();
    switch (timeFilter) {
      case "today":
        return now.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      case "week":
        return "Last 7 Days";
      case "month":
        return now.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      case "year":
        return now.getFullYear().toString();
    }
  };

  const maxStudentTotal = Math.max(...studentStats.map((s) => s.total), 1);

  return (
    <div className="min-h-screen bg-[#FCFAF6] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#2D1F16] mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-[#7A6753] font-medium">
              Performance metrics and insights
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E9E2D6] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              <Users className="w-5 h-5 text-[#9A8572]" />
            </div>
            <p className="text-xs font-semibold text-[#9A8572] uppercase tracking-wider mb-2">
              Total Calls
            </p>
            <p className="text-4xl font-bold text-[#2D1F16] mb-1">
              {overallStats.total}
            </p>
            <p className="text-sm text-[#7A6753] font-medium">
              {getTimeFilterLabel()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-500/20 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              {overallStats.trend > 0 ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    +{overallStats.trend.toFixed(1)}%
                  </span>
                </div>
              ) : overallStats.trend < 0 ? (
                <div className="flex items-center gap-1 text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-bold">
                    {overallStats.trend.toFixed(1)}%
                  </span>
                </div>
              ) : null}
            </div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              Positive
            </p>
            <p className="text-4xl font-bold text-emerald-400 mb-1">
              {Math.round(overallStats.positivePercentage)}%
            </p>
            <p className="text-sm text-[#7A6753] font-medium">
              {overallStats.positive} calls
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-red-500/20 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
              Negative
            </p>
            <p className="text-4xl font-bold text-red-400 mb-1">
              {Math.round(overallStats.negativePercentage)}%
            </p>
            <p className="text-sm text-[#7A6753] font-medium">
              {overallStats.negative} calls
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-amber-500/20 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Neutral
            </p>
            <p className="text-4xl font-bold text-amber-400 mb-1">
              {Math.round(overallStats.neutralPercentage)}%
            </p>
            <p className="text-sm text-[#7A6753] font-medium">
              {overallStats.neutral} calls
            </p>
          </div>
        </div>

        {/* Upload Quality vs Positive Rate – FULL WIDTH */}
        <div className="bg-white rounded-2xl p-8 border border-[#E9E2D6] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#2D1F16]">
                Upload Volume vs Positive Response Rate
              </h2>
              <p className="text-sm text-[#7A6753]">
                Recordings uploaded (bars) against quality signal (line) — spot
                when volume outpaces quality
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">
                {getTimeFilterLabel()}
              </span>
            </div>
          </div>

          <UploadQualityChart data={comparisonData} timeFilter={timeFilter} />
        </div>        
      </div>
    </div>
  );
}