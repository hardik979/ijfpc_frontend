"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaveThreadEntry } from "@/lib/hooks/useLeaveRequests";

/**
 * How often an open conversation and the list behind the bell re-read
 * themselves. Short enough that a reply lands while you are still looking at
 * the thread, and cheap enough to leave running: both endpoints return a small
 * JSON body off indexed queries.
 *
 * Everything pauses while the tab is hidden and catches up the moment it comes
 * back, so a laptop that slept does not wake into a burst of stale requests.
 */
export const LIVE_THREAD_MS = 5_000;
export const LIVE_LIST_MS = 8_000;
export const LIVE_BADGE_MS = 15_000;
/** The staff page is read for longer stretches, so it checks a little slower. */
export const LIVE_STAFF_THREAD_MS = 10_000;

/** Cheap identity for a thread: nothing changed unless this string changes. */
const fingerprint = (entries: LeaveThreadEntry[]) =>
  entries.length +
  ":" +
  (entries[entries.length - 1]?.id || "") +
  ":" +
  entries.map((entry) => entry.status || "").join("");

/**
 * Poll `url` on an interval, replacing state only when the answer actually
 * differs — so a reply appears by itself, while a draft being typed, the
 * scroll position and the rest of the panel stay exactly where they were.
 */
export function useLiveThread({
  url,
  intervalMs = LIVE_THREAD_MS,
  enabled = true,
}: {
  url: string;
  intervalMs?: number;
  enabled?: boolean;
}) {
  const [entries, setEntries] = useState<LeaveThreadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const stamp = useRef("");
  const alive = useRef(true);
  const inFlight = useRef(false);

  const read = useCallback(
    async (quiet: boolean) => {
      if (!enabled || inFlight.current) return;
      inFlight.current = true;
      if (!quiet) setLoading(true);

      try {
        const response = await fetch(url, { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Could not load the conversation");
        }
        if (!alive.current) return;

        const next: LeaveThreadEntry[] = Array.isArray(payload?.entries)
          ? payload.entries
          : [];
        const nextStamp = fingerprint(next);
        if (nextStamp !== stamp.current) {
          stamp.current = nextStamp;
          setEntries(next);
        }
        setError("");
      } catch (caught) {
        if (!alive.current) return;
        // A failed background poll keeps whatever is on screen; only the first,
        // visible load is worth an error message.
        if (!quiet) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load the conversation",
          );
        }
      } finally {
        inFlight.current = false;
        if (alive.current && !quiet) setLoading(false);
      }
    },
    [enabled, url],
  );

  useEffect(() => {
    alive.current = true;
    stamp.current = "";
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    read(false);

    const tick = () => {
      if (document.visibilityState === "visible") read(true);
    };
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") read(true);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      alive.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, intervalMs, read]);

  /** Adopt a thread returned by a POST, so a sent message shows immediately. */
  const adopt = useCallback((next: LeaveThreadEntry[]) => {
    stamp.current = fingerprint(next);
    setEntries(next);
  }, []);

  return { entries, loading, error, refresh: () => read(true), adopt };
}
