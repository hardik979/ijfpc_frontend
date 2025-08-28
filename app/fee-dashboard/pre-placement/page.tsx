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
  Copy,
  X,
  BarChart3,
  Search,
  Filter,
  UserCheck,
  UserX,
  GraduationCap,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ======================
// TYPES & CONFIG
// ======================
import { API_BASE_URL } from "@/lib/api";
export type PrePlacementStudent = {
  _id: string;
  name: string;
  courseName: string;
  terms: string;
  totalFee: number;
  totalReceived: number;
  remainingFee: number;
  status: "ACTIVE" | "DROPPED";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  paymentsCount: number;
  payments: {
    amount: number;
    date: string | null;
    mode: string;
    receiptNos: string[];
    note: string;
  }[];
  collectedInRange?: number;
  paymentsInRange?: any[];
};

type SummaryData = {
  totalStudents: number;
  totalFee: number;
  totalReceived: number;
  remainingFee: number;
  collectedInRange?: number;
  monthly: {
    _id: { y: number; m: number };
    collected: number;
  }[];
  range?: { from: Date; to: Date } | null;
  filters: { status: string | null; course: string | null };
};

type ViewState = "dashboard" | "collected" | "remaining" | "students";

const STATUSES = ["ACTIVE", "DROPPED"];

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "text-emerald-300 bg-emerald-500/20 border-emerald-400/30";
    case "DROPPED":
      return "text-red-300 bg-red-500/20 border-red-400/30";
    default:
      return "text-purple-300 bg-purple-500/20 border-purple-400/30";
  }
};

