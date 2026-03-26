"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Download,
  Users,
  PhoneCall,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface RecordingReport {
  _id: string;
  leadId: string;
  originalFileName: string;
  status: string;
  analysis?: any;
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

export default function DailyCallReport({
  reports,
  selectedDate,
}: DailyCallReportProps) {
  // 1. Process Data for Charts and Table
  const analytics = useMemo(() => {
    let totalCalls = reports.length;
    let positive = 0;
    let negative = 0;
    let studentStats: Record<string, any> = {};

    reports.forEach((r) => {
      const outcome = (r.analysis?.outcome || "").toUpperCase();
      const code = (r.analysis?.outcomeCode || "").toUpperCase();

      const hasNegative = [
        "NOT_INTERESTED",
        "DISCONNECTED",
        "WRONG_NUMBER",
        "REJECTED",
      ].some((s) => outcome.includes(s) || code.includes(s));

      const hasPositive = [
        "INTERESTED",
        "SUCCESS",
        "CALLBACK",
        "INFO_SHARED",
      ].some((s) => outcome.includes(s) || code.includes(s));

      // Exclusive Sentiment Logic (Priority to manual/negative if both exist)
      let sentiment: "pos" | "neg" | "neutral" = "neutral";
      
      if (r.type === "manual") {
        sentiment = "neg"; // Manual reports (DNP, Invalid, Out of Service) are considered negative hits
      } else if (hasNegative) {
        sentiment = "neg";
      } else if (hasPositive) {
        sentiment = "pos";
      }

      if (sentiment === "pos") positive++;
      else if (sentiment === "neg") negative++;

      if (!studentStats[r.leadId]) {
        studentStats[r.leadId] = {
          name: r.studentName || "Unknown",
          phone: r.phone,
          email: r.email,
          total: 0,
          manual: 0,
          pos: 0,
          neg: 0,
          numbers: new Set(),
        };
      }

      studentStats[r.leadId].total++;
      if (r.type === "manual") {
        studentStats[r.leadId].manual++;
      }
      if (sentiment === "pos") studentStats[r.leadId].pos++;
      if (sentiment === "neg") studentStats[r.leadId].neg++;

      // Extract unique dialed number from filename (assuming filename contains it)
      const numberMatch = r.originalFileName.match(/\d{10,}/);
      if (numberMatch) {
        studentStats[r.leadId].numbers.add(numberMatch[0]);
      }
    });

    return {
      totalCalls,
      positive,
      negative,
      other: totalCalls - positive - negative,
      students: Object.values(studentStats).sort((a, b) => b.total - a.total),
    };
  }, [reports]);

  // Chart Data
  const pieData = [
    { name: "Positive Response", value: analytics.positive, color: "#8B4513" }, // Brown
    { name: "Negative Response", value: analytics.negative, color: "#D2B48C" }, // Tan
    { name: "Neutral/Processing", value: analytics.other, color: "#F5F5DC" }, // Beige
  ].filter((d) => d.value > 0);

  // CSV Export
  const downloadCSV = () => {
    const headers = [
      "Student Name",
      "Total Logs",
      "Manual Logs",
      "Unique Numbers",
      "Positive",
      "Negative",
      "Email",
    ];
    const rows = analytics.students.map((s) => [
      s.name,
      s.total,
      s.manual,
      s.numbers.size,
      s.pos,
      s.neg,
      s.email,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Call_Report_${selectedDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col pt-4 space-y-10 pb-20 overflow-y-auto custom-scrollbar pr-2">
      {/* Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-[#F5F5DC] shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-[#FFF9F0] rounded-2xl flex items-center justify-center">
            <PhoneCall className="w-8 h-8 text-[#8B4513]" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">
              Calls Logged
            </p>
            <p className="text-3xl font-medium text-[#3E2723]">
              {analytics.totalCalls}
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-[#F5F5DC] shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-[#FDF5E6] rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-[#8B4513]" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">
              Total Students{" "}
            </p>
            <p className="text-3xl font-medium text-[#3E2723]">
              {analytics.students.length}
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-[#F5F5DC] shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-700" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">
              Positive
            </p>
            <p className="text-3xl font-medium text-green-700">
              {analytics.positive}
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-[#F5F5DC] shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-red-700" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">
              Negative
            </p>
            <p className="text-3xl font-medium text-red-700">
              {analytics.negative}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Charts Section */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] border border-[#F5F5DC] shadow-sm space-y-6">
          <h3 className="text-xl font-medium text-[#3E2723] px-2 text-center">
            Sentiment Distribution
          </h3>
          <div className="h-[300px]">
            {analytics.totalCalls > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "20px",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                      fontFamily: "Montserrat",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#D2B48C] font-medium italic">
                No chart data for {selectedDate}
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-[#F5F5DC] shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 pb-4 flex justify-between items-center sm:px-10">
            <h3 className="text-xl font-medium text-[#3E2723]">
              Call Details Overview
            </h3>
            <button
              onClick={downloadCSV}
              disabled={analytics.students.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#FAF9F6] border border-[#F5F5DC] text-[#8B4513] rounded-2xl font-medium hover:bg-[#8B4513] hover:text-white transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6]">
                  <th className="px-10 py-5 text-[10px] font-medium text-[#A1887F] uppercase tracking-widest">
                    Students
                  </th>
                  <th className="px-6 py-5 text-[10px] font-medium text-[#A1887F] uppercase tracking-widest text-center">
                    Total Calls
                  </th>
                  <th className="px-6 py-5 text-[10px] font-medium text-[#A1887F] uppercase tracking-widest text-center">
                    Manual Logs
                  </th>
                  <th className="px-6 py-5 text-[10px] font-medium text-[#A1887F] uppercase tracking-widest text-center">
                    Unique No.
                  </th>
                  <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-widest text-center text-green-600">
                    Pos.
                  </th>
                  <th className="px-6 py-5 text-[10px] font-medium uppercase tracking-widest text-center text-red-600">
                    Neg.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FDFBF7]">
                {analytics.students.map((s, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[#FFFDFB] transition-colors group"
                  >
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F5F5DC] rounded-xl flex items-center justify-center text-[#8B4513] font-medium">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#3E2723]">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-[#A1887F]">
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-medium text-[#4A2C2A]">
                      {s.total}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-[#FDF5E6] text-[#8B4513] rounded-lg text-xs font-medium">
                        {s.manual}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center font-medium text-[#4A2C2A]">
                      {s.numbers.size}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                        {s.pos}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium">
                        {s.neg}
                      </span>
                    </td>
                  </tr>
                ))}
                {analytics.students.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-20 text-center text-[#D2B48C] font-medium italic"
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
