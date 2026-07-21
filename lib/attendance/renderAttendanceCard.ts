/**
 * Draws the daily attendance report card onto a canvas.
 *
 * Deliberately hand-drawn with the Canvas 2D API instead of screenshotting the
 * DOM: html2canvas-style libraries choke on Tailwind v4's `oklch()` colours,
 * and this way the preview the user sees *is* the file they download.
 *
 * All coordinates below are in logical pixels against a fixed 772px-wide
 * layout; `scale` only multiplies the backing store for crisp output.
 */

import {
  type AttendanceStatus,
  type AttendanceSummary,
  type StaffRecord,
  STATUS_LABEL,
  effectiveStatus,
  formatDuration,
  formatTime,
} from "./attendance";

export type CardData = {
  brand: string;
  title: string;
  dateLabel: string;
  logoText: string;
  footerNote: string;
  records: StaffRecord[];
  summary: AttendanceSummary;
};

const FONT = `"Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, Roboto, Arial, sans-serif`;

const C = {
  pageBg: "#F2F6FD",
  headerBg: "#F8FAFF",
  accentBar: "#22C55E",
  brand: "#2563EB",
  navy: "#0F2A5C",
  navyDeep: "#1E3A8A",
  muted: "#7C8CA5",
  amber: "#FBBF24",
  white: "#FFFFFF",
  green: "#22C55E",
  orange: "#F59E0B",
  red: "#EF4444",
  blue: "#1D4ED8",
  tableHead: "#1E40AF",
  rowAlt: "#EFF4FE",
  rowLine: "#E6EDF9",
  textStrong: "#1E293B",
  textBody: "#334155",
  textDim: "#64748B",
  footer: "#94A3B8",
};

const STATUS_PILL: Record<AttendanceStatus, { bg: string; fg: string }> = {
  full: { bg: "#D1FAE5", fg: "#059669" },
  half: { bg: "#FEF3C7", fg: "#D97706" },
  absent: { bg: "#FEE2E2", fg: "#EF4444" },
};

/* Layout ------------------------------------------------------------------ */

const W = 772;
const PAD = 34;
const RIGHT = W - PAD;

const HEADER_H = 160;
const BAR_H = 5;

const CARD_W = 338;
const CARD_H = 122;
const CARD_GAP_X = 28;
const CARD_GAP_Y = 26;
const CARDS_TOP = 218;

const SECTION_BASELINE = 716;
const TABLE_TOP = 764;
const HEAD_H = 38;
const ROW_H = 44;

const COL = {
  numCenter: 58,
  name: 90,
  status: 268,
  in: 420,
  out: 549,
  total: 668,
  nameMaxW: 168,
};

/** Total canvas height for a given row count — the card grows with the team. */
export function cardHeight(rowCount: number): number {
  return TABLE_TOP + HEAD_H + rowCount * ROW_H + 74;
}

export const CARD_WIDTH = W;

/* Primitives -------------------------------------------------------------- */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  // Fallback for engines without roundRect.
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function setFont(
  ctx: CanvasRenderingContext2D,
  size: number,
  weight: number | string = 400,
  spacing = 0
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  // letterSpacing is Chromium/Safari-only; harmless to skip elsewhere.
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  } catch {
    /* ignore */
  }
}

function withShadow(ctx: CanvasRenderingContext2D, draw: () => void) {
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.10)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  draw();
  ctx.restore();
}

/** Trim to the column width, appending an ellipsis when it doesn't fit. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

/* Sections ---------------------------------------------------------------- */

function drawHeader(ctx: CanvasRenderingContext2D, data: CardData) {
  ctx.fillStyle = C.headerBg;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Logo tile
  withShadow(ctx, () => {
    ctx.fillStyle = C.amber;
    roundRect(ctx, PAD, 36, 84, 84, 18);
    ctx.fill();
  });

  ctx.fillStyle = C.navyDeep;
  setFont(ctx, 27, 800, 0.5);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.logoText, PAD + 42, 79);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const textX = PAD + 84 + 20;

  ctx.fillStyle = C.brand;
  setFont(ctx, 20, 800, 0.6);
  ctx.fillText(data.brand.toUpperCase(), textX, 61);

  ctx.fillStyle = C.navy;
  setFont(ctx, 27, 800, -0.2);
  ctx.fillText(data.title, textX, 96);

  ctx.fillStyle = C.muted;
  setFont(ctx, 13, 600, 0.1);
  ctx.fillText(data.dateLabel, textX, 121);

  ctx.fillStyle = C.accentBar;
  ctx.fillRect(0, HEADER_H, W, BAR_H);
}

type StatCard = { label: string; value: string; accent: string; valueColor: string };

function statCards(summary: AttendanceSummary): StatCard[] {
  return [
    { label: "Total Staff", value: String(summary.total), accent: C.blue, valueColor: C.navyDeep },
    { label: "Present", value: String(summary.present), accent: C.green, valueColor: C.green },
    { label: "Full Day", value: String(summary.full), accent: C.green, valueColor: C.green },
    { label: "Half Day", value: String(summary.half), accent: C.orange, valueColor: C.orange },
    { label: "Absent", value: String(summary.absent), accent: C.red, valueColor: C.red },
    {
      label: "Avg Hours",
      value: formatDuration(summary.avgMin),
      accent: C.blue,
      valueColor: C.navyDeep,
    },
  ];
}

