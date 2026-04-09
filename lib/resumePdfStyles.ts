import { Font, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume";

export type ThemePalette = {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  subText: string;
  border: string;
  soft: string;
  sidebarBg: string;
  sidebarText: string;
  chipBg: string;
  chipText: string;
};

let fontsRegistered = false;

export function registerPdfFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf",
        fontWeight: "bold",
      },
    ],
  });

  Font.register({
    family: "Lato",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWlU.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.ttf",
        fontWeight: "bold",
      },
    ],
  });

  Font.register({
    family: "Montserrat",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/montserrat/v30/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.ttf",
        fontWeight: "bold",
      },
    ],
  });

  Font.register({
    family: "Open Sans",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/opensans/v40/mem8YaGs126MiZpBA-UFVZ0e.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/opensans/v40/mem5YaGs126MiZpBA-UN_r8OUuhp.ttf",
        fontWeight: "bold",
      },
    ],
  });

  Font.register({
    family: "Source Sans Pro",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/sourcesanspro/v21/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwlxdu.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/sourcesanspro/v21/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNa7lujVj9_mf.ttf",
        fontWeight: "bold",
      },
    ],
  });

  Font.register({
    family: "Merriweather",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5-eCZMdeX3rsHo.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyriQwlOrhSvowK_l521wRpX837pvjxPA.ttf",
        fontWeight: "bold",
      },
    ],
  });

  Font.register({
    family: "Nunito",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/nunito/v25/XRXV3I6Li01BKofINeaB.ttf",
        fontWeight: "normal",
      },
      {
        src: "https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3jw.ttf",
        fontWeight: "bold",
      },
    ],
  });

  fontsRegistered = true;
}

registerPdfFonts();

export const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  row: {
    flexDirection: "row",
  },

  leftCol: {
    width: "32%",
    paddingRight: 14,
  },

  rightCol: {
    width: "68%",
    paddingLeft: 14,
  },

  section: {
    marginBottom: 12,
  },

  sectionTight: {
    marginBottom: 8,
  },

  heading: {
    fontSize: 11.5,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  name: {
    fontSize: 22,
    fontWeight: 700,
  },

  role: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 1.35,
  },

  text: {
    fontSize: 9.7,
    lineHeight: 1.62,
    marginBottom: 3,
    textAlign: "justify",
  },

  smallText: {
    fontSize: 8.8,
    lineHeight: 1.45,
  },

  bullet: {
    fontSize: 9.3,
    lineHeight: 1.5,
    marginBottom: 3,
    textAlign: "justify",
    marginLeft: 12,
  },

  itemTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 2,
    lineHeight: 1.3,
  },

  subText: {
    fontSize: 8.8,
    marginBottom: 4,
    lineHeight: 1.35,
  },

  divider: {
    height: 1,
    marginVertical: 8,
  },

  image: {
    width: 78,
    height: 78,
    borderRadius: 39,
    marginBottom: 12,
    objectFit: "cover",
  },

  heroImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    objectFit: "cover",
  },

  skillTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  skillTag: {
    fontSize: 8.4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
  },

  headerCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },

  contactLine: {
    marginBottom: 4,
    fontSize: 9.3,
    lineHeight: 1.4,
  },

  sidebarBox: {
    padding: 14,
    borderRadius: 10,
    minHeight: "100%",
  },

  sectionBar: {
    height: 3,
    width: 34,
    borderRadius: 4,
    marginBottom: 6,
  },

  expCard: {
    paddingBottom: 6,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },

  eduCard: {
    paddingBottom: 6,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },

  centerHeader: {
    alignItems: "center",
    marginBottom: 14,
  },

  centerText: {
    textAlign: "center",
  },

  link: {
    textDecoration: "none",
  },

  summaryBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  accentStrip: {
    height: 8,
    borderRadius: 10,
    marginBottom: 12,
  },

  timelineItem: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftStyle: "solid",
  },

  // Hanging indent bullet styles
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },

  bulletMarker: {
    width: 12,
    fontSize: 9.3,
    lineHeight: 1.5,
    marginTop: 0,
  },

  bulletContent: {
    flex: 1,
    fontSize: 9.3,
    lineHeight: 1.5,
    textAlign: "justify",
  },

  naukriHeader: {
    backgroundColor: "#E6F1FB",
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "#378ADD",
    marginBottom: 12,
  },

  naukriName: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0C447C",
  },

  naukriRole: {
    fontSize: 11,
    color: "#185FA5",
    marginTop: 3,
    marginBottom: 8,
    lineHeight: 1.35,
  },

  naukriContactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  naukriContactText: {
    fontSize: 9,
    color: "#185FA5",
    marginRight: 8,
    marginBottom: 4,
    lineHeight: 1.35,
  },

  naukriHighlightBox: {
    backgroundColor: "#E6F1FB",
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: "#378ADD",
    padding: 10,
    marginBottom: 8,
  },

  naukriPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },

  naukriPill: {
    fontSize: 8.2,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: "#E6F1FB",
    color: "#0C447C",
    borderWidth: 0.7,
    borderStyle: "solid",
    borderColor: "#B5D4F4",
  },

  naukriMetricWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
    marginBottom: 5,
  },

  naukriMetric: {
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: "#EAF3DE",
    color: "#27500A",
  },

  naukriInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  naukriInfoCard: {
    width: "48%",
    marginBottom: 8,
  },

  naukriTipBox: {
    backgroundColor: "#FAEEDA",
    borderWidth: 0.7,
    borderStyle: "solid",
    borderColor: "#FAC775",
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
});

