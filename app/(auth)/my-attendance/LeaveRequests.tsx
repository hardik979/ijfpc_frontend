"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  MessageSquarePlus,
  MessagesSquare,
  Send,
  X,
} from "lucide-react";
import styles from "./attendance.module.css";
import {
  useMyLeaveRequests,
  type LeaveRequest,
  type LeaveRequestStatus,
} from "@/lib/hooks/useLeaveRequests";
import { LIVE_STAFF_THREAD_MS, useLiveThread } from "@/lib/hooks/useLiveThread";

const MAX_MESSAGE_LENGTH = 2000;

const STATUS_STYLE: Record<LeaveRequestStatus, string> = {
  pending:
    "border-amber-300/70 bg-amber-50/80 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  approved:
    "border-emerald-300/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
  declined:
    "border-rose-300/70 bg-rose-50/80 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300",
  cancelled:
    "border-slate-300/70 bg-slate-50/80 text-slate-600 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-300",
  closed:
    "border-sky-300/70 bg-sky-50/80 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300",
};

const STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  pending: "Waiting for a decision",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Withdrawn",
  closed: "Sent",
};

const DAY_PART_LABEL: Record<string, string> = {
  full: "Full day",
  first_half: "First half",
  second_half: "Second half",
};

const pad = (value: number) => String(value).padStart(2, "0");

export const todayKey = () => {
  const now = new Date();
  return (
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate())
  );
};

