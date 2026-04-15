"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface QuizEntry {
  _id: string;
  totalMarksPossible: number;
  attemptedAt: string;
  totalMarksObtained?: number;
}

interface Stats {
  totalDaysAttempted: number;
  totalAttempts?: number;
  totalObtained?: number;
  totalPossible?: number;
  percentage: number | string;
  firstAttempt?: string | null;
  lastAttempt?: string | null;
  failed?: number;
  passed?: number;
  failRate?: number;
  passRate?: number;
}

interface StudentInfo {
  _id?: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  feePlan?: string;
  zone?: string;
  joinedMonth?: string;
  batch?: string;
}

interface PaymentDetail {
  _id?: string;
  remainingFee?: number;
  totalFee?: number;
  totalReceived?: number;
  status?: string;
  courseName?: string;
}

interface ApiResponse {
  message: string;
  filterType?: "overall" | "monthly";
  month: number | null;
  year: number | null;
  student?: StudentInfo;
  paymentDetails?: PaymentDetail[];
  academicDetails?: {
    attempts?: QuizEntry[];
    stats?: Stats;
  };
  mockInterviewData?: {
    // attempts?: QuizEntry[];
    stats?: Stats;
  };

  callrecordingDetails?: any
}

interface Grade {
  label: string;
  color: string;
  text: string;
  border: string;
  bg: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getPct(obtained: number | undefined, possible: number): number | null {
  if (obtained == null || possible === 0) return null;
  return Math.round((obtained / possible) * 100);
}

function getGrade(pct: number | null): Grade {
  if (pct == null) {
    return {
      label: "—",
      color: "#888",
      text: "text-slate-400",
      border: "border-slate-500/30",
      bg: "bg-slate-500/10",
    };
  }

  if (pct >= 90) {
    return {
      label: "A+",
      color: "#10b981",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
    };
  }

  if (pct >= 75) {
    return {
      label: "A",
      color: "#38bdf8",
      text: "text-sky-400",
      border: "border-sky-500/30",
      bg: "bg-sky-500/10",
    };
  }

  if (pct >= 60) {
    return {
      label: "B",
      color: "#a78bfa",
      text: "text-violet-400",
      border: "border-violet-500/30",
      bg: "bg-violet-500/10",
    };
  }

  if (pct >= 45) {
    return {
      label: "C",
      color: "#fbbf24",
      text: "text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
    };
  }

  return {
    label: "D",
    color: "#f87171",
    text: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
  };
}

function ScoreBar({
  obtained,
  possible,
}: {
  obtained: number | undefined;
  possible: number;
}) {
  const pct = getPct(obtained, possible) || 0;
  const grade = getGrade(pct);

  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a1538]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${grade.color}99, ${grade.color})`,
        }}
      />
    </div>
  );
}


function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {

  return (
    <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-4">
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#9a92c9]">
        {label}
      </p>
      <p className="break-words text-sm font-medium text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accent: string;
}) {

  
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#312a63] bg-[#120f2d] p-5">
      <div
        className="absolute left-0 top-0 h-[3px] w-full"
        style={{ backgroundColor: accent }}
      />
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#9a92c9]">
        {label}
      </p>
      <h3 className="text-3xl font-bold" style={{ color: accent }}>
        {value}
      </h3>
      <p className="mt-2 text-sm text-[#a8a0d6]">{sub}</p>
    </div>
  );
}

export default function StudentDashboard() {
  const searchParams = useSearchParams();
  const clerkId = searchParams.get("clerkId");

  const now = new Date();

  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const attempts = useMemo(() => {
    return Array.isArray(data?.academicDetails?.attempts)
      ? data.academicDetails.attempts
      : [];
  }, [data]);

  const stats = useMemo(() => {
    return (
      data?.academicDetails?.stats || {
        totalDaysAttempted: 0,
        totalAttempts: 0,
        totalObtained: 0,
        totalPossible: 0,
        percentage: 0,
        firstAttempt: null,
        lastAttempt: null,
      }
    );
  }, [data]);

  const Mockstatus = useMemo(() => {
    return (
      data?.mockInterviewData?.stats || {
        totalDaysAttempted: 0,
        totalAttempts: 0,
        failed: 0,
        passed: 0,
        failRate: 0,
        passRate: 0,
        firstAttempt: null,
        lastAttempt: null,
      }
    );
  }, [data]);


  const Callrecordingstatus = useMemo(() => {
    return data?.callrecordingDetails || {
      total: 0,
      summary: {
        pos: 0,
        neg: 0,
        neutral: 0,
      },
    };
  }, [data]);
  
  const paymentDetails = useMemo(() => {
    return Array.isArray(data?.paymentDetails) ? data.paymentDetails : [];
  }, [data]);

  const totalPossible = useMemo(() => {
    return attempts.reduce(
      (sum, item) => sum + (Number(item.totalMarksPossible) || 0),
      0,
    );
  }, [attempts]);

  const totalObtained = useMemo(() => {
    return attempts.reduce(
      (sum, item) => sum + (Number(item.totalMarksObtained) || 0),
      0,
    );
  }, [attempts]);

  const fetchStudentDetails = async (filter?: {
    month?: number | null;
    year?: number | null;
  }) => {
    if (!clerkId) {
      // Don't show the error yet, just wait
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("clerkId", clerkId);

      if (filter?.month && filter?.year) {
        params.append("month", String(filter.month));
        params.append("year", String(filter.year));
      }

      const res = await fetch(
        `${API_LMS_URL}/api/student-info/get-student-details?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to fetch student details");
      }

      setData(json);
    } catch (err: any) {
      console.error("fetchStudentDetails error:", err);
      setError(err.message || "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!month || !year) {
      alert("Please select month and year");
      return;
    }

    fetchStudentDetails({ month, year });
  };

  const handleReset = () => {
    setMonth(null);
    setYear(null);
    fetchStudentDetails();
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [clerkId]);

  return (
    <div className="min-h-screen bg-[#09061a] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-7 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Student Details
            </h1>
            <p className="mt-2 text-sm text-[#a8a0d6]">
              {data?.filterType === "monthly" && month && year
                ? `Showing monthly overview for ${MONTHS[month - 1]} ${year}`
                : "Showing overall overview from first attempt to latest attempt"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.18em] text-[#9a92c9]">
              Filter by
            </span>

            <select
              value={month ?? ""}
              onChange={(e) =>
                setMonth(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-xl border border-[#312a63] bg-[#120f2d] px-4 py-2 text-sm text-white outline-none transition focus:border-[#8b5cf6]"
            >
              <option value="" className="bg-[#120f2d] text-white">
                Select Month
              </option>
              {MONTHS.map((m, i) => (
                <option
                  key={m}
                  value={i + 1}
                  className="bg-[#120f2d] text-white"
                >
                  {m}
                </option>
              ))}
            </select>

            <select
              value={year ?? ""}
              onChange={(e) =>
                setYear(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-xl border border-[#312a63] bg-[#120f2d] px-4 py-2 text-sm text-white outline-none transition focus:border-[#8b5cf6]"
            >
              <option value="" className="bg-[#120f2d] text-white">
                Select Year
              </option>
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#120f2d] text-white">
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              disabled={!month || !year || loading}
              className="rounded-xl bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Search"}
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="rounded-xl border border-[#312a63] bg-[#120f2d] px-4 py-2 text-sm text-white transition hover:bg-[#1b1640] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-10 text-center text-[#a8a0d6]">
            Loading student details...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-10 text-center text-rose-300">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#312a63] bg-[#0f0b24] p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  label="Full Name"
                  value={data.student?.fullName || "—"}
                />
                <InfoCard label="Email" value={data.student?.email || "—"} />
                <InfoCard
                  label="Fee Plan"
                  value={data.student?.feePlan || "—"}
                />
                <InfoCard
                  label="Joined Month"
                  value={data.student?.joinedMonth || "—"}
                />
                <InfoCard
                  label="Range"
                  value={
                    stats?.firstAttempt
                      ? `${formatDate(stats.firstAttempt)} to ${formatDate(
                        stats.lastAttempt || stats.firstAttempt,
                      )}`
                      : "—"
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Days Attempted"
                value={stats?.totalDaysAttempted ?? 0}
                sub="unique quiz days"
                accent="#38bdf8"
              />
              <StatCard
                label="Total Attempts"
                value={stats?.totalAttempts ?? attempts.length}
                sub="all quiz attempts"
                accent="#f97316"
              />
              <StatCard
                label="Overall Score"
                value={`${stats?.percentage ?? "0"}%`}
                sub={`${totalObtained} / ${totalPossible} marks`}
                accent="#10b981"
              />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-white-900">
                    Mock Interview Details
                  </h1>
                  <p className="text-sm text-white-500">
                    Overview of interview activity and performance
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Days Attempted"
                  value={Mockstatus?.totalDaysAttempted ?? 0}
                  sub="Unique interview days"
                  accent="#38bdf8"
                />

                <StatCard
                  label="Total Attempts"
                  value={Mockstatus?.totalAttempts ?? attempts.length}
                  sub="All mock interview attempts"
                  accent="#f97316"
                />

                <StatCard
                  label="Fail"
                  value={Mockstatus?.failed}
                  sub="Total Failed Mock Interviews"
                  accent="#f97316"
                />

                <StatCard
                  label="Pass"
                  value={Mockstatus?.passed}
                  sub="Total Pass Mock Interviews"
                  accent="#38bdf8"
                />

                <StatCard
                  label="Failed Score"
                  value={`${Mockstatus?.failRate ?? "0"}%`}
                  sub="Failed Rate"
                  accent="#b93a10"
                />

                <StatCard
                  label="Pass Score"
                  value={`${Mockstatus?.passRate ?? "0"}%`}
                  sub="Pass Rate"
                  accent="#10b981"
                />
              </div>

            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-white-900">
                    H.R. Call Records  Details
                  </h1>
                  <p className="text-sm text-white-500">
                    Overview of Call Records
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                  label="Total Calls"
                  value={Callrecordingstatus.total ?? 0}
                  sub="All recordings + manual entries"
                  accent="#38bdf8"
                />

                <StatCard
                  label="Positive"
                  value={Callrecordingstatus.summary.pos ?? 0}
                  sub="Resume requested / success-type calls"
                  accent="#10b981"
                />

                <StatCard
                  label="Negative"
                  value={Callrecordingstatus.summary.neg ?? 0}
                  sub="Rejected / invalid / failed calls"
                  accent="#ef4444"
                />

                <StatCard
                  label="Neutral"
                  value={Callrecordingstatus.summary.neutral ?? 0}
                  sub="In-progress / info shared / no final outcome"
                  accent="#f59e0b"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-[#312a63] bg-[#0f0b24] p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Payment Details
                </h2>
                <p className="mt-1 text-sm text-[#a8a0d6]">
                  Fee and payment overview for this student
                </p>
              </div>

              {paymentDetails.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#312a63] bg-[#120f2d] p-8 text-center text-[#a8a0d6]">
                  No payment details found
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {paymentDetails.map((payment, index) => (
                    <div
                      key={payment._id || index}
                      className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-5"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[#a8a0d6]">Course Name</p>
                          <h3 className="text-lg font-semibold text-white">
                            {payment.courseName || "—"}
                          </h3>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${payment.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : payment.status === "partial"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-rose-500/15 text-rose-300"
                            }`}
                        >
                          {payment.status || "—"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <InfoCard
                          label="Total Fee"
                          value={`₹${Number(
                            payment.totalFee || 0,
                          ).toLocaleString("en-IN")}`}
                        />
                        <InfoCard
                          label="Received"
                          value={`₹${Number(
                            payment.totalReceived || 0,
                          ).toLocaleString("en-IN")}`}
                        />
                        <InfoCard
                          label="Remaining"
                          value={`₹${Number(
                            payment.remainingFee || 0,
                          ).toLocaleString("en-IN")}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#312a63] bg-[#0f0b24]">
              <div className="hidden grid-cols-7 gap-4 border-b border-[#312a63] bg-[#151033] px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-[#9a92c9] md:grid">
                <span>#</span>
                <span className="col-span-2">Date & ID</span>
                <span>Time</span>
                <span>Possible</span>
                <span>Obtained</span>
                <span>Grade</span>
              </div>

              {attempts.length === 0 ? (
                <div className="p-10 text-center text-[#a8a0d6]">
                  No quiz data found
                </div>
              ) : (
                <div className="divide-y divide-[#312a63]">
                  {attempts.map((item, i) => {
                    const pct = getPct(
                      item.totalMarksObtained,
                      item.totalMarksPossible,
                    );
                    const grade = getGrade(pct);
                    const absent = item.totalMarksObtained == null;

                    return (
                      <div
                        key={item._id}
                        className="px-4 py-4 sm:px-5 md:grid md:grid-cols-7 md:items-center md:gap-4"
                      >
                        <div className="mb-3 text-sm text-[#a8a0d6] md:mb-0">
                          {i + 1}
                        </div>

                        <div className="mb-3 md:col-span-2 md:mb-0">
                          <p className="font-medium text-white">
                            {formatDate(item.attemptedAt)}
                          </p>
                        </div>

                        <div className="mb-3 text-sm text-white md:mb-0">
                          <span className="mr-2 text-[#a8a0d6] md:hidden">
                            Time:
                          </span>
                          {formatTime(item.attemptedAt)}
                        </div>

                        <div className="mb-3 text-sm text-white md:mb-0">
                          <span className="mr-2 text-[#a8a0d6] md:hidden">
                            Possible:
                          </span>
                          {item.totalMarksPossible}
                        </div>

                        <div className="mb-3 text-sm text-white md:mb-0">
                          <span className="mr-2 text-[#a8a0d6] md:hidden">
                            Obtained:
                          </span>
                          {absent ? "—" : item.totalMarksObtained}
                        </div>

                        <div>
                          {absent ? (
                            <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
                              Absent
                            </span>
                          ) : (
                            <div className="min-w-[140px]">
                              <div className="flex items-center justify-between gap-3">
                                <span
                                  className={`text-sm font-semibold ${grade.text}`}
                                >
                                  {pct}%
                                </span>
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${grade.text} ${grade.border} ${grade.bg}`}
                                >
                                  {grade.label}
                                </span>
                              </div>
                              <ScoreBar
                                obtained={item.totalMarksObtained}
                                possible={item.totalMarksPossible}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#312a63] bg-[#120f2d] p-10 text-center text-[#a8a0d6]">
            {!clerkId
              ? "Please select a student from the Student Overview list to view details."
              : "No data available"}
          </div>
        )}
      </div>
    </div>
  );
}
