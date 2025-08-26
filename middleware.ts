// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/enter", // site gate form
  "/api/auth/enter", // site gate submit
  "/fee-dashboard/enter", // fee gate form
  "/api/auth/fee-enter", // fee gate submit
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow public assets & gate pages
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const siteCookie = req.cookies.get("site_authed")?.value === "true";

  // Gate #1: whole site
  if (!siteCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/enter";
    url.searchParams.set("next", pathname); // to return after login
    return NextResponse.redirect(url);
  }

  // Gate #2: fee-dashboard subtree
  if (pathname.startsWith("/fee-dashboard")) {
    const feeCookie = req.cookies.get("fee_authed")?.value === "true";
    if (!feeCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/fee-dashboard/enter";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/health).*)", // protect everything except what you explicitly exclude
  ],
};
