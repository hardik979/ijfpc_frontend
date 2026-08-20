import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ROLES } from "@/lib/rbac";

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string; attemptId: string }> },
) {
  const manager = await currentUser();
  const role = manager?.publicMetadata?.role;

  if (!manager) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }
  if (role !== ROLES.MANAGERS) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { studentId, attemptId } = await context.params;
  const normalizedStudentId = decodeURIComponent(studentId || "").trim();
  const normalizedAttemptId = decodeURIComponent(attemptId || "").trim();
  const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL;

  if (!normalizedStudentId || !normalizedAttemptId) {
    return NextResponse.json(
      { message: "Student ID and quiz attempt ID are required" },
      { status: 400 },
    );
  }
  if (!lmsUrl) {
    return NextResponse.json(
      { message: "LMS service is not configured" },
      { status: 500 },
    );
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
  };

  try {
    // Resolve the selected Student 360 record server-side so a client cannot
    // substitute another Clerk ID when requesting an attempt.
    const studentQuery = new URLSearchParams({
      studentId: normalizedStudentId,
      page: "1",
      limit: "1",
    });
    const studentResponse = await fetch(
      `${lmsUrl}/api/student-info/get-student-list?${studentQuery.toString()}`,
      { headers, cache: "no-store" },
    );
    const studentPayload = await studentResponse.json().catch(() => null);

    if (!studentResponse.ok) {
      return NextResponse.json(
        { message: studentPayload?.message || "Could not resolve student" },
        { status: studentResponse.status },
      );
    }

    const student = Array.isArray(studentPayload?.data)
      ? studentPayload.data[0]
      : null;
    const clerkId = String(student?.clerkId || "").trim();

    if (!student || !clerkId) {
      return NextResponse.json(
        { message: "This student does not have a linked LMS Clerk ID" },
        { status: 404 },
      );
    }

    const detailQuery = new URLSearchParams({ clerkId });
    const detailResponse = await fetch(
      `${lmsUrl}/api/student-info/student-quiz-attempts/${encodeURIComponent(normalizedAttemptId)}?${detailQuery.toString()}`,
      { headers, cache: "no-store" },
    );
    const detailPayload = await detailResponse.json().catch(() => null);

    if (!detailResponse.ok) {
      return NextResponse.json(
        { message: detailPayload?.message || "Could not load quiz attempt" },
        { status: detailResponse.status },
      );
    }

    return NextResponse.json(detailPayload);
  } catch (error) {
    console.error("Student 360 quiz drill-down error:", error);
    return NextResponse.json(
      { message: "Could not load quiz attempt details" },
      { status: 500 },
    );
  }
}
