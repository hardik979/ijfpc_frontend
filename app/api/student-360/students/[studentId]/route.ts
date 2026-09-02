import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { canAccessStudent360 } from "@/lib/rbac";

interface CourseRecord {
  _id?: unknown;
  title?: string;
}

interface PreplacementRecord {
  _id?: unknown;
  name?: string;
  clerkId?: string;
  email?: string;
  mobile?: string;
  address?: string;
  degree?: string;
  passoutYear?: number;
  mode?: string;
  digitalSignatureUrl?: string;
  fathersName?: string;
  courseName?: string;
  status?: string;
  zone?: string;
  zoneChangedAt?: string;
  terms?: string;
  totalFee?: number;
  totalReceived?: number;
  totalRefunded?: number;
  netCollected?: number;
  remainingFee?: number;
  payments?: Array<{
    amount?: number;
    date?: string | null;
    mode?: string;
    receiptNos?: string[];
    note?: string;
  }>;
  refunds?: Array<{
    amount?: number;
    date?: string | null;
    mode?: string;
    note?: string;
  }>;
  firstPaymentAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PostplacementRecord {
  _id?: unknown;
  clerkId?: string;
  email?: string;
  studentName?: string;
  offerDate?: string;
  joiningDate?: string;
  companyName?: string;
  location?: string;
  packageLPA?: number;
  totalPostPlacementFee?: number;
  remainingPrePlacementFee?: number;
  discount?: number;
  installments?: Array<{
    _id?: unknown;
    label?: string;
    amount?: number;
    date?: string;
    mode?: string;
    note?: string;
  }>;
  remainingFee?: number;
  remainingFeeNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface InterviewRecord {
  id?: unknown;
  studentName?: string | null;
  company?: string | null;
  round?: string | null;
  roundNumber?: number | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  scheduledAt?: string | null;
  estimatedDuration?: number | null;
  status?: string | null;
  adminReviewed?: boolean;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  notes?: string | null;
  flaggedIssue?: string | null;
  isMock?: boolean;
  mockInterviewer?: string | null;
  rescheduleCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface InterviewPayload {
  summary?: {
    total?: number;
    completed?: number;
    upcoming?: number;
    cancelled?: number;
    noShow?: number;
    mock?: number;
    real?: number;
  };
  interviews?: InterviewRecord[];
}

const stringId = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id?: unknown })._id ?? "");
  }
  return String(value ?? "");
};

const numericValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const r2SignatureUrl = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const isCloudflareR2 =
      url.protocol === "https:" && url.hostname.toLowerCase().endsWith(".r2.dev");
    return isCloudflareR2 ? url.toString() : null;
  } catch {
    return null;
  }
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const manager = await currentUser();
  const role = manager?.publicMetadata?.role;

  if (!manager) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }
  if (!canAccessStudent360(role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await context.params;
  const normalizedStudentId = decodeURIComponent(studentId || "").trim();
  const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL;

  if (!normalizedStudentId) {
    return NextResponse.json({ message: "Student ID is required" }, { status: 400 });
  }
  if (!lmsUrl) {
    return NextResponse.json(
      { message: "LMS service is not configured" },
      { status: 500 },
    );
  }

  try {
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
    };
    const query = new URLSearchParams({
      studentId: normalizedStudentId,
      page: "1",
      limit: "1",
    });

    const [studentResponse, coursesResponse, interviewsResponse] = await Promise.all([
      fetch(`${lmsUrl}/api/student-info/get-student-list?${query.toString()}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${lmsUrl}/api/courses/list`, {
        headers,
        cache: "no-store",
      }),
      fetch(
        `${lmsUrl}/api/student-info/student-interviews/${encodeURIComponent(normalizedStudentId)}`,
        {
          headers,
          cache: "no-store",
        },
      ),
    ]);
    const [studentPayload, coursesPayload, interviewsPayload] = await Promise.all([
      studentResponse.json(),
      coursesResponse.json(),
      interviewsResponse.json().catch(() => null),
    ]);

    if (!studentResponse.ok) {
      return NextResponse.json(
        { message: studentPayload?.message || "Could not load student" },
        { status: studentResponse.status },
      );
    }

    const student = Array.isArray(studentPayload?.data)
      ? studentPayload.data[0]
      : null;

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    let academicPayload: Record<string, unknown> | null = null;
    let academicSourceAvailable = true;

    if (student.clerkId) {
      try {
        const academicQuery = new URLSearchParams({
          clerkId: String(student.clerkId),
        });
        const academicResponse = await fetch(
          `${lmsUrl}/api/student-info/get-student-details?${academicQuery.toString()}`,
          {
            headers,
            cache: "no-store",
          },
        );
        const payload = await academicResponse.json().catch(() => null);
        academicSourceAvailable = academicResponse.ok;
        academicPayload =
          academicResponse.ok && payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : null;
      } catch (error) {
        academicSourceAvailable = false;
        console.error("Student 360 academics source error:", error);
      }
    }
    const purchasedCourseIds = Array.isArray(student.purchasedCourses)
      ? student.purchasedCourses.map(stringId).filter((id: string) => id.trim().length > 0)
      : [];

    const courseMap = new Map<string, string>();
    if (coursesResponse.ok && Array.isArray(coursesPayload)) {
      for (const course of coursesPayload as CourseRecord[]) {
        const id = stringId(course?._id);
        if (id && course?.title) courseMap.set(id, course.title);
      }
    }
    const courseNames = purchasedCourseIds
      .map((courseId: string) => courseMap.get(courseId))
      .filter((title: unknown): title is string => typeof title === "string");

    const preplacement = (student.preplacementProfile || null) as
      | PreplacementRecord
      | null;
    const postplacement = (student.postplacementFee || null) as
      | PostplacementRecord
      | null;
    const interviewData = (interviewsPayload || null) as InterviewPayload | null;
    const interviewRecords = interviewsResponse.ok && Array.isArray(interviewData?.interviews)
      ? interviewData.interviews
      : [];

    const latestBatchHistory = Array.isArray(student.batchHistory)
      ? student.batchHistory.at(-1)
      : null;
    const batch =
      student.batchName ||
      latestBatchHistory?.to ||
      latestBatchHistory?.batch ||
      null;

    const resolvedCourseNames = courseNames.length
      ? courseNames
      : preplacement?.courseName
        ? [preplacement.courseName]
        : [];

    return NextResponse.json({
      student: {
        id: String(student._id),
        clerkId: student.clerkId || null,
        fullName: student.fullName || preplacement?.name || null,
        email: student.email || preplacement?.email || null,
        mobile: preplacement?.mobile || student.phone || null,
        fathersName: preplacement?.fathersName || null,
        address: preplacement?.address || null,
        degree: preplacement?.degree || null,
        passoutYear: preplacement?.passoutYear || null,
        mode: preplacement?.mode || null,
        digitalSignatureUrl: r2SignatureUrl(preplacement?.digitalSignatureUrl),
        receiptNo: null,
        enrollmentDate: null,
        batchStartDate: null,
        counselorName: null,
        enrollmentId: student.enrollmentId || null,
        enrollmentNumber: student.enrollmentNumber || null,
        joinedMonth: student.joinedMonth || null,
        zone: student.zone || preplacement?.zone || "newly_enrolled",
        zoneChangedAt: student.zoneChangedAt || preplacement?.zoneChangedAt || null,
        status: student.isPlaced ? "Placed" : student.isPaused ? "Paused" : "Active",
        isPlaced: student.isPlaced === true,
        isPaused: student.isPaused === true,
        feePlan: student.feePlan || null,
        feeOverdue: student.feeOverdue === true,
        subscription: student.subscription || null,
        admissionForm: student.admissionForm,
        batch,
        courseNames: resolvedCourseNames,
        preplacementRecordId: preplacement?._id ? stringId(preplacement._id) : null,
        preplacementStatus: preplacement?.status || null,
        preplacementDueDate: preplacement?.dueDate || null,
        createdAt: preplacement?.createdAt || student.createdAt || null,
        updatedAt: preplacement?.updatedAt || student.updatedAt || null,
      },
      preplacementFee: preplacement
        ? {
            id: preplacement._id ? stringId(preplacement._id) : null,
            terms: preplacement.terms || null,
            status: preplacement.status || null,
            totalFee: numericValue(preplacement.totalFee),
            totalReceived: numericValue(preplacement.totalReceived),
            totalRefunded: numericValue(preplacement.totalRefunded),
            netCollected: numericValue(
              preplacement.netCollected ?? preplacement.totalReceived,
            ),
            remainingFee: numericValue(preplacement.remainingFee),
            dueDate: preplacement.dueDate || null,
            firstPaymentAt: preplacement.firstPaymentAt || null,
            payments: (preplacement.payments || []).map((payment) => ({
              amount: numericValue(payment.amount),
              date: payment.date || null,
              mode: payment.mode || null,
              receiptNos: Array.isArray(payment.receiptNos)
                ? payment.receiptNos.filter(Boolean)
                : [],
              note: payment.note || null,
            })),
            refunds: (preplacement.refunds || []).map((refund) => ({
              amount: numericValue(refund.amount),
              date: refund.date || null,
              mode: refund.mode || null,
              note: refund.note || null,
            })),
            updatedAt: preplacement.updatedAt || null,
          }
        : null,
      postplacementFee: postplacement
        ? {
            id: postplacement._id ? stringId(postplacement._id) : null,
            studentName: postplacement.studentName || null,
            companyName: postplacement.companyName || null,
            location: postplacement.location || null,
            offerDate: postplacement.offerDate || null,
            joiningDate: postplacement.joiningDate || null,
            packageLPA:
              postplacement.packageLPA === null ||
              postplacement.packageLPA === undefined
                ? null
                : numericValue(postplacement.packageLPA),
            totalFee: numericValue(postplacement.totalPostPlacementFee),
            carriedPreplacementFee: numericValue(
              postplacement.remainingPrePlacementFee,
            ),
            discount: numericValue(postplacement.discount),
            paid: (postplacement.installments || []).reduce(
              (sum, installment) => sum + numericValue(installment.amount),
              0,
            ),
            remainingFee: numericValue(postplacement.remainingFee),
            remainingFeeNote: postplacement.remainingFeeNote || null,
            installments: (postplacement.installments || []).map(
              (installment) => ({
                id: installment._id ? stringId(installment._id) : null,
                label: installment.label || "Installment",
                amount: numericValue(installment.amount),
                date: installment.date || null,
                mode: installment.mode || null,
                note: installment.note || null,
              }),
            ),
            updatedAt: postplacement.updatedAt || null,
          }
        : null,
      interviews: {
        summary: {
          total: numericValue(interviewData?.summary?.total),
          completed: numericValue(interviewData?.summary?.completed),
          upcoming: numericValue(interviewData?.summary?.upcoming),
          cancelled: numericValue(interviewData?.summary?.cancelled),
          noShow: numericValue(interviewData?.summary?.noShow),
          mock: numericValue(interviewData?.summary?.mock),
          real: numericValue(interviewData?.summary?.real),
        },
        records: interviewRecords.map((interview) => ({
          id: stringId(interview.id),
          studentName: interview.studentName || null,
          company: interview.company || null,
          round: interview.round || null,
          roundNumber: interview.roundNumber ?? null,
          scheduledDate: interview.scheduledDate || null,
          scheduledTime: interview.scheduledTime || null,
          scheduledAt: interview.scheduledAt || null,
          estimatedDuration: interview.estimatedDuration ?? null,
          status: interview.status || "pending_allocation",
          adminReviewed: interview.adminReviewed === true,
          actualStartTime: interview.actualStartTime || null,
          actualEndTime: interview.actualEndTime || null,
          notes: interview.notes || null,
          flaggedIssue: interview.flaggedIssue || null,
          isMock: interview.isMock === true,
          mockInterviewer: interview.mockInterviewer || null,
          rescheduleCount: numericValue(interview.rescheduleCount),
          createdAt: interview.createdAt || null,
          updatedAt: interview.updatedAt || null,
        })),
      },
      academics: academicPayload
        ? {
            dailyQuiz: academicPayload.academicDetails || null,
            aiMockInterviews: academicPayload.mockInterviewData || null,
            aiHrCalls: Array.isArray(academicPayload.callingAgentData)
              ? academicPayload.callingAgentData
              : [],
            realHrCalls: academicPayload.callRecordingData || null,
            megaTests: academicPayload.megaTestData || null,
          }
        : {
            dailyQuiz: null,
            aiMockInterviews: null,
            aiHrCalls: [],
            realHrCalls: null,
            megaTests: null,
          },
      meta: {
        preplacementSourceAvailable: true,
        preplacementRecordFound: Boolean(preplacement),
        preplacementMatchedBy: student.preplacementMatchedBy || null,
        postplacementSourceAvailable: true,
        postplacementRecordFound: Boolean(postplacement),
        postplacementMatchedBy: student.postplacementMatchedBy || null,
        interviewSourceAvailable: interviewsResponse.ok,
        academicSourceAvailable,
      },
    });
  } catch (error) {
    console.error("Student 360 profile error:", error);
    return NextResponse.json(
      { message: "Could not assemble the student profile" },
      { status: 500 },
    );
  }
}
