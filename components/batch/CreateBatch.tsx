"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
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
};

const STATUS_OPTIONS = ["Upcoming", "Active", "Completed"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30";
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
    <section className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back */}
        <button
          onClick={() => router.push("/batch-section")}
          className="group mb-8 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Batch Section</span>
        </button>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Create New Batch
            </h1>
            <p className="text-base text-slate-400">
              Pick a course and status. The batch name is generated automatically. You can
              optionally add students for that course now.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Batch Creation Form</p>
                <p className="text-xs text-slate-500">Fields marked * are required</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Course + Status */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                    Course <span className="text-red-400">*</span>
                  </label>
                  <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] transition-all focus-within:border-blue-500/50 hover:border-white/20">
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      disabled={loadingCourses}
                      className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                    >
                      <option value="" className="bg-slate-900">
                        {loadingCourses ? "Loading courses..." : "Select a course"}
                      </option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id} className="bg-slate-900">
                          {c.title || "Untitled course"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Status
                  </label>
                  <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] transition-all focus-within:border-emerald-500/50 hover:border-white/20">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-slate-900">
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
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Users className="h-4 w-4 text-indigo-400" />
                    Add Students{" "}
                    <span className="text-xs font-normal text-slate-500">(optional)</span>
                  </label>
                  {courseId && (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {selected.size} selected
                    </span>
                  )}
                </div>

                {!courseId ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
                    Select a course to see students enrolled in it.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
                    {/* search + select all */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={toggleAllFiltered}
                        disabled={filteredStudents.length === 0}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                      >
                        {allFilteredSelected ? "Unselect all" : "Select all"}
                      </button>
                    </div>

                    {/* list */}
                    <div className="max-h-80 overflow-y-auto">
                      {loadingStudents ? (
                        <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm text-slate-400">
                          <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-500" />
                          Loading students...
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-slate-500">
                          No students found for this course.
                        </div>
                      ) : (
                        <ul className="divide-y divide-white/5">
                          {filteredStudents.map((s) => {
                            const checked = selected.has(s._id);
                            return (
                              <li
                                key={s._id}
                                onClick={() => toggle(s._id)}
                                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                                  checked ? "bg-indigo-500/10" : "hover:bg-white/5"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(s._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/10 accent-indigo-500"
                                />
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                                  {(s.fullName || "S").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-white">
                                    {s.fullName || "Unnamed student"}
                                  </div>
                                  <div className="truncate text-xs text-slate-400">
                                    {s.email || "—"}
                                  </div>
                                </div>
                                {s.batchCode ? (
                                  <span className="hidden shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-500/30 sm:inline">
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
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
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
