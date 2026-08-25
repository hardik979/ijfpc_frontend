import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const trainer = await currentUser();
  if (!trainer) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  if (trainer.publicMetadata?.role !== ROLES.TRAINER) {
    return NextResponse.json(
      { error: "Trainer access required" },
      { status: 403 },
    );
  }

  const base = process.env.NEXT_PUBLIC_LMS_URL;
  const apiKey = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY;
  if (!base || !apiKey) {
    return NextResponse.json(
      { error: "LMS manual mock API is not configured" },
      { status: 503 },
    );
  }

  const search = request.nextUrl.searchParams.get("search") || "";
  const endpoint =
    base.replace(/\/$/, "") +
    "/api/student-info/manual-mocks/candidates" +
    (search ? "?search=" + encodeURIComponent(search) : "");

  const response = await fetch(endpoint, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
    },
  });
}
