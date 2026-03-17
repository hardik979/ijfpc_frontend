"use client";

import { useEffect, useMemo, useState } from "react";
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

type ViewState =
  | "dashboard"
  | "collected"
  | "remaining"
  | "students"
  | "monthly";

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

const parsePackageAmount = (input: string): number => {
  if (!input) return 0;

  const s = String(input).trim().toLowerCase();
  const hasLpa = /lpa|lakh|lakhs|lac|lacs/.test(s);
  const hasCr = /cr|crore|crores/.test(s);
  const hasK = /\bk\b/.test(s);
  const hasRs = /₹|rs|inr/.test(s);

  // strip commas and grab the first number (keeps decimal)
  const numMatch = s.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  if (!numMatch) return 0;

  const num = parseFloat(numMatch[1]);

  // Explicit units first
  if (hasCr) return num * 1e7; // crore → 10,000,000
  if (hasK && !hasLpa) return num * 1e3; // "18K" → 18,000

  if (hasLpa) {
    // Heuristic:
    // - Typical LPA values are < 100 (e.g. 7.5, 12)
    // - If it's already a big number (>= 1000), assume it's rupees with a wrong "LPA" suffix.
    return num >= 1000 ? num : num * 1e5;
  }

  // If it looks like plain rupees (₹/INR/commas) or just a bare number → rupees
  if (hasRs || num >= 1000) return num;

  // Fallback: treat small bare numbers as lakhs
  return num * 1e5;
};
const packagePercent = (collected: number, packageStr: string): number => {
  const pkg = parsePackageAmount(packageStr);
  if (!pkg) return 0;
  return Math.min(100, (collected / pkg) * 100);
};
// ===== DISCOUNT-AWARE REMAINING =====
const getNumeric = (x: any) => {
  if (typeof x === "number") return x;
  if (x == null) return 0;
  const n = parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Prefer row.raw.discount if present; fall back to row.discount / 0 */
const extractDiscount = (row: RecordRow) => {
  // your API mapper already includes `discount` as a string in `raw` (and sometimes as a top-level string too)
  const rawDiscount = row?.raw?.discount ?? (row as any).discount ?? 0;
  return getNumeric(rawDiscount);
};

/** Remaining = totalPPFee - discount - collected (floored at 0) */
const remainingDue = (row: RecordRow) => {
  const fee = getNumeric(row.totalPPFee);
  const disc = extractDiscount(row);
  const coll = getNumeric(row.collected);
  return Math.max(fee - disc - coll, 0);
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
  rows,
  onNavigate,
}: {
  rows: RecordRow[];
  onNavigate: (view: ViewState, data?: any) => void;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthlyData = useMemo(() => {
    const collections = rows.reduce((acc, row) => {
      row.installments.forEach((inst) => {
        if (inst.status === "paid" && inst.paidDate) {
          const month = monthKey(inst.paidDate);
          if (month === selectedMonth) {
            if (!acc[month])
              acc[month] = { month, collected: 0, students: new Set() };
            acc[month].collected += inst.amount;
            acc[month].students.add(row._id);
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
  }, [rows, selectedMonth]);

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
        {/* ...inside MonthlyCollectionCard header */}
        <div className="flex items-center gap-2">
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
  rows,
  onNavigate,
}: {
  rows: RecordRow[];
  onNavigate: (view: ViewState, data?: any) => void;
}) {
  const metrics = useMemo(() => {
    const totalCollected = rows.reduce((sum, r) => sum + r.collected, 0);
    const totalRemaining = rows.reduce((sum, r) => sum + remainingDue(r), 0); // ← discount-aware
    const totalStudents = rows.length;

    return { totalCollected, totalRemaining, totalStudents };
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

  // Placements vs Collections chart data
  const placementsVsCollectionsData = useMemo(() => {
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

      {/* Monthly Collection Card */}
      <MonthlyCollectionCard rows={rows} onNavigate={onNavigate} />

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

      {/* Placements vs Collections Graph */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Placements vs Collections
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={placementsVsCollectionsData}>
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
    </div>
  );
}

// ======================
// MONTHLY VIEW
// ======================
function MonthlyView({
  rows,
  selectedMonth,
}: {
  rows: RecordRow[];
  selectedMonth: string;
}) {
  // rows having at least one payment in the month
  const studentsForMonth = useMemo(() => {
    return rows.filter((row) =>
      row.installments.some(
        (inst) =>
          inst.status === "paid" &&
          inst.paidDate &&
          monthKey(inst.paidDate) === selectedMonth
      )
    );
  }, [rows, selectedMonth]);

  const monthlyTotal = useMemo(() => {
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
  const monthScopedRows = useMemo(() => {
    return studentsForMonth
      .map((row) => {
        const collectedThisMonth = row.installments
          .filter(
            (inst) =>
              inst.status === "paid" &&
              inst.paidDate &&
              monthKey(inst.paidDate) === selectedMonth
          )
          .reduce((sum, inst) => sum + inst.amount, 0);

        return {
          ...row,
          collected: collectedThisMonth, // override to month-only amount
        };
      })
      .filter((r) => r.collected > 0);
  }, [studentsForMonth, selectedMonth]);

  const formatDisplayMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" }
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
          {monthScopedRows.length} students made payments
        </p>
      </div>
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          Students who made payments in {formatDisplayMonth(selectedMonth)}
        </h3>

        <MonthlyStudentTable rows={rows} selectedMonth={selectedMonth} />
      </div>
    </div>
  );
}

// ======================
// COLLECTED VIEW
// ======================
function CollectedView({ rows }: { rows: RecordRow[] }) {
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
      {/* All Students Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          All Students - Fee Collection Details ({rows.length})
        </h3>
        <StudentTable rows={rows} showPackagePercentage />
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
function RemainingView({ rows }: { rows: RecordRow[] }) {
  const studentsWithRemaining = useMemo(() => {
    return rows.filter((row) => remainingDue(row) > 0);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Students with Remaining Fees ({studentsWithRemaining.length})
        </h3>
        <StudentTable
          rows={studentsWithRemaining}
          showRemaining
          showPackagePercentage
        />
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

  return (
    <div className="space-y-8">
      {/* Month Selector and Results */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Students by Payment Month
          </h3>
          <div className="flex items-center gap-2">
            <CustomDatePicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              placeholder="Select month to filter"
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
          <StudentTable rows={studentsForMonth} showPackagePercentage />
        ) : (
          <StudentTable rows={rows} showPackagePercentage />
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
  showPackagePercentage = false,
  collectedLabel = "Collected",
}: {
  rows: RecordRow[];
  showRemaining?: boolean;
  showPackagePercentage?: boolean;
  collectedLabel?: string;
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

  const getPackagePercentage = (row: RecordRow) => {
    const packageAmount = parsePackageAmount(row.package);
    if (packageAmount === 0 || row.collected === 0) return 0;
    return (row.collected / packageAmount) * 100;
  };

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
              {showPackagePercentage && (
                <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                  Package %
                </th>
              )}
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
                {showPackagePercentage && (
                  <td className="px-4 py-4 text-blue-300 font-semibold text-sm">
                    {packagePercent(row.collected, row.package).toFixed(1)}%
                  </td>
                )}

                {showRemaining && (
                  <td className="px-4 py-4 text-amber-300 font-semibold text-sm">
                    {currency(remainingDue(row))}
                  </td>
                )}

                <td className="px-4 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      remainingDue(row) === 0
                        ? "text-emerald-300 bg-emerald-500/20 border-emerald-400/30"
                        : "text-amber-300 bg-amber-500/20 border-amber-400/30"
                    }`}
                  >
                    {remainingDue(row) === 0 ? "Paid" : "Partial"}
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
function MonthlyStudentTable({
  rows,
  selectedMonth,
}: {
  rows: RecordRow[];
  selectedMonth: string;
}) {
  const [selectedStudent, setSelectedStudent] = useState<RecordRow | null>(
    null
  );

  const monthRows = useMemo(() => {
    return rows
      .map((row) => {
        const monthInst = row.installments.filter(
          (inst) =>
            inst.status === "paid" &&
            inst.paidDate &&
            monthKey(inst.paidDate) === selectedMonth
        );

        const monthCollected = monthInst.reduce((sum, i) => sum + i.amount, 0);

        return {
          row,
          monthInst,
          monthCollected,
        };
      })
      .filter((x) => x.monthCollected > 0);
  }, [rows, selectedMonth]);

  if (monthRows.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-purple-300/60 mx-auto mb-4" />
        <p className="text-purple-200/80">No payments in this month</p>
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
                Collected (this month)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Installments (this month)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-200">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {monthRows.map(({ row, monthInst }, idx) => (
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
                  {currency(
                    monthInst.reduce((sum, inst) => sum + inst.amount, 0)
                  )}
                </td>

                <td className="px-4 py-4 text-purple-100 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {monthInst.map((inst, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10 border border-purple-300/20 text-xs"
                      >
                        <span className="font-semibold">
                          {currency(inst.amount)}
                        </span>
                        <span className="text-purple-200/70">•</span>
                        <span className="text-purple-200/80">
                          {formatDate(inst.paidDate)}
                        </span>
                        {inst.status === "paid" ? (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px]">
                            Paid
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </td>

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

  const getPackagePercentage = (row: RecordRow) => {
    const packageAmount = parsePackageAmount(row.package);
    if (packageAmount === 0 || row.collected === 0) return 0;
    return (row.collected / packageAmount) * 100;
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
                {currency(remainingDue(student))}
              </p>
            </div>
          </div>

          {/* Package Percentage */}
          <div className="bg-blue-500/20 rounded-xl border border-blue-400/30 p-4">
            <p className="text-blue-300 text-xs font-medium">
              Package Collection %
            </p>
            <p className="text-blue-200 text-lg font-semibold">
              {packagePercent(student.collected, student.package).toFixed(2)}%
            </p>

            <p className="text-blue-200/60 text-xs mt-1">
              of {student.package} package
            </p>
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
  const [viewData, setViewData] = useState<any>(null);

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
              <DashboardView rows={rows} onNavigate={handleNavigation} />
            )}
            {currentView === "collected" && <CollectedView rows={rows} />}
            {currentView === "remaining" && <RemainingView rows={rows} />}
            {currentView === "students" && <StudentsView rows={rows} />}
            {currentView === "monthly" && viewData && (
              <MonthlyView rows={rows} selectedMonth={viewData.selectedMonth} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
