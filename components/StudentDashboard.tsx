"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

interface AttendanceRecord {
  _id: string;
  name?: string;
  email?: string;
  date: string;
  status?: string;
  login_time?: string;
  logout_time?: string;
};

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
  firstRecord?: string;
  lastRecord?: string;
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
    stats?: Stats;
  };
  callRecordingData?: any;
}

interface Grade {
  label: string;
  color: string;
  text: string;
  border: string;
  bg: string;
}

type ModalType = "attendance-total" | "attendance-present" | "attendance-absent" |
  "mock-attempts" | "mock-pass" | "mock-fail" |
  "calls-total" | "calls-positive" | "calls-negative" | "calls-neutral" |
  "quiz-attempts" | "quiz-days" | null;


function formatTimeValue(value?: string | null): string {
  if (!value) return "—";

  // for plain time like "12:32:09"
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    const [hourStr, minuteStr] = value.split(":");
    let hour = Number(hourStr);
    const minute = minuteStr;
    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;
    return `${String(hour).padStart(2, "0")}:${minute} ${ampm}`;
  }

  // fallback for full ISO datetime
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function ClickableStatCard({
  label,
  value,
  sub,
  accent,
  icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accent: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 p-5 text-left backdrop-blur-sm transition-all hover:border-slate-600/70 hover:shadow-lg hover:shadow-black/20 disabled:cursor-default disabled:hover:border-slate-700/50 disabled:hover:shadow-none"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20" style={{ backgroundColor: accent }} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <h3 className="mb-1 text-3xl font-bold transition-colors" style={{ color: accent }}>
            {value}
          </h3>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>

        <div className="ml-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/30 transition-colors group-hover:bg-slate-700/50" style={{ color: accent }}>
          {icon}
        </div>
      </div>

      {onClick && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
          <span>View Details</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-800/95 px-6 py-4 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {children}
        </div>
      </div>
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
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

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
    return data?.callRecordingData || {      
      stats: {
            total: 0,
            positive: 0,
            negative: 0,
            neutral: 0            
        }
    };
  }, [data]);

  const attendanceStats = useMemo((): AttendanceStats => {
    if (!attendanceData.length) {
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        attendanceRate: 0,
      };
    }

    const uniqueDates = new Set(
      attendanceData.map((record) => record.date.split("T")[0])
    );
    const totalDays = uniqueDates.size;
    const presentDays = attendanceData.filter(
      (r) => r.status?.toLowerCase() === "present"
    ).length;
    const absentDays = attendanceData.filter(
      (r) => r.status?.toLowerCase() === "absent"
    ).length;
    const attendanceRate =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const sortedRecords = [...attendanceData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      totalDays,
      presentDays,
      absentDays,
      attendanceRate,
      firstRecord: sortedRecords[0]?.date,
      lastRecord: sortedRecords[sortedRecords.length - 1]?.date,
    };
  }, [attendanceData]);

  const paymentDetails = useMemo(() => {
    return Array.isArray(data?.paymentDetails) ? data.paymentDetails : [];
  }, [data]);

  const totalPossible = useMemo(() => {
    return attempts.reduce(
      (sum, item) => sum + (Number(item.totalMarksPossible) || 0),
      0
    );
  }, [attempts]);

  const totalObtained = useMemo(() => {
    return attempts.reduce(
      (sum, item) => sum + (Number(item.totalMarksObtained) || 0),
      0
    );
  }, [attempts]);

  const fetchAttendanceData = async (filter?: {
    month?: number | null;
    year?: number | null;
  }) => {
    if (!data?.student?.email) return;

    try {
      setAttendanceLoading(true);
      setAttendanceError(null);

      const params = new URLSearchParams();
      params.append("email", data.student.email);

      if (filter?.month && filter?.year) {
        params.append("month", String(filter.month));
        params.append("year", String(filter.year));
      }

      const res = await fetch(
        `${API_LMS_URL}/api/present/all-reports?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to fetch attendance data");
      }

      if (json.message === "No record found") {
        setAttendanceData([]);
      } else {
        setAttendanceData(json.dailypresent || []);
      }
    } catch (err: any) {
      console.error("fetchAttendanceData error:", err);
      setAttendanceError(err.message || "Failed to load attendance data");
      setAttendanceData([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchStudentDetails = async (filter?: {
    month?: number | null;
    year?: number | null;
  }) => {
    if (!clerkId) {
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
        }
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
    fetchAttendanceData({ month, year });
  };

  const handleReset = () => {
    setMonth(null);
    setYear(null);
    fetchStudentDetails();
    fetchAttendanceData();
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [clerkId]);

  useEffect(() => {
    if (data?.student?.email) {
      fetchAttendanceData(month && year ? { month, year } : undefined);
    }
  }, [data?.student?.email]);

  const presentRecords = useMemo(() =>
    attendanceData.filter(r => r.status?.toLowerCase() === "present"),
    [attendanceData]
  );

  const absentRecords = useMemo(() =>
    attendanceData.filter(r => r.status?.toLowerCase() === "absent"),
    [attendanceData]
  );

  const renderModalContent = () => {
    switch (activeModal) {
      case "attendance-total":
      case "attendance-present":
      case "attendance-absent":
        const records = activeModal === "attendance-present" ? presentRecords :
          activeModal === "attendance-absent" ? absentRecords :
            attendanceData;

        return (
          <div className="space-y-3">
            {records.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No records found</p>
            ) : (
              records.map((record, i) => (
                <div key={record._id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    
                      <p className="font-semibold text-white">{formatDate(record.date)}</p>
                      <p className="text-sm text-slate-400">Login: {formatTimeValue(record.login_time)}</p>
                      <p className="text-sm text-slate-400">Logout: {formatTimeValue(record.logout_time)}</p>
                    
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.status?.toLowerCase() === "present"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                      }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "quiz-attempts":
      case "quiz-days":
        return (
          <div className="space-y-3">
            {attempts.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No attempts found</p>
            ) : (
              attempts.map((item, i) => {
                const pct = getPct(item.totalMarksObtained, item.totalMarksPossible);
                const grade = getGrade(pct);
                const absent = item.totalMarksObtained == null;

                return (
                  <div key={item._id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-sm font-semibold text-white">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-white">{formatDate(item.attemptedAt)}</p>
                            <p className="text-sm text-slate-400">{formatTime(item.attemptedAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-400">
                            Score: <span className="font-semibold text-white">
                              {absent ? "Absent" : `${item.totalMarksObtained}/${item.totalMarksPossible}`}
                            </span>
                          </span>
                        </div>
                      </div>

                      {!absent && (
                        <div className="flex flex-col items-end gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${grade.text} ${grade.border} ${grade.bg}`}>
                            {grade.label}
                          </span>
                          <span className={`text-lg font-bold ${grade.text}`}>
                            {pct}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">
              Student Dashboard
            </h1>
            <p className="text-slate-400">
              {data?.filterType === "monthly" && month && year
                ? `Performance overview for ${MONTHS[month - 1]} ${year}`
                : "Complete academic performance overview"}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm">
            <select
              value={month ?? ""}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select Year</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              disabled={!month || !year || loading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Apply Filter"}
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="rounded-lg border border-slate-600 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-16 text-center backdrop-blur-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
            <p className="mt-4 text-slate-400">Loading student details...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-10 text-center text-rose-300">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Student Info */}
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-white">Student Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="Full Name" value={data.student?.fullName} />
                <InfoCard label="Email" value={data.student?.email} />
                <InfoCard label="Fee Plan" value={data.student?.feePlan} />
                <InfoCard label="Joined" value={data.student?.joinedMonth} />
                <InfoCard label="Batch" value={data.student?.batch} />
                <InfoCard
                  label="Active Period"
                  value={stats?.firstAttempt ? `${formatDate(stats.firstAttempt)} - ${formatDate(stats.lastAttempt)}` : "—"}
                />
              </div>
            </div>

            {/* Quiz Performance */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Quiz Performance</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ClickableStatCard
                  label="Days Attempted"
                  value={stats?.totalDaysAttempted ?? 0}
                  sub="Unique quiz days"
                  accent="#3b82f6"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  onClick={() => setActiveModal("quiz-days")}
                />
                <ClickableStatCard
                  label="Total Attempts"
                  value={stats?.totalAttempts ?? attempts.length}
                  sub="All quiz submissions"
                  accent="#f97316"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  onClick={() => setActiveModal("quiz-attempts")}
                />
                <ClickableStatCard
                  label="Overall Score"
                  value={`${stats?.percentage ?? "0"}%`}
                  sub={`${totalObtained} / ${totalPossible} marks`}
                  accent="#10b981"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                />
              </div>
            </div>

            {/* Attendance */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Attendance Overview</h2>
              {attendanceLoading ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-10 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
                  <p className="mt-3 text-slate-400">Loading attendance...</p>
                </div>
              ) : attendanceError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300">
                  {attendanceError}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ClickableStatCard
                    label="Total Days"
                    value={attendanceStats.totalDays}
                    sub="Attendance recorded"
                    accent="#3b82f6"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    onClick={() => setActiveModal("attendance-total")}
                  />
                  <ClickableStatCard
                    label="Present"
                    value={attendanceStats.presentDays}
                    sub="Days attended"
                    accent="#10b981"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    onClick={() => setActiveModal("attendance-present")}
                  />
                  <ClickableStatCard
                    label="Absent"
                    value={attendanceStats.absentDays}
                    sub="Days missed"
                    accent="#ef4444"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    onClick={() => setActiveModal("attendance-absent")}
                  />
                  <ClickableStatCard
                    label="Attendance Rate"
                    value={`${attendanceStats.attendanceRate}%`}
                    sub="Overall percentage"
                    accent="#a78bfa"
                    icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
                  />
                </div>
              )}
            </div>

            {/* Mock Interviews */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Mock Interview Performance</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ClickableStatCard
                  label="Total Attempts"
                  value={Mockstatus?.totalAttempts ?? 0}
                  sub="Interview sessions"
                  accent="#f97316"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <ClickableStatCard
                  label="Passed"
                  value={Mockstatus?.passed ?? 0}
                  sub={`Success rate: ${Mockstatus?.passRate ?? 0}%`}
                  accent="#10b981"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <ClickableStatCard
                  label="Failed"
                  value={Mockstatus?.failed ?? 0}
                  sub={`Fail rate: ${Mockstatus?.failRate ?? 0}%`}
                  accent="#ef4444"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              </div>
            </div>

            {/* HR Calls */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">HR Call Records</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ClickableStatCard
                  label="Total Calls"
                  value={Callrecordingstatus?.stats?.total ?? 0}
                  sub="All recorded calls"
                  accent="#3b82f6"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                />
                <ClickableStatCard
                  label="Positive"
                  value={Callrecordingstatus.stats?.positive ?? 0}
                  sub="Resume requested"
                  accent="#10b981"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>}
                />
                <ClickableStatCard
                  label="Negative"
                  value={Callrecordingstatus.stats?.negative ?? 0}
                  sub="Rejected calls"
                  accent="#ef4444"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>}
                />
                <ClickableStatCard
                  label="Neutral"
                  value={Callrecordingstatus.stats?.neutral ?? 0}
                  sub="In progress"
                  accent="#f59e0b"
                  icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Payment Details</h2>
              {paymentDetails.length === 0 ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-10 text-center text-slate-400">
                  No payment records found
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {paymentDetails.map((payment, index) => (
                    <div
                      key={payment._id || index}
                      className="overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-sm"
                    >
                      <div className="border-b border-slate-700 bg-slate-800/80 px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Course</p>
                            <h3 className="mt-1 text-lg font-semibold text-white">
                              {payment.courseName || "—"}
                            </h3>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${payment.status === "paid"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : payment.status === "partial"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                          >
                            {payment.status?.toUpperCase() || "—"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-5">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Fee</p>
                          <p className="mt-1 text-xl font-bold text-white">
                            ₹{Number(payment.totalFee || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Received</p>
                          <p className="mt-1 text-xl font-bold text-emerald-400">
                            ₹{Number(payment.totalReceived || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Remaining</p>
                          <p className="mt-1 text-xl font-bold text-rose-400">
                            ₹{Number(payment.remainingFee || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-16 text-center backdrop-blur-sm">
            <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-4 text-slate-400">
              {!clerkId
                ? "Please select a student from the overview list"
                : "No data available"}
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={
          activeModal === "attendance-total" ? "All Attendance Records" :
            activeModal === "attendance-present" ? "Present Days" :
              activeModal === "attendance-absent" ? "Absent Days" :
                activeModal === "quiz-attempts" ? "All Quiz Attempts" :
                  activeModal === "quiz-days" ? "Quiz Activity Days" :
                    ""
        }
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}