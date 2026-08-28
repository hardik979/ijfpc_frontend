import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ROLES, type Role } from "@/lib/rbac";

const ALLOWED_ROLES: readonly Role[] = [ROLES.FOUNDER, ROLES.SUPER_ADMIN];

const authorize = async () => {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const role = (user.publicMetadata as { role?: Role })?.role;
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Fee dashboard access required" },
      { status: 403 },
    );
  }

  return null;
};

const isAllowedPath = (segments: string[]) =>
  segments.length === 1 && segments[0] === "summary" ||
  segments.length === 1 && segments[0] === "students" ||
  segments.length === 2 && segments[0] === "students" && /^[a-f\d]{24}$/i.test(segments[1]) ||
  segments.length === 2 &&
    segments[0] === "pre-placement" &&
    ["summary", "students"].includes(segments[1]) ||
  segments.length === 2 &&
    segments[0] === "post-placement" &&
    segments[1] === "offers";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
) {
  const authError = await authorize();
  if (authError) return authError;

  const { segments } = await context.params;
  if (!isAllowedPath(segments)) {
    return NextResponse.json({ error: "Unsupported fee dashboard route" }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_LMS_URL?.replace(/\/$/, "");
  const apiKey = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY;
  if (!base || !apiKey) {
    return NextResponse.json(
      { error: "LMS fee dashboard API is not configured" },
      { status: 503 },
    );
  }

  const apiPath = segments[0] === "pre-placement"
    ? `/api/preplacement/${segments.slice(1).join("/")}`
    : segments[0] === "post-placement"
      ? "/api/offers/list"
      : `/api/student-info/fee-dashboard/${segments.join("/")}`;
  const endpoint = `${base}${apiPath}${request.nextUrl.search}`;

  try {
    const response = await fetch(endpoint, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Fee dashboard proxy error:", error);
    return NextResponse.json(
      { error: "Unable to reach the LMS fee service" },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
) {
  const authError = await authorize();
  if (authError) return authError;

  const { segments } = await context.params;
  const isStatusUpdate =
    segments.length === 4 &&
    segments[0] === "pre-placement" &&
    segments[1] === "students" &&
    /^[a-f\d]{24}$/i.test(segments[2]) &&
    segments[3] === "status";
  if (!isStatusUpdate) {
    return NextResponse.json(
      { error: "Unsupported fee dashboard route" },
      { status: 404 },
    );
  }

  const base = process.env.NEXT_PUBLIC_LMS_URL?.replace(/\/$/, "");
  const apiKey = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY;
  if (!base || !apiKey) {
    return NextResponse.json(
      { error: "LMS fee dashboard API is not configured" },
      { status: 503 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${base}/api/preplacement/students/${segments[2]}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify(input),
        cache: "no-store",
      },
    );
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("Pre-placement status proxy error:", error);
    return NextResponse.json(
      { error: "Unable to reach the LMS pre-placement service" },
      { status: 502 },
    );
  }
}
