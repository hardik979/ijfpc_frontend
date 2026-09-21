import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Attendance-admin proxy for one mapped student's history — the student-side
 * twin of the staff/[employeeId] route. The LMS verifies the forwarded
 * session and authorizes detail access (same DETAIL scope as staff).
 */
const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clerkId: string }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const { clerkId } = await context.params;
  const normalized = decodeURIComponent(clerkId || "").trim();
  if (!normalized) {
    return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
  }

  const month = request.nextUrl.searchParams.get("month") || "";
  const endpoint = lmsUrl(
    "/api/staff-attendance/students/" +
      encodeURIComponent(normalized) +
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
    console.error("[staff-attendance] student proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
