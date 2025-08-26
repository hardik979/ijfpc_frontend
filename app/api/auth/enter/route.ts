// app/api/auth/enter/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password, next = "/" } = await req.json();
  if (password !== process.env.SITE_PASSWORD) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set("site_authed", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
