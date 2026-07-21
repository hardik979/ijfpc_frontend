/**
 * Core attendance domain logic — shared by the Excel parser, the on-screen
 * table and the canvas renderer.
 *
 * Everything here is pure and framework-free so it can be unit-reasoned about
 * without dragging a DOM in. Times are represented as "minutes since midnight"
 * because that is the only form all three consumers agree on.
 */

export type AttendanceStatus = "full" | "half" | "absent";

/** One staff member's punches for a single day. */
export type StaffRecord = {
  /** Stable key so React lists and status overrides survive a re-sort. */
  id: string;
  name: string;
  /** Minutes since midnight (fractional — seconds are kept), null if missing. */
  inMin: number | null;
  outMin: number | null;
  /** Worked minutes — null unless both punches exist. */
  totalMin: number | null;
  status: AttendanceStatus;
  /** Set when the user overrides the computed status by hand. */
  manualStatus?: AttendanceStatus;
};

export type AttendanceSummary = {
  total: number;
  present: number;
  full: number;
  half: number;
  absent: number;
  /** Average worked minutes across present staff, or null when nobody worked. */
  avgMin: number | null;
};

/** Default half-day cut-off: anything under 8h 30m is a half day. */
export const DEFAULT_HALF_DAY_MINUTES = 8 * 60 + 30;

/* ────────────────────────────────────────────────────────────────
   Time parsing
   ──────────────────────────────────────────────────────────────── */

/**
 * Coerce whatever a spreadsheet cell holds into minutes since midnight.
 *
 * Excel hands us any of: a JS `Date` (when cellDates is on), a serial number
 * (fraction of a day, possibly with a whole-day part), or a free-text string
 * like "10:24 AM", "10:24:15" or "20/07/2026 10:24:15".
 *
 * Seconds are preserved as a fraction of a minute. Dropping them would round a
 * 10:24:50 punch level with a 10:24:05 one and inflate every duration by up to
 * a minute; display code floors instead.
 */
export function parseTimeOfDay(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.getHours() * 60 + value.getMinutes() + value.getSeconds() / 60;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Excel serials: the fractional part is the time of day. Round to whole
    // seconds first — serials carry float noise (10:24:15 ≈ 0.43350694…).
    const frac = value - Math.floor(value);
    const seconds = Math.round(frac * 86400);
    return seconds === 86400 ? 0 : seconds / 60;
  }

  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "--") return null;

  // Pull the time out of anything — bare "10:24" or a full "20/07/2026 10:24:15".
  const match = raw.match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?\s*([AaPp])?\.?[Mm]?\.?/);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = match[3] ? Number(match[3]) : 0;
    const meridiem = match[4]?.toLowerCase();
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    if (meridiem === "p" && hours < 12) hours += 12;
    if (meridiem === "a" && hours === 12) hours = 0;
    return hours * 60 + minutes + seconds / 60;
  }

  // A numeric string that is really an Excel serial ("0.4333").
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && raw !== "") return parseTimeOfDay(asNumber);

  return null;
}

/** Best-effort date extraction, used to group multi-day exports. */
export function parseDateKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return toDateKey(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial epoch is 1899-12-30 (the 1900 leap-year bug is baked in).
    const ms = Math.floor(value) * 86400000 + Date.UTC(1899, 11, 30);
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : toDateKey(date);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // dd/mm/yyyy or dd-mm-yyyy — the dominant format in Indian biometric exports.
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  // yyyy-mm-dd
  const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) return `${ymd[1]}-${pad2(Number(ymd[2]))}-${pad2(Number(ymd[3]))}`;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : toDateKey(parsed);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/* ────────────────────────────────────────────────────────────────
   Formatting
   ──────────────────────────────────────────────────────────────── */

/**
 * 622 → "10:22 AM". Seconds are floored away, never rounded — a 10:22:50 punch
 * is displayed as 10:22, the same way a wall clock shows it.
 */
export function formatTime(minutes: number | null): string {
  if (minutes === null) return "-";
  const normalised = Math.floor(((minutes % 1440) + 1440) % 1440);
  const hours24 = Math.floor(normalised / 60);
  const mins = normalised % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad2(mins)} ${meridiem}`;
}

/** 534.5 → "8h 54m" — floored, so a duration is never overstated. */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "-";
  const whole = Math.floor(minutes);
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  return `${hours}h ${pad2(mins)}m`;
}

/** "2026-07-20" → "Mon, 20 Jul, 2026". */
export function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const date = new Date(year, month - 1, day);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][month - 1];
  return `${weekday}, ${pad2(day)} ${monthName}, ${year}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/* ────────────────────────────────────────────────────────────────
   Status + summary
   ──────────────────────────────────────────────────────────────── */

/**
 * Worked minutes between two punches. A punch-out earlier than the punch-in is
 * read as an overnight shift rather than as bad data.
 */
export function workedMinutes(inMin: number | null, outMin: number | null): number | null {
  if (inMin === null || outMin === null) return null;
  const diff = outMin - inMin;
  return diff < 0 ? diff + 1440 : diff;
}

/**
 * A missing punch means the day can't be verified, so it counts as absent.
 * Otherwise the half-day threshold decides.
 */
export function computeStatus(
  totalMin: number | null,
  halfDayThresholdMin: number
): AttendanceStatus {
  if (totalMin === null) return "absent";
  return totalMin >= halfDayThresholdMin ? "full" : "half";
}

export function effectiveStatus(record: StaffRecord): AttendanceStatus {
  return record.manualStatus ?? record.status;
}

export function buildSummary(records: StaffRecord[]): AttendanceSummary {
  let full = 0;
  let half = 0;
  let absent = 0;
  let workedTotal = 0;
  let workedCount = 0;

  for (const record of records) {
    const status = effectiveStatus(record);
    if (status === "full") full += 1;
    else if (status === "half") half += 1;
    else absent += 1;

    // Average hours reflects staff who actually clocked a full shift pair.
    if (status !== "absent" && record.totalMin !== null) {
      workedTotal += record.totalMin;
      workedCount += 1;
    }
  }

  return {
    total: records.length,
    present: full + half,
    full,
    half,
    absent,
    avgMin: workedCount > 0 ? workedTotal / workedCount : null,
  };
}

const STATUS_RANK: Record<AttendanceStatus, number> = { full: 0, half: 1, absent: 2 };

/**
 * Report order: full days first, then half days, then absentees — each group
 * ordered by punch-in time so the earliest arrivals lead.
 */
export function sortRecords(records: StaffRecord[]): StaffRecord[] {
  return [...records].sort((a, b) => {
    const rank = STATUS_RANK[effectiveStatus(a)] - STATUS_RANK[effectiveStatus(b)];
    if (rank !== 0) return rank;

    const aIn = a.inMin ?? Number.MAX_SAFE_INTEGER;
    const bIn = b.inMin ?? Number.MAX_SAFE_INTEGER;
    if (aIn !== bIn) return aIn - bIn;

    return a.name.localeCompare(b.name);
  });
}

/** Re-derive status for every record after the threshold changes. */
export function applyThreshold(
  records: StaffRecord[],
  halfDayThresholdMin: number
): StaffRecord[] {
  return records.map((record) => ({
    ...record,
    status: computeStatus(record.totalMin, halfDayThresholdMin),
  }));
}

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  full: "Full Day",
  half: "Half Day",
  absent: "Absent",
};