export function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function cleanText(value?: string | null) {
  return String(value ?? "").trim();
}

export function hasText(value?: string | null) {
  return cleanText(value).length > 0;
}

export function nonEmptyArray(values?: (string | undefined | null)[] | null): string[] {
  return safeArray(values).map((v) => cleanText(v)).filter(Boolean);
}

export function hasContact(data: ResumeData) {
  return hasText(data.phone) || hasText(data.email) || hasText(data.linkedin) || hasText(data.address);
}

export function hasSummary(data: ResumeData) {
  return hasText(data.summary);
}

export function hasSkills(data: ResumeData) {
  return nonEmptyArray(data.skills).length > 0;
}

export function hasLanguages(data: ResumeData) {
  return nonEmptyArray((data as any).languages).length > 0;
}

export function hasExperience(data: ResumeData) {
  return safeArray((data as any).experience).some((exp: any) => {
    const points = nonEmptyArray(exp?.bullets?.length ? exp.bullets : exp?.points);
    return (
      hasText(exp?.jobTitle) ||
      hasText(exp?.company) ||
      hasText(exp?.startDate) ||
      hasText(exp?.endDate) ||
      hasText(exp?.start) ||
      hasText(exp?.end) ||
      points.length > 0
    );
  });
}

export function hasEducation(data: ResumeData) {
  return safeArray((data as any).education).some((edu: any) => {
    const highlights = nonEmptyArray(edu?.highlights);
    return (
      hasText(edu?.degree) ||
      hasText(edu?.institution) ||
      hasText(edu?.startYear) ||
      hasText(edu?.endYear) ||
      highlights.length > 0
    );
  });
}

export function hasProjects(data: ResumeData) {
  return safeArray((data as any).projects).some((project: any) => {
    const bullets = nonEmptyArray(project?.bullets);
    return hasText(project?.name) || hasText(project?.techStack) || hasText(project?.link) || bullets.length > 0;
  });
}

export function hasCertifications(data: ResumeData) {
  return safeArray((data as any).certifications).some((cert: any) => {
    if (typeof cert === "string") return hasText(cert);
    return hasText(cert?.name) || hasText(cert?.issuer);
  });
}

export function hasExtraProfileInfo(data: ResumeData) {
  return (
    hasText((data as any).currentCtc) ||
    hasText((data as any).expectedCtc) ||
    hasText((data as any).noticePeriod) ||
    hasText((data as any).preferredLocation) ||
    hasText((data as any).totalExperience) ||
    hasText((data as any).relevantExperience)
  );
}

