"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, GraduationCap, RefreshCw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import { currentMonth, QUIZ_ALLOWED_COURSE_IDS, type TabKey } from "./data";
import { TabBar, CourseFilter } from "./ui";
import {
  DailyQuizTab,
  MockInterviewTab,
  AiHrCallingTab,
  RealHrCallingTab,
  MockCompletedButton,
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
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--panel-bg-950)] p-4 text-[var(--panel-text-primary)] sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/studentOverview"
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--panel-border-strong)] bg-[var(--panel-card)] text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-card)] hover:text-[var(--panel-text-primary)]"
              aria-label="Back to students"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--panel-text-primary)]">Academic Results</h1>
              <p className="text-sm text-[var(--panel-text-muted)]">{DESCRIPTIONS[tab]}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            {tab === "quiz" && (
              <CourseFilter
                value={courseId}
                onChange={setCourseId}
                allowedIds={QUIZ_ALLOWED_COURSE_IDS}
              />
            )}
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-muted)]" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ colorScheme: theme }}
                className="rounded-md border border-[var(--panel-border-strong)] bg-[var(--panel-card)] py-1.5 pl-8 pr-3 text-sm text-[var(--panel-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--panel-border-strong)] bg-[var(--panel-card)] px-3 py-1.5 text-sm text-[var(--panel-text-primary)] hover:bg-[var(--panel-card)]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabBar active={tab} onChange={setTab} />
          {tab === "mock" && <MockCompletedButton refreshKey={refreshKey} />}
        </div>

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
            refreshKey={refreshKey}
            onMonthChange={setMonth}
          />
        )}
        {tab === "ai" && (
          <AiHrCallingTab
            month={month}
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
