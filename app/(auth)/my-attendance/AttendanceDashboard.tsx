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
  ChevronDown,
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
  Search,
  ScrollText,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
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
    reason?: string;
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

/** The statuses a history can be narrowed to from a count in the overview. */
type FilterableStatus = "present" | "half" | "absent";

const STATUS_FILTER_LABEL: Record<FilterableStatus, string> = {
  present: "Present",
  half: "Half day",
  absent: "Absent",
};

const readFilterableStatus = (value: string | undefined): FilterableStatus | "" =>
  value === "present" || value === "half" || value === "absent" ? value : "";

type MetricTone = "accent" | "teal" | "amber" | "rose" | "neutral";
type BulkExceptionTarget = "all" | "half" | "absent";

const ATTENDANCE_ADMIN_ROLE = "ATTENDANCE_ADMIN";
const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
const ADMIN_ROLE = "ADMIN";
const REFRESH_INTERVAL_MS = 60_000;

// Roles that get the admin views. SUPER_ADMIN and ADMIN are console roles that
// open the attendance admin section from their own dashboards, and hold the
// same attendance scopes server-side (see the LMS lib/staffAttendancePolicy.js).
const ADMIN_ROLES = [ATTENDANCE_ADMIN_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE];

const isAttendanceAdmin = (role: string) => ADMIN_ROLES.includes(role);

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

      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
        <MonthControls
          month={month}
          options={monthOptions}
          loading={loading}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onMonthChange={onMonthChange}
          onRefresh={onRefresh}
        />
        <PolicyButton />
      </div>
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

const ATTENDANCE_POLICIES = [
  {
    title: "Under 8h 30m worked",
    detail:
      "A working day with less than the full 8h 30m of recorded work counts as a half day.",
  },
  {
    title: "Saturday under 7h",
    detail:
      "Saturday has a shorter full day: less than 7 hours worked counts as a half day.",
  },
  {
    title: "A single punch",
    detail:
      "A day with only one punch recorded — punched in but never out — counts as a half day.",
  },
  {
    title: "Approved leave allowance",
    detail:
      "The first 15 approved leaves are counted as leave. Every approved leave beyond that allowance is counted as absent.",
  },
  {
    title: "Saturday or Monday leave",
    detail:
      "Leave taken on a Saturday or a Monday counts as 2 absences.",
  },
  {
    title: "An admin exception overrides all of the above",
    detail:
      "Where an administrator has applied an exception to a day, that decision stands and the rules above do not apply to it. Every exception carries the reason it was given.",
  },
];

