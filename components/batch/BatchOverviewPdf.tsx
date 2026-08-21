import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export type BatchOverviewPdfGroup = {
  key: string;
  time: string;
  date: string;
  trainer: string;
  batchNo: string;
  topic: string;
  classRoom: string;
  zone?: string;
  count: number;
  students: string[];
  // Present when this row folds together multiple batches sharing one class
  // (e.g. DS + DA both attending one Excel session) — batchNo is already the
  // joined "DS-3 + DA-5" string; this lists those same names for the label.
  combinedWith?: string[];
};

export type BatchOverviewPdfProps = {
  groups: BatchOverviewPdfGroup[];
  generatedAt: string;
  zoneFilterLabel: string;
  searchTerm?: string;
  zoneCounts: { blue: number; yellow: number; green: number; other: number; total: number };
};

const COLORS = {
  headerBg: "#0369A1",
  headerText: "#FFFFFF",
  border: "#CBD5E1",
  titleText: "#0F172A",
  subText: "#64748B",
  zone: {
    blue: { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
    yellow: { bg: "#FEF9C3", text: "#A16207", dot: "#EAB308" },
    green: { bg: "#D1FAE5", text: "#047857", dot: "#10B981" },
    other: { bg: "#F1F5F9", text: "#475569", dot: "#94A3B8" },
  },
} as const;

const rowTint = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "#F0F7FF";
  if (z === "yellow") return "#FEFCE8";
  if (z === "green") return "#F0FDF7";
  return "#FFFFFF";
};

const zoneColors = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return COLORS.zone.blue;
  if (z === "yellow") return COLORS.zone.yellow;
  if (z === "green") return COLORS.zone.green;
  return COLORS.zone.other;
};

const COL_W = {
  time: "8%",
  date: "9%",
  trainer: "14%",
  batchNo: "9%",
  topic: "12%",
  classRoom: "10%",
  zone: "7%",
  count: "6%",
  students: "25%",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 34,
    paddingHorizontal: 22,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: COLORS.titleText,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: COLORS.titleText },
  subTitle: { fontSize: 8, color: COLORS.subText, marginTop: 3 },
  legendRow: { flexDirection: "row" },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.75,
    borderColor: COLORS.border,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  legendText: { fontSize: 7.5, color: COLORS.subText },
  headRow: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
  },
  headCell: {
    color: COLORS.headerText,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textTransform: "uppercase",
    paddingVertical: 5,
    paddingHorizontal: 4,
    textAlign: "center",
    borderRightWidth: 0.75,
    borderRightColor: "rgba(255,255,255,0.35)",
  },
  groupRow: {
    flexDirection: "row",
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: COLORS.border,
  },
  cell: {
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 0.75,
    borderRightColor: COLORS.border,
  },
  cellText: { fontSize: 7.8, textAlign: "center", color: COLORS.titleText },
  cellTextLeft: { fontSize: 7.8, textAlign: "left", color: COLORS.titleText },
  cellTextBold: { fontSize: 7.8, textAlign: "center", fontFamily: "Helvetica-Bold", color: COLORS.titleText },
  combinedTag: { fontSize: 6, textAlign: "center", color: "#A21CAF", marginTop: 1.5 },
  zoneBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 5, alignSelf: "center" },
  zoneBadgeText: { fontSize: 6.3, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  studentsCol: { justifyContent: "center" },
  studentRow: {
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 3.5,
    paddingHorizontal: 5,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: COLORS.subText },
});

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

export function BatchOverviewDocument({
  groups,
  generatedAt,
  zoneFilterLabel,
  searchTerm,
  zoneCounts,
}: BatchOverviewPdfProps) {
  return (
    <Document title="Batch Overview">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Batch Overview</Text>
            <Text style={styles.subTitle}>
              Generated {generatedAt} · {zoneFilterLabel}
              {searchTerm ? ` · Search: "${searchTerm}"` : ""} · {groups.length} class block
              {groups.length === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.legendRow}>
            <LegendChip color={COLORS.zone.blue.dot} label={`Blue ${zoneCounts.blue}`} />
            <LegendChip color={COLORS.zone.yellow.dot} label={`Yellow ${zoneCounts.yellow}`} />
            <LegendChip color={COLORS.zone.green.dot} label={`Green ${zoneCounts.green}`} />
            <LegendChip color={COLORS.zone.other.dot} label={`Total ${zoneCounts.total}`} />
          </View>
        </View>

        <View style={styles.headRow} fixed>
          <Text style={[styles.headCell, { width: COL_W.time }]}>Time</Text>
          <Text style={[styles.headCell, { width: COL_W.date }]}>Batch Date</Text>
          <Text style={[styles.headCell, { width: COL_W.trainer, textAlign: "left" }]}>Trainer&apos;s Name</Text>
          <Text style={[styles.headCell, { width: COL_W.batchNo }]}>Batch No.</Text>
          <Text style={[styles.headCell, { width: COL_W.topic }]}>Topic</Text>
          <Text style={[styles.headCell, { width: COL_W.classRoom }]}>Venue</Text>
          <Text style={[styles.headCell, { width: COL_W.zone }]}>Zone</Text>
          <Text style={[styles.headCell, { width: COL_W.count }]}>No. of Student</Text>
          <Text style={[styles.headCell, { width: COL_W.students, borderRightWidth: 0 }]}>Student Name</Text>
        </View>

        <View>
          {groups.map((g) => {
            const names = g.students.length ? g.students : ["—"];
            const zc = zoneColors(g.zone);
            return (
              <View
                key={g.key}
                wrap={false}
                style={[styles.groupRow, { backgroundColor: rowTint(g.zone) }]}
              >
                <View style={[styles.cell, { width: COL_W.time }]}>
                  <Text style={styles.cellText}>{g.time}</Text>
                </View>
                <View style={[styles.cell, { width: COL_W.date }]}>
                  <Text style={styles.cellText}>{g.date}</Text>
                </View>
                <View style={[styles.cell, { width: COL_W.trainer }]}>
                  <Text style={styles.cellTextLeft}>{g.trainer}</Text>
                </View>
                <View style={[styles.cell, { width: COL_W.batchNo }]}>
                  <Text style={styles.cellTextBold}>{g.batchNo}</Text>
                </View>
                <View style={[styles.cell, { width: COL_W.topic }]}>
                  <Text style={styles.cellText}>{g.topic}</Text>
                  {g.combinedWith && g.combinedWith.length > 1 ? (
                    <Text style={styles.combinedTag}>Combined class</Text>
                  ) : null}
                </View>
                <View style={[styles.cell, { width: COL_W.classRoom }]}>
                  <Text style={styles.cellText}>{g.classRoom}</Text>
                </View>
                <View style={[styles.cell, { width: COL_W.zone, alignItems: "center" }]}>
                  <View style={[styles.zoneBadge, { backgroundColor: zc.bg }]}>
                    <Text style={[styles.zoneBadgeText, { color: zc.text }]}>{g.zone || "—"}</Text>
                  </View>
                </View>
                <View style={[styles.cell, { width: COL_W.count }]}>
                  <Text style={styles.cellTextBold}>{g.count}</Text>
                </View>
                <View style={[styles.studentsCol, { width: COL_W.students }]}>
                  {names.map((name, i) => (
                    <Text key={i} style={[styles.studentRow, { borderTopWidth: i === 0 ? 0 : 0.5 }]}>
                      {name}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>IJF · Batch Overview Report</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
