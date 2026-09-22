"use client";

/**
 * Interview question bank — browse.
 *
 * A four-level drill-down driven entirely by the URL (?course=&company=&round=)
 * so every level is linkable and the browser's back button walks up:
 *
 *   courses  →  companies in a course  →  rounds of a company  →  questions
 *
 * Managers (lib/rbac.ts) also get rename / retitle / edit / delete controls
 * and the "Upload questions" button, which opens the upload page with the
 * current course / company / round already selected.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  GraduationCap,
  Layers,
  ListChecks,
  MessageSquareText,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ROLES } from "@/lib/rbac";
import {
  ApiError,
  CompanySummary,
  CourseSummary,
  Question,
  QuestionPage,
  interviewQuestionsApi as api,
  roundLabel,
} from "@/lib/interviewQuestions";
import {
  EmptyState,
  PageShell,
  Pill,
  Spinner,
  btnGhost,
  btnPrimary,
  card,
  field,
  fmtDate,
  plural,
} from "./ui";

const errMsg = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

// Who sees the upload / edit / delete controls. The LMS applies the same list
// on every write, so this only decides what is drawn.
const MANAGE_ROLES: readonly string[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.PLACEMENT_STAFF,
  ROLES.PREEPLACEMENT_STAFF,
];

/* ────────────────────────────── page ────────────────────────────── */

