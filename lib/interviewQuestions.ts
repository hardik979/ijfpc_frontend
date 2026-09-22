/**
 * Client for the interview question bank.
 *
 * Every call goes through this app's own proxy (app/api/interview-questions),
 * which attaches the Clerk session token and forwards to the LMS. The shapes
 * below mirror lms-backend/routes/interviewQuestions.routes.js.
 */

export type CourseSummary = {
  _id: string;
  title: string;
  companies: number;
  questions: number;
  lastUpdated: string | null;
};

export type RoundSummary = {
  roundNo: number;
  title: string;
  label: string; // "Round 2 · Technical"
  questions: number;
};

export type CompanySummary = {
  _id: string;
  name: string;
  nameKey: string; // normalised name, unique within the course
  courseId: string;
  courseName: string;
  rounds: RoundSummary[];
  questions: number;
  lastUpdated: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Question = {
  _id: string;
  courseId: string;
  courseName: string;
  companyId: string;
  companyName: string;
  roundNo: number;
  roundTitle: string;
  question: string;
  answer: string;
  topic: string;
  source: { fileName: string; uploadedByName: string; uploadedAt: string | null };
  createdAt: string;
  updatedAt: string;
};

export type QuestionPage = {
  company: Omit<CompanySummary, "rounds" | "questions" | "lastUpdated"> & {
    rounds: { roundNo: number; title: string }[];
  };
  roundNo: number | null;
  q: string;
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Question[];
};

export type ParsedStatus = "new" | "duplicate_in_file" | "exists_in_round";

export type ParsedQuestion = {
  id: number;
  key: string; // normalised dedupe key, computed by the LMS
  question: string;
  answer: string;
  topic: string;
  where: string; // "#176" (PDF list number) or "Sheet1!row 12"
};

/** One company + round as the file named it. company is null when it did not. */
export type ParsedSection = {
  id: number;
  heading: string;
  company: { name: string; matchedId: string | null; matchedName: string | null } | null;
  roundNo: number | null;
  roundTitle: string;
  roundInferred: boolean;
  questions: ParsedQuestion[];
};

/** companyId → roundNo → keys already stored. */
export type ExistingKeys = Record<string, Record<string, string[]>>;

export type ParseResult = {
  fileName: string;
  format: "spreadsheet" | "pdf";
  warnings: string[];
  totalQuestions: number;
  sections: ParsedSection[];
  existingKeys: ExistingKeys;
};

export type SaveSectionInput = {
  company: { mode: "existing"; id: string } | { mode: "new"; name: string };
  round: { roundNo: number; title?: string };
  questions: { question: string; answer?: string; topic?: string }[];
};

export type SaveInput = {
  courseId: string;
  source?: { fileName?: string };
  sections: SaveSectionInput[];
};

export type SaveSectionResult =
  | {
      index: number;
      ok: true;
      company: CompanySummary & { created: boolean };
      round: { roundNo: number; title: string; label: string };
      received: number;
      inserted: number;
      skippedInFile: number;
      skippedExisting: number;
      skippedInvalid: number;
    }
  | { index: number; ok: false; error: string };

export type SaveResult = {
  courseId: string;
  courseName: string;
  totals: {
    saved: number;
    failed: number;
    inserted: number;
    skippedExisting: number;
    skippedInFile: number;
    skippedInvalid: number;
    companiesCreated: number;
  };
  sections: SaveSectionResult[];
};

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  constructor(status: number, message: string, code?: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

const BASE = "/api/interview-questions";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, { cache: "no-store", ...init });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error || json?.message || `Request failed (${res.status})`,
      json?.code,
      json,
    );
  }
  return json as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const interviewQuestionsApi = {
  courses: () => request<{ courses: CourseSummary[] }>("/courses"),

  companies: (courseId: string) =>
    request<{ course: { _id: string; title: string }; companies: CompanySummary[] }>(
      `/companies?courseId=${encodeURIComponent(courseId)}`,
    ),

  questions: (params: {
    companyId: string;
    roundNo?: number | null;
    q?: string;
    page?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams({ companyId: params.companyId });
    if (params.roundNo != null) sp.set("roundNo", String(params.roundNo));
    if (params.q) sp.set("q", params.q);
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    return request<QuestionPage>(`/questions?${sp.toString()}`);
  },

  parse: (file: File, courseId?: string) => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    if (courseId) fd.append("courseId", courseId);
    // No Content-Type header: the browser sets the multipart boundary.
    return request<ParseResult>("/parse", { method: "POST", body: fd });
  },

  companyKeys: (companyId: string) =>
    request<{ companyId: string; rounds: Record<string, string[]> }>(`/companies/${companyId}/keys`),

  save: (input: SaveInput) => request<SaveResult>("/save", jsonInit("POST", input)),

  updateQuestion: (id: string, patch: { question?: string; answer?: string; topic?: string }) =>
    request<{ question: Question }>(`/questions/${id}`, jsonInit("PATCH", patch)),

  deleteQuestion: (id: string) =>
    request<{ deleted: number }>(`/questions/${id}`, { method: "DELETE" }),

  renameCompany: (id: string, name: string) =>
    request<{ company: CompanySummary }>(`/companies/${id}`, jsonInit("PATCH", { name })),

  retitleRound: (companyId: string, roundNo: number, title: string) =>
    request<{ company: CompanySummary }>(
      `/companies/${companyId}/rounds/${roundNo}`,
      jsonInit("PATCH", { title }),
    ),

  deleteRound: (companyId: string, roundNo: number) =>
    request<{ deletedQuestions: number }>(`/companies/${companyId}/rounds/${roundNo}`, {
      method: "DELETE",
    }),

  deleteCompany: (companyId: string) =>
    request<{ deletedQuestions: number }>(`/companies/${companyId}`, { method: "DELETE" }),
};

export const roundLabel = (r: { roundNo: number; title?: string }) =>
  r.title ? `Round ${r.roundNo} · ${r.title}` : `Round ${r.roundNo}`;

/**
 * Normalised company name — a mirror of companyKey() in
 * lms-backend/lib/interviewQuestionKeys.js, used only so the upload page can
 * say "adds to existing company X" as a name is typed. The LMS recomputes it
 * on save and is the one that decides; change both together.
 */
const COMPANY_SUFFIX_RE =
  /\b(?:pvt|private|ltd|limited|llp|llc|inc|incorporated|corp|corporation|co|technologies|technology|tech|solutions|services|india)\b/g;

export function companyKey(name: string): string {
  const tokens = String(name || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const merged: { text: string; acronym: boolean }[] = [];
  for (const tok of tokens) {
    const last = merged[merged.length - 1];
    if (tok.length === 1 && last?.acronym) last.text += tok;
    else merged.push({ text: tok, acronym: tok.length === 1 });
  }
  const base = merged.map((m) => m.text).join(" ");
  const stripped = base.replace(COMPANY_SUFFIX_RE, " ").replace(/\s+/g, " ").trim();
  return stripped || base;
}
