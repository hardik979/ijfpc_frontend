import {
  normalizeSectionPages,
  type ResumeData,
  type SectionKey,
  type TemplateKey,
  type ResumeTheme,
  type ResumeFontFamily,
} from "@/lib/resume";

/* ───────────────────────── Canonical form shape ─────────────────────────
 * One flat shape that the single page-level react-hook-form holds. Field
 * names are chosen to match what the PDF router (ResumePDF.tsx) reads, so the
 * downloaded PDF stays byte-identical. Legacy aliases (jobRole, profileImage,
 * skillsInput, start/end, points) are collapsed on the way in (draftToForm)
 * and re-emitted on the way out (formToResumeData).
 * ─────────────────────────────────────────────────────────────────────── */

export type EducationFormEntry = {
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
  currentlyStudying: boolean;
  highlights: string[];
};

export type ExperienceFormEntry = {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  techStack: string;
  bullets: string[];
  isCurrent: boolean;
};

export type ProjectFormEntry = {
  name: string;
  techStack: string;
  link: string;
  bullets: string[];
};

export type ResumeFormValues = {
  // Personal
  fullName: string;
  role: string; // canonical (was jobRole)
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  domain: string;
  experienceYears?: number;
  photo: string | null; // canonical (was profileImage)
  languages: string[];

  // Summary
  summary: string;

  // Arrays
  skills: string[];
  experience: ExperienceFormEntry[];
  education: EducationFormEntry[];
  projects: ProjectFormEntry[];

  // Design
  layout: TemplateKey;
  theme: ResumeTheme;
  fontFamily: ResumeFontFamily;
  fontSize: number;

  // Layout: ordered section keys per page (drag-and-drop)
  sectionPages: SectionKey[][];
};

/* ───────────────────────── Option lists + guards ───────────────────────── */

export const TEMPLATE_OPTIONS: Array<{
  key: TemplateKey;
  name: string;
  note: string;
  icon: string;
}> = [
  { key: "naukriStyle", name: "Naukri Style", note: "Recruiter-friendly Naukri inspired format", icon: "📘" },
  { key: "corporateSidebar", name: "Corporate Sidebar", note: "Two-column with dark sidebar — corporate IT roles", icon: "🏢" },
  { key: "atsClassic", name: "ATS Classic", note: "Clean single-column, ATS-friendly for IT applications", icon: "📄" },
  { key: "modernBand", name: "Modern Band", note: "Color header band with structured two-column body", icon: "🎨" },
];

export const THEME_OPTIONS: Array<{ key: ResumeTheme; name: string; dot: string }> = [
  { key: "blue", name: "Blue", dot: "from-blue-500 to-indigo-600" },
  { key: "slate", name: "Slate", dot: "from-slate-500 to-slate-700" },
  { key: "emerald", name: "Emerald", dot: "from-emerald-500 to-teal-600" },
  { key: "purple", name: "Purple", dot: "from-purple-500 to-violet-700" },
  { key: "rose", name: "Rose", dot: "from-rose-500 to-pink-600" },
  { key: "teal", name: "Teal", dot: "from-teal-500 to-cyan-600" },
  { key: "amber", name: "Amber", dot: "from-amber-500 to-orange-600" },
];

export const FONT_FAMILY_OPTIONS: Array<{ key: ResumeFontFamily; name: string }> = [
  { key: "Helvetica", name: "Helvetica" },
  { key: "Times-Roman", name: "Times" },
  { key: "Courier", name: "Courier" },
  { key: "Roboto", name: "Roboto" },
];

export const FONT_SIZE_OPTIONS = [
  { key: "small", name: "Small", value: 10 },
  { key: "medium", name: "Medium", value: 12 },
  { key: "large", name: "Large", value: 14 },
] as const;

export function isValidTemplateKey(value: unknown): value is TemplateKey {
  return TEMPLATE_OPTIONS.some((t) => t.key === value);
}

export function isValidTheme(value: unknown): value is ResumeTheme {
  return THEME_OPTIONS.some((t) => t.key === value);
}

export function isValidFontFamily(value: unknown): value is ResumeFontFamily {
  return FONT_FAMILY_OPTIONS.some((f) => f.key === value);
}

/* ───────────────────────── Helpers + factories ─────────────────────────── */

