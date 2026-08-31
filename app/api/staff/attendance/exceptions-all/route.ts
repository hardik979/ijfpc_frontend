import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Apply one attendance exception to every active staff member for one date.
 *
 * Forwards the caller's Clerk session and the two fields the LMS needs; the
 * LMS authorizes the adjustment scope itself and enforces the mandatory
 * reason, so nothing here decides who may write.
 */
const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const input = await request.json().catch(() => null);
  const dateKey = String(input?.dateKey || "").trim();
  const reason = String(input?.reason || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json(
      { error: "Invalid attendance date" },
      { status: 400 },
    );
  }
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required", code: "REASON_REQUIRED" },
      { status: 400 },
    );
  }

  const endpoint = lmsUrl("/api/staff-attendance/exceptions/all");
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
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dateKey, reason }),
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
    console.error("[staff-attendance] bulk exception proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
