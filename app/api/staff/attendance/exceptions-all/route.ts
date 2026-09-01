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

const BULK_EXCEPTION_TARGETS = new Set(["all", "half", "absent"]);

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
  const targetStatus = String(input?.targetStatus || "all").trim();

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
  if (!BULK_EXCEPTION_TARGETS.has(targetStatus)) {
    return NextResponse.json(
      { error: "Invalid exception target" },
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
      body: JSON.stringify({ dateKey, reason, targetStatus }),
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

/** Remove bulk-applied exceptions for one date, preserving all other decisions. */
export async function DELETE(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const dateKey = String(
    request.nextUrl.searchParams.get("dateKey") || "",
  ).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json(
      { error: "Invalid attendance date" },
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

  const params = new URLSearchParams({ dateKey });
  if (request.nextUrl.searchParams.get("confirmLegacy") === "true") {
    params.set("confirmLegacy", "true");
  }
  // Clears every exception on the date, individually applied ones included.
  if (request.nextUrl.searchParams.get("scope") === "all") {
    params.set("scope", "all");
  }

  try {
    const response = await fetch(endpoint + "?" + params.toString(), {
      method: "DELETE",
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
    console.error("[staff-attendance] bulk exception removal proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the attendance service" },
      { status: 502 },
    );
  }
}
