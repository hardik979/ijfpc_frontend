import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Sets or clears one staff member's last working date. Same session/role
 * gate as the rest of the attendance-admin API — the LMS itself enforces the
 * ADJUSTMENT scope, the same authority a per-day exception/leave decision
 * requires.
 */
const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

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
  const endpoint = lmsUrl(
    "/api/staff-attendance/staff/" + normalized + "/last-working-date",
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
      body: JSON.stringify({ lastWorkingDate: input?.lastWorkingDate ?? null }),
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
    console.error("[staff-attendance] last-working-date proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
