import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** The admin's reply into one staff member's thread. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const { employeeId } = await context.params;
  const input = await request.json().catch(() => null);

  return forwardToLms({
    path:
      "/api/staff-attendance/leave-requests/threads/" +
      encodeURIComponent(String(employeeId || "")) +
      "/messages",
    method: "POST",
    body: { message: input?.message },
  });
}
