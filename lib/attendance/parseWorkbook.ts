/**
 * Excel/CSV → attendance records.
 *
 * Biometric and HR exports never agree on a layout, so this module does two
 * things: it *guesses* which columns mean what (surfaced to the user as an
 * editable mapping), and it handles the two shapes that actually show up —
 *
 *   wide  : one row per person, separate In and Out columns
 *   punch : one row per punch, a single time column, many rows per person
 *
 * The punch shape is collapsed by taking the first and last punch of the day.
 */

import type * as XLSXTypes from "xlsx";

import {
  DEFAULT_HALF_DAY_MINUTES,
  type StaffRecord,
  computeStatus,
  parseDateKey,
  parseTimeOfDay,
  workedMinutes,
} from "./attendance";

export type ColumnMapping = {
  /** Column indices into the raw row arrays; -1 means "not present". */
  name: number;
  inTime: number;
  outTime: number;
  date: number;
};

export type ParsedSheet = {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  /** Data rows only — the header row itself is stripped. */
  rows: unknown[][];
  mapping: ColumnMapping;
  /** Every distinct date found, sorted ascending. Empty when there is no date column. */
  dateKeys: string[];
};

/* ────────────────────────────────────────────────────────────────
   Header detection
   ──────────────────────────────────────────────────────────────── */

const NAME_PATTERNS = [/employee\s*name/, /staff\s*name/, /\bname\b/, /employee/, /\bstaff\b/, /person/];
const IN_PATTERNS = [/in\s*time/, /intime/, /first\s*(in|punch)/, /check\s*in/, /punch\s*in/, /\bin\b/, /arrival/, /login/, /log\s*in/];
const OUT_PATTERNS = [/out\s*time/, /outtime/, /last\s*(out|punch)/, /check\s*out/, /punch\s*out/, /\bout\b/, /departure/, /logout/, /log\s*out/];
const DATE_PATTERNS = [/att.*date/, /punch\s*date/, /\bdate\b/, /\bday\b/];

function normalise(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[_.]+/g, " ").replace(/\s+/g, " ");
}

/** First pattern to match wins, so more specific patterns are listed first. */
function matchColumn(headers: string[], patterns: RegExp[], taken: Set<number>): number {
  for (const pattern of patterns) {
    for (let i = 0; i < headers.length; i += 1) {
      if (taken.has(i)) continue;
      if (pattern.test(headers[i])) return i;
    }
  }
  return -1;
}

export function detectColumns(rawHeaders: string[]): ColumnMapping {
  const headers = rawHeaders.map(normalise);
  const taken = new Set<number>();

  const take = (index: number) => {
    if (index >= 0) taken.add(index);
    return index;
  };

  // Order matters: date first so a "Date" column can't be stolen by /\bin\b/,
  // then the specific In/Out pair, and finally the looser name match.
  const date = take(matchColumn(headers, DATE_PATTERNS, taken));
  const inTime = take(matchColumn(headers, IN_PATTERNS, taken));
  const outTime = take(matchColumn(headers, OUT_PATTERNS, taken));
  const name = take(matchColumn(headers, NAME_PATTERNS, taken));

  return { name, inTime, outTime, date };
}

/**
 * Exports routinely bury the real header under a title/logo block, so scan the
 * first rows and pick the one that looks most like a header.
 */
function detectHeaderRow(rows: unknown[][]): number {
  let best = 0;
  let bestScore = -1;

  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i += 1) {
    const cells = rows[i].map(normalise).filter(Boolean);
    if (cells.length < 2) continue;

    const mapping = detectColumns(rows[i].map((c) => String(c ?? "")));
    let score = 0;
    if (mapping.name >= 0) score += 2;
    if (mapping.inTime >= 0) score += 2;
    if (mapping.outTime >= 0) score += 2;
    if (mapping.date >= 0) score += 1;
    // Prefer text-heavy rows — a data row of times/numbers is not a header.
    score += cells.filter((c) => /[a-z]/.test(c)).length * 0.1;

    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  return bestScore >= 2 ? best : 0;
}

/* ────────────────────────────────────────────────────────────────
   Reading
   ──────────────────────────────────────────────────────────────── */

/**
 * SheetJS is ~900KB, so it is pulled in on first use rather than shipped with
 * the page — nobody pays for it until they actually drop a file.
 */
let xlsxPromise: Promise<typeof XLSXTypes> | null = null;

