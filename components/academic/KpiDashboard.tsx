"use client";

import React from "react";
import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  Mic,
  PhoneCall,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { DrillDown, ParticipationData } from "./types";

// ── tone system ──────────────────────────────────────────────────────────────────
// Numbers stay neutral white; colour is reserved for status (pill, bar, trend), so the
// page reads as a report rather than a rainbow.
type Tone = "good" | "info" | "warn" | "bad" | "neutral";

const TONES: Record<Tone, { bar: string; pill: string; text: string }> = {
  good: { bar: "bg-emerald-400", pill: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30", text: "text-emerald-300" },
  info: { bar: "bg-sky-400", pill: "bg-sky-500/10 text-sky-300 ring-sky-500/30", text: "text-sky-300" },
  warn: { bar: "bg-amber-400", pill: "bg-amber-500/10 text-amber-300 ring-amber-500/30", text: "text-amber-300" },
  bad: { bar: "bg-rose-400", pill: "bg-rose-500/10 text-rose-300 ring-rose-500/30", text: "text-rose-300" },
  neutral: { bar: "bg-slate-400", pill: "bg-slate-500/10 text-slate-300 ring-slate-500/30", text: "text-slate-300" },
};

type Level = { tone: Tone; label: string };

// Participation / attendance: how consistently the student showed up.
const participationLevel = (p: number | null | undefined): Level =>
  p === null || p === undefined
    ? { tone: "neutral", label: "No data" }
    : p >= 80
      ? { tone: "good", label: "On track" }
      : p >= 60
        ? { tone: "warn", label: "Needs attention" }
        : { tone: "bad", label: "At risk" };

// Scores: same four bands as the Academic Performance card.
const scoreLevel = (p: number | null | undefined): Level =>
  p === null || p === undefined
    ? { tone: "neutral", label: "No data" }
    : p >= 75
      ? { tone: "good", label: "Strong" }
      : p >= 50
        ? { tone: "info", label: "Good" }
        : p >= 25
          ? { tone: "warn", label: "Developing" }
          : { tone: "bad", label: "Needs work" };

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
const share = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 1000) / 10) : null);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Pill({ level }: { level: Level }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TONES[level.tone].pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONES[level.tone].bar}`} />
      {level.label}
    </span>
  );
}

function Fraction({ a, b }: { a: React.ReactNode; b: React.ReactNode }) {
  return (
    <>
      {a}
      <span className="ml-1 text-xl font-medium text-slate-500">/ {b}</span>
    </>
  );
}

// ── building blocks ─────────────────────────────────────────────────────────────
const GRID: Record<2 | 3 | 4, string> = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
};

function Section({
  icon: Icon,
  title,
  subtitle,
  status,
  cols,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  status?: Level;
  cols: 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700/40 text-slate-200">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        {status && <Pill level={status} />}
      </div>
      <div className={GRID[cols]}>{children}</div>
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  tone = "neutral",
  ratio = null,
  level,
  cta,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone?: Tone;
  /** 0-100 fill for the thin progress bar; null hides the bar. */
  ratio?: number | null;
  level?: Level;
  cta?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {level && <Pill level={level} />}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      {ratio !== null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-700/70">
          <div className={`h-full rounded-full transition-all ${TONES[tone].bar}`} style={{ width: `${ratio}%` }} />
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{sub}</p>
      {onClick && (
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-sky-300 transition-colors group-hover:text-sky-200">
          {cta ?? "View breakdown"}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );

  const base = "flex h-full flex-col rounded-xl border border-slate-700/60 bg-slate-900/50 p-5 text-left";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`group ${base} transition hover:border-slate-500 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60`}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-400">
      {children}
    </div>
  );
}

// ── the dashboard ───────────────────────────────────────────────────────────────
export default function KpiDashboard({
  data,
  onOpen,
}: {
  data: ParticipationData;
  onOpen: (view: DrillDown) => void;
}) {
  const att = data.attendance;
  const quiz = data.dailyQuiz;
  const mega = data.weeklyTest;
  const mock = data.aiMockInterview;
  const ai = data.aiHrCalling;
  const real = data.realHrCalling;

  const attLevel = att.matched ? participationLevel(att.attendancePercentage) : participationLevel(null);
  const quizLevel = participationLevel(quiz.attendancePercentage);
  const megaLevel = scoreLevel(mega.averagePercentage);
  const aiLevel = participationLevel(ai.attendancePercentage);
  const quizScoreLevel = scoreLevel(quiz.scorePercentage);
  const optional = quiz.compulsory ? "" : " · optional for this zone";
  const trend = mega.change;

  return (
    <>
      {/* At-a-glance health */}
      <Section
        icon={LayoutDashboard}
        title="Performance Snapshot"
        subtitle="Headline health across the main activities for the selected period"
        cols={4}
      >
        <Tile
          label="Class attendance"
          value={att.matched ? pct(att.attendancePercentage) : "—"}
          tone={attLevel.tone}
          ratio={att.matched ? att.attendancePercentage : null}
          level={attLevel}
          sub={att.matched ? `${att.presentDays} of ${att.expectedDays} working days` : "No biometric ID linked"}
        />
        <Tile
          label="Quiz participation"
          value={pct(quiz.attendancePercentage)}
          tone={quizLevel.tone}
          ratio={quiz.attendancePercentage}
          level={quizLevel}
          sub={`${quiz.presentDays} of ${quiz.expectedDays} quiz days${optional}`}
        />
        <Tile
          label="Mega test average"
          value={pct(mega.averagePercentage)}
          tone={megaLevel.tone}
          ratio={mega.averagePercentage}
          level={megaLevel}
          sub={`${plural(mega.evaluatedAttempts, "exam")} · ${mega.totalObtained} / ${mega.totalPossible} marks`}
        />
        <Tile
          label="AI HR answer rate"
          value={pct(ai.attendancePercentage)}
          tone={aiLevel.tone}
          ratio={ai.attendancePercentage}
          level={aiLevel}
          sub={`${ai.presentDays} of ${ai.presentDays + ai.absentDays} days answered`}
        />
      </Section>

      {/* Class attendance */}
      <Section
        icon={CalendarCheck}
        title="Class Attendance"
        subtitle="Biometric punches · present means punched in and out · Monday to Saturday"
        status={att.matched ? attLevel : undefined}
        cols={2}
      >
        {att.matched ? (
          <>
            <Tile
              label="Days present"
              value={<Fraction a={att.presentDays} b={att.expectedDays} />}
              tone="good"
              ratio={share(att.presentDays, att.expectedDays)}
              sub="Punched in and out"
              cta="View week by week"
              onClick={() => onOpen("att-present")}
            />
            <Tile
              label="Days absent"
              value={<Fraction a={att.absentDays} b={att.expectedDays} />}
              tone="bad"
              ratio={share(att.absentDays, att.expectedDays)}
              sub={
                att.noPunchOutDays
                  ? `${plural(att.noPunchOutDays, "day")} with a missed punch-out`
                  : "No punch or missed punch-out"
              }
              cta="View week by week"
              onClick={() => onOpen("att-absent")}
            />
          </>
        ) : (
          <Note>Attendance isn&apos;t tracked for this student yet — no biometric ID is linked.</Note>
        )}
      </Section>

      {/* Daily quiz */}
      <Section
        icon={ClipboardList}
        title="Quiz Performance"
        subtitle="Daily quizzes uploaded for the student's batch vs what they attempted"
        status={quizLevel}
        cols={4}
      >
        <Tile
          label="Attempted vs uploaded"
          value={<Fraction a={quiz.daysAttempted} b={quiz.daysUploaded} />}
          tone={quizLevel.tone}
          ratio={share(quiz.daysAttempted, quiz.daysUploaded)}
          sub={`Days · ${quiz.quizzesAttempted} of ${quiz.quizzesUploaded} quizzes attempted`}
        />
        <Tile
          label="Days attempted"
          value={quiz.daysAttempted}
          tone={quizScoreLevel.tone}
          ratio={quiz.scorePercentage}
          level={quiz.scorePossible ? quizScoreLevel : undefined}
          sub={`Total score ${quiz.scoreObtained} / ${quiz.scorePossible} (${pct(quiz.scorePercentage)})`}
          cta="View answers & marks"
          onClick={() => onOpen("quiz-attempted")}
        />
        <Tile
          label="Days absent"
          value={quiz.absentDays}
          tone="bad"
          ratio={share(quiz.absentDays, quiz.expectedDays)}
          sub={`Quiz uploaded, none attempted${optional}`}
          cta="View missed question papers"
          onClick={() => onOpen("quiz-absent")}
        />
        <Tile
          label="Participation"
          value={pct(quiz.attendancePercentage)}
          tone={quizLevel.tone}
          ratio={quiz.attendancePercentage}
          level={quizLevel}
          sub={`${quiz.presentDays} present · ${quiz.absentDays} absent`}
        />
      </Section>

      {/* Mega test */}
      <Section
        icon={Trophy}
        title="Mega Test Performance"
        subtitle="Evaluated weekly mega tests · marks, answers and feedback"
        status={mega.evaluatedAttempts ? megaLevel : undefined}
        cols={2}
      >
        <Tile
          label="Mega tests attempted"
          value={mega.evaluatedAttempts}
          sub={
            mega.notEvaluatedAttempts
              ? `${mega.notEvaluatedAttempts} awaiting evaluation`
              : `Best ${pct(mega.highest?.percentage)} · lowest ${pct(mega.lowest?.percentage)}`
          }
          cta="View results & answers"
          onClick={() => onOpen("mega-exams")}
        />
        <Tile
          label="Average score"
          value={pct(mega.averagePercentage)}
          tone={megaLevel.tone}
          ratio={mega.averagePercentage}
          level={megaLevel}
          sub={
            <>
              Marks {mega.totalObtained} / {mega.totalPossible}
              {trend !== null && (
                <span className={`ml-2 font-semibold ${trend >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} pts vs previous
                </span>
              )}
            </>
          }
          cta="View results & answers"
          onClick={() => onOpen("mega-exams")}
        />
      </Section>

      {/* AI mock interviews */}
      <Section
        icon={Mic}
        title="AI Mock Interview Performance"
        subtitle="Each student can take a limited number of AI mock interviews"
        status={{ tone: "info", label: `${mock.attemptsLeft} attempt${mock.attemptsLeft === 1 ? "" : "s"} left` }}
        cols={2}
      >
        <Tile
          label="Total attempts"
          value={<Fraction a={mock.attemptsUsed} b={mock.attemptLimit} />}
          tone={mock.attemptsLeft === 0 ? "warn" : "info"}
          ratio={share(mock.attemptsUsed, mock.attemptLimit)}
          sub={mock.attemptsLeft === 0 ? "Attempt limit reached" : `${mock.attemptsLeft} remaining`}
        />
        <Tile
          label="Days attempted"
          value={mock.daysAttempted}
          sub="Days with at least one interview"
          cta="View interviews & feedback"
          onClick={() => onOpen("mock-present")}
        />
      </Section>

      {/* AI HR calling */}
      <Section
        icon={Headphones}
        title="AI HR Calling"
        subtitle={`The dialer calls up to ${ai.maxCallsPerDay} times a day · a day counts as answered if any call is picked up`}
        status={aiLevel}
        cols={3}
      >
        <Tile
          label="Days answered vs called"
          value={<Fraction a={ai.presentDays} b={ai.daysCalled} />}
          tone={aiLevel.tone}
          ratio={share(ai.presentDays, ai.daysCalled)}
          sub={`${plural(ai.totalCalls, "call")} made in total`}
        />
        <Tile
          label="Days attempted"
          value={ai.presentDays}
          tone="good"
          sub={`${plural(ai.callsPicked, "call")} picked up`}
          cta="View call analysis"
          onClick={() => onOpen("ai-answered")}
        />
        <Tile
          label="Days absent"
          value={ai.absentDays}
          tone="bad"
          ratio={share(ai.absentDays, ai.daysCalled)}
          sub={`${plural(ai.callsDnp, "DNP call")} · every call of the day missed`}
          cta="View DNP calls by day"
          onClick={() => onOpen("ai-absent")}
        />
      </Section>

      {/* Real HR calling — green zone only */}
      {real.applicable && (
        <Section
          icon={PhoneCall}
          title="HR Call Records"
          subtitle="Calls with a recording uploaded vs days HR could not connect"
          status={participationLevel(real.attendancePercentage)}
          cols={2}
        >
          <Tile
            label="Days uploaded"
            value={<Fraction a={real.presentDays} b={real.daysCalled} />}
            tone="good"
            ratio={share(real.presentDays, real.daysCalled)}
            sub={`${plural(real.callsConnected, "recording")} uploaded`}
            cta="View recordings & analysis"
            onClick={() => onOpen("real-uploaded")}
          />
          <Tile
            label="Days not uploaded"
            value={<Fraction a={real.absentDays} b={real.daysCalled} />}
            tone="bad"
            ratio={share(real.absentDays, real.daysCalled)}
            sub="Called, but no recording uploaded"
            cta="View days & reasons"
            onClick={() => onOpen("real-missing")}
          />
        </Section>
      )}
    </>
  );
}
