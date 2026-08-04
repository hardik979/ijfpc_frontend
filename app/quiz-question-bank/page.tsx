"use client";

/**
 * Quiz Question Bank — create a bank and upload day questions into it.
 *
 * Standalone admin page; deliberately not linked from any nav yet.
 *
 * Talks to lms-backend:
 *   GET  /api/courses/list                        course dropdown
 *   GET  /api/quiz-question-bank/categories       subject dropdown for that course
 *   GET  /api/quiz-question-bank/list             bank dropdown (+ days already used)
 *   POST /api/quiz-question-bank/quiz-parent      create a bank
 *   POST /api/quiz-question-bank/upload           upload CSV / Excel / PDF into a bank
 *
 * The bank title has to contain its subject word for the daily-quiz composer to
 * find it, so the title is not typed — it comes from the course's configured
 * subject list. One bank per subject per course: two banks matching the same
 * subject word would make the composer's lookup ambiguous.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileUp,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

type Course = { _id: string; title?: string };

type Bank = {
  _id: string;
  title: string;
  courseId: string;
  totalDaysCount: number;
  uploadedDays: number;
  dayNos: number[];
  totalQuestions: number;
  subjectiveQuestions: number;
};

type Category = {
  subject: string;
  hasBank: boolean;
  bankId: string | null;
  bankTitle: string | null;
  uploadedDays: number;
};

const ACCEPT = ".csv,.xlsx,.xls,.pdf";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // matches multer's limit on the backend

// Shown under the file picker so the expected columns aren't a guessing game.
const CSV_HEADERS =
  "dayNo,subject,topic,question,optionA,optionB,optionC,optionD,correctOption,modelAnswer,keywords,aiRubric,marks";

const card =
  "rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] backdrop-blur-sm";
const label =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--panel-text-muted)]";
const field =
  "w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-2.5 text-sm text-[var(--panel-text-primary)] outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50";

const fmtBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** "1-6, 9, 12-14" — compact enough to sit inline next to a bank name. */
function formatRanges(nums: number[]): string {
  if (!nums.length) return "none";
  const sorted = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  return out.join(", ");
}

