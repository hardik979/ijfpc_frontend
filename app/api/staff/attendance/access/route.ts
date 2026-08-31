import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Whether the signed-in account is linked to an employee record.
 *
 * Dashboards call this to decide whether to offer an "Attendance" link. Like
 * the /me proxy it forwards the Clerk session token and nothing else — the LMS
 * resolves the employee itself, so there is no field a client could tamper
 * with. The answer carries no attendance data, only the employee's own name
 * and ID.
 */
const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { linked: false, code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const endpoint = lmsUrl("/api/staff-attendance/access");
  if (!endpoint) {
    return NextResponse.json(
      { linked: false, error: "LMS API is not configured" },
      { status: 503 },
    );
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { linked: false, code: "NO_SESSION" },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[staff-attendance] access proxy failed:", error);
    return NextResponse.json(
      { linked: false, error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
