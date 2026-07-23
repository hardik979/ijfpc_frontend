"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Users,
  Search,
  BookOpen,
  UserPlus,
  UserMinus,
  Pencil,
  RefreshCw,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Tag,
  GraduationCap,
  MapPin,
  Calendar,
  Clock,
  Plus,
} from "lucide-react";

type Course = { _id: string; title?: string };

type Student = {
  _id: string;
  fullName?: string;
  email?: string;
  zone?: string;
  isPlaced?: boolean;
};

type Batch = {
  _id: string;
  batch?: string;
  status?: string;
  topic?: string;
  trainerName?: string;
  classRoom?: string;
  classDate?: string;
  classTime?: string;
  sessions?: Session[];
  course?: Course | string | null;
  students?: Student[];
};

type Session = { _id?: string; topic?: string; time?: string };

const ALLOWED_STATUS = ["Upcoming", "Active", "Completed"] as const;
// Keep in sync with the `topic` enum in lms-backend/models/Batches.js
const TOPIC_OPTIONS = [
  "SQL",
  "Linux",
  "Grafana",
  "Dynatrace",
  "ITIL",
  "Python",
  "Excel",
  "MySQL",
  "Capstone_Projects",
  "ML",
  "Communication",
  "DS Projects",
  "Recorded Lectures",
  "Mock Interviews",
  "HR Calling",
] as const;
const topicLabel = (t?: string) => (t ? t.replace(/_/g, " ") : "");

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

const getCourse = (course: Batch["course"]): Course | null => {
  if (!course || typeof course === "string") return null;
  return course;
};