const formatDate = (dateKey: string) =>
  new Date(dateKey + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

/** A key that makes a resubmitted request the same request, not a second one. */
const newRequestKey = () => {
  const globalCrypto =
    typeof crypto !== "undefined" ? (crypto as Crypto) : undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return "rk-" + Date.now() + "-" + Math.random().toString(16).slice(2);
};

export function LeaveRequestDialog({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [kind, setKind] = useState<"leave" | "message">("leave");
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(todayKey);
  const [dayPart, setDayPart] = useState("full");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // Held for the life of one open dialog, so a double-click or a retry after a
  // dropped response cannot create two requests.
  const requestKey = useRef(newRequestKey());
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const singleDay = kind === "leave" && startDate === endDate;

  useEffect(() => {
    if (!open) return undefined;

    requestKey.current = newRequestKey();
    setError("");
    setDone(false);
    const focusTimer = window.setTimeout(() => messageRef.current?.focus(), 60);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
    };
    // `saving` is read inside the handler and must stay current.
  }, [open, onClose, saving]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Write a short message so the admin knows what you need.");
      messageRef.current?.focus();
      return;
    }
    if (kind === "leave" && endDate < startDate) {
      setError("The last day cannot be before the first day.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/staff/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: trimmed,
          requestKey: requestKey.current,
          ...(kind === "leave"
            ? {
                startDate,
                endDate,
                dayPart: singleDay ? dayPart : "full",
              }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Could not send your request");
      }

      setDone(true);
      setMessage("");
      onSubmitted();
      window.setTimeout(onClose, 900);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send your request",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-dialog-title"
      className={
        styles.glassOverlay +
        " fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      }
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className={styles.glassPanel + " w-full max-w-xl"}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={
            styles.glassDivider +
            " flex items-start justify-between gap-4 border-b px-5 py-5"
          }
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={
                styles.glassIconBadge +
                " flex h-11 w-11 items-center justify-center"
              }
            >
              <MessageSquarePlus className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="leave-dialog-title"
                className={styles.primary + " text-base font-bold"}
              >
                Apply for leave
              </h2>
              <p className={styles.muted + " mt-0.5 text-xs"}>
                Your request goes straight to the attendance admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={
              styles.glassChip +
              " flex h-9 w-9 shrink-0 items-center justify-center disabled:opacity-50"
            }
            aria-label="Close"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div
            role="radiogroup"
            aria-label="What are you sending?"
            className="mb-4 flex gap-2"
          >
            {[
              { value: "leave" as const, label: "Leave request" },
              { value: "message" as const, label: "Just a message" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={kind === option.value}
                onClick={() => setKind(option.value)}
                className={
                  (kind === option.value
                    ? styles.glassChip + " " + styles.glassChipActive
                    : styles.glassChip) +
                  " inline-flex min-h-10 items-center px-4 text-sm font-semibold"
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          {kind === "leave" ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="leave-start"
                  className={styles.secondary + " block text-xs font-semibold"}
                >
                  First day <span className="text-rose-500">*</span>
                </label>
                <input
                  id="leave-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    const next = event.target.value;
                    setStartDate(next);
                    if (endDate < next) setEndDate(next);
                  }}
                  className={
                    styles.glassField +
                    " mt-1.5 h-11 w-full px-3 text-sm font-semibold"
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="leave-end"
                  className={styles.secondary + " block text-xs font-semibold"}
                >
                  Last day <span className="text-rose-500">*</span>
                </label>
                <input
                  id="leave-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={
                    styles.glassField +
                    " mt-1.5 h-11 w-full px-3 text-sm font-semibold"
                  }
                />
              </div>

              {singleDay ? (
                <div className="sm:col-span-2">
                  <span
                    className={styles.secondary + " block text-xs font-semibold"}
                  >
                    How much of the day?
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {Object.entries(DAY_PART_LABEL).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={dayPart === value}
                        onClick={() => setDayPart(value)}
                        className={
                          (dayPart === value
                            ? styles.glassChip + " " + styles.glassChipActive
                            : styles.glassChip) +
                          " inline-flex min-h-9 items-center px-3.5 text-xs font-semibold"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="leave-message"
                className={styles.secondary + " block text-xs font-semibold"}
              >
                Message <span className="text-rose-500">*</span>
              </label>
              <span className={styles.muted + " text-[0.7rem] tabular-nums"}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <textarea
              id="leave-message"
              ref={messageRef}
              rows={4}
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                kind === "leave"
                  ? "Why do you need these days off?"
                  : "What would you like the admin to know?"
              }
              className={
                styles.glassField + " mt-1.5 w-full resize-y px-3.5 py-3 text-sm"
              }
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 text-xs font-semibold text-rose-500"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
          {done ? (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              Sent. The admin will see it on their dashboard.
            </p>
          ) : null}
        </div>

        <div
          className={
            styles.glassDivider +
            " flex items-center justify-end gap-2 border-t px-5 py-4"
          }
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={
              styles.glassChip +
              " inline-flex min-h-11 items-center px-4 text-sm font-semibold disabled:opacity-50"
            }
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || done}
            className={
              styles.glassPrimary +
              " inline-flex min-h-11 items-center gap-2 px-5 text-sm font-semibold"
            }
          >
            {saving ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Send aria-hidden="true" className="h-4 w-4" />
            )}
            Send to admin
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveRequestRow({
  request,
  onWithdraw,
  withdrawing,
}: {
  request: LeaveRequest;
  onWithdraw: (id: string) => void;
  withdrawing: boolean;
}) {
  const dates = request.startDate
    ? formatDate(request.startDate) +
      (request.endDate && request.endDate !== request.startDate
        ? " – " + formatDate(request.endDate)
        : "") +
      (request.days > 1 ? " · " + request.days + " days" : "")
    : "Message";

  return (
    <li className={styles.divider + " border-b p-4 last:border-b-0"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={styles.primary + " text-sm font-semibold"}>{dates}</p>
          <p className={styles.muted + " mt-0.5 text-xs"}>
            Sent {formatWhen(request.createdAt)}
            {request.dayPart !== "full"
              ? " · " + DAY_PART_LABEL[request.dayPart]
              : ""}
          </p>
        </div>
        <span
          className={
            "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold " +
            STATUS_STYLE[request.status]
          }
        >
          {STATUS_LABEL[request.status]}
        </span>
      </div>

      <p className={styles.secondary + " mt-2 whitespace-pre-line text-sm leading-6"}>
        {request.message}
      </p>

      {request.decision ? (
        <div className={styles.surfaceMuted + " mt-3 rounded-lg px-3 py-2"}>
          <p className={styles.muted + " text-[0.7rem] font-semibold"}>
            {request.decision.byName || "Admin"} ·{" "}
            {formatWhen(request.decision.at)}
          </p>
          {request.decision.note ? (
            <p className={styles.secondary + " mt-1 whitespace-pre-line text-xs leading-5"}>
              {request.decision.note}
            </p>
          ) : null}
        </div>
      ) : null}

      {request.status === "pending" ? (
        <button
          type="button"
          onClick={() => onWithdraw(request.id)}
          disabled={withdrawing}
          className={
            styles.control +
            " mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-60"
          }
        >
          {withdrawing ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
            />
          ) : null}
          Withdraw
        </button>
      ) : null}
    </li>
  );
}

/** The staff member's own request history, under their attendance. */
export function MyLeaveRequests({
  requests,
  loading,
  error,
  onChanged,
}: {
  requests: LeaveRequest[];
  loading: boolean;
  error: string;
  onChanged: () => void;
}) {
  const [withdrawingId, setWithdrawingId] = useState("");
  const [actionError, setActionError] = useState("");

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );

  const withdraw = async (id: string) => {
    setWithdrawingId(id);
    setActionError("");
    try {
      const response = await fetch("/api/staff/leave-requests/" + id + "/cancel", {
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not withdraw that request");
      }
      onChanged();
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "Could not withdraw that request",
      );
    } finally {
      setWithdrawingId("");
    }
  };

  if (!loading && !requests.length && !error) return null;

  return (
    <section className={styles.glass + " mt-4 overflow-hidden"}>
      <div
        className={
          styles.divider +
          " flex items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5"
        }
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={styles.metricIcon + " " + styles.metricNeutral + " h-9 w-9"}
          >
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <h2 className={styles.primary + " text-sm font-bold"}>
              My leave requests
            </h2>
            <p className={styles.muted + " mt-0.5 text-xs"}>
              {pendingCount
                ? pendingCount + " waiting for a decision"
                : "Everything has been answered"}
            </p>
          </div>
        </div>
      </div>

      {error || actionError ? (
        <p role="alert" className="px-4 py-3 text-xs font-semibold text-rose-500">
          {error || actionError}
        </p>
      ) : null}

      <ul>
        {requests.map((request) => (
          <LeaveRequestRow
            key={request.id}
            request={request}
            onWithdraw={withdraw}
            withdrawing={withdrawingId === request.id}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * The staff member's side of the same conversation the admin sees.
 *
 * Without this the admin's reply would land somewhere the person who asked can
 * never read, so it is fetched on mount and after anything they send.
 */
export function MyLeaveConversation({ reloadKey }: { reloadKey: number }) {
  // Polled while the page is open, so the admin's reply arrives without a
  // refresh; the draft below is separate state and is never disturbed by it.
  const { entries, loading, error, adopt, refresh } = useLiveThread({
    url: "/api/staff/leave-requests/my-thread",
    intervalMs: LIVE_STAFF_THREAD_MS,
  });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const seen = useRef(0);

  // Anything the person sends elsewhere on the page (a new request, a
  // withdrawal) should show up here too.
  useEffect(() => {
    if (reloadKey !== seen.current) {
      seen.current = reloadKey;
      refresh();
    }
  }, [reloadKey, refresh]);

  useEffect(() => {
    if (entries.length) {
      endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [entries]);

  const send = async () => {
    const body = message.trim();
    if (!body) return;

    setSending(true);
    setSendError("");
    try {
      const response = await fetch(
        "/api/staff/leave-requests/my-thread/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: body }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not send your message");
      }
      if (Array.isArray(payload?.entries)) adopt(payload.entries);
      setMessage("");
    } catch (caught) {
      setSendError(
        caught instanceof Error ? caught.message : "Could not send your message",
      );
    } finally {
      setSending(false);
    }
  };

  if (loading && !entries.length) return null;
  if (!loading && !entries.length && !error) return null;

  const shown = error || sendError;

  return (
    <section className={styles.glass + " mt-4 overflow-hidden"}>
      <div
        className={
          styles.divider + " flex items-center gap-3 border-b px-4 py-3.5 sm:px-5"
        }
      >
        <span
          aria-hidden="true"
          className={styles.metricIcon + " " + styles.metricAccent + " h-9 w-9"}
        >
          <MessagesSquare className="h-4 w-4" />
        </span>
        <div>
          <h2 className={styles.primary + " text-sm font-bold"}>
            Conversation with the admin
          </h2>
          <p className={styles.muted + " mt-0.5 text-xs"}>
            Replies appear here as they are sent.
          </p>
        </div>
      </div>

      {shown ? (
        <p role="alert" className="px-4 py-2.5 text-xs font-semibold text-rose-500">
          {shown}
        </p>
      ) : null}

      <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto px-4 py-4">
        {entries.map((entry) => {
          const mine = entry.author === "staff";
          return (
            <li
              key={entry.id}
              className={"flex " + (mine ? "justify-end" : "justify-start")}
            >
              <div className="max-w-[85%]">
                <div
                  className={
                    "rounded-2xl px-3.5 py-2.5 text-sm leading-6 " +
                    (mine
                      ? "bg-indigo-600 text-white"
                      : styles.surfaceMuted + " " + styles.primary)
                  }
                >
                  <p className="whitespace-pre-line break-words">{entry.body}</p>
                </div>
                <p
                  className={
                    styles.muted +
                    " mt-1 text-[0.68rem] " +
                    (mine ? "text-right" : "")
                  }
                >
                  {mine ? "You" : entry.authorName || "Admin"} ·{" "}
                  {formatWhen(entry.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ul>

      <div className={styles.divider + " border-t px-4 py-3"}>
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!sending) send();
              }
            }}
            placeholder="Write a message to the admin…"
            aria-label="Message to the admin"
            className={
              styles.control +
              " min-h-[2.75rem] flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
            }
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !message.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
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
    </section>
  );
}