/** The attendance rules, in the words the office uses. */
function PolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={styles.glass + " w-full max-w-2xl overflow-hidden"}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={
            styles.divider +
            " flex items-start justify-between gap-4 border-b px-5 py-4"
          }
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={styles.metricIcon + " " + styles.metricAccent + " h-10 w-10"}
            >
              <ScrollText className="h-5 w-5" />
            </span>
            <div>
              <h2 id="policy-title" className={styles.primary + " text-base font-bold"}>
                Attendance policy
              </h2>
              <p className={styles.muted + " mt-0.5 text-xs"}>
                How each day is counted
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.iconButton + " flex h-9 w-9 shrink-0 items-center justify-center"}
            aria-label="Close the attendance policy"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <ol className="px-5 py-4">
          {ATTENDANCE_POLICIES.map((policy, index) => (
            <li
              key={policy.title}
              className={
                styles.divider +
                " flex gap-3.5 border-b py-3.5 first:pt-1 last:border-b-0 last:pb-1"
              }
            >
              <span
                aria-hidden="true"
                className={
                  styles.control +
                  " flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                }
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className={styles.primary + " text-sm font-semibold"}>
                  {policy.title}
                </p>
                <p className={styles.secondary + " mt-1 text-xs leading-5"}>
                  {policy.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** The button that opens the policy, with the dialog it owns. */
function PolicyButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          styles.control +
          " inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors " +
          className
        }
      >
        <ScrollText aria-hidden="true" className="h-4 w-4" />
        View policy
      </button>
      <PolicyDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type AttendanceAdjustmentInput = {
  exception: boolean;
  approvedLeave: boolean;
  reason?: string;
};

const adjustmentFor = (record: AttendanceRecord): AttendanceAdjustmentInput => ({
  exception: record.adjustment?.exception === true,
  approvedLeave: record.adjustment?.approvedLeave === true,
  reason: record.adjustment?.reason || "",
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
  // Applying an exception asks for a reason first; clearing one does not, and
  // approved leave is a plain toggle.
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState(adjustment.reason || "");
  const [reasonError, setReasonError] = useState("");

  const applyException = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("A reason is required");
      return;
    }
    setReasonError("");
    setReasonOpen(false);
    onChange(record.dateKey, {
      ...adjustment,
      exception: true,
      reason: trimmed,
    });
  };

  const toggleException = () => {
    if (adjustment.exception) {
      onChange(record.dateKey, { ...adjustment, exception: false, reason: "" });
      return;
    }
    setReasonError("");
    setReasonOpen((open) => !open);
  };

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
          " w-64 overflow-hidden rounded-md border " +
          (floating ? "absolute right-0 top-9 z-30" : "mt-2")
        }
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={adjustment.exception}
          aria-expanded={reasonOpen}
          onClick={toggleException}
          className={
            styles.divider +
            " flex min-h-10 w-full items-center gap-2 border-b px-3 text-left text-xs font-semibold outline-none hover:bg-indigo-500/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/70 disabled:cursor-wait disabled:opacity-60"
          }
        >
          <span
            aria-hidden="true"
            className={
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
              (adjustment.exception
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-400/60")
            }
          >
            {adjustment.exception ? <Check className="h-3 w-3" /> : null}
          </span>
          <span className={styles.primary}>Exceptions</span>
        </button>

        {reasonOpen && !adjustment.exception ? (
          <div className={styles.divider + " border-b px-3 py-2.5"}>
            <label
              htmlFor={"exception-reason-" + record.dateKey}
              className={styles.secondary + " block text-[0.7rem] font-semibold"}
            >
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id={"exception-reason-" + record.dateKey}
              rows={2}
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this day excused?"
              className={
                styles.control +
                " mt-1.5 w-full resize-none px-2 py-1.5 text-xs outline-none"
              }
            />
            {reasonError ? (
              <p className="mt-1 text-[0.7rem] font-semibold text-rose-500">
                {reasonError}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={applyException}
                className="inline-flex min-h-8 items-center rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
              >
                Apply exception
              </button>
              <button
                type="button"
                onClick={() => setReasonOpen(false)}
                className={
                  styles.secondary +
                  " inline-flex min-h-8 items-center rounded-md px-2 text-xs font-semibold"
                }
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          aria-pressed={adjustment.approvedLeave}
          onClick={() =>
            onChange(record.dateKey, {
              ...adjustment,
              approvedLeave: !adjustment.approvedLeave,
            })
          }
          className={
            styles.divider +
            " flex min-h-10 w-full items-center gap-2 px-3 text-left text-xs font-semibold outline-none hover:bg-indigo-500/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/70 disabled:cursor-wait disabled:opacity-60"
          }
        >
          <span
            aria-hidden="true"
            className={
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
              (adjustment.approvedLeave
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-400/60")
            }
          >
            {adjustment.approvedLeave ? <Check className="h-3 w-3" /> : null}
          </span>
          <span className={styles.primary}>Approved Leave</span>
        </button>
      </div>
    </details>
  );
}

const adjustmentNote = (record: AttendanceRecord) => {
  // An exception outranks every other rule, so its reason is what the row has
  // to explain — the leave note only matters when no exception was applied.
  if (record.adjustment?.exception) {
    return record.adjustment.reason
      ? "Exception: " + record.adjustment.reason
      : "Exception applied";
  }
  if (record.adjustment?.leaveLimitExceeded) {
    return "Approved leave limit exceeded";
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
  statusFilter,
  onStatusFilterChange,
  onAdjustmentChange,
}: {
  data: AttendancePayload;
  month: string;
  savingDate: string;
  statusFilter: FilterableStatus | "";
  onStatusFilterChange: (status: FilterableStatus | "") => void;
  onAdjustmentChange: (
    dateKey: string,
    adjustment: AttendanceAdjustmentInput,
  ) => void;
}) {
  const summary = data.summary;
  // The counts always describe the whole month; only the history below is
  // narrowed, so the totals stay stable while a filter is on.
  const facts: {
    label: string;
    value: string | number;
    status?: FilterableStatus;
  }[] = [
    { label: "Recorded", value: data.records.length },
    { label: "Present", value: summary.presentDays, status: "present" },
    { label: "Half day", value: summary.halfDays, status: "half" },
    { label: "Absent", value: summary.absentDays, status: "absent" },
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

  const visibleRecords = statusFilter
    ? data.records.filter((record) => record.status === statusFilter)
    : data.records;

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
          {facts.map((fact) => {
            const selected = Boolean(fact.status) && fact.status === statusFilter;
            const clickable = Boolean(fact.status) && Number(fact.value) > 0;

            return (
              <div
                key={fact.label}
                className={
                  styles.divider +
                  " min-w-0 border-b px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0 " +
                  (selected ? "bg-indigo-500/[0.08]" : "")
                }
              >
                {clickable ? (
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onStatusFilterChange(selected ? "" : fact.status || "")
                    }
                    title={
                      selected
                        ? "Show every day again"
                        : "Show only the " + fact.label.toLowerCase() + " days"
                    }
                    className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                  >
                    <dt
                      className={
                        (selected ? styles.accent : styles.muted) +
                        " flex items-center gap-1 text-xs font-medium"
                      }
                    >
                      {fact.label}
                      <ChevronRight aria-hidden="true" className="h-3 w-3" />
                    </dt>
                    <dd
                      className={
                        styles.primary +
                        " mt-1 text-base font-bold tabular-nums underline-offset-4 hover:underline"
                      }
                    >
                      {fact.value}
                    </dd>
                  </button>
                ) : (
                  <>
                    <dt className={styles.muted + " text-xs font-medium"}>
                      {fact.label}
                    </dt>
                    <dd
                      className={
                        styles.primary + " mt-1 text-base font-bold tabular-nums"
                      }
                    >
                      {fact.value}
                    </dd>
                  </>
                )}
              </div>
            );
          })}
        </dl>
      </section>

      {statusFilter ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={
              styles.control +
              " inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold"
            }
          >
            Showing {STATUS_FILTER_LABEL[statusFilter].toLowerCase()} days only
            <button
              type="button"
              onClick={() => onStatusFilterChange("")}
              aria-label="Show every day again"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-indigo-500/20"
            >
              <X aria-hidden="true" className="h-3 w-3" />
            </button>
          </span>
          <span className={styles.muted + " text-xs"}>
            {visibleRecords.length} of {data.records.length} recorded days
          </span>
        </div>
      ) : null}

      <PersonalHistory
        records={visibleRecords}
        month={month}
        title={
          statusFilter
            ? STATUS_FILTER_LABEL[statusFilter] + " days"
            : "Individual attendance details"
        }
        canAdjust
        savingDate={savingDate}
        onAdjustmentChange={onAdjustmentChange}
      />
    </>
  );
}

/**
 * One count in the staff table, as a link into that employee's history filtered
 * to the days behind the number — clicking "3" under Half day opens their three
 * half days. A zero is not a link: there is nothing to open.
 */
function StatusCountCell({
  employeeId,
  name,
  month,
  status,
  count,
  className,
}: {
  employeeId: number;
  name: string;
  month: string;
  status: FilterableStatus;
  count: number;
  className: string;
}) {
  return (
    <td className={"px-4 py-3.5 font-semibold tabular-nums " + className}>
      {count > 0 ? (
        <Link
          href={
            "/my-attendance/staff/" +
            employeeId +
            "?month=" +
            encodeURIComponent(month) +
            "&status=" +
            status
          }
          title={
            "Show " + name + "'s " + STATUS_FILTER_LABEL[status] + " days"
          }
          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-1.5 underline-offset-4 outline-none transition hover:bg-indigo-500/[0.08] hover:underline focus-visible:ring-2 focus-visible:ring-indigo-400/70"
        >
          {count}
        </Link>
      ) : (
        <span className="inline-flex min-h-8 min-w-8 items-center justify-center px-1.5 opacity-60">
          {count}
        </span>
      )}
    </td>
  );
}

function StaffSummaryTable({
  staff,
  month,
}: {
  staff: StaffSummaryRow[];
  month: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [halfDayOnly, setHalfDayOnly] = useState(false);
  const [absentOnly, setAbsentOnly] = useState(false);

  const visibleStaff = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const categoryFilterActive = halfDayOnly || absentOnly;

    const matching = staff.filter((entry) => {
      const matchesSearch =
        !query ||
        entry.name.toLocaleLowerCase().includes(query) ||
        String(entry.employeeId).includes(query);
      const matchesCategory =
        !categoryFilterActive ||
        (halfDayOnly && entry.summary.halfDays > 0) ||
        (absentOnly && entry.summary.absentDays > 0);

      return matchesSearch && matchesCategory;
    });

    if (!categoryFilterActive) return matching;

    // A category filter is also a ranking: the point of asking for half days is
    // to see who has the most of them. With both filters on, the two counts are
    // added so the worst attendance overall comes first; ties fall back to the
    // name so the order never jitters between refreshes.
    const rank = (entry: StaffSummaryRow) =>
      (halfDayOnly ? entry.summary.halfDays : 0) +
      (absentOnly ? entry.summary.absentDays : 0);

    return [...matching].sort(
      (first, second) =>
        rank(second) - rank(first) || first.name.localeCompare(second.name),
    );
  }, [absentOnly, halfDayOnly, searchQuery, staff]);

  const filtersActive = Boolean(searchQuery.trim()) || halfDayOnly || absentOnly;

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
          {filtersActive ? visibleStaff.length + " of " : ""}
          {staff.length} {staff.length === 1 ? "staff member" : "staff"}
        </span>
      </div>

      {staff.length ? (
        <div
          className={
            styles.divider +
            " flex flex-col gap-3 border-b px-4 py-3 sm:px-5 lg:flex-row lg:items-center"
          }
        >
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className={styles.muted + " pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search staff by name or ID"
              aria-label="Search staff by name or employee ID"
              className={
                styles.control +
                " h-10 w-full pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
              }
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear staff search"
                title="Clear search"
                className={
                  styles.muted +
                  " absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md hover:bg-slate-500/10"
                }
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Filter staff by attendance category</legend>
            <label
              className={
                styles.control +
                " inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-sm font-semibold"
              }
            >
              <input
                type="checkbox"
                checked={halfDayOnly}
                onChange={(event) => setHalfDayOnly(event.target.checked)}
                className="h-4 w-4 accent-amber-600"
              />
              Half Day
            </label>
            <label
              className={
                styles.control +
                " inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-sm font-semibold"
              }
            >
              <input
                type="checkbox"
                checked={absentOnly}
                onChange={(event) => setAbsentOnly(event.target.checked)}
                className="h-4 w-4 accent-rose-600"
              />
              Absent
            </label>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setHalfDayOnly(false);
                  setAbsentOnly(false);
                }}
                className={
                  styles.secondary +
                  " inline-flex h-10 items-center px-2 text-xs font-semibold hover:underline"
                }
              >
                Clear filters
              </button>
            ) : null}
          </fieldset>
        </div>
      ) : null}

      {!staff.length ? (
        <EmptyState
          title="No staff attendance recorded"
          detail="Staff summaries will appear here after attendance records are imported."
        />
      ) : !visibleStaff.length ? (
        <EmptyState
          title="No matching staff"
          detail="Try another search or clear the selected attendance filters."
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
                {visibleStaff.map((entry) => (
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
                      <StatusCountCell
                        employeeId={entry.employeeId}
                        name={entry.name}
                        month={month}
                        status="present"
                        count={entry.summary.presentDays}
                        className="text-emerald-700 dark:text-emerald-300"
                      />
                      <StatusCountCell
                        employeeId={entry.employeeId}
                        name={entry.name}
                        month={month}
                        status="half"
                        count={entry.summary.halfDays}
                        className="text-amber-700 dark:text-amber-300"
                      />
                      <StatusCountCell
                        employeeId={entry.employeeId}
                        name={entry.name}
                        month={month}
                        status="absent"
                        count={entry.summary.absentDays}
                        className="text-rose-700 dark:text-rose-300"
                      />
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
            {visibleStaff.map((entry) => (
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

/**
 * One exception applied to every active staff member for a single date — the
 * office was shut, the device was down, the team was off site.
 *
 * The reason is mandatory here for the same purpose as on a single day: the
 * record has to say why a whole day was excused. The LMS enforces it too.
 */
function BulkExceptionPanel({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [targetStatus, setTargetStatus] =
    useState<BulkExceptionTarget>("all");
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "apply" | "remove" | null
  >(null);
  // Off by default: a removal undoes the bulk run and leaves individual
  // decisions alone, unless the admin says otherwise.
  const [removeEveryException, setRemoveEveryException] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const targetLabel =
    targetStatus === "all"
      ? "all staff"
      : targetStatus === "half"
        ? "Half Day staff"
        : "Absent staff";

  const dateIsValid = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return true;
    setError("Choose the date the exception applies to");
    setResult("");
    return false;
  };

  const apply = async () => {
    const trimmedReason = reason.trim();
    if (!dateIsValid()) return;
    if (!trimmedReason) {
      setError("A reason is required");
      setResult("");
      return;
    }

    setPendingAction("apply");
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/staff/attendance/exceptions-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateKey,
          reason: trimmedReason,
          targetStatus,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Could not apply the exception");
      }
      setResult(
        "Exception applied to " +
          payload.staffCount +
          " " +
          (targetStatus === "all"
            ? payload.staffCount === 1
              ? "staff member"
              : "staff"
            : targetLabel) +
          " for " +
          formatDate(dateKey) +
          ".",
      );
      setReason("");
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not apply the exception",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const remove = async () => {
    if (!dateIsValid()) return;
    if (
      !window.confirm(
        removeEveryException
          ? "Remove every exception recorded for " +
              formatDate(dateKey) +
              ", including ones applied to individual staff? Approved leave will be kept."
          : "Remove bulk-applied exceptions for " +
              formatDate(dateKey) +
              "? Approved leave and earlier individual exceptions will be kept.",
      )
    ) {
      return;
    }

    setPendingAction("remove");
    setError("");
    setResult("");

    const requestRemoval = async (confirmLegacy: boolean) => {
      const params = new URLSearchParams({ dateKey });
      if (confirmLegacy) params.set("confirmLegacy", "true");
      // scope=all covers individual exceptions too, so the server never has to
      // ask about older ones it cannot tell apart.
      if (removeEveryException) params.set("scope", "all");
      const response = await fetch(
        "/api/staff/attendance/exceptions-all?" + params.toString(),
        { method: "DELETE" },
      );
      const payload = await response.json();
      return { response, payload };
    };

    try {
      let removal = await requestRemoval(false);
      if (
        removal.response.status === 409 &&
        removal.payload?.code === "LEGACY_EXCEPTION_CONFIRMATION_REQUIRED"
      ) {
        const legacyCount = Number(removal.payload?.exceptionCount) || 0;
        const confirmed = window.confirm(
          (removal.payload?.error ||
            "These older exceptions cannot be distinguished from individual exceptions.") +
            "\n\nContinue and clear " +
            legacyCount +
            (legacyCount === 1 ? " exception" : " exceptions") +
            " for this date? Approved leave will still be kept.",
        );
        if (!confirmed) return;
        removal = await requestRemoval(true);
      }

      if (!removal.response.ok) {
        throw new Error(
          removal.payload?.error || "Could not remove the exceptions",
        );
      }

      const removed = Number(removal.payload?.removed) || 0;
      const noun = removeEveryException ? " exception" : " bulk exception";
      setResult(
        removed
          ? String(removed) +
              noun +
              (removed === 1 ? " was removed for " : "s were removed for ") +
              formatDate(dateKey) +
              "."
          : "No" + noun + "s were found for " + formatDate(dateKey) + ".",
      );
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove the exceptions",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className={styles.glass + " mb-4 overflow-hidden"}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={styles.metricIcon + " " + styles.metricAccent + " h-10 w-10"}
          >
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className={styles.primary + " text-sm font-bold"}>
              Exceptions for all staff
            </h2>
            <p className={styles.muted + " mt-0.5 text-xs"}>
              Excuse one date for everyone, Half Day staff, or Absent staff.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={
            styles.control +
            " inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold"
          }
        >
          {open ? "Close" : "Apply an exception"}
          <ChevronDown
            aria-hidden="true"
            className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")}
          />
        </button>
      </div>

      {open ? (
        <div className={styles.divider + " border-t px-4 py-4 sm:px-5"}>
          <div className="grid gap-3 lg:grid-cols-[13rem_14rem_minmax(0,1fr)]">
            <div>
              <label
                htmlFor="bulk-exception-date"
                className={styles.secondary + " block text-xs font-semibold"}
              >
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="bulk-exception-date"
                type="date"
                value={dateKey}
                onChange={(event) => setDateKey(event.target.value)}
                disabled={pendingAction !== null}
                className={
                  styles.control +
                  " mt-1.5 h-11 w-full px-3 text-sm font-semibold outline-none disabled:cursor-wait disabled:opacity-60"
                }
              />
            </div>
            <div>
              <label
                htmlFor="bulk-exception-target"
                className={styles.secondary + " block text-xs font-semibold"}
              >
                Apply to
              </label>
              <select
                id="bulk-exception-target"
                value={targetStatus}
                onChange={(event) =>
                  setTargetStatus(event.target.value as BulkExceptionTarget)
                }
                disabled={pendingAction !== null}
                className={
                  styles.control +
                  " mt-1.5 h-11 w-full px-3 text-sm font-semibold outline-none disabled:cursor-wait disabled:opacity-60"
                }
              >
                <option value="all">All staff</option>
                <option value="half">Half Day only</option>
                <option value="absent">Absent only</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="bulk-exception-reason"
                className={styles.secondary + " block text-xs font-semibold"}
              >
                Reason <span className="text-rose-500">*</span>
              </label>
              <input
                id="bulk-exception-reason"
                type="text"
                value={reason}
                maxLength={300}
                onChange={(event) => setReason(event.target.value)}
                disabled={pendingAction !== null}
                placeholder="Why is this date excused for the selected staff?"
                className={
                  styles.control +
                  " mt-1.5 h-11 w-full px-3 text-sm outline-none disabled:cursor-wait disabled:opacity-60"
                }
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <label
              className={
                styles.secondary +
                " mr-auto inline-flex cursor-pointer items-center gap-2 text-xs font-semibold"
              }
            >
              <input
                type="checkbox"
                checked={removeEveryException}
                disabled={pendingAction !== null}
                onChange={(event) =>
                  setRemoveEveryException(event.target.checked)
                }
                className="h-4 w-4 cursor-pointer accent-indigo-600"
              />
              Also remove exceptions applied to individual staff
            </label>
            <button
              type="button"
              onClick={remove}
              disabled={pendingAction !== null}
              className={
                styles.control +
                " inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-60 dark:text-rose-300"
              }
            >
              {pendingAction === "remove" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              )}
              Remove for this date
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={pendingAction !== null}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
            >
              {pendingAction === "apply" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Check aria-hidden="true" className="h-4 w-4" />
              )}
              Apply to {targetLabel}
            </button>
          </div>

          {error ? (
            <p className="mt-3 text-xs font-semibold text-rose-500" role="alert">
              {error}
            </p>
          ) : null}
          {result ? (
            <p
              className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
              role="status"
            >
              {result}
            </p>
          ) : null}
          <p className={styles.muted + " mt-3 text-xs leading-5"}>
            Category matching uses each staff member&apos;s attendance for the
            selected date. Removing reverses bulk-applied exceptions while
            preserving approved leave and any individual exception that existed
            beforehand.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function AdminDashboard({
  data,
  month,
  onRefresh,
}: {
  data: AttendanceOverviewPayload;
  month: string;
  onRefresh: () => void;
}) {
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

      <BulkExceptionPanel onChanged={onRefresh} />

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
  initialStatus,
}: {
  employeeId: string;
  initialMonth?: string;
  initialStatus?: string;
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
  // Set when the admin arrived by clicking a Present / Half day / Absent count
  // in the overview; the URL keeps it so the filtered view can be shared.
  const [statusFilter, setStatusFilter] = useState<FilterableStatus | "">(() =>
    readFilterableStatus(initialStatus),
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
            body: JSON.stringify({
              dateKey,
              exception: adjustment.exception,
              approvedLeave: adjustment.approvedLeave,
              reason: adjustment.reason || "",
            }),
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

  const detailHref = (nextMonth: string, nextStatus: FilterableStatus | "") =>
    "/my-attendance/staff/" +
    validEmployeeId +
    "?month=" +
    encodeURIComponent(nextMonth) +
    (nextStatus ? "&status=" + nextStatus : "");

  const changeMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    router.replace(detailHref(nextMonth, statusFilter));
  };

  const changeStatusFilter = (nextStatus: FilterableStatus | "") => {
    setStatusFilter(nextStatus);
    router.replace(detailHref(month, nextStatus));
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

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <MonthControls
              month={month}
              options={monthOptions}
              loading={!isLoaded || loading}
              refreshing={refreshing}
              lastUpdated={lastUpdated}
              onMonthChange={changeMonth}
              onRefresh={() => loadStaff(month, true)}
            />
            <PolicyButton />
          </div>
        </header>

        <ErrorBanner error={error} code="" />
        {!isLoaded || loading ? <LoadingState /> : null}
        {isLoaded && !loading && data ? (
          <StaffDetailView
            data={data}
            month={month}
            savingDate={savingDate}
            statusFilter={statusFilter}
            onStatusFilterChange={changeStatusFilter}
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
          <AdminDashboard
            data={overall}
            month={month}
            onRefresh={() => loadOverall(month, true)}
          />
        ) : null}
      </div>
    </main>
  );
}
