"use client";

/**
 * Interview question bank — upload.
 *
 *   1. course   the LMS course the questions belong to
 *   2. file     PDF / Excel / CSV; the LMS reads it straight away and splits
 *               it into sections — one per company + round the file names
 *               (a PDF heading like "Policy Bazar round 2", or Company /
 *               Round columns in a sheet). A file that names none gives one
 *               "unassigned" section.
 *   3. review   every section shows its company (auto-matched to the
 *               course's existing companies, editable), round, and each
 *               question marked new / repeated in file / already in round;
 *               only the checked "new" rows are stored.
 *   4. save     all sections in one go; per-section results come back.
 *
 * Nothing is written until step 4. Duplicates are caught three times: here in
 * the preview, again by the LMS on save, and finally by the database's unique
 * index on (company, round, normalised question).
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  Save,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import {
  ApiError,
  CompanySummary,
  CourseSummary,
  ExistingKeys,
  ParsedQuestion,
  ParsedStatus,
  ParseResult,
  SaveResult,
  SaveSectionInput,
  companyKey,
  interviewQuestionsApi as api,
  roundLabel,
} from "@/lib/interviewQuestions";
import { PageShell, Pill, btnGhost, btnPrimary, card, field, label, plural } from "./ui";

const ACCEPT = ".pdf,.xlsx,.xls,.csv";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // matches multer on the LMS
const MAX_ROUND_NO = 50;

const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

const fmtBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

type Edits = { question: string; answer: string; topic: string };

/** What the person has decided for one parsed section. */
type SectionState = {
  id: number;
  companyName: string;
  roundNo: string;
  roundTitle: string;
  roundInferred: boolean;
  selected: Set<number>;
  edits: Map<number, Edits>;
  collapsed: boolean;
  removed: boolean;
};

/** Step header: number bubble + title, greyed out until reachable. */
function Step({ n, title, done, active, children, hint }: { n: number; title: string; done?: boolean; active: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${card} p-5 transition-opacity ${active ? "" : "opacity-50"}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : active ? "bg-cyan-600 text-white" : "bg-[var(--panel-card-soft)] text-[var(--panel-text-faint)]"}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {hint ? <span className="text-xs text-[var(--panel-text-faint)]">{hint}</span> : null}
      </div>
      <fieldset disabled={!active} className="min-w-0">
        {children}
      </fieldset>
    </div>
  );
}

