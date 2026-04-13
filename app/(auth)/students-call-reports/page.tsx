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
} from "lucide-react";
import Link from "next/link";

import DailyCallReport from "@/components/reports/DailyCallReport";
import CallAnalysis from "@/components/reports/CallAnalysis";

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
}

export default function StudentsCallReports() {
  const [reports, setReports] = useState<RecordingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "analysis">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchReports();
  }, [selectedDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      
      const baseUrl = process.env.NEXT_PUBLIC_HR_URL;
      const res = await fetch(`${baseUrl}/api/reports/all-reports?date=${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setReports(data.recordings || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
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
        <header className="shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-12">
          
          <div className="flex items-center gap-10">
            {/* Logo area */}
            <div className="space-y-1 pr-10 border-r border-[#F5F5DC]">
              <h1 className="text-3xl font-medium tracking-tight text-[#3E2723]">
                Call <span className="text-[#8B4513]">Intelligence</span>
              </h1>
              <p className="text-[10px] font-medium text-[#D2B48C] tracking-[0.2em] uppercase">Enterprise Reporting</p>
            </div>

            {/* Tab Switcher */}
            <nav className="flex bg-white p-2 rounded-[2rem] border border-[#F5F5DC] shadow-sm">
              <button
                onClick={() => setActiveTab("daily")}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-medium text-sm transition-all duration-300 ${activeTab === 'daily' ? 'bg-[#8B4513] text-white shadow-lg' : 'text-[#8D6E63] hover:bg-[#FAF9F6] hover:text-[#8B4513]'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Daily Call Report
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-medium text-sm transition-all duration-300 ${activeTab === 'analysis' ? 'bg-[#8B4513] text-white shadow-lg' : 'text-[#8D6E63] hover:bg-[#FAF9F6] hover:text-[#8B4513]'}`}
              >
                <BarChart3 className="w-4 h-4" /> Call Analysis
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/resume-builder"
              className="flex items-center gap-3 px-8 py-4 bg-white text-[#8B4513] border border-[#EFEBE9] rounded-3xl font-medium text-sm transition-all duration-300 hover:bg-[#FAF9F6] hover:shadow-md shadow-sm group"
            >
              <FileText className="w-4 h-4 text-[#D2B48C] group-hover:text-[#8B4513] transition-colors" />
              <span>Resume Builder</span>
            </Link>

            {/* Premium Date Picker */}
            <div className="relative group">
               <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D2B48C] w-5 h-5 pointer-events-none group-focus-within:text-[#8B4513]" />
               <input 
                 type="date"
                 className="bg-white pl-16 pr-10 py-5 rounded-3xl border border-[#EFEBE9] outline-none font-medium text-[#4A2C2A] focus:ring-4 focus:ring-[#F5F5DC] focus:border-[#D2B48C] transition-all shadow-sm cursor-pointer appearance-none"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
               />
               <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#D2B48C] w-4 h-4 pointer-events-none" />
            </div>

            {loading && <Loader2 className="w-5 h-5 text-[#8B4513] animate-spin" />}
          </div>
        </header>

        {/* Dynamic Section Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
           {activeTab === "daily" ? (
             <DailyCallReport reports={reports} selectedDate={selectedDate} />
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

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #EFEBE9;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D7CCC8;
        }

        /* Modern Date Picker fix for some browsers */
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
      `}</style>
    </div>
  );
}
