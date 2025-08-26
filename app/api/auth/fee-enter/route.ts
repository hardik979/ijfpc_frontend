// app/api/auth/fee-enter/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password, next = "/fee-dashboard" } = await req.json();
  if (password !== process.env.FEE_DASHBOARD_PASSWORD) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set("fee_authed", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });
  return res;
}