export function getThemePalette(theme?: string): ThemePalette {
  switch (theme) {
    case "slate":
      return {
        primary: "#334155",
        secondary: "#475569",
        accent: "#0F172A",
        text: "#111827",
        subText: "#475569",
        border: "#CBD5E1",
        soft: "#F8FAFC",
        sidebarBg: "#1E293B",
        sidebarText: "#F8FAFC",
        chipBg: "#E2E8F0",
        chipText: "#0F172A",
      };
    case "emerald":
      return {
        primary: "#047857",
        secondary: "#065F46",
        accent: "#10B981",
        text: "#111827",
        subText: "#4B5563",
        border: "#D1FAE5",
        soft: "#ECFDF5",
        sidebarBg: "#064E3B",
        sidebarText: "#ECFDF5",
        chipBg: "#D1FAE5",
        chipText: "#065F46",
      };
    case "purple":
      return {
        primary: "#6D28D9",
        secondary: "#5B21B6",
        accent: "#8B5CF6",
        text: "#111827",
        subText: "#4B5563",
        border: "#E9D5FF",
        soft: "#FAF5FF",
        sidebarBg: "#4C1D95",
        sidebarText: "#FAF5FF",
        chipBg: "#EDE9FE",
        chipText: "#5B21B6",
      };
    case "rose":
      return {
        primary: "#BE185D",
        secondary: "#9D174D",
        accent: "#F43F5E",
        text: "#111827",
        subText: "#4B5563",
        border: "#FBCFE8",
        soft: "#FFF1F2",
        sidebarBg: "#881337",
        sidebarText: "#FFF1F2",
        chipBg: "#FFE4E6",
        chipText: "#9D174D",
      };
    case "teal":
      return {
        primary: "#0D9488",
        secondary: "#0F766E",
        accent: "#2DD4BF",
        text: "#111827",
        subText: "#4B5563",
        border: "#CCFBF1",
        soft: "#F0FDFA",
        sidebarBg: "#134E4A",
        sidebarText: "#F0FDFA",
        chipBg: "#CCFBF1",
        chipText: "#134E4A",
      };
    case "amber":
      return {
        primary: "#B45309",
        secondary: "#92400E",
        accent: "#F59E0B",
        text: "#111827",
        subText: "#4B5563",
        border: "#FDE68A",
        soft: "#FFFBEB",
        sidebarBg: "#78350F",
        sidebarText: "#FFFBEB",
        chipBg: "#FEF3C7",
        chipText: "#92400E",
      };
    case "blue":
    default:
      return {
        primary: "#2563EB",
        secondary: "#1D4ED8",
        accent: "#60A5FA",
        text: "#111827",
        subText: "#4B5563",
        border: "#DBEAFE",
        soft: "#EFF6FF",
        sidebarBg: "#1E3A8A",
        sidebarText: "#F8FAFC",
        chipBg: "#DBEAFE",
        chipText: "#1E3A8A",
      };
  }
}

export function getFontFamily(fontFamily?: string) {
  const normalizedMap: Record<string, string> = {
    Helvetica: "Helvetica",
    "Times-Roman": "Times-Roman",
    Courier: "Courier",
    Roboto: "Roboto",
    Lato: "Lato",
    Montserrat: "Montserrat",
    OpenSans: "Open Sans",
    "Open Sans": "Open Sans",
    SourceSansPro: "Source Sans Pro",
    "Source Sans Pro": "Source Sans Pro",
    Merriweather: "Merriweather",
    Nunito: "Nunito",
  };

  return normalizedMap[fontFamily || ""] || "Helvetica";
}

export function getBasePageStyle(data: ResumeData, palette: ThemePalette) {
  return {
    ...styles.page,
    fontFamily: getFontFamily((data as any).fontFamily),
    fontSize: (data as any).fontSize || 10.5,
    color: palette.text,
  };
}