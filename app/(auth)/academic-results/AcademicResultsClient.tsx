"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, GraduationCap, RefreshCw } from "lucide-react";
import { currentMonth, type TabKey } from "./data";
import { TabBar, CourseFilter } from "./ui";
import {
  DailyQuizTab,
  MockInterviewTab,
  AiHrCallingTab,
  RealHrCallingTab,
} from "./tabs";

const DESCRIPTIONS: Record<TabKey, string> = {
  quiz: "Daily quiz performance — click a highlighted day to see student attempts.",
  mock: "Mock interview activity — click a highlighted day to see attempts.",
  ai: "AI HR agent calls — click a highlighted day to see call records.",
  realhr: "Team HR calling activity — click a highlighted day to see member reports.",
};

export default function AcademicResultsClient() {
  const [tab, setTab] = useState<TabKey>("quiz");
  const [month, setMonth] = useState<string>(currentMonth());
  const [courseId, setCourseId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/studentOverview"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800"
              aria-label="Back to students"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Academic Results</h1>
              <p className="text-sm text-slate-400">{DESCRIPTIONS[tab]}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(tab === "quiz" || tab === "mock" || tab === "ai") && (
              <CourseFilter value={courseId} onChange={setCourseId} />
            )}
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
              />
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <TabBar active={tab} onChange={setTab} />

        {/* Only the active tab is mounted, so switching tabs fetches fresh data. */}
        {tab === "quiz" && (
          <DailyQuizTab
            month={month}
            courseId={courseId}
            refreshKey={refreshKey}
            onMonthChange={setMonth}
          />
        )}
        {tab === "mock" && (
          <MockInterviewTab
            month={month}
            courseId={courseId}
            refreshKey={refreshKey}
            onMonthChange={setMonth}
          />
        )}
        {tab === "ai" && (
          <AiHrCallingTab
            month={month}
            courseId={courseId}
            refreshKey={refreshKey}
            onMonthChange={setMonth}
          />
        )}
        {tab === "realhr" && (
          <RealHrCallingTab
            month={month}
            refreshKey={refreshKey}
            onMonthChange={setMonth}
          />
        )}
      </div>
    </div>
  );
}
