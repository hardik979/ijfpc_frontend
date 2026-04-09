import React from "react";
import { Document, Page, View, Text, Image, Link } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume";
import { getBasePageStyle } from "@/lib/resumePdfStyles";
import GhatgptTemplate from "./templates/chatGPT";
import ClaudeTemplate from "./templates/claude";
import GeminiResumePdf from "./templates/gemini";
import GlockResumePdf from "./templates/glock";
import FlowCVTemplate from "./templates/flow"

type ThemePalette = {
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

type ResumeTemplateComponent = React.ComponentType<{ data: ResumeData }>;
/* -------------------- HELPERS -------------------- */

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function cleanText(value?: string | null) {
  return String(value ?? "").trim();
}

function hasText(value?: string | null) {
  return cleanText(value).length > 0;
}

function nonEmptyArray(values?: (string | undefined | null)[] | null): string[] {
  return safeArray(values).map((v) => cleanText(v)).filter(Boolean);
}

function normalizeParagraph(value?: string | null) {
  return cleanText(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function hasContact(data: ResumeData) {
  return (
    hasText(data.phone) ||
    hasText(data.email) ||
    hasText(data.linkedin) ||
    hasText(data.address)
  );
}

function hasSummary(data: ResumeData) {
  return hasText(data.summary);
}

function hasSkills(data: ResumeData) {
  return nonEmptyArray((data as any).skills).length > 0;
}

function hasLanguages(data: ResumeData) {
  return nonEmptyArray((data as any).languages).length > 0;
}



function hasExperience(data: ResumeData) {
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

function hasEducation(data: ResumeData) {
  return safeArray((data as any).education).some((edu: any) => {
    const highlights = nonEmptyArray(edu?.highlights);
    return (
      hasText(edu?.degree) ||
      hasText(edu?.institution) ||
      hasText(edu?.startYear) ||
      hasText(edu?.endYear) ||
      edu?.currentlyStudying ||
      highlights.length > 0
    );
  });
}

function hasProjects(data: ResumeData) {
  return safeArray((data as any).projects).some((project: any) => {
    const bullets = nonEmptyArray(project?.bullets);
    return (
      hasText(project?.name) ||
      hasText(project?.techStack) ||
      hasText(project?.link) ||
      bullets.length > 0
    );
  });
}

function hasCertifications(data: ResumeData) {
  return safeArray((data as any).certifications).some((cert: any) => {
    if (typeof cert === "string") return hasText(cert);
    return hasText(cert?.name) || hasText(cert?.issuer);
  });
}

function hasReferences(data: ResumeData) {
  return safeArray((data as any).references).some((ref: any) => {
    if (typeof ref === "string") return hasText(ref);
    return (
      hasText(ref?.name) ||
      hasText(ref?.designation) ||
      hasText(ref?.role) ||
      hasText(ref?.company) ||
      hasText(ref?.email) ||
      hasText(ref?.phone)
    );
  });
}

function getThemePalette(theme?: string): ThemePalette {
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
    case "amber":
      return {
        primary: "#A16207",
        secondary: "#854D0E",
        accent: "#EAB308",
        text: "#111827",
        subText: "#4B5563",
        border: "#FDE68A",
        soft: "#FFFBEB",
        sidebarBg: "#422006",
        sidebarText: "#FFFBEB",
        chipBg: "#FEF3C7",
        chipText: "#854D0E",
      };
    case "brown":
      return {
        primary: "#6B4F3B",
        secondary: "#8B6B4C",
        accent: "#C6A27C",
        text: "#1F2937",
        subText: "#6B7280",
        border: "#E5D5C5",
        soft: "#FAF6F1",
        sidebarBg: "#4B3628",
        sidebarText: "#FFF8F1",
        chipBg: "#EFE3D5",
        chipText: "#5C4033",
      };
    case "blackGold":
      return {
        primary: "#111111",
        secondary: "#2A2A2A",
        accent: "#D4AF37",
        text: "#111827",
        subText: "#4B5563",
        border: "#E5C76B",
        soft: "#FFF9E8",
        sidebarBg: "#111111",
        sidebarText: "#F9E7A6",
        chipBg: "#FFF4CC",
        chipText: "#6B4E00",
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

/* -------------------- REUSABLE UI -------------------- */

function sectionTitle(title: string, palette: ThemePalette, light = false) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.1,
        textTransform: "uppercase",
        color: light ? palette.sidebarText : palette.primary,
        marginBottom: 7,
      }}
    >
      {title}
    </Text>
  );
}

function Section({
  title,
  children,
  palette,
  light = false,
}: {
  title: string;
  children: React.ReactNode;
  palette: ThemePalette;
  light?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      {sectionTitle(title, palette, light)}
      {children}
    </View>
  );
}

function BulletItem({ text, color = "#111827" }: { text: string; color?: string }) {
  if (!hasText(text)) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 4,
      }}
    >
      <Text
        style={{
          width: 10,
          fontSize: 9.5,
          color,
          lineHeight: 1.5,
        }}
      >
        •
      </Text>

      <Text
        style={{
          flex: 1,
          fontSize: 9.15,
          color,
          lineHeight: 1.5,
          textAlign: "left",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function ProfilePhoto({
  data,
  size = 82,
  centered = false,
  borderColor = "#E5E7EB",
}: {
  data: ResumeData;
  size?: number;
  centered?: boolean;
  borderColor?: string;
}) {
  const profileImage = (data as any)?.profileImage;
  if (!profileImage) return null;

  return (
    <View
      style={{
        alignItems: centered ? "center" : "flex-start",
        marginBottom: 12,
      }}
    >
      <Image
        src={profileImage}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          objectFit: "cover",
          borderWidth: 2,
          borderColor,
        }}
      />
    </View>
  );
}

function ContactBlock({
  data,
  palette,
  light = false,
  compact = false,
}: {
  data: ResumeData;
  palette: ThemePalette;
  light?: boolean;
  compact?: boolean;
}) {
  const color = light ? palette.sidebarText : palette.text;

  if (!hasContact(data)) return null;

  return (
    <View>
      {hasText(data.phone) && (
        <Text
          style={{
            fontSize: compact ? 8 : 9,
            color,
            marginBottom: compact ? 2 : 4,
            lineHeight: 1.3,
          }}
        >
          {cleanText(data.phone)}
        </Text>
      )}

      {hasText(data.email) && (
        <Text
          style={{
            fontSize: compact ? 8 : 9,
            color,
            marginBottom: compact ? 2 : 4,
            lineHeight: 1.3,
          }}
        >
          {cleanText(data.email)}
        </Text>
      )}

      {hasText(data.linkedin) && (
        <Link
          src={data.linkedin!}
          style={{
            fontSize: compact ? 8 : 9,
            color,
            marginBottom: compact ? 2 : 4,
            textDecoration: "none",
            lineHeight: 1.3,
          }}
        >
          {cleanText(data.linkedin)}
        </Link>
      )}

      {hasText(data.address) && (
        <Text
          style={{
            fontSize: compact ? 8 : 9,
            color,
            lineHeight: 1.3,
          }}
        >
          {cleanText(data.address)}
        </Text>
      )}
    </View>
  );
}

function SummaryBlock({
  data,
  palette,
  boxed = false,
}: {
  data: ResumeData;
  palette: ThemePalette;
  boxed?: boolean;
}) {
  const summary = normalizeParagraph(data.summary);

  if (!summary) return null;

  return (
    <View
      style={
        boxed
          ? {
              backgroundColor: palette.soft,
              borderWidth: 1,
              borderColor: palette.border,
              paddingTop: 10,
              paddingBottom: 10,
              paddingHorizontal: 10,
              borderRadius: 4,
            }
          : {
              paddingRight: 2,
            }
      }
    >
      <Text
        wrap
        style={{
          fontSize: 9.3,
          color: palette.text,
          lineHeight: 1.55,
          textAlign: "justify",
        }}
      >
        {summary}
      </Text>
    </View>
  );
}

function SkillsBlock({
  data,
  palette,
  light = false,
  asBullets = false,
}: {
  data: ResumeData;
  palette: ThemePalette;
  light?: boolean;
  asBullets?: boolean;
}) {
  const skills = nonEmptyArray((data as any).skills);
  if (!skills.length) return null;
  const color = light ? palette.sidebarText : palette.text;

  if (asBullets) {
    return (
      <View>
        {skills.map((skill, index) => (
          <BulletItem key={`${skill}-${index}`} text={skill} color={color} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
      {skills.map((skill, index) => (
        <Text
          key={`${skill}-${index}`}
          style={{
            fontSize: 8.5,
            paddingVertical: 3,
            paddingHorizontal: 7,
            marginRight: 5,
            marginBottom: 5,
            backgroundColor: light ? "rgba(255,255,255,0.12)" : palette.chipBg,
            color: light ? palette.sidebarText : palette.chipText,
            borderRadius: 10,
          }}
        >
          {skill}
        </Text>
      ))}
    </View>
  );
}

function LanguagesBlock({
  data,
  palette,
  light = false,
}: {
  data: ResumeData;
  palette: ThemePalette;
  light?: boolean;
}) {
  const languages = nonEmptyArray((data as any).languages);
  if (!languages.length) return null;
  const color = light ? palette.sidebarText : palette.text;

  return (
    <View>
      {languages.map((lang, index) => (
        <BulletItem key={`${lang}-${index}`} text={lang} color={color} />
      ))}
    </View>
  );
}

function ExperienceBlock({ data, palette }: { data: ResumeData; palette: ThemePalette }) {
  const experience = safeArray((data as any).experience).filter((exp: any) => {
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

  if (!experience.length) return null;

  return (
    <View>
      {experience.map((exp: any, index: number) => {
        const points = nonEmptyArray(exp?.bullets?.length ? exp.bullets : exp?.points);
        const start = cleanText(exp?.startDate || exp?.start);
        const end = cleanText(exp?.endDate || exp?.end);
        const hasDuration = start || end;

        return (
          <View
            key={index}
            style={{
              marginBottom: 11,
              paddingBottom: 8,
              borderBottomWidth: index === experience.length - 1 ? 0 : 1,
              borderBottomColor: palette.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 2,
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{
                    fontSize: 10.6,
                    fontWeight: 700,
                    color: palette.primary,
                    lineHeight: 1.25,
                  }}
                >
                  {cleanText(exp?.jobTitle) || "Role"}
                </Text>

                {hasText(exp?.company) && (
                  <Text
                    style={{
                      fontSize: 9.1,
                      color: palette.text,
                      marginTop: 2,
                      lineHeight: 1.35,
                    }}
                  >
                    {cleanText(exp?.company)}
                  </Text>
                )}
              </View>

              {hasDuration && (
                <Text
                  style={{
                    fontSize: 8.4,
                    color: palette.subText,
                    textAlign: "right",
                    minWidth: 78,
                    lineHeight: 1.3,
                  }}
                >
                  {start}
                  {start || end ? " - " : ""}
                  {end || "Present"}
                </Text>
              )}
            </View>

            {points.map((point, i) => (
              <BulletItem key={i} text={point} color={palette.text} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function EducationBlock({ data, palette }: { data: ResumeData; palette: ThemePalette }) {
  const education = safeArray((data as any).education).filter((edu: any) => {
    const highlights = nonEmptyArray(edu?.highlights);
    return (
      hasText(edu?.degree) ||
      hasText(edu?.institution) ||
      hasText(edu?.startYear) ||
      hasText(edu?.endYear) ||
      edu?.currentlyStudying ||
      highlights.length > 0
    );
  });

  if (!education.length) return null;

  return (
    <View>
      {education.map((edu: any, index: number) => {
        const highlights = nonEmptyArray(edu?.highlights);
        const startYear = cleanText(edu?.startYear);
        const endYear = cleanText(edu?.endYear);
        const hasDuration = startYear || endYear || edu?.currentlyStudying;

        return (
          <View
            key={index}
            style={{
              marginBottom: 10,
              paddingBottom: 8,
              borderBottomWidth: index === education.length - 1 ? 0 : 1,
              borderBottomColor: palette.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 2,
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{
                    fontSize: 10.2,
                    fontWeight: 700,
                    color: palette.primary,
                    lineHeight: 1.25,
                  }}
                >
                  {cleanText(edu?.degree) || "Degree"}
                </Text>

                {hasText(edu?.institution) && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: palette.text,
                      marginTop: 2,
                      lineHeight: 1.35,
                    }}
                  >
                    {cleanText(edu?.institution)}
                  </Text>
                )}
              </View>

              {hasDuration && (
                <Text
                  style={{
                    fontSize: 8.4,
                    color: palette.subText,
                    textAlign: "right",
                    minWidth: 68,
                    lineHeight: 1.3,
                  }}
                >
                  {startYear}
                  {startYear || endYear || edu?.currentlyStudying ? " - " : ""}
                  {endYear || (edu?.currentlyStudying ? "Present" : "")}
                </Text>
              )}
            </View>

            {highlights.map((highlight, i) => (
              <BulletItem key={i} text={highlight} color={palette.text} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function ProjectsBlock({ data, palette }: { data: ResumeData; palette: ThemePalette }) {
  const projects = safeArray((data as any).projects).filter((project: any) => {
    const bullets = nonEmptyArray(project?.bullets);
    return (
      hasText(project?.name) ||
      hasText(project?.techStack) ||
      hasText(project?.link) ||
      bullets.length > 0
    );
  });

  if (!projects.length) return null;

  return (
    <View>
      {projects.map((project: any, index: number) => (
        <View
          key={index}
          style={{
            marginBottom: 10,
            paddingBottom: 8,
            borderBottomWidth: index === projects.length - 1 ? 0 : 1,
            borderBottomColor: palette.border,
          }}
        >
          <Text
            style={{
              fontSize: 10.4,
              fontWeight: 700,
              color: palette.primary,
              lineHeight: 1.25,
            }}
          >
            {cleanText(project?.name) || "Project"}
          </Text>

          {hasText(project?.techStack) && (
            <Text
              style={{
                fontSize: 8.8,
                color: palette.subText,
                marginTop: 2,
                lineHeight: 1.35,
              }}
            >
              {cleanText(project.techStack)}
            </Text>
          )}

          {hasText(project?.link) && (
            <Link
              src={project.link!}
              style={{
                fontSize: 8.7,
                color: palette.secondary,
                marginTop: 2,
                textDecoration: "none",
              }}
            >
              {cleanText(project.link)}
            </Link>
          )}

          {nonEmptyArray(project?.bullets).map((bullet, i) => (
            <BulletItem key={i} text={bullet} color={palette.text} />
          ))}
        </View>
      ))}
    </View>
  );
}

function CertificationsBlock({ data, palette }: { data: ResumeData; palette: ThemePalette }) {
  const certs = safeArray((data as any).certifications);
  if (!certs.length) return null;

  return (
    <View>
      {certs.map((cert: any, index: number) => {
        const line =
          typeof cert === "string"
            ? cleanText(cert)
            : [cleanText(cert?.name), cleanText(cert?.issuer)].filter(Boolean).join(" | ");

        if (!line) return null;
        return <BulletItem key={index} text={line} color={palette.text} />;
      })}
    </View>
  );
}

function ReferencesBlock({ data, palette }: { data: ResumeData; palette: ThemePalette }) {
  const references = safeArray((data as any).references);
  if (!references.length) return null;

  return (
    <View>
      {references.map((ref: any, index: number) => {
        const line =
          typeof ref === "string"
            ? cleanText(ref)
            : [cleanText(ref?.name), cleanText(ref?.designation || ref?.role), cleanText(ref?.company)]
                .filter(Boolean)
                .join(" | ");

        if (!line) return null;

        return (
          <View key={index} style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 9, color: palette.text, fontWeight: 700 }}>{line}</Text>
            {hasText(ref?.phone) && <Text style={{ fontSize: 8.5, color: palette.subText }}>{cleanText(ref.phone)}</Text>}
            {hasText(ref?.email) && <Text style={{ fontSize: 8.5, color: palette.subText }}>{cleanText(ref.email)}</Text>}
          </View>
        );
      })}
    </View>
  );
}

function createPage(
  data: ResumeData,
  palette: ThemePalette,
  children: React.ReactNode,
  extraStyle?: Record<string, unknown>
) {
  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), ...(extraStyle || {}) }}>
        {children}
      </Page>
    </Document>
  );
}

/* -------------------- UPLOADED PDF STYLE TEMPLATES -------------------- */

export const BrownMinimalDigitalMarketerTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("brown");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "34%", paddingRight: 16 }}>
        <ProfilePhoto data={data} size={86} borderColor={palette.border} />
        <Text style={{ fontSize: 24, fontWeight: 700, color: palette.primary, lineHeight: 1.05 }}>
          {(cleanText(data.fullName) || "RACHELLE\nBEAUDRY").toUpperCase()}
        </Text>
        <Text style={{ fontSize: 11, color: palette.secondary, marginTop: 6, marginBottom: 16 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "Digital Marketer"}
        </Text>

        {hasSummary(data) && (
          <Section title="Profile" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills" palette={palette}>
            <SkillsBlock data={data} palette={palette} asBullets />
          </Section>
        )}

        {hasContact(data) && (
          <Section title="Contact" palette={palette}>
            <ContactBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "66%", paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: palette.border }}>
        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasProjects(data) && (
          <Section title="Projects" palette={palette}>
            <ProjectsBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const ITManagerCVTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("slate");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "34%", backgroundColor: palette.soft, padding: 16 }}>
        <ProfilePhoto data={data} size={86} borderColor={palette.border} />
        <Text style={{ fontSize: 21, fontWeight: 700, color: palette.primary }}>
          {cleanText(data.fullName) || "CATRINE ZIV"}
        </Text>
        <Text style={{ fontSize: 10.5, color: palette.subText, marginBottom: 14 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "IT PROJECT MANAGER"}
        </Text>

        {hasSummary(data) && (
          <Section title="Profile" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills" palette={palette}>
            <SkillsBlock data={data} palette={palette} asBullets />
          </Section>
        )}

        {hasCertifications(data) && (
          <Section title="Awards / Certifications" palette={palette}>
            <CertificationsBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "66%", paddingLeft: 18 }}>
        {hasContact(data) && (
          <View style={{ marginBottom: 14 }}>
            <ContactBlock data={data} palette={palette} />
          </View>
        )}

        {hasEducation(data) && (
          <Section title="Educational History" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Work Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const DarkBlueWhiteMinimalistEducationTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("blue");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "36%", backgroundColor: palette.sidebarBg, padding: 18 }}>
        <ProfilePhoto data={data} size={84} borderColor="rgba(255,255,255,0.2)" />
        <Text style={{ fontSize: 22, fontWeight: 700, color: palette.sidebarText }}>
          {cleanText(data.fullName) || "ADELINE PALMERSTON"}
        </Text>
        <Text style={{ fontSize: 10.5, color: "#DCE8FF", marginBottom: 16 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "GRAPHIC DESIGNER"}
        </Text>

        {hasContact(data) && (
          <Section title="Contact" palette={palette} light>
            <ContactBlock data={data} palette={palette} light />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills" palette={palette} light>
            <SkillsBlock data={data} palette={palette} light asBullets />
          </Section>
        )}

        {hasLanguages(data) && (
          <Section title="Languages" palette={palette} light>
            <LanguagesBlock data={data} palette={palette} light />
          </Section>
        )}

        {hasReferences(data) && (
          <Section title="Reference" palette={palette} light>
            <ReferencesBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "64%", paddingLeft: 18 }}>
        {hasSummary(data) && (
          <Section title="About Me" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasCertifications(data) && (
          <Section title="Certifications" palette={palette}>
            <CertificationsBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const WhiteBlackColorBlocksWebDeveloperTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("slate");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "31%", backgroundColor: "#111111", padding: 18 }}>
        <ProfilePhoto data={data} size={84} borderColor="rgba(255,255,255,0.2)" />
        <Text style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>
          {cleanText(data.fullName) || "PRATEEK BAJPAI"}
        </Text>
        <Text style={{ fontSize: 10.5, color: "#D1D5DB", marginBottom: 14 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "APPLICATION SUPPORT ENGINEER"}
        </Text>

        {hasSkills(data) && (
          <Section title="Skills" palette={palette} light>
            <SkillsBlock data={data} palette={palette} light asBullets />
          </Section>
        )}

        {hasContact(data) && (
          <Section title="Contact" palette={palette} light>
            <ContactBlock data={data} palette={palette} light />
          </Section>
        )}

        {hasLanguages(data) && (
          <Section title="Language" palette={palette} light>
            <LanguagesBlock data={data} palette={palette} light />
          </Section>
        )}
      </View>

      <View style={{ width: "69%", paddingLeft: 18 }}>
        {hasSummary(data) && (
          <Section title="Profile" palette={palette}>
            <SummaryBlock data={data} palette={palette} boxed />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const LightBlueProfessionalResumeTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("blue");

  return createPage(
    data,
    palette,
    <View>
      <View
        style={{
          backgroundColor: "#6F94C6",
          borderRadius: 18,
          padding: 18,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {(data as any).profileImage ? (
          <Image
            src={(data as any).profileImage}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              objectFit: "cover",
              marginRight: 14,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          />
        ) : null}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>
            {cleanText(data.fullName) || "SNEHA GOSWAMI"}
          </Text>
          <Text style={{ fontSize: 11, color: "#EFF6FF", marginTop: 4 }}>
            {cleanText((data as any).role || (data as any).jobRole) || "Application Support Engineer"}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row" }}>
        <View style={{ width: "34%", paddingRight: 16 }}>
          {hasContact(data) && (
            <Section title="Contact Details" palette={palette}>
              <ContactBlock data={data} palette={palette} />
            </Section>
          )}

          {hasSkills(data) && (
            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} asBullets />
            </Section>
          )}

          {hasLanguages(data) && (
            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>
          )}

          {hasEducation(data) && (
            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          )}
        </View>

        <View style={{ width: "66%", paddingLeft: 16 }}>
          {hasSummary(data) && (
            <Section title="Professional Experience" palette={palette}>
              <SummaryBlock data={data} palette={palette} />
            </Section>
          )}

          {hasExperience(data) && (
            <Section title="Work Experience" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>
          )}
        </View>
      </View>
    </View>
  );
};

export const BrownBlackSocialMediaManagerTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("brown");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "38%", backgroundColor: palette.soft, padding: 20 }}>
        <ProfilePhoto data={data} size={84} borderColor={palette.border} />
        <Text style={{ fontSize: 21, fontWeight: 700, color: palette.primary }}>
          {cleanText(data.fullName) || "ADELINE PALMERSTON"}
        </Text>
        <Text style={{ fontSize: 11, color: palette.secondary, marginBottom: 14 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "Graphic Designer & Social Media Manager"}
        </Text>

        {hasSummary(data) && (
          <Section title="Personal Info" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasContact(data) && (
          <Section title="Contact" palette={palette}>
            <ContactBlock data={data} palette={palette} />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills" palette={palette}>
            <SkillsBlock data={data} palette={palette} asBullets />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "62%", paddingLeft: 20 }}>
        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasProjects(data) && (
          <Section title="Projects" palette={palette}>
            <ProjectsBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const BrownModernGraphicDesignerTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("brown");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "36%", paddingRight: 16 }}>
        <ProfilePhoto data={data} size={84} borderColor={palette.border} />
        <Text style={{ fontSize: 22, fontWeight: 700, color: palette.primary }}>
          {cleanText(data.fullName) || "MITALI JATAV"}
        </Text>
        <Text style={{ fontSize: 11, color: palette.secondary, marginBottom: 14 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "GRAPHIC DESIGNER"}
        </Text>

        {hasContact(data) && (
          <Section title="Contact" palette={palette}>
            <ContactBlock data={data} palette={palette} />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills / Tools" palette={palette}>
            <SkillsBlock data={data} palette={palette} asBullets />
          </Section>
        )}

        {hasReferences(data) && (
          <Section title="Reference" palette={palette}>
            <ReferencesBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "64%", paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: palette.border }}>
        {hasSummary(data) && (
          <Section title="Personal Info" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const BeigeDarkGrayMinimalistWebDeveloperTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("slate");

  return createPage(
    data,
    palette,
    <View>
      <ProfilePhoto data={data} size={84} borderColor={palette.border} />
      <Text style={{ fontSize: 23, fontWeight: 700, color: palette.primary }}>
        {cleanText(data.fullName) || "ANSHUL PATEL"}
      </Text>
      <Text style={{ fontSize: 11, color: palette.subText, marginBottom: 14 }}>
        {cleanText((data as any).role || (data as any).jobRole) || "DevOps & Production Support Engineer"}
      </Text>

      <View style={{ flexDirection: "row" }}>
        <View style={{ width: "36%", paddingRight: 16 }}>
          {hasContact(data) && (
            <Section title="My Contact" palette={palette}>
              <ContactBlock data={data} palette={palette} />
            </Section>
          )}

          {hasSkills(data) && (
            <Section title="Technical Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} asBullets />
            </Section>
          )}

          {hasEducation(data) && (
            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          )}

          {hasLanguages(data) && (
            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>
          )}
        </View>

        <View style={{ width: "64%", paddingLeft: 16 }}>
          {hasSummary(data) && (
            <Section title="Profile Summary" palette={palette}>
              <SummaryBlock data={data} palette={palette} boxed />
            </Section>
          )}

          {hasExperience(data) && (
            <Section title="Work Experiences" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>
          )}
        </View>
      </View>
    </View>
  );
};

export const BlackYellowModernProfessionalTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("amber");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "33%", backgroundColor: "#111111", padding: 18 }}>
        <ProfilePhoto data={data} size={84} borderColor="rgba(255,255,255,0.18)" />
        <Text style={{ fontSize: 23, fontWeight: 700, color: palette.accent }}>
          {cleanText(data.fullName) || "OLIVIA WILSON"}
        </Text>
        <Text style={{ fontSize: 10.5, color: "#FDE68A", marginBottom: 15 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "MARKETING MANAGER"}
        </Text>

        {hasContact(data) && (
          <Section title="Contact" palette={palette} light>
            <ContactBlock data={data} palette={palette} light />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills" palette={palette} light>
            <SkillsBlock data={data} palette={palette} light asBullets />
          </Section>
        )}

        {hasLanguages(data) && (
          <Section title="Languages" palette={palette} light>
            <LanguagesBlock data={data} palette={palette} light />
          </Section>
        )}

        {hasReferences(data) && (
          <Section title="Reference" palette={palette} light>
            <ReferencesBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "67%", paddingLeft: 18 }}>
        {hasSummary(data) && (
          <Section title="Profile" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Work Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const YellowWhiteModernProfessionalSkillsTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("amber");

  return createPage(
    data,
    palette,
    <View style={{ padding: 28 }}>

      {/* HEADER SECTION */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        {/* PROFILE IMAGE */}
        {(data as any)?.profileImage && (
          <Image
            src={(data as any).profileImage}
            style={{
              width: 85,
              height: 85,
              borderRadius: 50,
              objectFit: "cover",
              marginRight: 20,
              borderWidth: 2,
              borderColor: palette.accent,
            }}
          />
        )}

        {/* NAME + ROLE + CONTACT */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: palette.accent,
              marginBottom: 4,
            }}
          >
            {data.fullName}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#4B5563",
              marginBottom: 10,
            }}
          >
            {data.jobRole || data.domain}
          </Text>

          {hasContact(data) && (
            <ContactBlock
              data={data}
              palette={palette}
              compact
            />
          )}
        </View>
      </View>

      {/* DIVIDER */}
      <View
        style={{
          height: 2,
          backgroundColor: palette.accent,
          marginBottom: 18,
        }}
      />

      {/* MAIN CONTENT */}
      <View style={{ flexDirection: "row" }}>

        {/* LEFT COLUMN */}
        <View
          style={{
            width: "65%",
            paddingRight: 16,
          }}
        >
          {hasSummary(data) && (
            <Section title="Professional Profile" palette={palette}>
              <SummaryBlock data={data} palette={palette} />
            </Section>
          )}

          {hasExperience(data) && (
            <Section title="Work Experience" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>
          )}
        </View>

        {/* RIGHT COLUMN */}
        <View
          style={{
            width: "35%",
            paddingLeft: 16,
            borderLeftWidth: 1,
            borderLeftColor: "#E5E7EB",
          }}
        >
          {hasSkills(data) && (
            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} asBullets />
            </Section>
          )}

          {hasLanguages(data) && (
            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>
          )}
        </View>

      </View>
    </View>
  );
};

export const ProfessionalCVResumeTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("slate");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "64%", paddingRight: 14 }}>
        <ProfilePhoto data={data} size={84} borderColor={palette.border} />
        <Text style={{ fontSize: 24, fontWeight: 700, color: palette.primary }}>
          {cleanText(data.fullName) || "PHYLLIS SCHWAIGER"}
        </Text>
        <Text style={{ fontSize: 11, color: palette.subText, marginBottom: 14 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "Graphic Designer"}
        </Text>

        {hasSummary(data) && (
          <Section title="Profile" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Work Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "36%", paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: palette.border }}>
        {hasContact(data) && (
          <Section title="Contact Me" palette={palette}>
            <ContactBlock data={data} palette={palette} />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Expertise Skill" palette={palette}>
            <SkillsBlock data={data} palette={palette} asBullets />
          </Section>
        )}

        {hasLanguages(data) && (
          <Section title="Language" palette={palette}>
            <LanguagesBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const CreamMinimalistProfessionalCVTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("brown");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "36%", backgroundColor: "#F7F1E8", padding: 18 }}>
        <ProfilePhoto data={data} size={84} borderColor={palette.border} />
        <Text style={{ fontSize: 22, fontWeight: 700, color: palette.primary }}>
          {cleanText(data.fullName) || "BARTHOLOMEW HENDERSON"}
        </Text>
        <Text style={{ fontSize: 10.5, color: palette.subText, marginBottom: 15 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "Creative Designer"}
        </Text>

        {hasContact(data) && (
          <Section title="Contact Me" palette={palette}>
            <ContactBlock data={data} palette={palette} />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Expertise Skill" palette={palette}>
            <SkillsBlock data={data} palette={palette} asBullets />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
      </View>

      <View style={{ width: "64%", paddingLeft: 18 }}>
        {hasSummary(data) && (
          <Section title="About Me" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Work Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}

        {hasProjects(data) && (
          <Section title="Projects" palette={palette}>
            <ProjectsBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

export const BlackGoldFuturisticResumeTemplate: ResumeTemplateComponent = ({ data }) => {
  const palette = getThemePalette("blackGold");

  return createPage(
    data,
    palette,
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: "34%", backgroundColor: "#111111", padding: 18 }}>
        <ProfilePhoto data={data} size={86} borderColor="rgba(255,255,255,0.15)" />
        <Text style={{ fontSize: 22, fontWeight: 700, color: palette.accent }}>
          {cleanText(data.fullName) || "ROSA MARIA AGUADO"}
        </Text>
        <Text style={{ fontSize: 10.5, color: "#F8E7A6", marginBottom: 14 }}>
          {cleanText((data as any).role || (data as any).jobRole) || "MARKETING EXECUTIVE"}
        </Text>

        {hasContact(data) && (
          <Section title="Contact" palette={palette} light>
            <ContactBlock data={data} palette={palette} light />
          </Section>
        )}

        {hasSkills(data) && (
          <Section title="Skills" palette={palette} light>
            <SkillsBlock data={data} palette={palette} light asBullets />
          </Section>
        )}

        {hasLanguages(data) && (
          <Section title="Languages" palette={palette} light>
            <LanguagesBlock data={data} palette={palette} light />
          </Section>
        )}
      </View>

      <View style={{ width: "66%", paddingLeft: 18 }}>
        {hasSummary(data) && (
          <Section title="Profile" palette={palette}>
            <SummaryBlock data={data} palette={palette} boxed />
          </Section>
        )}

        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}

        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}
      </View>
    </View>
  );
};

/* -------------------- REGISTRY -------------------- */

export type UploadedPdfTemplateKey =
  | "brownMinimalDigitalMarketer"
  | "itManagerCv"
  | "darkBlueWhiteMinimalistEducation"
  | "whiteBlackColorBlocksWebDeveloper"
  | "lightBlueProfessionalResume"
  | "brownBlackSocialMediaManager"
  | "brownModernGraphicDesigner"
  | "beigeDarkGrayMinimalistWebDeveloper"
  | "blackYellowModernProfessional"
  | "yellowWhiteModernProfessionalSkills"
  | "professionalCvResume"
  | "creamMinimalistProfessionalCv"
  | "blackGoldFuturisticResume"
  | "ghatgptTemplate"
  | "claudeTemplate"
  | "geminiResumePdf"
  | "glockResumePdf"
  | "flowCVTemplate"

export const uploadedPdfResumeTemplates: Record<UploadedPdfTemplateKey, ResumeTemplateComponent> = {
  brownMinimalDigitalMarketer: BrownMinimalDigitalMarketerTemplate,
  itManagerCv: ITManagerCVTemplate,
  darkBlueWhiteMinimalistEducation: DarkBlueWhiteMinimalistEducationTemplate,
  whiteBlackColorBlocksWebDeveloper: WhiteBlackColorBlocksWebDeveloperTemplate,
  lightBlueProfessionalResume: LightBlueProfessionalResumeTemplate,
  brownBlackSocialMediaManager: BrownBlackSocialMediaManagerTemplate,
  brownModernGraphicDesigner: BrownModernGraphicDesignerTemplate,
  beigeDarkGrayMinimalistWebDeveloper: BeigeDarkGrayMinimalistWebDeveloperTemplate,
  blackYellowModernProfessional: BlackYellowModernProfessionalTemplate,
  yellowWhiteModernProfessionalSkills: YellowWhiteModernProfessionalSkillsTemplate,
  professionalCvResume: ProfessionalCVResumeTemplate,
  creamMinimalistProfessionalCv: CreamMinimalistProfessionalCVTemplate,
  blackGoldFuturisticResume: BlackGoldFuturisticResumeTemplate,
  ghatgptTemplate: GhatgptTemplate,
  claudeTemplate : ClaudeTemplate,
  geminiResumePdf:GeminiResumePdf,
  glockResumePdf:GlockResumePdf,
  flowCVTemplate : FlowCVTemplate
};

export const uploadedPdfTemplateOptions = [
  { key: "brownMinimalDigitalMarketer", label: "Brown Minimal Digital Marketer" },
  { key: "itManagerCv", label: "IT Manager CV" },
  { key: "darkBlueWhiteMinimalistEducation", label: "Dark Blue & White Minimalist Education" },
  { key: "whiteBlackColorBlocksWebDeveloper", label: "White & Black Color Blocks Web Developer" },
  { key: "lightBlueProfessionalResume", label: "Light Blue Professional Resume" },
  { key: "brownBlackSocialMediaManager", label: "Brown & Black Social Media Manager" },
  { key: "brownModernGraphicDesigner", label: "Brown Modern Graphic Designer" },
  { key: "beigeDarkGrayMinimalistWebDeveloper", label: "Beige Dark Gray Minimalist Web Developer" },
  { key: "blackYellowModernProfessional", label: "Black Yellow Modern Professional" },
  { key: "yellowWhiteModernProfessionalSkills", label: "Yellow & White Modern Professional Skills" },
  { key: "professionalCvResume", label: "Professional CV Resume" },
  { key: "creamMinimalistProfessionalCv", label: "Cream Minimalist Professional CV" },
  { key: "blackGoldFuturisticResume", label: "Black & Gold Futuristic Resume" },
  { key: "ghatgptTemplate", label: "ChatGPT Resume Template" },
  { key: "claudeTemplate", label: "Claude Resume Template" },
   { key: "geminiResumePdf", label: "gemini Resume Template" },
   { key: "glockResumePdf", label: "grock Resume Template" },
   { key: "flowCVTemplate", label: "flow Resume Template" },
] as const;

export function renderUploadedPdfTemplate(key: UploadedPdfTemplateKey, data: ResumeData) {
  const Template = uploadedPdfResumeTemplates[key] ?? BrownMinimalDigitalMarketerTemplate;
  return <Template data={data} />;
}

export default uploadedPdfResumeTemplates;
