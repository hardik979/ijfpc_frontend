export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  FEE_STAFF: "FEE_STAFF",
  PLACEMENT_STAFF: "PLACEMENT_STAFF",
  FOUNDER: "FOUNDER",
  INTERVIEWER: "INTERVIEWER",
  CALLING_STAFF: "CALLING_STAFF",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ACCESS: Record<string, readonly Role[]> = {
  // REAL URL PATHS (no /(auth))
  "/fee-dashboard": [ROLES.SUPER_ADMIN, ROLES.FOUNDER, ROLES.INTERVIEWER],
  "/interview-reporting": [ROLES.SUPER_ADMIN, ROLES.INTERVIEWER],
  "/post-placement-student-creation": [
    ROLES.SUPER_ADMIN,
    ROLES.PLACEMENT_STAFF,
  ],
  "/fee-dashboard/student-full-info": [ROLES.SUPER_ADMIN, ROLES.FOUNDER],
  "/fee-dashboard/studentOverview": [ROLES.SUPER_ADMIN, ROLES.FOUNDER],
  "/remaining-notification": [ROLES.SUPER_ADMIN, ROLES.FEE_STAFF], // adjust as needed
  "/founder": [ROLES.SUPER_ADMIN, ROLES.FOUNDER],
  "/admin": [ROLES.SUPER_ADMIN],
  "/students-call-reports": [ROLES.SUPER_ADMIN, ROLES.CALLING_STAFF],
  "/resume-builder": [ROLES.SUPER_ADMIN, ROLES.CALLING_STAFF],
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