export function parseSkills(input?: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.map((s) => String(s ?? "").trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export const emptyExperience = (): ExperienceFormEntry => ({
  jobTitle: "",
  company: "",
  startDate: "",
  endDate: "",
  techStack: "",
  bullets: [""],
  isCurrent: false,
});

export const emptyEducation = (): EducationFormEntry => ({
  degree: "",
  institution: "",
  startYear: "",
  endYear: "",
  currentlyStudying: false,
  highlights: [],
});

export const emptyProject = (): ProjectFormEntry => ({
  name: "",
  techStack: "",
  link: "",
  bullets: [""],
});

const trimList = (arr?: string[]): string[] =>
  (arr ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);

/* ───────────────────────── Draft ⇆ Form mapping ────────────────────────── */

/** Collapse a (possibly legacy) saved draft into the canonical form shape.
 *  Runs once on mount / restore — never in a render effect. */
export function draftToForm(p: Partial<ResumeData> = {}): ResumeFormValues {
  const skills =
    Array.isArray(p.skills) && p.skills.length
      ? p.skills.map((s) => String(s ?? ""))
      : parseSkills(p.skillsInput);

  const experience: ExperienceFormEntry[] = (p.experience ?? []).map((e) => {
    const bullets = e.bullets?.length ? e.bullets : e.points;
    return {
      jobTitle: e.jobTitle ?? "",
      company: e.company ?? "",
      startDate: e.startDate ?? e.start ?? "",
      endDate: e.endDate ?? e.end ?? "",
      techStack: Array.isArray(e.techStack)
        ? e.techStack.join(", ")
        : e.techStack ?? "",
      bullets: bullets && bullets.length ? bullets : [""],
      isCurrent: e.isCurrent ?? false,
    };
  });

  const education: EducationFormEntry[] = (p.education ?? []).map((e) => ({
    degree: e.degree ?? "",
    institution: e.institution ?? "",
    startYear: e.startYear ?? "",
    endYear: e.endYear ?? "",
    currentlyStudying: e.currentlyStudying ?? false,
    // Education highlights were removed from the builder.
    highlights: [],
  }));

  const projects: ProjectFormEntry[] = (p.projects ?? []).map((e) => ({
    name: e.name ?? "",
    techStack: e.techStack ?? "",
    link: e.link ?? "",
    bullets: e.bullets?.length ? e.bullets : [""],
  }));

  return {
    fullName: p.fullName ?? "",
    role: p.role ?? p.jobRole ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    linkedin: p.linkedin ?? "",
    domain: p.domain ?? "",
    experienceYears:
      typeof p.experienceYears === "number" ? p.experienceYears : undefined,
    photo: p.photo ?? p.profileImage ?? null,
    languages: Array.isArray(p.languages) ? p.languages : [],
    summary: typeof p.summary === "string" ? p.summary : "",
    skills: skills.length ? skills : [""],
    experience: experience.length ? experience : [emptyExperience()],
    education: education.length ? education : [emptyEducation()],
    projects: projects.length ? projects : [emptyProject()],
    layout: isValidTemplateKey(p.layout) ? p.layout : "naukriStyle",
    theme: isValidTheme(p.theme) ? p.theme : "blue",
    fontFamily: isValidFontFamily(p.fontFamily) ? p.fontFamily : "Helvetica",
    fontSize: typeof p.fontSize === "number" ? p.fontSize : 12,
    sectionPages: normalizeSectionPages(p.sectionPages),
  };
}

/** Defaults for a brand-new builder session (no saved draft). */
export const EMPTY_FORM: ResumeFormValues = draftToForm();

/** Re-emit the canonical form as ResumeData for the PDF router + autosave.
 *  Re-adds legacy aliases and trims empties exactly like the old per-step
 *  onSubmit handlers, so PDF output is unchanged. */
export function formToResumeData(v: ResumeFormValues): ResumeData {
  return {
    fullName: v.fullName,
    role: v.role,
    jobRole: v.role, // back-compat alias
    domain: v.domain,
    experienceYears: v.experienceYears,
    summary: v.summary,
    phone: v.phone,
    email: v.email,
    linkedin: v.linkedin,
    address: v.address,
    photo: v.photo ?? undefined,
    profileImage: v.photo ?? undefined, // back-compat alias
    skills: trimList(v.skills),
    languages: v.languages,
    experience: v.experience.map((e) => {
      const bullets = trimList(e.bullets);
      return {
        ...e,
        endDate: e.isCurrent ? "" : e.endDate,
        bullets: bullets.length ? bullets : [""],
      };
    }),
    education: v.education.map((e) => ({
      ...e,
      endYear: e.currentlyStudying ? "" : e.endYear,
      // Education highlights were removed from the builder; never emit them.
      highlights: [],
    })),
    projects: v.projects.map((p) => ({
      ...p,
      bullets: trimList(p.bullets),
    })),
    layout: v.layout,
    theme: v.theme,
    fontFamily: v.fontFamily,
    fontSize: v.fontSize,
    sectionPages: normalizeSectionPages(v.sectionPages),
  };
}
