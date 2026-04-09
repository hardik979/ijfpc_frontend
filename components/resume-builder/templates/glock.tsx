import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
} from "@react-pdf/renderer";

// Adjust this import if your ResumeData type lives elsewhere
import { ResumeData } from "@/lib/resume";

type EducationItem = {
  degree?: string | null;
  institution?: string | null;
  period?: string | null;
  location?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  currentlyStudying?: boolean | null;
  gpa?: string | null;
  percentage?: string | null;
};

type ExperienceItem = {
  title?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean | null;
  description?: string | null;
  bullets?: string[] | null;
  points?: string[] | null;
};

type ResumeTemplateData = ResumeData & {
  fullName?: string | null;
  name?: string | null;
  jobRole?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  portfolio?: string | null;
  address?: string | null;
  linkedin?: string | null;
  github?: string | null;
  profileImage?: string | null;
  photo?: string | null;
  summary?: string | null;
  about?: string | null;
  education?: EducationItem[] | null;
  skills?: string[] | string | null;
  languages?: string[] | string | null;
  experience?: ExperienceItem[] | null;
};

type Props = {
  data: ResumeTemplateData;
};

const COLORS = {
  pageBg: "#EDEDED",
  white: "#FFFFFF",
  black: "#111111",
  text: "#222222",
  muted: "#5E5E5E",
  line: "#B8B8B8",
  accentLeft: "#BDE8D5",
  accentRight: "#A9C9F5",
};

function cleanText(value?: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function hasText(value?: unknown): boolean {
  return cleanText(value).length > 0;
}

function toArray<T>(value?: T[] | T | null): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeStringArray(value?: string[] | string | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinDateRange(
  start?: string | null,
  end?: string | null,
  current?: boolean | null
): string {
  const s = cleanText(start);
  const e = cleanText(end);

  if (s && e) return `${s} - ${e}`;
  if (s && current) return `${s} - Present`;
  if (s) return s;
  if (e) return e;
  return "";
}

function getEducationPeriod(item: EducationItem): string {
  if (hasText(item.period)) return cleanText(item.period);

  const start = cleanText(item.startYear);
  const end = cleanText(item.endYear);

  if (start && end) return `${start} - ${end}`;
  if (start && item.currentlyStudying) return `${start} - Present`;
  if (start) return start;
  if (end) return end;

  return "";
}

function getExperienceTitle(item: ExperienceItem): string {
  return cleanText(item.title || item.jobTitle);
}

function getExperiencePeriod(item: ExperienceItem): string {
  if (hasText(item.period)) return cleanText(item.period);
  return joinDateRange(item.startDate, item.endDate, item.currentlyWorking);
}

function getPhoto(data: ResumeTemplateData): string {
  return cleanText(data.profileImage || data.photo);
}

function getWebsite(data: ResumeTemplateData): string {
  return cleanText(data.website || data.portfolio || data.linkedin || data.github);
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.pageBg,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 34,
  },

  topWrap: {
    position: "relative",
    marginBottom: 28,
    minHeight: 110,
  },

  nameBand: {
    width: 520,
    minHeight: 78,
    flexDirection: "column",
    justifyContent: "center",
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 10,
    paddingBottom: 10,
    marginTop: 14,
    backgroundColor: COLORS.accentRight,
    position: "relative",
  },

  nameBandLeftTint: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 180,
    height: 78,
    backgroundColor: COLORS.accentLeft,
  },

  fullName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 31,
    color: COLORS.black,
    letterSpacing: 3,
    textTransform: "uppercase",
    position: "relative",
  },

  role: {
    fontSize: 15,
    color: COLORS.black,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
    position: "relative",
  },

  photoFrame: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 132,
    height: 132,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#9DD2B8",
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  body: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  leftCol: {
    width: 178,
    paddingRight: 18,
  },

  dividerWrap: {
    width: 16,
    alignItems: "center",
    position: "relative",
  },

  dividerLine: {
    width: 1,
    backgroundColor: COLORS.line,
    minHeight: 620,
  },

  dividerCircleTop: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    backgroundColor: COLORS.pageBg,
    position: "absolute",
    top: 2,
  },

  dividerCircleBottom: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    backgroundColor: COLORS.pageBg,
    position: "absolute",
    bottom: 2,
  },

  rightCol: {
    flex: 1,
    paddingLeft: 14,
  },

  section: {
    marginBottom: 14,
  },

  leftHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: COLORS.black,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },

  rightHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: COLORS.black,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  contactIcon: {
    width: 11,
    height: 11,
    marginTop: 2,
    marginRight: 8,
    flexShrink: 0,
  },

  contactText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: COLORS.text,
    flex: 1,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  bulletMark: {
    width: 10,
    fontSize: 10,
    lineHeight: 1.35,
    color: COLORS.black,
  },

  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.48,
    color: COLORS.text,
  },

  profileText: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLORS.text,
    textAlign: "justify",
  },

  expRole: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLORS.text,
    marginBottom: 3,
  },

  expCompany: {
    fontSize: 11,
    color: COLORS.text,
    marginBottom: 3,
  },

  expPeriod: {
    fontSize: 10.5,
    color: COLORS.text,
    marginBottom: 8,
  },

  eduInstitute: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    color: COLORS.text,
    marginBottom: 4,
  },

  eduDegree: {
    fontSize: 10.5,
    color: COLORS.text,
    marginBottom: 2,
  },

  eduMeta: {
    fontSize: 10.5,
    color: COLORS.text,
    marginBottom: 2,
  },
});

function PhoneIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        fill="#7A7A7A"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 3.2-8 5-8-5V6.6l8 5 8-5v.6z"
        fill="#7A7A7A"
      />
    </Svg>
  );
}

export default function UploadedExactResumePdf({
  data,
}: Props): React.ReactElement {
  const fullName = cleanText(data.fullName || data.name);
  const role = cleanText(data.jobRole || data.jobTitle);
  const phone = cleanText(data.phone);
  const email = cleanText(data.email);
  const summary = cleanText(data.summary || data.about);
  const photo = getPhoto(data);
  const website = getWebsite(data);
  const address = cleanText(data.address);

  const skills = normalizeStringArray(data.skills);
  const languages = normalizeStringArray(data.languages);

  const education = toArray(data.education).filter((item) => {
    return (
      hasText(item.institution) ||
      hasText(item.degree) ||
      hasText(item.percentage) ||
      hasText(item.gpa) ||
      hasText(getEducationPeriod(item))
    );
  });

  const experience = toArray(data.experience).filter((item) => {
    const bullets = toArray(item.bullets?.length ? item.bullets : item.points)
      .map(cleanText)
      .filter(Boolean);

    return (
      hasText(getExperienceTitle(item)) ||
      hasText(item.company) ||
      hasText(getExperiencePeriod(item)) ||
      hasText(item.description) ||
      bullets.length > 0
    );
  });

  const contactItems = [
    { key: "phone", icon: <PhoneIcon />, text: phone },
    { key: "email", icon: <MailIcon />, text: email },
  ].filter((item) => hasText(item.text));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topWrap}>
          <View style={styles.nameBand}>
            <View style={styles.nameBandLeftTint} />
            {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
            {role ? <Text style={styles.role}>{role}</Text> : null}
          </View>

          {photo ? (
            <View style={styles.photoFrame}>
              <Image src={photo} style={styles.photo} />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.leftCol}>
            {contactItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.leftHeading}>CONTACT</Text>
                {contactItems.map((item) => (
                  <View key={item.key} style={styles.contactRow}>
                    {item.icon}
                    <Text style={styles.contactText}>{item.text}</Text>
                  </View>
                ))}
                {website ? (
                  <View style={styles.contactRow}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.contactText}>{website}</Text>
                  </View>
                ) : null}
                {address ? (
                  <View style={styles.contactRow}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.contactText}>{address}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {skills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.leftHeading}>SKILLS</Text>
                {skills.map((skill, index) => (
                  <View key={`skill-${index}`} style={styles.bulletRow}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.bulletText}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}

            {education.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.leftHeading}>EDUCATION</Text>
                {education.map((edu, index) => {
                  const institution = cleanText(edu.institution);
                  const degree = cleanText(edu.degree);
                  const percentage = cleanText(edu.percentage || edu.gpa);
                  const period = getEducationPeriod(edu);

                  return (
                    <View key={`edu-${index}`} style={{ marginBottom: 8 }}>
                      {institution ? (
                        <Text style={styles.eduInstitute}>{institution}</Text>
                      ) : null}
                      {degree ? <Text style={styles.eduDegree}>{degree}</Text> : null}
                      {percentage ? (
                        <Text style={styles.eduMeta}>
                          PERCENTAGE: {percentage}
                        </Text>
                      ) : null}
                      {period ? <Text style={styles.eduMeta}>{period}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}

            {languages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.leftHeading}>LANGUAGE</Text>
                {languages.map((lang, index) => (
                  <View key={`lang-${index}`} style={styles.bulletRow}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.bulletText}>{lang}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.dividerWrap}>
            <View style={styles.dividerCircleTop} />
            <View style={styles.dividerLine} />
            <View style={styles.dividerCircleBottom} />
          </View>

          <View style={styles.rightCol}>
            {summary ? (
              <View style={styles.section}>
                <Text style={styles.rightHeading}>PROFILE</Text>
                <Text style={styles.profileText}>{summary}</Text>
              </View>
            ) : null}

            {experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.rightHeading}>EXPERIENCE</Text>

                {experience.map((exp, index) => {
                  const title = getExperienceTitle(exp);
                  const company = cleanText(exp.company);
                  const period = getExperiencePeriod(exp);
                  const desc = cleanText(exp.description);
                  const bullets = toArray(exp.bullets?.length ? exp.bullets : exp.points)
                    .map(cleanText)
                    .filter(Boolean);

                  return (
                    <View key={`exp-${index}`} style={{ marginBottom: 10 }} wrap={false}>
                      {title ? <Text style={styles.expRole}>{title}</Text> : null}
                      {company ? <Text style={styles.expCompany}>{company}</Text> : null}
                      {period ? <Text style={styles.expPeriod}>{period}</Text> : null}

                      {desc ? (
                        <View style={styles.bulletRow}>
                          <Text style={styles.bulletMark}>•</Text>
                          <Text style={styles.bulletText}>{desc}</Text>
                        </View>
                      ) : null}

                      {bullets.map((bullet, bulletIndex) => (
                        <View key={`bullet-${bulletIndex}`} style={styles.bulletRow}>
                          <Text style={styles.bulletMark}>•</Text>
                          <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}