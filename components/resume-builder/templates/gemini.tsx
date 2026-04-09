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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type EducationItem = {
  degree?: string | null;
  institution?: string | null;
  period?: string | null;
  location?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  currentlyStudying?: boolean | null;
  gpa?: string | null;
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
};

type CertificationItem =
  | string
  | {
      name?: string | null;
      title?: string | null;
      issuer?: string | null;
      organization?: string | null;
      year?: string | null;
    };

type ReferenceItem = {
  name?: string | null;
  title?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ResumeTemplateData = {
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
  certifications?: CertificationItem[] | null;
  skills?: string[] | string | null;
  languages?: string[] | string | null;
  experience?: ExperienceItem[] | null;
  references?: ReferenceItem[] | null;
};

type BlackYellowResumePdfProps = {
  data: ResumeTemplateData;
};

// ─────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────

const CHARCOAL = "#2A2A2A";
const YELLOW = "#F5C518";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F2F2F2";
const MID_GRAY = "#8A8A8A";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#444444";
const TEXT_LIGHT = "#D9D9D9";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

function joinDateRange(start?: string | null, end?: string | null, current?: boolean | null): string {
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

function getCertificationText(item: CertificationItem): string {
  if (typeof item === "string") return cleanText(item);

  return [
    cleanText(item.name || item.title),
    cleanText(item.issuer || item.organization),
    cleanText(item.year),
  ]
    .filter(Boolean)
    .join(" • ");
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

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: LIGHT_GRAY,
    color: TEXT_DARK,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
  },

  header: {
    backgroundColor: CHARCOAL,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 28,
    position: "relative",
  },

  headerAccentTop: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 180,
    height: 54,
    backgroundColor: YELLOW,
    opacity: 0.14,
  },

  headerAccentBottom: {
    position: "absolute",
    bottom: 0,
    right: 72,
    width: 110,
    height: 22,
    backgroundColor: YELLOW,
    opacity: 0.1,
  },

photoWrap: {
  width: 94,
  height: 94,
  borderRadius: 47,
  overflow: "hidden",
  borderWidth: 4,
  borderColor: YELLOW,
  backgroundColor: "#4C4C4C",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 18,
  flexShrink: 0,
},

photo: {
  width: 94,
  height: 94,
  borderRadius: 47, // VERY IMPORTANT
  objectFit: "cover",
},

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  fullName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: WHITE,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    lineHeight: 1.05,
  },

  jobTitle: {
    marginTop: 6,
    fontSize: 10.5,
    color: YELLOW,
    textTransform: "uppercase",
    letterSpacing: 2.2,
    fontFamily: "Helvetica-Bold",
  },

  body: {
    flexDirection: "row",
    minHeight: 0,
  },

  sidebar: {
    width: 205,
    backgroundColor: CHARCOAL,
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexShrink: 0,
  },

  sidebarSection: {
    marginBottom: 18,
  },

  sidebarHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    color: WHITE,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    borderBottomWidth: 1.3,
    borderBottomColor: YELLOW,
    paddingBottom: 5,
    marginBottom: 9,
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
    marginRight: 7,
    flexShrink: 0,
  },

  contactText: {
    fontSize: 9.2,
    color: TEXT_LIGHT,
    lineHeight: 1.45,
    flex: 1,
  },

  skillRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  skillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: YELLOW,
    marginTop: 4,
    marginRight: 7,
    flexShrink: 0,
  },

  skillText: {
    fontSize: 9.2,
    color: TEXT_LIGHT,
    lineHeight: 1.4,
    flex: 1,
  },

  refCard: {
    marginBottom: 11,
  },

  refName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.3,
    color: WHITE,
    marginBottom: 2,
  },

  refTitle: {
    fontSize: 8.8,
    color: YELLOW,
    marginBottom: 2,
  },

  refContact: {
    fontSize: 8.5,
    color: "#B8B8B8",
    lineHeight: 1.35,
  },

  main: {
    flex: 1,
    backgroundColor: WHITE,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },

  mainSection: {
    marginBottom: 16,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  mainHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    color: CHARCOAL,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginLeft: 6,
  },

  headingLine: {
    height: 2,
    backgroundColor: YELLOW,
    width: 38,
    marginBottom: 8,
  },

  paragraph: {
    fontSize: 9.6,
    color: TEXT_MID,
    lineHeight: 1.55,
    textAlign: "justify",
  },

  expItem: {
    position: "relative",
    marginBottom: 13,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: YELLOW,
  },

  expDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: YELLOW,
    position: "absolute",
    left: -5,
    top: 4,
  },

  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },

  expTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },

  expTitle: {
    fontSize: 10.8,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    lineHeight: 1.3,
  },

  expCompany: {
    fontSize: 9.3,
    color: MID_GRAY,
    marginTop: 2,
    lineHeight: 1.35,
  },

  expPeriodBadge: {
    backgroundColor: CHARCOAL,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 2,
    flexShrink: 0,
  },

  expPeriodText: {
    fontSize: 8.2,
    color: YELLOW,
    fontFamily: "Helvetica-Bold",
  },

  expDescription: {
    fontSize: 9.3,
    color: TEXT_MID,
    lineHeight: 1.45,
    marginTop: 4,
    marginBottom: 4,
    textAlign: "justify",
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },

  bulletDot: {
    width: 10,
    fontSize: 10,
    color: YELLOW,
    lineHeight: 1.35,
    fontFamily: "Helvetica-Bold",
  },

  bulletText: {
    flex: 1,
    fontSize: 9.3,
    color: TEXT_MID,
    lineHeight: 1.5,
    textAlign: "justify",
  },

  certRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },

  certBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: YELLOW,
    marginTop: 4,
    marginRight: 7,
    flexShrink: 0,
  },

  certText: {
    flex: 1,
    fontSize: 9.3,
    color: TEXT_MID,
    lineHeight: 1.42,
  },
});

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        fill={YELLOW}
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 3.2-8 5-8-5V6.6l8 5 8-5v.6z"
        fill={YELLOW}
      />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.93 9h-3.06a15.5 15.5 0 0 0-1.26-5.06A8.04 8.04 0 0 1 18.93 11zM12 4.04c.84 1.22 1.51 3.03 1.85 4.96h-3.7C10.49 7.07 11.16 5.26 12 4.04zM4.07 13h3.06c.12 1.78.56 3.48 1.26 5.06A8.04 8.04 0 0 1 4.07 13zm3.06-2H4.07a8.04 8.04 0 0 1 4.32-5.06A15.5 15.5 0 0 0 7.13 11zm1.99 0c.14-1.58.5-3.09 1.03-4.37.53-1.27 1.17-2.16 1.85-2.59.68.43 1.32 1.32 1.85 2.59.53 1.28.89 2.79 1.03 4.37H9.12zm0 2h5.76c-.14 1.58-.5 3.09-1.03 4.37-.53 1.27-1.17 2.16-1.85 2.59-.68-.43-1.32-1.32-1.85-2.59-.53-1.28-.89-2.79-1.03-4.37zm5.49 5.06c.7-1.58 1.14-3.28 1.26-5.06h3.06a8.04 8.04 0 0 1-4.32 5.06z"
        fill={YELLOW}
      />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M12 2C8.14 2 5 5.14 5 9c0 5.1 7 13 7 13s7-7.9 7-13c0-3.86-3.14-7-7-7zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4z"
        fill={YELLOW}
      />
    </Svg>
  );
}

