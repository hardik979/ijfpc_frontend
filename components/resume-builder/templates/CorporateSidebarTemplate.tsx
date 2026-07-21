import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  Avatar,
  CertList,
  ContactLines,
  ExperienceList,
  HighlightedSummary,
  ProjectsBlock,
  Section,
  SectionHeading,
  cleanText,
  dateRange,
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

/* A4 in PDF points — used to bleed the sidebar rail past the page padding. */
const A4_HEIGHT = 841.89;
/** Vertical page padding. Repeats on every page, so flowing content on page 2+
 *  keeps a proper top/bottom margin. */
const PAD_V = 22;
/** Width of the dark sidebar rail. */
const SIDEBAR_W = "33%";

/**
 * CORPORATE SIDEBAR — dark full-height rail on the left, flowing main column.
 *
 * The layout problem this solves: react-pdf CANNOT page-break content inside a
 * `flexDirection: "row"`. A naive two-column row therefore traps Experience in
 * the right cell, and the whole section jumps wholesale to page 2 the moment it
 * doesn't fit — leaving page 1 half-empty and the sidebar a stubby block.
 *
 * So this template never puts the two columns in a row at all:
 *
 *   1. the coloured rail is a `fixed` absolute box → repeats on EVERY page, so
 *      the sidebar reads as a real full-height rail, not an intro block;
 *   2. the SHORT sections (contact / skills / education / languages / certs) are
 *      absolutely positioned over the rail → out of flow, so they can't block
 *      the main column from breaking. They live on page 1;
 *   3. the LONG sections (summary / experience / projects) are in NORMAL flow
 *      with a left margin clearing the rail → they fill page 1 and paginate
 *      naturally onto page 2+, where the rail is still painted beside them.
 *
 * Trade-off: sidebar content is page-1 only (absolute boxes don't paginate), so
 * it is styled tight to fit. That is the right call here — skills/education/
 * languages are short by nature, which is exactly why they belong on the left.
 */
export default function CorporateSidebarTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  const rank = sectionRankMap(data);

  const sidebarHeading = {
    fontSize: 9.5,
    fontWeight: 700 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: palette.sidebarText,
    marginBottom: 5,
  };

  /* ---------------- LEFT: short sections, over the rail ---------------- */
  const sidebarSections = orderByRank(
    [
      {
        key: "skills",
        node:
          skills.length > 0 ? (
            <View style={{ marginBottom: 13 }}>
              <Text style={sidebarHeading}>Technical Skills</Text>
              {skills.map((skill, i) => (
                <Text
                  key={i}
                  style={{
                    fontSize: 8.5,
                    color: palette.sidebarText,
                    marginBottom: 2.5,
                    lineHeight: 1.35,
                  }}
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
            <View style={{ marginBottom: 13 }}>
              <Text style={sidebarHeading}>Education</Text>
              {education.map((edu: any, index: number) => {
                const range = dateRange(
                  edu.startYear,
                  edu.endYear,
                  edu.currentlyStudying ? "Present" : ""
                );
                return (
                  <View key={index} style={{ marginBottom: 6 }}>
                    <Text
                      style={{
                        fontSize: 8.8,
                        fontWeight: 700,
                        color: palette.sidebarText,
                        lineHeight: 1.3,
                      }}
                    >
                      {cleanText(edu.degree) || "Degree"}
                    </Text>
                    {hasText(edu.institution) && (
                      <Text
                        style={{ fontSize: 8, color: palette.chipBg, marginTop: 1 }}
                      >
                        {edu.institution}
                      </Text>
                    )}
                    {!!range && (
                      <Text
                        style={{ fontSize: 7.8, color: palette.chipBg, marginTop: 1 }}
                      >
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
            <View style={{ marginBottom: 13 }}>
              <Text style={sidebarHeading}>Languages</Text>
              {languages.map((lang, i) => (
                <Text
                  key={i}
                  style={{
                    fontSize: 8.5,
                    color: palette.sidebarText,
                    marginBottom: 2.5,
                  }}
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
  const mainSections = orderByRank(
    [
      {
        key: "summary",
        node: hasSummary(data) ? (
          <Section title="Professional Summary" palette={palette}>
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
                heading={
                  <SectionHeading title="Work Experience" palette={palette} />
                }
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
          // vertical padding only — it repeats per page and keeps flowing
          // content off the top/bottom edges. Horizontal spacing lives on the
          // main column so the rail can sit flush against the page edge.
          padding: 0,
          paddingTop: PAD_V,
          paddingBottom: PAD_V,
        }}
      >
        {/* 1. Full-height coloured rail — `fixed` repeats it on every page.
               It starts PAD_V ABOVE the page top, so it must be a full page PLUS
               both paddings tall to also clear the bottom edge. With a plain
               A4_HEIGHT it ran out exactly PAD_V early and left a white strip
               along the bottom of the rail. */}
        <View
          fixed
          style={{
            position: "absolute",
            top: -PAD_V,
            left: 0,
            width: SIDEBAR_W,
            height: A4_HEIGHT + PAD_V * 2,
            backgroundColor: palette.sidebarBg,
          }}
        />

        {/* 2. Sidebar content — absolute (out of flow) so it can never stop the
               main column from paginating. Page 1 only. */}
        <View
          style={{
            position: "absolute",
            top: -PAD_V,
            left: 0,
            width: SIDEBAR_W,
            paddingTop: 40,
            paddingBottom: 18,
            paddingHorizontal: 15,
          }}
        >
          {hasText(data.photo) && (
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Avatar src={data.photo} size={84} borderColor={palette.sidebarText} />
            </View>
          )}

          <Text
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: palette.sidebarText,
              lineHeight: 1.2,
            }}
          >
            {cleanText(data.fullName) || "Your Name"}
          </Text>
          {hasText(data.role) && (
            <Text
              style={{
                fontSize: 9,
                color: palette.chipBg,
                marginTop: 3,
                marginBottom: 13,
                lineHeight: 1.3,
              }}
            >
              {data.role}
            </Text>
          )}

          <View style={{ marginBottom: 13 }}>
            <Text style={sidebarHeading}>Contact</Text>
            <ContactLines data={data} palette={palette} light />
          </View>

          {sidebarSections.map((s) => (
            <React.Fragment key={s.key}>{s.node}</React.Fragment>
          ))}

          {certifications.length > 0 && (
            <View style={{ marginBottom: 13 }}>
              <Text style={sidebarHeading}>Certifications</Text>
              <CertList items={certifications} palette={palette} light />
            </View>
          )}
        </View>

        {/* 3. Main column — NORMAL flow, clear of the rail. Breaks across pages. */}
        <View style={{ marginLeft: SIDEBAR_W, paddingLeft: 20, paddingRight: 26 }}>
          {mainSections.map((s) => (
            <React.Fragment key={s.key}>{s.node}</React.Fragment>
          ))}
        </View>
      </Page>
    </Document>
  );
}
