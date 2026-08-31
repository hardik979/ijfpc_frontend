import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Attendance-admin proxy for one named staff member's history.
 * The LMS verifies the forwarded session and authorizes detail access.
 */
const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const { employeeId } = await context.params;
  const normalized = Number(decodeURIComponent(employeeId || "").trim());
  if (!Number.isInteger(normalized)) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 });
  }

  const month = request.nextUrl.searchParams.get("month") || "";
  const endpoint = lmsUrl(
    "/api/staff-attendance/staff/" +
      normalized +
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
    console.error("[staff-attendance] staff proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const { employeeId } = await context.params;
  const normalized = Number(decodeURIComponent(employeeId || "").trim());
  if (!Number.isInteger(normalized)) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 });
  }

  const input = await request.json().catch(() => null);
  const dateKey = String(input?.dateKey || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Invalid attendance date" }, { status: 400 });
  }
  if (
    typeof input?.exception !== "boolean" ||
    typeof input?.approvedLeave !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Invalid attendance adjustment" },
      { status: 400 },
    );
  }

  const month = request.nextUrl.searchParams.get("month") || "";
  const endpoint = lmsUrl(
    "/api/staff-attendance/staff/" +
      normalized +
      "/days/" +
      encodeURIComponent(dateKey) +
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
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exception: input.exception,
        approvedLeave: input.approvedLeave,
        // Mandatory for an exception; the LMS rejects the call without it.
        reason: String(input?.reason || ""),
      }),
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
    console.error("[staff-attendance] adjustment proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
