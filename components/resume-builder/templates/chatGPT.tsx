import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
  Svg,
  Path,
  Circle,
} from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/resume";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillItem {
  name?: string;
  level?: number;
  percentage?: number;
  label?: string;
  skill?: string;
}

export interface EducationItem {
  degree?: string;
  institution?: string;
  year?: string;
  startYear?: string;
  endYear?: string;
  description?: string;
  summary?: string;
  highlights?: string[];
}

export interface ExperienceItem {
  company?: string;
  role?: string;
  jobTitle?: string;
  designation?: string;
  startDate?: string;
  start?: string;
  endDate?: string;
  end?: string;
  bullets?: string[];
  points?: string[];
}

// ─── Internal shapes ─────────────────────────────────────────────────────────

interface NSkill {
  name: string;
  level: number;
}
interface NEducation {
  year: string;
  institution: string;
  degree: string;
  description: string;
}
interface NExperience {
  start: string;
  end: string;
  company: string;
  role: string;
  bullets: string[];
}
interface NContact {
  phone: string;
  email: string;
  website: string;
  address: string;
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const C = {
  pageBg: "#EAE5DD",
  rightBg: "#6B2117",
  divider: "#5A1C0C",
  curveBg: "#F5F1EB",
  brownText: "#4A1E0E",
  whiteText: "#FFFFFF",
  mutedWhite: "#E8C8BC",
  gold: "#D4A017",
  skillTrack: "#C8BFB3",
  iconBg: "#7A2B1E",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safe(v?: string | null, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function clamp(v?: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 80;
  return Math.max(0, Math.min(100, v));
}

function splitName(name: string): [string, string] {
  const cleaned = safe(name);
  if (!cleaned) return ["", ""];
  const parts = cleaned.split(/\s+/);
  if (parts.length <= 1) return [parts[0] ?? "", ""];
  if (parts.length === 2) return [parts[0] ?? "", parts[1] ?? ""];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
}

function period(start?: string, end?: string): string {
  const s = safe(start);
  const e = safe(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  if (e) return e;
  return "";
}

function hasExperienceContent(item: NExperience): boolean {
  return !!(item.start || item.end || item.company || item.role || item.bullets.length);
}

function hasEducationContent(item: NEducation): boolean {
  return !!(item.year || item.institution || item.degree || item.description);
}

function hasContactContent(contact: NContact): boolean {
  return !!(contact.phone || contact.email || contact.website || contact.address);
}

// ─── Normalisers ──────────────────────────────────────────────────────────────

function normaliseSkills(raw?: Array<string | SkillItem>): NSkill[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const result: NSkill[] = [];

  for (const item of raw) {
    if (typeof item === "string") {
      const name = item.trim();
      if (name) result.push({ name, level: 80 });
      continue;
    }

    const name = safe(item?.name ?? item?.label ?? item?.skill);
    if (!name) continue;

    const level = clamp(
      typeof item?.level === "number"
        ? item.level
        : typeof item?.percentage === "number"
        ? item.percentage
        : 80
    );

    result.push({ name, level });
  }

  return result.slice(0, 7);
}

function normaliseEducation(raw?: EducationItem[]): NEducation[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const result: NEducation[] = [];

  for (const item of raw) {
    const degree = safe(item.degree);
    const institution = safe(item.institution);
    const year = safe(item.endYear ?? item.startYear ?? item.year);
    const description = Array.isArray(item.highlights)
      ? item.highlights
          .map((x) => safe(x))
          .filter(Boolean)
          .join(" ")
      : safe(item.description ?? item.summary);

    const normalized = { degree, institution, year, description };
    if (!hasEducationContent(normalized)) continue;

    result.push(normalized);
  }

  return result.slice(0, 2);
}

function normaliseExperience(raw?: ExperienceItem[]): NExperience[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const result: NExperience[] = [];

  for (const item of raw) {
    const company = safe(item.company);
    const role = safe(item.role ?? item.jobTitle ?? item.designation);
    const start = safe(item.start ?? item.startDate);
    const end = safe(item.end ?? item.endDate);

    const bullets = Array.isArray(item.bullets)
      ? item.bullets.map((b) => safe(b)).filter(Boolean)
      : Array.isArray(item.points)
      ? item.points.map((b) => safe(b)).filter(Boolean)
      : [];

    const normalized = { company, role, start, end, bullets };
    if (!hasExperienceContent(normalized)) continue;

    result.push(normalized);
  }

  return result.slice(0, 3);
}

function normaliseContact(data: ResumeData): NContact {
  return {
    phone: safe(data.phone),
    email: safe(data.email),
    website: safe(data.linkedin),
    address: safe(data.address),
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: C.pageBg,
    fontFamily: "Helvetica",
    padding: 0,
  },

  rightBg: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "52%",
    height: "100%",
    backgroundColor: C.rightBg,
  },
  divider: {
    position: "absolute",
    top: 0,
    left: "47.6%",
    width: 16,
    height: "100%",
    backgroundColor: C.divider,
  },
  curveShape: {
    position: "absolute",
    top: 262,
    left: -14,
    width: 298,
    height: 590,
    backgroundColor: C.curveBg,
    borderTopRightRadius: 145,
    borderBottomRightRadius: 175,
    zIndex: 1,
  },

  shell: { flexDirection: "row", width: "100%", height: "100%" },

  leftCol: {
    width: "48%",
    paddingTop: 26,
    paddingLeft: 22,
    paddingRight: 16,
    paddingBottom: 22,
    zIndex: 2,
  },

  nameLine: {
    fontSize: 25,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
    color: C.brownText,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  jobTitle: {
    marginTop: 5,
    fontSize: 12.5,
    fontFamily: "Helvetica-Oblique",
    color: C.brownText,
    letterSpacing: 0.2,
  },
  summary: {
    marginTop: 9,
    fontSize: 8.2,
    lineHeight: 1.62,
    color: C.brownText,
    textAlign: "justify",
  },

  gapBeforeCurve: { height: 20 },

  sectionLeft: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.2,
    color: C.brownText,
    marginBottom: 8,
    marginTop: 14,
    textTransform: "uppercase",
  },

  eduYear: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.brownText,
    marginBottom: 1,
  },
  eduInstitution: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.brownText,
    marginBottom: 2,
  },
  eduDegree: {
    fontSize: 9.2,
    fontFamily: "Helvetica-BoldOblique",
    color: C.brownText,
    marginBottom: 5,
  },
  eduDesc: {
    fontSize: 7.8,
    lineHeight: 1.55,
    color: C.brownText,
    marginBottom: 8,
  },

  skillBlock: { marginBottom: 9 },
  skillLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.brownText,
    marginBottom: 3,
  },
  skillRow: { flexDirection: "row", alignItems: "center" },
  skillTrack: {
    width: 128,
    height: 4.5,
    backgroundColor: C.skillTrack,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
  },
  skillFillBrown: {
    height: "100%",
    backgroundColor: C.rightBg,
    borderRadius: 999,
  },
  skillFillGold: {
    height: "100%",
    backgroundColor: C.gold,
    borderRadius: 999,
  },
  skillPct: { marginLeft: 5, fontSize: 7.5, color: C.brownText },

