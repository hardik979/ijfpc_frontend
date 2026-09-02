import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** Approve or decline one request. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const input = await request.json().catch(() => null);

  return forwardToLms({
    path:
      "/api/staff-attendance/leave-requests/" +
      encodeURIComponent(String(id || "")),
    method: "PATCH",
    body: {
      status: input?.status,
      note: input?.note,
      applyToAttendance: input?.applyToAttendance === true,
    },
  });
}
