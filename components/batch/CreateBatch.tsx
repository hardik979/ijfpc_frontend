"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Users,
  Search,
  Activity,
  Sparkles,
  AlertCircle,
} from "lucide-react";

type Course = { _id: string; title?: string };

type Student = {
  _id: string;
  fullName?: string;
  email?: string;
  zone?: string;
  batchCode?: string | null;
  isPlaced?: boolean;
};

const STATUS_OPTIONS = ["Upcoming", "Active", "Completed"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-700 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  return "bg-gray-500/15 text-gray-700 ring-1 ring-gray-500/30";
};

export default function CreateBatch() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState<Status>("Upcoming");

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [courseName, setCourseName] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Load course list
  useEffect(() => {
    (async () => {
      try {
        setLoadingCourses(true);
        const res = await fetch(`${API_LMS_URL}/api/courses/list`, {
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load courses");
        setCourses(Array.isArray(json) ? json : []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load courses");
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, []);

  // Load students whenever the selected course changes
  useEffect(() => {
    setSelected(new Set());
    setStudents([]);
    setSearch("");
    if (!courseId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingStudents(true);
        const res = await fetch(
          `${API_LMS_URL}/api/users/find-student-by-course?courseId=${encodeURIComponent(
            courseId
          )}`,
          { headers: { "Content-Type": "application/json" } }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load students");
        if (!cancelled) setStudents(Array.isArray(json?.students) ? json.students : []);
      } catch (e: any) {
        if (!cancelled) {
          toast.error(e?.message || "Failed to load students");
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const notPlaced = students.filter((s) => !s.isPlaced);
    if (!q) return notPlaced;
    return notPlaced.filter((s) => (s.fullName || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q));
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

  const handleSubmit = async () => {
    if (!courseId) {
      toast.error("Please select a course");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_LMS_URL}/api/batches/create-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: courseId,
          status,
          students: Array.from(selected),
          batchName: courseName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to create batch");

      toast.success(
        json?.data?.batch ? `✅ Created ${json.data.batch}` : "✅ Batch created successfully"
      );
      setTimeout(() => router.push("/batch-section"), 1200);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-br from-[var(--panel-bg-950)] via-[var(--panel-bg-900)] to-[var(--panel-bg-950)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/batch-section")}
            className="group flex items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] backdrop-blur-sm transition-all hover:border-[var(--panel-border)] hover:bg-[var(--panel-card)] hover:text-[var(--panel-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Batch Section</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--panel-text-primary)] sm:text-4xl">
              Create New Batch
            </h1>
            <p className="text-base text-[var(--panel-text-muted)]">
              Pick a course and status. The batch name is generated automatically. You can
              optionally add students for that course now.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card)] shadow-2xl backdrop-blur-xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center gap-3 border-b border-[var(--panel-border)] pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--panel-text-primary)]">Batch Creation Form</p>
                <p className="text-xs text-[var(--panel-text-faint)]">Fields marked * are required</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Course + Status */}
              <div className="grid gap-6 sm:grid-cols-2">


                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Batch Name
                  </label>
                  <div className="rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all focus-within:border-emerald-500/50 hover:border-[var(--panel-border)]">
                    <input
                      type="text"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Enter course name"
                      className="w-full bg-transparent px-4 py-3.5 text-sm text-[var(--panel-text-primary)] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                    Course <span className="text-red-700">*</span>
                  </label>
                  <div className="rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all focus-within:border-blue-500/50 hover:border-[var(--panel-border)]">
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      disabled={loadingCourses}
                      className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-[var(--panel-text-primary)] outline-none"
                    >
                      <option value="" className="bg-[var(--panel-bg-900)]">
                        {loadingCourses ? "Loading courses..." : "Select a course"}
                      </option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id} className="bg-[var(--panel-bg-900)]">
                          {c.title || "Untitled course"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Status
                  </label>
                  <div className="rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all focus-within:border-emerald-500/50 hover:border-[var(--panel-border)]">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-[var(--panel-text-primary)] outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[var(--panel-bg-900)]">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Students */}
              <div>
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <Users className="h-4 w-4 text-indigo-400" />
                    Add Students{" "}
                    <span className="text-xs font-normal text-[var(--panel-text-faint)]">(optional)</span>
                  </label>
                  {courseId && (
                    <span className="inline-flex items-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-card)] px-3 py-1 text-xs text-[var(--panel-text-secondary)]">
                      {selected.size} selected
                    </span>
                  )}
                </div>

                {!courseId ? (
                  <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-8 text-center text-sm text-[var(--panel-text-faint)]">
                    Select a course to see students enrolled in it.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)]">
                    {/* search + select all */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--panel-border)] p-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-2 pl-9 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={toggleAllFiltered}
                        disabled={filteredStudents.length === 0}
                        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-3 py-2 text-xs font-medium text-[var(--panel-text-secondary)] transition hover:bg-[var(--panel-card)] disabled:opacity-40"
                      >
                        {allFilteredSelected ? "Unselect all" : "Select all"}
                      </button>
                    </div>

                    {/* list */}
                    <div className="max-h-80 overflow-y-auto">
                      {loadingStudents ? (
                        <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm text-[var(--panel-text-muted)]">
                          <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-500" />
                          Loading students...
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-[var(--panel-text-faint)]">
                          No students found for this course.
                        </div>
                      ) : (
                        <ul className="divide-y divide-[var(--panel-border)]">
                          {filteredStudents.map((s) => {
                            const checked = selected.has(s._id);
                            return (
                              <li
                                key={s._id}
                                onClick={() => toggle(s._id)}
                                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${checked ? "bg-indigo-500/10" : "hover:bg-[var(--panel-card)]"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(s._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] bg-[var(--panel-card)] accent-indigo-500"
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
                                {s.batchCode ? (
                                  <span className="hidden shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-500/30 sm:inline">
                                    Already in a batch
                                  </span>
                                ) : null}
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
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !courseId}
                  className="group relative w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="relative flex items-center justify-center gap-2.5">
                    {submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span className="text-base">Creating Batch...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-base">
                          Create Batch
                          {selected.size > 0 ? ` with ${selected.size} student${selected.size > 1 ? "s" : ""}` : ""}
                        </span>
                      </>
                    )}
                  </div>
                </button>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--panel-text-faint)]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  The batch name is auto-generated from the course title.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
