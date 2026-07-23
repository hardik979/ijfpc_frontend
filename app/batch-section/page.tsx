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
  Table as TableIcon,
  UserX,
  UserCheck,
  X,
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

type UnStudent = { _id: string; fullName?: string; email?: string; zone?: string };

type ActiveStudent = {
  _id: string;
  fullName?: string;
  email?: string;
  zone?: string;
  isRealUser?: boolean;
  isPlaced?: boolean;
  isPaused?: boolean;
  purchasedCourses?: unknown[];
  batchCode?: string | null;
};

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-700 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-700 ring-1 ring-slate-500/30";
};

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

  // Full active-student list (dashboard's "Active students" definition). We split it
  // into in-a-batch / not-in-a-batch using the real batch membership arrays (below),
  // so the numbers reconcile with the batch cards.
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const loadActiveStudents = async () => {
    try {
      setLoadingUnassigned(true);
      const res = await fetch(`${API_LMS_URL}/api/users/active-placement-students?status=all`, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
        },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load students");

      const all: ActiveStudent[] = Array.isArray(json?.students) ? json.students : [];
      // Active students — the exact same filter as the dashboard's "Active students"
      // card (StudentList `activeStudentsBase`): a real student enrolled in a course
      // who is NOT placed and NOT paused.
      const active = all.filter(
        (s) =>
          s.isRealUser !== true &&
          s.isPlaced !== true &&
          s.isPaused !== true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      );
      setActiveStudents(active);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load active students");
      setActiveStudents([]);
    } finally {
      setLoadingUnassigned(false);
    }
  };

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
    loadActiveStudents();
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

  // "In a batch" is derived from the batch membership arrays the cards render — the
  // SAME source as each card's student count — NOT the student's own batchCode field
  // (which can drift out of sync). Using a Set also de-dupes students who appear in
  // more than one batch. This keeps the KPI reconciled with the cards:
  //   active students in a batch  +  active students not in a batch  =  active total.
  const batchMemberIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of batches) (b.students || []).forEach((id) => set.add(String(id)));
    return set;
  }, [batches]);

  const unassigned = useMemo(() => {
    const notInBatch = activeStudents.filter((s) => !batchMemberIds.has(String(s._id)));
    return {
      count: notInBatch.length,
      total: activeStudents.length,
      assigned: activeStudents.length - notInBatch.length,
      students: notInBatch.map((s) => ({
        _id: s._id,
        fullName: s.fullName,
        email: s.email,
        zone: s.zone,
      })) as UnStudent[],
    };
  }, [activeStudents, batchMemberIds]);

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
              onClick={() => {
                loadBatches();
                loadActiveStudents();
              }}
              title="Refresh"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-card)] hover:text-[var(--panel-text-primary)]"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/batch-section/overview"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-semibold text-[var(--panel-text-secondary)] transition hover:text-[var(--panel-text-primary)]"
            >
              <TableIcon className="h-4 w-4" />
              Overview
            </Link>
            <Link
              href="/batch-section/create-batch"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Create Batch
            </Link>
          </div>
        </div>

        {/* Unassigned students KPI */}
        <button
          onClick={() => unassigned.count > 0 && setShowUnassigned(true)}
          disabled={loadingUnassigned || loading || unassigned.count === 0}
          className={`group mb-6 flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
            unassigned.count > 0
              ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
              : "cursor-default border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              unassigned.count > 0
                ? "bg-amber-500/15 text-amber-600"
                : "bg-emerald-500/15 text-emerald-600"
            }`}
          >
            {unassigned.count > 0 ? <UserX className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold text-[var(--panel-text-primary)]">
                {loadingUnassigned || loading ? "…" : unassigned.count}
              </span>
              <span className="text-sm font-medium text-[var(--panel-text-secondary)]">
                {unassigned.count === 1 ? "student not in any batch" : "students not in any batch"}
              </span>
            </div>
            <p className="text-xs text-[var(--panel-text-muted)]">
              {loadingUnassigned || loading
                ? "Loading…"
                : `of ${unassigned.total} active student${unassigned.total === 1 ? "" : "s"} · ${unassigned.assigned} already in a batch`}
            </p>
          </div>
          {unassigned.count > 0 && (
            <span className="ml-auto hidden shrink-0 items-center gap-1 text-sm font-semibold text-amber-600 transition group-hover:gap-2 sm:flex">
              View list <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </button>

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

      {showUnassigned && (
        <UnassignedModal
          students={unassigned.students}
          onClose={() => setShowUnassigned(false)}
        />
      )}
    </div>
  );
}

function UnassignedModal({
  students,
  onClose,
}: {
  students: UnStudent[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return students;
    return students.filter(
      (st) =>
        (st.fullName || "").toLowerCase().includes(s) ||
        (st.email || "").toLowerCase().includes(s)
    );
  }, [students, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--panel-bg-950)]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg-900)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] p-5">
          <div>
            <h3 className="text-lg font-semibold text-[var(--panel-text-primary)]">Students not in any batch</h3>
            <p className="mt-0.5 text-sm text-[var(--panel-text-muted)]">
              {students.length} total · assign them via a batch&rsquo;s &ldquo;Add Students&rdquo;.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--panel-text-muted)] transition hover:bg-[var(--panel-border)] hover:text-[var(--panel-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[var(--panel-border)] p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-2.5 pl-9 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--panel-text-faint)]">
              No students match your search.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--panel-border)]">
              {filtered.map((s) => (
                <li key={s._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-semibold text-white">
                    {(s.fullName || "S").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--panel-text-primary)]">
                      {s.fullName || "Unnamed student"}
                    </div>
                    <div className="truncate text-xs text-[var(--panel-text-muted)]">{s.email || "—"}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${zoneBadge(s.zone)}`}>
                    {s.zone?.toUpperCase() || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
