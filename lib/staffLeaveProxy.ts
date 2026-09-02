import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Shared plumbing for the leave-request proxies.
 *
 * Every one of them does the same three things: confirm there is a Clerk
 * session, forward that session's token to the LMS, and hand the LMS's answer
 * back untouched. No identity, employee ID or role is ever taken from the
 * browser or added here — the LMS resolves the caller from the token itself,
 * so these routes decide nothing about who may read or write.
 */
export const lmsUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  return base ? base.replace(/\/$/, "") + path : null;
};

type ForwardOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function forwardToLms({
  path,
  method = "GET",
  body,
}: ForwardOptions) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  const endpoint = lmsUrl(path);
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
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
    console.error("[staff-leave] proxy failed for " + path + ":", error);
    return NextResponse.json(
      { error: "Could not reach the leave service" },
      { status: 502 },
    );
  }
}
