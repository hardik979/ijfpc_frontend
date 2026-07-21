import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { normalizeSectionPages } from "@/lib/resume";
import {
  Avatar,
  CertList,
  ContactRow,
  EducationList,
  ExperienceList,
  HighlightedSummary,
  ProjectsBlock,
  cleanText,
  extractSections,
  getBasePageStyle,
  hasSummary,
  hasText,
  resolveThemePalette,
  styles,
  type ResumeData,
  type SectionKey,
  type ThemePalette,
} from "./shared";

/** Underlined, uppercase section title — the plain ATS look (no colour bar). */
function AtsSectionTitle({
  title,
  palette,
}: {
  title: string;
  palette: ThemePalette;
}) {
  return (
    // wrap={false} keeps the rule and its title together, so the underline can
    // never be left behind on the previous page.
    <View
      wrap={false}
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

/**
 * ATS CLASSIC — clean single column, maximum parser compatibility.
 *
 * Short sections render as one atomic block (`wrap={false}`) so their heading
 * and content can never be split across a page break. Long sections
 * (experience/projects) must flow across pages, so they weld their heading to
 * their first entry inside the shared list components instead.
 */
export default function AtsClassicTemplate({ data }: { data: ResumeData }) {
  const palette = resolveThemePalette((data as any).theme);
  const { skills, languages, experience, education, projects, certifications } =
    extractSections(data);

  const sectionPages = normalizeSectionPages(data.sectionPages);

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case "summary":
        return hasSummary(data) ? (
          <View wrap={false}>
            <AtsSectionTitle title="Summary" palette={palette} />
            <HighlightedSummary
              data={data}
              style={{ ...styles.text, color: palette.text }}
            />
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
            heading={
              <AtsSectionTitle title="Professional Experience" palette={palette} />
            }
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

  // Spacing lives on the TOP of every section except the first, so the last
  // section never carries a bottom margin that could overflow into an
  // otherwise-blank extra page.
  let flat = 0;

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...getBasePageStyle(data, palette),
          paddingHorizontal: 38,
          paddingVertical: 30,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          {hasText(data.photo) && (
            <View style={{ marginBottom: 6 }}>
              <Avatar src={data.photo} size={66} borderColor={palette.border} />
            </View>
          )}
          <Text
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: palette.text,
              letterSpacing: 0.5,
            }}
          >
            {cleanText(data.fullName) || "Your Name"}
          </Text>
          {hasText(data.role) && (
            <Text style={{ fontSize: 11, color: palette.primary, marginTop: 3 }}>
              {data.role}
            </Text>
          )}
          <View style={{ marginTop: 5, maxWidth: "94%" }}>
            <ContactRow
              data={data}
              color={palette.subText}
              fontSize={8.8}
              justify="center"
            />
          </View>
        </View>

        {sectionPages.map((keys, pageIndex) => {
          const rendered = keys
            .map((sectionKey) => ({ sectionKey, node: renderSection(sectionKey) }))
            .filter((s) => s.node);
          // `break` starts each editor page's first section on a fresh PDF page,
          // so the exported PDF mirrors the drag-and-drop layout.
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
        })}

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
