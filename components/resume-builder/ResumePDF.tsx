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
import type { Style } from "@react-pdf/types";
import {
  normalizeSectionPages,
  type ResumeData,
  type SectionKey,
} from "@/lib/resume";
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
  // strip zero-width characters too: they survive trim(), render as ghost
  // empty bullets, and can push an invisible line onto an extra PDF page
  return String(value ?? "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .trim();
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

/* -------------------- SECTION ORDER (drag-and-drop layout) -------------------- */

/** Flattened position of each section in the user's page layout, used by the
 *  two-column templates to order sections within their fixed columns. */
function sectionRankMap(data: ResumeData) {
  const rank = new Map<SectionKey, number>();
  normalizeSectionPages(data.sectionPages)
    .flat()
    .forEach((key, i) => rank.set(key, i));
  return rank;
}

type RankedSection = { key: SectionKey; node: React.ReactNode };

function orderByRank(items: RankedSection[], rank: Map<SectionKey, number>) {
  return items
    .filter((s) => s.node)
    .sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99));
}

/* -------------------- REUSABLE BLOCKS -------------------- */

/** Just the coloured bar + section title. Extracted so list components
 *  (ExperienceList/ProjectsBlock) can weld the heading to their first entry. */
function SectionHeading({ title, palette }: { title: string; palette: ThemePalette }) {
  return (
    <View>
      <View style={{ ...styles.sectionBar, backgroundColor: palette.primary }} />
      <Text style={{ ...styles.heading, color: palette.primary }}>{title}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  palette,
  keepTogether,
}: {
  title: string;
  children: React.ReactNode;
  palette: ThemePalette;
  /** Short sections pass this to render as one atomic block so the heading is
   *  never split from its content across a page break (no orphaned heading). */
  keepTogether?: boolean;
}) {
  return (
    <View style={styles.section} wrap={keepTogether ? false : undefined}>
      {/* keepTogether sections are atomic already, so their heading can never
          orphan. For the rest (summary/certifications — single blocks that
          can't weld to a "first entry"), a modest reserve keeps a lone heading
          off the page bottom. Experience/Projects don't use this: they bind
          the heading to their first entry inside the list components instead. */}
      <View minPresenceAhead={keepTogether ? undefined : 48}>
        <SectionHeading title={title} palette={palette} />
      </View>
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Common tech + role phrases that get bolded in the summary even when the
 * user did not add them to the Skills section.
 */
const COMMON_HIGHLIGHT_TERMS = [
  // roles
  "Full Stack Developer",
  "Frontend Developer",
  "Front End Developer",
  "Backend Developer",
  "Back End Developer",
  "MERN Stack Developer",
  "Software Engineer",
  "Software Developer",
  "Web Developer",
  "Data Analyst",
  "Data Scientist",
  "Data Engineer",
  "DevOps Engineer",
  "QA Engineer",
  // tech
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Express.js",
  "React.js",
  "Next.js",
  "Vue.js",
  "Angular",
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "NoSQL",
  "SQL",
  "Python",
  "Java",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "Redux",
  "REST APIs",
  "REST API",
  "GraphQL",
  "AWS",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "GitHub",
  "CI/CD",
  "Linux",
  "PHP",
  "Django",
  "Flask",
  "Spring Boot",
  "Power BI",
  "Tableau",
  "Excel",
  "Machine Learning",
  "Data Analysis",
];

/**
 * Turns a term into a separator-tolerant regex so "Node.js", "NodeJS" and
 * "node js" all match each other; a trailing "js" is optional so the skill
 * "React.js" still matches plain "React" in the text. Only non-capturing
 * groups here — HighlightedSummary relies on the outer group being the
 * single capture.
 */
function flexibleTermPattern(term: string): string | null {
  const tokens = cleanText(term).split(/[\s./\\_-]+/).filter(Boolean);
  if (!tokens.length) return null;

  const SEP = "[\\s./-]*";
  return tokens
    .map((token, i) => {
      const isLast = i === tokens.length - 1;
      if (isLast && tokens.length > 1 && /^js$/i.test(token)) return "(?:js)?";
      if (isLast && token.length > 3 && /js$/i.test(token)) {
        return `${escapeRegExp(token.slice(0, -2))}${SEP}(?:js)?`;
      }
      return escapeRegExp(token);
    })
    .join(SEP);
}

/**
 * Builds a regex matching phrases worth emphasizing in the summary:
 * - years-of-experience phrases ("3.9-year", "3+ years of experience", "2 yrs")
 * - the resume's job title (data.role)
 * - skills from the Skills section + common tech/role terms
 */
function buildHighlightRegex(skills: string[], role?: string) {
  const experiencePattern =
    "\\d+(?:\\.\\d+)?[\\s-]*\\+?[\\s-]*(?:years?|yrs?)(?:[\\s-]+of[\\s-]+experience)?(?![A-Za-z])";

  const seen = new Set<string>();
  const termPatterns = [cleanText(role ?? ""), ...skills, ...COMMON_HIGHLIGHT_TERMS]
    .map((term) => cleanText(term))
    .filter(Boolean)
    // longest first so "JavaScript" wins over "Java" in the alternation
    .sort((a, b) => b.length - a.length)
    .filter((term) => {
      const key = term.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(flexibleTermPattern)
    .filter((p): p is string => Boolean(p));

  try {
    // lookarounds keep partial words from matching (e.g. "SQL" inside "MySQL")
    const bounded = termPatterns.map(
      (p) => `(?<![A-Za-z0-9+#.])${p}(?![A-Za-z0-9+#])`
    );
    return new RegExp(`(${[experiencePattern, ...bounded].join("|")})`, "gi");
  } catch {
    // older engines without lookbehind support
    return new RegExp(`(${[experiencePattern, ...termPatterns].join("|")})`, "gi");
  }
}

/** Summary paragraph with experience phrases and skill names rendered bold. */
function HighlightedSummary({
  data,
  style,
}: {
  data: ResumeData;
  style: Style;
}) {
  const summary = cleanText(data.summary);
  const skills = nonEmptyArray((data as any).skills);
  const regex = buildHighlightRegex(skills, cleanText(data.role));

  // split with a capturing group: odd indices are the matched phrases
  const segments = summary.split(regex);

  return (
    <Text style={style}>
      {segments.map((segment, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontWeight: 700 }}>
            {segment}
          </Text>
        ) : (
          segment
        )
      )}
    </Text>
  );
}

function ProjectsBlock({
  data,
  palette,
  heading,
}: {
  data: ResumeData;
  palette: ThemePalette;
  /** Optional section heading welded to the first project so it never orphans. */
  heading?: React.ReactNode;
}) {
  const projects = safeArray((data as any).projects).filter((project: any) => {
    const bullets = nonEmptyArray(project?.bullets);
    return (
      hasText(project?.name) ||
      hasText(project?.techStack) ||
      hasText(project?.link) ||
      bullets.length > 0
    );
  });

  if (!projects.length) return heading ? <>{heading}</> : null;

  // Project name + tech + link — kept together via minPresenceAhead.
  const renderMeta = (project: any) => (
    <View minPresenceAhead={30}>
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
    </View>
  );

  const renderBullets = (project: any) =>
    nonEmptyArray(project.bullets).map((bullet, i) => (
      <BulletItem key={i} text={bullet} color={palette.text} />
    ));

  const renderProject = (project: any, index: number) => (
    <View key={index} style={{ ...styles.expCard, borderBottomColor: palette.border }}>
      {renderMeta(project)}
      {renderBullets(project)}
    </View>
  );

  return (
    <View>
      {/* The heading carries a minPresenceAhead reserve big enough for the
          heading + the first project's name/meta, so it drags the first project
          along and never orphans — WITHOUT a wrap={false} block (which react-pdf
          crams against previous content when it lands at a page boundary in the
          two-column flow). If the reserve isn't met, the heading relocates
          cleanly to the next page. */}
      {heading ? <View minPresenceAhead={72}>{heading}</View> : null}
      {projects.map((project: any, i: number) => renderProject(project, i))}
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

  const sectionPages = normalizeSectionPages(data.sectionPages);

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return hasSummary(data) ? (
          <Section title="Profile Summary" palette={bluePalette}>
            <HighlightedSummary data={data} style={{ ...styles.text, color: "#111827" }} />
          </Section>
        ) : null;

      case "experience": {
        if (!experience.length) return null;

        const cardStyle = {
          ...styles.expCard,
          borderBottomColor: "#E5E7EB",
          paddingBottom: 8,
          marginBottom: 8,
        };

        const renderCardHeader = (exp: any) => {
          const start = cleanText(exp.startDate || exp.start);
          const end = cleanText(exp.endDate || exp.end);
          return (
            <View
              // reserve enough for the title+company row plus the first bullet
              // so a job header never lands split (title alone) at a page bottom
              minPresenceAhead={42}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              {/* keep title + company atomic so they never split across a page */}
              <View wrap={false} style={{ width: "72%" }}>
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
          );
        };

        const renderCardBody = (exp: any) => {
          const points = nonEmptyArray(exp?.bullets?.length ? exp.bullets : exp?.points);
          return (
            <>
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
            </>
          );
        };

        const renderExpCard = (exp: any, index: number) => (
          <View key={index} style={cardStyle}>
            {renderCardHeader(exp)}
            {renderCardBody(exp)}
          </View>
        );

        return (
          <View style={styles.section}>
            {/* The heading reserves room for itself + the first card's title row
                so it drags the first card along and never orphans, without a
                wrap={false} block that react-pdf could cram at a page boundary. */}
            <View minPresenceAhead={64}>
              <SectionHeading title="Work Experience" palette={bluePalette} />
            </View>
            {experience.map((exp: any, i: number) => renderExpCard(exp, i))}
          </View>
        );
      }

      case "skills":
        return skills.length > 0 ? (
          <Section title="Technical Skills" palette={bluePalette} keepTogether>
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
        ) : null;

      case "education":
        return education.length > 0 ? (
          <Section title="Education" palette={bluePalette} keepTogether>
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
        ) : null;

      case "projects":
        return projects.length > 0 ? (
          <View style={styles.section}>
            <ProjectsBlock
              data={{ ...data, projects } as ResumeData}
              palette={bluePalette}
              heading={<SectionHeading title="Projects & Open Source" palette={bluePalette} />}
            />
          </View>
        ) : null;

      case "languages":
        return languages.length > 0 || hasExtraProfileInfo(data) ? (
          <Section title="Languages" palette={bluePalette} keepTogether>
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
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...getBasePageStyle(data, bluePalette),
          padding: 0,
          // page padding repeats on every page, so content continued on page 2+
          // starts with a proper top/bottom margin instead of touching the edge
          paddingTop: 16,
          paddingBottom: 18,
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
            // cancel the page's top padding so the header band stays edge-to-edge on page 1
            marginTop: -16,
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

        <View style={{ paddingHorizontal: 18 }}>
          {sectionPages.map((keys, pageIndex) => {
            const rendered = keys
              .map((sectionKey) => ({ sectionKey, node: renderSection(sectionKey) }))
              .filter((s) => s.node);
            // `break` starts each editor page's first section on a fresh PDF
            // page, so the exported PDF mirrors the drag-and-drop layout.
            return rendered.map((s, i) => (
              <View key={s.sectionKey} break={pageIndex > 0 && i === 0}>
                {s.node}
              </View>
            ));
          })}

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
  heading,
}: {
  items: any[];
  palette: ThemePalette;
  /** Optional section heading welded to the first entry so it never orphans. */
  heading?: React.ReactNode;
}) {
  // The title/company/dates row. minPresenceAhead keeps it from being stranded
  // alone at the very bottom of a page (it drags ~1 line of the first bullet).
  const renderHeader = (exp: any, spaced: boolean) => {
    const range = dateRange(exp.startDate || exp.start, exp.endDate || exp.end);
    return (
      <View
        // reserve enough for the whole title+company row plus the first bullet,
        // so a job header never lands split (title alone) at the page bottom
        minPresenceAhead={42}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
          ...(spaced ? { marginTop: 9 } : {}),
        }}
      >
        {/* keep title + company as one atomic block so they never split across
            a page (the row's flex column would otherwise break between them) */}
        <View wrap={false} style={{ width: "72%" }}>
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
    );
  };

  const bulletsOf = (exp: any) =>
    nonEmptyArray(exp?.bullets?.length ? exp.bullets : exp?.points);

  if (!items.length) return heading ? <>{heading}</> : null;

  // The heading carries a minPresenceAhead reserve big enough for itself plus
  // the first job's title row, so it drags the first job along and never
  // orphans — WITHOUT a wrap={false} block (which react-pdf crams against the
  // previous content when it lands at a page boundary in the two-column flow).
  // Everything else is a FLAT sequence of headers + individual bullets so
  // react-pdf can break between any two lines and fill each page fully.
  return (
    <View>
      {heading ? <View minPresenceAhead={64}>{heading}</View> : null}
      {items.map((exp: any, i: number) => (
        <React.Fragment key={i}>
          {renderHeader(exp, i > 0)}
          {bulletsOf(exp).map((point, j) => (
            <BulletItem key={`${i}-${j}`} text={point} color={palette.text} />
          ))}
        </React.Fragment>
      ))}
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
          <View key={index} wrap={false} style={{ marginBottom: compact ? 7 : 8 }}>
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

  // Column membership is fixed by the template; the drag-and-drop layout
  // only decides the order of sections inside each column.
  const rank = sectionRankMap(data);

  const sidebarSections = orderByRank(
    [
      {
        key: "skills",
        node:
          skills.length > 0 ? (
            <View wrap={false} style={{ marginBottom: 16 }}>
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
          ) : null,
      },
      {
        key: "education",
        node:
          education.length > 0 ? (
            <View wrap={false} style={{ marginBottom: 16 }}>
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
          ) : null,
      },
      {
        key: "languages",
        node:
          languages.length > 0 ? (
            <View wrap={false} style={{ marginBottom: 16 }}>
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
          ) : null,
      },
    ],
    rank
  );

  // Only the summary stays beside the sidebar in the two-column intro row.
  const mainSections = orderByRank(
    [
      {
        key: "summary",
        node: hasSummary(data) ? (
          <Section title="Professional Summary" palette={palette}>
            <HighlightedSummary data={data} style={{ ...styles.text, color: palette.text }} />
          </Section>
        ) : null,
      },
    ],
    rank
  );

  // Experience & Projects flow FULL-WIDTH below the two-column intro row.
  // react-pdf cannot page-break content inside a flexDirection:"row", so while
  // these long sections lived in the main column they jumped wholesale to page 2
  // when they didn't fit next to the sidebar — leaving page 1 half-empty. Moving
  // them out of the row lets them fill page 1 and split naturally onto page 2.
  const flowSections = orderByRank(
    [
      {
        key: "experience",
        node:
          experience.length > 0 ? (
            <View style={styles.section}>
              <ExperienceList
                items={experience}
                palette={palette}
                heading={<SectionHeading title="Work Experience" palette={palette} />}
              />
            </View>
          ) : null,
      },
      {
        key: "projects",
        node:
          projects.length > 0 ? (
            <View style={styles.section}>
              <ProjectsBlock
                data={{ ...data, projects } as ResumeData}
                palette={palette}
                heading={<SectionHeading title="Projects" palette={palette} />}
              />
            </View>
          ) : null,
      },
    ],
    rank
  );

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...getBasePageStyle(data, palette),
          padding: 0,
          // repeats on every page → proper top/bottom margin on page 2+
          paddingTop: 16,
          paddingBottom: 16,
          // horizontal padding lives on the Page so the full-width flow region
          // below the intro row inherits a proper left/right margin on every page
          paddingHorizontal: 28,
        }}
      >
        {/* Intro row: sidebar + summary. Negative margins bleed it back out to
            the page edges so the dark sidebar stays flush with the top/left edge
            on page 1. No minHeight — the row is only as tall as the intro, so
            Experience/Projects can fill the rest of the page below it. */}
        <View style={{ flexDirection: "row", marginTop: -16, marginHorizontal: -28 }}>
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

            {sidebarSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}

            {certifications.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={sidebarHeading}>Certifications</Text>
                <CertList items={certifications} palette={palette} light />
              </View>
            )}
          </View>

          {/* Main */}
          <View style={{ width: "67%", paddingVertical: 22, paddingLeft: 20, paddingRight: 28 }}>
            {mainSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}
          </View>
        </View>

        {/* Experience & Projects — full-width below the intro row, so they can
            flow across pages instead of being trapped in the sidebar row. */}
        {flowSections.length > 0 && (
          <View style={{ paddingTop: 14 }}>
            {flowSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

/* -------------------- TEMPLATE: ATS CLASSIC (single column) -------------------- */

function AtsSectionTitle({ title, palette }: { title: string; palette: ThemePalette }) {
  return (
    <View
      // No minPresenceAhead reserve: splittable sections (experience/projects)
      // now weld this title to their first entry via the list `heading` prop,
      // and short sections wrap the title in a wrap={false} atomic block — so a
      // heading can never orphan, and we don't waste page-bottom whitespace.
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

  const sectionPages = normalizeSectionPages(data.sectionPages);

  // Short sections render as a single atomic block (wrap={false}) so their
  // heading and content can never be split across a page break — that split
  // is what left the "EDUCATION" heading stranded at the bottom of a page.
  // Long sections (experience/projects) must be allowed to flow across pages,
  // so they rely on the heading's minPresenceAhead instead.
  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return hasSummary(data) ? (
          <View wrap={false}>
            <AtsSectionTitle title="Summary" palette={palette} />
            <HighlightedSummary data={data} style={{ ...styles.text, color: palette.text }} />
          </View>
        ) : null;

      case "skills":
        return skills.length > 0 ? (
          <View wrap={false}>
            <AtsSectionTitle title="Technical Skills" palette={palette} />
            <Text style={{ fontSize: 9.3, color: palette.text, lineHeight: 1.55 }}>
              {skills.join("  •  ")}
            </Text>
          </View>
        ) : null;

      case "experience":
        return experience.length > 0 ? (
          <ExperienceList
            items={experience}
            palette={palette}
            heading={<AtsSectionTitle title="Professional Experience" palette={palette} />}
          />
        ) : null;

      case "projects":
        return projects.length > 0 ? (
          <ProjectsBlock
            data={{ ...data, projects } as ResumeData}
            palette={palette}
            heading={<AtsSectionTitle title="Projects" palette={palette} />}
          />
        ) : null;

      case "education":
        return education.length > 0 ? (
          <View wrap={false}>
            <AtsSectionTitle title="Education" palette={palette} />
            <EducationList items={education} palette={palette} />
          </View>
        ) : null;

      case "languages":
        return languages.length > 0 ? (
          <View wrap={false}>
            <AtsSectionTitle title="Languages" palette={palette} />
            <Text style={{ fontSize: 9.3, color: palette.text, lineHeight: 1.55 }}>
              {languages.join("  •  ")}
            </Text>
          </View>
        ) : null;

      default:
        return null;
    }
  };

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

        {(() => {
          // Spacing lives on the TOP of every section except the first, so the
          // last section never carries a bottom margin that could overflow into
          // an otherwise-blank extra page.
          let flat = 0;
          return sectionPages.map((keys, pageIndex) => {
            const rendered = keys
              .map((sectionKey) => ({ sectionKey, node: renderSection(sectionKey) }))
              .filter((s) => s.node);
            // `break` starts each editor page's first section on a fresh PDF
            // page, so the exported PDF mirrors the drag-and-drop layout.
            return rendered.map((s, i) => {
              const node = (
                <View
                  key={s.sectionKey}
                  break={pageIndex > 0 && i === 0}
                  style={{ marginTop: flat === 0 ? 0 : 10 }}
                >
                  {s.node}
                </View>
              );
              flat++;
              return node;
            });
          });
        })()}

        {certifications.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <AtsSectionTitle title="Certifications" palette={palette} />
            <CertList items={certifications} palette={palette} />
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

  // Column membership is fixed by the template; the drag-and-drop layout
  // only decides the order of sections inside each column.
  const rank = sectionRankMap(data);

  const leftSections = orderByRank(
    [
      {
        key: "skills",
        node:
          skills.length > 0 ? (
            <Section title="Skills" palette={palette} keepTogether>
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
          ) : null,
      },
      {
        key: "education",
        node:
          education.length > 0 ? (
            <Section title="Education" palette={palette} keepTogether>
              <EducationList items={education} palette={palette} compact />
            </Section>
          ) : null,
      },
      {
        key: "languages",
        node:
          languages.length > 0 ? (
            <Section title="Languages" palette={palette} keepTogether>
              {languages.map((lang, i) => (
                <Text key={i} style={{ fontSize: 8.8, color: palette.text, marginBottom: 3 }}>
                  • {lang}
                </Text>
              ))}
            </Section>
          ) : null,
      },
    ],
    rank
  );

  // Only the profile summary stays in the right column of the two-column band.
  const rightSections = orderByRank(
    [
      {
        key: "summary",
        node: hasSummary(data) ? (
          <Section title="Profile" palette={palette}>
            <HighlightedSummary data={data} style={{ ...styles.text, color: palette.text }} />
          </Section>
        ) : null,
      },
    ],
    rank
  );

  // Experience & Projects flow FULL-WIDTH below the two-column band. react-pdf
  // cannot page-break content inside a flexDirection:"row", so while these long
  // sections lived in the right column they jumped wholesale to page 2 when they
  // didn't fit next to the left column — leaving page 1 half-empty. Full-width
  // flow lets them fill page 1 and split naturally onto page 2.
  const flowSections = orderByRank(
    [
      {
        key: "experience",
        node:
          experience.length > 0 ? (
            <View style={styles.section}>
              <ExperienceList
                items={experience}
                palette={palette}
                heading={<SectionHeading title="Experience" palette={palette} />}
              />
            </View>
          ) : null,
      },
      {
        key: "projects",
        node:
          projects.length > 0 ? (
            <View style={styles.section}>
              <ProjectsBlock
                data={{ ...data, projects } as ResumeData}
                palette={palette}
                heading={<SectionHeading title="Projects" palette={palette} />}
              />
            </View>
          ) : null,
      },
    ],
    rank
  );

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...getBasePageStyle(data, palette),
          padding: 0,
          // repeats on every page → proper top/bottom margin on page 2+
          paddingTop: 16,
          paddingBottom: 20,
          // horizontal padding lives on the Page so the full-width flow region
          // below the band inherits a proper left/right margin on every page
          paddingHorizontal: 24,
        }}
      >
        {/* Header band */}
        <View
          style={{
            backgroundColor: palette.primary,
            paddingVertical: 20,
            paddingHorizontal: 28,
            flexDirection: "row",
            alignItems: "center",
            // cancel the page padding so the band stays edge-to-edge on page 1
            marginTop: -16,
            marginHorizontal: -24,
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

        <View style={{ flexDirection: "row", paddingTop: 20 }}>
          {/* Left narrow column */}
          <View style={{ width: "34%", paddingRight: 16 }}>
            {leftSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}

            {certifications.length > 0 && (
              <Section title="Certifications" palette={palette}>
                <CertList items={certifications} palette={palette} />
              </Section>
            )}
          </View>

          {/* Right main column */}
          <View style={{ width: "66%" }}>
            {rightSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}
          </View>
        </View>

        {/* Experience & Projects — full-width below the band, so they can flow
            across pages instead of being trapped in the two-column body. */}
        {flowSections.length > 0 && (
          <View style={{ paddingTop: 6 }}>
            {flowSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}
          </View>
        )}
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
