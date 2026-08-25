import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/rbac";

const lmsUrl = (path = "") => {
  const base = process.env.NEXT_PUBLIC_LMS_URL;
  if (!base) return null;
  return (
    base.replace(/\/$/, "") +
    "/api/student-info/manual-mocks" +
    path
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

const authorizeTrainer = async () => {
  const trainer = await currentUser();
  if (!trainer) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (trainer.publicMetadata?.role !== ROLES.TRAINER) {
    return { error: NextResponse.json({ error: "Trainer access required" }, { status: 403 }) };
  }
  return { trainer };
};

export async function GET(request: NextRequest) {
  const auth = await authorizeTrainer();
  if ("error" in auth) return auth.error;

  const endpoint = lmsUrl(
    "?month=" +
      encodeURIComponent(request.nextUrl.searchParams.get("month") || ""),
  );
  const apiKey = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY;
  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { error: "LMS manual mock API is not configured" },
      { status: 503 },
    );
  }

  const response = await fetch(endpoint, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  return forward(response);
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTrainer();
  if ("error" in auth) return auth.error;

  const endpoint = lmsUrl();
  const apiKey = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY;
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const trainer = auth.trainer;
  const trainerEmail =
    trainer.primaryEmailAddress?.emailAddress ||
    trainer.emailAddresses[0]?.emailAddress ||
    "";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      ...input,
      trainerClerkId: trainer.id,
      trainerName: trainer.fullName || trainerEmail || "IJF Trainer",
      trainerEmail,
    }),
    cache: "no-store",
  });
  return forward(response);
}
