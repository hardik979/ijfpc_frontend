import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { normalizeSectionPages } from "@/lib/resume";
import {
  Avatar,
  BulletItem,
  ContactRow,
  HighlightedSummary,
  ProjectsBlock,
  Section,
  SectionHeading,
  cleanText,
  extractSections,
  getBasePageStyle,
  hasCertifications,
  hasExtraProfileInfo,
  hasSummary,
  hasText,
  nonEmptyArray,
  resolveThemePalette,
  styles,
  type ResumeData,
  type SectionKey,
} from "./shared";

/**
 * NAUKRI STYLE — single column, recruiter-friendly.
 *
 * Single-column flow means every section can page-break naturally, so this
 * template honours the drag-and-drop `sectionPages` layout directly: the first
 * section of each editor page starts on a fresh PDF page via `break`.
 */
export default function NaukriTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  const totalExperience =
    cleanText((data as any).totalExperience) ||
    cleanText((data as any).relevantExperience) ||
    "";

  const sectionPages = normalizeSectionPages(data.sectionPages);

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return hasSummary(data) ? (
          <Section title="Profile Summary" palette={palette}>
            <HighlightedSummary
              data={data}
              style={{ ...styles.text, color: "#111827" }}
            />
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
                  <Text
                    style={{ fontSize: 9.1, color: palette.secondary, marginTop: 2 }}
                  >
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
          const points = nonEmptyArray(
            exp?.bullets?.length ? exp.bullets : exp?.points
          );
          const metrics = nonEmptyArray((exp as any).metrics);
          return (
            <>
              {metrics.length > 0 && (
                <View style={styles.naukriMetricWrap}>
                  {metrics.map((metric, mi) => (
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

        return (
          <View style={styles.section}>
            {experience.map((exp: any, i: number) => (
              <View key={i} style={cardStyle}>
                {i === 0 ? (
                  // Weld the section heading (bar + title) to the first job's
                  // header so the heading can never be stranded alone at the
                  // bottom of a page while the first job starts on the next.
                  <View wrap={false}>
                    <SectionHeading title="Work Experience" palette={palette} />
                    {renderCardHeader(exp)}
                  </View>
                ) : (
                  renderCardHeader(exp)
                )}
                {renderCardBody(exp)}
              </View>
            ))}
          </View>
        );
      }

      case "skills":
        return skills.length > 0 ? (
          <Section title="Technical Skills" palette={palette} keepTogether>
            <View style={styles.naukriPillWrap}>
              {skills.map((skill, i) => (
                <Text
                  key={`${skill}-${i}`}
                  style={{
                    ...styles.naukriPill,
                    backgroundColor: palette.chipBg,
                    color: palette.chipText,
                    borderColor: palette.border,
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
          <Section title="Education" palette={palette} keepTogether>
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
                        <Text
                          style={{
                            fontSize: 9,
                            color: palette.secondary,
                            marginTop: 2,
                          }}
                        >
                          {edu.institution}
                        </Text>
                      )}
                    </View>

                    <View style={{ width: "30%", alignItems: "flex-end" }}>
                      {(hasText(edu.startYear) || hasText(edu.endYear)) && (
                        <Text style={{ fontSize: 8.4, color: "#6B7280" }}>
                          {cleanText(edu.startYear)}
                          {cleanText(edu.startYear) || cleanText(edu.endYear)
                            ? " – "
                            : ""}
                          {cleanText(edu.endYear) ||
                            (edu.currentlyStudying ? "Present" : "")}
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
              palette={palette}
              heading={
                <SectionHeading title="Projects & Open Source" palette={palette} />
              }
            />
          </View>
        ) : null;

      case "languages":
        return languages.length > 0 || hasExtraProfileInfo(data) ? (
          <Section title="Languages" palette={palette} keepTogether>
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
                  <InfoCard label="Current CTC" value={(data as any).currentCtc} />
                )}
                {hasText((data as any).expectedCtc) && (
                  <InfoCard label="Expected CTC" value={(data as any).expectedCtc} />
                )}
                {hasText(totalExperience) && (
                  <InfoCard label="Total Experience" value={totalExperience} />
                )}
                {hasText((data as any).relevantExperience) && (
                  <InfoCard
                    label="Relevant Experience"
                    value={(data as any).relevantExperience}
                  />
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
          ...getBasePageStyle(data, palette),
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
            backgroundColor: palette.soft,
            borderBottomColor: palette.primary,
            flexDirection: "row",
            alignItems: "center",
            // cancel the page's top padding so the header band stays edge-to-edge
            marginTop: -16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...styles.naukriName, color: palette.primary }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            <Text style={{ ...styles.naukriRole, color: palette.secondary }}>
              {cleanText(data.role) || "Professional Title"}
            </Text>

            <View style={{ ...styles.naukriContactRow, marginTop: 4 }}>
              <ContactRow data={data} color={palette.secondary} fontSize={9} />
            </View>
          </View>

          {hasText(data.photo) && (
            <View style={{ marginLeft: 14 }}>
              <Avatar src={data.photo} size={70} borderColor={palette.primary} />
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
            <Section title="Certifications" palette={palette}>
              <View style={styles.row}>
                {[0, 1].map((col) => (
                  <View
                    key={col}
                    style={{
                      width: "50%",
                      ...(col === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }),
                    }}
                  >
                    {certifications
                      .filter((_: any, i: number) => i % 2 === col)
                      .map((cert: any, i: number) => (
                        <View key={i} style={{ marginBottom: 6 }}>
                          <Text
                            style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}
                          >
                            {typeof cert === "string"
                              ? cert
                              : cleanText(cert?.name) || "Certification"}
                          </Text>
                          {typeof cert !== "string" && hasText(cert?.issuer) && (
                            <Text style={{ fontSize: 8.5, color: "#6B7280" }}>
                              {cert.issuer}
                            </Text>
                          )}
                        </View>
                      ))}
                  </View>
                ))}
              </View>
            </Section>
          )}
        </View>
      </Page>
    </Document>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.naukriInfoCard}>
      <Text style={{ ...styles.smallText, color: "#6B7280" }}>{label}</Text>
      <Text style={{ fontSize: 9.4, fontWeight: 700, color: "#111827" }}>{value}</Text>
    </View>
  );
}
