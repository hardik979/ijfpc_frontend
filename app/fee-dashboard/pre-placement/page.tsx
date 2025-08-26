"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Users,
  TrendingUp,
  Search,
  X,
  ChevronRight,
  IndianRupee,
  Clock,
  Receipt,
  UserIcon,
} from "lucide-react";

// ====== CONFIG ======
const SHEETDB_URL = "https://sheetdb.io/api/v1/vu58z0w3ted3o";

// Source row as it comes from SheetDB
export type RawRow = {
  S?: string;
  "Sr. No."?: string;
  Name?: string;
  "Course Name"?: string;
  Fees?: string;
  "Due Date"?: string;
  "Fees Received"?: string;
  "Date of recpt."?: string;
  "Mode "?: string;
  "RECEIPT No."?: string;
  "Remaining Fees"?: string;
  Remarks?: string;
};

// Normalized transaction per student
export type Payment = {
  amount: number;
  date: string | null;
  y?: number | null;
  m?: number | null;
  receiptNo: string | null;
  mode: string | null;
  remarks: string | null;
};

export type Student = {
  id: string;
  name: string;
  courseName: string | null;
  totalFees: number | null;
  sumReceived: number;
  remaining: number | null;
  lastPaymentDate: string | null;
  payments: Payment[];
};

// ====== UTILITIES ======
const n = (v?: string): number | null => {
  if (!v) return null;
  const cleaned = v.toString().replace(/[,\s]/g, "").replace(/₹/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const normName = (v?: string) => (v || "").trim();
const keyName = (v?: string) => normName(v).toLowerCase();

const parseMonthYear = (v?: string): { y: number | null; m: number | null } => {
  if (!v) return { y: null, m: null };
  const s = v.trim();
  const t = Date.parse(s);
  if (Number.isFinite(t)) {
    const d = new Date(t);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  }
  const m1 = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m1) {
    const d = Number(m1[1]);
    const m = Number(m1[2]);
    let y = Number(m1[3]);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12) return { y, m };
  }
  return { y: null, m: null };
};
function paidUpToMonth(s: Student, y: number, m: number) {
  return s.payments.reduce((sum, p) => {
    if (!p.y || !p.m) return sum;
    const isBeforeOrSame = p.y < y || (p.y === y && p.m <= m);
    return isBeforeOrSame ? sum + p.amount : sum;
  }, 0);
}

// Remaining for a student as of end of the selected month
function remainingAsOfMonth(s: Student, y: number, m: number) {
  if (s.totalFees == null) return null; // unknown total, can't compute
  const paid = paidUpToMonth(s, y, m);
  return Math.max(s.totalFees - paid, 0);
}
function deriveStudents(rows: RawRow[]): Student[] {
  const map = new Map<string, Student>();

  for (const r of rows) {
    const displayName = normName(r.Name);
    if (!displayName) continue;
    const id = keyName(displayName);

    const totalFeesCandidate = n(r.Fees ?? undefined);
    const receivedCandidate = n(r["Fees Received"] ?? undefined) ?? 0;
    const courseName = normName(r["Course Name"]) || null;
    const remainingCandidate = n(r["Remaining Fees"] ?? undefined);

    const { y, m } = parseMonthYear(r["Date of recpt."] ?? undefined);

    const payment: Payment | null = receivedCandidate
      ? {
          amount: receivedCandidate,
          date: (r["Date of recpt."] ?? "").toString().trim() || null,
          y,
          m,
          receiptNo: normName(r["RECEIPT No."]) || null,
          mode: normName(r["Mode "]) || null,
          remarks: normName(r.Remarks) || null,
        }
      : null;

    if (!map.has(id)) {
      map.set(id, {
        id,
        name: displayName,
        courseName,
        totalFees: totalFeesCandidate ?? null,
        sumReceived: 0,
        remaining: remainingCandidate ?? null,
        lastPaymentDate: null,
        payments: [],
      });
    }

    const s = map.get(id)!;

    if (!s.courseName && courseName) s.courseName = courseName;

    if (totalFeesCandidate != null) {
      s.totalFees =
        s.totalFees != null
          ? Math.max(s.totalFees, totalFeesCandidate)
          : totalFeesCandidate;
    }

    if (payment) {
      s.payments.push(payment);
      s.sumReceived += payment.amount;
      if (payment.date) s.lastPaymentDate = payment.date;
    }

    if (remainingCandidate != null) s.remaining = remainingCandidate;
  }

  for (const s of map.values()) {
    if (s.remaining == null && s.totalFees != null) {
      s.remaining = Math.max(s.totalFees - s.sumReceived, 0);
    }

    s.payments.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const da = Date.parse(a.date);
      const db = Date.parse(b.date);
      if (Number.isFinite(da) && Number.isFinite(db)) return db - da;
      return (b.date || "").localeCompare(a.date || "");
    });

    if (s.payments.length && s.payments[0].date)
      s.lastPaymentDate = s.payments[0].date!;
  }

  return Array.from(map.values());
}

