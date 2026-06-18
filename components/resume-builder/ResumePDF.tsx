import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  Image,
  Svg,
  Path,
  Rect,
  Circle,
} from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume";
import {
  getBasePageStyle,
  getThemePalette as resolveThemePalette,
  styles
} from "@/lib/resumePdfStyles";

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

/* -------------------- CONTACT ICONS (lucide paths as react-pdf Svg) -------------------- */

type ContactType = "mail" | "phone" | "map" | "linkedin";

function PdfIcon({
  type,
  color,
  size = 9,
}: {
  type: ContactType;
  color: string;
  size?: number;
}) {
  const s = { stroke: color, strokeWidth: 2, fill: "none" } as const;

  let parts: React.ReactNode[] = [];
  if (type === "mail") {
    parts = [
      <Rect key="r" x={2} y={4} width={20} height={16} rx={2} {...s} />,
      <Path key="p" d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...s} />,
    ];
  } else if (type === "phone") {
    parts = [
      <Path
        key="p"
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        {...s}
      />,
    ];
  } else if (type === "map") {
    parts = [
      <Path
        key="p"
        d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"
        {...s}
      />,
      <Circle key="c" cx={12} cy={10} r={3} {...s} />,
    ];
  } else if (type === "linkedin") {
    parts = [
      <Path
        key="p"
        d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
        {...s}
      />,
      <Rect key="r" x={2} y={9} width={4} height={12} {...s} />,
      <Circle key="c" cx={4} cy={4} r={2} {...s} />,
    ];
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {parts}
    </Svg>
  );
}

/** Icon + value. `block` (sidebar) lets the text wrap on its own line. */
function ContactItem({
  type,
  value,
  color,
  fontSize = 8.7,
  block,
}: {
  type: ContactType;
  value: string;
  color: string;
  fontSize?: number;
  block?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: block ? "flex-start" : "center",
        marginRight: block ? 0 : 10,
        marginBottom: 3,
      }}
    >
      <PdfIcon type={type} color={color} size={fontSize + 1.3} />
      <Text
        style={{
          fontSize,
          color,
          marginLeft: 3,
          lineHeight: 1.3,
          ...(block ? { flex: 1 } : {}),
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const CONTACT_TYPES: Array<{ type: ContactType; key: keyof ResumeData }> = [
  { type: "mail", key: "email" },
  { type: "phone", key: "phone" },
  { type: "map", key: "address" },
  { type: "linkedin", key: "linkedin" },
];

/** A wrapping row / stacked list of contact items with icons, shared by templates. */
function ContactRow({
  data,
  color,
  fontSize = 8.7,
  block,
  justify,
}: {
  data: ResumeData;
  color: string;
  fontSize?: number;
  block?: boolean;
  justify?: "flex-start" | "center";
}) {
  const items = CONTACT_TYPES.map(({ type, key }) => ({
    type,
    value: cleanText(data[key] as string | undefined),
  })).filter((i) => i.value);

  if (!items.length) return null;

  return (
    <View
      style={{
        flexDirection: block ? "column" : "row",
        flexWrap: "wrap",
        justifyContent: justify ?? "flex-start",
      }}
    >
      {items.map((i, idx) => (
        <ContactItem
          key={idx}
          type={i.type}
          value={i.value}
          color={color}
          fontSize={fontSize}
          block={block}
        />
      ))}
    </View>
  );
}

/** Rounded profile photo. Renders nothing when there is no photo. */
function Avatar({
  src,
  size = 64,
  borderColor,
}: {
  src?: string | null;
  size?: number;
  borderColor?: string;
}) {
  if (!hasText(src)) return null;
  return (
    <Image
      src={src as string}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        objectFit: "cover",
        ...(borderColor
          ? { borderWidth: 1.5, borderStyle: "solid" as const, borderColor }
          : {}),
      }}
    />
  );
}

function hasSummary(data: ResumeData) {
  return hasText(data.summary);
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
          textAlign: "justify",
        }}
      >
        {text}
      </Text>
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

