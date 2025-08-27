"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Users,
  IndianRupee,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Building2,
  Clock,
  Package,
  Phone,
  Copy,
  X,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from "recharts";
import { API_BASE_URL } from "@/lib/api";

// ======================
// TYPES & CONFIG
// ======================

export type RecordRow = {
  _id: string;
  studentName: string;
  offerDate: string | null;
  joiningDate: string | null;
  hrName: string;
  hrContact: string;
  hrEmail: string;
  company: string;
  location: string;
  package: string;
  totalPPFee: number;
  collected: number;
  remaining: number;
  status: "paid" | "partial" | "overdue";
  daysSinceOffer: number;
  installments: {
    amount: number;
    dueDate: string | null;
    paidDate: string | null;
    status: "paid" | "pending" | "overdue";
  }[];
  raw: any;
};

type ViewState = "dashboard" | "collected" | "remaining" | "students";

// ======================
// UTILITIES
// ======================
const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const formatDate = (date: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const monthKey = (iso: string | null): string => {
  if (!iso || iso.length < 7) return "";
  return `${iso.slice(0, 4)}-${iso.slice(5, 7)}`;
};

// ======================
// API SERVICE
// ======================
class PostPlacementService {
  static async fetchOffers(): Promise<RecordRow[]> {
    try {
      const params = new URLSearchParams();
      params.append("limit", "1000");

      const response = await fetch(
        `${API_BASE_URL}/api/post-placement/offers?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Failed to fetch offers:", error);
      throw error;
    }
  }
}

// ======================
// DASHBOARD VIEW
// ======================
function DashboardView({
  rows,
  onNavigate,
}: {
  rows: RecordRow[];
  onNavigate: (view: ViewState) => void;
}) {
  const metrics = useMemo(() => {
    const totalCollected = rows.reduce((sum, r) => sum + r.collected, 0);
    const totalRemaining = rows.reduce((sum, r) => sum + r.remaining, 0);
    const totalStudents = rows.length;

    return {
      totalCollected,
      totalRemaining,
      totalStudents,
    };
  }, [rows]);

  // Chart data for overview graph
  const chartData = useMemo(() => {
    return [
      {
        name: "Collected",
        value: metrics.totalCollected,
        color: "#10b981",
      },
      {
        name: "Remaining",
        value: metrics.totalRemaining,
        color: "#f59e0b",
      },
    ];
  }, [metrics]);

  return (
    <div className="space-y-8">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate("collected")}
          className="group relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-emerald-500/10 backdrop-blur-sm p-6 text-left shadow-lg hover:shadow-xl hover:bg-emerald-500/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-emerald-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-emerald-300 text-sm font-medium mb-2">
            Total Fee Collected
          </h3>
          <p className="text-2xl font-bold text-white">
            {currency(metrics.totalCollected)}
          </p>
          <p className="text-emerald-200/60 text-sm mt-2">
            Click to view collections
          </p>
        </button>

        <button
          onClick={() => onNavigate("remaining")}
          className="group relative overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-500/10 backdrop-blur-sm p-6 text-left shadow-lg hover:shadow-xl hover:bg-amber-500/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <Clock className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-amber-300 text-sm font-medium mb-2">
            Remaining Fee
          </h3>
          <p className="text-2xl font-bold text-white">
            {currency(metrics.totalRemaining)}
          </p>
          <p className="text-amber-200/60 text-sm mt-2">
            Click to view pending payments
          </p>
        </button>

        <button
          onClick={() => onNavigate("students")}
          className="group relative overflow-hidden rounded-2xl border border-purple-300/20 bg-purple-500/10 backdrop-blur-sm p-6 text-left shadow-lg hover:shadow-xl hover:bg-purple-500/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <BarChart3 className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-purple-300 text-sm font-medium mb-2">
            Total Students Placed
          </h3>
          <p className="text-2xl font-bold text-white">
            {metrics.totalStudents}
          </p>
          <p className="text-purple-200/60 text-sm mt-2">
            Click to view all students
          </p>
        </button>
      </div>

      {/* Overview Graph */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Fee Collection Overview
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#6b46c1"
              opacity={0.3}
            />
            <XAxis dataKey="name" stroke="#c4b5fd" fontSize={12} />
            <YAxis
              stroke="#c4b5fd"
              fontSize={12}
              tickFormatter={(value) => `₹${value / 100000}L`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1b3a",
                border: "1px solid #6b46c1",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
              }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value) => [currency(value as number), "Amount"]}
            />
            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ======================
// COLLECTED VIEW
// ======================
function CollectedView({ rows }: { rows: RecordRow[] }) {
  const fullyPaidStudents = useMemo(() => {
    return rows.filter((row) => row.remaining === 0);
  }, [rows]);

  const monthlyCollections = useMemo(() => {
    const collections = rows.reduce((acc, row) => {
      // Get payments from installments
      row.installments.forEach((inst) => {
        if (inst.status === "paid" && inst.paidDate) {
          const month = monthKey(inst.paidDate);
          if (!month) return;
          if (!acc[month]) acc[month] = { month, collected: 0 };
          acc[month].collected += inst.amount;
        }
      });
      return acc;
    }, {} as Record<string, { month: string; collected: number }>);

    return Object.values(collections)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [rows]);

  return (
    <div className="space-y-8">
      {/* Monthly Collections Graph */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Monthly Collections Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyCollections}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#6b46c1"
              opacity={0.3}
            />
            <XAxis dataKey="month" stroke="#c4b5fd" fontSize={12} />
            <YAxis
              stroke="#c4b5fd"
              fontSize={12}
              tickFormatter={(value) => `₹${value / 1000}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1b3a",
                border: "1px solid #6b46c1",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
              }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value) => [currency(value as number), "Collected"]}
            />
            <Line
              type="monotone"
              dataKey="collected"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Fully Paid Students Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          Students with Full Payment ({fullyPaidStudents.length})
        </h3>
        <StudentTable rows={fullyPaidStudents} />
      </div>
    </div>
  );
}

