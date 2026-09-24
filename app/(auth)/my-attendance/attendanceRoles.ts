// Shared by AttendanceDashboard.tsx and LeaveNotifications.tsx — kept in its
// own module so the two can each import it without importing each other.
const ATTENDANCE_ADMIN_ROLE = "ATTENDANCE_ADMIN";
const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
const ADMIN_ROLE = "ADMIN";

// Roles that get the admin views. SUPER_ADMIN and ADMIN are console roles that
// open the attendance admin section from their own dashboards, and hold the
// same attendance scopes server-side (see the LMS lib/staffAttendancePolicy.js).
const ADMIN_ROLES = [ATTENDANCE_ADMIN_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE];

export const isAttendanceAdmin = (role: string) => ADMIN_ROLES.includes(role);
