import { forwardToLms } from "@/lib/staffLeaveProxy";

/** The signed-in staff member's own conversation. */
export async function GET() {
  return forwardToLms({
    path: "/api/staff-attendance/leave-requests/my-thread",
  });
}
