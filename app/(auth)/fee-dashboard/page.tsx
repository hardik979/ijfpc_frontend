"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AttendanceGate } from "@/components/AttendanceLink";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

type Status = "ACTIVE" | "PAUSED" | "PLACED";
type StatusFilter = Status | "ALL";
type Zone = "blue" | "yellow" | "green" | "newly_enrolled";
type ZoneFilter = Zone | "ALL";

type FeeSummary = {
  id: string;
  totalFee: number;
  paid: number;
  remaining: number;
  refunded?: number;
  discount?: number;
  records?: number;
  status?: string | null;
};

type DashboardSummary = {
  students: {
    total: number;
    active: number;
    paused: number;
    placed: number;
    zones: Record<Zone, number>;
    courses: Array<{
      courseId: string;
      courseName: string;
      total: number;
      zones: Record<Zone, number>;
    }>;
  };
  revenue: {
    month: string | null;
    totalCollected: number;
    prePlacement: { collected: number; totalFee: number; remaining: number };
    postPlacement: {
      collected: number;
      totalFee: number;
      discount: number;
      remaining: number;
    };
  };
};

type StudentRow = {
  _id: string;
  clerkId?: string | null;
  name: string;
  email?: string | null;
  enrollmentId?: string | null;
  zone: Zone;
  status: Status;
  joinedMonth?: string | null;
  batch?: string | null;
  courseNames: string[];
  courseName?: string | null;
  preplacementFee: FeeSummary | null;
  postplacementFee: FeeSummary | null;
};

type Payment = {
  _id?: string;
  amount: number;
  date?: string | null;
  mode?: string;
  receiptNos?: string[];
  note?: string;
};

type StudentDetail = {
  student: StudentRow;
  preplacementFee:
    | (FeeSummary & {
        dueDate?: string | null;
        payments: Payment[];
        refunds: Payment[];
      })
    | null;
  postplacementFees: Array<{
    id: string;
    studentName: string;
    companyName?: string | null;
    location?: string | null;
    offerDate?: string | null;
    joiningDate?: string | null;
    packageLPA?: number | null;
    totalFee: number;
    carriedPreplacementFee: number;
    discount: number;
    paid: number;
    remaining: number;
    remainingFeeNote?: string | null;
    installments: Payment[];
  }>;
};

type StudentsResponse = {
  page: number;
  limit: number;
  total: number;
  rows: StudentRow[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  students: {
    total: 0,
    active: 0,
    paused: 0,
    placed: 0,
    zones: { blue: 0, yellow: 0, green: 0, newly_enrolled: 0 },
    courses: [],
  },
  revenue: {
    month: null,
    totalCollected: 0,
    prePlacement: { collected: 0, totalFee: 0, remaining: 0 },
    postPlacement: { collected: 0, totalFee: 0, discount: 0, remaining: 0 },
  },
};

const STATUS_STYLES: Record<Status, string> = {
  ACTIVE: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  PAUSED: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  PLACED: "border-sky-400/25 bg-sky-400/10 text-sky-100",
};

const ZONES: Array<{ value: Zone; label: string; color: string }> = [
  { value: "blue", label: "Blue zone", color: "bg-sky-400" },
  { value: "yellow", label: "Yellow zone", color: "bg-amber-400" },
  { value: "green", label: "Green zone", color: "bg-emerald-400" },
  { value: "newly_enrolled", label: "Newly enrolled", color: "bg-violet-400" },
];

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }
  return body as T;
}

type CourseBreakdown = DashboardSummary["students"]["courses"][number];

async function loadAllActiveStudents(): Promise<StudentRow[]> {
  const limit = 100;
  const firstPage = await getJSON<StudentsResponse>(
    `/api/fee-dashboard/students?status=ACTIVE&page=1&limit=${limit}`,
  );
  const pageCount = Math.ceil(firstPage.total / limit);
  const remainingPages =
    pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) =>
            getJSON<StudentsResponse>(
              `/api/fee-dashboard/students?status=ACTIVE&page=${index + 2}&limit=${limit}`,
            ),
          ),
        )
      : [];

  return [...firstPage.rows, ...remainingPages.flatMap((page) => page.rows)];
}

