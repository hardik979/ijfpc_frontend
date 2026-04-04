import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";
import type { ResumeData} from "@/lib/resume";

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

const styles = StyleSheet.create({
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
  },

  text: {
    fontSize: 9.7,
    lineHeight: 1.5,
    marginBottom: 3,
  },

  smallText: {
    fontSize: 8.8,
    lineHeight: 1.4,
  },

  bullet: {
    fontSize: 9.5,
    lineHeight: 1.45,
    marginBottom: 3,
  },

  itemTitle: {
    fontSize: 10.5,
    fontWeight: 700,
  },

  subText: {
    fontSize: 8.8,
    marginBottom: 4,
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
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },

  eduCard: {
    paddingBottom: 6,
    marginBottom: 6,
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
});

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
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

function getFontFamily(fontFamily?: string) {
  if (fontFamily === "Times-Roman") return "Times-Roman";
  if (fontFamily === "Courier") return "Courier";
  return "Helvetica";
}

function getBasePageStyle(data: ResumeData, palette: ThemePalette) {
  return {
    ...styles.page,
    fontFamily: getFontFamily(data.fontFamily),
    fontSize: data.fontSize || 10.5,
    color: palette.text,
  };
}

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

  return (
    <View style={styles.sectionTight}>
      {data.phone ? (
        <Text style={{ ...styles.contactLine, color }}>{data.phone}</Text>
      ) : null}
      {data.email ? (
        <Text style={{ ...styles.contactLine, color }}>{data.email}</Text>
      ) : null}
      {data.linkedin ? (
        <Link
          src={data.linkedin}
          style={{ ...styles.contactLine, ...styles.link, color }}
        >
          {data.linkedin}
        </Link>
      ) : null}
      {data.address ? (
        <Text style={{ ...styles.contactLine, color }}>{data.address}</Text>
      ) : null}
    </View>
  );
}

function SummaryBlock({
  data,
  palette,
}: {
  data: ResumeData;
  palette: ThemePalette;
}) {
  if (!data.summary) return null;

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
  const skills = safeArray(data.skills);
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
  const languages = safeArray(data.languages);
  if (!languages.length) return null;

  const color = light ? palette.sidebarText : palette.text;

  return (
    <View>
      {languages.map((lang, index) => (
        <Text key={`${lang}-${index}`} style={{ ...styles.text, color }}>
          • {lang}
        </Text>
      ))}
    </View>
  );
}

