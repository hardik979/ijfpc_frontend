import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Retired individual-roster endpoint.
 *
 * Attendance administrators are limited to aggregate attendance. Keep this
 * route as an explicit denial so older clients cannot use it as a fallback.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You are not signed in", code: "NO_SESSION" },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      error: "Individual staff attendance is not available for this role",
      code: "OVERVIEW_ONLY",
    },
    { status: 403 },
  );
}
