"use client";

import React, { useMemo } from "react";
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
} from "lucide-react";

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
    flags?: string[];
  };
  type?: "recording" | "manual";
  manualStatus?: string;
  studentName: string;
  phone: string;
  email: string;
  createdAt: string;
}

interface DailyCallReportProps {
  reports: RecordingReport[];
  selectedDate: string;
}

type Sentiment = "pos" | "neg" | "neutral";

export default function DailyCallReport({
  reports,
  selectedDate,
}: DailyCallReportProps) {
  const analytics = useMemo(() => {
    let totalCalls = reports.length;
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let manualLogs = 0;
    let followUps = 0;

    const studentStats: Record<
      string,
      {
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
      }
    > = {};

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
        };
      }

      const current = studentStats[r.leadId];
      current.total++;

      if (r.type === "manual") current.manual++;
      if (sentiment === "pos") current.pos++;
      if (sentiment === "neg") current.neg++;
      if (sentiment === "neutral") current.neutral++;
      if (r.analysis?.followUpRequired) current.followUps++;

      const numberMatch =
        r.originalFileName?.match(/\d{10,}/)?.[0] ||
        r.phone?.match(/\d{10,}/)?.[0];

      if (numberMatch) current.numbers.add(numberMatch);
    });

    const students = Object.values(studentStats)
      .map((s) => ({
        ...s,
        uniqueNumbers: s.numbers.size,
        conversionRate:
          s.total > 0 ? Math.round((s.pos / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const totalStudents = students.length;
    const conversionRate =
      totalCalls > 0 ? Math.round((positive / totalCalls) * 100) : 0;
    const negativeRate =
      totalCalls > 0 ? Math.round((negative / totalCalls) * 100) : 0;
    const neutralRate =
      totalCalls > 0 ? Math.round((neutral / totalCalls) * 100) : 0;

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
    };
  }, [reports]);

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
              <p className="mt-2 text-xs sm:text-sm text-[#7A6753] leading-relaxed">
                Understand student call effort, success, failures, manual
                entries, and follow-up pipeline for{" "}
                <span className="font-semibold text-[#5C3B1E]">
                  {selectedDate}
                </span>
                .
              </p>
            </div>

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

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-5">
          <div className={cardBase}>
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#FFF3E7]">
              <PhoneCall className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B4513]" />
            </div>
            <p className={labelClass}>Total Calls</p>
            <p className={valueClass}>{analytics.totalCalls}</p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              All recordings + manual entries
            </p>
          </div>

          <div className={cardBase}>
            <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#F4EFE7]">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#8B4513]" />
            </div>
            <p className={labelClass}>Students</p>
            <p className={valueClass}>{analytics.totalStudents}</p>
            <p className="mt-2 text-[11px] sm:text-xs text-[#8A7968] leading-relaxed">
              Unique students with call activity
            </p>
          </div>

          <div className={cardBase}>
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

          <div className={cardBase}>
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

          <div className={cardBase}>
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
                  {analytics.positive} / {analytics.neutral} / {analytics.negative}
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
                      formatter={(value: number, name: string) => [value, name]}
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
                    <Bar dataKey="Positive" fill="#16a34a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Neutral" fill="#d97706" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Negative" fill="#dc2626" radius={[6, 6, 0, 0]} />
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
              Student-wise activity overview
            </p>
          </div>

          {analytics.students.length > 0 ? (
            analytics.students.map((s, index) => (
              <div
                key={s.leadId + index}
                className="rounded-[1.5rem] border border-[#E9E2D6] bg-white shadow-sm p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EEDC] font-semibold text-[#8B4513] shrink-0">
                    {s.name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D1F16] truncate">{s.name}</p>
                    <p className="text-xs text-[#8A7968] break-all">{s.email}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[#FBF8F3] p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#9A7B5A]">
                      Total
                    </p>
                    <p className="mt-1 font-semibold text-[#2D1F16]">{s.total}</p>
                  </div>

                  <div className="rounded-xl bg-[#FBF8F3] p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#9A7B5A]">
                      Unique No.
                    </p>
                    <p className="mt-1 font-semibold text-[#2D1F16]">
                      {s.uniqueNumbers}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-green-700">
                      Positive
                    </p>
                    <p className="mt-1 font-semibold text-green-700">{s.pos}</p>
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
                    <p className="mt-1 font-semibold text-red-700">{s.neg}</p>
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
              Student-wise activity, quality, and follow-up visibility
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
                    Unique No.
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
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F7F0E6]">
                {analytics.students.length > 0 ? (
                  analytics.students.map((s, index) => (
                    <tr key={s.leadId + index} className="hover:bg-[#FFFDF9]">
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

                      <td className="px-4 py-5 text-center font-medium text-[#2D1F16]">
                        {s.uniqueNumbers}
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
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
    </div>
  );
}