/* Naukri Style */
function NaukriStyleTemplate({ data }: { data: ResumeData }) {
  const bluePalette = resolveThemePalette((data as any).theme);
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
        <View
          style={{
            ...styles.naukriHeader,
            backgroundColor: bluePalette.soft,
            borderBottomColor: bluePalette.primary,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...styles.naukriName, color: bluePalette.primary }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            <Text style={{ ...styles.naukriRole, color: bluePalette.secondary }}>
              {cleanText(data.role) || "Professional Title"}
            </Text>

            <View style={{ ...styles.naukriContactRow, marginTop: 4 }}>
              <ContactRow data={data} color={bluePalette.secondary} fontSize={9} />
            </View>
          </View>

          {hasText(data.photo) && (
            <View style={{ marginLeft: 14 }}>
              <Avatar src={data.photo} size={70} borderColor={bluePalette.primary} />
            </View>
          )}
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
                            <Text style={{ fontSize: 9.1, color: bluePalette.secondary, marginTop: 2 }}>
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
                  <Text
                    key={`${skill}-${i}`}
                    style={{
                      ...styles.naukriPill,
                      backgroundColor: bluePalette.chipBg,
                      color: bluePalette.chipText,
                      borderColor: bluePalette.border,
                    }}
                  >
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
                          <Text style={{ fontSize: 9, color: bluePalette.secondary, marginTop: 2 }}>
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
            <Section title="Languages" palette={bluePalette}>
              {languages.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                 
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

/* -------------------- SHARED EXTRACTION + BLOCKS -------------------- */

function extractSections(data: ResumeData) {
  const skills = nonEmptyArray((data as any).skills);
  const languages = nonEmptyArray((data as any).languages);

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

  return { skills, languages, experience, education, projects, certifications };
}

function dateRange(start?: string, end?: string, present = "Present") {
  const s = cleanText(start);
  const e = cleanText(end);
  if (!s && !e) return "";
  return `${s}${s || e ? " – " : ""}${e || present}`;
}

function ExperienceList({
  items,
  palette,
}: {
  items: any[];
  palette: ThemePalette;
}) {
  return (
    <View>
      {items.map((exp: any, index: number) => {
        const points = nonEmptyArray(exp?.bullets?.length ? exp.bullets : exp?.points);
        const range = dateRange(exp.startDate || exp.start, exp.endDate || exp.end);
        return (
          <View key={index} style={{ marginBottom: 9 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ width: "72%" }}>
                <Text style={{ fontSize: 10.5, fontWeight: 700, color: palette.text }}>
                  {cleanText(exp.jobTitle) || "Role"}
                </Text>
                {hasText(exp.company) && (
                  <Text style={{ fontSize: 9.2, color: palette.secondary, marginTop: 2 }}>
                    {exp.company}
                  </Text>
                )}
              </View>
              {!!range && (
                <Text style={{ fontSize: 8.4, color: palette.subText, textAlign: "right" }}>
                  {range}
                </Text>
              )}
            </View>
            <View style={{ marginTop: 4 }}>
              {points.map((point, i) => (
                <BulletItem key={i} text={point} color={palette.text} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EducationList({
  items,
  palette,
  compact,
}: {
  items: any[];
  palette: ThemePalette;
  compact?: boolean;
}) {
  return (
    <View>
      {items.map((edu: any, index: number) => {
        const range = dateRange(edu.startYear, edu.endYear, edu.currentlyStudying ? "Present" : "");
        return (
          <View key={index} style={{ marginBottom: compact ? 7 : 8 }}>
            <Text style={{ fontSize: compact ? 9.4 : 10, fontWeight: 700, color: palette.text }}>
              {cleanText(edu.degree) || "Degree"}
            </Text>
            {hasText(edu.institution) && (
              <Text style={{ fontSize: 8.8, color: palette.secondary, marginTop: 1 }}>
                {edu.institution}
              </Text>
            )}
            {!!range && (
              <Text style={{ fontSize: 8.2, color: palette.subText, marginTop: 1 }}>{range}</Text>
            )}
            {!compact && (
              <View style={{ marginTop: 3 }}>
                {nonEmptyArray(edu.highlights).map((highlight, hi) => (
                  <BulletItem key={hi} text={highlight} color={palette.text} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function CertList({
  items,
  palette,
  light,
}: {
  items: any[];
  palette: ThemePalette;
  light?: boolean;
}) {
  return (
    <View>
      {items.map((cert: any, i: number) => (
        <View key={i} style={{ marginBottom: 5 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: light ? palette.sidebarText : palette.text,
            }}
          >
            {typeof cert === "string" ? cert : cleanText(cert?.name) || "Certification"}
          </Text>
          {typeof cert !== "string" && hasText(cert?.issuer) && (
            <Text style={{ fontSize: 8.2, color: light ? palette.chipBg : palette.subText }}>
              {cert.issuer}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function ContactLines({
  data,
  palette,
  light,
}: {
  data: ResumeData;
  palette: ThemePalette;
  light?: boolean;
}) {
  const color = light ? palette.sidebarText : palette.subText;
  return <ContactRow data={data} color={color} fontSize={8.7} block />;
}

/* -------------------- TEMPLATE: CORPORATE SIDEBAR -------------------- */

function CorporateSidebarTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  const sidebarHeading = {
    fontSize: 10,
    fontWeight: 700 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: palette.sidebarText,
    marginBottom: 6,
  };

  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), padding: 0 }}>
        <View style={{ flexDirection: "row", minHeight: "100%" }}>
          {/* Sidebar */}
          <View
            style={{
              width: "33%",
              backgroundColor: palette.sidebarBg,
              paddingVertical: 22,
              paddingHorizontal: 16,
            }}
          >
            {hasText(data.photo) && (
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Avatar src={data.photo} size={88} borderColor={palette.sidebarText} />
              </View>
            )}
            <Text style={{ fontSize: 17, fontWeight: 700, color: palette.sidebarText }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            {hasText(data.role) && (
              <Text style={{ fontSize: 9.5, color: palette.chipBg, marginTop: 3, marginBottom: 14 }}>
                {data.role}
              </Text>
            )}

            <View style={{ marginBottom: 16 }}>
              <Text style={sidebarHeading}>Contact</Text>
              <ContactLines data={data} palette={palette} light />
            </View>

            {skills.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={sidebarHeading}>Technical Skills</Text>
                {skills.map((skill, i) => (
                  <Text
                    key={i}
                    style={{ fontSize: 8.7, color: palette.sidebarText, marginBottom: 3 }}
                  >
                    • {skill}
                  </Text>
                ))}
              </View>
            )}

            {education.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={sidebarHeading}>Education</Text>
                {education.map((edu: any, index: number) => {
                  const range = dateRange(
                    edu.startYear,
                    edu.endYear,
                    edu.currentlyStudying ? "Present" : ""
                  );
                  return (
                    <View key={index} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: 700, color: palette.sidebarText }}>
                        {cleanText(edu.degree) || "Degree"}
                      </Text>
                      {hasText(edu.institution) && (
                        <Text style={{ fontSize: 8.2, color: palette.chipBg, marginTop: 1 }}>
                          {edu.institution}
                        </Text>
                      )}
                      {!!range && (
                        <Text style={{ fontSize: 8, color: palette.chipBg, marginTop: 1 }}>
                          {range}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {certifications.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={sidebarHeading}>Certifications</Text>
                <CertList items={certifications} palette={palette} light />
              </View>
            )}

            {languages.length > 0 && (
              <View>
                <Text style={sidebarHeading}>Languages</Text>
                {languages.map((lang, i) => (
                  <Text
                    key={i}
                    style={{ fontSize: 8.7, color: palette.sidebarText, marginBottom: 3 }}
                  >
                    • {lang}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Main */}
          <View style={{ width: "67%", paddingVertical: 22, paddingHorizontal: 20 }}>
            {hasSummary(data) && (
              <Section title="Professional Summary" palette={palette}>
                <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
              </Section>
            )}

            {experience.length > 0 && (
              <Section title="Work Experience" palette={palette}>
                <ExperienceList items={experience} palette={palette} />
              </Section>
            )}

            {projects.length > 0 && (
              <Section title="Projects" palette={palette}>
                <ProjectsBlock data={{ ...data, projects } as ResumeData} palette={palette} />
              </Section>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* -------------------- TEMPLATE: ATS CLASSIC (single column) -------------------- */

function AtsSectionTitle({ title, palette }: { title: string; palette: ThemePalette }) {
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: palette.primary,
        marginBottom: 7,
        marginTop: 4,
        paddingBottom: 2,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: palette.primary,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function AtsClassicTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), paddingHorizontal: 38, paddingVertical: 30 }}>
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          {hasText(data.photo) && (
            <View style={{ marginBottom: 6 }}>
              <Avatar src={data.photo} size={66} borderColor={palette.border} />
            </View>
          )}
          <Text style={{ fontSize: 21, fontWeight: 700, color: palette.text, letterSpacing: 0.5 }}>
            {cleanText(data.fullName) || "Your Name"}
          </Text>
          {hasText(data.role) && (
            <Text style={{ fontSize: 11, color: palette.primary, marginTop: 3 }}>{data.role}</Text>
          )}
          <View style={{ marginTop: 5, maxWidth: "94%" }}>
            <ContactRow data={data} color={palette.subText} fontSize={8.8} justify="center" />
          </View>
        </View>

        {hasSummary(data) && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Summary" palette={palette} />
            <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
          </View>
        )}

        {skills.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Technical Skills" palette={palette} />
            <Text style={{ fontSize: 9.3, color: palette.text, lineHeight: 1.55 }}>
              {skills.join("  •  ")}
            </Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Professional Experience" palette={palette} />
            <ExperienceList items={experience} palette={palette} />
          </View>
        )}

        {projects.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Projects" palette={palette} />
            <ProjectsBlock data={{ ...data, projects } as ResumeData} palette={palette} />
          </View>
        )}

        {education.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Education" palette={palette} />
            <EducationList items={education} palette={palette} />
          </View>
        )}

        {certifications.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Certifications" palette={palette} />
            <CertList items={certifications} palette={palette} />
          </View>
        )}

        {languages.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <AtsSectionTitle title="Languages" palette={palette} />
            <Text style={{ fontSize: 9.3, color: palette.text, lineHeight: 1.55 }}>
              {languages.join("  •  ")}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

/* -------------------- TEMPLATE: MODERN BAND (header band + two-column body) -------------------- */

function ModernBandTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  return (
    <Document>
      <Page size="A4" style={{ ...getBasePageStyle(data, palette), padding: 0 }}>
        {/* Header band */}
        <View
          style={{
            backgroundColor: palette.primary,
            paddingVertical: 20,
            paddingHorizontal: 28,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 23, fontWeight: 700, color: "#FFFFFF" }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            {hasText(data.role) && (
              <Text style={{ fontSize: 11.5, color: palette.chipBg, marginTop: 3 }}>{data.role}</Text>
            )}
            <View style={{ marginTop: 8 }}>
              <ContactRow data={data} color="#FFFFFF" fontSize={8.7} />
            </View>
          </View>

          {hasText(data.photo) && (
            <View style={{ marginLeft: 16 }}>
              <Avatar src={data.photo} size={74} borderColor="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", paddingHorizontal: 24, paddingVertical: 20 }}>
          {/* Left narrow column */}
          <View style={{ width: "34%", paddingRight: 16 }}>
            {skills.length > 0 && (
              <Section title="Skills" palette={palette}>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {skills.map((skill, i) => (
                    <Text
                      key={i}
                      style={{
                        fontSize: 8.2,
                        paddingVertical: 3,
                        paddingHorizontal: 7,
                        borderRadius: 4,
                        marginRight: 4,
                        marginBottom: 4,
                        backgroundColor: palette.chipBg,
                        color: palette.chipText,
                      }}
                    >
                      {skill}
                    </Text>
                  ))}
                </View>
              </Section>
            )}

            {education.length > 0 && (
              <Section title="Education" palette={palette}>
                <EducationList items={education} palette={palette} compact />
              </Section>
            )}

            {certifications.length > 0 && (
              <Section title="Certifications" palette={palette}>
                <CertList items={certifications} palette={palette} />
              </Section>
            )}

            {languages.length > 0 && (
              <Section title="Languages" palette={palette}>
                {languages.map((lang, i) => (
                  <Text key={i} style={{ fontSize: 8.8, color: palette.text, marginBottom: 3 }}>
                    • {lang}
                  </Text>
                ))}
              </Section>
            )}
          </View>

          {/* Right main column */}
          <View style={{ width: "66%" }}>
            {hasSummary(data) && (
              <Section title="Profile" palette={palette}>
                <Text style={{ ...styles.text, color: palette.text }}>{data.summary}</Text>
              </Section>
            )}

            {experience.length > 0 && (
              <Section title="Experience" palette={palette}>
                <ExperienceList items={experience} palette={palette} />
              </Section>
            )}

            {projects.length > 0 && (
              <Section title="Projects" palette={palette}>
                <ProjectsBlock data={{ ...data, projects } as ResumeData} palette={palette} />
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
  switch ((data as any).layout) {
    case "corporateSidebar":
      return <CorporateSidebarTemplate data={data} />;
    case "atsClassic":
      return <AtsClassicTemplate data={data} />;
    case "modernBand":
      return <ModernBandTemplate data={data} />;
    case "naukriStyle":
    default:
      return <NaukriStyleTemplate data={data} />;
  }
}

export default ResumeDocumentRouter;