// ======================
// API SERVICE
// ======================
class PrePlacementService {
  static async fetchSummary(filters = {}): Promise<SummaryData> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await fetch(
      `${API_BASE_URL}/api/preplacement/summary?${params}`
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  static async fetchStudents(
    page = 1,
    limit = 20,
    filters = {}
  ): Promise<{
    page: number;
    limit: number;
    total: number;
    rows: PrePlacementStudent[];
    range?: { from: Date; to: Date } | null;
  }> {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    params.append("includePayments", "true");

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    const response = await fetch(
      `${API_BASE_URL}/api/preplacement/students?${params}`
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

  static async updateStudentStatus(
    studentId: string,
    status: string
  ): Promise<PrePlacementStudent> {
    const response = await fetch(
      `${API_BASE_URL}/api/preplacement/students/${studentId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
}

// ======================
// DASHBOARD VIEW
// ======================
function DashboardView({
  summary,
  onNavigate,
}: {
  summary: SummaryData;
  onNavigate: (view: ViewState) => void;
}) {
  const chartData = useMemo(() => {
    return [
      {
        name: "Collected",
        value: summary.totalReceived,
        color: "#10b981",
      },
      {
        name: "Remaining",
        value: summary.remainingFee,
        color: "#f59e0b",
      },
    ];
  }, [summary]);

  const monthlyData = useMemo(() => {
    return summary.monthly.map((item) => ({
      month: `${item._id.y}-${String(item._id.m).padStart(2, "0")}`,
      collected: item.collected,
    }));
  }, [summary.monthly]);

  const collectionRate = useMemo(() => {
    const rate =
      summary.totalFee > 0
        ? (summary.totalReceived / summary.totalFee) * 100
        : 0;
    return Math.round(rate);
  }, [summary]);
  const formatINRShort = (n: number) => {
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(n);
    if (v >= 1e7)
      return `${sign}₹${+(v / 1e7).toFixed(v % 1e7 === 0 ? 0 : 1)}Cr`;
    if (v >= 1e5)
      return `${sign}₹${+(v / 1e5).toFixed(v % 1e5 === 0 ? 0 : 1)}L`;
    if (v >= 1e3)
      return `${sign}₹${+(v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1)}K`;
    return `${sign}₹${v}`;
  };

  return (
    <div className="space-y-8">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            Total Collected
          </h3>
          <p className="text-2xl font-bold text-white">
            {currency(summary.totalReceived)}
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
            {currency(summary.remainingFee)}
          </p>
          <p className="text-amber-200/60 text-sm mt-2">
            Click to view pending
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
            <GraduationCap className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-purple-300 text-sm font-medium mb-2">
            Total Students
          </h3>
          <p className="text-2xl font-bold text-white">
            {summary.totalStudents}
          </p>
          <p className="text-purple-200/60 text-sm mt-2">
            Click to view all students
          </p>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Overview */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Fee Collection Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#55bcc2",
                  border: "1px solid #6b46c1",
                  borderRadius: "12px",
                  backdropFilter: "blur(10px)",
                }}
                formatter={(value) => [currency(value as number), "Amount"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Collections Trend */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Monthly Collections
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#6b46c1"
                opacity={0.3}
              />
              <XAxis dataKey="month" stroke="#c4b5fd" fontSize={12} />
              <YAxis
                stroke="#c4b5fd"
                fontSize={12}
                tickFormatter={(value) => formatINRShort(value as number)}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1b3a",
                  border: "1px solid #6b46c1",
                  borderRadius: "12px",
                  backdropFilter: "blur(10px)",
                }}
                labelStyle={{ color: "#e2e8f0" }}
                // For tooltip value, show full INR with Indian commas:
                formatter={(value) => [
                  new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(value as number),
                  "Collected",
                ]}
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
      </div>
    </div>
  );
}

// ======================
// COLLECTED VIEW
// ======================
function CollectedView({ students }: { students: PrePlacementStudent[] }) {
  const fullyPaidStudents = useMemo(() => {
    return students.filter((student) => student.remainingFee === 0);
  }, [students]);

  const monthlyCollections = useMemo(() => {
    const collections: Record<string, { month: string; collected: number }> =
      {};

    students.forEach((student) => {
      student.payments?.forEach((payment) => {
        if (payment.date) {
          const date = new Date(payment.date);
          const month = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;
          if (!collections[month]) {
            collections[month] = { month, collected: 0 };
          }
          collections[month].collected += payment.amount;
        }
      });
    });

    return Object.values(collections)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [students]);

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
          <UserCheck className="w-5 h-5 text-emerald-400" />
          Students with Full Payment ({fullyPaidStudents.length})
        </h3>
        <StudentTable students={fullyPaidStudents} />
      </div>
    </div>
  );
}

// ======================
// REMAINING VIEW
// ======================
function RemainingView({ students }: { students: PrePlacementStudent[] }) {
  const studentsWithRemaining = useMemo(() => {
    return students.filter((student) => student.remainingFee > 0);
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Students with Remaining Fees ({studentsWithRemaining.length})
        </h3>
        <StudentTable students={studentsWithRemaining} showRemaining />
      </div>
    </div>
  );
}

// ======================
// STUDENTS VIEW
// ======================
function StudentsView({
  students,
  onRefresh,
}: {
  students: PrePlacementStudent[];
  onRefresh: () => void;
}) {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    course: "",
  });

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        !filters.search ||
        student.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        student.courseName
          ?.toLowerCase()
          .includes(filters.search.toLowerCase());

      const matchesStatus =
        !filters.status || student.status === filters.status;

      const matchesCourse =
        !filters.course ||
        student.courseName
          ?.toLowerCase()
          .includes(filters.course.toLowerCase());

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [students, filters]);

  const statusCounts = useMemo(() => {
    return students.reduce((acc, student) => {
      acc[student.status] = (acc[student.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-500/20 rounded-xl border border-emerald-400/30 p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-emerald-300 text-sm font-medium">
                Active Students
              </p>
              <p className="text-emerald-200 text-2xl font-bold">
                {statusCounts.ACTIVE || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/20 rounded-xl border border-red-400/30 p-4">
          <div className="flex items-center gap-3">
            <UserX className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-red-300 text-sm font-medium">
                Dropped Students
              </p>
              <p className="text-red-200 text-2xl font-bold">
                {statusCounts.DROPPED || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
              <input
                type="text"
                placeholder="Search by name or course..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-purple-300/20 rounded-xl text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 bg-white/10 border border-purple-300/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">All Status</option>
            {STATUSES.map((status) => (
              <option key={status} value={status} className="bg-gray-800">
                {status}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by course..."
            value={filters.course}
            onChange={(e) => setFilters({ ...filters, course: e.target.value })}
            className="px-4 py-2 bg-white/10 border border-purple-300/20 rounded-xl text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          All Students ({filteredStudents.length})
        </h3>
        <StudentTable students={filteredStudents} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

// ======================
// STUDENT TABLE
// ======================
function StudentTable({
  students,
  showRemaining = false,
  onRefresh,
}: {
  students: PrePlacementStudent[];
  showRemaining?: boolean;
  onRefresh?: () => void;
}) {
  const [selectedStudent, setSelectedStudent] =
    useState<PrePlacementStudent | null>(null);

  if (students.length === 0) {
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
                Course
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Total Fee
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
            {students.map((student) => (
              <tr
                key={student._id}
                onClick={() => setSelectedStudent(student)}
                className="cursor-pointer hover:bg-white/10 transition-all duration-200 border-b border-purple-300/10"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {student.name}
                      </p>
                      <p className="text-purple-200/60 text-xs">
                        {student.terms || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-purple-100 text-sm">
                  {student.courseName || "—"}
                </td>
                <td className="px-4 py-4 text-blue-300 font-semibold text-sm">
                  {currency(student.totalFee)}
                </td>
                <td className="px-4 py-4 text-emerald-300 font-semibold text-sm">
                  {currency(student.totalReceived)}
                </td>
                {showRemaining && (
                  <td className="px-4 py-4 text-amber-300 font-semibold text-sm">
                    {currency(student.remainingFee)}
                  </td>
                )}
                <td className="px-4 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      student.status
                    )}`}
                  >
                    {student.status}
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
          onUpdate={onRefresh}
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
  onUpdate,
}: {
  student: PrePlacementStudent;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await PrePlacementService.updateStudentStatus(student._id, newStatus);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
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
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {student.name}
                </h2>
                <p className="text-purple-200/80">
                  {student.courseName} • {student.terms}
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
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-500/20 rounded-xl border border-blue-400/30 p-4">
              <p className="text-blue-300 text-xs font-medium">Total Fee</p>
              <p className="text-blue-200 text-lg font-semibold">
                {currency(student.totalFee)}
              </p>
            </div>
            <div className="bg-emerald-500/20 rounded-xl border border-emerald-400/30 p-4">
              <p className="text-emerald-300 text-xs font-medium">Collected</p>
              <p className="text-emerald-200 text-lg font-semibold">
                {currency(student.totalReceived)}
              </p>
            </div>
            <div className="bg-amber-500/20 rounded-xl border border-amber-400/30 p-4">
              <p className="text-amber-300 text-xs font-medium">Remaining</p>
              <p className="text-amber-200 text-lg font-semibold">
                {currency(student.remainingFee)}
              </p>
            </div>
          </div>

          {/* Status Update */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Status Management
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">Current Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    student.status
                  )}`}
                >
                  {student.status}
                </span>
              </div>
              <div className="flex gap-2">
                {STATUSES.filter((status) => status !== student.status).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      disabled={isUpdating}
                      className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-50 ${
                        status === "ACTIVE"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {isUpdating ? "Updating..." : `Mark as ${status}`}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              Student Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">Course Name</span>
                <span className="text-purple-200">
                  {student.courseName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">Terms</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-200">
                    {student.terms || "—"}
                  </span>
                  <button
                    onClick={() => copyToClipboard(student.terms || "")}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 text-purple-300" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">Due Date</span>
                <span className="text-purple-200">
                  {formatDate(student.dueDate)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <span className="text-purple-100">Payments Count</span>
                <span className="text-purple-200">{student.paymentsCount}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {student.payments && student.payments.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-purple-400" />
                Payment History
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {student.payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-purple-300/20"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {currency(payment.amount)}
                      </p>
                      <p className="text-purple-200/60 text-xs">
                        {formatDate(payment.date)} • {payment.mode || "—"}
                      </p>
                      {payment.note && (
                        <p className="text-purple-300/80 text-xs mt-1">
                          {payment.note}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {payment.receiptNos && payment.receiptNos.length > 0 && (
                        <p className="text-purple-200/60 text-xs">
                          Receipt: {payment.receiptNos.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-purple-300/20 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <p className="text-xs text-purple-200/80 mb-1">Created</p>
                <p className="text-purple-100 text-sm">
                  {formatDate(student.createdAt)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-purple-300/20">
                <p className="text-xs text-purple-200/80 mb-1">Updated</p>
                <p className="text-purple-100 text-sm">
                  {formatDate(student.updatedAt)}
                </p>
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
export default function PrePlacementDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [students, setStudents] = useState<PrePlacementStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, studentsData] = await Promise.all([
        PrePlacementService.fetchSummary(),
        PrePlacementService.fetchStudents(1, 1000), // Load all students for client-side filtering
      ]);

      setSummary(summaryData);
      setStudents(studentsData.rows);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(
        "Failed to load data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = async () => {
    await loadData();
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
        return "Pre Placement Dashboard";
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
                Pre-placement fee tracking and student management
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
              <span>Loading student data...</span>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && summary && (
          <div>
            {currentView === "dashboard" && (
              <DashboardView summary={summary} onNavigate={setCurrentView} />
            )}
            {currentView === "collected" && (
              <CollectedView students={students} />
            )}
            {currentView === "remaining" && (
              <RemainingView students={students} />
            )}
            {currentView === "students" && (
              <StudentsView students={students} onRefresh={refreshData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
