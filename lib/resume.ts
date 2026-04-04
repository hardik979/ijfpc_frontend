export type EducationEntry = {
  degree?: string;
  institution?: string;
  startYear?: string;
  endYear?: string;
  currentlyStudying?: boolean;
};

export type ProjectEntry = {
  name?: string;
  techStack?: string;
  link?: string;
  bullets?: string[];
};

export type TemplateKey =
  | "classicSidebar"
  | "accentHeader"
  | "splitTwoColumn"
  | "timeline"
  | "minimalClean"
  | "modernCorporate"
  | "atsCompact"
  | "elegantSidebar";

export type ResumeTheme = "blue" | "slate" | "emerald";
export type ResumeFontFamily = "Helvetica" | "Times-Roman" | "Courier";

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

export type ResumeData = {
  fullName?: string;
  role?: string;
  jobRole?: string;
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
  skillsInput?: string;
  languages?: string[];

  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  projects?: ProjectEntry[];

  layout?: TemplateKey;

  theme?: ResumeTheme;
  fontFamily?: ResumeFontFamily;
  fontSize?: number;
};