"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Calendar as CalendarIcon,
  Loader2,
  Headphones,
  LayoutDashboard,
  BarChart3,
  ChevronDown,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import DailyCallReport from "@/components/reports/DailyCallReport";
import CallAnalysis from "@/components/reports/CallAnalysis";
import { ThemeToggle } from "@/components/ThemeToggle";
import InterviewSummaryPanel, { type ExternalInterviewRaw, type GroupSummary } from "@/components/reports/Interviewsummarypanel.js";
 

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
  studentName: string;
  email: string;
  phone: string;
  createdAt: string;
  Placed: boolean;
}

export default function StudentsCallReports() {
  const [reports, setReports] = useState<RecordingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "analysis">("daily");
  const { getToken } = useAuth();

  const [externalInterviews, setExternalInterviews] = useState<ExternalInterviewRaw[]>([]);
  const [groupSummary, setGroupSummary] = useState<GroupSummary | null>(null);

  const [filterType, setFilterType] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedDate, setSelectedDate] = useState(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReports();
  }, [filterType, selectedDate, selectedMonth, selectedYear]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const baseUrl = process.env.NEXT_PUBLIC_HR_URL;
      let url = `${baseUrl}/api/reports/all-reports`;

      if (filterType === "day") {
        url += `?filterType=day&date=${selectedDate}`;
      } else if (filterType === "week") {
        const today = new Date(selectedDate);
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const weekStartDate = new Date(today);
        weekStartDate.setDate(today.getDate() + diff);
        const weekStart = weekStartDate.toISOString().split("T")[0];
        url += `?filterType=week&weekStart=${weekStart}`;
      } else if (filterType === "month") {
        url += `?filterType=month&month=${selectedMonth}&year=${selectedYear}`;
      } else if (filterType === "year") {
        url += `?filterType=year&year=${selectedYear}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReports(data.recordings || [])
      setExternalInterviews(data.externalInterviews || []);
      setGroupSummary(data.groupSummary || null);
 ;

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (filterType === "day") {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - 1);
      setSelectedDate(date.toISOString().split("T")[0]);
    } else if (filterType === "week") {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - 7);
      setSelectedDate(date.toISOString().split("T")[0]);
    } else if (filterType === "month") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else if (filterType === "year") {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNext = () => {
    if (filterType === "day") {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + 1);
      setSelectedDate(date.toISOString().split("T")[0]);
    } else if (filterType === "week") {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + 7);
      setSelectedDate(date.toISOString().split("T")[0]);
    } else if (filterType === "month") {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else if (filterType === "year") {
      setSelectedYear(selectedYear + 1);
    }
  };

  const getDisplayLabel = () => {
    if (filterType === "day") {
      return new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (filterType === "week") {
      const date = new Date(selectedDate);
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() + diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else if (filterType === "month") {
      return new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else {
      return selectedYear.toString();
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFBF7] space-y-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#8B4513] animate-spin" />
          <Headphones className="w-6 h-6 text-[#A0522D] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-[#5D4037] font-medium text-xl animate-pulse">Summoning Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A2C2A] selection:bg-[#EEDC82] selection:text-[#4A2C2A] flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 h-screen flex flex-col py-8 px-6 lg:px-12 overflow-hidden">

        {/* Top Navigation & Global Controls */}
        <header className="shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-10">
            {/* Brand */}
            <div className="space-y-1 pr-10 border-r border-[#F5F5DC]">
              <h1 className="text-3xl font-medium tracking-tight text-[#3E2723]">
                Call <span className="text-[#8B4513]">Intelligence</span>
              </h1>
              {/* "ENTERPRISE REPORTING" subtitle — theme-aware */}
              <p className="enterprise-subtitle text-[10px] font-medium tracking-[0.2em] uppercase text-[#D2B48C]">
                Enterprise Reporting
              </p>
            </div>

            {/* Tab Nav */}
            <nav className="flex bg-white p-2 rounded-[2rem] border border-[#F5F5DC] shadow-sm">
              <button
                onClick={() => setActiveTab("daily")}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-medium text-sm transition-all duration-300 ${
                  activeTab === "daily"
                    ? "bg-[#8B4513] text-white shadow-lg"
                    : "text-[#8D6E63] hover:bg-[#FAF9F6] hover:text-[#8B4513]"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Daily Call Report
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-medium text-sm transition-all duration-300 ${
                  activeTab === "analysis"
                    ? "bg-[#8B4513] text-white shadow-lg"
                    : "text-[#8D6E63] hover:bg-[#FAF9F6] hover:text-[#8B4513]"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Call Analysis
              </button>
            </nav>
          </div>

          <ThemeToggle />

          {/* Resume Builder link — icons use theme-aware class */}
          <Link
            href="/resume-builder"
            className="resume-builder-btn flex items-center gap-3 px-8 py-4 bg-white text-[#8B4513] border border-[#EFEBE9] rounded-3xl font-medium text-sm transition-all duration-300 hover:bg-[#FAF9F6] hover:shadow-md shadow-sm group"
          >
            <FileText className="resume-builder-icon w-4 h-4 text-[#D2B48C] group-hover:text-[#8B4513] transition-colors" />
            <span>Resume Builder</span>
          </Link>
        </header>

        {/* Sticky Filter Bar */}
        <div className="shrink-0 sticky top-0 z-40 bg-gradient-to-r from-white via-[#FAF5EC] to-white border-2 border-[#E5D9C6] rounded-[2rem] p-4 shadow-lg mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "day" | "week" | "month" | "year")}
                className="bg-white px-5 py-3 rounded-2xl border-2 border-[#EFEBE9] outline-none font-semibold text-[#4A2C2A] hover:border-[#8B4513] focus:border-[#8B4513] focus:ring-4 focus:ring-[#F5F5DC] transition-all shadow-sm"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>

              <div className="flex items-center gap-2 bg-white border-2 border-[#EFEBE9] rounded-2xl px-3 py-2 shadow-sm">
                <button
                  onClick={handlePrevious}
                  className="p-2 hover:bg-[#FAF9F6] rounded-xl transition-all group"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5 text-[#8B4513] group-hover:text-[#5D4037]" />
                </button>

                <div className="px-4 py-1 min-w-[200px] text-center">
                  <p className="text-sm font-bold text-[#3E2723]">{getDisplayLabel()}</p>
                </div>

                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-[#FAF9F6] rounded-xl transition-all group"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5 text-[#8B4513] group-hover:text-[#5D4037]" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date picker — calendar icon theme-aware */}
              <div className="relative group">
                <CalendarIcon className="date-picker-icon absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[#D2B48C] group-focus-within:text-[#8B4513] transition-colors" />
                <input
                  type="date"
                  className="bg-white pl-12 pr-8 py-3 rounded-2xl border-2 border-[#EFEBE9] outline-none font-semibold text-[#4A2C2A] focus:ring-4 focus:ring-[#F5F5DC] focus:border-[#8B4513] transition-all shadow-sm cursor-pointer"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {loading && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-200">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs font-semibold text-blue-600">Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Section Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {activeTab === "daily" ? (
            <DailyCallReport
                reports={reports} 
                selectedDate={getDisplayLabel()} 
                externalInterviews={externalInterviews}
                groupSummary={groupSummary} 
            />
          ) : (
            <CallAnalysis reports={reports} />
          )}
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        body {
          font-family: 'Inter', sans-serif;
          background-color: #FDFBF7;
        }

        h1, h2, h3, h4, .font-medium {
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #EFEBE9;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D7CCC8; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }

        /* ─── Dark mode: "Enterprise Reporting" subtitle ───────────── */
        [data-theme="dark"] .enterprise-subtitle {
          color: var(--text-muted) !important;
        }

        /* ─── Dark mode: Resume Builder button ─────────────────────── */
        [data-theme="dark"] .resume-builder-btn {
          background-color: var(--bg-card) !important;
          border-color: var(--border-primary) !important;
          color: var(--brand-text) !important;
        }
        [data-theme="dark"] .resume-builder-btn:hover {
          background-color: var(--bg-accent) !important;
        }
        /* FileText icon inside Resume Builder → white in dark */
        [data-theme="dark"] .resume-builder-icon {
          color: #ffffff !important;
        }
        [data-theme="dark"] .resume-builder-btn:hover .resume-builder-icon {
          color: var(--brand-text) !important;
        }

        /* ─── Dark mode: Calendar icon in date picker ───────────────── */
        [data-theme="dark"] .date-picker-icon {
          color: #ffffff !important;
        }
        [data-theme="dark"] .group:focus-within .date-picker-icon {
          color: var(--brand-text) !important;
        }

        /* ─── Dark mode: date input text color ──────────────────────── */
        [data-theme="dark"] input[type="date"] {
          color: var(--text-primary) !important;
          background-color: var(--bg-card) !important;
          border-color: var(--border-primary) !important;
        }
      `}</style>
    </div>
  );
}