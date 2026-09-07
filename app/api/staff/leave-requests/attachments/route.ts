import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { lmsUrl } from "@/lib/staffLeaveProxy";

/**
 * Pass one image through to the LMS, which stores it in Cloudflare R2.
 *
 * Multipart rather than JSON, so the file is rebuilt into a fresh FormData and
 * forwarded rather than parsed here. Nothing about the upload is decided in
 * this route: the LMS checks the session, the file type and the size, and it
 * derives the object key from the employee it resolves from the token.
 */
export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const endpoint = lmsUrl("/api/staff-attendance/leave-requests/attachments");
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

  let file: File | null = null;
  try {
    const incoming = await request.formData();
    const candidate = incoming.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json(
      { error: "Could not read that upload" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "Choose an image first", code: "NO_FILE" },
      { status: 400 },
    );
  }

  try {
    const outgoing = new FormData();
    outgoing.append("file", file, file.name);

    const response = await fetch(endpoint, {
      method: "POST",
      // No Content-Type header: fetch sets the multipart boundary itself.
      headers: { Authorization: "Bearer " + token },
      body: outgoing,
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
    console.error("[staff-leave] attachment proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the leave service" },
      { status: 502 },
    );
  }
}
