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

export interface QuizOptions {
  A?: string | null;
  B?: string | null;
  C?: string | null;
  D?: string | null;
}

export interface AttemptedQuestion {
  question: string;
  questionType: "text" | "mcq";
  options: QuizOptions | null;
  correctAnswer: string | null;
  marks: number | null;
  studentAnswer: string | null;
  marksObtained: number | null;
  remark: string | null;
}

export interface AttemptedQuiz {
  quizId: string;
  date: string;
  title: string | null;
  category: string | null;
  attemptedAt: string | null;
  isEvaluated: boolean;
  totalMarksObtained: number;
  totalMarksPossible: number;
  percentage: number | null;
  questions: AttemptedQuestion[];
}

export interface AbsentQuizDay {
  date: string;
  quizzes: {
    quizId: string;
    title: string | null;
    category: string | null;
    questions: { question: string; questionType: "text" | "mcq"; options: QuizOptions | null; marks: number | null }[];
  }[];
}

export interface DailyQuizParticipation extends Participation {
  compulsory: boolean;
  quizzesUploaded: number;
  quizzesAttempted: number;
  daysUploaded: number;
  daysAttempted: number;
  scoreObtained: number;
  scorePossible: number;
  scorePercentage: number | null;
  attemptedQuizzes: AttemptedQuiz[];
  absentQuizzes: AbsentQuizDay[];
}

export interface MockInterviewDetail {
  id: string;
  callId: string | null;
  date: string;
  interviewType: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endedReason: string | null;
  /** false when the provider returned no report: nothing was graded. */
  analyzed: boolean;
  status: "PASS" | "FAIL" | null;
  summary: string | null;
  score: { percentage: number; correctAnswers: number | null; totalQuestions: number | null } | null;
  evaluation: Record<string, unknown> | null;
  recordingUrl: string | null;
}

export interface MockParticipation extends Participation {
  compulsory: boolean;
  attemptsInRange: number;
  attemptsUsed: number;
  attemptsLeft: number;
  attemptLimit: number;
  daysAttempted: number;
  interviews: MockInterviewDetail[];
}

export interface AiCallDetail {
  id: string;
  date: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  endReason: string | null;
  dnp: boolean;
  analysisStatus: string | null;
  analysis: unknown;
  recordingUrl: string | null;
}

export interface RealHrRecording {
  id: string;
  date: string;
  time: string | null;
  type: "recording" | "manual";
  manualStatus: string | null;
  durationSeconds: number;
  durationLabel: string | null;
  status: string | null;
  publicUrl: string | null;
  analysis: unknown;
}

export interface AiHrParticipation extends Participation {
  maxCallsPerDay: number;
  totalCalls: number;
  callsPicked: number;
  callsDnp: number;
  daysCalled: number;
  pendingToday: boolean;
  days: { date: string; calls: number; picked: boolean; pending: boolean }[];
  callDetails: AiCallDetail[];
}

export interface RealHrParticipation extends Participation {
  applicable: true;
  totalCalls: number;
  callsConnected: number;
  callsNotConnected: number;
  daysCalled: number;
  pendingToday: boolean;
  days: { date: string; calls: number; recordings: number; picked: boolean; pending: boolean; reason: string | null }[];
  recordings: RealHrRecording[];
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

/** The drill-down views a KPI tile can open. */
export type DrillDown =
  | "att-present" | "att-absent"
  | "quiz-attempted" | "quiz-absent"
  | "mega-exams"
  | "mock-present"
  | "ai-answered" | "ai-absent"
  | "real-uploaded" | "real-missing";
