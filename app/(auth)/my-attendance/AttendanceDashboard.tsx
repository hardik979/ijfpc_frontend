"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EllipsisVertical,
  LogIn,
  LogOut,
  LoaderCircle,
  MinusCircle,
  Percent,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import styles from "./attendance.module.css";

type AttendanceStatus =
  | "present"
  | "absent"
  | "incomplete"
  | "weekly_off"
  | "leave"
  | "exception"
  | "public_holiday"
  | "half";

type HalfDayReason = "short_hours" | "no_punch_out" | null;

interface AttendanceRecord {
  dateKey: string;
  dayOfWeek: string | null;
  status: AttendanceStatus;
  halfDayReason: HalfDayReason;
  inTime: string | null;
  outTime: string | null;
  punchCount: number;
  workedMinutes: number | null;
  workedLabel: string | null;
  holidayName?: string | null;
  adjustment?: {
    exception: boolean;
    approvedLeave: boolean;
    leaveLimitExceeded: boolean;
  };
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  incompleteDays: number;
  missingPunchOutDays: number;
  leaveDays: number;
  exceptionDays: number;
  publicHolidayDays: number;
  weeklyOffDays: number;
  attendancePercentage: number;
  totalWorkedMinutes: number;
  totalWorkedLabel: string | null;
  averageWorkedMinutes: number | null;
  averageWorkedLabel: string | null;
}

interface AttendancePayload {
  staff: { employeeId: number; name: string };
  month: string | null;
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  availableMonths: string[];
}

interface OverallSummary {
  staffCount: number;
  staffWithRecords: number;
  recordedWorkingDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  exceptionDays: number;
  publicHolidayDays: number;
  weeklyOffDays: number;
  attendancePercentage: number;
}

interface DailyOverview {
  dateKey: string;
  dayOfWeek: string | null;
  recordedStaff: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  exceptionDays: number;
  publicHolidayDays: number;
  weeklyOffDays: number;
  attendancePercentage: number;
}

interface AttendanceOverviewPayload {
  month: string | null;
  overview: OverallSummary;
  days: DailyOverview[];
  staff: StaffSummaryRow[];
  availableMonths: string[];
}

interface StaffSummaryRow {
  employeeId: number;
  name: string;
  recordedDays: number;
  summary: Pick<
    AttendanceSummary,
    | "totalDays"
    | "presentDays"
    | "halfDays"
    | "absentDays"
    | "leaveDays"
    | "exceptionDays"
    | "publicHolidayDays"
    | "weeklyOffDays"
    | "attendancePercentage"
  >;
}

type MetricTone = "accent" | "teal" | "amber" | "rose" | "neutral";

const ATTENDANCE_ADMIN_ROLE = "ATTENDANCE_ADMIN";
const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
const REFRESH_INTERVAL_MS = 60_000;

// Roles that get the admin views. SUPER_ADMIN is the platform-wide owner and
// already holds the same attendance scopes server-side (see the LMS
// lib/staffAttendancePolicy.js), so it sees the overview here too.
const isAttendanceAdmin = (role: string) =>
  role === ATTENDANCE_ADMIN_ROLE || role === SUPER_ADMIN_ROLE;

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half: "Half day",
  incomplete: "Incomplete",
  weekly_off: "Weekly off",
  leave: "Leave",
  exception: "Exception",
  public_holiday: "Public holiday",
};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present:
    "border-emerald-300/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
  half:
    "border-amber-300/70 bg-amber-50/80 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  absent:
    "border-rose-300/70 bg-rose-50/80 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300",
  incomplete:
    "border-orange-300/70 bg-orange-50/80 text-orange-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-300",
  weekly_off:
    "border-slate-300/70 bg-slate-50/80 text-slate-600 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-300",
  leave:
    "border-sky-300/70 bg-sky-50/80 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300",
  exception:
    "border-violet-300/70 bg-violet-50/80 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300",
  public_holiday:
    "border-cyan-300/70 bg-cyan-50/80 text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300",
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  half: "bg-amber-500",
  absent: "bg-rose-500",
  incomplete: "bg-orange-500",
  weekly_off: "bg-slate-400",
  leave: "bg-sky-500",
  exception: "bg-violet-500",
  public_holiday: "bg-cyan-500",
};

const HALF_DAY_REASON: Record<string, string> = {
  short_hours: "Under full-day hours",
  no_punch_out: "No punch-out",
};

const METRIC_TONE: Record<MetricTone, string> = {
  accent: styles.metricAccent,
  teal: styles.metricTeal,
  amber: styles.metricAmber,
  rose: styles.metricRose,
  neutral: styles.metricNeutral,
};

const pad = (value: number) => String(value).padStart(2, "0");

const toMonthKey = (date: Date) =>
  date.getFullYear() + "-" + pad(date.getMonth() + 1);

const toDateKey = (date: Date) =>
  date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());

