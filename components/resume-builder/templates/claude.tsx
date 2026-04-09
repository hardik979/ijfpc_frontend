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
import type { ResumeData } from "@/lib/resume";

type EducationItem = {
  degree?: string;
  institution?: string;
  period?: string;
  location?: string;
  startYear?: string;
  endYear?: string;
  currentlyStudying?: boolean;
};

type ExperienceItem = {
  title?: string;
  jobTitle?: string;
  company?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
  bullets?: string[];
};

type CertificationItem =
  | string
  | {
    name?: string;
    title?: string;
    issuer?: string;
    organization?: string;
    year?: string;
  };

type ReferenceItem = {
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
};

interface Props {
  data: ResumeData;
}

const NAVY = "#1e2d3d";
const TEAL = "#6b9e8f";
const MUTED_LIGHT = "#b8ccd8";
const TEXT_DARK = "#333333";
const TEXT_MID = "#555555";
const TEXT_SOFT = "#666666";

function cleanText(value?: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeParagraph(value?: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function toArray<T>(value: T[] | T | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeStringArray(value?: string[] | string | null): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinDateRange(
  start?: string,
  end?: string,
  currentlyWorking?: boolean
): string {
  const s = cleanText(start);
  const e = cleanText(end);

  if (s && e) return `${s} - ${e}`;
  if (s && currentlyWorking) return `${s} - Present`;
  if (s) return s;
  if (e) return e;
  return "";
}

function getEducationPeriod(item: EducationItem): string {
  if (cleanText(item.period)) return cleanText(item.period);

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
  if (cleanText(item.period)) return cleanText(item.period);
  return joinDateRange(item.startDate, item.endDate, item.currentlyWorking);
}

function getPhoto(data: ResumeData): string {
  return cleanText(data.profileImage);
}

function getWebsite(data: ResumeData): string {
  return cleanText(
    (data as any).website ||
    (data as any).portfolio ||
    data.linkedin ||
    (data as any).github
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: TEXT_DARK,
    fontFamily: "Helvetica",
    fontSize: 11.5,
    lineHeight: 1.45,
    padding: 0,
  },

  container: {
    flexDirection: "column",
    minHeight: "100%",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 28,
    backgroundColor: "#ffffff",
  },

  headerWithPhoto: {
    gap: 18,
  },

  headerNoPhoto: {
    justifyContent: "flex-start",
  },

photoWrap: {
  width: 110,
  height: 110,
  borderRadius: 55,
  overflow: "hidden",
  borderWidth: 4,
  borderColor: NAVY,
  backgroundColor: NAVY,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

photo: {
  width: 110,
  height: 110,
  borderRadius: 55,
  objectFit: "cover",
},

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  headerTextNoPhoto: {
    width: "100%",
  },

  fullName: {
    fontFamily: "Times-Bold",
    fontSize: 30,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 1.1,
  },

  jobTitle: {
    marginTop: 8,
    fontSize: 10.5,
    color: "#777777",
    textTransform: "uppercase",
    letterSpacing: 2.5,
  },

  contactBar: {
    backgroundColor: NAVY,
    color: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
    marginBottom: 4,
    maxWidth: "48%",
  },

  contactIcon: {
    width: 13,
    height: 13,
    marginRight: 6,
    color: "#ffffff",
  },

  contactText: {
    fontSize: 10,
    color: "#ffffff",
    lineHeight: 1.3,
  },

  body: {
    flexDirection: "row",
    flex: 1,
  },

  sidebar: {
    width: 220,
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },

  main: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  sidebarSection: {
    marginBottom: 18,
  },

  sidebarHeading: {
    fontFamily: "Times-Bold",
    fontSize: 12.5,
    color: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.25)",
    paddingBottom: 5,
    marginBottom: 8,
  },

  mainSection: {
    marginBottom: 18,
  },

  mainHeading: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    color: TEAL,
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
    paddingBottom: 5,
    marginBottom: 8,
  },

  sidebarTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    lineHeight: 1.3,
  },

  sidebarText: {
    fontSize: 10,
    color: MUTED_LIGHT,
    lineHeight: 1.35,
    marginTop: 1,
  },

  sidebarItem: {
    marginBottom: 12,
  },

  skillText: {
    fontSize: 10,
    color: MUTED_LIGHT,
    lineHeight: 1.35,
    marginBottom: 4,
  },

  paragraph: {
    fontSize: 10.9,
    color: TEXT_MID,
    lineHeight: 1.65,
    textAlign: "justify",
    paddingRight: 4,
  },

  expItem: {
    marginBottom: 14,
  },

  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 2,
  },

  expTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#222222",
    lineHeight: 1.35,
  },

  expPeriod: {
    fontSize: 10,
    color: "#777777",
    textAlign: "right",
    minWidth: 75,
  },

  expCompany: {
    fontSize: 10.5,
    color: TEXT_SOFT,
    marginBottom: 4,
    fontStyle: "italic",
  },

  expDescription: {
    fontSize: 10.5,
    color: TEXT_MID,
    lineHeight: 1.55,
    marginBottom: 4,
    textAlign: "justify",
    paddingRight: 2,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
    paddingRight: 4,
  },

  bulletDot: {
    width: 10,
    fontSize: 10.5,
    color: TEXT_MID,
    lineHeight: 1.4,
  },

  bulletText: {
    flex: 1,
    fontSize: 10.5,
    color: TEXT_MID,
    lineHeight: 1.5,
  },

  refsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },

  refCard: {
    width: "47%",
    marginBottom: 8,
  },

  refName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#222222",
    marginBottom: 2,
  },

  refText: {
    fontSize: 10.5,
    color: TEXT_SOFT,
    lineHeight: 1.4,
    marginBottom: 1,
  },
});

function PhoneIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function HomeIcon() {
  return (
    <Svg style={styles.contactIcon} viewBox="0 0 24 24">
      <Path
        d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
        fill="#ffffff"
      />
    </Svg>
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

function MainSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.mainSection}>
      <Text style={styles.mainHeading}>{title}</Text>
      {children}
    </View>
  );
}

export function ClaudeTemplatePdf({ data }: Props) {
  const fullName = cleanText(data.fullName || (data as any).name);
  const jobTitle = cleanText(data.jobRole || (data as any).jobTitle);
  const phone = cleanText(data.phone);
  const email = cleanText(data.email);
  const website = getWebsite(data);
  const address = cleanText(data.address);
  const photo = getPhoto(data);
  const hasPhoto = !!photo;
  const summary = normalizeParagraph(data.summary || (data as any).about);

  const education = toArray((data as any).education as EducationItem[]).filter(
    (item) =>
      cleanText(item?.degree) ||
      cleanText(item?.institution) ||
      getEducationPeriod(item) ||
      cleanText(item?.location)
  );

  const certifications = toArray((data as any).certifications as CertificationItem[])
    .map(getCertificationText)
    .filter(Boolean);

  const skills = normalizeStringArray((data as any).skills);
  const languages = normalizeStringArray((data as any).languages);

  const experience = toArray((data as any).experience as ExperienceItem[]).filter((item) => {
    const bullets = toArray(item?.bullets).map(cleanText).filter(Boolean);
    return (
      getExperienceTitle(item) ||
      cleanText(item?.company) ||
      getExperiencePeriod(item) ||
      cleanText(item?.description) ||
      bullets.length > 0
    );
  });

  const references = toArray((data as any).references as ReferenceItem[]).filter(
    (item) =>
      cleanText(item?.name) ||
      cleanText(item?.title) ||
      cleanText(item?.company) ||
      cleanText(item?.phone) ||
      cleanText(item?.email)
  );

  const contactItems = [
    { key: "phone", icon: <PhoneIcon />, text: phone },
    { key: "email", icon: <MailIcon />, text: email },
    { key: "website", icon: <GlobeIcon />, text: website },
    { key: "address", icon: <HomeIcon />, text: address },
  ].filter((item) => cleanText(item.text));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <View
            style={hasPhoto ? [styles.header, styles.headerWithPhoto] : [styles.header, styles.headerNoPhoto]}
          >
            {hasPhoto ? (
              <View style={styles.photoWrap}>
                <Image style={styles.photo} src={photo} />
              </View>
            ) : null}

            <View
              style={
                hasPhoto
                  ? styles.headerText
                  : [styles.headerText, styles.headerTextNoPhoto]
              }
            >
              <Text style={styles.fullName}>{fullName || "Your Name"}</Text>
              {!!jobTitle && <Text style={styles.jobTitle}>{jobTitle}</Text>}
            </View>
          </View>

          {contactItems.length > 0 && (
            <View style={styles.contactBar}>
              {contactItems.map((item) => (
                <View key={item.key} style={styles.contactItem}>
                  {item.icon}
                  <Text style={styles.contactText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.sidebar}>
              {education.length > 0 && (
                <SidebarSection title="Education">
                  {education.map((edu, i) => (
                    <View key={`edu-${i}`} style={styles.sidebarItem}>
                      {!!cleanText(edu.degree) && (
                        <Text style={styles.sidebarTitle}>{edu.degree}</Text>
                      )}
                      {!!cleanText(edu.institution) && (
                        <Text style={styles.sidebarText}>{edu.institution}</Text>
                      )}
                      {!!getEducationPeriod(edu) && (
                        <Text style={styles.sidebarText}>
                          {getEducationPeriod(edu)}
                        </Text>
                      )}
                      {!!cleanText(edu.location) && (
                        <Text style={styles.sidebarText}>{edu.location}</Text>
                      )}
                    </View>
                  ))}
                </SidebarSection>
              )}

              {certifications.length > 0 && (
                <SidebarSection title="Certifications">
                  {certifications.map((item, i) => (
                    <View key={`cert-${i}`} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={[styles.bulletText, { color: MUTED_LIGHT }]}>
                        {normalizeParagraph(item)}
                      </Text>
                    </View>
                  ))}
                </SidebarSection>
              )}

              {skills.length > 0 && (
                <SidebarSection title="Skills">
                  {skills.map((skill, i) => (
                    <Text key={`skill-${i}`} style={styles.skillText}>
                      {normalizeParagraph(skill)}
                    </Text>
                  ))}
                </SidebarSection>
              )}

              {languages.length > 0 && (
                <SidebarSection title="Languages">
                  {languages.map((lang, i) => (
                    <Text key={`lang-${i}`} style={styles.skillText}>
                      {normalizeParagraph(lang)}
                    </Text>
                  ))}
                </SidebarSection>
              )}
            </View>

            <View style={styles.main}>
              {!!summary && (
                <MainSection title="About Me">
                  <Text style={styles.paragraph}>{summary}</Text>
                </MainSection>
              )}

              {experience.length > 0 && (
                <MainSection title="Experience">
                  {experience.map((exp, i) => {
                    const expTitle = getExperienceTitle(exp);
                    const expCompany = cleanText(exp.company);
                    const expPeriod = getExperiencePeriod(exp);
                    const expDescription = normalizeParagraph(exp.description);
                    const bullets = toArray(exp.bullets)
                      .map((item) => normalizeParagraph(item))
                      .filter(Boolean);

                    return (
                      <View key={`exp-${i}`} style={styles.expItem}>
                        <View style={styles.expHeader}>
                          <Text style={styles.expTitle}>{expTitle}</Text>
                          {!!expPeriod && (
                            <Text style={styles.expPeriod}>{expPeriod}</Text>
                          )}
                        </View>

                        {!!expCompany && (
                          <Text style={styles.expCompany}>{expCompany}</Text>
                        )}

                        {!!expDescription && (
                          <Text style={styles.expDescription}>
                            {expDescription}
                          </Text>
                        )}

                        {bullets.map((bullet, bulletIndex) => (
                          <View
                            key={`bullet-${bulletIndex}`}
                            style={styles.bulletRow}
                          >
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </MainSection>
              )}

              {references.length > 0 && (
                <MainSection title="Reference">
                  <View style={styles.refsWrap}>
                    {references.map((ref, i) => {
                      const name = cleanText(ref.name);
                      const title = cleanText(ref.title);
                      const company = cleanText(ref.company);
                      const phone = cleanText(ref.phone);
                      const email = cleanText(ref.email);

                      return (
                        <View key={`ref-${i}`} style={styles.refCard}>
                          {(name || title) && (
                            <Text style={styles.refName}>
                              {[name, title].filter(Boolean).join(" | ")}
                            </Text>
                          )}
                          {!!company && (
                            <Text style={styles.refText}>{company}</Text>
                          )}
                          {!!phone && (
                            <Text style={styles.refText}>{phone}</Text>
                          )}
                          {!!email && (
                            <Text style={styles.refText}>{email}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </MainSection>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default ClaudeTemplatePdf;