export type EducationEntry = {
  degree?: string;
  institution?: string;
  startYear?: string;
  endYear?: string;
  currentlyStudying?: boolean;
  highlights?: string[];
};

export type ProjectEntry = {
  name?: string;
  techStack?: string;
  link?: string;
  bullets?: string[];
};

export type TemplateKey =
  | "naukriStyle"
  | "corporateSidebar"
  | "atsClassic"
  | "modernBand";

export type ResumeTheme =
  | "blue"
  | "slate"
  | "emerald"
  | "purple"
  | "rose"
  | "teal"
  | "amber";

export type ResumeFontFamily =
  | "Helvetica"
  | "Times-Roman"
  | "Courier"
  | "Roboto"
  | "Lato"
  | "Montserrat"
  | "OpenSans"
  | "SourceSansPro"
  | "Merriweather"
  | "Nunito";

export type ExperienceEntry = {
  jobTitle?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  start?: string;
  end?: string;
  techStack?: string[] | string;
  bullets?: string[];
  points?: string[];
  isCurrent?: boolean;
};

/* Sections the user can rearrange across pages. The header (name + contact)
 * is not a section — it is always pinned to the top of page 1. */
export const SECTION_KEYS = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "languages",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/** Sanitize a saved pages layout: drop unknown/duplicate keys, keep
 *  user-created empty pages, and append any missing sections to the last
 *  page so every section always lives somewhere exactly once. */
export function normalizeSectionPages(input?: unknown): SectionKey[][] {
  const seen = new Set<SectionKey>();
  const pages: SectionKey[][] = [];

  if (Array.isArray(input)) {
    for (const page of input) {
      if (!Array.isArray(page)) continue;
      const keys: SectionKey[] = [];
      for (const key of page) {
        if (
          (SECTION_KEYS as readonly string[]).includes(key as string) &&
          !seen.has(key as SectionKey)
        ) {
          seen.add(key as SectionKey);
          keys.push(key as SectionKey);
        }
      }
      pages.push(keys);
    }
  }

  if (!pages.length) pages.push([]);
  const missing = SECTION_KEYS.filter((key) => !seen.has(key));
  pages[pages.length - 1] = [...pages[pages.length - 1], ...missing];
  return pages;
}

export type ResumeData = {
  fullName?: string;
  role?: string;
  jobRole?: string;
  domain?: string;
  experienceYears?: number;

  summary?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  address?: string;

  profileImage?: string | null;
  profileImageRaw?: string | null;
  photo?: string | null;

  skills?: string[];
  skillsInput?: string | string[];
  languages?: string[];

  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  projects?: ProjectEntry[];

  layout?: TemplateKey;
  theme?: ResumeTheme;
  fontFamily?: ResumeFontFamily;
  fontSize?: number;

  /** Ordered section keys per page (drag-and-drop layout). */
  sectionPages?: SectionKey[][];
};