const shiftMonth = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  return toMonthKey(new Date(year, month - 1 + offset, 1));
};

const formatMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const formatDate = (dateKey: string) =>
  new Date(dateKey + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "ST";

function StatusBadge({
  status,
  label,
}: {
  status: AttendanceStatus;
  label?: string;
}) {
  return (
    <span
      className={
        "inline-flex min-h-7 items-center gap-2 rounded-full border px-2.5 text-xs font-semibold " +
        STATUS_STYLE[status]
      }
    >
      <span
        aria-hidden="true"
        className={"h-1.5 w-1.5 rounded-full " + STATUS_DOT[status]}
      />
      {label || STATUS_LABEL[status]}
    </span>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const normalized = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
      className={styles.progressTrack + " h-1.5 w-full"}
    >
      <span
        className={styles.progressValue}
        style={{ width: normalized + "%" }}
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: MetricTone;
  progress?: number;
}) {
  return (
    <article
      className={
        styles.glass +
        " " +
        styles.statCard +
        " " +
        METRIC_TONE[tone]
      }
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className={styles.metricIcon}>
          {icon}
        </span>
        <p className={styles.secondary + " text-xs font-semibold"}>{label}</p>
      </div>
      <p className={styles.primary + " mt-3 text-2xl font-bold tabular-nums"}>
        {value}
      </p>
      {progress !== undefined ? (
        <div className="mt-2.5">
          <ProgressBar value={progress} label={label} />
        </div>
      ) : null}
      <p className={styles.muted + " mt-2 text-xs leading-5"}>{hint}</p>
    </article>
  );
}

function MonthControls({
  month,
  options,
  loading,
  refreshing,
  lastUpdated,
  onMonthChange,
  onRefresh,
}: {
  month: string;
  options: string[];
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
}) {
  const isCurrentMonth = month >= toMonthKey(new Date());

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex items-center gap-2">
        <div
          className={
            styles.control + " flex h-11 min-w-0 flex-1 items-center p-0.5 sm:flex-none"
          }
        >
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className={styles.monthButton + " flex h-10 w-10 shrink-0 items-center justify-center rounded-md"}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <select
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            aria-label="Attendance month"
            className={
              styles.monthSelect +
              " h-10 min-w-0 flex-1 cursor-pointer px-2 text-center text-sm font-semibold outline-none sm:flex-none"
            }
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {formatMonth(option)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            disabled={isCurrentMonth}
            className={styles.monthButton + " flex h-10 w-10 shrink-0 items-center justify-center rounded-md"}
            aria-label="Next month"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className={styles.iconButton + " flex h-11 w-11 shrink-0 items-center justify-center"}
          aria-label="Refresh attendance"
          title="Refresh attendance"
        >
          <RefreshCw
            aria-hidden="true"
            className={"h-4 w-4 motion-reduce:animate-none" + (refreshing ? " animate-spin" : "")}
          />
        </button>
      </div>
      <p className={styles.muted + " min-h-4 text-right text-xs"} aria-live="polite">
        {lastUpdated
          ? "Updated " +
            lastUpdated.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""}
      </p>
    </div>
  );
}

function PageHeader({
  isAdmin,
  personal,
  month,
  monthOptions,
  loading,
  refreshing,
  lastUpdated,
  onMonthChange,
  onRefresh,
}: {
  isAdmin: boolean;
  personal: AttendancePayload | null;
  month: string;
  monthOptions: string[];
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
}) {
  return (
    <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          aria-hidden="true"
          className={styles.identityIcon + " flex h-12 w-12 shrink-0 items-center justify-center"}
        >
          {isAdmin ? (
            <Users className="h-5 w-5" />
          ) : personal ? (
            <span className="text-sm font-bold">{initials(personal.staff.name)}</span>
          ) : (
            <UserRound className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={styles.primary + " text-2xl font-bold sm:text-[1.7rem]"}>
              {isAdmin ? "Staff attendance overview" : "My attendance"}
            </h1>
            {isAdmin ? (
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-indigo-300/60 bg-indigo-50/75 px-2.5 text-xs font-semibold text-indigo-800 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-300">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Overall view
              </span>
            ) : null}
          </div>
          <p className={styles.secondary + " mt-1 text-sm leading-5"}>
            {isAdmin
              ? "Monthly attendance totals across active staff"
              : personal
                ? personal.staff.name + " | Employee ID " + personal.staff.employeeId
                : "Your biometric attendance record"}
          </p>
        </div>
      </div>

      <MonthControls
        month={month}
        options={monthOptions}
        loading={loading}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
        onMonthChange={onMonthChange}
        onRefresh={onRefresh}
      />
    </header>
  );
}

function ErrorBanner({ error, code }: { error: string; code: string }) {
  if (!error) return null;

  return (
    <div role="alert" className={styles.alert + " mb-5 flex items-start gap-3 px-4 py-3.5 text-sm"}>
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div>
        <p className="font-semibold">{error}</p>
        {code === "NOT_LINKED" ? (
          <p className={styles.secondary + " mt-1 text-xs leading-5"}>
            Ask an administrator to link your sign-in email to the staff directory.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-label="Loading attendance" aria-busy="true" className="space-y-4">
      <div className={styles.glass + " " + styles.skeleton + " h-28"} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={styles.glass + " " + styles.skeleton + " h-32"} />
        ))}
      </div>
      <div className={styles.glass + " " + styles.skeleton + " h-72"} />
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
      <span
        aria-hidden="true"
        className={styles.metricIcon + " " + styles.metricNeutral + " h-10 w-10"}
      >
        <CalendarDays className="h-5 w-5" />
      </span>
      <p className={styles.primary + " mt-3 text-sm font-semibold"}>{title}</p>
      <p className={styles.muted + " mt-1 max-w-sm text-xs leading-5"}>{detail}</p>
    </div>
  );
}

type AttendanceAdjustmentInput = {
  exception: boolean;
  approvedLeave: boolean;
};

const adjustmentFor = (record: AttendanceRecord): AttendanceAdjustmentInput => ({
  exception: record.adjustment?.exception === true,
  approvedLeave: record.adjustment?.approvedLeave === true,
});

function AttendanceAdjustmentMenu({
  record,
  saving,
  disabled,
  floating = false,
  onChange,
}: {
  record: AttendanceRecord;
  saving: boolean;
  disabled: boolean;
  floating?: boolean;
  onChange: (dateKey: string, adjustment: AttendanceAdjustmentInput) => void;
}) {
  const adjustment = adjustmentFor(record);
  const options = [
    {
      label: "Exceptions",
      checked: adjustment.exception,
      next: { ...adjustment, exception: !adjustment.exception },
    },
    {
      label: "Approved Leave",
      checked: adjustment.approvedLeave,
      next: { ...adjustment, approvedLeave: !adjustment.approvedLeave },
    },
  ];

  return (
    <details className="relative shrink-0">
      <summary
        className={
          styles.iconButton +
          " flex h-8 w-8 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
        }
        aria-label={"Attendance options for " + formatDate(record.dateKey)}
        title="Attendance options"
      >
        {saving ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <EllipsisVertical aria-hidden="true" className="h-4 w-4" />
        )}
      </summary>
      <div
        className={
          styles.surfaceMuted +
          " " +
          styles.divider +
          " w-48 overflow-hidden rounded-md border " +
          (floating ? "absolute right-0 top-9 z-30" : "mt-2")
        }
      >
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={disabled}
            aria-pressed={option.checked}
            onClick={() => onChange(record.dateKey, option.next)}
            className={
              styles.divider +
              " flex min-h-10 w-full items-center gap-2 border-b px-3 text-left text-xs font-semibold outline-none last:border-b-0 hover:bg-indigo-500/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/70 disabled:cursor-wait disabled:opacity-60"
            }
          >
            <span
              aria-hidden="true"
              className={
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                (option.checked
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-400/60")
              }
            >
              {option.checked ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className={styles.primary}>{option.label}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

const adjustmentNote = (record: AttendanceRecord) => {
  if (record.adjustment?.leaveLimitExceeded) {
    return "Approved leave limit exceeded";
  }
  if (record.adjustment?.approvedLeave && record.adjustment?.exception) {
    return "Exception also applied";
  }
  return null;
};

function PersonalHistory({
  records,
  month,
  embedded = false,
  title = "Attendance history",
  canAdjust = false,
  savingDate = "",
  onAdjustmentChange,
}: {
  records: AttendanceRecord[];
  month: string;
  embedded?: boolean;
  title?: string;
  canAdjust?: boolean;
  savingDate?: string;
  onAdjustmentChange?: (
    dateKey: string,
    adjustment: AttendanceAdjustmentInput,
  ) => void;
}) {
  return (
    <section
      aria-labelledby="history-title"
      className={
        (embedded ? "" : styles.glass + " ") +
        (canAdjust ? "overflow-visible" : "overflow-hidden")
      }
    >
      <div className={styles.divider + " flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5"}>
        <div>
          <h2 id="history-title" className={styles.primary + " text-sm font-bold"}>
            {title}
          </h2>
          <p className={styles.muted + " mt-0.5 text-xs"}>{formatMonth(month)}</p>
        </div>
        <span className={styles.control + " inline-flex min-h-8 items-center px-2.5 text-xs font-semibold"}>
          {records.length} {records.length === 1 ? "day" : "days"}
        </span>
      </div>

      {!records.length ? (
        <EmptyState
          title="No attendance recorded"
          detail="Attendance will appear here after the biometric import is processed."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Personal attendance history for {formatMonth(month)}</caption>
              <thead className={styles.surfaceMuted}>
                <tr className={styles.divider + " border-b"}>
                  {["Date", "Status", "Check-in", "Check-out", "Hours"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className={
                          styles.secondary +
                          " px-5 py-3 text-xs font-semibold " +
                          (heading === "Hours" ? "text-right" : "")
                        }
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.dateKey} className={styles.tableRow + " " + styles.divider + " border-b last:border-b-0"}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className={styles.primary + " whitespace-nowrap font-semibold"}>
                            {formatDate(record.dateKey)}
                          </p>
                          <p className={styles.muted + " mt-0.5 text-xs"}>{record.dayOfWeek || ""}</p>
                        </div>
                        {canAdjust &&
                        onAdjustmentChange &&
                        record.status !== "public_holiday" ? (
                          <AttendanceAdjustmentMenu
                            record={record}
                            saving={savingDate === record.dateKey}
                            disabled={Boolean(savingDate)}
                            onChange={onAdjustmentChange}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={record.status}
                          label={
                            record.status === "public_holiday"
                              ? record.holidayName || "Public holiday"
                              : record.adjustment?.approvedLeave &&
                                  !record.adjustment.leaveLimitExceeded
                              ? "Approved leave"
                              : undefined
                          }
                        />
                        {record.halfDayReason || adjustmentNote(record) ? (
                          <span className={styles.muted + " text-xs"}>
                            {adjustmentNote(record) ||
                              HALF_DAY_REASON[record.halfDayReason || ""]}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={styles.secondary + " px-5 py-3.5 font-medium tabular-nums"}>
                      {record.inTime || "-"}
                    </td>
                    <td className={styles.secondary + " px-5 py-3.5 font-medium tabular-nums"}>
                      {record.outTime || "-"}
                    </td>
                    <td className={styles.muted + " px-5 py-3.5 text-right tabular-nums"}>
                      {record.workedLabel || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden">
            {records.map((record) => (
              <li key={record.dateKey} className={styles.divider + " border-b p-4 last:border-b-0"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={styles.primary + " text-sm font-semibold"}>{formatDate(record.dateKey)}</p>
                    <p className={styles.muted + " mt-0.5 text-xs"}>{record.dayOfWeek || ""}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <StatusBadge
                      status={record.status}
                      label={
                        record.status === "public_holiday"
                          ? record.holidayName || "Public holiday"
                          : record.adjustment?.approvedLeave &&
                              !record.adjustment.leaveLimitExceeded
                          ? "Approved leave"
                          : undefined
                      }
                    />
                    {canAdjust &&
                    onAdjustmentChange &&
                    record.status !== "public_holiday" ? (
                      <AttendanceAdjustmentMenu
                        record={record}
                        saving={savingDate === record.dateKey}
                        disabled={Boolean(savingDate)}
                        floating
                        onChange={onAdjustmentChange}
                      />
                    ) : null}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    ["Check-in", record.inTime || "-"],
                    ["Check-out", record.outTime || "-"],
                    ["Worked", record.workedLabel || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className={styles.muted + " text-[0.7rem] font-medium"}>{label}</dt>
                      <dd className={styles.primary + " mt-1 text-sm font-semibold tabular-nums"}>{value}</dd>
                    </div>
                  ))}
                </dl>
                {record.halfDayReason || adjustmentNote(record) ? (
                  <p className={styles.muted + " mt-3 text-xs"}>
                    {adjustmentNote(record) ||
                      HALF_DAY_REASON[record.halfDayReason || ""]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function PersonalDashboard({ data, month }: { data: AttendancePayload; month: string }) {
  const today = toDateKey(new Date());
  const todayRecord = data.records.find((record) => record.dateKey === today);
  const summary = data.summary;

  return (
    <>
      <section aria-labelledby="today-title" className={styles.glass + " mb-4 p-4 sm:p-5"}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <span aria-hidden="true" className={styles.metricIcon + " " + styles.metricAccent + " h-10 w-10"}>
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 id="today-title" className={styles.primary + " text-sm font-bold"}>Today</h2>
              <p className={styles.muted + " mt-0.5 text-xs"}>{formatDate(today)}</p>
              <div className="mt-2">
                {todayRecord ? (
                  <StatusBadge status={todayRecord.status} />
                ) : (
                  <span className={styles.secondary + " text-sm"}>No punch recorded yet</span>
                )}
              </div>
            </div>
          </div>

          <dl className={styles.divider + " grid grid-cols-3 border-t pt-4 lg:min-w-[31rem] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"}>
            {[
              { icon: <LogIn className="h-4 w-4" />, label: "Check-in", value: todayRecord?.inTime },
              { icon: <LogOut className="h-4 w-4" />, label: "Check-out", value: todayRecord?.outTime },
              { icon: <Clock className="h-4 w-4" />, label: "Worked", value: todayRecord?.workedLabel },
            ].map((item) => (
              <div key={item.label} className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-4">
                <dt className={styles.muted + " flex items-center gap-1.5 text-[0.7rem] font-medium"}>
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </dt>
                <dd className={styles.primary + " mt-1.5 truncate text-sm font-bold tabular-nums"}>
                  {item.value || "-"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-label="Monthly attendance summary" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Present"
          value={String(summary.presentDays)}
          hint={summary.totalDays + " recorded working days"}
          tone="teal"
        />
        {/* The rule the backend applies: under 8h 30m worked is a half day
            (7h on Saturday), as is a day punched in but never out. */}
        <MetricCard
          icon={<MinusCircle className="h-4 w-4" />}
          label="Half days"
          value={String(summary.halfDays)}
          hint={
            "Under 8h 30m worked (7h Sat) · " +
            summary.missingPunchOutDays +
            " missing punch-out"
          }
          tone="amber"
        />
        {/* Days off that no approved leave covers — approved leave inside the
            allowance is counted separately and is not a loss of pay. */}
        <MetricCard
          icon={<XCircle className="h-4 w-4" />}
          label="Loss of Pay"
          value={String(summary.absentDays)}
          hint={summary.leaveDays + " approved leave"}
          tone="rose"
        />
        <MetricCard
          icon={<Percent className="h-4 w-4" />}
          label="Attendance rate"
          value={summary.attendancePercentage + "%"}
          hint="Half days count as 0.5"
          tone="accent"
          progress={summary.attendancePercentage}
        />
      </section>

      <PersonalHistory records={data.records} month={month} />
    </>
  );
}

function StaffDetailView({
  data,
  month,
  savingDate,
  onAdjustmentChange,
}: {
  data: AttendancePayload;
  month: string;
  savingDate: string;
  onAdjustmentChange: (
    dateKey: string,
    adjustment: AttendanceAdjustmentInput,
  ) => void;
}) {
  const summary = data.summary;
  const facts = [
    { label: "Recorded", value: data.records.length },
    { label: "Present", value: summary.presentDays },
    { label: "Half day", value: summary.halfDays },
    { label: "Absent", value: summary.absentDays },
    {
      label: "Leave / off",
      value:
        summary.leaveDays +
        summary.weeklyOffDays +
        (summary.publicHolidayDays || 0),
    },
    { label: "Exceptions", value: summary.exceptionDays || 0 },
    { label: "Attendance", value: summary.attendancePercentage + "%" },
  ];

  return (
    <>
      <section className={styles.glass + " mb-4 overflow-hidden"}>
        <div className="flex items-start gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={styles.identityIcon + " flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold"}
          >
            {initials(data.staff.name)}
          </span>
          <div className="min-w-0">
            <h3 className={styles.primary + " truncate text-sm font-bold"}>
              {data.staff.name}
            </h3>
            <p className={styles.muted + " mt-0.5 text-xs"}>
              Employee ID {data.staff.employeeId} | {formatMonth(month)}
            </p>
          </div>
        </div>
        </div>

        <dl
          className={
            styles.surfaceMuted +
            " " +
            styles.divider +
            " grid grid-cols-2 border-t sm:grid-cols-3 lg:grid-cols-7"
          }
        >
          {facts.map((fact) => (
            <div
              key={fact.label}
              className={styles.divider + " min-w-0 border-b px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"}
            >
              <dt className={styles.muted + " text-xs font-medium"}>{fact.label}</dt>
              <dd className={styles.primary + " mt-1 text-base font-bold tabular-nums"}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <PersonalHistory
        records={data.records}
        month={month}
        title="Individual attendance details"
        canAdjust
        savingDate={savingDate}
        onAdjustmentChange={onAdjustmentChange}
      />
    </>
  );
}

function StaffSummaryTable({
  staff,
  month,
}: {
  staff: StaffSummaryRow[];
  month: string;
}) {
  return (
    <section
      aria-labelledby="daily-overview-title"
      className={styles.glass + " overflow-hidden"}
    >
      <div
        className={
          styles.divider +
          " flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5"
        }
      >
        <div>
          <h2
            id="daily-overview-title"
            className={styles.primary + " text-sm font-bold"}
          >
            Daily staff summary
          </h2>
          <p className={styles.muted + " mt-0.5 text-xs"}>
            {formatMonth(month)}
          </p>
        </div>
        <span
          className={
            styles.control +
            " inline-flex min-h-8 items-center px-2.5 text-xs font-semibold"
          }
        >
          {staff.length} {staff.length === 1 ? "staff member" : "staff"}
        </span>
      </div>

      {!staff.length ? (
        <EmptyState
          title="No staff attendance recorded"
          detail="Staff summaries will appear here after attendance records are imported."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Staff attendance summary for {formatMonth(month)}
              </caption>
              <thead className={styles.surfaceMuted}>
                <tr className={styles.divider + " border-b"}>
                  {[
                    "All Staff",
                    "Staff reported",
                    "Present",
                    "Half day",
                    "Absent",
                    "Leave / off",
                    "Attendance",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className={
                        styles.secondary +
                        " whitespace-nowrap px-4 py-3 text-xs font-semibold"
                      }
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((entry) => (
                    <tr
                      key={entry.employeeId}
                      className={
                        styles.tableRow +
                        " " +
                        styles.divider +
                        " border-b last:border-b-0"
                      }
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={
                            "/my-attendance/staff/" +
                            entry.employeeId +
                            "?month=" +
                            encodeURIComponent(month)
                          }
                          className="group flex min-h-11 w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                        >
                          <span
                            aria-hidden="true"
                            className={
                              styles.identityIcon +
                              " flex h-9 w-9 shrink-0 items-center justify-center text-[0.68rem] font-bold"
                            }
                          >
                            {initials(entry.name)}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={
                                styles.primary +
                                " block max-w-52 truncate font-semibold group-hover:underline"
                              }
                            >
                              {entry.name}
                            </span>
                            <span
                              className={
                                styles.muted + " mt-0.5 block text-xs"
                              }
                            >
                              ID {entry.employeeId}
                            </span>
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className={styles.muted + " ml-auto h-4 w-4 shrink-0"}
                          />
                        </Link>
                      </td>
                      <td
                        className={
                          styles.secondary +
                          " px-4 py-3.5 font-semibold tabular-nums"
                        }
                      >
                        {entry.recordedDays}
                      </td>
                      <td className="px-4 py-3.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                        {entry.summary.presentDays}
                      </td>
                      <td className="px-4 py-3.5 font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                        {entry.summary.halfDays}
                      </td>
                      <td className="px-4 py-3.5 font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                        {entry.summary.absentDays}
                      </td>
                      <td
                        className={
                          styles.muted + " px-4 py-3.5 tabular-nums"
                        }
                      >
                        {entry.summary.leaveDays +
                          entry.summary.weeklyOffDays}
                      </td>
                      <td className="min-w-36 px-4 py-3.5">
                        <div
                          className={
                            styles.metricAccent +
                            " flex items-center gap-2.5"
                          }
                        >
                          <ProgressBar
                            value={entry.summary.attendancePercentage}
                            label={entry.name + " attendance"}
                          />
                          <span
                            className={
                              styles.primary +
                              " w-11 text-right text-xs font-semibold tabular-nums"
                            }
                          >
                            {entry.summary.attendancePercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden">
            {staff.map((entry) => (
                <li
                  key={entry.employeeId}
                  className={styles.divider + " border-b last:border-b-0"}
                >
                  <Link
                    href={
                      "/my-attendance/staff/" +
                      entry.employeeId +
                      "?month=" +
                      encodeURIComponent(month)
                    }
                    className="block w-full p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/70"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={
                          styles.identityIcon +
                          " flex h-9 w-9 shrink-0 items-center justify-center text-[0.68rem] font-bold"
                        }
                      >
                        {initials(entry.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            styles.primary + " truncate text-sm font-semibold"
                          }
                        >
                          {entry.name}
                        </p>
                        <p className={styles.muted + " mt-0.5 text-xs"}>
                          ID {entry.employeeId} | {entry.recordedDays} days
                          reported
                        </p>
                      </div>
                      <span
                        className={
                          styles.accent +
                          " shrink-0 text-sm font-bold tabular-nums"
                        }
                      >
                        {entry.summary.attendancePercentage}%
                      </span>
                    </div>
                    <div className={styles.metricAccent + " mt-3"}>
                      <ProgressBar
                        value={entry.summary.attendancePercentage}
                        label={entry.name + " attendance"}
                      />
                    </div>
                    <dl className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        ["Present", entry.summary.presentDays],
                        ["Half", entry.summary.halfDays],
                        ["Absent", entry.summary.absentDays],
                        [
                          "Leave/off",
                          entry.summary.leaveDays +
                            entry.summary.weeklyOffDays,
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt
                            className={
                              styles.muted +
                              " truncate text-[0.68rem] font-medium"
                            }
                          >
                            {label}
                          </dt>
                          <dd
                            className={
                              styles.primary +
                              " mt-1 text-sm font-bold tabular-nums"
                            }
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}

    </section>
  );
}

function AdminDashboard({ data, month }: { data: AttendanceOverviewPayload; month: string }) {
  const summary = data.overview;
  const reportingRate = summary.staffCount
    ? Math.round((summary.staffWithRecords / summary.staffCount) * 100)
    : 0;

  return (
    <>
      <section aria-label="Overall staff attendance summary" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Active staff"
          value={String(summary.staffCount)}
          hint="Included in the overall view"
          tone="neutral"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Staff reported"
          value={String(summary.staffWithRecords)}
          hint={reportingRate + "% have records this month"}
          tone="accent"
          progress={reportingRate}
        />
        <MetricCard
          icon={<Percent className="h-4 w-4" />}
          label="Attendance rate"
          value={summary.attendancePercentage + "%"}
          hint="Weighted across recorded working days"
          tone="accent"
          progress={summary.attendancePercentage}
        />
      </section>

      <StaffSummaryTable staff={data.staff || []} month={month} />
    </>
  );
}

// Only the admin views are role-gated now, so this is the only message left:
// a personal view that cannot be shown reports the LMS's own reason instead.
function UnauthorizedState({ adminOnly = true }: { adminOnly?: boolean }) {
  return (
    <main className={styles.page}>
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <section className={styles.glass + " w-full p-6 text-center"}>
          <span aria-hidden="true" className={styles.identityIcon + " mx-auto flex h-12 w-12 items-center justify-center"}>
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className={styles.primary + " mt-4 text-xl font-bold"}>Attendance access unavailable</h1>
          <p className={styles.secondary + " mt-2 text-sm leading-6"}>
            {adminOnly
              ? "Staff attendance details are available to the Attendance Admin and Super Admin roles."
              : "This page is available to Attendance and Attendance Admin roles."}
          </p>
        </section>
      </div>
    </main>
  );
}

export function StaffAttendanceDetailPage({
  employeeId,
  initialMonth,
}: {
  employeeId: string;
  initialMonth?: string;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const role = String(user?.publicMetadata?.role || "").toUpperCase();
  const isAdmin = isAttendanceAdmin(role);
  const validEmployeeId = /^\d+$/.test(employeeId) ? employeeId : "";
  const [month, setMonth] = useState(() =>
    /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth || "")
      ? String(initialMonth)
      : toMonthKey(new Date()),
  );
  const [data, setData] = useState<AttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingDate, setSavingDate] = useState("");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestSequence = useRef(0);

  const loadStaff = useCallback(
    async (monthKey: string, silent = false) => {
      const requestId = ++requestSequence.current;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/staff/attendance/staff/" +
            validEmployeeId +
            "?month=" +
            encodeURIComponent(monthKey),
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Could not load staff attendance");
        }
        if (requestId !== requestSequence.current) return;
        setData(payload as AttendancePayload);
        setLastUpdated(new Date());
      } catch (caught) {
        if (requestId !== requestSequence.current) return;
        if (!silent) setData(null);
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load staff attendance",
        );
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [validEmployeeId],
  );

  const updateAdjustment = useCallback(
    async (dateKey: string, adjustment: AttendanceAdjustmentInput) => {
      if (savingDate) return;
      setSavingDate(dateKey);
      setError("");

      try {
        const response = await fetch(
          "/api/staff/attendance/staff/" +
            validEmployeeId +
            "?month=" +
            encodeURIComponent(month),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dateKey, ...adjustment }),
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Could not update attendance");
        }
        setData(payload as AttendancePayload);
        setLastUpdated(new Date());
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not update attendance",
        );
      } finally {
        setSavingDate("");
      }
    },
    [month, savingDate, validEmployeeId],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAdmin) {
      requestSequence.current += 1;
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!validEmployeeId) {
      setData(null);
      setError("Invalid staff member");
      setLoading(false);
      return;
    }
    loadStaff(month);
  }, [isAdmin, isLoaded, loadStaff, month, validEmployeeId]);

  const monthOptions = useMemo(() => {
    const options = new Set<string>([
      month,
      toMonthKey(new Date()),
      ...(data?.availableMonths || []),
    ]);
    return [...options].sort((first, second) => second.localeCompare(first));
  }, [data?.availableMonths, month]);

  const changeMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    router.replace(
      "/my-attendance/staff/" +
        validEmployeeId +
        "?month=" +
        encodeURIComponent(nextMonth),
    );
  };

  if (isLoaded && !isAdmin) return <UnauthorizedState adminOnly />;

  return (
    <main className={styles.page}>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <button
              type="button"
              onClick={() => router.back()}
              className={styles.iconButton + " flex h-11 w-11 shrink-0 items-center justify-center"}
              aria-label="Back to staff attendance overview"
              title="Back to staff attendance overview"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={styles.primary + " truncate text-2xl font-bold sm:text-[1.7rem]"}>
                  {data?.staff.name || "Staff attendance details"}
                </h1>
                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-indigo-300/60 bg-indigo-50/75 px-2.5 text-xs font-semibold text-indigo-800 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-300">
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  Admin view
                </span>
              </div>
              <p className={styles.secondary + " mt-1 text-sm leading-5"}>
                {data
                  ? "Employee ID " + data.staff.employeeId + " | Individual attendance record"
                  : "Individual staff information and attendance record"}
              </p>
            </div>
          </div>

          <MonthControls
            month={month}
            options={monthOptions}
            loading={!isLoaded || loading}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
            onMonthChange={changeMonth}
            onRefresh={() => loadStaff(month, true)}
          />
        </header>

        <ErrorBanner error={error} code="" />
        {!isLoaded || loading ? <LoadingState /> : null}
        {isLoaded && !loading && data ? (
          <StaffDetailView
            data={data}
            month={month}
            savingDate={savingDate}
            onAdjustmentChange={updateAdjustment}
          />
        ) : null}
      </div>
    </main>
  );
}

export default function AttendanceDashboard() {
  const { user, isLoaded } = useUser();
  const role = String(user?.publicMetadata?.role || "").toUpperCase();
  // The admin overview is still role-gated; the personal view is not, because
  // the staff directory row decides that one (see the LMS /me route).
  const isAdmin = isAttendanceAdmin(role);

  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [personal, setPersonal] = useState<AttendancePayload | null>(null);
  const [overall, setOverall] = useState<AttendanceOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestSequence = useRef(0);
  const autoJumped = useRef(false);

  const loadPersonal = useCallback(async (monthKey: string, silent = false) => {
    const requestId = ++requestSequence.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    setErrorCode("");

    try {
      const response = await fetch(
        "/api/staff/attendance?month=" + encodeURIComponent(monthKey),
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) {
        if (requestId === requestSequence.current) {
          setErrorCode(String(payload?.code || ""));
        }
        throw new Error(payload?.error || "Could not load your attendance");
      }
      if (requestId !== requestSequence.current) return;

      const next = payload as AttendancePayload;
      setPersonal(next);
      setOverall(null);
      setLastUpdated(new Date());

      if (
        !autoJumped.current &&
        !next.records.length &&
        next.availableMonths?.length &&
        next.availableMonths[0] !== monthKey
      ) {
        autoJumped.current = true;
        setMonth(next.availableMonths[0]);
      }
    } catch (caught) {
      if (requestId !== requestSequence.current) return;
      if (!silent) setPersonal(null);
      setError(caught instanceof Error ? caught.message : "Could not load your attendance");
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const loadOverall = useCallback(async (monthKey: string, silent = false) => {
    const requestId = ++requestSequence.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    setErrorCode("");

    try {
      const response = await fetch(
        "/api/staff/attendance/overview?month=" + encodeURIComponent(monthKey),
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) {
        if (requestId === requestSequence.current) {
          setErrorCode(String(payload?.code || ""));
        }
        throw new Error(payload?.error || "Could not load the staff overview");
      }
      if (requestId !== requestSequence.current) return;

      const next = payload as AttendanceOverviewPayload;
      setOverall(next);
      setPersonal(null);
      setLastUpdated(new Date());

      if (
        !autoJumped.current &&
        !next.days.length &&
        next.availableMonths?.length &&
        next.availableMonths[0] !== monthKey
      ) {
        autoJumped.current = true;
        setMonth(next.availableMonths[0]);
      }
    } catch (caught) {
      if (requestId !== requestSequence.current) return;
      if (!silent) setOverall(null);
      setError(caught instanceof Error ? caught.message : "Could not load the staff overview");
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isAdmin) loadOverall(month);
    else loadPersonal(month);
  }, [isAdmin, isLoaded, loadOverall, loadPersonal, month]);

  useEffect(() => {
    autoJumped.current = false;
  }, [isAdmin]);

  useEffect(() => {
    if (!isLoaded) return;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (isAdmin) loadOverall(month, true);
      else loadPersonal(month, true);
    };

    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [isAdmin, isLoaded, loadOverall, loadPersonal, month]);

  const monthOptions = useMemo(() => {
    const options = new Set<string>([
      month,
      toMonthKey(new Date()),
      ...(isAdmin ? overall?.availableMonths || [] : personal?.availableMonths || []),
    ]);
    return [...options].sort((first, second) => second.localeCompare(first));
  }, [isAdmin, month, overall?.availableMonths, personal?.availableMonths]);

  const refresh = () => {
    if (isAdmin) loadOverall(month, true);
    else loadPersonal(month, true);
  };

  // No role check for the personal view: whether this account is linked to an
  // employee record is the LMS's decision, and it answers /me with a 403 and a
  // NOT_LINKED code when it is not. ErrorBanner renders that answer.
  return (
    <main className={styles.page}>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <PageHeader
          isAdmin={isAdmin}
          personal={personal}
          month={month}
          monthOptions={monthOptions}
          loading={!isLoaded || loading}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onMonthChange={setMonth}
          onRefresh={refresh}
        />

        <ErrorBanner error={error} code={errorCode} />

        {!isLoaded || loading ? <LoadingState /> : null}
        {isLoaded && !loading && !isAdmin && personal ? (
          <PersonalDashboard data={personal} month={month} />
        ) : null}
        {isLoaded && !loading && isAdmin && overall ? (
          <AdminDashboard data={overall} month={month} />
        ) : null}
      </div>
    </main>
  );
}