export default function QuestionBankBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useUser();
  const canManage = MANAGE_ROLES.includes(String((user?.publicMetadata as { role?: string })?.role ?? ""));

  const courseId = params.get("course") || "";
  const companyId = params.get("company") || "";
  const roundParam = params.get("round") || "";
  const roundNo = roundParam === "all" ? "all" : /^\d+$/.test(roundParam) ? Number(roundParam) : null;

  const go = useCallback(
    (next: { course?: string; company?: string; round?: string }) => {
      const sp = new URLSearchParams();
      if (next.course) sp.set("course", next.course);
      if (next.company) sp.set("company", next.company);
      if (next.round) sp.set("round", next.round);
      const qs = sp.toString();
      router.push(`/interview-questions${qs ? `?${qs}` : ""}`);
    },
    [router],
  );

  /* ---------------------------------------------------------- courses */
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const loadCourses = useCallback(async () => {
    try {
      const { courses } = await api.courses();
      setCourses(courses);
    } catch (e) {
      toast.error(errMsg(e, "Could not load courses"));
      setCourses([]);
    }
  }, []);
  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  /* -------------------------------------------------------- companies */
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const loadCompanies = useCallback(async (id: string) => {
    if (!id) {
      setCompanies(null);
      return;
    }
    setCompanies(null);
    try {
      const { course, companies } = await api.companies(id);
      setCourseTitle(course.title);
      setCompanies(companies);
    } catch (e) {
      toast.error(errMsg(e, "Could not load companies"));
      setCompanies([]);
    }
  }, []);
  useEffect(() => {
    void loadCompanies(courseId);
  }, [courseId, loadCompanies]);

  const course = useMemo(() => courses?.find((c) => c._id === courseId) || null, [courses, courseId]);
  const company = useMemo(() => companies?.find((c) => c._id === companyId) || null, [companies, companyId]);
  const round = useMemo(
    () => (typeof roundNo === "number" ? company?.rounds.find((r) => r.roundNo === roundNo) || null : null),
    [company, roundNo],
  );

  /* ------------------------------------------------------- breadcrumb */
  const crumbs: { label: string; onClick?: () => void }[] = [{ label: "Courses", onClick: courseId ? () => go({}) : undefined }];
  if (courseId) crumbs.push({ label: course?.title || courseTitle || "Course", onClick: companyId ? () => go({ course: courseId }) : undefined });
  if (companyId) crumbs.push({ label: company?.name || "Company", onClick: roundNo !== null ? () => go({ course: courseId, company: companyId }) : undefined });
  if (companyId && roundNo !== null) crumbs.push({ label: roundNo === "all" ? "All rounds" : round ? roundLabel(round) : `Round ${roundNo}` });

  const uploadHref = (() => {
    const sp = new URLSearchParams();
    if (courseId) sp.set("course", courseId);
    if (companyId) sp.set("company", companyId);
    if (typeof roundNo === "number") sp.set("round", String(roundNo));
    const qs = sp.toString();
    return `/interview-questions/upload${qs ? `?${qs}` : ""}`;
  })();

  return (
    <PageShell
      icon={<MessageSquareText className="h-6 w-6" />}
      title="Interview Question Bank"
      subtitle="Real questions asked by companies, filed by course → company → round. Open a course to drill down."
      backHref="/redirect"
      backLabel="Dashboard"
      actions={
        canManage ? (
          <Link href={uploadHref} className={btnPrimary}>
            <UploadCloud className="h-4 w-4" /> Upload questions
          </Link>
        ) : null
      }
    >
      {/* breadcrumb */}
      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-4 w-4 text-[var(--panel-text-faint)]" /> : null}
            {c.onClick ? (
              <button type="button" onClick={c.onClick} className="rounded-md px-1.5 py-0.5 text-[var(--panel-text-muted)] transition-colors hover:bg-[var(--panel-card-soft)] hover:text-[var(--panel-text-primary)]">
                {c.label}
              </button>
            ) : (
              <span className="px-1.5 py-0.5 font-semibold">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      {!courseId ? (
        <CoursesLevel courses={courses} onOpen={(id) => go({ course: id })} canManage={canManage} />
      ) : !companyId ? (
        <CompaniesLevel
          companies={companies}
          canManage={canManage}
          onOpen={(id) => go({ course: courseId, company: id })}
          onOpenRound={(id, r) => go({ course: courseId, company: id, round: String(r) })}
          onChanged={() => {
            void loadCompanies(courseId);
            void loadCourses();
          }}
        />
      ) : roundNo === null ? (
        <RoundsLevel
          company={company}
          loading={companies === null}
          canManage={canManage}
          onOpen={(r) => go({ course: courseId, company: companyId, round: r })}
          onChanged={() => {
            void loadCompanies(courseId);
            void loadCourses();
          }}
        />
      ) : (
        <QuestionsLevel
          companyId={companyId}
          roundNo={roundNo === "all" ? null : roundNo}
          canManage={canManage}
          onChanged={() => {
            void loadCompanies(courseId);
            void loadCourses();
          }}
        />
      )}
    </PageShell>
  );
}

/* ─────────────────────────── level 1: courses ───────────────────── */

function CoursesLevel({ courses, onOpen, canManage }: { courses: CourseSummary[] | null; onOpen: (id: string) => void; canManage: boolean }) {
  if (courses === null) return <Spinner text="Loading courses…" />;
  if (!courses.length) {
    return <EmptyState icon={<GraduationCap className="h-6 w-6" />} title="No courses in the LMS yet" hint="Courses are created in the LMS; the question bank files questions under them." />;
  }
  const withData = courses.filter((c) => c.questions > 0);
  const empty = courses.filter((c) => c.questions === 0);

  const Card = ({ c }: { c: CourseSummary }) => (
    <button
      type="button"
      onClick={() => onOpen(c._id)}
      className={`${card} group flex flex-col gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
          <GraduationCap className="h-5 w-5" />
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--panel-text-faint)] transition-transform group-hover:translate-x-0.5" />
      </div>
      <h3 className="text-base font-semibold leading-snug">{c.title}</h3>
      <div className="mt-auto flex flex-wrap gap-2">
        <Pill tone={c.companies ? "cyan" : "neutral"}>
          <Building2 className="h-3 w-3" /> {plural(c.companies, "company", "companies")}
        </Pill>
        <Pill tone={c.questions ? "emerald" : "neutral"}>
          <ListChecks className="h-3 w-3" /> {plural(c.questions, "question")}
        </Pill>
      </div>
      <p className="text-xs text-[var(--panel-text-faint)]">
        {c.lastUpdated ? `Updated ${fmtDate(c.lastUpdated)}` : canManage ? "Nothing uploaded yet — open to upload" : "Nothing uploaded yet"}
      </p>
    </button>
  );

  return (
    <div className="space-y-8">
      {withData.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withData.map((c) => (
            <Card key={c._id} c={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="No questions uploaded yet"
          hint={canManage ? "Use “Upload questions” to add the first company sheet." : "Nothing has been uploaded yet."}
        />
      )}
      {empty.length ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--panel-text-muted)]">Courses without questions</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {empty.map((c) => (
              <Card key={c._id} c={c} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────── level 2: companies ──────────────────── */

function CompaniesLevel({
  companies,
  canManage,
  onOpen,
  onOpenRound,
  onChanged,
}: {
  companies: CompanySummary[] | null;
  canManage: boolean;
  onOpen: (id: string) => void;
  onOpenRound: (id: string, roundNo: number) => void;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<CompanySummary | null>(null);

  if (companies === null) return <Spinner text="Loading companies…" />;
  if (!companies.length) {
    return (
      <EmptyState
        icon={<Building2 className="h-6 w-6" />}
        title="No companies in this course yet"
        hint={canManage ? "Upload a question sheet and choose “New company” to add the first one." : "No question sheets have been uploaded for this course."}
      />
    );
  }

  const needle = q.trim().toLowerCase();
  const visible = needle ? companies.filter((c) => c.name.toLowerCase().includes(needle)) : companies;

  const remove = async (c: CompanySummary) => {
    if (!window.confirm(`Delete "${c.name}" and all ${c.questions} of its questions? This cannot be undone.`)) return;
    try {
      await api.deleteCompany(c._id);
      toast.success(`Deleted ${c.name}`);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Could not delete the company"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
        <input className={`${field} pl-9`} placeholder={`Search ${plural(companies.length, "company", "companies")}…`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--panel-text-muted)]">No company matches “{q}”.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((c) => (
            <div key={c._id} className={`${card} flex flex-col gap-3 p-5 transition-colors hover:border-cyan-500/40`}>
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onOpen(c._id)} className="flex min-w-0 items-center gap-3 text-left">
                  <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold hover:text-cyan-400">{c.name}</h3>
                    <p className="text-xs text-[var(--panel-text-faint)]">
                      {plural(c.rounds.length, "round")} · {plural(c.questions, "question")} · updated {fmtDate(c.lastUpdated)}
                    </p>
                  </div>
                </button>
                {canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setRenaming(c)} className="rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-[var(--panel-card-soft)] hover:text-[var(--panel-text-primary)]" title="Rename">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(c)} className="rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-rose-500/10 hover:text-rose-400" title="Delete company">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {c.rounds.length ? (
                  c.rounds.map((r) => (
                    <button
                      key={r.roundNo}
                      type="button"
                      onClick={() => onOpenRound(c._id, r.roundNo)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-1 text-xs font-medium text-[var(--panel-text-secondary)] transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
                    >
                      <Layers className="h-3 w-3" /> {r.label}
                      <span className="rounded-full bg-cyan-500/15 px-1.5 text-[10px] text-cyan-400">{r.questions}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-[var(--panel-text-faint)]">No rounds yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {renaming ? (
        <NameDialog
          title={`Rename ${renaming.name}`}
          initial={renaming.name}
          placeholder="Company name"
          onClose={() => setRenaming(null)}
          onSubmit={async (name) => {
            await api.renameCompany(renaming._id, name);
            toast.success("Company renamed");
            setRenaming(null);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

/* ─────────────────────────── level 3: rounds ────────────────────── */

function RoundsLevel({
  company,
  loading,
  canManage,
  onOpen,
  onChanged,
}: {
  company: CompanySummary | null;
  loading: boolean;
  canManage: boolean;
  onOpen: (round: string) => void;
  onChanged: () => void;
}) {
  const [retitling, setRetitling] = useState<{ roundNo: number; title: string } | null>(null);

  if (loading) return <Spinner text="Loading rounds…" />;
  if (!company) return <EmptyState icon={<Building2 className="h-6 w-6" />} title="Company not found" hint="It may have been deleted. Go back to the course." />;
  if (!company.rounds.length) {
    return <EmptyState icon={<Layers className="h-6 w-6" />} title={`No rounds for ${company.name} yet`} hint={canManage ? "Upload a sheet and add the first round." : undefined} />;
  }

  const remove = async (r: { roundNo: number; title: string; questions: number }) => {
    if (!window.confirm(`Delete ${roundLabel(r)} of ${company.name} and its ${r.questions} questions? This cannot be undone.`)) return;
    try {
      await api.deleteRound(company._id, r.roundNo);
      toast.success(`Deleted ${roundLabel(r)}`);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Could not delete the round"));
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onOpen("all")}
        className={`${card} flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:border-cyan-500/40`}
      >
        <span className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
            <ListChecks className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold">All rounds</span>
            <span className="block text-xs text-[var(--panel-text-faint)]">{plural(company.questions, "question")} across {plural(company.rounds.length, "round")}</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-[var(--panel-text-faint)]" />
      </button>

      {company.rounds.map((r) => (
        <div key={r.roundNo} className={`${card} flex items-center justify-between gap-3 p-4 transition-colors hover:border-cyan-500/40`}>
          <button type="button" onClick={() => onOpen(String(r.roundNo))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
              <Layers className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold hover:text-cyan-400">{r.label}</span>
              <span className="block text-xs text-[var(--panel-text-faint)]">{plural(r.questions, "question")}</span>
            </span>
          </button>
          {canManage ? (
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => setRetitling({ roundNo: r.roundNo, title: r.title })} className="rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-[var(--panel-card-soft)] hover:text-[var(--panel-text-primary)]" title="Rename round">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => remove(r)} className="rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-rose-500/10 hover:text-rose-400" title="Delete round">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--panel-text-faint)]" />
        </div>
      ))}

      {retitling ? (
        <NameDialog
          title={`Round ${retitling.roundNo} title`}
          initial={retitling.title}
          placeholder="e.g. Technical, HR, Managerial (optional)"
          allowEmpty
          onClose={() => setRetitling(null)}
          onSubmit={async (title) => {
            await api.retitleRound(company._id, retitling.roundNo, title);
            toast.success("Round updated");
            setRetitling(null);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

/* ────────────────────────── level 4: questions ──────────────────── */

const PAGE_SIZE = 50;

function QuestionsLevel({ companyId, roundNo, canManage, onChanged }: { companyId: string; roundNo: number | null; canManage: boolean; onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QuestionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(1);
  }, [debounced, roundNo, companyId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.questions({ companyId, roundNo, q: debounced, page, limit: PAGE_SIZE }));
    } catch (e) {
      toast.error(errMsg(e, "Could not load questions"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, roundNo, debounced, page]);
  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (item: Question) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.deleteQuestion(item._id);
      toast.success("Question deleted");
      void load();
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, "Could not delete the question"));
    }
  };

  const start = data ? (data.page - 1) * data.limit : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
          <input className={`${field} pl-9`} placeholder="Search question, answer or topic…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q ? (
            <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--panel-text-faint)] hover:text-[var(--panel-text-primary)]" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {data ? (
          <p className="text-sm text-[var(--panel-text-muted)]">
            {plural(data.total, "question")}
            {debounced ? ` matching “${debounced}”` : ""}
          </p>
        ) : null}
      </div>

      {loading && !data ? (
        <Spinner text="Loading questions…" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title={debounced ? "No matches" : "No questions here yet"} hint={debounced ? "Try a different word." : canManage ? "Upload a sheet to add questions to this round." : undefined} />
      ) : (
        <ol className={`${card} divide-y divide-[var(--panel-border)] ${loading ? "opacity-60" : ""}`}>
          {data.items.map((item, i) => (
            <QuestionRow key={item._id} n={start + i + 1} item={item} showRound={roundNo === null} canManage={canManage} onEdit={() => setEditing(item)} onDelete={() => remove(item)} />
          ))}
        </ol>
      )}

      {data && data.pages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--panel-text-muted)]">
          <span>
            Page {data.page} of {data.pages}
          </span>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button type="button" className={btnGhost} disabled={page >= data.pages || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <EditQuestionDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function QuestionRow({ n, item, showRound, canManage, onEdit, onDelete }: { n: number; item: Question; showRound: boolean; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const hasAnswer = Boolean(item.answer);
  return (
    <li className="group flex gap-3 px-4 py-3.5 sm:px-5">
      <span className="mt-0.5 w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--panel-text-faint)]">{n}.</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">{item.question}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--panel-text-faint)]">
          {showRound ? <Pill tone="cyan">{roundLabel(item)}</Pill> : null}
          {item.topic ? <Pill>{item.topic}</Pill> : null}
          {hasAnswer ? (
            <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 font-medium text-cyan-400 hover:underline">
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {open ? "Hide answer" : "Show answer"}
            </button>
          ) : null}
          <span title={item.source.fileName ? `From ${item.source.fileName}` : undefined}>
            {item.source.uploadedByName ? `${item.source.uploadedByName} · ` : ""}
            {fmtDate(item.source.uploadedAt || item.createdAt)}
          </span>
        </div>
        {open && hasAnswer ? (
          <div className="mt-2 whitespace-pre-wrap rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-3 py-2 text-sm text-[var(--panel-text-secondary)]">{item.answer}</div>
        ) : null}
      </div>
      {canManage ? (
        <div className="flex shrink-0 items-start gap-1 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-[var(--panel-card-soft)] hover:text-[var(--panel-text-primary)]" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-[var(--panel-text-faint)] hover:bg-rose-500/10 hover:text-rose-400" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </li>
  );
}

/* ───────────────────────────── dialogs ──────────────────────────── */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`${card} w-full max-w-lg bg-[var(--panel-bg-900)] p-5 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--panel-text-faint)] hover:text-[var(--panel-text-primary)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NameDialog({ title, initial, placeholder, allowEmpty, onClose, onSubmit }: { title: string; initial: string; placeholder: string; allowEmpty?: boolean; onClose: () => void; onSubmit: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v && !allowEmpty) return;
    setBusy(true);
    try {
      await onSubmit(v);
    } catch (err) {
      toast.error(errMsg(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <input autoFocus className={field} value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} maxLength={120} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy || (!allowEmpty && !value.trim())}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditQuestionDialog({ item, onClose, onSaved }: { item: Question; onClose: () => void; onSaved: () => void }) {
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);
  const [topic, setTopic] = useState(item.topic);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 3) return toast.error("The question needs some text");
    setBusy(true);
    try {
      await api.updateQuestion(item._id, { question: question.trim(), answer: answer.trim(), topic: topic.trim() });
      toast.success("Question updated");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, "Could not update the question"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit question" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--panel-text-muted)]">Question</label>
          <textarea autoFocus className={`${field} min-h-[90px] resize-y`} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={4000} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--panel-text-muted)]">Answer <span className="normal-case text-[var(--panel-text-faint)]">(optional)</span></label>
          <textarea className={`${field} min-h-[90px] resize-y`} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={8000} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--panel-text-muted)]">Topic <span className="normal-case text-[var(--panel-text-faint)]">(optional)</span></label>
          <input className={field} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder="e.g. SQL, Linux, Behavioural" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

