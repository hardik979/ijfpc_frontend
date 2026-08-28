export interface ReportRecord {
  dateKey: string;
  studentName: string;
  courseTitle: string;
  assignedTeacher?: string;
  conductedBy?: string;
  durationMinutes?: number;
  attendance?: "present" | "absent" | "unscheduled_attended";
  status: "scheduled" | "completed" | "cancelled";
  feedback?: string;
  cancellationReason?: string;
}

interface Token {
  text: string;
  bold: boolean;
}

interface ReportRow {
  values: string[];
  presence: string;
  feedbackLines: Token[][];
  height: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const COLUMNS = [
  { label: "Candidate", width: 150 },
  { label: "Mentor", width: 110 },
  { label: "Date", width: 110 },
  { label: "Duration", width: 105 },
  { label: "Presence", width: 200 },
  { label: "Detailed feedback", width: 575 },
];

const TABLE_WIDTH = COLUMNS.reduce((total, column) => total + column.width, 0);
const PAGE_PADDING = 24;
const TABLE_GAP = 26;
const TITLE_HEIGHT = 34;
const HEADER_HEIGHT = 30;
const MIN_ROW_HEIGHT = 32;
const LINE_HEIGHT = 18;
const CELL_PADDING_X = 8;
const CELL_PADDING_Y = 7;

const FONT_STACK = '"Segoe UI", Arial, Helvetica, sans-serif';
const BODY_FONT = "13px " + FONT_STACK;
const HEADER_FONT = "bold 13px " + FONT_STACK;
const TITLE_FONT = "bold 15px " + FONT_STACK;

const PAGE_BG = "#ffffff";
const TITLE_BG = "#4a86e8";
const TITLE_TEXT = "#ffffff";
const HEADER_BG = "#b6d7a8";
const HEADER_TEXT = "#17331f";
const BODY_TEXT = "#111827";
const BORDER = "#b7c4ce";

const PRESENCE_LABELS: Record<string, string> = {
  present: "Yes",
  absent: "No",
  unscheduled_attended: "Not schedule but taken",
};

const PRESENCE_COLORS: Record<string, { fill: string; text: string }> = {
  Yes: { fill: "#d9ead3", text: "#215b2e" },
  No: { fill: "#f4cccc", text: "#990000" },
  "Not schedule but taken": { fill: "#ead1f5", text: "#5b2a86" },
};

const formatReportDate = (dateKey: string) => {
  const [year, month, day] = String(dateKey || "").split("-");
  if (!year || !month || !day) return dateKey || "";
  return day + "-" + (MONTHS[Number(month) - 1] || month) + "-" + year.slice(-2);
};

const mentorName = (record: ReportRecord) =>
  String(record.conductedBy || record.assignedTeacher || "")
    .trim()
    .split(" ")[0] || "";

const tokenizeFeedback = (feedback: string): Token[][] =>
  feedback.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z ./&-]{0,24}):\s*/);
    if (!match) return [{ text: line, bold: false }];
    return [
      { text: match[1] + ":", bold: true },
      { text: " " + line.slice(match[0].length), bold: false },
    ];
  });

const wrapTokens = (
  context: CanvasRenderingContext2D,
  tokens: Token[],
  maxWidth: number,
): Token[][] => {
  const lines: Token[][] = [];
  let current: Token[] = [];
  let currentWidth = 0;

  for (const token of tokens) {
    context.font = token.bold ? HEADER_FONT : BODY_FONT;
    const parts = token.text.split(/(\s+)/).filter(Boolean);

    for (const part of parts) {
      const isSpace = /^\s+$/.test(part);
      const width = context.measureText(part).width;

      if (currentWidth + width > maxWidth && currentWidth > 0) {
        lines.push(current);
        current = [];
        currentWidth = 0;
        if (isSpace) continue;
      }
      if (currentWidth === 0 && isSpace) continue;

      current.push({ text: part, bold: token.bold });
      currentWidth += width;
    }
  }

  if (current.length) lines.push(current);
  return lines.length ? lines : [[{ text: "", bold: false }]];
};

const buildRows = (
  context: CanvasRenderingContext2D,
  records: ReportRecord[],
): ReportRow[] => {
  const feedbackWidth = COLUMNS[5].width - CELL_PADDING_X * 2;

  return records.map((record) => {
    const presence =
      record.status === "cancelled"
        ? "No"
        : PRESENCE_LABELS[record.attendance || "present"] || "";
    const feedback =
      record.status === "cancelled"
        ? "Cancelled: " + (record.cancellationReason || "No reason recorded.")
        : record.feedback || "";

    const feedbackLines = tokenizeFeedback(feedback).flatMap((tokens) =>
      wrapTokens(context, tokens, feedbackWidth),
    );

    return {
      values: [
        record.studentName || "",
        mentorName(record),
        formatReportDate(record.dateKey),
        record.durationMinutes ? record.durationMinutes + "min" : "",
        presence,
        feedback,
      ],
      presence,
      feedbackLines,
      height: Math.max(
        MIN_ROW_HEIGHT,
        feedbackLines.length * LINE_HEIGHT + CELL_PADDING_Y * 2,
      ),
    };
  });
};

const columnOffsets = COLUMNS.reduce<number[]>((offsets, column, index) => {
  offsets.push(index === 0 ? 0 : offsets[index - 1] + COLUMNS[index - 1].width);
  return offsets;
}, []);

const strokeCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  context.strokeStyle = BORDER;
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
};