function PersonIcon() {
  return (
    <Svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24">
      <Path
        d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.34 0-10 1.68-10 5v3h20v-3c0-3.32-6.66-5-10-5z"
        fill={YELLOW}
      />
    </Svg>
  );
}

function BriefcaseIcon() {
  return (
    <Svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24">
      <Path
        d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z"
        fill={YELLOW}
      />
    </Svg>
  );
}

function GradCapIcon() {
  return (
    <Svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24">
      <Path
        d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm-7 10.18V17l7 3.82L19 17v-3.82L12 17l-7-3.82z"
        fill={YELLOW}
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Reusable section blocks
// ─────────────────────────────────────────────────────────────

function MainSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.mainSection}>
      <View style={styles.sectionHeaderRow}>
        {icon}
        <Text style={styles.mainHeading}>{title}</Text>
      </View>
      <View style={styles.headingLine} />
      {children}
    </View>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sidebarSection}>
      <Text style={styles.sidebarHeading}>{title}</Text>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main template
// ─────────────────────────────────────────────────────────────

export function GeminiResumePdf({
  data,
}: BlackYellowResumePdfProps): React.ReactElement {
  const fullName = cleanText(data.fullName || data.name);
  const jobTitle = cleanText(data.jobRole || data.jobTitle);
  const phone = cleanText(data.phone);
  const email = cleanText(data.email);
  const website = getWebsite(data);
  const address = cleanText(data.address);
  const photo = getPhoto(data);
  const summary = cleanText(data.summary || data.about);

  const education = toArray(data.education).filter(
    (item) =>
      hasText(item.degree) ||
      hasText(item.institution) ||
      hasText(item.location) ||
      hasText(getEducationPeriod(item)) ||
      hasText(item.gpa)
  );

  const certifications = toArray(data.certifications)
    .map(getCertificationText)
    .filter(Boolean);

  const skills = normalizeStringArray(data.skills);
  const languages = normalizeStringArray(data.languages);

  const experience = toArray(data.experience).filter((item) => {
    const bullets = toArray(item.bullets).map(cleanText).filter(Boolean);
    return (
      hasText(getExperienceTitle(item)) ||
      hasText(item.company) ||
      hasText(getExperiencePeriod(item)) ||
      hasText(item.description) ||
      bullets.length > 0
    );
  });

  const references = toArray(data.references).filter(
    (item) =>
      hasText(item.name) ||
      hasText(item.title) ||
      hasText(item.company) ||
      hasText(item.phone) ||
      hasText(item.email)
  );

  const contactItems = [
    { key: "phone", icon: <PhoneIcon />, text: phone },
    { key: "email", icon: <MailIcon />, text: email },
    { key: "website", icon: <GlobeIcon />, text: website },
    { key: "address", icon: <PinIcon />, text: address },
  ].filter((item) => hasText(item.text));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerAccentTop} />
          <View style={styles.headerAccentBottom} />

          {photo ? (
            <View style={styles.photoWrap}>
              <Image style={styles.photo} src={photo} />
            </View>
          ) : null}

          <View style={styles.headerText}>
            {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
            {jobTitle ? <Text style={styles.jobTitle}>{jobTitle}</Text> : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.sidebar}>
            {contactItems.length > 0 && (
              <SidebarSection title="Contact">
                {contactItems.map((item) => (
                  <View key={item.key} style={styles.contactRow}>
                    {item.icon}
                    <Text style={styles.contactText}>{item.text}</Text>
                  </View>
                ))}
              </SidebarSection>
            )}

            {skills.length > 0 && (
              <SidebarSection title="Skills">
                {skills.map((skill, index) => (
                  <View key={`skill-${index}`} style={styles.skillRow}>
                    <View style={styles.skillDot} />
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </SidebarSection>
            )}

            {languages.length > 0 && (
              <SidebarSection title="Languages">
                {languages.map((lang, index) => (
                  <View key={`lang-${index}`} style={styles.skillRow}>
                    <View style={styles.skillDot} />
                    <Text style={styles.skillText}>{lang}</Text>
                  </View>
                ))}
              </SidebarSection>
            )}

            {references.length > 0 && (
              <SidebarSection title="References">
                {references.map((ref, index) => (
                  <View key={`ref-${index}`} style={styles.refCard}>
                    {hasText(ref.name) ? (
                      <Text style={styles.refName}>{cleanText(ref.name)}</Text>
                    ) : null}

                    {hasText(ref.title) ? (
                      <Text style={styles.refTitle}>{cleanText(ref.title)}</Text>
                    ) : null}

                    {hasText(ref.company) ? (
                      <Text style={styles.refContact}>{cleanText(ref.company)}</Text>
                    ) : null}

                    {hasText(ref.phone) ? (
                      <Text style={styles.refContact}>
                        Phone: {cleanText(ref.phone)}
                      </Text>
                    ) : null}

                    {hasText(ref.email) ? (
                      <Text style={styles.refContact}>
                        Email: {cleanText(ref.email)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </SidebarSection>
            )}
          </View>

          <View style={styles.main}>
            {summary ? (
              <MainSection title="Profile" icon={<PersonIcon />}>
                <Text style={styles.paragraph}>{summary}</Text>
              </MainSection>
            ) : null}

            {experience.length > 0 && (
              <MainSection title="Work Experience" icon={<BriefcaseIcon />}>
                {experience.map((exp, index) => {
                  const expTitle = getExperienceTitle(exp);
                  const expCompany = cleanText(exp.company);
                  const expPeriod = getExperiencePeriod(exp);
                  const expDescription = cleanText(exp.description);
                  const bullets = toArray(exp.bullets).map(cleanText).filter(Boolean);

                  return (
                    <View key={`exp-${index}`} style={styles.expItem} wrap={false}>
                      <View style={styles.expDot} />

                      <View style={styles.expHeader}>
                        <View style={styles.expTitleWrap}>
                          {expTitle ? <Text style={styles.expTitle}>{expTitle}</Text> : null}
                          {expCompany ? (
                            <Text style={styles.expCompany}>{expCompany}</Text>
                          ) : null}
                        </View>

                        {expPeriod ? (
                          <View style={styles.expPeriodBadge}>
                            <Text style={styles.expPeriodText}>{expPeriod}</Text>
                          </View>
                        ) : null}
                      </View>

                      {expDescription ? (
                        <Text style={styles.expDescription}>{expDescription}</Text>
                      ) : null}

                      {bullets.map((bullet, bulletIndex) => (
                        <View key={`bullet-${bulletIndex}`} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </MainSection>
            )}

            {education.length > 0 && (
              <MainSection title="Education" icon={<GradCapIcon />}>
                {education.map((edu, index) => {
                  const degree = cleanText(edu.degree);
                  const institution = cleanText(edu.institution);
                  const location = cleanText(edu.location);
                  const period = getEducationPeriod(edu);
                  const gpa = cleanText(edu.gpa);

                  return (
                    <View key={`edu-${index}`} style={styles.expItem} wrap={false}>
                      <View style={styles.expDot} />

                      <View style={styles.expHeader}>
                        <View style={styles.expTitleWrap}>
                          {degree ? <Text style={styles.expTitle}>{degree}</Text> : null}
                          {institution ? (
                            <Text style={styles.expCompany}>{institution}</Text>
                          ) : null}
                        </View>

                        {period ? (
                          <View style={styles.expPeriodBadge}>
                            <Text style={styles.expPeriodText}>{period}</Text>
                          </View>
                        ) : null}
                      </View>

                      {location ? (
                        <Text style={styles.expDescription}>{location}</Text>
                      ) : null}

                      {gpa ? (
                        <Text style={styles.expDescription}>GPA: {gpa}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </MainSection>
            )}

            {certifications.length > 0 && (
              <MainSection title="Certifications" icon={<GradCapIcon />}>
                {certifications.map((cert, index) => (
                  <View key={`cert-${index}`} style={styles.certRow}>
                    <View style={styles.certBullet} />
                    <Text style={styles.certText}>{cert}</Text>
                  </View>
                ))}
              </MainSection>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default GeminiResumePdf;