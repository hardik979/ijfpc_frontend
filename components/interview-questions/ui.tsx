"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* Class strings shared by the browse and upload pages so they read as one
   screen. Same tokens as quiz-question-bank so both work in light and dark. */
export const card =
  "rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] backdrop-blur-sm";
export const label =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--panel-text-muted)]";
export const field =
  "w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-2.5 text-sm text-[var(--panel-text-primary)] outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-2 text-sm font-medium text-[var(--panel-text-secondary)] transition-colors hover:border-[var(--panel-border-strong)] hover:text-[var(--panel-text-primary)] disabled:cursor-not-allowed disabled:opacity-40";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40";

export function PageShell({
  icon,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  actions,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative min-h-screen w-full bg-gradient-to-br from-[var(--panel-bg-950)] via-[var(--panel-bg-900)] to-[var(--panel-bg-950)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--panel-text-muted)] transition-colors hover:text-[var(--panel-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        ) : null}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
              <div className="relative rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] p-3 text-cyan-400">
                {icon}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
              {subtitle ? (
                <p className="mt-1 max-w-2xl text-sm text-[var(--panel-text-secondary)]">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

export function Spinner({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--panel-text-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" /> {text}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`${card} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] p-3 text-[var(--panel-text-faint)]">{icon}</div>
      <p className="text-base font-semibold">{title}</p>
      {hint ? <p className="max-w-md text-sm text-[var(--panel-text-muted)]">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "cyan" | "amber" | "rose" | "emerald"; children: ReactNode }) {
  const tones = {
    neutral: "border-[var(--panel-border)] bg-[var(--panel-card-soft)] text-[var(--panel-text-secondary)]",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
