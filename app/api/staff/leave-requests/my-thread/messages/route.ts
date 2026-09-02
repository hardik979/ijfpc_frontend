import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** The staff member's follow-up in their own thread. */
export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);

  return forwardToLms({
    path: "/api/staff-attendance/leave-requests/my-thread/messages",
    method: "POST",
    body: { message: input?.message },
  });
}
