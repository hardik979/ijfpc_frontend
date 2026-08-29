import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * The logged-in staff member's own attendance.
 *
 * This handler forwards the caller's Clerk session token and nothing else — no
 * employee ID, name or email is passed along, so there is no field a client
 * could tamper with to reach another person's records. The LMS verifies that
 * token itself and resolves the employee from it.
 */
const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  // `month` only narrows the response; identity is never taken from the query.
  const month = request.nextUrl.searchParams.get("month") || "";
  const endpoint = lmsUrl(
    "/api/staff-attendance/me" +
      (month ? "?month=" + encodeURIComponent(month) : ""),
  );
  if (!endpoint) {
    return NextResponse.json(
      { error: "LMS API is not configured" },
      { status: 503 },
    );
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Could not read your session" },
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
    console.error("[staff-attendance] proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
