import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Svg,
  Path,
  Text,
  View,
} from "@react-pdf/renderer";
import { ResumeData } from "@/lib/resume";

type Props = {
  data: ResumeData;
};

const COLORS = {
  pageBg: "#d2cabf",
  rightPanel: "#f5f5f5",
  accent: "#cbb45f",
  textDark: "#30332f",
  textBody: "#595752",
  textMuted: "#77736c",
  line: "#6d6b66",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: COLORS.pageBg,
    color: COLORS.textDark,
    fontFamily: "Helvetica",
    fontSize: 11,
    padding: 0,
  },
  canvas: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  rightPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 320,
    height: "100%",
    backgroundColor: COLORS.rightPanel,
  },
  rightPanelCut: {
    position: "absolute",
    top: 118,
    left: -36,
    width: 76,
    height: 30,
    backgroundColor: COLORS.rightPanel,
    transform: "rotate(-6deg)",
  },
  topNameWrap: {
    position: "absolute",
    left: 42,
    top: 36,
    width: 250,
  },
  name: {
    fontSize: 34,
    lineHeight: 0.96,
    fontWeight: 700,
    color: COLORS.textDark,
    letterSpacing: -0.6,
  },
  role: {
    marginTop: 6,
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: 300,
  },
  photoFrameOuter: {
    position: "absolute",
    top: 22,
    right: 46,
    width: 150,
    height: 150,
    backgroundColor: COLORS.white,
    padding: 6,
  },
  photoFrameInner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#c8b889",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  sectionTitleLeft: {
    position: "relative",
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  leftRibbon: {
    position: "absolute",
    left: -40,
    top: 6,
    width: 28,
    height: 18,
    backgroundColor: COLORS.accent,
  },
  leftColumn: {
    position: "absolute",
    left: 40,
    top: 178,
    width: 235,
    bottom: 32,
  },
  aboutSection: {
    marginBottom: 34,
  },
  aboutText: {
    fontSize: 10.9,
    lineHeight: 1.65,
    color: COLORS.textBody,
    textAlign: "justify",
    paddingRight: 4,
    maxLines: 9,
  },
  skillSection: {
    marginBottom: 34,
  },
  bulletList: {
    paddingLeft: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bulletDot: {
    width: 8,
    fontSize: 11,
    lineHeight: 1.25,
    color: COLORS.textDark,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.8,
    lineHeight: 1.45,
    color: COLORS.textBody,
    textAlign: "left",
  },
  contactSection: {
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingRight: 10,
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#4a4f48",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  contactText: {
    flex: 1,
    fontSize: 10.8,
    lineHeight: 1.4,
    color: COLORS.textBody,
  },
  rightContent: {
    position: "absolute",
    right: 34,
    top: 186,
    width: 255,
    bottom: 28,
  },
  bannerSection: {
    marginBottom: 30,
    position: "relative",
  },
  ribbonWrap: {
    position: "relative",
    marginBottom: 14,
  },
  ribbonBody: {
    backgroundColor: COLORS.accent,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginLeft: -34,
    width: 286,
  },
  ribbonTail: {
    position: "absolute",
    left: -2,
    bottom: -11,
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderTopColor: "#a99242",
    borderRightWidth: 12,
    borderRightColor: "transparent",
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.textDark,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
  },
  timelineRail: {
    width: 22,
    alignItems: "center",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#40443f",
    marginTop: 5,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.line,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 2,
  },
  dateText: {
    fontSize: 9.8,
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 11.8,
    fontWeight: 400,
    color: COLORS.textBody,
    marginBottom: 2,
  },
  itemSubTitle: {
    fontSize: 11,
    color: COLORS.textBody,
    marginBottom: 1,
  },
  itemMeta: {
    fontSize: 10.4,
    color: COLORS.textMuted,
    lineHeight: 1.35,
  },
  workItem: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
  },
  workTextBlock: {
    flex: 1,
    paddingLeft: 10,
  },
  workTitleLine: {
    fontSize: 11.8,
    color: COLORS.textBody,
    lineHeight: 1.25,
  },
  workCompanyLine: {
    fontSize: 11,
    color: COLORS.textBody,
    lineHeight: 1.3,
    marginBottom: 2,
  },
  nestedBulletList: {
    paddingLeft: 10,
    marginTop: 2,
  },
  nestedBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  nestedBulletDot: {
    width: 8,
    fontSize: 10.5,
    lineHeight: 1.25,
    color: COLORS.textBody,
  },
  nestedBulletText: {
    flex: 1,
    fontSize: 10.4,
    lineHeight: 1.45,
    color: COLORS.textBody,
    textAlign: "left",
  },
});

