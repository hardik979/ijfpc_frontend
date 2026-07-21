import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  Avatar,
  CertList,
  ContactRow,
  EducationList,
  ExperienceList,
  HighlightedSummary,
  ProjectsBlock,
  Section,
  SectionHeading,
  cleanText,
  extractSections,
  getBasePageStyle,
  hasSummary,
  hasText,
  orderByRank,
  resolveThemePalette,
  sectionRankMap,
  styles,
  type ResumeData,
} from "./shared";

const A4_HEIGHT = 841.89;
/** Vertical page padding — repeats per page, keeping page 2+ off the edges. */
const PAD_V = 20;
/** Width of the narrow left column. */
const LEFT_W = "34%";
/** Gap between the band and the content below it. */
const BAND_GAP = 16;

/**
 * MODERN BAND — full-width colour band, tinted short-section column, flowing
 * main column.
 *
 * Same core constraint as the corporate template: react-pdf cannot page-break
 * inside a `flexDirection: "row"`, so a real two-column row would trap
 * Experience and dump it wholesale onto page 2. Structure used instead:
 *
 *   1. a `fixed` tinted rail behind the left column → repeats on every page, so
 *      the left gutter still reads as designed once content spills to page 2;
 *   2. the colour band sits absolute at the top of page 1 with a FIXED height,
 *      which is what lets the left column be positioned right below it;
 *   3. SHORT sections (skills / education / languages / certs) are absolutely
 *      positioned on the rail → out of flow, page 1;
 *   4. LONG sections (profile summary / experience / projects) flow normally in
 *      the right column and paginate across pages. A one-time spacer clears the
 *      band on page 1; page 2+ starts at the normal top margin.
 */
export default function ModernBandTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  const rank = sectionRankMap(data);
  const showPhoto = hasText(data.photo);

  // Fixed band height so the left column knows exactly where to start. Sized
  // to comfortably hold name + role + a wrapped contact row (and the avatar).
  const BAND_H = showPhoto ? 124 : 112;

  const colHeading = {
    fontSize: 9.5,
    fontWeight: 700 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: palette.primary,
    marginBottom: 5,
  };

  /* ---------------- LEFT: short sections ---------------- */
  const leftSections = orderByRank(
    [
      {
        key: "skills",
        node:
          skills.length > 0 ? (
            <View style={{ marginBottom: 13 }}>
              <Text style={colHeading}>Skills</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {skills.map((skill, i) => (
                  <Text
                    key={i}
                    style={{
                      fontSize: 8,
                      paddingVertical: 2.5,
                      paddingHorizontal: 6,
                      borderRadius: 4,
                      marginRight: 3.5,
                      marginBottom: 3.5,
                      backgroundColor: palette.chipBg,
                      color: palette.chipText,
                    }}
                  >
                    {skill}
                  </Text>
                ))}
              </View>
            </View>
          ) : null,
      },
      {
        key: "education",
        node:
          education.length > 0 ? (
            <View style={{ marginBottom: 13 }}>
              <Text style={colHeading}>Education</Text>
              <EducationList items={education} palette={palette} compact />
            </View>
          ) : null,
      },
      {
        key: "languages",
        node:
          languages.length > 0 ? (
            <View style={{ marginBottom: 13 }}>
              <Text style={colHeading}>Languages</Text>
              {languages.map((lang, i) => (
                <Text
                  key={i}
                  style={{ fontSize: 8.5, color: palette.text, marginBottom: 2.5 }}
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

  /* ---------------- RIGHT: long sections, in normal flow ---------------- */
  const rightSections = orderByRank(
    [
      {
        key: "summary",
        node: hasSummary(data) ? (
          <Section title="Profile" palette={palette}>
            <HighlightedSummary
              data={data}
              style={{ ...styles.text, color: palette.text }}
            />
          </Section>
        ) : null,
      },
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
          paddingTop: PAD_V,
          paddingBottom: PAD_V,
        }}
      >
        {/* 1. Tinted left rail — `fixed` so the gutter still reads as designed
               on page 2+ once the main column spills over. Starts PAD_V above
               the page top, so it needs a full page PLUS both paddings of height
               to also clear the bottom edge (otherwise it stops PAD_V short and
               leaves a white strip under the rail). */}
        <View
          fixed
          style={{
            position: "absolute",
            top: -PAD_V,
            left: 0,
            width: LEFT_W,
            height: A4_HEIGHT + PAD_V * 2,
            backgroundColor: palette.soft,
          }}
        />

        {/* 2. Colour band — page 1 only, flush to the top/side edges. */}
        <View
          style={{
            position: "absolute",
            top: -PAD_V,
            left: 0,
            right: 0,
            height: BAND_H,
            backgroundColor: palette.primary,
            paddingVertical: 18,
            paddingHorizontal: 26,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>
              {cleanText(data.fullName) || "Your Name"}
            </Text>
            {hasText(data.role) && (
              <Text
                style={{ fontSize: 11, color: palette.chipBg, marginTop: 3 }}
              >
                {data.role}
              </Text>
            )}
            <View style={{ marginTop: 7 }}>
              <ContactRow data={data} color="#FFFFFF" fontSize={8.5} />
            </View>
          </View>

          {showPhoto && (
            <View style={{ marginLeft: 16 }}>
              <Avatar src={data.photo} size={72} borderColor="#FFFFFF" />
            </View>
          )}
        </View>

        {/* 3. Left column content — absolute (out of flow), starts below the
               band so it can't stop the main column from paginating. */}
        <View
          style={{
            position: "absolute",
            top: -PAD_V + BAND_H + BAND_GAP,
            left: 0,
            width: LEFT_W,
            paddingHorizontal: 15,
          }}
        >
          {leftSections.map((s) => (
            <React.Fragment key={s.key}>{s.node}</React.Fragment>
          ))}

          {certifications.length > 0 && (
            <View style={{ marginBottom: 13 }}>
              <Text style={colHeading}>Certifications</Text>
              <CertList items={certifications} palette={palette} />
            </View>
          )}
        </View>

        {/* 4. Main column — NORMAL flow, breaks across pages. */}
        <View style={{ marginLeft: LEFT_W, paddingLeft: 18, paddingRight: 24 }}>
          {/* one-time spacer clearing the band on page 1; page 2+ starts at the
              normal top margin because this only occupies space once */}
          <View style={{ height: BAND_H - PAD_V + BAND_GAP }} />
          {rightSections.map((s) => (
            <React.Fragment key={s.key}>{s.node}</React.Fragment>
          ))}
        </View>
      </Page>
    </Document>
  );
}
