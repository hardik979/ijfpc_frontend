import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** Withdraw your own pending request. */
export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return forwardToLms({
    path:
      "/api/staff-attendance/leave-requests/" +
      encodeURIComponent(String(id || "")) +
      "/cancel",
    method: "PATCH",
    body: {},
  });
}
