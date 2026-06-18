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
};