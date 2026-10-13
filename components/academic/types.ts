// Response of GET /api/admin/get-acadmic-participation (the `data` field).

/** Present / absent split of the days a student was expected to show up. */
export interface Participation {
  expectedDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number | null;
  presentDates: string[];
  absentDates: string[];
}

export interface DailyQuizParticipation extends Participation {
  compulsory: boolean;
  quizzesUploaded: number;
  quizzesAttempted: number;
  daysUploaded: number;
  daysAttempted: number;
}

export interface MockParticipation extends Participation {
  compulsory: boolean;
  attemptsInRange: number;
  attemptsUsed: number;
  attemptsLeft: number;
  attemptLimit: number;
  daysAttempted: number;
}

export interface AiHrParticipation extends Participation {
  maxCallsPerDay: number;
  totalCalls: number;
  callsPicked: number;
  callsDnp: number;
  daysCalled: number;
  pendingToday: boolean;
  days: { date: string; calls: number; picked: boolean; pending: boolean }[];
}

export interface RealHrParticipation extends Participation {
  applicable: true;
  totalCalls: number;
  callsConnected: number;
  callsNotConnected: number;
  daysCalled: number;
  pendingToday: boolean;
  days: { date: string; calls: number; recordings: number; picked: boolean; pending: boolean; reason: string | null }[];
}

export interface AttendanceParticipation extends Participation {
  matched: boolean;
  noPunchDays?: number;
  noPunchOutDays?: number;
  pendingToday?: boolean;
  days: {
    date: string;
    status: "present" | "absent" | "pending";
    inTime: string | null;
    outTime: string | null;
    workedMinutes: number | null;
    reason: "no_punch" | "no_punch_out" | null;
  }[];
}

export interface MegaQuestion {
  questionNo: number | null;
  question: string | null;
  studentAnswer: string | null;
  maxMarks: number | null;
  marksAwarded: number | null;
  feedback: string | null;
}

export interface MegaExam {
  id: string;
  examTitle: string;
  course: string | null;
  date: string;
  obtainedMarks: number | null;
  totalMarks: number | null;
  percentage: number | null;
  grade: string | null;
  overallFeedback: string | null;
  questionsTotal: number;
  questionsFullMarks: number;
  questionsPartial: number;
  questionsZero: number;
  questionWiseResult: MegaQuestion[];
}

interface ExamPick {
  examTitle: string;
  date: string;
  percentage: number | null;
}

export interface WeeklyTestData {
  totalAttempts: number;
  evaluatedAttempts: number;
  notEvaluatedAttempts: number;
  daysAttempted: number;
  totalObtained: number;
  totalPossible: number;
  overallPercentage: number | null;
  averagePercentage: number | null;
  highest: ExamPick | null;
  lowest: ExamPick | null;
  latest: ExamPick | null;
  change: number | null;
  gradeDistribution: Record<string, number>;
  exams: MegaExam[];
  notEvaluated: { id: string; examTitle: string; date: string; status: string; error: string | null }[];
}

export interface StudentProfile {
  _id: string;
  clerkId: string;
  fullName?: string;
  email?: string;
  joinedMonth?: string | null;
  isPlaced?: boolean;
  batch?: string | null;
  courseName?: string | null;
}

export interface ParticipationData {
  student: StudentProfile;
  studentName: string;
  zone: string | null;
  batchCode: string | null;
  compulsory: boolean;
  range: { from: string | null; to: string | null };
  today: string;
  dailyQuiz: DailyQuizParticipation;
  aiMockInterview: MockParticipation;
  aiHrCalling: AiHrParticipation;
  realHrCalling: RealHrParticipation | { applicable: false };
  attendance: AttendanceParticipation;
  weeklyTest: WeeklyTestData;
}
