import { forwardToLms } from "@/lib/staffLeaveProxy";

/** Mark the notification panel as seen for this admin. */
export async function POST() {
  return forwardToLms({
    path: "/api/staff-attendance/leave-requests/seen",
    method: "POST",
    body: {},
  });
}
