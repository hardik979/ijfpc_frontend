"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { isAttendanceAdmin } from "./attendanceRoles";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  LoaderCircle,
  Trash2,
  MessagesSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import styles from "./attendance.module.css";
import { AttachmentStrip } from "./LeaveRequests";
import {
  useLeaveNotifications,
  type LeaveRequest,
  type LeaveThreadEntry,
  type LeaveThreadSummary,
} from "@/lib/hooks/useLeaveRequests";
import { LIVE_LIST_MS, useLiveThread } from "@/lib/hooks/useLiveThread";

const MAX_MESSAGE_LENGTH = 2000;
// Matches the attendance dashboard's own polling cadence (AttendanceDashboard.tsx).
const REFRESH_INTERVAL_MS = 60_000;

const formatWhen = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (dateKey: string) =>
  new Date(dateKey + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "3m", "2h", "5d" — enough to place a message without reading a full date. */
const formatAgo = (value: string) => {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return minutes + "m";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + "h";
  return Math.round(hours / 24) + "d";
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "ST";

const requestDates = (request: LeaveRequest) => {
  if (!request.startDate) return "Message";
  const range =
    request.endDate && request.endDate !== request.startDate
      ? formatDate(request.startDate) + " – " + formatDate(request.endDate)
      : formatDate(request.startDate);
  return request.days > 1 ? range + " · " + request.days + " days" : range;
};

const STATUS_TEXT: Record<string, string> = {
  pending: "Waiting",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Withdrawn",
  closed: "Message",
};

/**
 * "Approved" alone would hide the one thing that actually matters once a
 * request is decided: whether it spent a day of the 15-day leave allowance or
 * was excused as an exception.
 */
const statusText = (request: LeaveRequest) => {
  if (request.status === "approved") {
    return request.decision?.approvalType === "exception"
      ? "Approved (exception)"
      : "Approved (leave)";
  }
  return STATUS_TEXT[request.status];
};

/** The list of people, most recent conversation first. */
function ThreadList({
  threads,
  loading,
  onOpen,
}: {
  threads: LeaveThreadSummary[];
  loading: boolean;
  onOpen: (thread: LeaveThreadSummary) => void;
}) {
  if (!loading && !threads.length) {
    return (
      <p className={styles.muted + " px-5 py-12 text-center text-xs"}>
        Nobody has written yet. New messages appear here on their own.
      </p>
    );
  }

  return (
    <ul className="px-2 py-2">
      {threads.map((thread) => (
        <li key={thread.employeeId}>
          <button
            type="button"
            onClick={() => onOpen(thread)}
            className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left outline-none transition hover:bg-slate-900/[0.05] focus-visible:ring-2 focus-visible:ring-indigo-400/70 dark:hover:bg-white/10"
          >
            <span
              aria-hidden="true"
              className={
                styles.identityIcon +
                " relative flex h-10 w-10 shrink-0 items-center justify-center text-[0.7rem] font-bold"
              }
            >
              {initials(thread.staffName)}
              {thread.unread ? (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white/70 bg-indigo-500 dark:border-slate-900/70" />
              ) : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={
                    (thread.unread ? styles.primary : styles.secondary) +
                    " truncate text-sm font-semibold"
                  }
                >
                  {thread.staffName || "Employee " + thread.employeeId}
                </span>
                <span className={styles.muted + " shrink-0 text-[0.7rem]"}>
                  {thread.lastAt ? formatAgo(thread.lastAt) : ""}
                </span>
              </span>

              <span
                className={styles.muted + " mt-0.5 flex items-center gap-1.5 text-xs"}
              >
                {thread.lastAuthor === "admin" ? (
                  <span className="shrink-0 font-semibold">You:</span>
                ) : null}
                <span className="line-clamp-1 break-all">{thread.lastText}</span>
              </span>

              {thread.pending ? (
                <span className="mt-1.5 inline-flex min-h-6 items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50/80 px-2 text-[0.68rem] font-semibold text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                  {thread.pending} waiting for a decision
                </span>
              ) : null}
            </span>

            <ChevronRight
              aria-hidden="true"
              className={styles.muted + " mt-2.5 h-4 w-4 shrink-0"}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

const MAX_APPROVAL_REASON_LENGTH = 300;

/** One message in the conversation. */
function ThreadBubble({
  entry,
  onDecide,
  onDelete,
  deciding,
}: {
  entry: LeaveThreadEntry;
  onDecide: (
    request: LeaveRequest,
    status: "approved" | "declined",
    approvalType?: "leave" | "exception",
    reason?: string,
  ) => void;
  onDelete: (request: LeaveRequest) => void;
  deciding: string;
}) {
  const fromAdmin = entry.author === "admin";
  const request = entry.request;

  // Approving always asks why first: a leave day spends the staff member's
  // allowance and an exception excuses one, so neither happens without a
  // reason on record. Picking a type swaps the two approve buttons for this
  // box instead of deciding right away.
  const [confirmingType, setConfirmingType] = useState<
    "leave" | "exception" | null
  >(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const startApproval = (type: "leave" | "exception") => {
    setConfirmingType(type);
    setReason("");
    setReasonError("");
  };

  const cancelApproval = () => {
    setConfirmingType(null);
    setReason("");
    setReasonError("");
  };

  const confirmApproval = () => {
    if (!request || !confirmingType) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("A reason is required");
      return;
    }
    onDecide(request, "approved", confirmingType, trimmed);
    setConfirmingType(null);
    setReason("");
    setReasonError("");
  };

  return (
    <li className={"flex " + (fromAdmin ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%]">
        <div
          className={
            "rounded-2xl px-3.5 py-2.5 text-sm leading-6 " +
            (fromAdmin
              ? styles.glassBubbleMine
              : styles.glassBubbleTheirs + " " + styles.primary)
          }
        >
          {request ? (
            <p
              className={
                (fromAdmin ? "text-indigo-100" : styles.muted) +
                " mb-1 text-[0.7rem] font-semibold"
              }
            >
              {requestDates(request)} · {statusText(request)}
            </p>
          ) : null}
          <p className="whitespace-pre-line break-words">{entry.body}</p>
          <AttachmentStrip attachments={entry.attachments} />
        </div>

        <p
          className={
            styles.muted +
            " mt-1 text-[0.68rem] " +
            (fromAdmin ? "text-right" : "")
          }
        >
          {fromAdmin ? entry.authorName || "Admin" : entry.authorName} ·{" "}
          {formatWhen(entry.createdAt)}
        </p>

        {request && request.status !== "pending" ? (
          <button
            type="button"
            onClick={() => onDelete(request)}
            disabled={Boolean(deciding)}
            className={
              styles.muted +
              " mt-1.5 inline-flex min-h-7 items-center gap-1.5 rounded-lg px-2 text-[0.68rem] font-semibold transition hover:text-rose-500 disabled:opacity-50"
            }
            title="Delete this request and everything said about it"
          >
            {deciding === request.id + ":delete" ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-3 w-3 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Trash2 aria-hidden="true" className="h-3 w-3" />
            )}
            Delete
          </button>
        ) : null}

        {request && request.status === "pending" ? (
          confirmingType ? (
            <div
              className={
                styles.glassChip +
                " mt-1.5 w-full max-w-xs rounded-xl p-2.5"
              }
            >
              <label
                htmlFor={"approval-reason-" + request.id}
                className={styles.secondary + " block text-[0.7rem] font-semibold"}
              >
                Reason for{" "}
                {confirmingType === "leave"
                  ? "approving as leave"
                  : "approving as an exception"}
                <span className="text-rose-500"> *</span>
              </label>
              <textarea
                id={"approval-reason-" + request.id}
                rows={2}
                autoFocus
                value={reason}
                maxLength={MAX_APPROVAL_REASON_LENGTH}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (reasonError) setReasonError("");
                }}
                placeholder={
                  confirmingType === "leave"
                    ? "Why is this leave being approved?"
                    : "Why is this day excused as an exception?"
                }
                className={
                  styles.glassField +
                  " mt-1 w-full resize-none px-2.5 py-1.5 text-xs"
                }
              />
              {reasonError ? (
                <p
                  role="alert"
                  className="mt-1 text-[0.7rem] font-semibold text-rose-500"
                >
                  {reasonError}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmApproval}
                  disabled={Boolean(deciding)}
                  className={
                    (confirmingType === "leave"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-indigo-600 hover:bg-indigo-500") +
                    " inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.7rem] font-semibold text-white transition disabled:cursor-wait disabled:opacity-60"
                  }
                >
                  {deciding === request.id + ":" + confirmingType ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-3 w-3 animate-spin motion-reduce:animate-none"
                    />
                  ) : confirmingType === "leave" ? (
                    <Check aria-hidden="true" className="h-3 w-3" />
                  ) : (
                    <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                  )}
                  Confirm{" "}
                  {confirmingType === "leave"
                    ? "Approve Leave"
                    : "Approve Exception"}
                </button>
                <button
                  type="button"
                  onClick={cancelApproval}
                  disabled={Boolean(deciding)}
                  className={
                    styles.secondary +
                    " inline-flex min-h-8 items-center rounded-lg px-2.5 text-[0.7rem] font-semibold disabled:opacity-60"
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startApproval("leave")}
                disabled={Boolean(deciding)}
                title="Approve and deduct this from the staff member's 15-day leave allowance"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[0.7rem] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
              >
                <Check aria-hidden="true" className="h-3 w-3" />
                Approve Leave
              </button>
              <button
                type="button"
                onClick={() => startApproval("exception")}
                disabled={Boolean(deciding)}
                title="Approve as an exception — never spends the staff member's leave allowance"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 text-[0.7rem] font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
              >
                <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                Approve Exception
              </button>
              <button
                type="button"
                onClick={() => onDecide(request, "declined")}
                disabled={Boolean(deciding)}
                className={
                  styles.glassChip +
                  " inline-flex min-h-8 items-center gap-1.5 px-2.5 text-[0.7rem] font-semibold text-rose-600 disabled:cursor-wait disabled:opacity-60 dark:text-rose-300"
                }
              >
                {deciding === request.id + ":declined" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3 w-3 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <X aria-hidden="true" className="h-3 w-3" />
                )}
                Decline
              </button>
            </div>
          )
        ) : null}
      </div>
    </li>
  );
}

/** The conversation with one staff member, kept up to date while it is open. */
function ThreadView({
  employeeId,
  staffName,
  onBack,
  onChanged,
}: {
  employeeId: number;
  staffName: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { entries, loading, error, refresh, adopt } = useLiveThread({
    url: "/api/staff/leave-requests/threads/" + employeeId,
  });
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deciding, setDeciding] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const nearBottom = useRef(true);

  // Follow the conversation only when the reader is already at the bottom, so a
  // message arriving mid-scroll never yanks them away from what they are reading.
  useEffect(() => {
    if (nearBottom.current) {
      endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [entries]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    nearBottom.current =
      node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  };

  const send = async () => {
    const body = reply.trim();
    if (!body) return;

    setSending(true);
    setActionError("");
    try {
      const response = await fetch(
        "/api/staff/leave-requests/threads/" + employeeId + "/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: body }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not send that reply");
      }
      nearBottom.current = true;
      if (Array.isArray(payload?.entries)) adopt(payload.entries);
      setReply("");
      onChanged();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Could not send that reply",
      );
    } finally {
      setSending(false);
    }
  };

  const remove = async (request: LeaveRequest) => {
    if (
      !window.confirm(
        "Delete this request and the whole conversation on it? This cannot be undone.",
      )
    ) {
      return;
    }

    setDeciding(request.id + ":delete");
    setActionError("");
    try {
      const response = await fetch("/api/staff/leave-requests/" + request.id, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not delete that request");
      }
      refresh();
      onChanged();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Could not delete that request",
      );
    } finally {
      setDeciding("");
    }
  };

  const decide = async (
    request: LeaveRequest,
    status: "approved" | "declined",
    approvalType?: "leave" | "exception",
    reason?: string,
  ) => {
    setDeciding(request.id + ":" + (status === "approved" ? approvalType : status));
    setActionError("");
    try {
      const response = await fetch("/api/staff/leave-requests/" + request.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: "", approvalType, reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not save that decision");
      }
      refresh();
      onChanged();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Could not save that decision",
      );
    } finally {
      setDeciding("");
    }
  };

  const shown = error || actionError;

  return (
    <>
      <div
        className={
          styles.glassDivider +
          " flex shrink-0 items-center gap-3 border-b px-4 py-4"
        }
      >
        <button
          type="button"
          onClick={onBack}
          className={
            styles.glassChip +
            " flex h-9 w-9 shrink-0 items-center justify-center"
          }
          aria-label="Back to all conversations"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <span
          aria-hidden="true"
          className={
            styles.identityIcon +
            " flex h-10 w-10 shrink-0 items-center justify-center text-[0.7rem] font-bold"
          }
        >
          {initials(staffName)}
        </span>
        <div className="min-w-0">
          <p className={styles.primary + " truncate text-sm font-bold"}>
            {staffName || "Employee " + employeeId}
          </p>
          <p className={styles.muted + " text-xs"}>ID {employeeId}</p>
        </div>
      </div>

      {shown ? (
        <p
          role="alert"
          className="flex shrink-0 items-start gap-2 px-5 py-2.5 text-xs font-semibold text-rose-500"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {shown}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
        {loading && !entries.length ? (
          <p className={styles.muted + " py-8 text-center text-xs"}>
            Loading the conversation…
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <ThreadBubble
                key={entry.id}
                entry={entry}
                onDecide={decide}
                onDelete={remove}
                deciding={deciding}
              />
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>

      <div className={styles.glassDivider + " shrink-0 border-t px-4 py-4"}>
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={reply}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter starts a new line.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!sending) send();
              }
            }}
            placeholder={"Reply to " + (staffName || "this employee") + "…"}
            aria-label="Your reply"
            className={
              styles.glassField +
              " min-h-[2.75rem] flex-1 resize-none px-3.5 py-2.5 text-sm"
            }
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !reply.trim()}
            className={
              styles.glassPrimary +
              " inline-flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
            }
            aria-label="Send reply"
          >
            {sending ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Send aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * The bell icon that lives in the dashboard header. It is a plain link now,
 * not a toggle: clicking it navigates to the full Messages page rather than
 * opening anything on top of the current view. Only the unread badge is
 * still live here.
 */
export function LeaveNotificationBell({
  enabled,
  intervalMs,
}: {
  enabled: boolean;
  intervalMs: number;
}) {
  const { pending, newSince } = useLeaveNotifications({ enabled, intervalMs });

  if (!enabled) return null;

  return (
    <Link
      href="/my-attendance/messages"
      aria-label={
        pending
          ? pending + " leave requests waiting for a decision"
          : "Leave requests and messages"
      }
      title="Leave requests and messages"
      className={
        styles.iconButton + " relative flex h-11 w-11 items-center justify-center"
      }
    >
      <Bell aria-hidden="true" className="h-4 w-4" />
      {pending ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold tabular-nums text-white">
          {pending > 99 ? "99+" : pending}
        </span>
      ) : null}
      {!pending && newSince ? (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-indigo-400" />
      ) : null}
    </Link>
  );
}

/**
 * The admin's leave inbox — its own full page, not a popup. Shows people
 * rather than requests: clicking a name opens that person's whole
 * conversation, where the admin can read the history, decide anything still
 * pending, and reply. On a wide screen the list and the open conversation sit
 * side by side, the way a real inbox does; on a phone, opening a conversation
 * replaces the list until you go back. Both panes re-read themselves on a
 * short interval, so a message that arrives while the page is open simply
 * appears.
 */
export function LeaveMessagesPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const role = String(user?.publicMetadata?.role || "").toUpperCase();
  const isAdmin = isAttendanceAdmin(role);

  const { pending, refresh, markSeen } = useLeaveNotifications({
    enabled: isAdmin,
    intervalMs: REFRESH_INTERVAL_MS,
  });
  const [threads, setThreads] = useState<LeaveThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<LeaveThreadSummary | null>(null);
  const listStamp = useRef("");

  const loadThreads = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/staff/leave-requests/threads", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not load the conversations");
      }
      const next: LeaveThreadSummary[] = Array.isArray(payload?.threads)
        ? payload.threads
        : [];
      // Only re-render when something actually moved.
      const stamp = next
        .map(
          (thread) =>
            thread.employeeId + ":" + (thread.lastAt || "") + ":" + thread.pending,
        )
        .join("|");
      if (stamp !== listStamp.current) {
        listStamp.current = stamp;
        setThreads(next);
      }
      setError("");
    } catch (caught) {
      if (!quiet) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load the conversations",
        );
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // The list keeps refreshing even with a conversation open — on a wide
  // screen both panes are visible together, so the list should never look
  // stale just because one thread is being read.
  useEffect(() => {
    if (!isAdmin) return undefined;

    loadThreads(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadThreads(true);
    }, LIVE_LIST_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadThreads(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isAdmin, loadThreads]);

  useEffect(() => {
    if (!isAdmin) return;
    markSeen();
  }, [isAdmin, markSeen]);

  const afterChange = () => {
    loadThreads(true);
    refresh();
  };

  if (isLoaded && !isAdmin) {
    return (
      <main className={styles.page}>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
          <span
            aria-hidden="true"
            className={styles.glassIconBadge + " flex h-14 w-14 items-center justify-center"}
          >
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className={styles.primary + " mt-4 text-xl font-bold"}>
            Messages unavailable
          </h1>
          <p className={styles.secondary + " mt-2 text-sm leading-6"}>
            This page is available to the Attendance Admin and Super Admin roles.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className="mx-auto flex h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="mb-4 flex shrink-0 items-center justify-between gap-4 sm:mb-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.push("/my-attendance")}
              className={
                styles.iconButton + " flex h-11 w-11 shrink-0 items-center justify-center"
              }
              aria-label="Back to attendance overview"
              title="Back to attendance overview"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span
              aria-hidden="true"
              className={
                styles.glassIconBadge + " flex h-11 w-11 shrink-0 items-center justify-center"
              }
            >
              <MessagesSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className={styles.primary + " truncate text-2xl font-bold sm:text-[1.7rem]"}>
                Messages
              </h1>
              <p className={styles.secondary + " mt-1 text-sm leading-5"}>
                {pending
                  ? pending + (pending === 1 ? " request" : " requests") + " waiting for a decision"
                  : "Nothing waiting for a decision"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadThreads(false)}
            disabled={loading}
            className={
              styles.iconButton + " flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
            }
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw
              aria-hidden="true"
              className={"h-4 w-4 motion-reduce:animate-none" + (loading ? " animate-spin" : "")}
            />
          </button>
        </header>

        {error ? (
          <p
            role="alert"
            className="mb-4 flex shrink-0 items-start gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-300"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        <section
          aria-label="Conversations"
          className={styles.glass + " flex min-h-0 flex-1 overflow-hidden lg:flex-row"}
        >
          <div
            className={
              (active ? "hidden lg:flex" : "flex") +
              " min-h-0 w-full flex-col lg:w-[22rem] lg:shrink-0 lg:border-r " +
              styles.glassDivider
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ThreadList threads={threads} loading={loading} onOpen={setActive} />
            </div>
          </div>

          <div className={(active ? "flex" : "hidden lg:flex") + " min-h-0 flex-1 flex-col"}>
            {active ? (
              <ThreadView
                employeeId={active.employeeId}
                staffName={active.staffName}
                onBack={() => {
                  setActive(null);
                  afterChange();
                }}
                onChanged={afterChange}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <span
                  aria-hidden="true"
                  className={styles.glassIconBadge + " flex h-14 w-14 items-center justify-center"}
                >
                  <MessagesSquare className="h-6 w-6" />
                </span>
                <p className={styles.primary + " text-sm font-bold"}>
                  Select a conversation
                </p>
                <p className={styles.muted + " max-w-xs text-xs leading-5"}>
                  Choose someone from the list to read their messages and decide
                  anything still pending.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
