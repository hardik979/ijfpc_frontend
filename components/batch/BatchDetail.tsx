"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
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
  course?: Course | string | null;
  students?: Student[];
};

const ALLOWED_STATUS = ["Upcoming", "Active", "Completed"] as const;

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30";
};

const statusStyles = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "active")
    return { dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" };
  if (s === "completed")
    return { dot: "bg-sky-400", badge: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30" };
  return { dot: "bg-amber-400", badge: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30" };
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
  const [modal, setModal] = useState<null | "add" | "rename" | "status" | "delete">(null);

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
    <section className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back */}
        <button
          onClick={() => router.push("/batch-section")}
          className="group mb-6 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>All Batches</span>
        </button>

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
            <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          </div>
        ) : !batch ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <p className="text-sm text-slate-400">This batch could not be found.</p>
          </div>
        ) : (
          <>
            {/* Batch header */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col gap-5 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {batch.batch || "Untitled batch"}
                      </h1>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${st.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {batch.status || "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-slate-500" />
                        {course?.title || "No course linked"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-white">{students.length}</span>
                        student{students.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={loadBatch}
                    title="Refresh"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Action toolbar */}
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
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
                    onClick={() => setModal("delete")}
                    icon={<Trash2 className="h-4 w-4" />}
                    label="Delete Batch"
                    tone="danger"
                  />
                </div>
              </div>
            </div>

            {/* Roster */}
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search students in this batch…"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500/50"
                  />
                </div>
                {students.length > 0 && (
                  <button
                    onClick={toggleAll}
                    disabled={filtered.length === 0}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    {allFilteredSelected ? "Unselect all" : "Select all"}
                  </button>
                )}
                {selected.size > 0 && (
                  <button
                    onClick={handleRemoveSelected}
                    disabled={removingBulk}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
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
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Users className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-white">No students in this batch yet</p>
                    <p className="mt-1 text-xs text-slate-400">
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
                  <div className="px-4 py-14 text-center text-sm text-slate-500">
                    No students match your search.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {filtered.map((s) => {
                      const checked = selected.has(s._id);
                      const busy = removingId === s._id;
                      return (
                        <li
                          key={s._id}
                          className={`flex items-center gap-3 px-4 py-3 transition ${
                            checked ? "bg-rose-500/10" : "hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(s._id)}
                            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/10 accent-rose-500"
                          />
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                            {(s.fullName || "S").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">
                              {s.fullName || "Unnamed student"}
                            </div>
                            <div className="truncate text-xs text-slate-400">{s.email || "—"}</div>
                          </div>
                          {s.isPlaced && (
                            <span className="hidden shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30 sm:inline">
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
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
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
      ? "border-teal-500/40 bg-teal-500/15 text-teal-100 hover:bg-teal-500/25"
      : tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10";
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
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${maxW} overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
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
        <div className="p-6 text-center text-sm text-slate-400">
          This batch has no linked course, so students can’t be listed automatically.
        </div>
      ) : (
        <>
          <div className="border-b border-white/10 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-teal-500/50"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-4 py-12 text-sm text-slate-400">
                <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-teal-500" />
                Loading students…
              </div>
            ) : available.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">
                No more students available to add from this course.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {available.map((s) => {
                  const checked = selected.has(s._id);
                  return (
                    <li
                      key={s._id}
                      onClick={() => toggle(s._id)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                        checked ? "bg-teal-500/10" : "hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/10 accent-teal-500"
                      />
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-semibold text-white">
                        {(s.fullName || "S").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {s.fullName || "Unnamed student"}
                        </div>
                        <div className="truncate text-xs text-slate-400">{s.email || "—"}</div>
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
          <div className="flex items-center justify-between gap-3 border-t border-white/10 p-4">
            <span className="text-xs text-slate-400">{selected.size} selected</span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
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
          <label className="mb-2 block text-sm font-medium text-slate-300">Batch name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
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
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5"
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
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
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
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
          <div className="text-sm text-rose-100">
            <p className="font-semibold">
              Delete “{name || "this batch"}” permanently?
            </p>
            <p className="mt-1 text-rose-200/80">
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
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={remove}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-50"
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