function loadXlsx(): Promise<typeof XLSXTypes> {
  if (!xlsxPromise) xlsxPromise = import("xlsx");
  return xlsxPromise;
}

export async function readWorkbook(file: File): Promise<XLSXTypes.WorkBook> {
  const [XLSX, buffer] = await Promise.all([loadXlsx(), file.arrayBuffer()]);
  // cellDates keeps real dates as Date objects; raw serials still parse fine.
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

export async function readSheet(
  workbook: XLSXTypes.WorkBook,
  sheetName: string
): Promise<ParsedSheet> {
  const XLSX = await loadXlsx();
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const headerIndex = grid.length > 0 ? detectHeaderRow(grid) : 0;
  const headerRow = grid[headerIndex] ?? [];
  const columnCount = grid.reduce((max, row) => Math.max(max, row.length), headerRow.length);

  const headers = Array.from({ length: columnCount }, (_, i) => {
    const label = String(headerRow[i] ?? "").trim();
    return label || `Column ${i + 1}`;
  });

  const rows = grid
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell !== null && String(cell).trim() !== ""));

  const mapping = detectColumns(headers);

  const dateKeys =
    mapping.date >= 0
      ? Array.from(
          new Set(
            rows
              .map((row) => parseDateKey(row[mapping.date]))
              .filter((key): key is string => key !== null)
          )
        ).sort()
      : [];

  return {
    sheetNames: workbook.SheetNames,
    activeSheet: sheetName,
    headers,
    rows,
    mapping,
    dateKeys,
  };
}

/* ────────────────────────────────────────────────────────────────
   Record building
   ──────────────────────────────────────────────────────────────── */

export type BuildOptions = {
  mapping: ColumnMapping;
  /** Restrict to one day. Ignored when the sheet has no date column. */
  dateKey?: string | null;
  halfDayThresholdMin?: number;
};

/**
 * Collapse raw rows into one record per person.
 *
 * Multiple rows for the same person are merged rather than duplicated: the
 * earliest In and the latest Out win. That makes the punch-log shape work for
 * free — a person with six punch rows ends up with first-in / last-out.
 */
export function buildRecords(rows: unknown[][], options: BuildOptions): StaffRecord[] {
  const { mapping, dateKey = null } = options;
  const threshold = options.halfDayThresholdMin ?? DEFAULT_HALF_DAY_MINUTES;

  if (mapping.name < 0) return [];

  const byPerson = new Map<string, { name: string; ins: number[]; outs: number[] }>();

  for (const row of rows) {
    if (dateKey && mapping.date >= 0 && parseDateKey(row[mapping.date]) !== dateKey) continue;

    const name = String(row[mapping.name] ?? "").trim();
    if (!name) continue;
    // Guard against summary/footer lines that sit under the data.
    if (/^(total|grand total|summary)\b/i.test(name)) continue;

    const key = name.toLowerCase();
    let entry = byPerson.get(key);
    if (!entry) {
      entry = { name, ins: [], outs: [] };
      byPerson.set(key, entry);
    }

    const inMin = mapping.inTime >= 0 ? parseTimeOfDay(row[mapping.inTime]) : null;
    const outMin = mapping.outTime >= 0 ? parseTimeOfDay(row[mapping.outTime]) : null;

    if (inMin !== null) entry.ins.push(inMin);
    if (outMin !== null) entry.outs.push(outMin);

    // Punch-log shape: only one time column is mapped, so every punch is a
    // candidate for both ends of the day.
    if (mapping.inTime >= 0 && mapping.outTime < 0 && inMin !== null) entry.outs.push(inMin);
    if (mapping.outTime >= 0 && mapping.inTime < 0 && outMin !== null) entry.ins.push(outMin);
  }

  const records: StaffRecord[] = [];
  for (const [key, entry] of byPerson) {
    const inMin = entry.ins.length > 0 ? Math.min(...entry.ins) : null;
    const outMin = entry.outs.length > 0 ? Math.max(...entry.outs) : null;
    // A single punch is not a shift — it would otherwise compute as 0 minutes.
    const isSinglePunch = inMin !== null && outMin !== null && inMin === outMin;
    const totalMin = isSinglePunch ? null : workedMinutes(inMin, outMin);

    records.push({
      id: key,
      name: entry.name,
      inMin,
      outMin: isSinglePunch ? null : outMin,
      totalMin,
      status: computeStatus(totalMin, threshold),
    });
  }

  return records;
}