export default function BatchDetail({ batchId }: { batchId: string }) {
  const router = useRouter();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingBulk, setRemovingBulk] = useState(false);

  // which modal is open
  const [modal, setModal] = useState<null | "add" | "rename" | "status" | "topic" | "details" | "sessions" | "delete">(null);

  const loadBatch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/get-batch/${encodeURIComponent(batchId)}`,
        { headers: { "Content-Type": "application/json" } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load batch");
      setBatch(json?.data || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load batch");
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const students = batch?.students || [];
  const course = getCourse(batch?.course);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.fullName || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s._id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((s) => next.delete(s._id));
      else filtered.forEach((s) => next.add(s._id));
      return next;
    });

  const removeStudents = async (ids: string[]) => {
    const res = await fetch(
      `${API_LMS_URL}/api/batches/remove-students/${encodeURIComponent(batchId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: ids }),
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || "Failed to remove students");
    setBatch((prev) =>
      prev ? { ...prev, students: (prev.students || []).filter((s) => !ids.includes(s._id)) } : prev
    );
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleRemoveOne = async (id: string, name?: string) => {
    if (!confirm(`Remove ${name || "this student"} from the batch?`)) return;
    try {
      setRemovingId(id);
      await removeStudents([id]);
      toast.success("Student removed from batch");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove student");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Remove ${ids.length} student${ids.length > 1 ? "s" : ""} from the batch?`)) return;
    try {
      setRemovingBulk(true);
      await removeStudents(ids);
      toast.success(`Removed ${ids.length} student${ids.length > 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove students");
    } finally {
      setRemovingBulk(false);
    }
  };

  const st = statusStyles(batch?.status);

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-br from-[var(--panel-bg-950)] via-[var(--panel-bg-900)] to-[var(--panel-bg-950)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/batch-section")}
            className="group flex items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] backdrop-blur-sm transition-all hover:border-[var(--panel-border)] hover:bg-[var(--panel-border)] hover:text-[var(--panel-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>All Batches</span>
          </button>
          <ThemeToggle />
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)]" />
            <div className="h-96 animate-pulse rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)]" />
          </div>
        ) : !batch ? (
          <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-6 py-20 text-center">
            <p className="text-sm text-[var(--panel-text-muted)]">This batch could not be found.</p>
          </div>
        ) : (
          <>
            {/* Batch header */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col gap-5 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight text-[var(--panel-text-primary)] sm:text-3xl">
                        {batch.batch || "Untitled batch"}
                      </h1>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${st.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {batch.status || "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--panel-text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-[var(--panel-text-faint)]" />
                        {course?.title || "No course linked"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-[var(--panel-text-primary)]">{students.length}</span>
                        student{students.length === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-fuchsia-400" />
                        {batch.topic ? topicLabel(batch.topic) : "No topic"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-amber-400" />
                        {batch.trainerName || "No trainer"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-rose-400" />
                        {batch.classRoom || "No venue"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-sky-400" />
                        {batch.classDate || "No date"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-teal-400" />
                        {batch.classTime || "No time"}
                      </span>
                    </div>
                    {batch.sessions && batch.sessions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {batch.sessions.map((s, i) => (
                          <span
                            key={s._id || i}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-700"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {topicLabel(s.topic) || "—"}
                            {s.time ? <span className="text-teal-700/70">· {s.time}</span> : null}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={loadBatch}
                    title="Refresh"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)] hover:text-[var(--panel-text-primary)]"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Action toolbar */}
                <div className="flex flex-wrap gap-2 border-t border-[var(--panel-border)] pt-5">
                  <ToolbarButton
                    onClick={() => setModal("add")}
                    icon={<UserPlus className="h-4 w-4" />}
                    label="Add Students"
                    tone="primary"
                  />
                  <ToolbarButton
                    onClick={() => setModal("rename")}
                    icon={<Pencil className="h-4 w-4" />}
                    label="Rename"
                  />
                  <ToolbarButton
                    onClick={() => setModal("status")}
                    icon={<RefreshCw className="h-4 w-4" />}
                    label="Change Status"
                  />
                  <ToolbarButton
                    onClick={() => setModal("topic")}
                    icon={<Tag className="h-4 w-4" />}
                    label="Change Topic"
                  />
                  <ToolbarButton
                    onClick={() => setModal("details")}
                    icon={<GraduationCap className="h-4 w-4" />}
                    label="Trainer / Venue"
                  />
                  <ToolbarButton
                    onClick={() => setModal("sessions")}
                    icon={<Clock className="h-4 w-4" />}
                    label="Timetable"
                  />
                  <ToolbarButton
                    onClick={() => setModal("delete")}
                    icon={<Trash2 className="h-4 w-4" />}
                    label="Delete Batch"
                    tone="danger"
                  />
                </div>
              </div>
            </div>

            {/* Roster */}
            <div className="mt-6 rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--panel-border)] p-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search students in this batch…"
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-2.5 pl-9 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-cyan-500/50"
                  />
                </div>
                {students.length > 0 && (
                  <button
                    onClick={toggleAll}
                    disabled={filtered.length === 0}
                    className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-3 py-2.5 text-xs font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)] disabled:opacity-40"
                  >
                    {allFilteredSelected ? "Unselect all" : "Select all"}
                  </button>
                )}
                {selected.size > 0 && (
                  <button
                    onClick={handleRemoveSelected}
                    disabled={removingBulk}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {removingBulk ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-rose-300" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove {selected.size}
                  </button>
                )}
              </div>

              <div className="max-h-[28rem] overflow-y-auto">
                {students.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-16 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)]">
                      <Users className="h-7 w-7 text-[var(--panel-text-muted)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--panel-text-primary)]">No students in this batch yet</p>
                    <p className="mt-1 text-xs text-[var(--panel-text-muted)]">
                      Use “Add Students” above to assign students enrolled in this course.
                    </p>
                    <button
                      onClick={() => setModal("add")}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl active:scale-[0.98]"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Students
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-14 text-center text-sm text-[var(--panel-text-faint)]">
                    No students match your search.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--panel-border)]">
                    {filtered.map((s) => {
                      const checked = selected.has(s._id);
                      const busy = removingId === s._id;
                      return (
                        <li
                          key={s._id}
                          className={`flex items-center gap-3 px-4 py-3 transition ${
                            checked ? "bg-rose-500/10" : "hover:bg-[var(--panel-card)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(s._id)}
                            className="h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] bg-[var(--panel-border)] accent-rose-500"
                          />
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                            {(s.fullName || "S").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[var(--panel-text-primary)]">
                              {s.fullName || "Unnamed student"}
                            </div>
                            <div className="truncate text-xs text-[var(--panel-text-muted)]">{s.email || "—"}</div>
                          </div>
                          {s.isPlaced && (
                            <span className="hidden shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-500/30 sm:inline">
                              Placed
                            </span>
                          )}
                          <span
                            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline ${zoneBadge(
                              s.zone
                            )}`}
                          >
                            {s.zone?.toUpperCase() || "—"}
                          </span>
                          <button
                            onClick={() => handleRemoveOne(s._id, s.fullName)}
                            disabled={busy}
                            title="Remove from batch"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            {busy ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-rose-300" />
                            ) : (
                              <UserMinus className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {modal === "add" && batch && (
        <AddStudentsModal
          batchId={batchId}
          course={course}
          existingIds={new Set(students.map((s) => s._id))}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            loadBatch();
          }}
        />
      )}
      {modal === "rename" && batch && (
        <RenameModal
          batchId={batchId}
          currentName={batch.batch || ""}
          onClose={() => setModal(null)}
          onDone={(name) => {
            setBatch((prev) => (prev ? { ...prev, batch: name } : prev));
            setModal(null);
          }}
        />
      )}
      {modal === "status" && batch && (
        <StatusModal
          batchId={batchId}
          currentStatus={batch.status || "Upcoming"}
          onClose={() => setModal(null)}
          onDone={(status) => {
            setBatch((prev) => (prev ? { ...prev, status } : prev));
            setModal(null);
          }}
        />
      )}
      {modal === "topic" && batch && (
        <TopicModal
          batchId={batchId}
          currentTopic={batch.topic || ""}
          onClose={() => setModal(null)}
          onDone={(topic) => {
            setBatch((prev) => (prev ? { ...prev, topic } : prev));
            setModal(null);
          }}
        />
      )}
      {modal === "details" && batch && (
        <DetailsModal
          batchId={batchId}
          current={{
            trainerName: batch.trainerName || "",
            classRoom: batch.classRoom || "",
            classDate: batch.classDate || "",
            classTime: batch.classTime || "",
          }}
          onClose={() => setModal(null)}
          onDone={(patch) => {
            setBatch((prev) => (prev ? { ...prev, ...patch } : prev));
            setModal(null);
          }}
        />
      )}
      {modal === "sessions" && batch && (
        <SessionsModal
          batchId={batchId}
          current={batch.sessions || []}
          onClose={() => setModal(null)}
          onDone={(sessions) => {
            setBatch((prev) => (prev ? { ...prev, sessions } : prev));
            setModal(null);
          }}
        />
      )}
      {modal === "delete" && batch && (
        <DeleteModal
          batchId={batchId}
          name={batch.batch || ""}
          count={students.length}
          onClose={() => setModal(null)}
          onDone={() => router.push("/batch-section")}
        />
      )}
    </section>
  );
}

/* ---------------- Toolbar button ---------------- */

function ToolbarButton({
  onClick,
  icon,
  label,
  tone = "default",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "primary" | "danger";
}) {
  const cls =
    tone === "primary"
      ? "border-teal-500/40 bg-teal-500/15 text-teal-700 hover:bg-teal-500/25"
      : tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20"
      : "border-[var(--panel-border)] bg-[var(--panel-card)] text-[var(--panel-text-secondary)] hover:bg-[var(--panel-border)]";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------------- Modal shell ---------------- */

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  maxW = "max-w-md",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--panel-bg-950)]/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${maxW} overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg-900)] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] p-5">
          <div>
            <h3 className="text-lg font-semibold text-[var(--panel-text-primary)]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-[var(--panel-text-muted)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--panel-text-muted)] transition hover:bg-[var(--panel-border)] hover:text-[var(--panel-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Add students modal ---------------- */

function AddStudentsModal({
  batchId,
  course,
  existingIds,
  onClose,
  onDone,
}: {
  batchId: string;
  course: Course | null;
  existingIds: Set<string>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!course?._id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_LMS_URL}/api/users/find-student-by-course?courseId=${encodeURIComponent(
            course._id
          )}`,
          { headers: { "Content-Type": "application/json" } }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load students");
        if (!cancelled) setStudents(Array.isArray(json?.students) ? json.students : []);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Failed to load students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course?._id]);

  // Only students enrolled in the course who are NOT already in this batch
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = students.filter((s) => !existingIds.has(s._id) && !s.isPlaced);
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.fullName || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
    );
  }, [students, existingIds, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one student");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/add-students/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: Array.from(selected) }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to add students");
      toast.success(`Added ${selected.size} student${selected.size > 1 ? "s" : ""}`);
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add students");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Add students to batch"
      subtitle={course?.title ? `Enrolled in ${course.title}` : "Course students"}
      onClose={onClose}
      maxW="max-w-lg"
    >
      {!course?._id ? (
        <div className="p-6 text-center text-sm text-[var(--panel-text-muted)]">
          This batch has no linked course, so students can’t be listed automatically.
        </div>
      ) : (
        <>
          <div className="border-b border-[var(--panel-border)] p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-2.5 pl-9 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-teal-500/50"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-4 py-12 text-sm text-[var(--panel-text-muted)]">
                <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-teal-500" />
                Loading students…
              </div>
            ) : available.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-[var(--panel-text-faint)]">
                No more students available to add from this course.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--panel-border)]">
                {available.map((s) => {
                  const checked = selected.has(s._id);
                  return (
                    <li
                      key={s._id}
                      onClick={() => toggle(s._id)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                        checked ? "bg-teal-500/10" : "hover:bg-[var(--panel-card)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] bg-[var(--panel-border)] accent-teal-500"
                      />
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-semibold text-white">
                        {(s.fullName || "S").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[var(--panel-text-primary)]">
                          {s.fullName || "Unnamed student"}
                        </div>
                        <div className="truncate text-xs text-[var(--panel-text-muted)]">{s.email || "—"}</div>
                      </div>
                      <span
                        className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline ${zoneBadge(
                          s.zone
                        )}`}
                      >
                        {s.zone?.toUpperCase() || "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--panel-border)] p-4">
            <span className="text-xs text-[var(--panel-text-muted)]">{selected.size} selected</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || selected.size === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add {selected.size > 0 ? selected.size : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ---------------- Rename modal ---------------- */

function RenameModal({
  batchId,
  currentName,
  onClose,
  onDone,
}: {
  batchId: string;
  currentName: string;
  onClose: () => void;
  onDone: (name: string) => void;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Batch name is required");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/update-batch-name/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchName: trimmed }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to rename batch");
      toast.success("Batch renamed");
      onDone(json?.data?.batch || trimmed);
    } catch (e: any) {
      toast.error(e?.message || "Failed to rename batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Rename batch" onClose={onClose}>
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--panel-text-secondary)]">Batch name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm text-[var(--panel-text-primary)] outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- Status modal ---------------- */

function StatusModal({
  batchId,
  currentStatus,
  onClose,
  onDone,
}: {
  batchId: string;
  currentStatus: string;
  onClose: () => void;
  onDone: (status: string) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/update-batch-status/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update status");
      toast.success("Batch status updated");
      onDone(json?.data?.status || status);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change batch status" onClose={onClose}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2">
          {ALLOWED_STATUS.map((s) => {
            const active = status === s;
            const style = statusStyles(s);
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--panel-border)] bg-[var(--panel-border)] text-[var(--panel-text-primary)]"
                    : "border-[var(--panel-border)] bg-[var(--panel-card-soft)] text-[var(--panel-text-secondary)] hover:bg-[var(--panel-card)]"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || status === currentStatus}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- Topic modal ---------------- */

function TopicModal({
  batchId,
  currentTopic,
  onClose,
  onDone,
}: {
  batchId: string;
  currentTopic: string;
  onClose: () => void;
  onDone: (topic: string) => void;
}) {
  const [topic, setTopic] = useState(currentTopic);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!topic) {
      toast.error("Please select a topic");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/update-batch-topic/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update topic");
      toast.success("Batch topic updated");
      onDone(json?.data?.topic || topic);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update topic");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change batch topic" onClose={onClose}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOPIC_OPTIONS.map((t) => {
            const active = topic === t;
            return (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--panel-border)] bg-[var(--panel-border)] text-[var(--panel-text-primary)]"
                    : "border-[var(--panel-border)] bg-[var(--panel-card-soft)] text-[var(--panel-text-secondary)] hover:bg-[var(--panel-card)]"
                }`}
              >
                <Tag className="h-3.5 w-3.5 text-fuchsia-400" />
                {topicLabel(t)}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !topic || topic === currentTopic}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-fuchsia-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- Details modal (trainer / classroom / date / time) ---------------- */

type BatchDetails = {
  trainerName: string;
  classRoom: string;
  classDate: string;
  classTime: string;
};

function DetailsModal({
  batchId,
  current,
  onClose,
  onDone,
}: {
  batchId: string;
  current: BatchDetails;
  onClose: () => void;
  onDone: (patch: BatchDetails) => void;
}) {
  const [trainer, setTrainer] = useState(current.trainerName);
  const [classRoom, setClassRoom] = useState(current.classRoom);
  const [classDate, setClassDate] = useState(current.classDate);
  const [classTime, setClassTime] = useState(current.classTime);
  const [saving, setSaving] = useState(false);

  const unchanged =
    trainer.trim() === current.trainerName.trim() &&
    classRoom.trim() === current.classRoom.trim() &&
    classDate.trim() === current.classDate.trim() &&
    classTime.trim() === current.classTime.trim();

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        trainerName: trainer.trim(),
        classRoom: classRoom.trim(),
        classDate: classDate.trim(),
        classTime: classTime.trim(),
      };
      const res = await fetch(
        `${API_LMS_URL}/api/batches/update-batch-details/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update details");
      toast.success("Batch details updated");
      onDone({
        trainerName: json?.data?.trainerName ?? payload.trainerName,
        classRoom: json?.data?.classRoom ?? payload.classRoom,
        classDate: json?.data?.classDate ?? payload.classDate,
        classTime: json?.data?.classTime ?? payload.classTime,
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Batch details" onClose={onClose}>
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--panel-text-secondary)]">
            <GraduationCap className="h-4 w-4 text-amber-400" />
            Trainer name
          </label>
          <input
            value={trainer}
            onChange={(e) => setTrainer(e.target.value)}
            autoFocus
            placeholder="Enter trainer name"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm text-[var(--panel-text-primary)] outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--panel-text-secondary)]">
            <MapPin className="h-4 w-4 text-rose-400" />
            Venue
          </label>
          <input
            value={classRoom}
            onChange={(e) => setClassRoom(e.target.value)}
            placeholder="e.g. Ground Floor [Learning Lab-1]"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm text-[var(--panel-text-primary)] outline-none focus:border-rose-500/50"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--panel-text-secondary)]">
              <Calendar className="h-4 w-4 text-sky-400" />
              Batch date
            </label>
            <input
              type="date"
              value={classDate}
              onChange={(e) => setClassDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm text-[var(--panel-text-primary)] outline-none focus:border-sky-500/50 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--panel-text-secondary)]">
              <Clock className="h-4 w-4 text-teal-400" />
              Class time
            </label>
            <input
              value={classTime}
              onChange={(e) => setClassTime(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !unchanged && save()}
              placeholder="e.g. 10:00 AM - 12:00 PM"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm text-[var(--panel-text-primary)] outline-none focus:border-teal-500/50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || unchanged}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- Sessions modal (daily timetable) ---------------- */

function SessionsModal({
  batchId,
  current,
  onClose,
  onDone,
}: {
  batchId: string;
  current: Session[];
  onClose: () => void;
  onDone: (sessions: Session[]) => void;
}) {
  const [rows, setRows] = useState<Session[]>(
    current.length ? current.map((s) => ({ topic: s.topic || "", time: s.time || "" })) : [{ topic: "", time: "" }]
  );
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((prev) => [...prev, { topic: "", time: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: "topic" | "time", value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const save = async () => {
    try {
      setSaving(true);
      const sessions = rows
        .map((r) => ({ topic: (r.topic || "").trim(), time: (r.time || "").trim() }))
        .filter((r) => r.topic || r.time);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/update-batch-sessions/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessions }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update timetable");
      toast.success("Timetable updated");
      onDone(Array.isArray(json?.data?.sessions) ? json.data.sessions : sessions);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update timetable");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Daily timetable"
      subtitle="Classes this batch attends in a day"
      onClose={onClose}
      maxW="max-w-lg"
    >
      <div className="space-y-3 p-5">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={r.topic}
              onChange={(e) => updateRow(i, "topic", e.target.value)}
              className="flex-1 appearance-none rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-2.5 text-sm text-[var(--panel-text-primary)] outline-none focus:border-teal-500/50"
            >
              <option value="">Select topic</option>
              {TOPIC_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {topicLabel(t)}
                </option>
              ))}
            </select>
            <input
              value={r.time}
              onChange={(e) => updateRow(i, "time", e.target.value)}
              placeholder="e.g. 10:30 AM - 12:00 PM"
              className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-2.5 text-sm text-[var(--panel-text-primary)] outline-none focus:border-teal-500/50"
            />
            <button
              onClick={() => removeRow(i)}
              title="Remove class"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 transition hover:bg-rose-500/20 sm:self-auto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add class
        </button>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save timetable
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- Delete modal ---------------- */

function DeleteModal({
  batchId,
  name,
  count,
  onClose,
  onDone,
}: {
  batchId: string;
  name: string;
  count: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    try {
      setDeleting(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/delete-batch/${encodeURIComponent(batchId)}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to delete batch");
      toast.success("Batch deleted");
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete batch");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title="Delete batch" onClose={onClose}>
      <div className="space-y-5 p-5">
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
          <div className="text-sm text-rose-700">
            <p className="font-semibold">
              Delete “{name || "this batch"}” permanently?
            </p>
            <p className="mt-1 text-rose-700/80">
              This removes the batch itself. {count > 0
                ? `Its ${count} student${count === 1 ? "" : "s"} keep their accounts but are no longer grouped here.`
                : "It has no students."}{" "}
              This action can’t be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)]"
          >
            Cancel
          </button>
          <button
            onClick={remove}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/30 disabled:opacity-50"
          >
            {deleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200/40 border-t-rose-200" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
