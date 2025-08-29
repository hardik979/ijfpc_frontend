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
  Copy,
  X,
  BarChart3,
  Search,
  Filter,
  UserCheck,
  UserX,
  GraduationCap,
  ChevronDown,
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

type ViewState =
  | "dashboard"
  | "collected"
  | "remaining"
  | "students"
  | "monthly";

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

const monthKey = (iso: string | null): string => {
  if (!iso || iso.length < 7) return "";
  return `${iso.slice(0, 4)}-${iso.slice(5, 7)}`;
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
// CUSTOM DATE PICKER
// ======================
function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select month",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const formatDisplayValue = (value: string) => {
    if (!value) return placeholder;
    const [year, month] = value.split("-");
    const monthName = months[parseInt(month) - 1];
    return `${monthName} ${year}`;
  };

  const handleMonthSelect = (monthIndex: number) => {
    const monthStr = (monthIndex + 1).toString().padStart(2, "0");
    onChange(`${selectedYear}-${monthStr}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        className="flex items-center justify-between w-full px-4 py-2 rounded-xl border border-purple-300/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all min-w-48"
      >
        <span className="text-sm">{formatDisplayValue(value)}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-purple-900/95 backdrop-blur-xl border border-purple-300/20 rounded-xl shadow-2xl z-[60] p-4 max-h-64 overflow-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Year Selector */}
          <div className="mb-4">
            <label className="block text-xs text-purple-200 mb-2">Year</label>
            <div className="flex gap-2 flex-wrap">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedYear(year);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    selectedYear === year
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-purple-200 hover:bg-white/20"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-xs text-purple-200 mb-2">Month</label>
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMonthSelect(index);
                  }}
                  className="px-3 py-2 rounded-lg text-sm bg-white/10 text-purple-200 hover:bg-purple-600 hover:text-white transition-all"
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================
// MONTHLY COLLECTION CARD
// ======================
function MonthlyCollectionCard({
  students,
  onNavigate,
}: {
  students: PrePlacementStudent[];
  onNavigate: (view: ViewState, data?: any) => void;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthlyData = useMemo(() => {
    const collections = students.reduce((acc, student) => {
      student.payments?.forEach((payment) => {
        if (payment.date) {
          const month = monthKey(payment.date);
          if (month === selectedMonth) {
            if (!acc[month])
              acc[month] = { month, collected: 0, students: new Set() };
            acc[month].collected += payment.amount;
            acc[month].students.add(student._id);
          }
        }
      });
      return acc;
    }, {} as Record<string, { month: string; collected: number; students: Set<string> }>);

    const data = collections[selectedMonth];
    return {
      collected: data?.collected || 0,
      studentCount: data?.students.size || 0,
    };
  }, [students, selectedMonth]);

  const formatDisplayMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  return (
    <div
      onClick={() => onNavigate("monthly", { selectedMonth })}
      className="group relative z-30 overflow-visible rounded-2xl border border-blue-300/20 bg-blue-500/10 backdrop-blur-sm p-6 cursor-pointer shadow-lg hover:shadow-xl hover:bg-blue-500/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-400" />
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <CustomDatePicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            placeholder="Select month"
          />
        </div>
      </div>

      <h3 className="text-blue-300 text-sm font-medium mb-2">
        Monthly Collection - {formatDisplayMonth(selectedMonth)}
      </h3>
      <p className="text-2xl font-bold text-white mb-2">
        {currency(monthlyData.collected)}
      </p>
      <p className="text-blue-200/60 text-sm">
        {monthlyData.studentCount} students made payments
      </p>
      <p className="text-blue-200/40 text-xs mt-2">
        Click to view detailed breakdown
      </p>
    </div>
  );
}

// ======================
// DASHBOARD VIEW
// ======================
function DashboardView({
  summary,
  students,
  onNavigate,
}: {
  summary: SummaryData;
  students: PrePlacementStudent[];
  onNavigate: (view: ViewState, data?: any) => void;
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
            {currency(summary.totalReceived)}
          </p>
          <p className="text-emerald-200/60 text-sm mt-2">
            Click to view all students
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

      {/* Monthly Collection Card */}
      <MonthlyCollectionCard students={students} onNavigate={onNavigate} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Overview */}
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
                formatter={(value) => [currency(value as number), "Amount"]}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </ComposedChart>
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
// MONTHLY VIEW
// ======================
function MonthlyView({
  students,
  selectedMonth,
}: {
  students: PrePlacementStudent[];
  selectedMonth: string;
}) {
  const studentsForMonth = useMemo(() => {
    return students.filter((student) => {
      return student.payments?.some(
        (payment) => payment.date && monthKey(payment.date) === selectedMonth
      );
    });
  }, [students, selectedMonth]);

  const monthlyTotal = useMemo(() => {
    return students.reduce((total, student) => {
      const monthlyPayments = (student.payments || [])
        .filter(
          (payment) => payment.date && monthKey(payment.date) === selectedMonth
        )
        .reduce((sum, payment) => sum + payment.amount, 0);
      return total + monthlyPayments;
    }, 0);
  }, [students, selectedMonth]);

  const formatDisplayMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
        <h4 className="text-emerald-300 font-medium mb-2">
          Total Collection for {formatDisplayMonth(selectedMonth)}
        </h4>
        <p className="text-2xl font-bold text-emerald-200">
          {currency(monthlyTotal)}
        </p>
        <p className="text-emerald-200/60 text-sm">
          {studentsForMonth.length} students made payments
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Students who made payments in {formatDisplayMonth(selectedMonth)}
        </h3>
        <StudentTable students={studentsForMonth} />
      </div>
    </div>
  );
}

// ======================
// COLLECTED VIEW
// ======================
function CollectedView({ students }: { students: PrePlacementStudent[] }) {
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
      {/* All Students Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-400" />
          All Students - Fee Collection Details ({students.length})
        </h3>
        <StudentTable students={students} />
      </div>

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
    </div>
  );
}

// ======================
// REMAINING VIEW
// ======================
function RemainingView({ students }: { students: PrePlacementStudent[] }) {
  const studentsWithRemaining = useMemo(() => {
    return students.filter((s) => s.status !== "DROPPED" && s.remainingFee > 0);
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
  const [selectedMonth, setSelectedMonth] = useState("");

  const filteredStudents = useMemo(() => {
    let filtered = students.filter((student) => {
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

    // Apply month filter if selected
    if (selectedMonth) {
      filtered = filtered.filter((student) =>
        student.payments?.some(
          (payment) => payment.date && monthKey(payment.date) === selectedMonth
        )
      );
    }

    return filtered;
  }, [students, filters, selectedMonth]);

  const statusCounts = useMemo(() => {
    return students.reduce((acc, student) => {
      acc[student.status] = (acc[student.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [students]);

  const monthlyTotal = useMemo(() => {
    if (!selectedMonth) return 0;
    return students.reduce((total, student) => {
      const monthlyPayments = (student.payments || [])
        .filter(
          (payment) => payment.date && monthKey(payment.date) === selectedMonth
        )
        .reduce((sum, payment) => sum + payment.amount, 0);
      return total + monthlyPayments;
    }, 0);
  }, [students, selectedMonth]);

  return (
    <div className="space-y-8">
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

      {/* Month Selector and Results */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Students by Payment Month
          </h3>
          <div className="flex items-center gap-2">
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <CustomDatePicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder="Select month to filter"
              />
            </div>
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
              {filteredStudents.length} students made payments
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
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
                    {student.status === "DROPPED"
                      ? "—"
                      : currency(student.remainingFee)}
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
                {student.status === "DROPPED"
                  ? "—"
                  : currency(student.remainingFee)}
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
  const [viewData, setViewData] = useState<any>(null);

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

  const handleNavigation = (view: ViewState, data?: any) => {
    setCurrentView(view);
    setViewData(data);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "collected":
        return "Fee Collections";
      case "remaining":
        return "Remaining Fees";
      case "students":
        return "All Students";
      case "monthly":
        return "Monthly Collection";
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
              <DashboardView
                summary={summary}
                students={students}
                onNavigate={handleNavigation}
              />
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
            {currentView === "monthly" && viewData && (
              <MonthlyView
                students={students}
                selectedMonth={viewData.selectedMonth}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
