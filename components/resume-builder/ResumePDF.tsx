import React from "react";
import { Document, Page, View, Text, Image, Link } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume";
import {
  getBasePageStyle,
  styles
} from "@/lib/resumePdfStyles";
import {
  uploadedPdfResumeTemplates,
  uploadedPdfTemplateOptions,
  renderUploadedPdfTemplate,
  type UploadedPdfTemplateKey,
} from "./uploadedPdfResumeTemplates";
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
  return nonEmptyArray(data.skills).length > 0;
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

function hasExtraProfileInfo(data: ResumeData) {
  return (
    hasText((data as any).currentCtc) ||
    hasText((data as any).expectedCtc) ||
    hasText((data as any).noticePeriod) ||
    hasText((data as any).preferredLocation) ||
    hasText((data as any).totalExperience) ||
    hasText((data as any).relevantExperience)
  );
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
/* -------------------- REUSABLE BLOCKS -------------------- */

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: ThemePalette;
}) {
  return (
    <View style={styles.section}>
      <View style={{ ...styles.sectionBar, backgroundColor: palette.primary }} />
      <Text style={{ ...styles.heading, color: palette.primary }}>{title}</Text>
      {children}
    </View>
  );
}

function BulletItem({ text, color }: { text: string; color: string }) {
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
          lineHeight: 1.45,
        }}
      >
        •
      </Text>

      <Text
        style={{
          flex: 1,
          fontSize: 9.2,
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

function ContactBlock({
  data,
  palette,
  light = false,
}: {
  data: ResumeData;
  palette: ThemePalette;
  light?: boolean;
}) {
  const color = light ? palette.sidebarText : palette.text;
  if (!hasContact(data)) return null;
  return (
    <View style={styles.sectionTight}>
      {hasText(data.phone) && <Text style={{ ...styles.contactLine, color }}>{data.phone}</Text>}
      {hasText(data.email) && <Text style={{ ...styles.contactLine, color }}>{data.email}</Text>}
      {hasText(data.linkedin) && (
        <Link src={data.linkedin!} style={{ ...styles.contactLine, ...styles.link, color }}>
          {data.linkedin}
        </Link>
      )}
      {hasText(data.address) && <Text style={{ ...styles.contactLine, color }}>{data.address}</Text>}
    </View>
  );
}

function SummaryBlock({ data, palette }: { data: ResumeData; palette: ThemePalette }) {
  if (!hasSummary(data)) return null;
  return (
    <View
      style={{
        ...styles.summaryBox,
        backgroundColor: palette.soft,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
    </View>
  );
}

function SkillsBlock({
  data,
  palette,
  light = false,
}: {
  data: ResumeData;
  palette: ThemePalette;
  light?: boolean;
}) {
  const skills = nonEmptyArray((data as any).skills);
  if (!skills.length) return null;
  return (
    <View style={styles.skillTagWrap}>
      {skills.map((skill, index) => (
        <Text
          key={`${skill}-${index}`}
          style={{
            ...styles.skillTag,
            backgroundColor: light ? "rgba(255,255,255,0.15)" : palette.chipBg,
            color: light ? palette.sidebarText : palette.chipText,
            ...(light
              ? {
                borderStyle: "solid" as const,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }
              : {}),
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
              ...styles.expCard,
              borderBottomColor: palette.border,
              marginBottom: 10,
              paddingBottom: 8,
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
                    ...styles.itemTitle,
                    color: palette.primary,
                    marginBottom: 1,
                  }}
                >
                  {cleanText(exp?.jobTitle) || "Role"}
                </Text>

                {hasText(exp?.company) && (
                  <Text
                    style={{
                      fontSize: 9.2,
                      color: palette.text,
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {cleanText(exp?.company)}
                  </Text>
                )}
              </View>

              {hasDuration && (
                <Text
                  style={{
                    fontSize: 8.5,
                    color: palette.subText,
                    textAlign: "right",
                    minWidth: 80,
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
              ...styles.eduCard,
              borderBottomColor: palette.border,
              marginBottom: 10,
              paddingBottom: 8,
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
                    ...styles.itemTitle,
                    color: palette.primary,
                    marginBottom: 1,
                  }}
                >
                  {cleanText(edu?.degree) || "Degree"}
                </Text>

                {hasText(edu?.institution) && (
                  <Text
                    style={{
                      fontSize: 9.2,
                      color: palette.text,
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {cleanText(edu?.institution)}
                  </Text>
                )}
              </View>

              {hasDuration && (
                <Text
                  style={{
                    fontSize: 8.5,
                    color: palette.subText,
                    textAlign: "right",
                    minWidth: 70,
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
        <View key={index} style={{ ...styles.expCard, borderBottomColor: palette.border }}>
          <Text style={{ ...styles.itemTitle, color: palette.primary }}>
            {cleanText(project.name) || "Project"}
          </Text>

          {hasText(project.techStack) && (
            <Text style={{ ...styles.subText, color: palette.subText }}>
              Tech: {project.techStack}
            </Text>
          )}

          {hasText(project.link) && (
            <Link
              src={project.link!}
              style={{ ...styles.subText, ...styles.link, color: palette.secondary }}
            >
              {project.link}
            </Link>
          )}

          {nonEmptyArray(project.bullets).map((bullet, i) => (
            <BulletItem key={i} text={bullet} color={palette.text} />
          ))}
        </View>
      ))}
    </View>
  );
}

function HeaderIntro({
  data,
  palette,
  centered = false,
  showImage = true,
}: {
  data: ResumeData;
  palette: ThemePalette;
  centered?: boolean;
  showImage?: boolean;
}) {
  return (
    <View style={centered ? styles.centerHeader : undefined}>
      {showImage && (data as any).profileImage && (
        <Image src={(data as any).profileImage} style={centered ? styles.heroImage : styles.image} />
      )}
      <Text style={{ ...styles.name, color: palette.primary, ...(centered ? styles.centerText : {}) }}>
        {cleanText(data.fullName) || "Your Name"}
      </Text>
      <Text style={{ ...styles.role, color: palette.subText, ...(centered ? styles.centerText : {}) }}>
        {cleanText(data.role) || "Your Role"}
      </Text>
    </View>
  );
}

/* =====================================
   TEMPLATE 1 — Classic Sidebar
   ===================================== */
function ClassicSidebarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <View style={{ ...styles.sidebarBox, backgroundColor: palette.sidebarBg }}>
              {(data as any).profileImage && <Image src={(data as any).profileImage} style={styles.image} />}
              {hasContact(data) && (
                <>
                  <Text style={{ ...styles.heading, color: palette.sidebarText }}>Contact</Text>
                  <ContactBlock data={data} palette={palette} light />
                </>
              )}
              {hasContact(data) && (hasSkills(data) || hasLanguages(data)) && (
                <View style={{ ...styles.divider, backgroundColor: "rgba(255,255,255,0.18)" }} />
              )}
              {hasSkills(data) && (
                <>
                  <Text style={{ ...styles.heading, color: palette.sidebarText }}>Skills</Text>
                  <SkillsBlock data={data} palette={palette} light />
                </>
              )}
              {hasSkills(data) && hasLanguages(data) && (
                <View style={{ ...styles.divider, backgroundColor: "rgba(255,255,255,0.18)" }} />
              )}
              {hasLanguages(data) && (
                <>
                  <Text style={{ ...styles.heading, color: palette.sidebarText }}>Languages</Text>
                  <LanguagesBlock data={data} palette={palette} light />
                </>
              )}
            </View>
          </View>
          <View style={styles.rightCol}>
            <HeaderIntro data={data} palette={palette} showImage={false} />
            <View style={{ ...styles.divider, backgroundColor: palette.border }} />
            {hasSummary(data) && (
              <Section title="Summary" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
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
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 2 */
function AccentHeaderTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ ...styles.headerCard, backgroundColor: palette.primary }}>
          <Text style={{ ...styles.name, color: "#FFFFFF" }}>{cleanText(data.fullName) || "Your Name"}</Text>
          <Text style={{ ...styles.role, color: "#E5E7EB" }}>{cleanText(data.role) || "Your Role"}</Text>
          {hasContact(data) && (
            <View style={{ marginTop: 8 }}>
              {hasText(data.phone) && <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>{data.phone}</Text>}
              {hasText(data.email) && <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>{data.email}</Text>}
              {hasText(data.linkedin) && <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>{data.linkedin}</Text>}
            </View>
          )}
        </View>
        {hasSummary(data) && (
          <Section title="Summary" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}
        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}
        <View style={styles.row}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
            {hasLanguages(data) && (
              <Section title="Languages" palette={palette}>
                <LanguagesBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
          <View style={{ width: "50%", paddingLeft: 8 }}>
            {hasProjects(data) && (
              <Section title="Projects" palette={palette}>
                <ProjectsBlock data={data} palette={palette} />
              </Section>
            )}
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 3 */
function SplitTwoColumnTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <HeaderIntro data={data} palette={palette} />
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />
        <View style={styles.row}>
          <View style={styles.leftCol}>
            {hasContact(data) && (
              <Section title="Contact" palette={palette}>
                <ContactBlock data={data} palette={palette} />
              </Section>
            )}
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
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
          <View style={styles.rightCol}>
            {hasSummary(data) && (
              <Section title="Summary" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
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
      </Page>
    </Document>
  );
}

/* TEMPLATE 4 */
function TimelineTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
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
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <HeaderIntro data={data} palette={palette} centered />
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />
        {hasSummary(data) && (
          <Section title="Summary" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}
        {experience.length > 0 && (
          <Section title="Experience Timeline" palette={palette}>
            <View>
              {experience.map((exp: any, index: number) => {
                const points = nonEmptyArray(exp.bullets?.length ? exp.bullets : exp.points);
                const start = cleanText(exp.startDate || exp.start);
                const end = cleanText(exp.endDate || exp.end);
                return (
                  <View key={index} style={{ ...styles.timelineItem, borderLeftColor: palette.primary }}>
                    <Text style={{ ...styles.itemTitle, color: palette.primary }}>
                      {cleanText(exp.jobTitle) || "Role"}
                      {hasText(exp.company) ? ` | ${exp.company}` : ""}
                    </Text>
                    {(start || end) && (
                      <Text style={{ ...styles.subText, color: palette.subText }}>
                        {start}
                        {start || end ? " - " : ""}
                        {end || "Present"}
                      </Text>
                    )}
                    {points.map((point, i) => (
                      <BulletItem key={i} text={point} color={palette.text} />
                    ))}
                  </View>
                );
              })}
            </View>
          </Section>
        )}
        <View style={styles.row}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            {hasProjects(data) && (
              <Section title="Projects" palette={palette}>
                <ProjectsBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
          <View style={{ width: "50%", paddingLeft: 8 }}>
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 5 */
function MinimalCleanTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ ...styles.accentStrip, backgroundColor: palette.primary }} />
        <HeaderIntro data={data} palette={palette} />
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />
        {hasSummary(data) && (
          <Section title="Summary" palette={palette}>
            <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
          </Section>
        )}
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
        <View style={styles.row}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
          <View style={{ width: "50%", paddingLeft: 8 }}>
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
            {hasLanguages(data) && (
              <Section title="Languages" palette={palette}>
                <LanguagesBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 6 */
function ModernCorporateTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View
          style={{
            ...styles.headerCard,
            backgroundColor: palette.soft,
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <View style={styles.row}>
            <View style={{ width: "72%", paddingRight: 10 }}>
              <Text style={{ ...styles.name, color: palette.primary }}>{cleanText(data.fullName) || "Your Name"}</Text>
              <Text style={{ ...styles.role, color: palette.subText }}>{cleanText(data.role) || "Your Role"}</Text>
              {hasContact(data) && (
                <View style={{ marginTop: 8 }}>
                  {hasText(data.phone) && <Text style={{ ...styles.smallText, color: palette.text }}>Phone: {data.phone}</Text>}
                  {hasText(data.email) && <Text style={{ ...styles.smallText, color: palette.text }}>Email: {data.email}</Text>}
                  {hasText(data.linkedin) && <Text style={{ ...styles.smallText, color: palette.text }}>LinkedIn: {data.linkedin}</Text>}
                  {hasText(data.address) && <Text style={{ ...styles.smallText, color: palette.text }}>Address: {data.address}</Text>}
                </View>
              )}
            </View>
            <View style={{ width: "28%", alignItems: "flex-end" }}>
              {(data as any).profileImage && <Image src={(data as any).profileImage} style={styles.heroImage} />}
            </View>
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ width: "65%", paddingRight: 10 }}>
            {hasSummary(data) && (
              <Section title="Professional Summary" palette={palette}>
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
          <View style={{ width: "35%", paddingLeft: 10 }}>
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
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
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 7 */
function AtsCompactTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <Text style={{ ...styles.name, color: palette.text }}>{cleanText(data.fullName) || "Your Name"}</Text>
        <Text style={{ ...styles.role, color: palette.subText }}>{cleanText(data.role) || "Your Role"}</Text>
        {hasContact(data) && (
          <Text style={{ ...styles.smallText, color: palette.text, marginTop: 5 }}>
            {[data.phone, data.email, data.linkedin, data.address]
              .map((v) => cleanText(v))
              .filter(Boolean)
              .join(" | ")}
          </Text>
        )}
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />
        {hasSummary(data) && (
          <Section title="Summary" palette={palette}>
            <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
          </Section>
        )}
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
        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
        {hasSkills(data) && (
          <Section title="Skills" palette={palette}>
            <Text style={{ ...styles.text, color: palette.text }}>{nonEmptyArray((data as any).skills).join(", ")}</Text>
          </Section>
        )}
        {hasLanguages(data) && (
          <Section title="Languages" palette={palette}>
            <Text style={{ ...styles.text, color: palette.text }}>
              {nonEmptyArray((data as any).languages).join(", ")}
            </Text>
          </Section>
        )}
      </Page>
    </Document>
  );
}

/* TEMPLATE 8 */
function ElegantSidebarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={styles.row}>
          <View style={{ width: "30%", paddingRight: 14 }}>
            <View
              style={{
                ...styles.sidebarBox,
                backgroundColor: palette.soft,
                borderStyle: "solid",
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              {(data as any).profileImage && <Image src={(data as any).profileImage} style={styles.image} />}
              {hasContact(data) && (
                <Section title="Contact" palette={palette}>
                  <ContactBlock data={data} palette={palette} />
                </Section>
              )}
              {hasSkills(data) && (
                <Section title="Skills" palette={palette}>
                  <SkillsBlock data={data} palette={palette} />
                </Section>
              )}
              {hasLanguages(data) && (
                <Section title="Languages" palette={palette}>
                  <LanguagesBlock data={data} palette={palette} />
                </Section>
              )}
            </View>
          </View>
          <View style={{ width: "70%", paddingLeft: 14 }}>
            <Text style={{ ...styles.name, color: palette.primary }}>{cleanText(data.fullName) || "Your Name"}</Text>
            <Text style={{ ...styles.role, color: palette.subText }}>{cleanText(data.role) || "Your Role"}</Text>
            <View style={{ ...styles.divider, backgroundColor: palette.border }} />
            {hasSummary(data) && (
              <Section title="Profile Summary" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
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
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 9 */
function ModernLeftBarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={styles.row}>
          <View style={{ width: "28%", backgroundColor: palette.primary, padding: 18, minHeight: "100%" }}>
            <Text style={{ ...styles.name, color: "#fff", marginBottom: 18 }}>{cleanText(data.fullName) || "Your Name"}</Text>
            {hasContact(data) && <ContactBlock data={data} palette={palette} light />}
            {hasSkills(data) && <SkillsBlock data={data} palette={palette} light />}
            {hasLanguages(data) && (
              <>
                <View style={{ ...styles.divider, backgroundColor: "rgba(255,255,255,0.18)" }} />
                <LanguagesBlock data={data} palette={palette} light />
              </>
            )}
          </View>
          <View style={{ width: "72%", padding: 24 }}>
            <Text style={{ ...styles.role, color: palette.primary, fontSize: 16, marginBottom: 12 }}>
              {cleanText(data.role) || "Your Role"}
            </Text>
            {hasSummary(data) && <SummaryBlock data={data} palette={palette} />}
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
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 10 */
function SimpleHeaderTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ ...styles.headerCard, backgroundColor: palette.primary, marginBottom: 24 }}>
          <Text style={{ ...styles.name, color: "#fff" }}>{cleanText(data.fullName) || "Your Name"}</Text>
          <Text style={{ ...styles.role, color: "#E0E7FF" }}>{cleanText(data.role) || "Your Role"}</Text>
        </View>
        {hasSummary(data) && (
          <Section title="Summary" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}
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
        {hasEducation(data) && (
          <Section title="Education" palette={palette}>
            <EducationBlock data={data} palette={palette} />
          </Section>
        )}
        {hasSkills(data) && (
          <Section title="Skills" palette={palette}>
            <SkillsBlock data={data} palette={palette} />
          </Section>
        )}
        {hasLanguages(data) && (
          <Section title="Languages" palette={palette}>
            <LanguagesBlock data={data} palette={palette} />
          </Section>
        )}
      </Page>
    </Document>
  );
}

/* TEMPLATE 11 */
function CompactProTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View
          style={{
            backgroundColor: palette.primary,
            padding: 16,
            marginBottom: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ ...styles.name, color: "#fff", fontSize: 20 }}>{cleanText(data.fullName) || "Your Name"}</Text>
            <Text style={{ ...styles.role, color: "#E5E7EB", marginTop: 2 }}>{cleanText(data.role) || "Role"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {hasText(data.email) && <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>{data.email}</Text>}
            {hasText(data.phone) && <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>{data.phone}</Text>}
            {hasText(data.linkedin) && <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>{data.linkedin}</Text>}
          </View>
        </View>
        {hasSummary(data) && (
          <Section title="About" palette={palette}>
            <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
          </Section>
        )}
        {hasExperience(data) && (
          <Section title="Experience" palette={palette}>
            <ExperienceBlock data={data} palette={palette} />
          </Section>
        )}
        <View style={styles.row}>
          <View style={{ width: "34%", paddingRight: 8 }}>
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
          <View style={{ width: "33%", paddingHorizontal: 8 }}>
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
          <View style={{ width: "33%", paddingLeft: 8 }}>
            {hasProjects(data) && (
              <Section title="Projects" palette={palette}>
                <ProjectsBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 12 */
function BoldNameTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 30, fontWeight: 700, color: palette.primary, letterSpacing: 1 }}>
            {cleanText(data.fullName) || "Your Name"}
          </Text>
          <Text style={{ ...styles.role, color: palette.subText, fontSize: 13 }}>{cleanText(data.role) || "Your Role"}</Text>
          <View style={{ height: 3, backgroundColor: palette.primary, marginTop: 8, width: "100%" }} />
          {hasContact(data) && (
            <Text style={{ ...styles.smallText, color: palette.subText, marginTop: 5 }}>
              {[data.phone, data.email, data.linkedin, data.address]
                .map((v) => cleanText(v))
                .filter(Boolean)
                .join("  •  ")}
            </Text>
          )}
        </View>
        <View style={styles.row}>
          <View style={{ width: "65%", paddingRight: 12 }}>
            {hasSummary(data) && (
              <Section title="Profile" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
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
          <View style={{ width: "35%", paddingLeft: 12 }}>
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
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
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 13 */
function InfographicBarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  const skills = nonEmptyArray((data as any).skills);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={styles.row}>
          <View style={{ width: "35%", backgroundColor: palette.sidebarBg, padding: 16, minHeight: "100%" }}>
            {(data as any).profileImage && <Image src={(data as any).profileImage} style={styles.image} />}
            <Text style={{ ...styles.name, color: palette.sidebarText, fontSize: 16, marginBottom: 4 }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            <Text style={{ ...styles.role, color: palette.sidebarText, opacity: 0.75, marginBottom: 12 }}>
              {cleanText(data.role) || "Role"}
            </Text>
            {hasContact(data) && (
              <>
                <Text style={{ ...styles.heading, color: palette.sidebarText, fontSize: 9 }}>Contact</Text>
                <ContactBlock data={data} palette={palette} light />
              </>
            )}
            <View style={{ ...styles.divider, backgroundColor: "rgba(255,255,255,0.2)" }} />
            {skills.length > 0 && (
              <>
                <Text style={{ ...styles.heading, color: palette.sidebarText, fontSize: 9 }}>Skills</Text>
                {skills.map((skill, i) => (
                  <View key={i} style={{ marginBottom: 5 }}>
                    <Text style={{ ...styles.smallText, color: palette.sidebarText, marginBottom: 2 }}>{skill}</Text>
                    <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2 }}>
                      <View
                        style={{
                          height: 4,
                          width: `${Math.min(95, 65 + ((i * 7) % 35))}%`,
                          backgroundColor: palette.accent,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </>
            )}
            {hasLanguages(data) && (
              <>
                <View style={{ ...styles.divider, backgroundColor: "rgba(255,255,255,0.2)" }} />
                <Text style={{ ...styles.heading, color: palette.sidebarText, fontSize: 9 }}>Languages</Text>
                <LanguagesBlock data={data} palette={palette} light />
              </>
            )}
          </View>
          <View style={{ width: "65%", padding: 18 }}>
            {hasSummary(data) && (
              <Section title="Summary" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
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
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 14 */
function TopContactBarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ backgroundColor: palette.soft, padding: 14, marginBottom: 10, borderRadius: 8 }}>
          <Text style={{ ...styles.name, color: palette.primary }}>{cleanText(data.fullName) || "Your Name"}</Text>
          <Text style={{ ...styles.role, color: palette.subText }}>{cleanText(data.role) || "Role"}</Text>
          {hasContact(data) && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
              {hasText(data.email) && <Text style={{ ...styles.smallText, color: palette.secondary, marginRight: 12 }}>{data.email}</Text>}
              {hasText(data.phone) && <Text style={{ ...styles.smallText, color: palette.secondary, marginRight: 12 }}>{data.phone}</Text>}
              {hasText(data.linkedin) && <Text style={{ ...styles.smallText, color: palette.secondary, marginRight: 12 }}>{data.linkedin}</Text>}
              {hasText(data.address) && <Text style={{ ...styles.smallText, color: palette.secondary, marginRight: 12 }}>{data.address}</Text>}
            </View>
          )}
        </View>
        {hasSummary(data) && (
          <Section title="Summary" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}
        <View style={styles.row}>
          <View style={{ width: "60%", paddingRight: 10 }}>
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
          <View style={{ width: "40%", paddingLeft: 10 }}>
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
            {hasLanguages(data) && (
              <Section title="Languages" palette={palette}>
                <LanguagesBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 15 */
function ExecutiveTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ height: 6, backgroundColor: palette.primary, marginBottom: 14 }} />
        <View style={styles.row}>
          <View style={{ width: "68%", paddingRight: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: 700, color: palette.primary }}>{cleanText(data.fullName) || "Your Name"}</Text>
            <Text style={{ ...styles.role, color: palette.subText, fontSize: 12 }}>{cleanText(data.role) || "Your Role"}</Text>
            {hasContact(data) && (
              <Text style={{ ...styles.smallText, color: palette.subText, marginTop: 4 }}>
                {[data.phone, data.email, data.linkedin]
                  .map((v) => cleanText(v))
                  .filter(Boolean)
                  .join("  |  ")}
              </Text>
            )}
            <View style={{ ...styles.divider, backgroundColor: palette.border }} />
            {hasSummary(data) && (
              <Section title="Executive Summary" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
            {hasExperience(data) && (
              <Section title="Professional Experience" palette={palette}>
                <ExperienceBlock data={data} palette={palette} />
              </Section>
            )}
            {hasProjects(data) && (
              <Section title="Key Projects" palette={palette}>
                <ProjectsBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
          <View
            style={{
              width: "32%",
              paddingLeft: 16,
              borderLeftWidth: 1,
              borderLeftColor: palette.border,
              borderLeftStyle: "solid",
            }}
          >
            {(data as any).profileImage && <Image src={(data as any).profileImage} style={{ ...styles.heroImage, marginBottom: 14 }} />}
            {hasSkills(data) && (
              <Section title="Core Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
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
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 16 */
function TwoToneSplitTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), padding: 0 }}>
        <View style={styles.row}>
          <View style={{ width: "38%", backgroundColor: palette.soft, padding: 22, minHeight: "100%" }}>
            {(data as any).profileImage && <Image src={(data as any).profileImage} style={{ ...styles.heroImage, marginBottom: 14 }} />}
            <Text style={{ fontSize: 18, fontWeight: 700, color: palette.primary, marginBottom: 2 }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            <Text style={{ ...styles.role, color: palette.subText, marginBottom: 10 }}>{cleanText(data.role) || "Your Role"}</Text>
            <View style={{ height: 2, backgroundColor: palette.primary, marginBottom: 10 }} />
            {hasContact(data) && (
              <Section title="Contact" palette={palette}>
                <ContactBlock data={data} palette={palette} />
              </Section>
            )}
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
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
          <View style={{ width: "62%", backgroundColor: "#fff", padding: 22 }}>
            {hasSummary(data) && (
              <Section title="About Me" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}
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
      </Page>
    </Document>
  );
}

/* TEMPLATE 17 */
function MinimalistLineTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), padding: 36 }}>
        <Text style={{ fontSize: 28, fontWeight: 700, color: palette.text, letterSpacing: 2 }}>
          {cleanText(data.fullName) || "YOUR NAME"}
        </Text>
        <Text
          style={{
            ...styles.role,
            color: palette.primary,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {cleanText(data.role) || "Your Role"}
        </Text>
        {hasContact(data) && (
          <Text style={{ ...styles.smallText, color: palette.subText, marginTop: 4, letterSpacing: 0.5 }}>
            {[data.phone, data.email, data.address]
              .map((v) => cleanText(v))
              .filter(Boolean)
              .join("   ·   ")}
          </Text>
        )}
        <View style={{ height: 0.5, backgroundColor: palette.text, marginVertical: 10 }} />
        {hasSummary(data) && (
          <View style={{ marginBottom: 10 }}>
            <Text
              style={{
                ...styles.smallText,
                color: palette.primary,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Summary
            </Text>
            <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
          </View>
        )}
        <View style={styles.row}>
          <View style={{ width: "60%", paddingRight: 14 }}>
            {hasExperience(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    ...styles.smallText,
                    color: palette.primary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  Experience
                </Text>
                <ExperienceBlock data={data} palette={palette} />
              </View>
            )}
            {hasProjects(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    ...styles.smallText,
                    color: palette.primary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  Projects
                </Text>
                <ProjectsBlock data={data} palette={palette} />
              </View>
            )}
          </View>
          <View style={{ width: "40%", paddingLeft: 14 }}>
            {hasSkills(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    ...styles.smallText,
                    color: palette.primary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  Skills
                </Text>
                <SkillsBlock data={data} palette={palette} />
              </View>
            )}
            {hasEducation(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    ...styles.smallText,
                    color: palette.primary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  Education
                </Text>
                <EducationBlock data={data} palette={palette} />
              </View>
            )}
            {hasLanguages(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    ...styles.smallText,
                    color: palette.primary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  Languages
                </Text>
                <LanguagesBlock data={data} palette={palette} />
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 18 */
function CardStackTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  const CardSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: palette.border,
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ ...styles.heading, color: palette.primary, fontSize: 10, marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <CardSection title="">
          <Text style={{ ...styles.name, color: palette.primary }}>{cleanText(data.fullName) || "Your Name"}</Text>
          <Text style={{ ...styles.role, color: palette.subText }}>{cleanText(data.role) || "Role"}</Text>
          {hasContact(data) && (
            <Text style={{ ...styles.smallText, color: palette.subText, marginTop: 4 }}>
              {[data.phone, data.email, data.linkedin]
                .map((v) => cleanText(v))
                .filter(Boolean)
                .join("  •  ")}
            </Text>
          )}
        </CardSection>
        {hasSummary(data) && (
          <CardSection title="Summary">
            <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
          </CardSection>
        )}
        <View style={styles.row}>
          <View style={{ width: "62%", paddingRight: 8 }}>
            {hasExperience(data) && (
              <CardSection title="Experience">
                <ExperienceBlock data={data} palette={palette} />
              </CardSection>
            )}
            {hasProjects(data) && (
              <CardSection title="Projects">
                <ProjectsBlock data={data} palette={palette} />
              </CardSection>
            )}
          </View>
          <View style={{ width: "38%", paddingLeft: 8 }}>
            {hasSkills(data) && (
              <CardSection title="Skills">
                <SkillsBlock data={data} palette={palette} />
              </CardSection>
            )}
            {hasEducation(data) && (
              <CardSection title="Education">
                <EducationBlock data={data} palette={palette} />
              </CardSection>
            )}
            {hasLanguages(data) && (
              <CardSection title="Languages">
                <LanguagesBlock data={data} palette={palette} />
              </CardSection>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 19 */
function FreshGraduateTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ ...styles.row, marginBottom: 14, alignItems: "center" }}>
          {(data as any).profileImage && <Image src={(data as any).profileImage} style={{ ...styles.heroImage, marginRight: 16 }} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: palette.primary }}>{cleanText(data.fullName) || "Your Name"}</Text>
            <Text style={{ ...styles.role, color: palette.subText, fontSize: 12, marginBottom: 6 }}>{cleanText(data.role) || "Role"}</Text>
            {hasContact(data) && (
              <View>
                {hasText(data.email) && <Text style={{ ...styles.smallText, color: palette.text }}>{data.email}</Text>}
                {hasText(data.phone) && <Text style={{ ...styles.smallText, color: palette.text }}>{data.phone}</Text>}
                {hasText(data.linkedin) && <Text style={{ ...styles.smallText, color: palette.text }}>{data.linkedin}</Text>}
              </View>
            )}
          </View>
        </View>
        <View style={{ height: 3, backgroundColor: palette.primary, marginBottom: 14 }} />
        {hasSummary(data) && (
          <Section title="Objective" palette={palette}>
            <SummaryBlock data={data} palette={palette} />
          </Section>
        )}
        <View style={styles.row}>
          <View style={{ width: "55%", paddingRight: 10 }}>
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
          <View style={{ width: "45%", paddingLeft: 10 }}>
            {hasEducation(data) && (
              <Section title="Education" palette={palette}>
                <EducationBlock data={data} palette={palette} />
              </Section>
            )}
            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
            {hasLanguages(data) && (
              <Section title="Languages" palette={palette}>
                <LanguagesBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* TEMPLATE 20 */
function TechDarkTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);
  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), backgroundColor: "#0F172A", color: "#F8FAFC" }}>
        <View style={styles.row}>
          <View style={{ width: "34%", padding: 18, backgroundColor: "#1E293B", minHeight: "100%" }}>
            {(data as any).profileImage && <Image src={(data as any).profileImage} style={styles.image} />}
            <Text style={{ fontSize: 16, fontWeight: 700, color: palette.accent, marginBottom: 2 }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            <Text style={{ ...styles.smallText, color: "#94A3B8", marginBottom: 10 }}>{cleanText(data.role) || "Role"}</Text>
            {hasContact(data) && (
              <>
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 9 }}>Contact</Text>
                <ContactBlock data={data} palette={{ ...palette, sidebarText: "#CBD5E1" }} light />
              </>
            )}
            {hasSkills(data) && (
              <>
                <View style={{ ...styles.divider, backgroundColor: "#334155" }} />
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 9 }}>Skills</Text>
                <SkillsBlock data={data} palette={palette} light />
              </>
            )}
            {hasLanguages(data) && (
              <>
                <View style={{ ...styles.divider, backgroundColor: "#334155" }} />
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 9 }}>Languages</Text>
                <LanguagesBlock data={data} palette={{ ...palette, sidebarText: "#CBD5E1" }} light />
              </>
            )}
          </View>
          <View style={{ width: "66%", padding: 20 }}>
            {hasSummary(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 10 }}>Summary</Text>
                <Text style={{ ...styles.text, color: "#CBD5E1" }}>{data.summary}</Text>
              </View>
            )}
            {hasExperience(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 10 }}>Experience</Text>
                <ExperienceBlock
                  data={data}
                  palette={{
                    ...palette,
                    primary: palette.accent,
                    text: "#E2E8F0",
                    subText: "#94A3B8",
                    border: "#334155",
                  }}
                />
              </View>
            )}
            {hasProjects(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 10 }}>Projects</Text>
                <ProjectsBlock
                  data={data}
                  palette={{
                    ...palette,
                    primary: palette.accent,
                    text: "#E2E8F0",
                    subText: "#94A3B8",
                    border: "#334155",
                  }}
                />
              </View>
            )}
            {hasEducation(data) && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ ...styles.heading, color: palette.accent, fontSize: 10 }}>Education</Text>
                <EducationBlock
                  data={data}
                  palette={{
                    ...palette,
                    primary: palette.accent,
                    text: "#E2E8F0",
                    subText: "#94A3B8",
                    border: "#334155",
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* Naukri Style */
function NaukriStyleTemplate({ data }: { data: ResumeData }) {
  const bluePalette = getThemePalette("blue");
  const skills = nonEmptyArray((data as any).skills);

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

  const education = safeArray((data as any).education).filter((edu: any) => {
    const highlights = nonEmptyArray(edu?.highlights);
    return (
      hasText(edu?.degree) ||
      hasText(edu?.institution) ||
      hasText(edu?.startYear) ||
      hasText(edu?.endYear) ||
      highlights.length > 0
    );
  });

  const projects = safeArray((data as any).projects).filter((project: any) => {
    const bullets = nonEmptyArray(project?.bullets);
    return (
      hasText(project?.name) ||
      hasText(project?.techStack) ||
      hasText(project?.link) ||
      bullets.length > 0
    );
  });

  const certifications = safeArray((data as any).certifications).filter((cert: any) => {
    if (typeof cert === "string") return hasText(cert);
    return hasText(cert?.name) || hasText(cert?.issuer);
  });

  const languages = nonEmptyArray((data as any).languages);
  const totalExperience =
    cleanText((data as any).totalExperience) ||
    cleanText((data as any).relevantExperience) ||
    "";

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...getBasePageStyle(data, bluePalette),
          padding: 0,
          backgroundColor: "#FFFFFF",
        }}
      >
        <View style={styles.naukriHeader}>
          <Text style={styles.naukriName}>{cleanText(data.fullName) || "Your Name"}</Text>
          <Text style={styles.naukriRole}>{cleanText(data.role) || "Professional Title"}</Text>

          <View style={styles.naukriContactRow}>
            {hasText(data.email) && <Text style={styles.naukriContactText}>{data.email}</Text>}
            {hasText(data.phone) && <Text style={styles.naukriContactText}>{data.phone}</Text>}
            {hasText(data.address) && <Text style={styles.naukriContactText}>{data.address}</Text>}
            {hasText(data.linkedin) && <Text style={styles.naukriContactText}>{data.linkedin}</Text>}
            {hasText((data as any).github) && (
              <Text style={styles.naukriContactText}>{(data as any).github}</Text>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
          {hasSummary(data) && (
            <Section title="Profile Summary" palette={bluePalette}>
              <Text style={{ ...styles.text, color: "#111827" }}>{data.summary}</Text>
            </Section>
          )}
         
          {experience.length > 0 && (
            <Section title="Work Experience" palette={bluePalette}>
              <View>
                {experience.map((exp: any, index: number) => {
                  const points = nonEmptyArray(exp?.bullets?.length ? exp.bullets : exp?.points);
                  const start = cleanText(exp.startDate || exp.start);
                  const end = cleanText(exp.endDate || exp.end);

                  return (
                    <View
                      key={index}
                      style={{
                        ...styles.expCard,
                        borderBottomColor: "#E5E7EB",
                        paddingBottom: 8,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <View style={{ width: "72%" }}>
                          <Text style={{ fontSize: 10.7, fontWeight: 700, color: "#111827" }}>
                            {cleanText(exp.jobTitle) || "Role"}
                          </Text>
                          {hasText(exp.company) && (
                            <Text style={{ fontSize: 9.1, color: "#185FA5", marginTop: 2 }}>
                              {exp.company}
                            </Text>
                          )}
                        </View>

                        {(start || end) && (
                          <Text style={{ fontSize: 8.4, color: "#6B7280", textAlign: "right" }}>
                            {start}
                            {start || end ? " – " : ""}
                            {end || "Present"}
                          </Text>
                        )}
                      </View>

                      {nonEmptyArray((exp as any).metrics).length > 0 && (
                        <View style={styles.naukriMetricWrap}>
                          {nonEmptyArray((exp as any).metrics).map((metric, mi) => (
                            <Text key={`${metric}-${mi}`} style={styles.naukriMetric}>
                              {metric}
                            </Text>
                          ))}
                        </View>
                      )}

                      <View style={{ marginTop: 4 }}>
                        {points.map((point, i) => (
                          <BulletItem key={i} text={point} color="#111827" />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Section>
          )}

          {skills.length > 0 && (
            <Section title="Technical Skills" palette={bluePalette}>
              <View style={styles.naukriPillWrap}>
                {skills.map((skill, i) => (
                  <Text key={`${skill}-${i}`} style={styles.naukriPill}>
                    {skill}
                  </Text>
                ))}
              </View>
            </Section>
          )}

          {education.length > 0 && (
            <Section title="Education" palette={bluePalette}>
              <View>
                {education.map((edu: any, index: number) => (
                  <View key={index} style={{ marginBottom: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <View style={{ width: "68%" }}>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: "#111827" }}>
                          {cleanText(edu.degree) || "Degree"}
                        </Text>
                        {hasText(edu.institution) && (
                          <Text style={{ fontSize: 9, color: "#185FA5", marginTop: 2 }}>
                            {edu.institution}
                          </Text>
                        )}
                      </View>

                      <View style={{ width: "30%", alignItems: "flex-end" }}>
                        {(hasText(edu.startYear) || hasText(edu.endYear)) && (
                          <Text style={{ fontSize: 8.4, color: "#6B7280" }}>
                            {cleanText(edu.startYear)}
                            {cleanText(edu.startYear) || cleanText(edu.endYear) ? " – " : ""}
                            {cleanText(edu.endYear) || (edu.currentlyStudying ? "Present" : "")}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={{ marginTop: 3 }}>
                      {nonEmptyArray(edu.highlights).map((highlight, hi) => (
                        <BulletItem key={hi} text={highlight} color="#111827" />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {hasCertifications(data) && certifications.length > 0 && (
            <Section title="Certifications" palette={bluePalette}>
              <View style={styles.row}>
                <View style={{ width: "50%", paddingRight: 6 }}>
                  {certifications
                    .filter((_: any, i: number) => i % 2 === 0)
                    .map((cert: any, i: number) => (
                      <View key={i} style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>
                          {typeof cert === "string" ? cert : cleanText(cert?.name) || "Certification"}
                        </Text>
                        {typeof cert !== "string" && hasText(cert?.issuer) && (
                          <Text style={{ fontSize: 8.5, color: "#6B7280" }}>{cert.issuer}</Text>
                        )}
                      </View>
                    ))}
                </View>

                <View style={{ width: "50%", paddingLeft: 6 }}>
                  {certifications
                    .filter((_: any, i: number) => i % 2 === 1)
                    .map((cert: any, i: number) => (
                      <View key={i} style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>
                          {typeof cert === "string" ? cert : cleanText(cert?.name) || "Certification"}
                        </Text>
                        {typeof cert !== "string" && hasText(cert?.issuer) && (
                          <Text style={{ fontSize: 8.5, color: "#6B7280" }}>{cert.issuer}</Text>
                        )}
                      </View>
                    ))}
                </View>
              </View>
            </Section>
          )}

          {projects.length > 0 && (
            <Section title="Projects & Open Source" palette={bluePalette}>
              <ProjectsBlock data={{ ...data, projects } as ResumeData} palette={bluePalette} />
            </Section>
          )}

          {(languages.length > 0 || hasExtraProfileInfo(data)) && (
            <Section title="Profile Info" palette={bluePalette}>
              {languages.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ ...styles.smallText, color: "#6B7280", marginBottom: 4 }}>
                    Languages
                  </Text>
                  <View style={styles.naukriPillWrap}>
                    {languages.map((lang, i) => (
                      <Text
                        key={`${lang}-${i}`}
                        style={{
                          ...styles.skillTag,
                          backgroundColor: "#F3F4F6",
                          color: "#374151",
                          marginBottom: 5,
                        }}
                      >
                        {lang}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {hasExtraProfileInfo(data) && (
                <View style={styles.naukriInfoGrid}>
                  {hasText((data as any).currentCtc) && (
                    <View style={styles.naukriInfoCard}>
                      <Text style={{ ...styles.smallText, color: "#6B7280" }}>Current CTC</Text>
                      <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>
                        {(data as any).currentCtc}
                      </Text>
                    </View>
                  )}
                  {hasText((data as any).expectedCtc) && (
                    <View style={styles.naukriInfoCard}>
                      <Text style={{ ...styles.smallText, color: "#6B7280" }}>Expected CTC</Text>
                      <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>
                        {(data as any).expectedCtc}
                      </Text>
                    </View>
                  )}
                   {hasText(totalExperience) && (
                    <View style={styles.naukriInfoCard}>
                      <Text style={{ ...styles.smallText, color: "#6B7280" }}>Total Experience</Text>
                      <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>
                        {totalExperience}
                      </Text>
                    </View>
                  )}
                  {hasText((data as any).relevantExperience) && (
                    <View style={styles.naukriInfoCard}>
                      <Text style={{ ...styles.smallText, color: "#6B7280" }}>Relevant Experience</Text>
                      <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>
                        {(data as any).relevantExperience}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Section>
          )}
        </View>
      </Page>
    </Document>
  );
}

function BlueProfessionalPhotoTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette((data as any).theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: "32%" }}>
            {hasContact(data) && (
              <Section title="Contact" palette={palette}>
                <ContactBlock data={data} palette={palette} />
              </Section>
            )}

            {hasSkills(data) && (
              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>
            )}
          </View>

          <View style={{ width: "68%" }}>
            <Text style={{ ...styles.name, color: palette.primary }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>

            <Text style={{ ...styles.role, color: palette.subText }}>
              {cleanText(data.role) || "Your Role"}
            </Text>

            {hasSummary(data) && (
              <Section title="Summary" palette={palette}>
                <SummaryBlock data={data} palette={palette} />
              </Section>
            )}

            {hasExperience(data) && (
              <Section title="Experience" palette={palette}>
                <ExperienceBlock data={data} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* ROUTER */
export function ResumeDocumentRouter({ data }: { data: ResumeData }) {
  const layout = (data as any).layout;

  // FIRST check uploaded templates
  if (layout && layout in uploadedPdfResumeTemplates) {
    return renderUploadedPdfTemplate(
      layout as UploadedPdfTemplateKey,
      data
    );
  }

  switch (layout) {
    case "classicSidebar":
      return <ClassicSidebarTemplate data={data} />;
    case "accentHeader":
      return <AccentHeaderTemplate data={data} />;
    case "splitTwoColumn":
      return <SplitTwoColumnTemplate data={data} />;
    case "timeline":
      return <TimelineTemplate data={data} />;
    case "minimalClean":
      return <MinimalCleanTemplate data={data} />;
    case "modernCorporate":
      return <ModernCorporateTemplate data={data} />;
    case "atsCompact":
      return <AtsCompactTemplate data={data} />;
    case "elegantSidebar":
      return <ElegantSidebarTemplate data={data} />;
    case "template9":
      return <ModernLeftBarTemplate data={data} />;
    case "template10":
      return <SimpleHeaderTemplate data={data} />;
    case "template11":
      return <CompactProTemplate data={data} />;
    case "template12":
      return <BoldNameTemplate data={data} />;
    case "template13":
      return <InfographicBarTemplate data={data} />;
    case "template14":
      return <TopContactBarTemplate data={data} />;
    case "template15":
      return <ExecutiveTemplate data={data} />;
    case "template16":
      return <TwoToneSplitTemplate data={data} />;
    case "template17":
      return <MinimalistLineTemplate data={data} />;
    case "template18":
      return <CardStackTemplate data={data} />;
    case "template19":
      return <FreshGraduateTemplate data={data} />;
    case "template20":
      return <TechDarkTemplate data={data} />;
    case "naukriStyle":
      return <NaukriStyleTemplate data={data} />;
     case "BlueProfessionalPhoto":
      return <BlueProfessionalPhotoTemplate data={data} />;
    default:
      return <ClassicSidebarTemplate data={data} />;
  }
}

export default ResumeDocumentRouter;
