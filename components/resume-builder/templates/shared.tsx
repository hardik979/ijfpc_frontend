import React from "react";
import {
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
  styles,
  type ThemePalette,
} from "@/lib/resumePdfStyles";

/* Re-exported so each template file imports everything it needs from one place. */
export { getBasePageStyle, resolveThemePalette, styles };
export type { ResumeData, SectionKey, ThemePalette };

/* -------------------- TEXT HELPERS -------------------- */

export function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function cleanText(value?: string | null) {
  // strip zero-width characters too: they survive trim(), render as ghost
  // empty bullets, and can push an invisible line onto an extra PDF page
  return String(value ?? "")
    .replace(new RegExp("[\u200B-\u200D\u2060\uFEFF]", "g"), "")
    .trim();
}

export function hasText(value?: string | null) {
  return cleanText(value).length > 0;
}

export function nonEmptyArray(
  values?: (string | undefined | null)[] | null
): string[] {
  return safeArray(values).map((v) => cleanText(v)).filter(Boolean);
}

/* -------------------- CONTACT ICONS (lucide paths as react-pdf Svg) -------------------- */

type ContactType = "mail" | "phone" | "map" | "linkedin";

export function PdfIcon({
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
export function ContactRow({
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

export function ContactLines({
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

/** Rounded profile photo. Renders nothing when there is no photo. */
export function Avatar({
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

/* -------------------- PRESENCE / SECTION HELPERS -------------------- */

export function hasSummary(data: ResumeData) {
  return hasText(data.summary);
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

/* -------------------- SECTION ORDER (drag-and-drop layout) -------------------- */

/** Flattened position of each section in the user's page layout, used by the
 *  two-column templates to order sections within their fixed columns. */
export function sectionRankMap(data: ResumeData) {
  const rank = new Map<SectionKey, number>();
  normalizeSectionPages(data.sectionPages)
    .flat()
    .forEach((key, i) => rank.set(key, i));
  return rank;
}

export type RankedSection = { key: SectionKey; node: React.ReactNode };

export function orderByRank(
  items: RankedSection[],
  rank: Map<SectionKey, number>
) {
  return items
    .filter((s) => s.node)
    .sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99));
}

/* -------------------- REUSABLE BLOCKS -------------------- */

/**
 * Coloured bar + section title. The bar and the title are welded together with
 * `wrap={false}` so react-pdf can NEVER break between them — that break is what
 * left the little blue bar stranded at the bottom of a page while its heading
 * text jumped to the next page. A 2-line block this small never crams at a page
 * boundary, so making it atomic is safe in every template.
 */
export function SectionHeading({
  title,
  palette,
}: {
  title: string;
  palette: ThemePalette;
}) {
  return (
    <View wrap={false}>
      <View style={{ ...styles.sectionBar, backgroundColor: palette.primary }} />
      <Text style={{ ...styles.heading, color: palette.primary }}>{title}</Text>
    </View>
  );
}

export function Section({
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

export function BulletItem({ text, color }: { text: string; color: string }) {
  return (
    <View
      // wrap={false} keeps the "•" glued to its text. Without it react-pdf can
      // break this flex row at a page boundary and strand a bare bullet marker
      // at the bottom of the page while its sentence starts on the next one.
      // A bullet is only 1-3 lines, so moving it whole costs almost no fill.
      wrap={false}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 4,
      }}
    >
      <Text style={{ width: 10, fontSize: 9.5, color, lineHeight: 1.45 }}>•</Text>
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

/* -------------------- SUMMARY HIGHLIGHTING -------------------- */

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
 * "React.js" still matches plain "React" in the text.
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
export function HighlightedSummary({
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

/* -------------------- SHARED DATA EXTRACTION -------------------- */

export function extractSections(data: ResumeData) {
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

  const certifications = safeArray((data as any).certifications).filter(
    (cert: any) => {
      if (typeof cert === "string") return hasText(cert);
      return hasText(cert?.name) || hasText(cert?.issuer);
    }
  );

  return { skills, languages, experience, education, projects, certifications };
}

export function dateRange(start?: string, end?: string, present = "Present") {
  const s = cleanText(start);
  const e = cleanText(end);
  if (!s && !e) return "";
  return `${s}${s || e ? " – " : ""}${e || present}`;
}

/* -------------------- FLOWING LIST BLOCKS -------------------- */

/**
 * Experience as a FLAT sequence — heading, per-job header, then each bullet as
 * an individual sibling — so react-pdf can break between any two lines and fill
 * every page. Two anti-orphan guards:
 *   1. heading + the first job's header are welded in a small `wrap={false}`
 *      block, so a heading can never sit alone at the bottom of a page while
 *      its first job starts on the next one.
 *   2. each header carries `minPresenceAhead` so a job title never lands split
 *      from its first bullet.
 */
export function ExperienceList({
  items,
  palette,
  heading,
}: {
  items: any[];
  palette: ThemePalette;
  heading?: React.ReactNode;
}) {
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

  return (
    <View>
      {items.map((exp: any, i: number) => (
        <React.Fragment key={i}>
          {i === 0 && heading ? (
            // Weld the heading to the first job's header so the heading never
            // orphans. The block is only ~3 lines tall → it relocates cleanly to
            // the next page without cramming when it hits a page boundary.
            <View wrap={false}>
              {heading}
              {renderHeader(exp, false)}
            </View>
          ) : (
            renderHeader(exp, i > 0)
          )}
          {bulletsOf(exp).map((point, j) => (
            <BulletItem key={`${i}-${j}`} text={point} color={palette.text} />
          ))}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Projects. The heading is welded to the FIRST project's name/tech/link block
 * in a small `wrap={false}` unit so the heading (and its coloured bar) can never
 * be stranded at the bottom of a page while the first project starts on the
 * next — the exact bug reported for Naukri. Each project's bullets then flow
 * freely so long project lists still fill pages.
 */
export function ProjectsBlock({
  data,
  palette,
  heading,
}: {
  data: ResumeData;
  palette: ThemePalette;
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

  const renderMeta = (project: any) => (
    <>
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
    </>
  );

  const renderBullets = (project: any) =>
    nonEmptyArray(project.bullets).map((bullet, i) => (
      <BulletItem key={i} text={bullet} color={palette.text} />
    ));

  return (
    <View>
      {projects.map((project: any, i: number) => (
        <View
          key={i}
          style={{
            ...styles.expCard,
            borderBottomColor: palette.border,
            ...(i > 0 ? { marginTop: 2 } : {}),
          }}
        >
          {i === 0 && heading ? (
            // heading + first project meta welded together, never separated
            <View wrap={false} minPresenceAhead={18}>
              {heading}
              {renderMeta(project)}
            </View>
          ) : (
            <View minPresenceAhead={30}>{renderMeta(project)}</View>
          )}
          {renderBullets(project)}
        </View>
      ))}
    </View>
  );
}

export function EducationList({
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
        const range = dateRange(
          edu.startYear,
          edu.endYear,
          edu.currentlyStudying ? "Present" : ""
        );
        return (
          <View key={index} wrap={false} style={{ marginBottom: compact ? 7 : 8 }}>
            <Text
              style={{
                fontSize: compact ? 9.4 : 10,
                fontWeight: 700,
                color: palette.text,
              }}
            >
              {cleanText(edu.degree) || "Degree"}
            </Text>
            {hasText(edu.institution) && (
              <Text style={{ fontSize: 8.8, color: palette.secondary, marginTop: 1 }}>
                {edu.institution}
              </Text>
            )}
            {!!range && (
              <Text style={{ fontSize: 8.2, color: palette.subText, marginTop: 1 }}>
                {range}
              </Text>
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

export function CertList({
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