function drawStatCards(ctx: CanvasRenderingContext2D, summary: AttendanceSummary) {
  statCards(summary).forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAD + col * (CARD_W + CARD_GAP_X);
    const y = CARDS_TOP + row * (CARD_H + CARD_GAP_Y);

    withShadow(ctx, () => {
      ctx.fillStyle = C.white;
      roundRect(ctx, x, y, CARD_W, CARD_H, 8);
      ctx.fill();
    });

    // Left accent stripe, clipped to the card so its corners stay rounded.
    ctx.save();
    roundRect(ctx, x, y, CARD_W, CARD_H, 8);
    ctx.clip();
    ctx.fillStyle = card.accent;
    ctx.fillRect(x, y, 5, CARD_H);
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    setFont(ctx, 11.5, 700, 1.3);
    ctx.fillText(card.label.toUpperCase(), x + 26, y + 46);

    ctx.fillStyle = card.valueColor;
    setFont(ctx, 34, 800, -0.5);
    ctx.fillText(card.value, x + 26, y + 92);
  });
}

function drawSectionTitle(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "left";
  ctx.fillStyle = C.navy;
  setFont(ctx, 19, 800, -0.1);
  ctx.fillText("Staff-wise Attendance", PAD, SECTION_BASELINE);

  ctx.fillStyle = C.amber;
  roundRect(ctx, PAD, SECTION_BASELINE + 11, 72, 5, 2.5);
  ctx.fill();
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  status: AttendanceStatus,
  x: number,
  centerY: number
) {
  const { bg, fg } = STATUS_PILL[status];
  const label = STATUS_LABEL[status];

  setFont(ctx, 11.5, 700, 0.2);
  const textWidth = ctx.measureText(label).width;
  const pillW = textWidth + 26;
  const pillH = 24;

  ctx.fillStyle = bg;
  roundRect(ctx, x, centerY - pillH / 2, pillW, pillH, 6);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + pillW / 2, centerY + 0.5);
  ctx.textAlign = "left";
}

function drawTable(ctx: CanvasRenderingContext2D, records: StaffRecord[]): number {
  const tableW = RIGHT - PAD;
  const tableH = HEAD_H + records.length * ROW_H;

  withShadow(ctx, () => {
    ctx.fillStyle = C.white;
    roundRect(ctx, PAD, TABLE_TOP, tableW, tableH, 8);
    ctx.fill();
  });

  // Everything below is clipped to the rounded table so rows can be plain rects.
  ctx.save();
  roundRect(ctx, PAD, TABLE_TOP, tableW, tableH, 8);
  ctx.clip();

  ctx.fillStyle = C.tableHead;
  ctx.fillRect(PAD, TABLE_TOP, tableW, HEAD_H);

  ctx.fillStyle = C.white;
  setFont(ctx, 13, 700, 0.2);
  ctx.textBaseline = "middle";
  const headY = TABLE_TOP + HEAD_H / 2;

  ctx.textAlign = "center";
  ctx.fillText("#", COL.numCenter, headY);
  ctx.textAlign = "left";
  ctx.fillText("Name", COL.name, headY);
  ctx.fillText("Status", COL.status, headY);
  ctx.fillText("In", COL.in, headY);
  ctx.fillText("Out", COL.out, headY);
  ctx.fillText("Total", COL.total, headY);

  records.forEach((record, index) => {
    const y = TABLE_TOP + HEAD_H + index * ROW_H;
    const centerY = y + ROW_H / 2;
    const status = effectiveStatus(record);

    ctx.fillStyle = index % 2 === 0 ? C.white : C.rowAlt;
    ctx.fillRect(PAD, y, tableW, ROW_H);

    ctx.strokeStyle = C.rowLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + ROW_H - 0.5);
    ctx.lineTo(RIGHT, y + ROW_H - 0.5);
    ctx.stroke();

    ctx.fillStyle = C.textDim;
    setFont(ctx, 12.5, 600);
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), COL.numCenter, centerY);

    ctx.textAlign = "left";
    ctx.fillStyle = C.textStrong;
    setFont(ctx, 13, 700, -0.1);
    ctx.fillText(ellipsize(ctx, record.name, COL.nameMaxW), COL.name, centerY);

    drawStatusPill(ctx, status, COL.status, centerY);

    // Absent rows keep their raw punches visible but dimmed — a single punch
    // is still evidence of what happened.
    ctx.fillStyle = status === "absent" ? C.textDim : C.textBody;
    setFont(ctx, 12.5, 700, 0);
    ctx.fillText(formatTime(record.inMin), COL.in, centerY);
    ctx.fillText(formatTime(record.outMin), COL.out, centerY);
    ctx.fillText(status === "absent" ? "-" : formatDuration(record.totalMin), COL.total, centerY);
  });

  ctx.restore();
  ctx.textBaseline = "alphabetic";

  return TABLE_TOP + tableH;
}

function drawFooter(ctx: CanvasRenderingContext2D, data: CardData, tableBottom: number) {
  const y = tableBottom + 44;

  ctx.fillStyle = C.footer;
  setFont(ctx, 11.5, 600, 0.2);
  ctx.textAlign = "left";
  ctx.fillText(data.footerNote, PAD, y);

  ctx.textAlign = "right";
  ctx.fillText(data.dateLabel, RIGHT, y);
  ctx.textAlign = "left";
}

/* Entry point ------------------------------------------------------------- */

export function renderAttendanceCard(
  canvas: HTMLCanvasElement,
  data: CardData,
  scale = 2
): void {
  const height = cardHeight(data.records.length);

  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(height * scale);
  canvas.style.width = "100%";
  canvas.style.height = "auto";

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.pageBg;
  ctx.fillRect(0, 0, W, height);

  drawHeader(ctx, data);
  drawStatCards(ctx, data.summary);
  drawSectionTitle(ctx);
  const tableBottom = drawTable(ctx, data.records);
  drawFooter(ctx, data, tableBottom);
}
