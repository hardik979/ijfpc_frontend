"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Layers,
  Users,
  Search,
  Activity,
  UserMinus,
  Trash2,
} from "lucide-react";

type Batch = {
  _id: string;
  batch?: string;
  status?: string;
};

type Student = {
  _id: string;
  fullName?: string;
  email?: string;
  zone?: string;
  isPlaced?: boolean;
};

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-700 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-700 ring-1 ring-slate-500/30";
};

const statusBadge = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  if (s === "completed") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  return "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30";
};

export default function ManageBatchStudents() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchId, setBatchId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingBulk, setRemovingBulk] = useState(false);

  // Load batches on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingBatches(true);
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
        setLoadingBatches(false);
      }
    })();
  }, []);

  // Load the selected batch's students
  const loadStudents = async (id: string) => {
    if (!id) {
      setStudents([]);
      return;
    }
    try {
      setLoadingStudents(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/get-batch/${encodeURIComponent(id)}`,
        { headers: { "Content-Type": "application/json" } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load students");
      setStudents(Array.isArray(json?.data?.students) ? json.data.students : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load students");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    setSelected(new Set());
    setSearch("");
    loadStudents(batchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.fullName || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selected.has(s._id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredStudents.forEach((s) => next.delete(s._id));
      else filteredStudents.forEach((s) => next.add(s._id));
      return next;
    });

  const removeStudents = async (ids: string[]) => {
    if (!batchId || ids.length === 0) return;
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
    // Reflect removal locally
    setStudents((prev) => prev.filter((s) => !ids.includes(s._id)));
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
    if (!confirm(`Remove ${ids.length} student${ids.length > 1 ? "s" : ""} from the batch?`))
      return;
    try {
      setRemovingBulk(true);
      await removeStudents(ids);
      toast.success(`Removed ${ids.length} student${ids.length > 1 ? "s" : ""} from the batch`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove students");
    } finally {
      setRemovingBulk(false);
    }
  };

  const selectedBatch = batches.find((b) => b._id === batchId);

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-br from-[var(--panel-bg-950)] via-[var(--panel-bg-900)] to-[var(--panel-bg-950)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back + Theme toggle */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/batch-section")}
            className="group flex items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] backdrop-blur-sm transition-all hover:border-[var(--panel-border)] hover:bg-[var(--panel-border)] hover:text-[var(--panel-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Batch Section</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-rose-500/10 to-orange-500/10 backdrop-blur-sm">
              <UserMinus className="h-8 w-8 text-rose-400" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--panel-text-primary)] sm:text-4xl">
              Manage Batch Students
            </h1>
            <p className="text-base text-[var(--panel-text-muted)]">
              Select a batch to view all its students, and remove anyone who no longer belongs.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card)] shadow-2xl backdrop-blur-xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center gap-3 border-b border-[var(--panel-border)] pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10">
                <Activity className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--panel-text-primary)]">Batch Roster</p>
                <p className="text-xs text-[var(--panel-text-faint)]">View and remove students from a batch</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Batch selector */}
              <div>
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                  <Layers className="h-4 w-4 text-rose-400" />
                  Batch <span className="text-red-700">*</span>
                </label>
                <div className="rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all focus-within:border-rose-500/50 hover:border-[var(--panel-border)]">
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    disabled={loadingBatches}
                    className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-[var(--panel-text-primary)] outline-none"
                  >
                    <option value="" className="bg-[var(--panel-bg-900)]">
                      {loadingBatches ? "Loading batches..." : "Select a batch"}
                    </option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id} className="bg-[var(--panel-bg-900)]">
                        {b.batch || b._id}
                        {b.status ? ` — ${b.status}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected batch summary */}
              {selectedBatch && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm">
                  <span className="text-[var(--panel-text-muted)]">Viewing:</span>
                  <span className="font-semibold text-[var(--panel-text-primary)]">
                    {selectedBatch.batch || selectedBatch._id}
                  </span>
                  {selectedBatch.status ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(
                        selectedBatch.status
                      )}`}
                    >
                      {selectedBatch.status}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-[var(--panel-text-muted)]">
                    {students.length} student{students.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}

              {/* Students */}
              <div>
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <Users className="h-4 w-4 text-indigo-400" />
                    Students
                  </label>
                  {batchId && selected.size > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveSelected}
                      disabled={removingBulk}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {removingBulk ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-rose-300" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Remove {selected.size} selected
                    </button>
                  )}
                </div>

                {!batchId ? (
                  <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-8 text-center text-sm text-[var(--panel-text-faint)]">
                    Select a batch to see the students in it.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)]">
                    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--panel-border)] p-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] py-2 pl-9 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={toggleAllFiltered}
                        disabled={filteredStudents.length === 0}
                        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-3 py-2 text-xs font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-border)] disabled:opacity-40"
                      >
                        {allFilteredSelected ? "Unselect all" : "Select all"}
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {loadingStudents ? (
                        <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm text-[var(--panel-text-muted)]">
                          <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-500" />
                          Loading students...
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-[var(--panel-text-faint)]">
                          {students.length === 0
                            ? "No students in this batch yet."
                            : "No students match your search."}
                        </div>
                      ) : (
                        <ul className="divide-y divide-[var(--panel-border)]">
                          {filteredStudents.map((s) => {
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
                                  <div className="truncate text-xs text-[var(--panel-text-muted)]">
                                    {s.email || "—"}
                                  </div>
                                </div>
                                <span
                                  className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline ${zoneBadge(
                                    s.zone
                                  )}`}
                                >
                                  {s.zone?.toUpperCase() || "—"}
                                </span>
                                <button
                                  type="button"
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