function clean(value?: string | null) {
  return (value ?? "").toString().trim();
}

function normalizeParagraph(value?: string | null) {
  return (value ?? "")
    .toString()
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function joinName(fullName?: string) {
  const safe = clean(fullName);
  if (!safe) return "";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return safe;
  return `${parts[0]} ${parts.slice(1).join(" ")}`;
}

function getFirstTwoLinesName(fullName?: string) {
  const safe = clean(fullName);
  if (!safe) return { first: "", second: "" };
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], second: "" };
  return {
    first: parts[0],
    second: parts.slice(1).join(" "),
  };
}

function formatDateRange(start?: string, end?: string, current?: boolean) {
  const s = clean(start);
  const e = current ? "present" : clean(end);
  if (s && e) return `${s}-${e}`;
  return s || e || "";
}

function safeArray<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

function nonEmptyStrings(value?: string[] | null) {
  return safeArray(value).map((item) => clean(item)).filter(Boolean);
}

function getContactItems(data: ResumeData) {
  const website = clean(data.linkedin);
  return [
    { type: "phone", value: clean(data.phone) },
    { type: "email", value: clean(data.email) },
    { type: "web", value: website },
    { type: "address", value: clean(data.address) },
  ].filter((item) => item.value);
}

function Icon({ type }: { type: "phone" | "email" | "web" | "address" }) {
  switch (type) {
    case "phone":
      return (
        <Svg width={10} height={10} viewBox="0 0 24 24">
          <Path
            d="M6.6 10.8c1.7 3.3 4.3 5.9 7.6 7.6l2.5-2.5c.3-.3.8-.4 1.2-.3 1 .3 2 .4 3.1.4.7 0 1.3.6 1.3 1.3V21c0 .7-.6 1.3-1.3 1.3C10.6 22.3 1.7 13.4 1.7 2.9 1.7 2.2 2.3 1.6 3 1.6h3.7c.7 0 1.3.6 1.3 1.3 0 1.1.1 2.1.4 3.1.1.4 0 .9-.3 1.2l-2.5 2.6Z"
            fill="#ffffff"
          />
        </Svg>
      );
    case "email":
      return (
        <Svg width={10} height={10} viewBox="0 0 24 24">
          <Path
            d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 2v.5l9 5.6 9-5.6V7H3Zm18 2.8-8.5 5.3a1 1 0 0 1-1 0L3 9.8V17h18V9.8Z"
            fill="#ffffff"
          />
        </Svg>
      );
    case "web":
      return (
        <Svg width={10} height={10} viewBox="0 0 24 24">
          <Path
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3.1a15.7 15.7 0 0 0-1.4-5 8.1 8.1 0 0 1 4.5 5ZM12 4.1c1 1.2 1.9 3.7 2.2 6.9H9.8c.3-3.2 1.2-5.7 2.2-6.9ZM4.6 13h3.1c.1 1.8.5 3.5 1.1 5a8 8 0 0 1-4.2-5Zm3.1-2H4.6a8 8 0 0 1 4.2-5c-.6 1.5-1 3.2-1.1 5Zm1.9 0c.3-3.5 1.4-6.3 2.4-7 1 0 2.1 3.5 2.4 7H9.6Zm4.8 2c-.3 3.5-1.4 6.3-2.4 7-1 0-2.1-3.5-2.4-7h4.8Zm.2 5c.6-1.5 1-3.2 1.1-5h3.1a8.1 8.1 0 0 1-4.2 5Z"
            fill="#ffffff"
          />
        </Svg>
      );
    case "address":
      return (
        <Svg width={10} height={10} viewBox="0 0 24 24">
          <Path
            d="M12 2c4.1 0 7.5 3.2 7.5 7.3 0 5.4-6.2 11.7-7 12.4a.7.7 0 0 1-1 0c-.8-.7-7-7-7-12.4C4.5 5.2 7.9 2 12 2Zm0 4.2a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z"
            fill="#ffffff"
          />
        </Svg>
      );
    default:
      return null;
  }
}

function LeftSectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleLeft}>
      <View style={styles.leftRibbon} />
      <Text>{title}</Text>
    </View>
  );
}

function BannerTitle({ title }: { title: string }) {
  return (
    <View style={styles.ribbonWrap}>
      <View style={styles.ribbonBody}>
        <Text style={styles.bannerTitle}>{title}</Text>
      </View>
      <View style={styles.ribbonTail} />
    </View>
  );
}