function computeAllTimeTotals(students: Student[]) {
  let totalFees = 0;
  let totalReceived = 0;
  let totalRemaining = 0;
  for (const s of students) {
    totalFees += s.totalFees || 0;
    totalReceived += s.sumReceived;
    totalRemaining += s.remaining || 0;
  }
  return { totalFees, totalReceived, totalRemaining };
}

function sumReceivedForMonth(students: Student[], y: number, m: number) {
  let sum = 0;
  for (const s of students) {
    for (const p of s.payments) {
      if (p.y === y && p.m === m) sum += p.amount;
    }
  }
  return sum;
}

// ====== COMPONENTS ======
const StatCard = ({
  title,
  value,
  icon: Icon,
  gradient,
  onClick,
  clickable = false,
  subtitle,
}: any) => (
  <div
    className={`group relative overflow-hidden rounded-3xl border border-white/10 p-8 transition-all duration-500 ${
      clickable ? "cursor-pointer hover:scale-105 hover:border-white/20" : ""
    } ${gradient} backdrop-blur-xl`}
    onClick={onClick}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <Icon className="h-8 w-8 text-white/90" />
        {clickable && (
          <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-white/60 text-xs">{subtitle}</p>}
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </div>
);

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  return <span>₹ {displayValue.toLocaleString()}</span>;
};

export default function PrePlacementDashboard() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Month selection flow
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showStudentsPanel, setShowStudentsPanel] = useState(false);

  // Student modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await fetch(SHEETDB_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as RawRow[];
        setRows(data);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const students = useMemo(() => deriveStudents(rows || []), [rows]);
  const totals = useMemo(() => computeAllTimeTotals(students), [students]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = students;
    if (!q) return base;
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.courseName || "").toLowerCase().includes(q)
    );
  }, [students, query]);

  const selectedStudent = useMemo(() => {
    if (!selectedId) return null;
    return students.find((s) => s.id === selectedId) || null;
  }, [students, selectedId]);

  const selectedYM = useMemo(() => {
    if (!selectedMonth) return null;
    const [yy, mm] = selectedMonth.split("-").map(Number);
    if (!yy || !mm) return null;
    return { y: yy, m: mm };
  }, [selectedMonth]);

  const monthReceived = useMemo(() => {
    if (!selectedYM) return null;
    return sumReceivedForMonth(students, selectedYM.y, selectedYM.m);
  }, [students, selectedYM]);
  const monthRemaining = useMemo(() => {
    if (!selectedYM) return totals.totalRemaining; // fallback to all-time if no month selected
    return students.reduce((acc, s) => {
      const r = remainingAsOfMonth(s, selectedYM.y, selectedYM.m);
      return acc + (r ?? 0);
    }, 0);
  }, [students, totals.totalRemaining, selectedYM]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white/80 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl">Error loading data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="fixed inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
              Pre‑Placement Fee Dashboard
            </h1>
            <p className="text-white/60 text-lg">
              Live insights from SheetDB • Real-time analytics • Student
              management
            </p>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <StatCard
              title="Total Received (All‑time)"
              value={<AnimatedCounter value={totals.totalReceived} />}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-emerald-500/20 to-teal-600/20"
              onClick={() => setShowMonthPicker(true)}
              clickable
              subtitle="Click to analyze by month & year"
            />
            <StatCard
              title="Total Students (All-Time)"
              value={filteredStudents.length}
              icon={UserIcon}
              gradient="bg-gradient-to-br from-blue-500/20 to-purple-600/20"
            />
          </div>

          {/* Month Summary */}
          {selectedYM && (
            <div className="mb-12 rounded-3xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 backdrop-blur-xl p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/80 text-sm">
                    <Calendar className="h-4 w-4" />
                    Selected Period
                  </div>
                  <h2 className="text-3xl font-bold text-white">
                    {new Date(selectedYM.y, selectedYM.m - 1, 1).toLocaleString(
                      undefined,
                      { month: "long", year: "numeric" }
                    )}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="text-white/60 text-sm mb-1">
                      Monthly Collection
                    </div>
                    <div className="text-2xl font-bold text-white">
                      ₹ {(monthReceived ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="text-white/60 text-sm mb-1">
                      Remaining Fee
                    </div>
                    <div className="text-2xl font-bold text-white">
                      ₹ {monthRemaining.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Panel */}
          {showStudentsPanel && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Students Table */}
              <div className="xl:col-span-3 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                <div className="border-b border-white/10 bg-white/5 px-6 py-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-white/80" />
                      <h2 className="text-xl font-bold text-white">
                        Students ({filteredStudents.length})
                      </h2>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name or course..."
                        className="rounded-2xl border border-white/20 bg-white/10 pl-10 pr-4 py-3 text-white placeholder-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                      <tr className="text-left text-white/60 text-sm">
                        <th className="px-6 py-4 font-medium">Student</th>
                        <th className="px-6 py-4 font-medium">Course</th>
                        <th className="px-6 py-4 font-medium text-center">
                          Total Received
                        </th>
                        <th className="px-6 py-4 font-medium text-center">
                          Remaining fee
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, index) => {
                        const remainingDisplay = selectedYM
                          ? remainingAsOfMonth(s, selectedYM.y, selectedYM.m)
                          : s.remaining;
                        const totalReceivedAllTime = s.sumReceived;
                        return (
                          <tr
                            key={s.id}
                            className="group border-t border-white/5 hover:bg-white/5 transition-all duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-6 py-5">
                              <button
                                className="text-left group-hover:text-purple-300 transition-colors"
                                onClick={() => {
                                  setSelectedId(s.id);
                                  setShowStudentModal(true);
                                }}
                              >
                                <div className="font-semibold text-white group-hover:underline">
                                  {s.name}
                                </div>
                                {s.lastPaymentDate && (
                                  <div className="text-white/50 text-sm mt-1">
                                    Last payment: {s.lastPaymentDate}
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-white/80">
                                {s.courseName || "—"}
                              </span>
                            </td>
                            {/* REPLACED CELL */}
                            <td className="px-6 py-5 text-center">
                              <div
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                                  totalReceivedAllTime > 0
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                                title="Total received (all-time)"
                              >
                                <IndianRupee className="h-4 w-4" />
                                {totalReceivedAllTime
                                  ? totalReceivedAllTime.toLocaleString()
                                  : "—"}
                              </div>
                            </td>

                            <td className="px-6 py-5 text-center">
                              <div
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                                  (s.remaining || 0) > 0
                                    ? "bg-orange-500/20 text-orange-300"
                                    : "bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                <IndianRupee className="h-4 w-4" />
                                {remainingDisplay != null
                                  ? remainingDisplay.toLocaleString()
                                  : "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Panel */}
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Dashboard Guide
                </h3>
                <div className="space-y-4 text-sm text-white/70">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Student Details:</strong>{" "}
                      Click any student name to view complete payment history
                      and details
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Monthly View:</strong>{" "}
                      Monthly Payment shows amount paid in selected period
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Search:</strong> Filter
                      students by name or course using the search box
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Month Picker Modal */}
          {showMonthPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowMonthPicker(false)}
              />
              <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl">
                <div className="mb-6 text-center">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-4 py-2 text-purple-300">
                    <Calendar className="h-5 w-5" />
                    Month Selector
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Select Analysis Period
                  </h3>
                  <p className="text-white/60 mt-2">
                    Choose a month and year to analyze collection data
                  </p>
                </div>

                <div className="mb-8">
                  <input
                    type="month"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm"
                    value={selectedMonth || ""}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMonthPicker(false)}
                    className="flex-1 rounded-2xl border border-white/20 px-6 py-4 text-white hover:bg-white/5 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowMonthPicker(false);
                      setShowStudentsPanel(true);
                    }}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-4 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                  >
                    Analyze Period
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Modal */}
          {showStudentModal && selectedStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowStudentModal(false)}
              />
              <div className="relative z-10 w-full max-w-5xl max-h-[90vh] rounded-3xl border border-white/20 bg-slate-900/95 backdrop-blur-xl overflow-hidden shadow-2xl">
                {/* Modal Header */}
                <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {selectedStudent.name}
                      </h3>
                      <p className="text-white/60 mt-1">
                        {selectedStudent.courseName || "Course not specified"}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowStudentModal(false)}
                      className="rounded-full bg-white/10 p-3 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-8 overflow-auto max-h-[calc(90vh-120px)]">
                  {/* Student Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <IndianRupee className="h-6 w-6 text-blue-400" />
                        <div className="text-white/60 text-sm">Total Fees</div>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {selectedStudent.remaining != null
                          ? `₹ ${selectedStudent.remaining.toLocaleString()}`
                          : "Calculating..."}
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="border-b border-white/10 bg-white/5 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-6 w-6 text-white/80" />
                        <h4 className="text-lg font-bold text-white">
                          Payment History
                        </h4>
                        <div className="ml-auto text-white/60 text-sm">
                          {selectedStudent.payments.length} transactions
                        </div>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                          <tr className="text-left text-white/60 text-sm">
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium text-right">
                              Amount
                            </th>
                            <th className="px-6 py-4 font-medium">
                              Payment Mode
                            </th>
                            <th className="px-6 py-4 font-medium">
                              Receipt No.
                            </th>
                            <th className="px-6 py-4 font-medium">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudent.payments.length === 0 ? (
                            <tr>
                              <td
                                className="px-6 py-12 text-center text-white/60"
                                colSpan={5}
                              >
                                <div className="flex flex-col items-center gap-3">
                                  <Receipt className="h-12 w-12 text-white/30" />
                                  <div>No payment records found</div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            selectedStudent.payments.map((payment, index) => (
                              <tr
                                key={index}
                                className="border-t border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div className="text-white font-medium">
                                    {payment.date || "—"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 text-sm font-semibold">
                                    <IndianRupee className="h-4 w-4" />
                                    {payment.amount.toLocaleString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-white/80">
                                    {payment.mode || "—"}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-white/80 font-mono text-sm">
                                    {payment.receiptNo || "—"}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div
                                    className="text-white/70 text-sm max-w-xs truncate"
                                    title={payment.remarks || undefined}
                                  >
                                    {payment.remarks || "—"}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
