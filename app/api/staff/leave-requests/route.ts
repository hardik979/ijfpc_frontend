import { NextRequest } from "next/server";
import { forwardToLms } from "@/lib/staffLeaveProxy";

/** Submit a leave request or a message about leave. */
export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);

  return forwardToLms({
    path: "/api/staff-attendance/leave-requests",
    method: "POST",
    // Passed through as sent: the LMS validates and normalises every field,
    // and takes the employee identity from the session rather than the body.
    body: {
      kind: input?.kind,
      startDate: input?.startDate,
      endDate: input?.endDate,
      dayPart: input?.dayPart,
      message: input?.message,
      requestKey: input?.requestKey,
    },
  });
}

/** The admin queue. */
export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ["status", "employeeId", "limit", "before"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();

  return forwardToLms({
    path: "/api/staff-attendance/leave-requests" + (query ? "?" + query : ""),
  });
}
