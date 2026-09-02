import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** One staff member's whole conversation. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const { employeeId } = await context.params;

  return forwardToLms({
    path:
      "/api/staff-attendance/leave-requests/threads/" +
      encodeURIComponent(String(employeeId || "")),
  });
}