// ======================
// REMAINING VIEW
// ======================
function RemainingView({ rows }: { rows: RecordRow[] }) {
  const studentsWithRemaining = useMemo(() => {
    return rows.filter((row) => row.remaining > 0);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Students with Remaining Fees ({studentsWithRemaining.length})
        </h3>
        <StudentTable rows={studentsWithRemaining} showRemaining />
      </div>
    </div>
  );
}

// ======================
// STUDENTS VIEW
// ======================
function StudentsView({ rows }: { rows: RecordRow[] }) {
  const [selectedMonth, setSelectedMonth] = useState("");

  const studentsForMonth = useMemo(() => {
    if (!selectedMonth) return [];

    return rows.filter((row) => {
      return row.installments.some(
        (inst) =>
          inst.status === "paid" &&
          inst.paidDate &&
          monthKey(inst.paidDate) === selectedMonth
      );
    });
  }, [rows, selectedMonth]);

  const monthlyTotal = useMemo(() => {
    if (!selectedMonth) return 0;

    return rows.reduce((total, row) => {
      const monthlyPayments = row.installments
        .filter(
          (inst) =>
            inst.status === "paid" &&
            inst.paidDate &&
            monthKey(inst.paidDate) === selectedMonth
        )
        .reduce((sum, inst) => sum + inst.amount, 0);
      return total + monthlyPayments;
    }, 0);
  }, [rows, selectedMonth]);

  // Placements vs Collections chart data
  const chartData = useMemo(() => {
    const monthlyData = rows.reduce((acc, row) => {
      const month = monthKey(row.offerDate);
      if (!month) return acc;
      if (!acc[month]) acc[month] = { month, placements: 0, collected: 0 };
      acc[month].placements += 1;
      acc[month].collected += row.collected;
      return acc;
    }, {} as Record<string, { month: string; placements: number; collected: number }>);

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [rows]);

  return (
    <div className="space-y-8">
      {/* Placements vs Collections Graph */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Placements vs Collections
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#6b46c1"
              opacity={0.3}
            />
            <XAxis dataKey="month" stroke="#c4b5fd" fontSize={12} />
            <YAxis yAxisId="left" stroke="#c4b5fd" fontSize={12} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#c4b5fd"
              fontSize={12}
              tickFormatter={(value) => `₹${value / 1000}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1b3a",
                border: "1px solid #6b46c1",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
              }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Bar
              yAxisId="left"
              dataKey="placements"
              fill="#8b5cf6"
              name="Placements"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="collected"
              stroke="#10b981"
              strokeWidth={3}
              name="Collections"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Month Selector and Results */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Students by Payment Month
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-purple-300/20 bg-white/5 backdrop-blur-sm text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
            />
          </div>
        </div>

        {selectedMonth && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
            <h4 className="text-emerald-300 font-medium mb-2">
              Total Collection for{" "}
              {new Date(selectedMonth + "-01").toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </h4>
            <p className="text-2xl font-bold text-emerald-200">
              {currency(monthlyTotal)}
            </p>
            <p className="text-emerald-200/60 text-sm">
              {studentsForMonth.length} students made payments
            </p>
          </div>
        )}

        {selectedMonth ? (
          <StudentTable rows={studentsForMonth} />
        ) : (
          <StudentTable rows={rows} />
        )}
      </div>
    </div>
  );
}

// ======================
// STUDENT TABLE
// ======================
function StudentTable({
  rows,
  showRemaining = false,
}: {
  rows: RecordRow[];
  showRemaining?: boolean;
}) {
  const [selectedStudent, setSelectedStudent] = useState<RecordRow | null>(
    null
  );

  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-purple-300/60 mx-auto mb-4" />
        <p className="text-purple-200/80">No students found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-purple-500/10 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Package
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Collected
              </th>
              {showRemaining && (
                <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                  Remaining
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row._id}-${idx}`}
                onClick={() => setSelectedStudent(row)}
                className="cursor-pointer hover:bg-white/10 transition-all duration-200 border-b border-purple-300/10"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                      {row.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {row.studentName}
                      </p>
                      <p className="text-purple-200/60 text-xs">
                        {row.location}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-purple-100 text-sm">
                  {row.company || "—"}
                </td>
                <td className="px-4 py-4 text-purple-100 text-sm">
                  {row.package || "—"}
                </td>
                <td className="px-4 py-4 text-emerald-300 font-semibold text-sm">
                  {currency(row.collected)}
                </td>
                {showRemaining && (
                  <td className="px-4 py-4 text-amber-300 font-semibold text-sm">
                    {currency(row.remaining)}
                  </td>
                )}
                <td className="px-4 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      row.remaining === 0
                        ? "text-emerald-300 bg-emerald-500/20 border-emerald-400/30"
                        : "text-amber-300 bg-amber-500/20 border-amber-400/30"
                    }`}
                  >
                    {row.remaining === 0 ? "Paid" : "Partial"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}

// ======================
// STUDENT DETAIL MODAL
// ======================
function StudentDetailModal({
  student,
  onClose,
}: {
  student: RecordRow;
  onClose: () => void;
}) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl shadow-2xl overflow-y-auto border-l border-purple-300/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-xl border-b border-purple-300/20 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                {student.studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {student.studentName}
                </h2>
                <p className="text-purple-200/80">
                  {student.company} • {student.location}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5 text-purple-200" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/20 rounded-xl border border-emerald-400/30 p-4">
              <p className="text-emerald-300 text-xs font-medium">Collected</p>
              <p className="text-emerald-200 text-lg font-semibold">
                {currency(student.collected)}
              </p>
            </div>
            <div className="bg-amber-500/20 rounded-xl border border-amber-400/30 p-4">
              <p className="text-amber-300 text-xs font-medium">Remaining</p>
              <p className="text-amber-200 text-lg font-semibold">
                {currency(student.remaining)}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-400" />
              HR Contact
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">{student.hrName || "—"}</span>
                <button
                  onClick={() => copyToClipboard(student.hrName)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 text-purple-300" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">
                  {student.hrContact || "—"}
                </span>
                <button
                  onClick={() => copyToClipboard(student.hrContact)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 text-purple-300" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100 truncate">
                  {student.hrEmail || "—"}
                </span>
                <button
                  onClick={() => copyToClipboard(student.hrEmail)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 text-purple-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <p className="text-xs text-purple-200/80 mb-1">Offer Date</p>
                <p className="text-purple-100">
                  {formatDate(student.offerDate)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <p className="text-xs text-purple-200/80 mb-1">Package</p>
                <p className="text-purple-100">{student.package}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================
// MAIN COMPONENT
// ======================
export default function PostPlacementDashboard() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PostPlacementService.fetchOffers();
        setRows(data);
      } catch (err) {
        console.error("Failed to load placement data:", err);
        setError(
          "Failed to load placement data. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const data = await PostPlacementService.fetchOffers();
      setRows(data);
    } catch (err) {
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "collected":
        return "Fee Collections";
      case "remaining":
        return "Remaining Fees";
      case "students":
        return "All Students";
      default:
        return "Post Placement Dashboard";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Error Loading Data
          </h2>
          <p className="text-purple-200/80 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                currentView === "dashboard"
                  ? (window.location.href = "/fee-dashboard")
                  : setCurrentView("dashboard")
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border border-purple-300/20 ${
                currentView === "dashboard"
                  ? "bg-purple-600/30 text-purple-100"
                  : "bg-white/10 hover:bg-white/20 text-purple-200"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">
                {currentView === "dashboard"
                  ? "Dashboard"
                  : "Back to Dashboard"}
              </span>
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">
                {getViewTitle()}
              </h1>
              <p className="text-purple-200/80">
                Placement fee tracking and analytics
              </p>
            </div>
          </div>
          <button
            onClick={refreshData}
            disabled={loading}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw
              className={`w-5 h-5 text-purple-200 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-purple-200">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading placement data...</span>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div>
            {currentView === "dashboard" && (
              <DashboardView rows={rows} onNavigate={setCurrentView} />
            )}
            {currentView === "collected" && <CollectedView rows={rows} />}
            {currentView === "remaining" && <RemainingView rows={rows} />}
            {currentView === "students" && <StudentsView rows={rows} />}
          </div>
        )}
      </div>
    </div>
  );
}