async function loadCourseBreakdownFromStudents(): Promise<CourseBreakdown[]> {
  const students = await loadAllActiveStudents();
  const courses = new Map<string, CourseBreakdown>();

  for (const student of students) {
    const zone = ZONES.some((item) => item.value === student.zone)
      ? student.zone
      : "newly_enrolled";
    const courseNames = student.courseNames?.length
      ? student.courseNames
      : student.courseName
        ? [student.courseName]
        : [];

    for (const courseName of new Set(
      courseNames.map((name) => name.trim()).filter(Boolean),
    )) {
      const courseKey = courseName.toLowerCase();
      const course = courses.get(courseKey) || {
        courseId: `course-${courseKey}`,
        courseName,
        total: 0,
        zones: { blue: 0, yellow: 0, green: 0, newly_enrolled: 0 },
      };
      course.total += 1;
      course.zones[zone] += 1;
      courses.set(courseKey, course);
    }
  }

  return [...courses.values()].sort(
    (left, right) =>
      right.total - left.total ||
      left.courseName.localeCompare(right.courseName),
  );
}

export default function FeeDashboardPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [revenueMonth, setRevenueMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentsModal, setStudentsModal] = useState<{
    open: boolean;
    status: StatusFilter;
    zone: ZoneFilter;
  }>({ open: false, status: "ALL", zone: "ALL" });
  const [selectedCourse, setSelectedCourse] = useState<CourseBreakdown | null>(
    null,
  );

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = revenueMonth
        ? `?month=${encodeURIComponent(revenueMonth)}`
        : "";
      const data = await getJSON<DashboardSummary>(
        `/api/fee-dashboard/summary${query}`,
      );
      let courses = Array.isArray(data.students?.courses)
        ? data.students.courses
        : [];
      if (!courses.length && data.students.active > 0) {
        courses = await loadCourseBreakdownFromStudents();
      }
      setSummary({
        ...data,
        students: {
          ...data.students,
          courses,
        },
      });
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [revenueMonth]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const monthOptions = useMemo(() => {
    const options = [{ value: "", label: "All time" }];
    const now = new Date();
    for (let index = 0; index < 12; index += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      options.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        }),
      });
    }
    return options;
  }, []);

  const openStudents = (status: StatusFilter, zone: ZoneFilter = "ALL") =>
    setStudentsModal({ open: true, status, zone });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(45,212,191,0.10),transparent_28%),linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:auto,auto,32px_32px,32px_32px]" />

      <div className="relative mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-700/70 bg-slate-900/65 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:p-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Contains all Financial and Academics details of students
            </p>
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                IJF Executive Dashboard
              </h1>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 text-sm font-semibold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          <article className="rounded-3xl border border-slate-700/70 bg-slate-900/65 p-6 shadow-xl shadow-black/15 backdrop-blur-xl lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Active students by course
                </h2>
              </div>
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sky-200">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => openStudents("ACTIVE")}
              className="mt-6 flex w-full items-end justify-between rounded-2xl border border-slate-700 bg-[#0a1626]/80 p-5 text-left transition hover:border-sky-400/50 hover:bg-[#0d1b2d]"
            >
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total active students
                </span>
                <span className="mt-2 block text-4xl font-bold text-white">
                  {loading ? "--" : summary.students.active}
                </span>
              </span>
              <span className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-sky-300">
                View students <ArrowRight className="h-4 w-4" />
              </span>
            </button>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-2xl border border-slate-700 bg-slate-800/45"
                  />
                ))
              ) : (summary.students.courses?.length ?? 0) > 0 ? (
                (summary.students.courses ?? []).map((course) => (
                  <button
                    type="button"
                    key={course.courseId}
                    onClick={() => setSelectedCourse(course)}
                    className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/55 text-left transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  >
                    <div className="flex min-h-20 items-start justify-between gap-3 border-b border-slate-700/80 px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold leading-5 text-slate-100">
                          {course.courseName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Active enrollment
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block text-2xl font-bold text-white">
                          {course.total}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          students
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-slate-700/70">
                      {ZONES.map((zone) => (
                        <div
                          key={zone.value}
                          className="flex items-center justify-between gap-2 bg-[#111e30] px-3 py-2.5"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-400">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${zone.color}`}
                            />
                            <span className="truncate">
                              {zone.label.replace(" zone", "")}
                            </span>
                          </span>
                          <span className="text-sm font-bold text-slate-100">
                            {course.zones[zone.value]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-5 py-8 text-center text-sm text-slate-500">
                  No active course enrollments found.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-700/70 bg-slate-900/65 p-6 shadow-xl shadow-black/15 backdrop-blur-xl lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Collected revenue
                  </p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {loading ? "--" : formatINR(summary.revenue.totalCollected)}
                  </p>
                </div>
              </div>
              <select
                value={revenueMonth}
                onChange={(event) => setRevenueMonth(event.target.value)}
                aria-label="Revenue period"
                className="h-11 rounded-xl border border-slate-600 bg-[#0a1626] px-4 text-sm font-semibold text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <RevenueCard
                href="/fee-dashboard/pre-placement"
                title="Pre-placement fee"
                collected={summary.revenue.prePlacement.collected}
                remaining={summary.revenue.prePlacement.remaining}
                loading={loading}
                tone="sky"
              />
              <RevenueCard
                href="/fee-dashboard/post-placement"
                title="Post-placement fee"
                collected={summary.revenue.postPlacement.collected}
                remaining={summary.revenue.postPlacement.remaining}
                loading={loading}
                tone="teal"
              />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-violet-400/25 bg-violet-400/[0.07] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-violet-200">
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-violet-100">
                  Total placed students
                </span>
              </div>
              <span className="text-3xl font-bold tracking-tight text-white">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
                ) : (
                  summary.students.placed
                )}
              </span>
            </div>

            <Link
              href="/student_360"
              className="group mt-4 flex items-center justify-between gap-4 rounded-2xl border border-sky-400/25 bg-sky-400/[0.07] px-5 py-4 transition hover:border-sky-400/50 hover:bg-sky-400/10"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-200">
                  <Search className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  Want to know about a specific student? Check Student 360.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-sky-300 transition-transform group-hover:translate-x-1" />
            </Link>
            {/* Personal attendance only: hidden for Super Admin, who gets the
                company-wide view, and for anyone with no employee record. */}
            <AttendanceGate>
            <Link
              href="/my-attendance"
              className="group mt-4 flex items-center justify-between gap-4 rounded-2xl border border-sky-400/25 bg-sky-400/[0.07] px-5 py-4 transition hover:border-sky-400/50 hover:bg-sky-400/10"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-200">
                  <Search className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  Check attendance report from here
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-sky-300 transition-transform group-hover:translate-x-1" />
            </Link>
            </AttendanceGate>
          </article>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Reports
          </h2>
          <Link
            href="/studentOverview"
            className="group flex max-w-md items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/60 p-5 backdrop-blur transition hover:border-sky-400/40 hover:bg-slate-900"
          >
            <span className="flex items-center gap-3">
              <span className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-2.5 text-sky-200">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-white">
                  Student Overview
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  Open the complete student report
                </span>
              </span>
            </span>
            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-300" />
          </Link>
        </section>
      </div>

      {studentsModal.open && (
        <StudentsModal
          initialStatus={studentsModal.status}
          initialZone={studentsModal.zone}
          onClose={() =>
            setStudentsModal((current) => ({ ...current, open: false }))
          }
        />
      )}

      {selectedCourse && (
        <CourseStudentsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </main>
  );
}

function StatusButton({
  label,
  count,
  tone = "slate",
  onClick,
}: {
  label: string;
  count: number;
  tone?: "slate" | "amber" | "emerald";
  onClick: () => void;
}) {
  const tones = {
    slate: "border-slate-700 bg-slate-800/45 text-white",
    amber: "border-amber-400/20 bg-amber-400/[0.06] text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition hover:border-slate-500 ${tones[tone]}`}
    >
      <span className="text-xs uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="mt-1 block text-xl font-bold">{count}</span>
    </button>
  );
}

function RevenueCard({
  href,
  title,
  collected,
  remaining,
  loading,
  tone,
}: {
  href: string;
  title: string;
  collected: number;
  remaining: number;
  loading: boolean;
  tone: "sky" | "teal";
}) {
  const styles =
    tone === "sky"
      ? "border-sky-400/20 bg-sky-400/[0.06] text-sky-200 hover:border-sky-400/45 hover:bg-sky-400/10"
      : "border-teal-400/20 bg-teal-400/[0.06] text-teal-200 hover:border-teal-400/45 hover:bg-teal-400/10";
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 ${styles}`}
    >
      <span className="flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">
          {tone === "sky" ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <Clock3 className="h-4 w-4" />
          )}
          {title}
        </span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
      <span className="mt-5 block text-2xl font-bold text-white">
        {loading ? "--" : formatINR(collected)}
      </span>
      <span className="mt-2 block text-xs text-slate-400">
        Outstanding: {formatINR(remaining)}
      </span>
    </Link>
  );
}

function StudentsModal({
  initialStatus,
  initialZone,
  onClose,
}: {
  initialStatus: StatusFilter;
  initialZone: ZoneFilter;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [zone, setZone] = useState(initialZone);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 20;

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
      });
      if (zone !== "ALL") params.set("zone", zone);
      if (appliedSearch) params.set("search", appliedSearch);
      setData(
        await getJSON<StudentsResponse>(
          `/api/fee-dashboard/students?${params}`,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load students",
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, status, zone]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const openDetail = async (studentId: string) => {
    setDetailLoading(true);
    setError("");
    try {
      setDetail(
        await getJSON<StudentDetail>(
          `/api/fee-dashboard/students/${studentId}`,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load fee details",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020712]/85 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Student fee records"
    >
      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#0a1422] shadow-2xl shadow-black/50">
        <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Student fee records
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              LMS student breakdown
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </header>

        <div className="border-b border-slate-700 bg-slate-900/50 p-4 sm:px-7">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_190px_auto]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setAppliedSearch(search.trim());
              }}
              className="relative"
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or enrollment ID"
                className="h-11 w-full rounded-xl border border-slate-600 bg-[#07111f] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </form>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-600 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-sky-400"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="PLACED">Placed</option>
            </select>
            <select
              value={zone}
              onChange={(event) => {
                setZone(event.target.value as ZoneFilter);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-600 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-sky-400"
            >
              <option value="ALL">All zones</option>
              {ZONES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setAppliedSearch(search.trim());
              }}
              className="h-11 rounded-xl bg-sky-500 px-5 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
            >
              Search
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-400/20 bg-rose-400/10 px-7 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full min-h-64 items-center justify-center gap-3 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
              Loading students...
            </div>
          ) : data?.rows.length ? (
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-700 bg-[#0d1928] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-4 py-4">Course & batch</th>
                  <th className="px-4 py-4">Zone</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Pre-placement</th>
                  <th className="px-4 py-4">Post-placement</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.rows.map((student) => (
                  <tr
                    key={student._id}
                    className="bg-[#0a1422] transition hover:bg-slate-800/55"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {student.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {student.email ||
                          student.enrollmentId ||
                          "No contact ID"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-64 font-medium text-slate-200">
                        {student.courseName || "No course title"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {student.batch || "No batch"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <ZoneBadge zone={student.zone} />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <FeeCell fee={student.preplacementFee} />
                    </td>
                    <td className="px-4 py-4">
                      <FeeCell fee={student.postplacementFee} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void openDetail(student._id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-400/15"
                      >
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 text-slate-600" />
              <p className="mt-3 font-semibold text-slate-200">
                No students found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different status, zone, or search.
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-700 bg-slate-900/60 px-5 py-4 text-sm sm:px-7">
          <span className="text-slate-400">
            Page {page} · {data?.total || 0} students
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-600 px-3 font-semibold text-slate-200 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Prev
            </button>
            <button
              type="button"
              disabled={page * limit >= (data?.total || 0)}
              onClick={() => setPage((value) => value + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-600 px-3 font-semibold text-slate-200 disabled:opacity-40"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>

      {(detailLoading || detail) && (
        <StudentFeeDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function CourseStudentsModal({
  course,
  onClose,
}: {
  course: CourseBreakdown;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [zone, setZone] = useState<ZoneFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    void loadAllActiveStudents()
      .then((rows) => {
        if (!mounted) return;
        const selectedCourse = course.courseName.trim().toLowerCase();
        const matchingStudents = rows
          .filter((student) => {
            const courseNames = student.courseNames?.length
              ? student.courseNames
              : student.courseName
                ? [student.courseName]
                : [];
            return courseNames.some(
              (name) => name.trim().toLowerCase() === selectedCourse,
            );
          })
          .sort((left, right) => left.name.localeCompare(right.name));
        setStudents(matchingStudents);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load course students",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [course.courseName]);

  const zoneCounts = useMemo(() => {
    const counts: Record<Zone, number> = {
      blue: 0,
      yellow: 0,
      green: 0,
      newly_enrolled: 0,
    };
    students.forEach((student) => {
      if (Object.prototype.hasOwnProperty.call(counts, student.zone)) {
        counts[student.zone] += 1;
      }
    });
    return counts;
  }, [students]);

  const visibleStudents = useMemo(
    () =>
      zone === "ALL"
        ? students
        : students.filter((student) => student.zone === zone),
    [students, zone],
  );

  const filters: Array<{
    value: ZoneFilter;
    label: string;
    count: number;
    color: string;
  }> = [
    {
      value: "ALL",
      label: "All zones",
      count: students.length,
      color: "bg-slate-300",
    },
    ...ZONES.map((item) => ({
      value: item.value,
      label: item.label,
      count: zoneCounts[item.value],
      color: item.color,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#020712]/90 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${course.courseName} students`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#091421] shadow-2xl shadow-black/50">
        <header className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Active course roster
            </p>
            <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
              {course.courseName}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {loading
                ? "Loading students..."
                : `${students.length} active students`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </header>

        <div className="border-b border-slate-700 bg-slate-900/45 px-5 py-4 sm:px-7">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Filter students by zone
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const selected = zone === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setZone(filter.value)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    selected
                      ? "border-sky-400/60 bg-sky-400/15 text-white ring-2 ring-sky-400/10"
                      : "border-slate-700 bg-slate-800/55 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${filter.color}`} />
                  {filter.label}
                  <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-[11px] text-slate-200">
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-400/20 bg-rose-400/10 px-7 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full min-h-64 items-center justify-center gap-3 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
              Loading course roster...
            </div>
          ) : visibleStudents.length ? (
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-700 bg-[#0d1928] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-5 py-4">Batch</th>
                  <th className="px-5 py-4">Zone</th>
                  <th className="px-6 py-4">Enrollment ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibleStudents.map((student) => (
                  <tr
                    key={student._id}
                    className="transition hover:bg-slate-800/55"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">{student.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {student.email || "Email not recorded"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-200">
                      {student.batch || "No batch assigned"}
                    </td>
                    <td className="px-5 py-4">
                      <ZoneBadge zone={student.zone} />
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {student.enrollmentId || "Not recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
              <Users className="h-10 w-10 text-slate-600" />
              <p className="mt-3 font-semibold text-slate-200">
                No students in this zone
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Select another zone to view its course roster.
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-700 bg-slate-900/55 px-5 py-3 text-xs text-slate-400 sm:px-7">
          Showing {visibleStudents.length} of {students.length} active students
        </footer>
      </div>
    </div>
  );
}
function ZoneBadge({ zone }: { zone: Zone }) {
  const item = ZONES.find((candidate) => candidate.value === zone) || ZONES[3];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-200">
      <span className={`h-2 w-2 rounded-full ${item.color}`} />
      {item.label}
    </span>
  );
}

function FeeCell({ fee }: { fee: FeeSummary | null }) {
  if (!fee) {
    return <span className="text-xs text-slate-500">No linked record</span>;
  }
  return (
    <div>
      <div className="font-semibold text-emerald-200">
        {formatINR(fee.paid)}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatINR(fee.remaining)} due
      </div>
    </div>
  );
}

function StudentFeeDetail({
  detail,
  loading,
  onClose,
}: {
  detail: StudentDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#091421] shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Complete fee record
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">
              {detail?.student.name || "Loading student"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 bg-slate-800 p-2.5 text-slate-200 hover:text-white"
            aria-label="Close fee detail"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center gap-3 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
            Loading linked fee records...
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
            <section className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                icon={<UserRound />}
                label="Student"
                value={detail.student.name}
              />
              <Info
                icon={<Mail />}
                label="Email"
                value={detail.student.email || "Not recorded"}
              />
              <Info
                icon={<BookOpen />}
                label="Course"
                value={detail.student.courseName || "Not recorded"}
              />
              <Info
                icon={<MapPin />}
                label="Zone"
                value={
                  ZONES.find((item) => item.value === detail.student.zone)
                    ?.label || "Not recorded"
                }
              />
            </section>

            <PreplacementSection fee={detail.preplacementFee} />

            <section className="rounded-2xl border border-teal-400/20 bg-teal-400/[0.035] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                    Post-placement fee
                  </p>
                  <h4 className="mt-1 text-lg font-bold text-white">
                    Placement-linked collections
                  </h4>
                </div>
                <ReceiptIndianRupee className="h-6 w-6 text-teal-300" />
              </div>
              {detail.postplacementFees.length ? (
                <div className="space-y-4">
                  {detail.postplacementFees.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-2xl border border-slate-700 bg-[#081321] p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h5 className="font-bold text-white">
                            {offer.companyName || "Company not recorded"}
                          </h5>
                          <p className="mt-1 text-xs text-slate-400">
                            {offer.location || "Location not recorded"} · Offer{" "}
                            {formatDate(offer.offerDate)}
                          </p>
                        </div>
                        {offer.packageLPA != null && (
                          <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">
                            {offer.packageLPA} LPA
                          </span>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Metric
                          label="Total fee"
                          value={formatINR(offer.totalFee)}
                        />
                        <Metric
                          label="Collected"
                          value={formatINR(offer.paid)}
                          positive
                        />
                        <Metric
                          label="Discount"
                          value={formatINR(offer.discount)}
                        />
                        <Metric
                          label="Outstanding"
                          value={formatINR(offer.remaining)}
                          warning
                        />
                      </div>
                      <Transactions
                        items={offer.installments}
                        empty="No post-placement installments recorded"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyFees text="No post-placement fee record is linked to this LMS user." />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-slate-100">
        {value}
      </div>
    </div>
  );
}

function PreplacementSection({
  fee,
}: {
  fee: StudentDetail["preplacementFee"];
}) {
  return (
    <section className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.035] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
            Pre-placement fee
          </p>
          <h4 className="mt-1 text-lg font-bold text-white">
            Fee position and payment history
          </h4>
        </div>
        <TrendingUp className="h-5 w-5 text-sky-300" />
      </div>
      {fee ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total fee" value={formatINR(fee.totalFee)} />
            <Metric label="Collected" value={formatINR(fee.paid)} positive />
            <Metric label="Refunded" value={formatINR(fee.refunded || 0)} />
            <Metric
              label="Outstanding"
              value={formatINR(fee.remaining)}
              warning
            />
          </div>
          <Transactions
            items={fee.payments || []}
            empty="No pre-placement payments recorded"
          />
        </>
      ) : (
        <EmptyFees text="No pre-placement fee record is linked to this LMS user." />
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  positive,
  warning,
}: {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#081321] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-base font-bold ${
          positive
            ? "text-emerald-200"
            : warning
              ? "text-amber-100"
              : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Transactions({ items, empty }: { items: Payment[]; empty: string }) {
  if (!items.length) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-slate-700 px-4 py-5 text-center text-sm text-slate-500">
        {empty}
      </p>
    );
  }
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-700">
      <div className="grid grid-cols-[1fr_1fr_1fr] bg-slate-800/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Amount</span>
        <span>Date</span>
        <span>Mode / note</span>
      </div>
      {items.map((payment, index) => (
        <div
          key={payment._id || `${payment.date}-${payment.amount}-${index}`}
          className="grid grid-cols-[1fr_1fr_1fr] border-t border-slate-800 px-4 py-3 text-xs"
        >
          <span className="font-semibold text-emerald-200">
            {formatINR(payment.amount)}
          </span>
          <span className="text-slate-300">{formatDate(payment.date)}</span>
          <span className="truncate text-slate-400">
            {payment.mode || payment.note || "Not recorded"}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyFees({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 px-5 py-8 text-center">
      <Wallet className="mx-auto h-7 w-7 text-slate-600" />
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  );
}
