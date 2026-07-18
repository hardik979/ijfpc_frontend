"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  BookOpen,
  Layers,
  ChevronRight,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";

type Batch = {
  _id: string;
  batch?: string;
  status?: string;
  students?: string[];
  course?: { _id: string; title?: string } | string | null;
  createdAt?: string;
};

const STATUS_FILTERS = ["All", "Active", "Upcoming", "Completed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusStyles = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "active")
    return { dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30" };
  if (s === "completed")
    return { dot: "bg-sky-400", badge: "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30" };
  return { dot: "bg-amber-400", badge: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30" };
};

const courseTitle = (course: Batch["course"]) => {
  if (!course) return "";
  if (typeof course === "string") return "";
  return course.title || "";
};

export default function BatchSectionPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");

  const loadBatches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_LMS_URL}/api/batches/get-batches?limit=100`, {
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load batches");
      setBatches(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load batches");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (status !== "All" && (b.status || "").toLowerCase() !== status.toLowerCase())
        return false;
      if (!q) return true;
      return (
        (b.batch || "").toLowerCase().includes(q) ||
        courseTitle(b.course).toLowerCase().includes(q)
      );
    });
  }, [batches, search, status]);

  const totalStudents = useMemo(
    () => batches.reduce((sum, b) => sum + (b.students?.length || 0), 0),
    [batches]
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[var(--panel-bg-950)] via-[var(--panel-bg-950)] to-[var(--panel-bg-900)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back */}
        <Link
          href="/studentOverview"
          className="group mb-8 inline-flex items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] backdrop-blur-sm transition-all hover:border-[var(--panel-border)] hover:bg-[var(--panel-card)] hover:text-[var(--panel-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Students Overview</span>
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
                <LayoutGrid className="h-7 w-7 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--panel-text-primary)] sm:text-4xl">Batches</h1>
              <p className="mt-1 text-sm text-[var(--panel-text-muted)]">
                {loading
                  ? "Loading batches…"
                  : `${batches.length} batch${batches.length === 1 ? "" : "es"} · ${totalStudents} student${
                      totalStudents === 1 ? "" : "s"
                    } assigned`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={loadBatches}
              title="Refresh"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-card)] hover:text-[var(--panel-text-primary)]"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/batch-section/create-batch"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Create Batch
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batches by name or course…"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-3 pl-10 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  status === s
                    ? "bg-[var(--panel-card)] text-[var(--panel-text-primary)]"
                    : "text-[var(--panel-text-muted)] hover:text-[var(--panel-text-secondary)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasBatches={batches.length > 0} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b, i) => {
              const st = statusStyles(b.status);
              const count = b.students?.length || 0;
              const title = courseTitle(b.course);
              return (
                <motion.div
                  key={b._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                >
                  <Link
                    href={`/batch-section/${b._id}`}
                    className="group block h-full overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all hover:-translate-y-1 hover:border-[var(--panel-border)] hover:bg-[var(--panel-card)] hover:shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)]">
                          <Layers className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-[var(--panel-text-primary)]">
                            {b.batch || "Untitled batch"}
                          </h3>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${st.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {b.status || "—"}
                      </span>
                    </div>

                    <div className="space-y-3 px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--panel-text-muted)]">
                        <BookOpen className="h-4 w-4 text-[var(--panel-text-faint)]" />
                        <span className="truncate">{title || "No course linked"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-[var(--panel-text-secondary)]">
                          <Users className="h-4 w-4 text-indigo-400" />
                          <span className="font-semibold text-[var(--panel-text-primary)]">{count}</span>
                          <span className="text-[var(--panel-text-faint)]">
                            student{count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300/80 transition group-hover:text-cyan-200">
                          Manage
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasBatches }: { hasBatches: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-6 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)]">
        <Layers className="h-8 w-8 text-[var(--panel-text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--panel-text-primary)]">
        {hasBatches ? "No batches match your filters" : "No batches yet"}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--panel-text-muted)]">
        {hasBatches
          ? "Try clearing the search or switching the status filter."
          : "Create your first batch to start assigning students to it."}
      </p>
      {!hasBatches && (
        <Link
          href="/batch-section/create-batch"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create your first batch
        </Link>
      )}
    </div>
  );
}
