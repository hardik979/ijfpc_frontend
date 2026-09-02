export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN : "ADMIN",
  FEE_STAFF: "FEE_STAFF",
  PLACEMENT_STAFF: "PLACEMENT_STAFF",
  FOUNDER: "FOUNDER",
  INTERVIEWER: "INTERVIEWER",
  CALLING_STAFF: "CALLING_STAFF",
  STUDENT_MANAGEMENT: "STUDENT_MANAGEMENT",
  MANAGERS: "MANAGERS",
  TRAINER: "TRAINER",
  ATTENDANCE: "ATTENDANCE",
  ATTENDANCE_ADMIN: "ATTENDANCE_ADMIN"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Roles that may open Student 360.
 *
 * MANAGERS keeps exactly the access it has always had; the console roles are
 * added so the Admin Console can offer the same dashboard. This is the single
 * list the page layout and both Student 360 API routes check, so the three
 * cannot drift apart.
 */
export const STUDENT_360_ROLES: readonly Role[] = [
  ROLES.MANAGERS,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

export const canAccessStudent360 = (role?: unknown) =>
  STUDENT_360_ROLES.includes(String(role ?? "") as Role);

export const ACCESS: Record<string, readonly Role[]> = {
  // REAL URL PATHS (no /(auth))
  "/fee-dashboard": [ROLES.SUPER_ADMIN, ROLES.FOUNDER, ROLES.INTERVIEWER,ROLES.ADMIN],
  "/interview-reporting": [ROLES.SUPER_ADMIN, ROLES.INTERVIEWER],
  "/post-placement-student-creation": [
    ROLES.SUPER_ADMIN,
    ROLES.PLACEMENT_STAFF,
    ROLES?.ADMIN
  ],
  "/fee-dashboard/student-full-info": [ROLES.SUPER_ADMIN, ROLES.FOUNDER],
  "/fee-dashboard/studentOverview": [ROLES.SUPER_ADMIN, ROLES.FOUNDER],
  "/remaining-notification": [ROLES.SUPER_ADMIN, ROLES.FEE_STAFF], // adjust as needed
  "/founder": [ROLES.SUPER_ADMIN, ROLES.FOUNDER],
  "/admin": [ROLES.SUPER_ADMIN],
  "/students-call-reports": [
    ROLES.SUPER_ADMIN,
    ROLES.CALLING_STAFF,
    ROLES.FEE_STAFF,
    ROLES.STUDENT_MANAGEMENT,
  ],
  "/resume-builder": [ROLES.SUPER_ADMIN, ROLES.CALLING_STAFF],
  "/studentOverview":[ROLES.STUDENT_MANAGEMENT, ROLES?.ADMIN],
  "/student_360": STUDENT_360_ROLES,
  "/trainer-dashboard": [ROLES.TRAINER],
  "/student-full-info":[ROLES.STUDENT_MANAGEMENT, ROLES?.ADMIN],
  "/academic-results":[ROLES.STUDENT_MANAGEMENT, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  "/feedback-dash" : [ROLES?.FOUNDER, ROLES?.SUPER_ADMIN]
} as const;

export function isAllowed(pathname: string, role?: string) {
  if (!role) return false;

  for (const [prefix, roles] of Object.entries(ACCESS)) {
    if (pathname.startsWith(prefix)) {
      return roles.includes(role as Role);
    }
  }
  return true; // any logged-in user can access paths not listed
}
