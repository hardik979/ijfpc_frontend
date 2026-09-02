import { forwardToLms } from "@/lib/staffLeaveProxy";

/** One row per staff member who has written — the notification list. */
export async function GET() {
  return forwardToLms({
    path: "/api/staff-attendance/leave-requests/threads",
  });
}
