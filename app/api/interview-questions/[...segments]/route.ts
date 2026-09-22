import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for the LMS interview question bank (/api/interview-questions/*).
 *
 * Forwards the caller's Clerk session token and nothing else. The LMS verifies
 * that token against this dashboard's Clerk instance and reads the caller's
 * role from Clerk itself, so nothing about who may read or upload is decided
 * here — this route only exists so the browser never talks to the LMS
 * directly (no CORS, no exposed base URL).
 *
 * JSON bodies are passed through as text; the multipart upload for /parse is
 * rebuilt into a fresh FormData so the boundary is set correctly.
 */
const SEGMENT = /^[A-Za-z0-9_.-]{1,64}$/;

const lmsUrl = (segments: string[], search: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  if (!base) return null;
  return (
    base.replace(/\/$/, "") +
    "/api/interview-questions/" +
    segments.map(encodeURIComponent).join("/") +
    search
  );
};

async function forward(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const { segments } = await context.params;
  if (!segments?.length || !segments.every((s) => SEGMENT.test(s))) {
    return NextResponse.json({ error: "Unsupported route" }, { status: 404 });
  }

  const endpoint = lmsUrl(segments, request.nextUrl.search);
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

  const headers: Record<string, string> = { Authorization: "Bearer " + token };
  let body: BodyInit | undefined;

  if (request.method !== "GET" && request.method !== "DELETE") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      let incoming: FormData;
      try {
        incoming = await request.formData();
      } catch {
        return NextResponse.json(
          { error: "Could not read that upload" },
          { status: 400 },
        );
      }
      const outgoing = new FormData();
      for (const [key, value] of incoming.entries()) {
        if (value instanceof File) outgoing.append(key, value, value.name);
        else outgoing.append(key, String(value));
      }
      body = outgoing; // fetch sets the multipart boundary itself
    } else {
      body = await request.text();
      headers["Content-Type"] = contentType || "application/json";
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[interview-questions] proxy failed:", error);
    return NextResponse.json(
      { error: "Could not reach the LMS" },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
