"use client";

import { useEffect, useState } from "react";

export type AttendanceAccess = {
  /** The account is in the staff directory and can open /my-attendance. */
  linked: boolean;
  /** The matched employee, for showing whose attendance it is. */
  staff: { employeeId: number; name: string } | null;
  checking: boolean;
};

/**
 * Asks the LMS whether the signed-in account is linked to an employee record.
 *
 * Attendance is granted by the staff directory rather than by a Clerk role
 * (see the LMS routes/staffAttendance.routes.js), so a role check on the client
 * cannot answer this — only the server can. Dashboards use it to decide whether
 * to show an "Attendance" entry; the page itself is still guarded server-side.
 */
export function useAttendanceAccess(): AttendanceAccess {
  const [access, setAccess] = useState<AttendanceAccess>({
    linked: false,
    staff: null,
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/staff/attendance/access", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        setAccess({
          linked: Boolean(response.ok && payload?.linked),
          staff: payload?.staff ?? null,
          checking: false,
        });
      } catch {
        if (!cancelled) {
          setAccess({ linked: false, staff: null, checking: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return access;
}
