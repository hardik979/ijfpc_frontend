"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_BADGE_MS } from "@/lib/hooks/useLiveThread";

export type LeaveRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

export type LeaveRequest = {
  id: string;
  employeeId: number;
  staffName: string;
  kind: "leave" | "message";
  startDate: string | null;
  endDate: string | null;
  dayPart: "full" | "first_half" | "second_half";
  days: number;
  message: string;
  status: LeaveRequestStatus;
  decision: { byName: string; at: string; note: string } | null;
  appliedToAttendanceAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One person's row in the notification list. */
export type LeaveThreadSummary = {
  employeeId: number;
  staffName: string;
  lastAt: string | null;
  lastText: string;
  lastAuthor: "staff" | "admin";
  lastStaffAt: string | null;
  pending: number;
  requests: number;
  unread: boolean;
};

/** One line of a conversation: a request, a decision, or a plain reply. */
export type LeaveThreadEntry = {
  id: string;
  type: "request" | "decision" | "message";
  author: "staff" | "admin";
  authorName: string;
  body: string;
  createdAt: string;
  request?: LeaveRequest;
  status?: string;
};

const readError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error || fallback);
};

/**
 * The signed-in staff member's own requests.
 *
 * `reload` is returned rather than called on a timer: this list only changes
 * when the person themselves submits or withdraws something, so there is
 * nothing to poll for.
 */
export function useMyLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/leave-requests/mine", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw await readError(response, "Could not load your requests");
      }
      const payload = await response.json();
      if (!alive.current) return;
      setRequests(Array.isArray(payload?.requests) ? payload.requests : []);
      setError("");
    } catch (caught) {
      if (!alive.current) return;
      setError(
        caught instanceof Error ? caught.message : "Could not load your requests",
      );
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { requests, loading, error, reload };
}

/**
 * The admin badge.
 *
 * Polled on the same cadence as the attendance dashboard, and refreshed when
 * the tab comes back to the front, so a stale badge is never left behind after
 * the laptop wakes up. `pending` is the count that matters; `newSince` is what
 * arrived since this admin last opened the panel.
 */
export function useLeaveNotifications({
  enabled,
  intervalMs,
}: {
  enabled: boolean;
  intervalMs: number;
}) {
  const [pending, setPending] = useState(0);
  const [newSince, setNewSince] = useState(0);
  const [checked, setChecked] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch("/api/staff/leave-requests/summary", {
        cache: "no-store",
      });
      if (!response.ok) return; // a badge is never worth an error banner
      const payload = await response.json();
      if (!alive.current) return;
      setPending(Number(payload?.pending) || 0);
      setNewSince(Number(payload?.newSince) || 0);
      setChecked(true);
    } catch {
      // Offline or the LMS is down: keep the last known counts.
    }
  }, [enabled]);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return undefined;

    refresh();
    // The badge is what tells an admin something arrived while they were
    // working elsewhere on the page, so it checks more often than the
    // attendance figures around it.
    const timer = window.setInterval(
      refresh,
      Math.min(intervalMs, LIVE_BADGE_MS),
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      alive.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, intervalMs, refresh]);

  const markSeen = useCallback(async () => {
    try {
      await fetch("/api/staff/leave-requests/seen", { method: "POST" });
      if (alive.current) setNewSince(0);
    } catch {
      // Losing the marker only means the "new" dot lingers; not worth surfacing.
    }
  }, []);

  return { pending, newSince, checked, refresh, markSeen };
}