  rightCol: {
    width: "52%",
    paddingTop: 18,
    paddingLeft: 26,
    paddingRight: 20,
    paddingBottom: 22,
    zIndex: 2,
  },

  photoFrame: {
    alignSelf: "flex-end",
    width: 158,
    backgroundColor: "#EDE7DF",
    padding: 7,
    marginBottom: 18,
  },
  photo: {
    width: "100%",
    height: 112,
    objectFit: "cover",
  },

  sectionRight: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.2,
    color: C.whiteText,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  expBlock: { marginBottom: 12 },
  expDate: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.whiteText,
    marginBottom: 2,
  },
  expCompany: {
    fontSize: 10,
    fontFamily: "Helvetica-BoldOblique",
    color: C.whiteText,
    marginBottom: 2,
  },
  expRole: {
    fontSize: 8,
    color: C.mutedWhite,
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  bulletDot: {
    width: 8,
    fontSize: 8.5,
    lineHeight: 1.5,
    color: C.whiteText,
  },
  bulletText: {
    flex: 1,
    fontSize: 7.8,
    lineHeight: 1.52,
    color: C.whiteText,
  },

  contactSection: { marginTop: 12 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  contactText: {
    flex: 1,
    fontSize: 8.5,
    lineHeight: 1.4,
    color: C.whiteText,
  },
  contactLink: {
    flex: 1,
    fontSize: 8.5,
    lineHeight: 1.4,
    color: C.whiteText,
    textDecoration: "none",
  },
});

// ─── SkillBar ─────────────────────────────────────────────────────────────────

function SkillBar({ skill }: { skill: NSkill }) {
  const level = clamp(skill.level);
  const trackW = 128;
  const filled = trackW * (level / 100);
  const accentPct = Math.min(18, level);
  const mainPct = Math.max(0, level - accentPct);
  const total = mainPct + accentPct || 1;
  const mainPx = filled * (mainPct / total);
  const accentPx = filled * (accentPct / total);

  return (
    <View style={s.skillBlock}>
      <Text style={s.skillLabel}>{skill.name}</Text>
      <View style={s.skillRow}>
        <View style={s.skillTrack}>
          <View style={[s.skillFillBrown, { width: mainPx }]} />
          <View style={[s.skillFillGold, { width: accentPx }]} />
        </View>
        <Text style={s.skillPct}>{`${level}%`}</Text>
      </View>
    </View>
  );
}

// ─── SVG Contact Icons ────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24">
      <Path
        d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.3 21 3 13.7 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24">
      <Path
        d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
      <Path
        d="M4 8l8 6 8-6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
    </Svg>
  );
}

function LinkIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24">
      <Path
        d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L10.41 5.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 107.07 7.07l2.42-2.4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LocationIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24">
      <Path
        d="M12 21s-6-5.33-6-11a6 6 0 1112 0c0 5.67-6 11-6 11z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2}
      />
      <Circle cx="12" cy="10" r="2.5" fill="#FFFFFF" />
    </Svg>
  );
}

function ContactIcon({ type }: { type: string }) {
  switch (type) {
    case "phone":
      return <PhoneIcon />;
    case "email":
      return <MailIcon />;
    case "website":
      return <LinkIcon />;
    case "address":
      return <LocationIcon />;
    default:
      return null;
  }
}

// ─── ContactRow ───────────────────────────────────────────────────────────────

function ContactRow({ type, value }: { type: string; value: string }) {
  if (!value) return null;

  const textEl =
    type === "email" ? (
      <Link src={`mailto:${value}`} style={s.contactLink}>
        {value}
      </Link>
    ) : type === "website" ? (
      <Link
        src={value.startsWith("http") ? value : `https://${value}`}
        style={s.contactLink}
      >
        {value}
      </Link>
    ) : (
      <Text style={s.contactText}>{value}</Text>
    );

  return (
    <View style={s.contactRow}>
      <View style={s.iconCircle}>
        <ContactIcon type={type} />
      </View>
      {textEl}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface BrownMinimalTemplateProps {
  data: ResumeData;
}

export const BrownMinimalTemplate: React.FC<BrownMinimalTemplateProps> = ({
  data,
}) => {
  const fullName = safe(data.fullName);
  const title = safe(data.jobRole ?? data.role);
  const summary = safe(data.summary);
  const photo = safe(data.profileImage);

  const skills = normaliseSkills(data.skills);
  const education = normaliseEducation(data.education);
  const experience = normaliseExperience(data.experience);
  const contact = normaliseContact(data);

  const [line1, line2] = splitName(fullName);
  const showTopIntro = !!(fullName || title || summary);
  const showLeftCurveContent = education.length > 0 || skills.length > 0;
  const showContact = hasContactContent(contact);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.rightBg} />
        <View style={s.divider} />
        {showLeftCurveContent ? <View style={s.curveShape} /> : null}

        <View style={s.shell}>
          <View style={s.leftCol}>
            {fullName ? (
              <>
                {line1 ? <Text style={s.nameLine}>{line1}</Text> : null}
                {line2 ? <Text style={s.nameLine}>{line2}</Text> : null}
              </>
            ) : null}

            {title ? <Text style={s.jobTitle}>{title}</Text> : null}
            {summary ? <Text style={s.summary}>{summary}</Text> : null}

            {showTopIntro && showLeftCurveContent ? <View style={s.gapBeforeCurve} /> : null}

            {education.length > 0 ? (
              <View>
                <Text style={s.sectionLeft}>EDUCATION</Text>
                {education.map((edu, i) => (
                  <View key={`edu-${i}`}>
                    {edu.year ? <Text style={s.eduYear}>{edu.year}</Text> : null}
                    {edu.institution ? <Text style={s.eduInstitution}>{edu.institution}</Text> : null}
                    {edu.degree ? <Text style={s.eduDegree}>{edu.degree}</Text> : null}
                    {edu.description ? <Text style={s.eduDesc}>{edu.description}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {skills.length > 0 ? (
              <View>
                <Text style={s.sectionLeft}>SKILLS</Text>
                {skills.map((skill, i) => (
                  <SkillBar key={`skill-${i}`} skill={skill} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={s.rightCol}>
            {photo ? (
              <View style={s.photoFrame}>
                <Image src={photo} style={s.photo} />
              </View>
            ) : null}

            {experience.length > 0 ? (
              <View>
                <Text style={s.sectionRight}>EXPERIENCE</Text>
                {experience.map((exp, i) => (
                  <View key={`exp-${i}`} style={s.expBlock}>
                    {period(exp.start, exp.end) ? (
                      <Text style={s.expDate}>{period(exp.start, exp.end)}</Text>
                    ) : null}

                    {exp.company ? <Text style={s.expCompany}>{exp.company}</Text> : null}
                    {exp.role ? <Text style={s.expRole}>{exp.role}</Text> : null}

                    {exp.bullets.slice(0, 2).map((b, j) => (
                      <View key={`b-${i}-${j}`} style={s.bulletRow}>
                        <Text style={s.bulletDot}>•</Text>
                        <Text style={s.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {showContact ? (
              <View style={s.contactSection}>
                <Text style={s.sectionRight}>CONTACT</Text>
                <ContactRow type="phone" value={contact.phone} />
                <ContactRow type="email" value={contact.email} />
                <ContactRow type="website" value={contact.website} />
                <ContactRow type="address" value={contact.address} />
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default BrownMinimalTemplate;