export default function UploadWizard() {
  const params = useSearchParams();

  /* ── step 1: course ── */
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [courseId, setCourseId] = useState(params.get("course") || "");
  const courseTitle = courses?.find((c) => c._id === courseId)?.title || "";

  useEffect(() => {
    (async () => {
      try {
        setCourses((await api.courses()).courses);
      } catch (e) {
        toast.error(errMsg(e, "Could not load courses"));
        setCourses([]);
      }
    })();
  }, []);

  // The course's companies: for the datalist, and to match typed names.
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const loadCompanies = useCallback(async (id: string) => {
    if (!id) return setCompanies([]);
    try {
      setCompanies((await api.companies(id)).companies);
    } catch (e) {
      toast.error(errMsg(e, "Could not load companies"));
      setCompanies([]);
    }
  }, []);
  useEffect(() => {
    void loadCompanies(courseId);
  }, [courseId, loadCompanies]);
  const companyByKey = useMemo(() => new Map(companies.map((c) => [c.nameKey, c])), [companies]);

  /* ── step 2: file → parse ── */
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [existingKeys, setExistingKeys] = useState<ExistingKeys>({});
  const fetchedKeys = useRef<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  /* ── step 4: save ── */
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setSections([]);
    setExistingKeys({});
    fetchedKeys.current = new Set();
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) return toast.error(`${f.name} is ${fmtBytes(f.size)} — the limit is 20 MB.`);
    if (!/\.(pdf|xlsx|xls|csv)$/i.test(f.name)) return toast.error("Only PDF, Excel (.xlsx/.xls) and CSV files are accepted.");
    reset();
    setFile(f);
  };

  // Parse as soon as a file is chosen (and again if the course changes, since
  // company matching is per course). Once saved, the file is spent.
  const parseKey = file && !result ? `${file.name}:${file.size}:${file.lastModified}|${courseId}` : "";
  useEffect(() => {
    if (!file || !courseId || result) return;
    let cancelled = false;
    (async () => {
      setParsing(true);
      try {
        const res = await api.parse(file, courseId);
        if (cancelled) return;
        setParsed(res);
        setExistingKeys(res.existingKeys || {});
        fetchedKeys.current = new Set(Object.keys(res.existingKeys || {}));
        // Defaults for sections the file did not name: what the URL asked for.
        const urlCompany = companies.find((c) => c._id === params.get("company"));
        const urlRound = params.get("round") || "";
        const many = res.sections.length > 3;
        setSections(
          res.sections.map((s) => ({
            id: s.id,
            companyName: s.company?.matchedName || s.company?.name || urlCompany?.name || "",
            roundNo: s.roundNo != null ? String(s.roundNo) : s.company ? "1" : urlRound || "1",
            roundTitle: s.roundTitle || "",
            roundInferred: s.roundInferred,
            selected: new Set(s.questions.map((q) => q.id)), // trimmed to "new" below
            edits: new Map(),
            collapsed: many,
            removed: false,
          })),
        );
        if (!res.totalQuestions) toast.warn("No questions were found in that file.");
        else toast.success(`Read ${plural(res.totalQuestions, "question")} in ${plural(res.sections.length, "section")}.`);
      } catch (e) {
        if (cancelled) return;
        setParsed(null);
        toast.error(errMsg(e, "Could not read that file"));
      } finally {
        if (!cancelled) setParsing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseKey]);

  /* ── resolve each section's company + statuses ── */

  const resolved = useMemo(() => {
    // Duplicate detection runs across sections in order, per target
    // (company + round), so two sections aimed at the same round dedupe
    // against each other too.
    const seen = new Map<string, Set<string>>();
    return sections.map((st) => {
      const key = companyKey(st.companyName);
      const company = key ? companyByKey.get(key) || null : null;
      const roundNo = Number.parseInt(st.roundNo, 10);
      const roundValid = Number.isInteger(roundNo) && roundNo >= 1 && roundNo <= MAX_ROUND_NO;
      const target = `${company?._id || `new:${key}`}|${roundValid ? roundNo : "?"}`;
      const existing = new Set(company && roundValid ? existingKeys[company._id]?.[roundNo] || [] : []);
      const otherRounds = company ? Object.keys(existingKeys[company._id] || {}).map(Number) : [];
      if (!seen.has(target)) seen.set(target, new Set());
      const bucket = seen.get(target)!;

      const parsedSection = parsed?.sections.find((s) => s.id === st.id);
      const statuses = new Map<number, ParsedStatus>();
      const alsoIn = new Map<number, number[]>();
      const counts = { new: 0, duplicateInFile: 0, existsInRound: 0 };
      for (const q of parsedSection?.questions || []) {
        let status: ParsedStatus = "new";
        if (!st.removed) {
          if (existing.has(q.key)) status = "exists_in_round";
          else if (bucket.has(q.key)) status = "duplicate_in_file";
          else bucket.add(q.key);
        }
        statuses.set(q.id, status);
        if (company) {
          const rounds = otherRounds.filter((r) => r !== roundNo && existingKeys[company._id]?.[r]?.includes(q.key));
          if (rounds.length) alsoIn.set(q.id, rounds);
        }
        if (status === "new") counts.new++;
        else if (status === "duplicate_in_file") counts.duplicateInFile++;
        else counts.existsInRound++;
      }
      return { company, roundNo, roundValid, statuses, alsoIn, counts, parsedSection };
    });
  }, [sections, parsed, companyByKey, existingKeys]);

  // Once statuses are known for a freshly parsed file, keep only "new" rows selected.
  const trimmedFor = useRef<string>("");
  useEffect(() => {
    if (!parsed || !sections.length || trimmedFor.current === parseKey) return;
    trimmedFor.current = parseKey;
    setSections((prev) =>
      prev.map((st, i) => ({
        ...st,
        selected: new Set([...st.selected].filter((id) => resolved[i]?.statuses.get(id) === "new")),
      })),
    );
  }, [parsed, parseKey, resolved, sections.length]);

  // A section pointed at an existing company we have no keys for yet → fetch them.
  useEffect(() => {
    for (const r of resolved) {
      const id = r.company?._id;
      if (!id || fetchedKeys.current.has(id)) continue;
      fetchedKeys.current.add(id);
      api
        .companyKeys(id)
        .then((res) => setExistingKeys((prev) => ({ ...prev, [id]: res.rounds })))
        .catch(() => fetchedKeys.current.delete(id));
    }
  }, [resolved]);

  const update = (id: number, patch: Partial<SectionState> | ((s: SectionState) => Partial<SectionState>)) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s)));

  const rowValue = (st: SectionState, q: ParsedQuestion): Edits => st.edits.get(q.id) || { question: q.question, answer: q.answer, topic: q.topic };

  /* ── save ── */

  const live = sections.filter((s) => !s.removed);
  const totalSelected = live.reduce((n, s) => n + s.selected.size, 0);
  const problems = live
    .map((st) => {
      const i = sections.indexOf(st);
      const r = resolved[i];
      if (!st.selected.size) return null;
      if (st.companyName.trim().length < 2) return `Section ${i + 1} needs a company name`;
      if (!r?.roundValid) return `Section ${i + 1}: round must be 1–${MAX_ROUND_NO}`;
      return null;
    })
    .filter(Boolean) as string[];

  const save = async () => {
    if (!parsed || !courseId || problems.length || !totalSelected) return;
    const payload: SaveSectionInput[] = [];
    const payloadIds: number[] = [];
    for (const st of live) {
      if (!st.selected.size) continue;
      const r = resolved[sections.indexOf(st)];
      const questions = (r.parsedSection?.questions || [])
        .filter((q) => st.selected.has(q.id))
        .map((q) => rowValue(st, q))
        .filter((v) => v.question.trim().length >= 3);
      if (!questions.length) continue;
      payload.push({
        company: r.company ? { mode: "existing", id: r.company._id } : { mode: "new", name: st.companyName.trim() },
        round: { roundNo: r.roundNo, title: st.roundTitle.trim() },
        questions,
      });
      payloadIds.push(st.id);
    }
    if (!payload.length) return toast.error("Select at least one question to save.");

    setSaving(true);
    try {
      const res = await api.save({ courseId, source: { fileName: parsed.fileName }, sections: payload });
      // Map results back to section ids so the summary can name failures.
      res.sections = res.sections.map((s) => ({ ...s, index: payloadIds[s.index] ?? s.index }));
      setResult(res);
      toast.success(
        res.totals.inserted
          ? `Saved ${plural(res.totals.inserted, "question")} across ${plural(res.totals.saved, "section")}`
          : "Nothing new to save — everything was already in the bank.",
      );
      void loadCompanies(courseId);
    } catch (e) {
      toast.error(errMsg(e, "Could not save the questions"));
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "Company,Round,Question,Answer,Topic\r\n" +
      '"TCS","1","Tell me about yourself.","Keep it to 60–90 seconds: background, current role, why this company.","HR"\r\n' +
      '"TCS","2","What is the difference between an abstract class and an interface?","","Java"\r\n' +
      '"Infosys","1","Explain ACID properties.","","Database"\r\n';
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview-questions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sectionLabel = (id: number) => {
    const i = sections.findIndex((s) => s.id === id);
    const st = sections[i];
    if (!st) return `Section ${id + 1}`;
    const r = resolved[i];
    const name = st.companyName.trim() || "Unassigned";
    return r?.roundValid ? `${name} · ${roundLabel({ roundNo: r.roundNo, title: st.roundTitle.trim() })}` : name;
  };

  /* ────────────────────────────── view ────────────────────────────── */

  return (
    <PageShell
      icon={<UploadCloud className="h-6 w-6" />}
      title="Upload interview questions"
      subtitle="Drop a question sheet. Company and round headings inside the file are read automatically; you check what was found, then save everything in one go."
      backHref="/interview-questions"
      backLabel="Question bank"
      actions={
        <button type="button" onClick={downloadTemplate} className={btnGhost} title="A CSV with the expected columns">
          <Download className="h-4 w-4" /> CSV template
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Step n={1} title="Course" active done={Boolean(courseId)}>
          <label className={label} htmlFor="course">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Questions belong to
            </span>
          </label>
          <select id="course" className={field} value={courseId} onChange={(e) => { setCourseId(e.target.value); setResult(null); }} disabled={courses === null}>
            <option value="">{courses === null ? "Loading courses…" : "Select a course"}</option>
            {(courses || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
                {c.companies ? `  —  ${plural(c.companies, "company", "companies")}` : ""}
              </option>
            ))}
          </select>
        </Step>

        <Step n={2} title="Question sheet" active={Boolean(courseId)} done={Boolean(parsed)}>
          <input ref={fileInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${dragging ? "border-cyan-500 bg-cyan-500/10" : "border-[var(--panel-border-strong)] hover:border-cyan-500/60 hover:bg-[var(--panel-card-soft)]"}`}
          >
            {parsing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <p className="text-sm font-medium">Reading {file?.name}…</p>
              </>
            ) : file ? (
              <>
                {/\.pdf$/i.test(file.name) ? <FileText className="h-8 w-8 text-rose-400" /> : <FileSpreadsheet className="h-8 w-8 text-emerald-400" />}
                <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-[var(--panel-text-faint)]">{fmtBytes(file.size)} · click or drop to replace</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-[var(--panel-text-faint)]" />
                <p className="text-sm font-medium">Drop the sheet here or click to choose</p>
                <p className="text-xs text-[var(--panel-text-faint)]">PDF, Excel (.xlsx/.xls) or CSV · up to 20 MB</p>
              </>
            )}
          </div>
          <div className="mt-3 space-y-1 text-xs text-[var(--panel-text-faint)]">
            <p><strong className="text-[var(--panel-text-muted)]">PDF:</strong> a heading per company (“TCS round 1”, “Infosys Round 2 – HR”) followed by numbered questions. “Ans:” lines become the answer.</p>
            <p><strong className="text-[var(--panel-text-muted)]">Excel/CSV:</strong> a <code>Question</code> column, plus optional <code>Company</code>, <code>Round</code>, <code>Answer</code>, <code>Topic</code>.</p>
          </div>
        </Step>
      </div>

      {/* ───────────── step 3: review ───────────── */}
      <div className="mt-5">
        <Step
          n={3}
          title="Review what was found"
          active={Boolean(parsed)}
          done={Boolean(result)}
          hint={parsed && !result ? `${parsed.fileName} · ${parsed.format === "pdf" ? "PDF" : "spreadsheet"} · ${plural(parsed.totalQuestions, "question")} in ${plural(parsed.sections.length, "section")}` : undefined}
        >
          {result ? (
            <SaveSummary result={result} sectionLabel={sectionLabel} onAnother={reset} />
          ) : !parsed ? (
            <p className="py-10 text-center text-sm text-[var(--panel-text-muted)]">Choose a course and drop a file. Its companies, rounds and questions will appear here.</p>
          ) : (
            <div className="space-y-4">
              {parsed.warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                </p>
              ))}

              {!parsed.sections.length ? (
                <p className="py-8 text-center text-sm text-[var(--panel-text-muted)]">Nothing usable was found in this file. Try the CSV template, or a PDF with numbered questions.</p>
              ) : null}

              <datalist id="iq-companies">
                {companies.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>

              {sections.map((st, i) => {
                const r = resolved[i];
                if (!r?.parsedSection) return null;
                if (st.removed) {
                  return (
                    <div key={st.id} className="flex items-center justify-between rounded-xl border border-dashed border-[var(--panel-border)] px-4 py-2 text-xs text-[var(--panel-text-faint)]">
                      <span>Section {i + 1} removed — {plural(r.parsedSection.questions.length, "question")} will not be saved{st.companyName ? ` (${st.companyName})` : ""}.</span>
                      <button type="button" className="text-cyan-400 hover:underline" onClick={() => update(st.id, { removed: false })}>Restore</button>
                    </div>
                  );
                }
                return (
                  <SectionCard
                    key={st.id}
                    index={i}
                    state={st}
                    company={r.company}
                    roundValid={r.roundValid}
                    counts={r.counts}
                    statuses={r.statuses}
                    alsoIn={r.alsoIn}
                    questions={r.parsedSection.questions}
                    heading={r.parsedSection.heading}
                    rowValue={(q) => rowValue(st, q)}
                    onChange={(patch) => update(st.id, patch)}
                  />
                );
              })}

              {parsed.sections.length ? (
                <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-[var(--panel-border)] bg-[var(--panel-bg-900)] px-5 py-4">
                  <div className="text-xs text-[var(--panel-text-muted)]">
                    {problems.length ? (
                      <span className="flex items-center gap-1.5 text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> {problems[0]}</span>
                    ) : (
                      <>
                        Saving <strong className="text-[var(--panel-text-primary)]">{plural(totalSelected, "question")}</strong> in{" "}
                        <strong className="text-[var(--panel-text-primary)]">{plural(live.filter((s) => s.selected.size).length, "section")}</strong> to{" "}
                        <strong className="text-[var(--panel-text-primary)]">{courseTitle}</strong>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={btnGhost} onClick={reset} disabled={saving}>
                      <X className="h-4 w-4" /> Discard
                    </button>
                    <button type="button" className={btnPrimary} onClick={save} disabled={saving || !totalSelected || problems.length > 0}>
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save all</>}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Step>
      </div>
    </PageShell>
  );
}

/* ───────────────────────────── section card ─────────────────────────── */

function SectionCard({
  index,
  state,
  company,
  roundValid,
  counts,
  statuses,
  alsoIn,
  questions,
  heading,
  rowValue,
  onChange,
}: {
  index: number;
  state: SectionState;
  company: CompanySummary | null;
  roundValid: boolean;
  counts: { new: number; duplicateInFile: number; existsInRound: number };
  statuses: Map<number, ParsedStatus>;
  alsoIn: Map<number, number[]>;
  questions: ParsedQuestion[];
  heading: string;
  rowValue: (q: ParsedQuestion) => Edits;
  onChange: (patch: Partial<SectionState> | ((s: SectionState) => Partial<SectionState>)) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const roundNo = Number.parseInt(state.roundNo, 10);
  const nameOk = state.companyName.trim().length >= 2;
  const existingRound = company?.rounds.find((r) => r.roundNo === roundNo);

  const toggle = (id: number) =>
    onChange((s) => {
      const next = new Set(s.selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selected: next };
    });

  return (
    <div className={`rounded-xl border ${nameOk && roundValid ? "border-[var(--panel-border)]" : "border-amber-500/40"} bg-[var(--panel-card-soft)]`}>
      {/* header */}
      <div className="flex flex-wrap items-start gap-3 p-4">
        <button type="button" onClick={() => onChange({ collapsed: !state.collapsed })} className="mt-2 shrink-0 rounded-md p-0.5 text-[var(--panel-text-faint)] hover:text-[var(--panel-text-primary)]" aria-label={state.collapsed ? "Expand" : "Collapse"}>
          {state.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1.6fr)_90px_minmax(0,1fr)]">
          <div>
            <label className={label}>
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</span>
            </label>
            <input list="iq-companies" className={field} placeholder="Company name" value={state.companyName} maxLength={120} onChange={(e) => onChange({ companyName: e.target.value })} />
            <p className="mt-1 text-[11px] text-[var(--panel-text-faint)]">
              {!nameOk ? (
                <span className="text-amber-400">Needs a company name{heading ? "" : " — the file did not name one"}.</span>
              ) : company ? (
                <span className="text-cyan-400">Adds to existing company <strong>{company.name}</strong> ({plural(company.questions, "question")})</span>
              ) : (
                <span className="text-emerald-400">New company will be created</span>
              )}
              {heading && heading !== state.companyName ? <span> · from heading “{heading}”</span> : null}
            </p>
          </div>
          <div>
            <label className={label} htmlFor={`round-${state.id}`}>Round</label>
            <input id={`round-${state.id}`} type="number" min={1} max={MAX_ROUND_NO} className={field} value={state.roundNo} onChange={(e) => onChange({ roundNo: e.target.value, roundInferred: false })} />
            <p className="mt-1 text-[11px] text-[var(--panel-text-faint)]">
              {!roundValid ? <span className="text-amber-400">1–{MAX_ROUND_NO}</span> : state.roundInferred ? <span className="text-amber-400">assumed</span> : existingRound ? <span>exists · {existingRound.questions} q</span> : company ? <span className="text-emerald-400">new round</span> : null}
            </p>
          </div>
          <div>
            <label className={label} htmlFor={`title-${state.id}`}>Round title <span className="normal-case text-[var(--panel-text-faint)]">(optional)</span></label>
            <input id={`title-${state.id}`} className={field} placeholder={existingRound?.title || "Technical, HR…"} value={state.roundTitle} maxLength={100} onChange={(e) => onChange({ roundTitle: e.target.value })} />
          </div>
        </div>

        <button type="button" onClick={() => onChange({ removed: true })} className="mt-1 shrink-0 rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-rose-500/10 hover:text-rose-400" title="Remove this section from the upload">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* counts */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-xs">
        <span className="font-semibold text-[var(--panel-text-muted)]">Section {index + 1}:</span>
        <Pill tone="emerald">{counts.new} new</Pill>
        {counts.existsInRound ? <Pill tone="rose">{counts.existsInRound} already in round</Pill> : null}
        {counts.duplicateInFile ? <Pill tone="amber">{counts.duplicateInFile} repeated</Pill> : null}
        <span className="text-[var(--panel-text-faint)]">{state.selected.size} selected</span>
        <span className="ml-auto flex gap-3">
          <button type="button" className="text-cyan-400 hover:underline" onClick={() => onChange({ selected: new Set(questions.filter((q) => statuses.get(q.id) === "new").map((q) => q.id)) })}>All new</button>
          <button type="button" className="text-cyan-400 hover:underline" onClick={() => onChange({ selected: new Set() })}>None</button>
        </span>
      </div>

      {/* rows */}
      {!state.collapsed ? (
        <ol className="max-h-[50vh] divide-y divide-[var(--panel-border)] overflow-y-auto border-t border-[var(--panel-border)]">
          {questions.map((q, i) => {
            const status = statuses.get(q.id) || "new";
            const isNew = status === "new";
            const v = rowValue(q);
            const editing = editingId === q.id;
            return (
              <li key={q.id} className={`flex gap-3 px-3 py-2.5 ${isNew ? "" : "opacity-60"} ${state.selected.has(q.id) ? "bg-cyan-500/5" : ""}`}>
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-cyan-500" checked={state.selected.has(q.id)} disabled={!isNew} onChange={() => toggle(q.id)} aria-label={`Select question ${i + 1}`} />
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="space-y-2">
                      <textarea className={`${field} min-h-[70px] resize-y`} value={v.question} maxLength={4000} onChange={(e) => onChange((s) => ({ edits: new Map(s.edits).set(q.id, { ...v, question: e.target.value }) }))} />
                      <textarea className={`${field} min-h-[50px] resize-y`} placeholder="Answer (optional)" value={v.answer} maxLength={8000} onChange={(e) => onChange((s) => ({ edits: new Map(s.edits).set(q.id, { ...v, answer: e.target.value }) }))} />
                      <div className="flex gap-2">
                        <input className={field} placeholder="Topic (optional)" value={v.topic} maxLength={200} onChange={(e) => onChange((s) => ({ edits: new Map(s.edits).set(q.id, { ...v, topic: e.target.value }) }))} />
                        <button type="button" className={btnGhost} onClick={() => setEditingId(null)}>Done</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed">
                        <span className="mr-1.5 text-xs text-[var(--panel-text-faint)]">{i + 1}.</span>
                        {v.question}
                      </p>
                      {v.answer ? <p className="mt-1 line-clamp-2 text-xs text-[var(--panel-text-muted)]"><span className="font-semibold">Ans:</span> {v.answer}</p> : null}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {status === "exists_in_round" ? <Pill tone="rose">Already in this round</Pill> : status === "duplicate_in_file" ? <Pill tone="amber">Repeated in file</Pill> : null}
                        {alsoIn.get(q.id)?.length ? <Pill>Also in round {alsoIn.get(q.id)!.join(", ")}</Pill> : null}
                        {v.topic ? <Pill>{v.topic}</Pill> : null}
                        {state.edits.has(q.id) ? <Pill tone="cyan">edited</Pill> : null}
                        {q.where ? <span className="text-[10px] text-[var(--panel-text-faint)]">{q.where}</span> : null}
                      </div>
                    </>
                  )}
                </div>
                {isNew && !editing ? (
                  <button type="button" onClick={() => setEditingId(q.id)} className="shrink-0 self-start rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-[var(--panel-card)] hover:text-[var(--panel-text-primary)]" title="Edit before saving">
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── save summary ─────────────────────────── */

function SaveSummary({ result, sectionLabel, onAnother }: { result: SaveResult; sectionLabel: (id: number) => string; onAnother: () => void }) {
  const t = result.totals;
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${t.inserted ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
        {t.inserted ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
        <div className="text-sm">
          <p className={`font-semibold ${t.inserted ? "text-emerald-400" : "text-amber-400"}`}>
            {t.inserted ? `Saved ${plural(t.inserted, "question")} to ${result.courseName}` : "Nothing new to save"}
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-[var(--panel-text-muted)]">
            <li>{plural(t.saved, "section")} saved{t.companiesCreated ? ` · ${plural(t.companiesCreated, "new company", "new companies")}` : ""}</li>
            {t.skippedExisting ? <li>{t.skippedExisting} skipped — already in their round</li> : null}
            {t.skippedInFile ? <li>{t.skippedInFile} skipped — repeated within the sheet</li> : null}
            {t.skippedInvalid ? <li>{t.skippedInvalid} skipped — no text</li> : null}
            {t.failed ? <li className="text-rose-400">{plural(t.failed, "section")} failed — see below</li> : null}
          </ul>
        </div>
      </div>

      <ol className="divide-y divide-[var(--panel-border)] rounded-xl border border-[var(--panel-border)]">
        {result.sections.map((s) => (
          <li key={s.index} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            {s.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="h-4 w-4 shrink-0 text-rose-400" />}
            <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
              {s.ok ? (
                <>
                  <Link href={`/interview-questions?course=${result.courseId}&company=${s.company._id}&round=${s.round.roundNo}`} className="truncate font-medium hover:text-cyan-400 hover:underline">
                    {s.company.name} · {s.round.label}
                  </Link>
                  {s.company.created ? <Pill tone="emerald">new company</Pill> : null}
                </>
              ) : (
                <span className="font-medium">{sectionLabel(s.index)}</span>
              )}
            </span>
            <span className="text-xs text-[var(--panel-text-muted)]">
              {s.ok ? `${s.inserted} saved${s.skippedExisting ? ` · ${s.skippedExisting} already there` : ""}${s.skippedInFile ? ` · ${s.skippedInFile} repeated` : ""}` : <span className="text-rose-400">{s.error}</span>}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Link href={`/interview-questions?course=${result.courseId}`} className={btnPrimary}>
          <Layers className="h-4 w-4" /> Browse {result.courseName}
        </Link>
        <button type="button" className={btnGhost} onClick={onAnother}>
          <UploadCloud className="h-4 w-4" /> Upload another sheet
        </button>
      </div>
    </div>
  );
}