function EducationSection({ data }: { data: ResumeData }) {
  const items = safeArray(data.education).filter(
    (item) =>
      clean(item.degree) ||
      clean(item.institution) ||
      clean(item.startYear) ||
      clean(item.endYear)
  );

  if (!items.length) return null;

  const visibleItems = items.slice(0, 2);

  return (
    <View style={styles.bannerSection}>
      <BannerTitle title="Education" />
      {visibleItems.map((item, index) => {
        const range = formatDateRange(item.startYear, item.endYear, item.currentlyStudying);
        const degree = clean(item.degree);
        const institution = clean(item.institution);
        const location = nonEmptyStrings(item.highlights).slice(0, 2).join(", ");

        return (
          <View style={styles.timelineItem} key={`edu-${index}`}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              {range ? <Text style={styles.dateText}>{range}</Text> : null}
              {degree ? <Text style={styles.itemTitle}>{degree}</Text> : null}
              {institution ? <Text style={styles.itemSubTitle}>{institution}</Text> : null}
              {location ? <Text style={styles.itemMeta}>{normalizeParagraph(location)}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ExperienceSection({ data }: { data: ResumeData }) {
  const items = safeArray(data.experience).filter((item) => {
    const bullets = nonEmptyStrings(item.bullets?.length ? item.bullets : item.points);
    return (
      clean(item.jobTitle) ||
      clean(item.company) ||
      clean(item.startDate) ||
      clean(item.endDate) ||
      bullets.length
    );
  });

  if (!items.length) return null;

  return (
    <View style={styles.bannerSection}>
      <BannerTitle title="Work Experience" />
      {items.slice(0, 2).map((item, index) => {
        const bullets = nonEmptyStrings(item.bullets?.length ? item.bullets : item.points).slice(0, 4);
        const dateRange = formatDateRange(item.startDate, item.endDate);
        const title = clean(item.jobTitle);
        const company = clean(item.company);
        const companyLine = company || dateRange ? `${company}${company && dateRange ? " | " : ""}${dateRange}` : "";

        return (
          <View style={styles.workItem} key={`exp-${index}`}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.workTextBlock}>
              {title ? <Text style={styles.workTitleLine}>{title}</Text> : null}
              {companyLine ? <Text style={styles.workCompanyLine}>{companyLine}</Text> : null}
              {!!bullets.length && (
                <View style={styles.nestedBulletList}>
                  {bullets.map((bullet, bulletIndex) => (
                    <View key={`exp-b-${index}-${bulletIndex}`} style={styles.nestedBulletRow}>
                      <Text style={styles.nestedBulletDot}>•</Text>
                      <Text style={styles.nestedBulletText}>{normalizeParagraph(bullet)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function FlowCVTemplate({ data }: Props) {
  const name = getFirstTwoLinesName(data.fullName || joinName(data.fullName));
  const skills = nonEmptyStrings(data.skills).slice(0, 5);
  const contacts = getContactItems(data);
  const summary = normalizeParagraph(data.summary);
  const role = clean(data.jobRole);
  const photo = clean(data.profileImage || undefined);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.canvas}>
          <View style={styles.rightPanel} />
          <View style={styles.rightPanelCut} />

          <View style={styles.topNameWrap}>
            {!!name.first && <Text style={styles.name}>{name.first}</Text>}
            {!!name.second && <Text style={styles.name}>{name.second}</Text>}
            {!!role && <Text style={styles.role}>{role}</Text>}
          </View>

          {photo ? (
            <View style={styles.photoFrameOuter}>
              <View style={styles.photoFrameInner}>
                <Image src={photo} style={styles.photo} />
              </View>
            </View>
          ) : null}

          <View style={styles.leftColumn}>
            {summary ? (
              <View style={styles.aboutSection}>
                <LeftSectionTitle title="About Me" />
                <Text style={styles.aboutText}>{summary}</Text>
              </View>
            ) : null}

            {!!skills.length && (
              <View style={styles.skillSection}>
                <LeftSectionTitle title="Expertise Skill" />
                <View style={styles.bulletList}>
                  {skills.map((skill, index) => (
                    <View key={`skill-${index}`} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{normalizeParagraph(skill)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!contacts.length && (
              <View style={styles.contactSection}>
                <LeftSectionTitle title="Contact Me" />
                {contacts.map((item, index) => (
                  <View key={`contact-${index}`} style={styles.contactRow}>
                    <View style={styles.iconWrap}>
                      <Icon type={item.type as "phone" | "email" | "web" | "address"} />
                    </View>
                    <Text style={styles.contactText}>{item.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.rightContent}>
            <EducationSection data={data} />
            <ExperienceSection data={data} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default FlowCVTemplate;