function ExperienceBlock({
  data,
  palette,
}: {
  data: ResumeData;
  palette: ThemePalette;
}) {
  const experience = safeArray(data.experience);
  if (!experience.length) return null;

  return (
    <View>
      {experience.map((exp, index) => {
        const points = safeArray(
          exp.bullets?.length ? exp.bullets : exp.points
        );

        return (
          <View
            key={index}
            style={{
              ...styles.expCard,
              borderBottomColor: palette.border,
            }}
          >
            <Text style={{ ...styles.itemTitle, color: palette.primary }}>
              {exp.jobTitle || "Role"}
              {exp.company ? ` | ${exp.company}` : ""}
            </Text>

            <Text style={{ ...styles.subText, color: palette.subText }}>
              {exp.startDate || exp.start || ""}
              {(exp.startDate || exp.start || exp.endDate || exp.end)
                ? " - "
                : ""}
              {exp.endDate || exp.end || "Present"}
            </Text>

            {points.map((point, i) => (
              <Text key={i} style={{ ...styles.bullet, color: palette.text }}>
                • {point}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function EducationBlock({
  data,
  palette,
}: {
  data: ResumeData;
  palette: ThemePalette;
}) {
  const education = safeArray(data.education);
  if (!education.length) return null;

  return (
    <View>
      {education.map((edu, index) => (
        <View
          key={index}
          style={{
            ...styles.eduCard,
            borderBottomColor: palette.border,
          }}
        >
          <Text style={{ ...styles.itemTitle, color: palette.primary }}>
            {edu.degree || "Degree"}
          </Text>
          <Text style={{ ...styles.subText, color: palette.subText }}>
            {edu.institution || ""}
          </Text>
          <Text style={{ ...styles.smallText, color: palette.subText }}>
            {edu.startYear || ""}
            {edu.startYear || edu.endYear ? " - " : ""}
            {edu.endYear || ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProjectsBlock({
  data,
  palette,
}: {
  data: ResumeData;
  palette: ThemePalette;
}) {
  const projects = safeArray(data.projects);
  if (!projects.length) return null;

  return (
    <View>
      {projects.map((project, index) => (
        <View
          key={index}
          style={{
            ...styles.expCard,
            borderBottomColor: palette.border,
          }}
        >
          <Text style={{ ...styles.itemTitle, color: palette.primary }}>
            {project.name || "Project"}
          </Text>

          {project.techStack ? (
            <Text style={{ ...styles.subText, color: palette.subText }}>
              Tech Stack: {project.techStack}
            </Text>
          ) : null}

          {project.link ? (
            <Link
              src={project.link}
              style={{
                ...styles.subText,
                ...styles.link,
                color: palette.secondary,
              }}
            >
              {project.link}
            </Link>
          ) : null}

          {safeArray(project.bullets).map((bullet, i) => (
            <Text key={i} style={{ ...styles.bullet, color: palette.text }}>
              • {bullet}
            </Text>
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
      {showImage && data.profileImage ? (
        <Image
          src={data.profileImage}
          style={centered ? styles.heroImage : styles.image}
        />
      ) : null}

      <Text
        style={{
          ...styles.name,
          color: palette.primary,
          ...(centered ? styles.centerText : {}),
        }}
      >
        {data.fullName || "Your Name"}
      </Text>

      <Text
        style={{
          ...styles.role,
          color: palette.subText,
          ...(centered ? styles.centerText : {}),
        }}
      >
        {data.role || "Your Role"}
      </Text>
    </View>
  );
}

function ClassicSidebarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <View
              style={{
                ...styles.sidebarBox,
                backgroundColor: palette.sidebarBg,
              }}
            >
              {data.profileImage ? (
                <Image src={data.profileImage} style={styles.image} />
              ) : null}

              <Text style={{ ...styles.heading, color: palette.sidebarText }}>
                Contact
              </Text>
              <ContactBlock data={data} palette={palette} light />

              <View
                style={{
                  ...styles.divider,
                  backgroundColor: "rgba(255,255,255,0.18)",
                }}
              />

              <Text style={{ ...styles.heading, color: palette.sidebarText }}>
                Skills
              </Text>
              <SkillsBlock data={data} palette={palette} light />

              <View
                style={{
                  ...styles.divider,
                  backgroundColor: "rgba(255,255,255,0.18)",
                }}
              />

              <Text style={{ ...styles.heading, color: palette.sidebarText }}>
                Languages
              </Text>
              <LanguagesBlock data={data} palette={palette} light />
            </View>
          </View>

          <View style={styles.rightCol}>
            <HeaderIntro data={data} palette={palette} showImage={false} />
            <View style={{ ...styles.divider, backgroundColor: palette.border }} />

            <Section title="Summary" palette={palette}>
              <SummaryBlock data={data} palette={palette} />
            </Section>

            <Section title="Experience" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>

            <Section title="Projects" palette={palette}>
              <ProjectsBlock data={data} palette={palette} />
            </Section>

            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function AccentHeaderTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View
          style={{
            ...styles.headerCard,
            backgroundColor: palette.primary,
          }}
        >
          <Text style={{ ...styles.name, color: "#FFFFFF" }}>
            {data.fullName || "Your Name"}
          </Text>
          <Text style={{ ...styles.role, color: "#E5E7EB" }}>
            {data.role || "Your Role"}
          </Text>

          <View style={{ marginTop: 8 }}>
            {data.phone ? (
              <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>
                {data.phone}
              </Text>
            ) : null}
            {data.email ? (
              <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>
                {data.email}
              </Text>
            ) : null}
            {data.linkedin ? (
              <Text style={{ ...styles.smallText, color: "#F3F4F6" }}>
                {data.linkedin}
              </Text>
            ) : null}
          </View>
        </View>

        <Section title="Summary" palette={palette}>
          <SummaryBlock data={data} palette={palette} />
        </Section>

        <Section title="Experience" palette={palette}>
          <ExperienceBlock data={data} palette={palette} />
        </Section>

        <View style={styles.row}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} />
            </Section>

            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>
          </View>

          <View style={{ width: "50%", paddingLeft: 8 }}>
            <Section title="Projects" palette={palette}>
              <ProjectsBlock data={data} palette={palette} />
            </Section>

            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function SplitTwoColumnTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <HeaderIntro data={data} palette={palette} />
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />

        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Section title="Contact" palette={palette}>
              <ContactBlock data={data} palette={palette} />
            </Section>

            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} />
            </Section>

            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>

            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          </View>

          <View style={styles.rightCol}>
            <Section title="Summary" palette={palette}>
              <SummaryBlock data={data} palette={palette} />
            </Section>

            <Section title="Experience" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>

            <Section title="Projects" palette={palette}>
              <ProjectsBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function TimelineTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);
  const experience = safeArray(data.experience);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <HeaderIntro data={data} palette={palette} centered />
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />

        <Section title="Summary" palette={palette}>
          <SummaryBlock data={data} palette={palette} />
        </Section>

        <Section title="Experience Timeline" palette={palette}>
          <View>
            {experience.map((exp, index) => {
              const points = safeArray(
                exp.bullets?.length ? exp.bullets : exp.points
              );

              return (
                <View
                  key={index}
                  style={{
                    ...styles.timelineItem,
                    borderLeftColor: palette.primary,
                  }}
                >
                  <Text style={{ ...styles.itemTitle, color: palette.primary }}>
                    {exp.jobTitle || "Role"}
                    {exp.company ? ` | ${exp.company}` : ""}
                  </Text>

                  <Text style={{ ...styles.subText, color: palette.subText }}>
                    {exp.startDate || exp.start || ""}
                    {" - "}
                    {exp.endDate || exp.end || "Present"}
                  </Text>

                  {points.map((point, i) => (
                    <Text key={i} style={{ ...styles.bullet, color: palette.text }}>
                      • {point}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        </Section>

        <View style={styles.row}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            <Section title="Projects" palette={palette}>
              <ProjectsBlock data={data} palette={palette} />
            </Section>
          </View>

          <View style={{ width: "50%", paddingLeft: 8 }}>
            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>

            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function MinimalCleanTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={{ ...styles.accentStrip, backgroundColor: palette.primary }} />
        <HeaderIntro data={data} palette={palette} />
        <View style={{ ...styles.divider, backgroundColor: palette.border }} />

        <Section title="Summary" palette={palette}>
          <Text style={{ ...styles.text, color: palette.text }}>
            {data.summary || ""}
          </Text>
        </Section>

        <Section title="Experience" palette={palette}>
          <ExperienceBlock data={data} palette={palette} />
        </Section>

        <Section title="Projects" palette={palette}>
          <ProjectsBlock data={data} palette={palette} />
        </Section>

        <View style={styles.row}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          </View>

          <View style={{ width: "50%", paddingLeft: 8 }}>
            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} />
            </Section>

            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function ModernCorporateTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

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
              <Text style={{ ...styles.name, color: palette.primary }}>
                {data.fullName || "Your Name"}
              </Text>

              <Text style={{ ...styles.role, color: palette.subText }}>
                {data.role || "Your Role"}
              </Text>

              <View style={{ marginTop: 8 }}>
                {data.phone ? (
                  <Text style={{ ...styles.smallText, color: palette.text }}>
                    Phone: {data.phone}
                  </Text>
                ) : null}
                {data.email ? (
                  <Text style={{ ...styles.smallText, color: palette.text }}>
                    Email: {data.email}
                  </Text>
                ) : null}
                {data.linkedin ? (
                  <Text style={{ ...styles.smallText, color: palette.text }}>
                    LinkedIn: {data.linkedin}
                  </Text>
                ) : null}
                {data.address ? (
                  <Text style={{ ...styles.smallText, color: palette.text }}>
                    Address: {data.address}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={{ width: "28%", alignItems: "flex-end" }}>
              {data.profileImage ? (
                <Image src={data.profileImage} style={styles.heroImage} />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ width: "65%", paddingRight: 10 }}>
            <Section title="Professional Summary" palette={palette}>
              <SummaryBlock data={data} palette={palette} />
            </Section>

            <Section title="Work Experience" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>

            <Section title="Projects" palette={palette}>
              <ProjectsBlock data={data} palette={palette} />
            </Section>
          </View>

          <View style={{ width: "35%", paddingLeft: 10 }}>
            <Section title="Skills" palette={palette}>
              <SkillsBlock data={data} palette={palette} />
            </Section>

            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>

            <Section title="Languages" palette={palette}>
              <LanguagesBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function AtsCompactTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <Text style={{ ...styles.name, color: palette.text }}>
          {data.fullName || "Your Name"}
        </Text>

        <Text style={{ ...styles.role, color: palette.subText }}>
          {data.role || "Your Role"}
        </Text>

        <Text style={{ ...styles.smallText, color: palette.text, marginTop: 5 }}>
          {[data.phone, data.email, data.linkedin, data.address]
            .filter(Boolean)
            .join(" | ")}
        </Text>

        <View style={{ ...styles.divider, backgroundColor: palette.border }} />

        <Section title="Summary" palette={palette}>
          <Text style={{ ...styles.text, color: palette.text }}>
            {data.summary || ""}
          </Text>
        </Section>

        <Section title="Experience" palette={palette}>
          <ExperienceBlock data={data} palette={palette} />
        </Section>

        <Section title="Projects" palette={palette}>
          <ProjectsBlock data={data} palette={palette} />
        </Section>

        <Section title="Education" palette={palette}>
          <EducationBlock data={data} palette={palette} />
        </Section>

        <Section title="Skills" palette={palette}>
          <Text style={{ ...styles.text, color: palette.text }}>
            {safeArray(data.skills).join(", ")}
          </Text>
        </Section>

        <Section title="Languages" palette={palette}>
          <Text style={{ ...styles.text, color: palette.text }}>
            {safeArray(data.languages).join(", ")}
          </Text>
        </Section>
      </Page>
    </Document>
  );
}

function ElegantSidebarTemplate({ data }: { data: ResumeData }) {
  const palette = getThemePalette(data.theme);

  return (
    <Document>
      <Page size="A4" style={getBasePageStyle(data, palette)}>
        <View style={styles.row}>
          <View
            style={{
              width: "30%",
              paddingRight: 14,
            }}
          >
            <View
              style={{
                ...styles.sidebarBox,
                backgroundColor: palette.soft,
                borderStyle: "solid",
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              {data.profileImage ? (
                <Image src={data.profileImage} style={styles.image} />
              ) : null}

              <Section title="Contact" palette={palette}>
                <ContactBlock data={data} palette={palette} />
              </Section>

              <Section title="Skills" palette={palette}>
                <SkillsBlock data={data} palette={palette} />
              </Section>

              <Section title="Languages" palette={palette}>
                <LanguagesBlock data={data} palette={palette} />
              </Section>
            </View>
          </View>

          <View style={{ width: "70%", paddingLeft: 14 }}>
            <Text style={{ ...styles.name, color: palette.primary }}>
              {data.fullName || "Your Name"}
            </Text>

            <Text style={{ ...styles.role, color: palette.subText }}>
              {data.role || "Your Role"}
            </Text>

            <View style={{ ...styles.divider, backgroundColor: palette.border }} />

            <Section title="Profile Summary" palette={palette}>
              <SummaryBlock data={data} palette={palette} />
            </Section>

            <Section title="Experience" palette={palette}>
              <ExperienceBlock data={data} palette={palette} />
            </Section>

            <Section title="Projects" palette={palette}>
              <ProjectsBlock data={data} palette={palette} />
            </Section>

            <Section title="Education" palette={palette}>
              <EducationBlock data={data} palette={palette} />
            </Section>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function ResumeDocumentRouter({ data }: { data: ResumeData }) {
  switch (data.layout) {
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
    default:
      return <ClassicSidebarTemplate data={data} />;
  }
}

export default ResumeDocumentRouter;