export default function QuizQuestionBankPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Course drives both panels — banks are scoped to a course on the backend.
  const [courseId, setCourseId] = useState("");

  // Panel 1 — create bank. The title is the subject, not free text.
  const [subject, setSubject] = useState("");
  const [totalDaysCount, setTotalDaysCount] = useState<string>("30");
  const [creating, setCreating] = useState(false);

  // Panel 2 — upload
  const [bankId, setBankId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const courseLabel = (c: Course) => c.title || c._id;

  /* ---------------------------------------------------------------- load */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(`${API_LMS_URL}/api/courses/list`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Courses request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) setCourses(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) toast.error("Could not load courses. Is the LMS API running?");
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBanks = useCallback(async (forCourse: string) => {
    if (!forCourse) {
      setBanks([]);
      return;
    }
    setLoadingBanks(true);
    try {
      const res = await fetch(
        `${API_LMS_URL}/api/quiz-question-bank/list?courseId=${encodeURIComponent(forCourse)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Banks request failed (${res.status})`);
      const json = await res.json();
      setBanks(Array.isArray(json?.data) ? json.data : []);
    } catch {
      toast.error("Could not load question banks.");
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  const loadCategories = useCallback(async (forCourse: string) => {
    if (!forCourse) {
      setCategories([]);
      return;
    }
    setLoadingCategories(true);
    try {
      const res = await fetch(
        `${API_LMS_URL}/api/quiz-question-bank/categories?courseId=${encodeURIComponent(forCourse)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Categories request failed (${res.status})`);
      const json = await res.json();
      setCategories(Array.isArray(json?.data) ? json.data : []);
    } catch {
      toast.error("Could not load subjects for this course.");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    setBankId("");
    setSubject("");
    loadBanks(courseId);
    loadCategories(courseId);
  }, [courseId, loadBanks, loadCategories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.subject === subject) || null,
    [categories, subject],
  );

  // Subjects that still need a bank; the rest are offered as "already exists".
  const freeSubjects = useMemo(() => categories.filter((c) => !c.hasBank), [categories]);

  const selectedBank = useMemo(
    () => banks.find((b) => b._id === bankId) || null,
    [banks, bankId],
  );

  /* -------------------------------------------------------------- create */

  const createBank = async () => {
    // Title IS the subject — that word is what the composer matches on.
    const cleanTitle = subject.trim();
    const days = Number(totalDaysCount);

    if (!courseId) return toast.error("Choose a course first.");
    if (!cleanTitle) return toast.error("Choose a subject.");
    if (selectedCategory?.hasBank) {
      return toast.error(
        `"${selectedCategory.bankTitle}" already covers ${cleanTitle}. Upload into it instead.`,
      );
    }
    if (!Number.isInteger(days) || days < 1) {
      return toast.error("Total days must be a whole number of 1 or more.");
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_LMS_URL}/api/quiz-question-bank/quiz-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, courseId, totalDaysCount: days }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || `Create failed (${res.status})`);
      }

      toast.success(`Bank "${cleanTitle}" created.`);
      setSubject("");
      await Promise.all([loadBanks(courseId), loadCategories(courseId)]);
      if (json?.data?._id) setBankId(json.data._id); // pre-select for upload
    } catch (e: any) {
      toast.error(e?.message || "Could not create the bank.");
    } finally {
      setCreating(false);
    }
  };

  /* -------------------------------------------------------------- upload */

  const addFiles = (incoming: FileList | File[]) => {
    const next: File[] = [];
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is ${fmtBytes(f.size)} — the limit is 20 MB.`);
        continue;
      }
      next.push(f);
    }
    // The PDF importer only reads rigid DAY:/QUESTION: blocks split by "---".
    // A normal human-written PDF parses to nothing and fails with the unhelpful
    // "No valid day numbers found in file", so say so before the upload.
    if (next.some((f) => f.name.toLowerCase().endsWith(".pdf"))) {
      toast.warn(
        "PDFs only import if they use the DAY: / QUESTION: block format. A normal question paper will fail — convert it to CSV first.",
        { autoClose: 8000 },
      );
    }
    // De-duplicate by name+size so dropping the same file twice is harmless.
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...next.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  };

  const uploadFiles = async () => {
    if (!bankId) return toast.error("Choose a question bank to upload into.");
    if (!files.length) return toast.error("Add at least one file.");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("questionBankId", bankId);
      for (const f of files) fd.append("files", f);

      const res = await fetch(`${API_LMS_URL}/api/quiz-question-bank/upload`, {
        method: "POST",
        body: fd, // no Content-Type — the browser sets the multipart boundary
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || `Upload failed (${res.status})`);
      }

      const added: number[] = json?.bank?.addedDays || [];
      toast.success(
        added.length
          ? `Uploaded ${added.length} day(s): ${formatRanges(added)}`
          : "Upload complete.",
      );
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      await loadBanks(courseId);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------------------------------------------------------- view */

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-br from-[var(--panel-bg-950)] via-[var(--panel-bg-900)] to-[var(--panel-bg-950)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
              <div className="relative rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card)] p-3">
                <Database className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Quiz Question Bank</h1>
              <p className="mt-1 max-w-xl text-sm text-[var(--panel-text-secondary)]">
                Create a bank for a subject, then upload its day-wise questions. The daily
                quiz draws from these.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Course — shared by both panels */}
        <div className={`${card} mb-6 p-5`}>
          <label className={label} htmlFor="course">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Course
            </span>
          </label>
          <select
            id="course"
            className={field}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={loadingCourses}
          >
            <option value="">
              {loadingCourses ? "Loading courses…" : "Select a course"}
            </option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {courseLabel(c)}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-[var(--panel-text-faint)]">
            Banks belong to one course. A batch can only be served by banks on its own course.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ---------------------------------------------- create a bank */}
          <div className={`${card} flex flex-col gap-5 p-5`}>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" />
              <h2 className="text-base font-semibold">Create a bank</h2>
            </div>

            <div>
              <label className={label} htmlFor="subject">
                Subject <span className="normal-case text-[var(--panel-text-faint)]">(becomes the bank title)</span>
              </label>
              <select
                id="subject"
                className={field}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!courseId || loadingCategories || creating}
              >
                <option value="">
                  {!courseId
                    ? "Select a course first"
                    : loadingCategories
                      ? "Loading subjects…"
                      : categories.length === 0
                        ? "No subjects configured for this course"
                        : freeSubjects.length === 0
                          ? "Every subject already has a bank"
                          : "Select a subject"}
                </option>
                {categories.map((c) => (
                  <option key={c.subject} value={c.subject} disabled={c.hasBank}>
                    {c.subject}
                    {c.hasBank ? `  —  bank exists (${c.uploadedDays} days)` : ""}
                  </option>
                ))}
              </select>

              {selectedCategory?.hasBank ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400/90">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>{selectedCategory.bankTitle}</strong> already covers this subject.
                    Upload new days into it rather than creating a second bank — two banks
                    matching the same subject make the daily quiz pick one at random.
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-[var(--panel-text-faint)]">
                  Only subjects configured for this course are listed. The bank is titled
                  exactly this, because that word is how the daily quiz finds it from a
                  batch&apos;s topic.
                </p>
              )}
            </div>

            <div>
              <label className={label} htmlFor="days">
                Total days
              </label>
              <input
                id="days"
                type="number"
                min={1}
                className={field}
                value={totalDaysCount}
                onChange={(e) => setTotalDaysCount(e.target.value)}
                disabled={!courseId || !subject || creating}
              />
            </div>

            <button
              type="button"
              onClick={createBank}
              disabled={!courseId || !subject || selectedCategory?.hasBank || creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel-bg-950)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Create bank
                </>
              )}
            </button>
          </div>

          {/* -------------------------------------------- upload questions */}
          <div className={`${card} flex flex-col gap-5 p-5`}>
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-cyan-400" />
              <h2 className="text-base font-semibold">Upload questions</h2>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={`${label} mb-0`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Parent question bank
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => loadBanks(courseId)}
                  disabled={!courseId || loadingBanks}
                  className="inline-flex items-center gap-1 text-xs text-[var(--panel-text-muted)] transition-colors hover:text-cyan-400 disabled:opacity-40"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingBanks ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <select
                className={field}
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                disabled={!courseId || loadingBanks}
              >
                <option value="">
                  {!courseId
                    ? "Select a course first"
                    : loadingBanks
                      ? "Loading banks…"
                      : banks.length
                        ? "Select a bank"
                        : "No banks on this course yet"}
                </option>
                {banks.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.title} — {b.uploadedDays}/{b.totalDaysCount} days
                  </option>
                ))}
              </select>

              {selectedBank && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-2 text-xs text-[var(--panel-text-secondary)]">
                  <span>
                    Days uploaded:{" "}
                    <strong className="text-[var(--panel-text-primary)]">
                      {formatRanges(selectedBank.dayNos)}
                    </strong>
                  </span>
                  <span>
                    Questions:{" "}
                    <strong className="text-[var(--panel-text-primary)]">
                      {selectedBank.totalQuestions}
                    </strong>{" "}
                    ({selectedBank.subjectiveQuestions} subjective)
                  </span>
                </div>
              )}
              {selectedBank && selectedBank.dayNos.length > 0 && (
                <p className="mt-2 text-xs text-[var(--panel-text-faint)]">
                  A file containing a day that already exists here will be rejected — upload
                  only new day numbers.
                </p>
              )}
            </div>

            {/* drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                dragging
                  ? "border-cyan-500/70 bg-cyan-500/5"
                  : "border-[var(--panel-border)] bg-[var(--panel-card-soft)]"
              }`}
            >
              <FileUp className="mx-auto mb-2 h-6 w-6 text-[var(--panel-text-muted)]" />
              <p className="text-sm text-[var(--panel-text-secondary)]">
                Drop <strong>CSV</strong> or Excel here
              </p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={!bankId}
                className="mt-2 text-sm font-medium text-cyan-400 underline-offset-4 hover:underline disabled:opacity-40"
              >
                or browse files
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--panel-text-faint)]">
                CSV columns:
                <br />
                <code className="break-all">{CSV_HEADERS}</code>
                <br />
                Leave <strong>correctOption</strong> empty for a subjective question — only
                those are used in the daily quiz.
                <br />
                <span className="text-amber-400/80">
                  PDF is accepted only in the DAY:/QUESTION: block format — convert a normal
                  question paper to CSV first.
                </span>
              </p>
            </div>

            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}-${i}`}
                    className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-2 text-sm"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-[var(--panel-text-faint)]">
                      {fmtBytes(f.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded-lg p-1 text-[var(--panel-text-muted)] transition-colors hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={uploadFiles}
                disabled={!bankId || !files.length || uploading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel-bg-950)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" /> Upload{" "}
                    {files.length > 0 && `(${files.length})`}
                  </>
                )}
              </button>
              {files.length > 0 && !uploading && (
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] px-3 py-2.5 text-sm text-[var(--panel-text-secondary)] transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --------------------------------------------- existing banks */}
        <div className={`${card} mt-6 p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <h2 className="text-base font-semibold">
              Banks on this course{" "}
              {banks.length > 0 && (
                <span className="text-[var(--panel-text-faint)]">({banks.length})</span>
              )}
            </h2>
          </div>

          {!courseId ? (
            <p className="text-sm text-[var(--panel-text-faint)]">
              Select a course to see its banks.
            </p>
          ) : loadingBanks ? (
            <p className="flex items-center gap-2 text-sm text-[var(--panel-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : banks.length === 0 ? (
            <p className="text-sm text-[var(--panel-text-faint)]">
              No banks yet on this course. Create one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-sm">
                <thead>
                  <tr className="border-b border-[var(--panel-border)] text-left text-xs uppercase tracking-wider text-[var(--panel-text-muted)]">
                    <th className="pb-2 pr-4 font-semibold">Bank</th>
                    <th className="pb-2 pr-4 font-semibold">Days</th>
                    <th className="pb-2 pr-4 font-semibold">Day numbers</th>
                    <th className="pb-2 pr-4 font-semibold">Subjective</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((b) => {
                    const complete = b.uploadedDays >= b.totalDaysCount;
                    return (
                      <tr
                        key={b._id}
                        className="border-b border-[var(--panel-border)]/60 last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-medium">{b.title}</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            {complete && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            )}
                            {b.uploadedDays}/{b.totalDaysCount}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-[var(--panel-text-secondary)]">
                          {formatRanges(b.dayNos)}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-[var(--panel-text-secondary)]">
                          {b.subjectiveQuestions}
                          <span className="text-[var(--panel-text-faint)]">
                            {" "}
                            / {b.totalQuestions}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-[var(--panel-text-faint)]">
                Only subjective questions reach the daily quiz. At 15 per day, a batch running
                one topic alone gets <strong>subjective ÷ 15</strong> days before questions
                start repeating.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
