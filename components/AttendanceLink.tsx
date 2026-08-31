"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { CalendarCheck } from "lucide-react";
import { useAttendanceAccess } from "@/lib/hooks/useAttendanceAccess";

// Roles that open the attendance admin section instead of a personal record,
// so they are never offered the personal entry.
const ADMIN_ROLES = ["ATTENDANCE_ADMIN", "SUPER_ADMIN", "ADMIN"];

/**
 * Whether this account should be offered a personal attendance entry.
 *
 * Two conditions, and the server owns the important one:
 *   * the LMS says the account is linked to an employee record, so the link
 *     only appears when there is attendance behind it;
 *   * the role is not an admin one — /my-attendance opens the company-wide
 *     overview for Attendance Admin, Super Admin and Admin, not a personal
 *     record.
 *
 * `staff` names the matched employee, for dashboards that want to show whose
 * attendance the entry opens.
 */
export function useAttendanceEntry() {
  const { user, isLoaded } = useUser();
  const { linked, staff, checking } = useAttendanceAccess();

  const role = String(user?.publicMetadata?.role || "").toUpperCase();
  const isAdmin = ADMIN_ROLES.includes(role);

  return { visible: isLoaded && linked && !isAdmin, staff, checking };
}

/** Renders its children only for an account that gets a personal attendance entry. */
export function AttendanceGate({ children }: { children: React.ReactNode }) {
  const { visible } = useAttendanceEntry();
  return visible ? <>{children}</> : null;
}

/** "My attendance" entry for the role dashboards. */
export function AttendanceLink({
  className = "",
  label = "My attendance",
}: {
  className?: string;
  label?: string;
}) {
  const { visible } = useAttendanceEntry();

  if (!visible) return null;

  return (
    <Link
      href="/my-attendance"
      className={
        "inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 " +
        className
      }
    >
      <CalendarCheck aria-hidden="true" className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default AttendanceLink;
