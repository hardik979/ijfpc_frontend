import { forwardToLms } from "@/lib/staffLeaveProxy";

/** Badge counts for the admin notification bell. */
export async function GET() {
  return forwardToLms({
    path: "/api/staff-attendance/leave-requests/summary",
  });
}