const drawPill = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  maxWidth: number,
) => {
  const colors = PRESENCE_COLORS[label];
  if (!colors) return;

  context.font = BODY_FONT;
  const textWidth = context.measureText(label).width;
  const width = Math.min(maxWidth, textWidth + 22);
  const height = 22;
  const radius = height / 2;

  context.fillStyle = colors.fill;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();

  context.fillStyle = colors.text;
  context.textBaseline = "middle";
  context.fillText(label, x + (width - textWidth) / 2, y + height / 2 + 0.5);
  context.textBaseline = "alphabetic";
};

const drawTable = (
  context: CanvasRenderingContext2D,
  title: string,
  rows: ReportRow[],
  originY: number,
) => {
  const originX = PAGE_PADDING;
  let y = originY;

  context.fillStyle = TITLE_BG;
  context.fillRect(originX, y, TABLE_WIDTH, TITLE_HEIGHT);
  strokeCell(context, originX, y, TABLE_WIDTH, TITLE_HEIGHT);
  context.font = TITLE_FONT;
  context.fillStyle = TITLE_TEXT;
  context.textBaseline = "middle";
  context.fillText(
    title,
    originX + (TABLE_WIDTH - context.measureText(title).width) / 2,
    y + TITLE_HEIGHT / 2 + 1,
  );
  context.textBaseline = "alphabetic";
  y += TITLE_HEIGHT;

  context.font = HEADER_FONT;
  COLUMNS.forEach((column, index) => {
    const x = originX + columnOffsets[index];
    context.fillStyle = HEADER_BG;
    context.fillRect(x, y, column.width, HEADER_HEIGHT);
    strokeCell(context, x, y, column.width, HEADER_HEIGHT);
    context.fillStyle = HEADER_TEXT;
    context.textBaseline = "middle";
    context.fillText(column.label, x + CELL_PADDING_X, y + HEADER_HEIGHT / 2 + 1);
    context.textBaseline = "alphabetic";
  });
  y += HEADER_HEIGHT;

  for (const row of rows) {
    COLUMNS.forEach((column, index) => {
      const x = originX + columnOffsets[index];
      context.fillStyle = PAGE_BG;
      context.fillRect(x, y, column.width, row.height);
      strokeCell(context, x, y, column.width, row.height);
    });

    const textTop = y + CELL_PADDING_Y + LINE_HEIGHT / 2;

    COLUMNS.slice(0, 4).forEach((column, index) => {
      const x = originX + columnOffsets[index];
      context.font = BODY_FONT;
      context.fillStyle = BODY_TEXT;
      context.textBaseline = "middle";
      context.fillText(row.values[index], x + CELL_PADDING_X, textTop);
      context.textBaseline = "alphabetic";
    });

    if (row.presence) {
      drawPill(
        context,
        row.presence,
        originX + columnOffsets[4] + CELL_PADDING_X,
        y + CELL_PADDING_Y,
        COLUMNS[4].width - CELL_PADDING_X * 2,
      );
    }

    const feedbackX = originX + columnOffsets[5] + CELL_PADDING_X;
    row.feedbackLines.forEach((line, lineIndex) => {
      let x = feedbackX;
      const lineY = textTop + lineIndex * LINE_HEIGHT;
      context.textBaseline = "middle";
      for (const token of line) {
        context.font = token.bold ? HEADER_FONT : BODY_FONT;
        context.fillStyle = BODY_TEXT;
        context.fillText(token.text, x, lineY);
        x += context.measureText(token.text).width;
      }
      context.textBaseline = "alphabetic";
    });

    y += row.height;
  }

  return y - originY;
};

export const buildManualMockReportImage = (
  records: ReportRecord[],
): Promise<Blob> => {
  const reportable = records
    .filter((record) => record.status !== "scheduled")
    .sort(
      (first, second) =>
        first.dateKey.localeCompare(second.dateKey) ||
        first.studentName.localeCompare(second.studentName),
    );

  if (!reportable.length) {
    return Promise.reject(
      new Error("There are no completed or cancelled mocks in this month yet"),
    );
  }

  const byCourse = new Map<string, ReportRecord[]>();
  for (const record of reportable) {
    const key = record.courseTitle || "Manual Mock";
    byCourse.set(key, [...(byCourse.get(key) || []), record]);
  }

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) {
    return Promise.reject(
      new Error("This browser cannot render the report image"),
    );
  }

  const tables = [...byCourse.entries()].map(([courseTitle, courseRecords]) => {
    const rows = buildRows(measureContext, courseRecords);
    return {
      title: courseTitle + " - Manual Mock",
      rows,
      height:
        TITLE_HEIGHT +
        HEADER_HEIGHT +
        rows.reduce((total, row) => total + row.height, 0),
    };
  });

  const width = TABLE_WIDTH + PAGE_PADDING * 2;
  const height =
    PAGE_PADDING * 2 +
    tables.reduce((total, table) => total + table.height, 0) +
    TABLE_GAP * (tables.length - 1);
  const scale = height * 2 > 16_000 ? 1 : 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(
      new Error("This browser cannot render the report image"),
    );
  }

  context.scale(scale, scale);
  context.fillStyle = PAGE_BG;
  context.fillRect(0, 0, width, height);

  let y = PAGE_PADDING;
  for (const table of tables) {
    y += drawTable(context, table.title, table.rows, y) + TABLE_GAP;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the report image"));
    }, "image/png");
  });
};
