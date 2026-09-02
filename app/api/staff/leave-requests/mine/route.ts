import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** The signed-in staff member's own requests. */
export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit");

  return forwardToLms({
    path:
      "/api/staff-attendance/leave-requests/mine" +
      (limit ? "?limit=" + encodeURIComponent(limit) : ""),
  });
}
