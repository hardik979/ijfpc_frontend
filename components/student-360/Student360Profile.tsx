"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  Banknote,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Clock3,
  CreditCard,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Headphones,
  IndianRupee,
  Layers3,
  LoaderCircle,
  Mail,
  MapPin,
  Moon,
  Phone,
  PhoneCall,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trophy,
  UserRound,
  UsersRound,
  Video,
  WalletCards,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import styles from "./Student360Profile.module.css";

gsap.registerPlugin(useGSAP);

interface StudentProfile {
  id: string;
  clerkId: string | null;
  fullName: string | null;
  email: string | null;
  mobile: string | null;
  fathersName: string | null;
  address: string | null;
  degree: string | null;
  passoutYear: number | null;
  mode: string | null;
  digitalSignatureUrl: string | null;
  receiptNo: string | null;
  enrollmentDate: string | null;
  batchStartDate: string | null;
  counselorName: string | null;
  enrollmentId: string | null;
  enrollmentNumber: string | null;
  joinedMonth: string | null;
  zone: string;
  zoneChangedAt: string | null;
  status: string;
  isPlaced: boolean;
  isPaused: boolean;
  feePlan: string | null;
  feeOverdue: boolean;
  subscription: string | null;
  admissionForm: boolean | null;
  batch: string | null;
  courseNames: string[];
  preplacementRecordId: string | null;
  preplacementStatus: string | null;
  preplacementDueDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ProfileResponse {
  student: StudentProfile;
  preplacementFee: PreplacementFee | null;
  postplacementFee: PostplacementFee | null;
  interviews: {
    summary: InterviewSummary;
    records: InterviewRecord[];
  };
  academics: AcademicData;
  meta: {
    preplacementSourceAvailable: boolean;
    preplacementRecordFound: boolean;
    preplacementMatchedBy: string | null;
    postplacementSourceAvailable: boolean;
    postplacementRecordFound: boolean;
    postplacementMatchedBy: string | null;
    interviewSourceAvailable: boolean;
    academicSourceAvailable: boolean;
  };
}

interface PreplacementPayment {
  amount: number;
  date: string | null;
  mode: string | null;
  receiptNos: string[];
  note: string | null;
}

interface PreplacementRefund {
  amount: number;
  date: string | null;
  mode: string | null;
  note: string | null;
}

interface PreplacementFee {
  id: string | null;
  terms: string | null;
  status: string | null;
  totalFee: number;
  totalReceived: number;
  totalRefunded: number;
  netCollected: number;
  remainingFee: number;
  dueDate: string | null;
  firstPaymentAt: string | null;
  payments: PreplacementPayment[];
  refunds: PreplacementRefund[];
  updatedAt: string | null;
}

interface PostplacementInstallment {
  id: string | null;
  label: string;
  amount: number;
  date: string | null;
  mode: string | null;
  note: string | null;
}

interface PostplacementFee {
  id: string | null;
  studentName: string | null;
  companyName: string | null;
  location: string | null;
  offerDate: string | null;
  joiningDate: string | null;
  packageLPA: number | null;
  totalFee: number;
  carriedPreplacementFee: number;
  discount: number;
  paid: number;
  remainingFee: number;
  remainingFeeNote: string | null;
  installments: PostplacementInstallment[];
  updatedAt: string | null;
}

interface InterviewSummary {
  total: number;
  completed: number;
  upcoming: number;
  cancelled: number;
  noShow: number;
  mock: number;
  real: number;
}

interface InterviewRecord {
  id: string;
  studentName: string | null;
  company: string | null;
  round: string | null;
  roundNumber: number | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledAt: string | null;
  estimatedDuration: number | null;
  status: string;
  adminReviewed: boolean;
  actualStartTime: string | null;
  actualEndTime: string | null;
  notes: string | null;
  flaggedIssue: string | null;
  isMock: boolean;
  mockInterviewer: string | null;
  rescheduleCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface DailyQuizAttempt {
  _id: string;
  quizId?:
    | string
    | {
        _id?: string;
        title?: string;
        difficultyLevel?: string;
        date?: string | null;
      }
    | null;
  totalMarksObtained?: number;
  totalMarksPossible?: number;
  attemptedAt?: string | null;
}

interface QuizAttemptQuestion {
  id: string;
  number: number;
  questionText: string;
  questionType: "mcq" | "text";
  options: Record<"A" | "B" | "C" | "D", string | null> | null;
  correctAnswer: "A" | "B" | "C" | "D" | null;
  studentAnswer: string;
  marksObtained: number;
  marksPossible: number;
  remark: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
}

interface QuizAttemptDetail {
  attempt: {
    id: string;
    studentName: string | null;
    isEvaluated: boolean;
    attemptedAt: string | null;
    totalMarksObtained: number;
    totalMarksPossible: number;
  };
  quiz: {
    id: string;
    title: string;
    description: string | null;
    difficultyLevel: string | null;
    date: string | null;
    courseId: string | null;
  } | null;
  questions: QuizAttemptQuestion[];
}

interface MockInterviewAttempt {
  _id: string;
  callId?: string;
  interviewType?: string;
  date?: string | null;
  status?: string;
  feedback?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
  durationSeconds?: number;
  endedReason?: string | null;
  correctAnswers?: number;
  totalQuestions?: number;
  percentage?: number;
}

interface AiHrCall {
  candidate_name?: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_s?: number;
  end_reason?: string | null;
  analysisStatus?: string | null;
  analysis?: {
    scoreOutOf10?: number;
    overallRating?: string;
    outcome?: string;
    outcomeCode?: string;
    summary?: string;
    feedback?: string;
  } | null;
}

interface RealHrAttempt {
  attemptNumber?: number;
  recordingId?: string;
  time?: string | null;
  durationLabel?: string | null;
  durationSeconds?: number;
  type?: string | null;
  status?: string | null;
  publicUrl?: string | null;
  outcome?: string | null;
  outcomeCode?: string | null;
  confidence?: number | null;
  summary?: string | null;
  followUpRequired?: boolean;
  followUpAction?: string | null;
  studentResponseFeedback?: string | null;
  overallCallQuality?: string | null;
  issues?: string[];
  flags?: string[];
}

interface MegaTestAttempt {
  _id: string;
  examTitle?: string;
  course?: string;
  status?: string;
  evaluatedAt?: string | null;
  obtainedMarks?: number;
  totalMarks?: number;
  percentage?: number;
  grade?: string;
  overallFeedback?: string;
}

interface AcademicStats {
  totalAttempts?: number;
  totalDaysAttempted?: number;
  totalObtained?: number;
  totalPossible?: number;
  percentage?: number;
  passed?: number;
  failed?: number;
  passRate?: number;
  failRate?: number;
  averagePercentage?: number;
  firstAttempt?: string | null;
  lastAttempt?: string | null;
}

interface AcademicData {
  dailyQuiz: { attempts?: DailyQuizAttempt[]; stats?: AcademicStats } | null;
  aiMockInterviews: {
    attempts?: MockInterviewAttempt[];
    stats?: AcademicStats;
  } | null;
  aiHrCalls: AiHrCall[];
  realHrCalls: {
    stats?: {
      total?: number;
      positive?: number;
      negative?: number;
      neutral?: number;
      followUps?: number;
      totalDaysAttempted?: number;
    };
    byDay?: Array<{ date: string; attempts?: RealHrAttempt[] }>;
  } | null;
  megaTests: {
    attempts?: MegaTestAttempt[];
    stats?: AcademicStats;
  } | null;
}

interface DetailItem {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  wide?: boolean;
}

type ProfileSection =
  | "personal"
  | "preplacement"
  | "postplacement"
  | "interviews"
  | "academics";

type AcademicView = "quiz" | "mock" | "ai-hr" | "real-hr" | "mega-test";

const readableToken = (value?: string | null) => {
  if (!value) return null;
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const feeProgress = (paid: number, total: number) => {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((paid / total) * 100)));
};

const initials = (name?: string | null) =>
  (name || "Student")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const zoneContent = (zone?: string) => {
  switch (zone?.toLowerCase()) {
    case "blue":
      return {
        label: "Blue zone",
        summary: "Building core skills and maintaining daily academic consistency.",
        className: styles.zoneBlue,
      };
    case "yellow":
      return {
        label: "Yellow zone",
        summary: "Preparing through AI HR calls and mock interview practice.",
        className: styles.zoneYellow,
      };
    case "green":
      return {
        label: "Green zone",
        summary: "Placement-ready and progressing through real HR interactions.",
        className: styles.zoneGreen,
      };
    default:
      return {
        label: "Newly enrolled",
        summary: "Completing onboarding before the first academic zone assignment.",
        className: styles.zoneNeutral,
      };
  }
};

function DetailValue({ value }: { value: React.ReactNode }) {
  const isMissing = value === null || value === undefined || value === "";
  return (
    <span className={isMissing ? styles.missingValue : styles.detailValue}>
      {isMissing ? "Not available" : value}
    </span>
  );
}

function DetailSection({
  id,
  eyebrow,
  title,
  description,
  items,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: DetailItem[];
}) {
  return (
    <section
      id={id}
      className={`student360-profile-section ${styles.glassCard} scroll-mt-6 rounded-2xl p-5 sm:p-6 [will-change:transform,opacity]`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mb-5">
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={`${id}-heading`} className="mt-1 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
          {description}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ label, value, icon: Icon, wide }) => (
          <div
            key={label}
            className={`${styles.detailRow} ${wide ? "md:col-span-2 xl:col-span-3" : ""} flex min-w-0 items-start gap-3 py-3.5`}
          >
            <span className={`${styles.detailIcon} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg`}>
              <Icon className="h-4 w-4" aria-hidden={true} />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--s360-profile-text-muted)]">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium leading-6">
                <DetailValue value={value} />
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SignatureApprovalCard({
  signatureUrl,
  studentName,
}: {
  signatureUrl: string | null;
  studentName: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [signatureUrl]);

  const canDisplaySignature = Boolean(signatureUrl) && !imageFailed;

  return (
    <section
      className={`student360-signature-card ${styles.glassCard} ${styles.signatureCard} rounded-2xl p-5 sm:p-6 [will-change:transform,opacity]`}
      aria-labelledby="student-signature-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={styles.signatureIcon}>
            <PenLine className="h-5 w-5" aria-hidden={true} />
          </span>
          <div>
            <p className={styles.eyebrow}>Consent record</p>
            <h2 id="student-signature-heading" className="mt-1 text-xl font-semibold tracking-tight">
              Student signature
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
              Digital signature captured during the student&apos;s pre-placement registration.
            </p>
          </div>
        </div>
        <span className={canDisplaySignature ? styles.signatureApproval : styles.signatureUnavailable}>
          <FileCheck2 className="h-4 w-4" aria-hidden={true} />
          {canDisplaySignature ? "T&C approval recorded" : "Signature unavailable"}
        </span>
      </div>

      {canDisplaySignature && signatureUrl ? (
        <figure className="mt-5">
          <div className={styles.signatureCanvas}>
            <Image
              src={signatureUrl}
              alt={`${studentName || "Student"}'s digital signature for Terms and Conditions approval`}
              width={720}
              height={240}
              sizes="(max-width: 768px) calc(100vw - 4rem), 720px"
              className="h-full w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          </div>
          <figcaption className={styles.signatureCaption}>
            <span>
              <FileCheck2 className="h-4 w-4" aria-hidden={true} />
              Student&apos;s signature for Terms &amp; Conditions approval
            </span>
            <a
              href={signatureUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.signatureLink}
            >
              Open full size
              <ExternalLink className="h-4 w-4" aria-hidden={true} />
            </a>
          </figcaption>
        </figure>
      ) : (
        <div className={styles.signatureEmpty} role="status">
          <PenLine className="h-5 w-5" aria-hidden={true} />
          <div>
            <p className="font-semibold">No digital signature available</p>
            <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
              A valid Cloudflare R2 signature has not been linked to this pre-placement record.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function FeeMetric({
  label,
  value,
  icon: Icon,
  emphasis = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  emphasis?: boolean;
}) {
  return (
    <div className={`${styles.feeMetric} ${emphasis ? styles.feeMetricEmphasis : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p>{label}</p>
        <Icon className="h-4 w-4" aria-hidden={true} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function FeeProgress({ paid, total }: { paid: number; total: number }) {
  const progress = feeProgress(paid, total);
  return (
    <div className={styles.feeProgressBlock}>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs font-semibold">
        <span>Collection progress</span>
        <span>{progress}%</span>
      </div>
      <div
        className={styles.feeProgressTrack}
        role="progressbar"
        aria-label="Fee collection progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span className={styles.feeProgressValue} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

interface FeeActivity {
  key: string;
  label: string;
  amount: number;
  date: string | null;
  mode: string | null;
  note?: string | null;
  reference?: string | null;
  refund?: boolean;
}

function FeeActivityList({
  title,
  activities,
}: {
  title: string;
  activities: FeeActivity[];
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className={styles.feeCount}>{activities.length}</span>
      </div>
      {activities.length ? (
        <div className={styles.feeActivityList}>
          {activities.map((activity) => (
            <div key={activity.key} className={styles.feeActivityRow}>
              <span className={styles.feeActivityIcon}>
                <CreditCard className="h-4 w-4" aria-hidden={true} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="truncate text-sm font-semibold">{activity.label}</p>
                  <p className={activity.refund ? styles.refundAmount : styles.paymentAmount}>
                    {activity.refund ? "−" : "+"}{formatCurrency(activity.amount)}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--s360-profile-text-secondary)]">
                  {[formatDate(activity.date), readableToken(activity.mode), activity.reference]
                    .filter(Boolean)
                    .join(" · ") || "Transaction details unavailable"}
                </p>
                {activity.note ? (
                  <p className="mt-1 text-xs leading-5 text-[var(--s360-profile-text-muted)]">
                    {activity.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={`${styles.feeEmptyInline} rounded-xl px-4 py-5 text-sm`}>
          No transactions recorded yet.
        </p>
      )}
    </div>
  );
}

function MissingFeeRecord({ type }: { type: "pre-placement" | "post-placement" }) {
  return (
    <div className={`${styles.feeEmpty} rounded-xl p-5`} role="status">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl">
        <Banknote className="h-5 w-5" aria-hidden={true} />
      </span>
      <div>
        <p className="font-semibold">No {type} fee record linked</p>
        <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
          No record matching this student&apos;s Clerk ID or email was found.
        </p>
      </div>
    </div>
  );
}

function PreplacementFeeSection({ fee }: { fee: PreplacementFee | null }) {
  const activities: FeeActivity[] = fee
    ? [
        ...fee.payments.map((payment, index) => ({
          key: `payment-${index}-${payment.date || "undated"}`,
          label: `Payment ${index + 1}`,
          amount: payment.amount,
          date: payment.date,
          mode: payment.mode,
          note: payment.note,
          reference: payment.receiptNos.length
            ? `Receipt ${payment.receiptNos.join(", ")}`
            : null,
        })),
        ...fee.refunds.map((refund, index) => ({
          key: `refund-${index}-${refund.date || "undated"}`,
          label: `Refund ${index + 1}`,
          amount: refund.amount,
          date: refund.date,
          mode: refund.mode,
          note: refund.note,
          refund: true,
        })),
      ].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
    : [];

  return (
    <section
      id="pre-placement-fee"
      className={`student360-profile-section ${styles.glassCard} ${styles.feeSection} ${styles.preFee} scroll-mt-6 rounded-2xl p-5 sm:p-6 [will-change:transform,opacity]`}
      aria-labelledby="pre-placement-fee-heading"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={styles.eyebrow}>Fee ledger</p>
          <h2 id="pre-placement-fee-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Pre-placement fee
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
            Enrollment fee totals, outstanding balance, and payment activity.
          </p>
        </div>
        {fee?.status ? <span className={styles.feeStatus}>{readableToken(fee.status)}</span> : null}
      </div>

      {!fee ? (
        <MissingFeeRecord type="pre-placement" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FeeMetric label="Total fee" value={formatCurrency(fee.totalFee)} icon={IndianRupee} />
            <FeeMetric label="Net collected" value={formatCurrency(fee.netCollected)} icon={Banknote} />
            <FeeMetric label="Refunded" value={formatCurrency(fee.totalRefunded)} icon={CreditCard} />
            <FeeMetric
              label="Remaining"
              value={formatCurrency(fee.remainingFee)}
              icon={WalletCards}
              emphasis={fee.remainingFee > 0}
            />
          </div>
          <FeeProgress paid={fee.netCollected} total={fee.totalFee} />
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={styles.feeFact}><dt>Due date</dt><dd>{formatDate(fee.dueDate) || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>First payment</dt><dd>{formatDate(fee.firstPaymentAt) || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>Terms</dt><dd>{fee.terms || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>Last updated</dt><dd>{formatDateTime(fee.updatedAt) || "Not available"}</dd></div>
          </dl>
          <FeeActivityList title="Payments and refunds" activities={activities} />
        </>
      )}
    </section>
  );
}

function PostplacementFeeSection({ fee }: { fee: PostplacementFee | null }) {
  const activities: FeeActivity[] = (fee?.installments || [])
    .map((installment, index) => ({
      key: installment.id || `installment-${index}`,
      label: installment.label || `Installment ${index + 1}`,
      amount: installment.amount,
      date: installment.date,
      mode: installment.mode,
      note: installment.note,
    }))
    .sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <section
      id="post-placement-fee"
      className={`student360-profile-section ${styles.glassCard} ${styles.feeSection} ${styles.postFee} scroll-mt-6 rounded-2xl p-5 sm:p-6 [will-change:transform,opacity]`}
      aria-labelledby="post-placement-fee-heading"
    >
      <div className="mb-5">
        <p className={styles.eyebrow}>Fee ledger</p>
        <h2 id="post-placement-fee-heading" className="mt-1 text-xl font-semibold tracking-tight">
          Post-placement fee
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
          Placement-linked fee, discounts, installments, and outstanding balance.
        </p>
      </div>

      {!fee ? (
        <MissingFeeRecord type="post-placement" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FeeMetric label="Total fee" value={formatCurrency(fee.totalFee)} icon={IndianRupee} />
            <FeeMetric label="Installments paid" value={formatCurrency(fee.paid)} icon={Banknote} />
            <FeeMetric label="Discount" value={formatCurrency(fee.discount)} icon={BadgePercent} />
            <FeeMetric
              label="Remaining"
              value={formatCurrency(fee.remainingFee)}
              icon={WalletCards}
              emphasis={fee.remainingFee > 0}
            />
          </div>
          <FeeProgress paid={fee.paid} total={Math.max(fee.totalFee - fee.discount, 0)} />
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={styles.feeFact}><dt>Company</dt><dd>{fee.companyName || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>Location</dt><dd>{fee.location || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>Offer date</dt><dd>{formatDate(fee.offerDate) || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>Joining date</dt><dd>{formatDate(fee.joiningDate) || "Not available"}</dd></div>
            <div className={styles.feeFact}><dt>Package</dt><dd>{fee.packageLPA === null ? "Not available" : `${fee.packageLPA} LPA`}</dd></div>
            <div className={styles.feeFact}><dt>Pre-placement balance carried</dt><dd>{formatCurrency(fee.carriedPreplacementFee)}</dd></div>
            <div className={`${styles.feeFact} sm:col-span-2`}><dt>Balance note</dt><dd>{fee.remainingFeeNote || "No note added"}</dd></div>
          </dl>
          <FeeActivityList title="Post-placement installments" activities={activities} />
        </>
      )}
    </section>
  );
}

const interviewStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return styles.interviewStatusCompleted;
    case "allocated":
    case "confirmed":
    case "in_progress":
      return styles.interviewStatusActive;
    case "cancelled":
    case "no_show":
      return styles.interviewStatusAttention;
    default:
      return styles.interviewStatusNeutral;
  }
};

function InterviewMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className={styles.interviewMetric}>
      <div className="flex items-center justify-between gap-3">
        <p>{label}</p>
        <Icon className="h-4 w-4" aria-hidden={true} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function InterviewsSection({
  summary,
  interviews,
  sourceAvailable,
}: {
  summary: InterviewSummary;
  interviews: InterviewRecord[];
  sourceAvailable: boolean;
}) {
  return (
    <section
      id="interviews"
      className={`student360-profile-section ${styles.glassCard} ${styles.interviewSection} scroll-mt-6 rounded-2xl p-5 sm:p-6 [will-change:transform,opacity]`}
      aria-labelledby="interviews-heading"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={styles.eyebrow}>Placement activity</p>
          <h2 id="interviews-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Interview history
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
            Scheduled rounds, completion status, interview type, and operational notes.
          </p>
        </div>
        <span className={styles.interviewCount}>
          {summary.total} {summary.total === 1 ? "interview" : "interviews"}
        </span>
      </div>

      {!sourceAvailable ? (
        <div className={`${styles.interviewEmpty} rounded-xl p-5`} role="status">
          <span>
            <AlertCircle className="h-5 w-5" aria-hidden={true} />
          </span>
          <div>
            <p className="font-semibold">Interview records are temporarily unavailable</p>
            <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
              The LMS interview service did not respond. Refresh this profile to try again.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.interviewMetrics}>
            <InterviewMetric label="Total interviews" value={summary.total} icon={BriefcaseBusiness} />
            <InterviewMetric label="Completed" value={summary.completed} icon={CheckCircle2} />
            <InterviewMetric label="Upcoming" value={summary.upcoming} icon={CalendarClock} />
            <InterviewMetric label="Real / mock" value={`${summary.real} / ${summary.mock}`} icon={Video} />
          </div>

          {interviews.length ? (
            <ol className={styles.interviewList} aria-label="Student interview records">
              {interviews.map((interview) => {
                const schedule =
                  formatDateTime(interview.scheduledAt) ||
                  [formatDate(interview.scheduledDate), interview.scheduledTime]
                    .filter(Boolean)
                    .join(" · ") ||
                  "Schedule not available";
                const roundLabel = [
                  interview.round,
                  interview.roundNumber ? `Round ${interview.roundNumber}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={interview.id} className={styles.interviewCard}>
                    <span className={styles.interviewTimelineDot} aria-hidden={true} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">
                              {interview.company || "Company not recorded"}
                            </h3>
                            <span className={styles.interviewType}>
                              {interview.isMock ? "Mock interview" : "Real interview"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--s360-profile-text-secondary)]">
                            {roundLabel || "Interview round not specified"}
                          </p>
                        </div>
                        <span
                          className={`${styles.interviewStatus} ${interviewStatusClass(interview.status)}`}
                        >
                          {readableToken(interview.status) || "Pending allocation"}
                        </span>
                      </div>

                      <dl className={styles.interviewMeta}>
                        <div>
                          <dt><CalendarClock className="h-4 w-4" aria-hidden={true} /> Schedule</dt>
                          <dd>
                            {interview.scheduledAt ? (
                              <time dateTime={interview.scheduledAt}>{schedule}</time>
                            ) : (
                              schedule
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt><Clock3 className="h-4 w-4" aria-hidden={true} /> Duration</dt>
                          <dd>
                            {interview.estimatedDuration
                              ? `${interview.estimatedDuration} minutes`
                              : "Not specified"}
                          </dd>
                        </div>
                        <div>
                          <dt><ShieldCheck className="h-4 w-4" aria-hidden={true} /> Review</dt>
                          <dd>{interview.adminReviewed ? "Admin reviewed" : "Review pending"}</dd>
                        </div>
                        {interview.mockInterviewer ? (
                          <div>
                            <dt><UserRound className="h-4 w-4" aria-hidden={true} /> Interviewer</dt>
                            <dd>{interview.mockInterviewer}</dd>
                          </div>
                        ) : null}
                      </dl>

                      {interview.rescheduleCount > 0 ? (
                        <p className={styles.interviewReschedule}>
                          Rescheduled {interview.rescheduleCount} {interview.rescheduleCount === 1 ? "time" : "times"}
                        </p>
                      ) : null}
                      {interview.notes ? (
                        <div className={styles.interviewNote}>
                          <p>Notes</p>
                          <span>{interview.notes}</span>
                        </div>
                      ) : null}
                      {interview.flaggedIssue ? (
                        <div className={styles.interviewFlag}>
                          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden={true} />
                          <div><strong>Flagged issue</strong><p>{interview.flaggedIssue}</p></div>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={`${styles.interviewEmpty} mt-5 rounded-xl p-5`} role="status">
              <span>
                <BriefcaseBusiness className="h-5 w-5" aria-hidden={true} />
              </span>
              <div>
                <p className="font-semibold">No interviews recorded yet</p>
                <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
                  Interview records linked by LMS user ID, Clerk ID, or email will appear here.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const formatDuration = (seconds?: number | null) => {
  const duration = Math.max(0, Math.round(Number(seconds) || 0));
  if (!duration) return "Not recorded";
  const minutes = Math.floor(duration / 60);
  const remainingSeconds = duration % 60;
  if (!minutes) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatPercent = (value?: number | null) =>
  `${Math.max(0, Math.min(100, Number(value) || 0)).toFixed(1).replace(".0", "")}%`;

const academicStatusClass = (status?: string | null) => {
  const normalized = String(status || "").toLowerCase();
  if (
    ["pass", "passed", "positive", "success", "completed", "done"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return styles.academicStatusPositive;
  }
  if (
    ["fail", "failed", "negative", "rejected", "not interested"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return styles.academicStatusAttention;
  }
  return styles.academicStatusNeutral;
};

function AcademicRecordCard({
  icon: Icon,
  title,
  subtitle,
  status,
  meta,
  feedback,
  issues,
  audioUrl,
  action,
  children,
}: {
  icon: typeof BookOpenCheck;
  title: string;
  subtitle: string;
  status?: string | null;
  meta: Array<{ label: string; value: React.ReactNode }>;
  feedback?: string | null;
  issues?: string[];
  audioUrl?: string | null;
  action?: {
    label: string;
    onClick: () => void;
    busy?: boolean;
    expanded?: boolean;
  };
  children?: React.ReactNode;
}) {
  return (
    <li className={styles.academicRecord}>
      <span className={styles.academicRecordIcon} aria-hidden={true}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="font-semibold">{title}</h4>
            <p className="mt-1 text-sm text-[var(--s360-profile-text-secondary)]">{subtitle}</p>
          </div>
          <div className={styles.academicRecordActions}>
            {status ? (
              <span className={`${styles.academicStatus} ${academicStatusClass(status)}`}>
                {readableToken(status) || status}
              </span>
            ) : null}
            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                disabled={action.busy}
                aria-expanded={action.expanded}
                className={styles.quizDrillButton}
              >
                {action.busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden={true} />
                ) : (
                  <ChevronDown
                    className={`${styles.quizDrillChevron} ${action.expanded ? styles.quizDrillChevronOpen : ""} h-4 w-4`}
                    aria-hidden={true}
                  />
                )}
                {action.busy ? "Loading" : action.label}
              </button>
            ) : null}
          </div>
        </div>

        <dl className={styles.academicRecordMeta}>
          {meta.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Not recorded"}</dd>
            </div>
          ))}
        </dl>

        {feedback ? (
          <div className={styles.academicFeedback}>
            <p>Feedback and summary</p>
            <span>{feedback}</span>
          </div>
        ) : null}

        {issues?.length ? (
          <div className={styles.academicIssues}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
            <p>{issues.join(" · ")}</p>
          </div>
        ) : null}

        {audioUrl ? (
          <div className={styles.academicAudio}>
            <p>Call recording</p>
            <audio controls preload="none" src={audioUrl}>
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : null}
        {children}
      </div>
    </li>
  );
}

function AcademicEmpty({ label }: { label: string }) {
  return (
    <div className={styles.academicEmpty} role="status">
      <span>
        <BookOpenCheck className="h-5 w-5" aria-hidden={true} />
      </span>
      <div>
        <p className="font-semibold">No {label.toLowerCase()} records yet</p>
        <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
          Attempts linked to this student will appear here automatically.
        </p>
      </div>
    </div>
  );
}

const QUIZ_OPTION_KEYS = ["A", "B", "C", "D"] as const;

function QuizAttemptDrilldown({
  detail,
  loading,
  error,
  onRetry,
}: {
  detail?: QuizAttemptDetail;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className={`${styles.quizDrilldown} quiz-drilldown`} role="status" aria-live="polite">
        <div className={styles.quizDrillLoading}>
          <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden={true} />
          <div>
            <p className="font-semibold">Loading question-level results</p>
            <p className="mt-1 text-sm text-[var(--s360-profile-text-secondary)]">
              Retrieving the student&apos;s saved answers and evaluation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.quizDrilldown} quiz-drilldown`} role="alert">
        <div className={styles.quizDrillError}>
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden={true} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Questions could not be loaded</p>
            <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">{error}</p>
          </div>
          <button type="button" onClick={onRetry} className={styles.quizRetryButton}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const obtained = Number(detail.attempt.totalMarksObtained) || 0;
  const possible = Number(detail.attempt.totalMarksPossible) || 0;
  const percentage = possible > 0 ? (obtained / possible) * 100 : 0;
  const answered = detail.questions.filter((question) => question.isAnswered).length;
  const correct = detail.questions.filter((question) => question.isCorrect === true).length;

  return (
    <section
      className={`${styles.quizDrilldown} quiz-drilldown`}
      aria-label={`Question results for ${detail.quiz?.title || "daily quiz"}`}
    >
      <div className={styles.quizDrillHeader}>
        <div>
          <p className={styles.eyebrow}>Quiz drill-down</p>
          <h5 className="mt-1 text-base font-semibold">{detail.quiz?.title || "Daily quiz"}</h5>
          <p className="mt-1 text-sm text-[var(--s360-profile-text-secondary)]">
            {[detail.quiz?.difficultyLevel, formatDate(detail.quiz?.date)]
              .filter(Boolean)
              .join(" · ") || "Quiz metadata unavailable"}
          </p>
        </div>
        <span className={styles.quizEvaluationStatus}>
          {detail.attempt.isEvaluated ? "Evaluated" : "Evaluation pending"}
        </span>
      </div>

      {detail.quiz?.description ? (
        <p className={styles.quizDescription}>{detail.quiz.description}</p>
      ) : null}

      <dl className={styles.quizDrillMetrics}>
        <div><dt>Questions</dt><dd>{detail.questions.length}</dd></div>
        <div><dt>Answered</dt><dd>{answered}</dd></div>
        <div><dt>Correct MCQs</dt><dd>{correct}</dd></div>
        <div><dt>Total score</dt><dd>{obtained} / {possible} · {formatPercent(percentage)}</dd></div>
      </dl>

      {detail.questions.length ? (
        <ol className={styles.quizQuestionList} aria-label="Quiz questions and student answers">
          {detail.questions.map((question, questionIndex) => {
            const normalizedStudentAnswer = question.studentAnswer.trim().toUpperCase();
            const resultLabel =
              question.isCorrect === true
                ? "Correct"
                : question.isCorrect === false
                  ? "Incorrect"
                  : question.isAnswered
                    ? "Reviewed"
                    : "Not answered";

            return (
              <li
                key={`${detail.attempt.id}-${question.id || "legacy-question"}-${question.number || questionIndex + 1}`}
                className={styles.quizQuestionCard}
              >
                <div className={styles.quizQuestionHeader}>
                  <span className={styles.quizQuestionNumber}>{question.number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-6">{question.questionText}</p>
                    <div className={styles.quizQuestionMeta}>
                      <span>{question.questionType === "mcq" ? "Multiple choice" : "Written response"}</span>
                      <span>{question.marksObtained} / {question.marksPossible} marks</span>
                    </div>
                  </div>
                  <span
                    className={`${styles.quizResultPill} ${
                      question.isCorrect === true
                        ? styles.quizResultCorrect
                        : question.isCorrect === false
                          ? styles.quizResultIncorrect
                          : styles.quizResultReviewed
                    }`}
                  >
                    {question.isCorrect === true ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden={true} />
                    ) : question.isCorrect === false ? (
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden={true} />
                    ) : null}
                    {resultLabel}
                  </span>
                </div>

                {question.questionType === "mcq" && question.options ? (
                  <ul className={styles.quizOptions} aria-label={`Answer choices for question ${question.number}`}>
                    {QUIZ_OPTION_KEYS.map((key) => {
                      const option = question.options?.[key];
                      if (!option) return null;
                      const isSelected = normalizedStudentAnswer === key;
                      const isCorrectOption = question.correctAnswer === key;
                      return (
                        <li
                          key={key}
                          className={`${styles.quizOption} ${isSelected ? styles.quizOptionSelected : ""} ${isCorrectOption ? styles.quizOptionCorrect : ""} ${isSelected && !isCorrectOption ? styles.quizOptionIncorrect : ""}`}
                        >
                          <span className={styles.quizOptionKey}>{key}</span>
                          <span className="min-w-0 flex-1">{option}</span>
                          <span className={styles.quizOptionLabels}>
                            {isSelected ? <span>Your answer</span> : null}
                            {isCorrectOption ? <span>Correct answer</span> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className={styles.quizWrittenAnswer}>
                    <p>Student&apos;s answer</p>
                    <span>{question.studentAnswer || "No answer submitted"}</span>
                  </div>
                )}

                {question.remark ? (
                  <div className={styles.quizRemark}>
                    <p>Evaluator feedback</p>
                    <span>{question.remark}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <AcademicEmpty label="quiz question" />
      )}
    </section>
  );
}

function AcademicsSection({
  data,
  sourceAvailable,
  studentId,
}: {
  data: AcademicData;
  sourceAvailable: boolean;
  studentId: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const quizRequestRef = useRef<AbortController | null>(null);
  const [activeView, setActiveView] = useState<AcademicView>("quiz");
  const [selectedQuizTopic, setSelectedQuizTopic] = useState<string | null>(null);
  const [selectedQuizAttemptId, setSelectedQuizAttemptId] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<Record<string, QuizAttemptDetail>>({});
  const [quizLoadingId, setQuizLoadingId] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<{ attemptId: string; message: string } | null>(null);

  const quizAttempts = data.dailyQuiz?.attempts || [];
  const mockAttempts = data.aiMockInterviews?.attempts || [];
  const aiHrCalls = data.aiHrCalls || [];
  const realHrCalls = (data.realHrCalls?.byDay || []).flatMap((day) =>
    (day.attempts || []).map((attempt) => ({ day: day.date, attempt })),
  );
  const megaTestAttempts = data.megaTests?.attempts || [];

  const quizTopics = useMemo(() => {
    const topics = new Map<
      string,
      {
        key: string;
        label: string;
        attempts: DailyQuizAttempt[];
        totalObtained: number;
        totalPossible: number;
      }
    >();

    for (const attempt of data.dailyQuiz?.attempts || []) {
      const quiz =
        attempt.quizId && typeof attempt.quizId === "object"
          ? attempt.quizId
          : null;
      const label = readableToken(quiz?.difficultyLevel) || "Other topics";
      const key = String(quiz?.difficultyLevel || "other-topics").toLowerCase();
      const current = topics.get(key) || {
        key,
        label,
        attempts: [],
        totalObtained: 0,
        totalPossible: 0,
      };
      current.attempts.push(attempt);
      current.totalObtained += Number(attempt.totalMarksObtained) || 0;
      current.totalPossible += Number(attempt.totalMarksPossible) || 0;
      topics.set(key, current);
    }

    return Array.from(topics.values())
      .map((topic) => ({
        ...topic,
        attempts: [...topic.attempts].sort(
          (a, b) =>
            new Date(b.attemptedAt || 0).getTime() -
            new Date(a.attemptedAt || 0).getTime(),
        ),
        averageObtained: topic.attempts.length
          ? topic.totalObtained / topic.attempts.length
          : 0,
        averagePossible: topic.attempts.length
          ? topic.totalPossible / topic.attempts.length
          : 0,
        percentage:
          topic.totalPossible > 0
            ? (topic.totalObtained / topic.totalPossible) * 100
            : 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data.dailyQuiz?.attempts]);

  const activeQuizTopic = quizTopics.find((topic) => topic.key === selectedQuizTopic) || null;

  const aiScores = aiHrCalls
    .map((call) => Number(call.analysis?.scoreOutOf10))
    .filter((score) => Number.isFinite(score));
  const averageAiScore = aiScores.length
    ? (aiScores.reduce((sum, score) => sum + score, 0) / aiScores.length).toFixed(1)
    : null;

  const activityTabs: Array<{
    id: AcademicView;
    label: string;
    count: number;
    insight: string;
    icon: typeof BookOpenCheck;
  }> = [
    {
      id: "quiz",
      label: "Daily quiz",
      count: quizAttempts.length,
      insight: `${formatPercent(data.dailyQuiz?.stats?.percentage)} overall score`,
      icon: BookOpenCheck,
    },
    {
      id: "mock",
      label: "AI mock interviews",
      count: mockAttempts.length,
      insight: `${formatPercent(data.aiMockInterviews?.stats?.passRate)} pass rate`,
      icon: BrainCircuit,
    },
    {
      id: "ai-hr",
      label: "AI HR calls",
      count: aiHrCalls.length,
      insight: averageAiScore ? `${averageAiScore}/10 average score` : "Awaiting scored calls",
      icon: Headphones,
    },
    {
      id: "real-hr",
      label: "Real HR calls",
      count: realHrCalls.length,
      insight: `${data.realHrCalls?.stats?.positive || 0} positive outcomes`,
      icon: PhoneCall,
    },
    {
      id: "mega-test",
      label: "Mega tests",
      count: megaTestAttempts.length,
      insight: `${formatPercent(data.megaTests?.stats?.averagePercentage)} average score`,
      icon: Trophy,
    },
  ];

  const activeActivity = activityTabs.find((activity) => activity.id === activeView)!;

  useEffect(
    () => () => {
      quizRequestRef.current?.abort();
    },
    [],
  );

  const loadQuizAttempt = async (attemptId: string, force = false) => {
    if (!force && quizDetails[attemptId]) return;

    quizRequestRef.current?.abort();
    const controller = new AbortController();
    quizRequestRef.current = controller;
    setQuizLoadingId(attemptId);
    setQuizError(null);

    try {
      const response = await fetch(
        `/api/student-360/students/${encodeURIComponent(studentId)}/quiz-attempts/${encodeURIComponent(attemptId)}`,
        { cache: "no-store", signal: controller.signal },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Could not load this quiz attempt");
      }
      setQuizDetails((current) => ({ ...current, [attemptId]: payload as QuizAttemptDetail }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setQuizError({
        attemptId,
        message: error instanceof Error ? error.message : "Could not load this quiz attempt",
      });
    } finally {
      if (quizRequestRef.current === controller) {
        quizRequestRef.current = null;
        setQuizLoadingId(null);
      }
    }
  };

  const openQuizAttempt = (attemptId: string) => {
    setSelectedQuizAttemptId(attemptId);
    void loadQuizAttempt(attemptId);
  };

  const openQuizTopic = (topicKey: string) => {
    const topic = quizTopics.find((item) => item.key === topicKey);
    const latestAttempt = topic?.attempts[0];
    setSelectedQuizTopic(topicKey);
    if (latestAttempt) openQuizAttempt(latestAttempt._id);
  };

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".academic-activity-panel",
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    },
    { scope: sectionRef, dependencies: [activeView], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      if (!selectedQuizAttemptId) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".quiz-topic-detail, .quiz-drilldown",
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.24,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    },
    {
      scope: sectionRef,
      dependencies: [
        selectedQuizAttemptId,
        selectedQuizTopic,
        quizLoadingId,
        quizError?.message,
        Boolean(selectedQuizAttemptId && quizDetails[selectedQuizAttemptId]),
      ],
      revertOnUpdate: true,
    },
  );

  const renderRecords = () => {
    if (activeView === "quiz") {
      if (!quizAttempts.length) return <AcademicEmpty label="daily quiz" />;
      return (
        <div className={styles.quizTopicWorkspace}>
          <div className={styles.quizTopicIntro}>
            <div>
              <p className="font-semibold">Performance by topic</p>
              <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
                Select a topic to open its latest quiz, then switch between previous attempts.
              </p>
            </div>
            <span>{quizTopics.length} {quizTopics.length === 1 ? "topic" : "topics"}</span>
          </div>

          <div className={styles.quizTopicGrid} aria-label="Daily quiz topics">
            {quizTopics.map((topic) => {
              const selected = activeQuizTopic?.key === topic.key;
              return (
                <button
                  key={topic.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => openQuizTopic(topic.key)}
                  className={`${styles.quizTopicCard} ${selected ? styles.quizTopicCardActive : ""}`}
                >
                  <span className={styles.quizTopicCardTop}>
                    <span className={styles.quizTopicIcon}>
                      <BookOpenCheck className="h-4 w-4" aria-hidden={true} />
                    </span>
                    <span>{topic.attempts.length} {topic.attempts.length === 1 ? "attempt" : "attempts"}</span>
                  </span>
                  <strong>{topic.label}</strong>
                  <span className={styles.quizTopicAverage}>
                    <b>{topic.averageObtained.toFixed(1).replace(".0", "")}</b>
                    <span> / {topic.averagePossible.toFixed(1).replace(".0", "")} average marks</span>
                  </span>
                  <span className={styles.quizTopicProgress} aria-hidden={true}>
                    <span style={{ width: `${Math.min(100, Math.max(0, topic.percentage))}%` }} />
                  </span>
                  <span className={styles.quizTopicPercent}>{formatPercent(topic.percentage)} average score</span>
                </button>
              );
            })}
          </div>

          {activeQuizTopic && selectedQuizAttemptId ? (
            <div className={`${styles.quizTopicDetail} quiz-topic-detail`}>
              <div className={styles.quizTopicDetailHeader}>
                <div>
                  <p className={styles.eyebrow}>Selected topic</p>
                  <h4 className="mt-1 text-lg font-semibold">{activeQuizTopic.label}</h4>
                </div>
                <span>{activeQuizTopic.attempts.length} quiz {activeQuizTopic.attempts.length === 1 ? "attempt" : "attempts"}</span>
              </div>

              <div
                className={styles.quizAttemptTabs}
                role="tablist"
                aria-label={`${activeQuizTopic.label} quiz attempts`}
              >
                {activeQuizTopic.attempts.map((attempt, index) => {
                  const obtained = Number(attempt.totalMarksObtained) || 0;
                  const possible = Number(attempt.totalMarksPossible) || 0;
                  const score = possible > 0 ? (obtained / possible) * 100 : 0;
                  const quiz = attempt.quizId && typeof attempt.quizId === "object" ? attempt.quizId : null;
                  const selected = selectedQuizAttemptId === attempt._id;
                  return (
                    <button
                      key={attempt._id || `${activeQuizTopic.key}-${index}`}
                      type="button"
                      role="tab"
                      id={`quiz-attempt-tab-${attempt._id}`}
                      aria-selected={selected}
                      aria-controls="selected-quiz-attempt-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => openQuizAttempt(attempt._id)}
                      onKeyDown={(event) => {
                        let nextIndex: number | null = null;
                        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                          nextIndex = (index + 1) % activeQuizTopic.attempts.length;
                        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                          nextIndex =
                            (index - 1 + activeQuizTopic.attempts.length) %
                            activeQuizTopic.attempts.length;
                        } else if (event.key === "Home") {
                          nextIndex = 0;
                        } else if (event.key === "End") {
                          nextIndex = activeQuizTopic.attempts.length - 1;
                        }
                        if (nextIndex === null) return;
                        event.preventDefault();
                        const nextAttempt = activeQuizTopic.attempts[nextIndex];
                        openQuizAttempt(nextAttempt._id);
                        window.requestAnimationFrame(() => {
                          document.getElementById(`quiz-attempt-tab-${nextAttempt._id}`)?.focus();
                        });
                      }}
                      className={`${styles.quizAttemptTab} ${selected ? styles.quizAttemptTabActive : ""}`}
                    >
                      <span>{quiz?.title || `Quiz ${activeQuizTopic.attempts.length - index}`}</span>
                      <strong>{formatPercent(score)}</strong>
                      <small>{formatDate(attempt.attemptedAt) || "Date unavailable"}</small>
                    </button>
                  );
                })}
              </div>

              <div
                id="selected-quiz-attempt-panel"
                role="tabpanel"
                aria-labelledby={`quiz-attempt-tab-${selectedQuizAttemptId}`}
              >
                <QuizAttemptDrilldown
                  detail={quizDetails[selectedQuizAttemptId]}
                  loading={quizLoadingId === selectedQuizAttemptId}
                  error={quizError?.attemptId === selectedQuizAttemptId ? quizError.message : undefined}
                  onRetry={() => void loadQuizAttempt(selectedQuizAttemptId, true)}
                />
              </div>
            </div>
          ) : (
            <div className={styles.quizTopicPrompt} role="status">
              <BookOpenCheck className="h-5 w-5" aria-hidden={true} />
              <div>
                <p className="font-semibold">Choose a topic to inspect its questions</p>
                <p className="mt-1 text-sm text-[var(--s360-profile-text-secondary)]">
                  The latest attempt opens first, with earlier attempts available beside it.
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeView === "mock") {
      if (!mockAttempts.length) return <AcademicEmpty label="AI mock interview" />;
      return (
        <ol className={styles.academicRecordList} aria-label="AI mock interview attempts" tabIndex={0}>
          {[...mockAttempts].reverse().map((attempt, index) => (
            <AcademicRecordCard
              key={attempt._id || attempt.callId || index}
              icon={BrainCircuit}
              title={readableToken(attempt.interviewType) || `AI mock interview ${mockAttempts.length - index}`}
              subtitle={formatDateTime(attempt.date || attempt.startedAt || attempt.createdAt) || "Attempt date not recorded"}
              status={attempt.status || "Evaluated"}
              meta={[
                { label: "Score", value: formatPercent(attempt.percentage) },
                { label: "Correct answers", value: `${attempt.correctAnswers || 0} / ${attempt.totalQuestions || 0}` },
                { label: "Duration", value: formatDuration(attempt.durationSeconds) },
                { label: "End reason", value: readableToken(attempt.endedReason) },
              ]}
              feedback={attempt.feedback}
            />
          ))}
        </ol>
      );
    }

    if (activeView === "ai-hr") {
      if (!aiHrCalls.length) return <AcademicEmpty label="AI HR call" />;
      return (
        <ol className={styles.academicRecordList} aria-label="AI HR call attempts" tabIndex={0}>
          {aiHrCalls.map((call, index) => {
            const outcome = call.analysis?.outcome || call.analysis?.overallRating || call.analysisStatus;
            return (
              <AcademicRecordCard
                key={`${call.started_at || "call"}-${index}`}
                icon={Headphones}
                title={`AI HR call ${aiHrCalls.length - index}`}
                subtitle={formatDateTime(call.started_at) || "Call date not recorded"}
                status={outcome || "Processing"}
                meta={[
                  { label: "AI score", value: Number.isFinite(Number(call.analysis?.scoreOutOf10)) ? `${call.analysis?.scoreOutOf10}/10` : "Not scored" },
                  { label: "Duration", value: formatDuration(call.duration_s) },
                  { label: "Analysis", value: readableToken(call.analysisStatus) },
                  { label: "End reason", value: readableToken(call.end_reason) },
                ]}
                feedback={call.analysis?.summary || call.analysis?.feedback}
              />
            );
          })}
        </ol>
      );
    }

    if (activeView === "real-hr") {
      if (!realHrCalls.length) return <AcademicEmpty label="real HR call" />;
      return (
        <ol className={styles.academicRecordList} aria-label="Real HR call attempts" tabIndex={0}>
          {realHrCalls.map(({ day, attempt }, index) => (
            <AcademicRecordCard
              key={attempt.recordingId || `${day}-${index}`}
              icon={PhoneCall}
              title={`Real HR call ${realHrCalls.length - index}`}
              subtitle={formatDateTime(attempt.time) || formatDate(day) || "Call date not recorded"}
              status={attempt.outcome || attempt.status || "Recorded"}
              meta={[
                { label: "Call type", value: readableToken(attempt.type) },
                { label: "Duration", value: attempt.durationLabel || formatDuration(attempt.durationSeconds) },
                { label: "Confidence", value: attempt.confidence === null || attempt.confidence === undefined ? "Not scored" : `${attempt.confidence}%` },
                { label: "Follow-up", value: attempt.followUpRequired ? attempt.followUpAction || "Required" : "Not required" },
              ]}
              feedback={[attempt.summary, attempt.studentResponseFeedback].filter(Boolean).join("\n\n")}
              issues={[...(attempt.issues || []), ...(attempt.flags || [])]}
              audioUrl={attempt.publicUrl}
            />
          ))}
        </ol>
      );
    }

    if (!megaTestAttempts.length) return <AcademicEmpty label="mega test" />;
    return (
      <ol className={styles.academicRecordList} aria-label="Mega test attempts" tabIndex={0}>
        {[...megaTestAttempts].reverse().map((attempt, index) => (
          <AcademicRecordCard
            key={attempt._id || index}
            icon={Trophy}
            title={attempt.examTitle || `Mega test ${megaTestAttempts.length - index}`}
            subtitle={formatDateTime(attempt.evaluatedAt) || "Evaluation date not recorded"}
            status={attempt.status || attempt.grade || "Evaluated"}
            meta={[
              { label: "Course", value: attempt.course || "Not recorded" },
              { label: "Marks", value: `${attempt.obtainedMarks || 0} / ${attempt.totalMarks || 0}` },
              { label: "Score", value: formatPercent(attempt.percentage) },
              { label: "Grade", value: attempt.grade || "Not assigned" },
            ]}
            feedback={attempt.overallFeedback}
          />
        ))}
      </ol>
    );
  };

  return (
    <section
      ref={sectionRef}
      id="academics"
      className={`student360-profile-section ${styles.glassCard} ${styles.academicSection} rounded-2xl p-5 sm:p-6`}
      aria-labelledby="academics-heading"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={styles.eyebrow}>Academic performance</p>
          <h2 id="academics-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Learning and placement activities
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
            Daily learning, AI practice, HR interactions, and assessment results in one student record.
          </p>
        </div>
        <span className={styles.academicCount}>
          {quizAttempts.length + mockAttempts.length + aiHrCalls.length + realHrCalls.length + megaTestAttempts.length} total activities
        </span>
      </div>

      {!sourceAvailable ? (
        <div className={styles.academicEmpty} role="status">
          <span>
            <AlertCircle className="h-5 w-5" aria-hidden={true} />
          </span>
          <div>
            <p className="font-semibold">Academic records are temporarily unavailable</p>
            <p className="mt-1 text-sm leading-6 text-[var(--s360-profile-text-secondary)]">
              The LMS academic service did not respond. Refresh this profile to try again.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.academicTabs} role="tablist" aria-label="Academic activity types">
            {activityTabs.map(({ id, label, count, insight, icon: ActivityIcon }, index) => {
              const active = id === activeView;
              return (
                <button
                  key={id}
                  type="button"
                  id={`academic-tab-${id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`academic-panel-${id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setActiveView(id)}
                  onKeyDown={(event) => {
                    let nextIndex: number | null = null;
                    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % activityTabs.length;
                    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + activityTabs.length) % activityTabs.length;
                    if (event.key === "Home") nextIndex = 0;
                    if (event.key === "End") nextIndex = activityTabs.length - 1;
                    if (nextIndex === null) return;
                    event.preventDefault();
                    const nextActivity = activityTabs[nextIndex];
                    setActiveView(nextActivity.id);
                    window.requestAnimationFrame(() => document.getElementById(`academic-tab-${nextActivity.id}`)?.focus());
                  }}
                  className={`${styles.academicTab} ${active ? styles.academicTabActive : ""}`}
                >
                  <span className={styles.academicTabIcon}><ActivityIcon className="h-4 w-4" aria-hidden={true} /></span>
                  <span className="min-w-0">
                    <span className={styles.academicTabLabel}>{label}</span>
                    <strong>{count}</strong>
                    <span className={styles.academicTabInsight}>{insight}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            key={activeView}
            id={`academic-panel-${activeView}`}
            role="tabpanel"
            aria-labelledby={`academic-tab-${activeView}`}
            tabIndex={0}
            className={`academic-activity-panel ${styles.academicActivityPanel} focus-visible:outline-none [will-change:transform,opacity]`}
          >
            <div className={styles.academicPanelHeader}>
              <div>
                <p className={styles.eyebrow}>Selected activity</p>
                <h3 className="mt-1 text-lg font-semibold">{activeActivity.label}</h3>
              </div>
              <span>{activeActivity.count} {activeActivity.count === 1 ? "record" : "records"}</span>
            </div>
            {renderRecords()}
          </div>
        </>
      )}
    </section>
  );
}

export default function Student360Profile({ studentId }: { studentId: string }) {
  const pageRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSection, setActiveSection] =
    useState<ProfileSection>("personal");

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    fetch(`/api/student-360/students/${encodeURIComponent(studentId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "Could not load this student.");
        }
        setProfile(payload as ProfileResponse);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Could not load this student.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey, studentId]);

  useGSAP(
    () => {
      if (loading || error || !profile) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          defaults: { duration: 0.46, ease: "power3.out" },
        });
        timeline
          .from(".student360-profile-identity", {
            autoAlpha: 0,
            y: 14,
            clearProps: "transform,opacity,visibility",
          })
          .from(
            ".student360-header-fact",
            {
              autoAlpha: 0,
              y: 8,
              duration: 0.3,
              stagger: 0.045,
              clearProps: "transform,opacity,visibility",
            },
            "-=0.24",
          )
          .from(
            ".student360-profile-nav",
            {
              autoAlpha: 0,
              x: -12,
              duration: 0.38,
              clearProps: "transform,opacity,visibility",
            },
            "-=0.16",
          )
          .from(
            ".student360-nav-item",
            {
              autoAlpha: 0,
              x: -8,
              duration: 0.28,
              stagger: 0.04,
              clearProps: "transform,opacity,visibility",
            },
            "-=0.2",
          );
      });
      return () => media.revert();
    },
    {
      scope: pageRef,
      dependencies: [loading, error, refreshKey, Boolean(profile)],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      if (loading || error || !profile) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".student360-tab-panel",
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.32,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    },
    {
      scope: contentRef,
      dependencies: [activeSection, loading, error, Boolean(profile)],
      revertOnUpdate: true,
    },
  );

  const student = profile?.student;
  const zone = zoneContent(student?.zone);

  const personalItems = useMemo<DetailItem[]>(
    () => [
      { label: "Full name", value: student?.fullName, icon: UserRound },
      { label: "Enrollment ID", value: student?.enrollmentId, icon: ClipboardList },
      { label: "Email address", value: student?.email, icon: Mail },
      { label: "Mobile number", value: student?.mobile, icon: Phone },
      { label: "Father / Guardian", value: student?.fathersName, icon: UsersRound },
      { label: "Internal Clerk ID", value: student?.clerkId, icon: ShieldCheck },
      { label: "Residential address", value: student?.address, icon: MapPin, wide: true },
      {
        label: "Purchased course(s)",
        value: student?.courseNames?.length ? student.courseNames.join(", ") : null,
        icon: BookOpenCheck,
        wide: true,
      },
      { label: "Current batch", value: student?.batch, icon: Layers3 },
      { label: "Learning mode", value: readableToken(student?.mode), icon: GraduationCap },
      { label: "Qualification", value: student?.degree, icon: GraduationCap },
      { label: "Pass-out year", value: student?.passoutYear, icon: CalendarDays },
      { label: "Joined month", value: student?.joinedMonth, icon: CalendarDays },
      { label: "Student status", value: student?.status, icon: CircleUserRound },
      { label: "Current zone", value: zone.label, icon: ShieldCheck },
      {
        label: "Admission form",
        value:
          student?.admissionForm === true
            ? "Completed"
            : student?.admissionForm === false
              ? "Not completed"
              : null,
        icon: ClipboardList,
      },
    ],
    [student, zone.label],
  );

  const sectionTabs: Array<{
    id: ProfileSection;
    label: string;
    description: string;
    icon: typeof UserRound;
  }> = [
    {
      id: "personal",
      label: "Personal details",
      description: "Identity, enrollment and current zone",
      icon: UserRound,
    },
    {
      id: "preplacement",
      label: "Pre-placement fee",
      description: profile?.preplacementFee
        ? `${formatCurrency(profile.preplacementFee.remainingFee)} remaining`
        : "No linked fee record",
      icon: WalletCards,
    },
    {
      id: "postplacement",
      label: "Post-placement fee",
      description: profile?.postplacementFee
        ? `${formatCurrency(profile.postplacementFee.remainingFee)} remaining`
        : "No linked fee record",
      icon: Building2,
    },
    {
      id: "interviews",
      label: "Interviews",
      description: profile?.meta.interviewSourceAvailable
        ? `${profile.interviews.summary.total} recorded`
        : "Records unavailable",
      icon: BriefcaseBusiness,
    },
    {
      id: "academics",
      label: "Academics",
      description: profile?.meta.academicSourceAvailable
        ? `${
            (profile.academics.dailyQuiz?.attempts?.length || 0) +
            (profile.academics.aiMockInterviews?.attempts?.length || 0) +
            profile.academics.aiHrCalls.length +
            (profile.academics.realHrCalls?.stats?.total || 0) +
            (profile.academics.megaTests?.attempts?.length || 0)
          } tracked activities`
        : "Records unavailable",
      icon: GraduationCap,
    },
  ];

  return (
    <main
      ref={pageRef}
      className={`${styles.page} min-h-screen px-4 py-5 sm:px-6 lg:px-8`}
    >
      <div className="mx-auto max-w-[1500px]">
        <header className={`${styles.profileTopbar} mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <Link
              href="/student_360"
              className={`${styles.backLink} inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold focus-visible:outline-none`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to student search
            </Link>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--s360-profile-text-muted)]">
              Complete student lifecycle dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className={`${styles.glassControl} inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className={`${styles.glassControl} inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold focus-visible:outline-none`}
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div aria-label="Loading student profile" aria-busy="true">
            <div className={`${styles.glassCard} h-32 animate-pulse rounded-2xl motion-reduce:animate-none`} />
            <div className="mt-5 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className={`${styles.glassCard} h-64 animate-pulse rounded-2xl motion-reduce:animate-none`} />
              <div className="space-y-5">
                <div className={`${styles.glassCard} h-28 animate-pulse rounded-2xl motion-reduce:animate-none`} />
                <div className={`${styles.glassCard} h-80 animate-pulse rounded-2xl motion-reduce:animate-none`} />
              </div>
            </div>
          </div>
        ) : error ? (
          <section role="alert" className={`${styles.errorGlass} rounded-2xl p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="font-semibold">Student profile could not be loaded</h1>
                  <p className="mt-1 text-sm text-[var(--s360-profile-text-secondary)]">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="min-h-11 cursor-pointer rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              >
                Try again
              </button>
            </div>
          </section>
        ) : student && profile ? (
          <>
            <section
              className={`student360-profile-identity ${styles.glassCard} ${styles.identityCard} rounded-2xl p-5 [will-change:transform,opacity]`}
              aria-labelledby="student-name"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <span className={`${styles.avatar} flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold`}>
                    {initials(student.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className={`${styles.eyebrow} mb-1`}>Student command profile</p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 id="student-name" className="truncate text-xl font-semibold sm:text-2xl">
                        {student.fullName || "Unnamed student"}
                      </h1>
                      <span className={`${styles.statusPill} rounded-full px-2.5 py-1 text-xs font-semibold`}>
                        {student.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--s360-profile-text-secondary)]">
                      {student.enrollmentId || "Enrollment ID unavailable"}
                      {student.courseNames.length ? ` · ${student.courseNames.join(", ")}` : ""}
                      {student.batch ? ` · ${student.batch}` : ""}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[660px]">
                  <div className={`student360-header-fact ${styles.headerFact}`}>
                    <dt>Courses</dt>
                    <dd>{student.courseNames.length || "—"}</dd>
                  </div>
                  <div className={`student360-header-fact ${styles.headerFact}`}>
                    <dt>Current batch</dt>
                    <dd title={student.batch || undefined}>{student.batch || "Not available"}</dd>
                  </div>
                  <div className={`student360-header-fact ${styles.headerFact}`}>
                    <dt>Pre-fee balance</dt>
                    <dd>
                      {profile.preplacementFee
                        ? formatCurrency(profile.preplacementFee.remainingFee)
                        : "No record"}
                    </dd>
                  </div>
                  <div className={`student360-header-fact ${styles.headerFact}`}>
                    <dt>Post-fee balance</dt>
                    <dd>
                      {profile.postplacementFee
                        ? formatCurrency(profile.postplacementFee.remainingFee)
                        : "No record"}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
              <aside
                className={`student360-profile-nav ${styles.glassCard} ${styles.sectionNav} rounded-2xl p-3 [will-change:transform,opacity] lg:sticky lg:top-5`}
                aria-label="Student dashboard sections"
              >
                <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--s360-profile-text-muted)]">
                  Student workspace
                </p>
                <nav
                  className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
                  role="tablist"
                  aria-label="Student information views"
                >
                  {sectionTabs.map(({ id, label, description, icon: NavIcon }) => {
                    const active = activeSection === id;
                    const tabIndex = sectionTabs.findIndex((tab) => tab.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`student360-tab-${id}`}
                        aria-selected={active}
                        aria-controls={`student360-panel-${id}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setActiveSection(id)}
                        onKeyDown={(event) => {
                          let nextIndex: number | null = null;
                          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                            nextIndex = (tabIndex + 1) % sectionTabs.length;
                          } else if (
                            event.key === "ArrowUp" ||
                            event.key === "ArrowLeft"
                          ) {
                            nextIndex =
                              (tabIndex - 1 + sectionTabs.length) % sectionTabs.length;
                          } else if (event.key === "Home") {
                            nextIndex = 0;
                          } else if (event.key === "End") {
                            nextIndex = sectionTabs.length - 1;
                          }

                          if (nextIndex === null) return;
                          event.preventDefault();
                          const nextTab = sectionTabs[nextIndex];
                          setActiveSection(nextTab.id);
                          window.requestAnimationFrame(() => {
                            document.getElementById(`student360-tab-${nextTab.id}`)?.focus();
                          });
                        }}
                        className={`student360-nav-item ${styles.navItem} ${active ? styles.navItemActive : ""} group flex min-h-[78px] min-w-[240px] cursor-pointer items-center gap-3 rounded-xl px-3.5 text-left focus-visible:outline-none lg:w-full lg:min-w-0`}
                      >
                        <span className={styles.navIcon}>
                          <NavIcon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className={styles.navDescription}>{description}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              <div ref={contentRef} className={`${styles.contentCanvas} min-w-0`}>
                {activeSection === "personal" ? (
                  <div
                    id="student360-panel-personal"
                    role="tabpanel"
                    aria-labelledby="student360-tab-personal"
                    tabIndex={0}
                    className="student360-tab-panel space-y-5 focus-visible:outline-none [will-change:transform,opacity]"
                  >
                <section
                  className={`student360-zone-banner ${styles.zoneBanner} ${zone.className} rounded-2xl p-5 sm:p-6`}
                  aria-labelledby="zone-heading"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
                        Current student zone
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className={styles.zoneDot} aria-hidden="true" />
                        <h2 id="zone-heading" className="text-2xl font-semibold tracking-tight">
                          {zone.label}
                        </h2>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">{zone.summary}</p>
                    </div>
                    <div className={`${styles.zoneMeta} rounded-xl px-4 py-3 text-left sm:text-right`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] opacity-65">
                        Zone updated
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(student.zoneChangedAt) || "Date not available"}
                      </p>
                    </div>
                  </div>
                </section>

                {!profile.meta.preplacementSourceAvailable ? (
                  <div className={`${styles.sourceNotice} rounded-xl px-4 py-3 text-sm`} role="status">
                    The LMS pre-placement profile is currently unavailable. Core LMS fields are shown; additional personal fields may appear after the service reconnects.
                  </div>
                ) : !profile.meta.preplacementRecordFound ? (
                  <div className={`${styles.sourceNotice} rounded-xl px-4 py-3 text-sm`} role="status">
                    No matching LMS pre-placement record was found. Available student fields are shown.
                  </div>
                ) : null}

                <DetailSection
                  id="personal-details"
                  eyebrow="Student profile"
                  title="Personal, academic and account details"
                  description="Essential identity, contact, enrollment, and current account information."
                  items={personalItems}
                />
                <SignatureApprovalCard
                  signatureUrl={student.digitalSignatureUrl}
                  studentName={student.fullName}
                />
                  </div>
                ) : activeSection === "preplacement" ? (
                  <div
                    id="student360-panel-preplacement"
                    role="tabpanel"
                    aria-labelledby="student360-tab-preplacement"
                    tabIndex={0}
                    className="student360-tab-panel focus-visible:outline-none [will-change:transform,opacity]"
                  >
                    <PreplacementFeeSection fee={profile.preplacementFee} />
                  </div>
                ) : activeSection === "postplacement" ? (
                  <div
                    id="student360-panel-postplacement"
                    role="tabpanel"
                    aria-labelledby="student360-tab-postplacement"
                    tabIndex={0}
                    className="student360-tab-panel focus-visible:outline-none [will-change:transform,opacity]"
                  >
                    <PostplacementFeeSection fee={profile.postplacementFee} />
                  </div>
                ) : activeSection === "interviews" ? (
                  <div
                    id="student360-panel-interviews"
                    role="tabpanel"
                    aria-labelledby="student360-tab-interviews"
                    tabIndex={0}
                    className="student360-tab-panel focus-visible:outline-none [will-change:transform,opacity]"
                  >
                    <InterviewsSection
                      summary={profile.interviews.summary}
                      interviews={profile.interviews.records}
                      sourceAvailable={profile.meta.interviewSourceAvailable}
                    />
                  </div>
                ) : (
                  <div
                    id="student360-panel-academics"
                    role="tabpanel"
                    aria-labelledby="student360-tab-academics"
                    tabIndex={0}
                    className="student360-tab-panel focus-visible:outline-none [will-change:transform,opacity]"
                  >
                    <AcademicsSection
                      data={profile.academics}
                      sourceAvailable={profile.meta.academicSourceAvailable}
                      studentId={student.id}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
