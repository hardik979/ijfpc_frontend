import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/rbac";

const lmsUrl = (scheduleId: string) => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  if (!base) return null;
  return (
    base.replace(/\/$/, "") +
    "/api/student-info/manual-mocks/" +
    encodeURIComponent(scheduleId)
  );
};

const forward = async (response: Response) => {
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
    },
  });
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ scheduleId: string }> },
) {
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

  const { scheduleId } = await context.params;
  const normalizedScheduleId = decodeURIComponent(scheduleId || "").trim();
  const endpoint = lmsUrl(normalizedScheduleId);
  const apiKey = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY;

  if (!normalizedScheduleId) {
    return NextResponse.json(
      { error: "Manual mock schedule ID is required" },
      { status: 400 },
    );
  }
  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { error: "LMS manual mock API is not configured" },
      { status: 503 },
    );
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const trainerEmail =
    trainer.primaryEmailAddress?.emailAddress ||
    trainer.emailAddresses[0]?.emailAddress ||
    "";
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      ...input,
      trainerClerkId: trainer.id,
      trainerName: trainer.fullName || trainerEmail || "IJF Trainer",
    }),
    cache: "no-store",
  });

  return forward(response);
}

