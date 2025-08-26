
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Calendar,
  Users,
  IndianRupee,
  Search,
  X,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Filter,
  Building2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  Mail,
  Copy,
  ChevronDown,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Bot,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ======================
// TYPES & CONFIG
// ======================
const API_BASE_URL = "http://localhost:8000/api/post-placement";

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
  remainingPreFee: string;
  discount: string;
  installments: {
    amount: number;
    dueDate: string | null;
    paidDate: string | null;
    status: "paid" | "pending" | "overdue";
  }[];
  collected: number;
  remainingFee: string;
  remaining: number;
  status: "paid" | "partial" | "overdue";
  daysSinceOffer: number;
  raw: any;
};

type FilterState = {
  companies: string[];
  locations: string[];
  packages: string[];
  statuses: string[];
  offerMonth: string;
  search: string;
};

interface ChartData {
  [key: string]: any;
}

interface ChartConfig {
  kind: "bar" | "line";
  xKey: string;
  yKeys: string[];
}

interface MessageContent {
  type?: "chart" | "list" | "text";
  text?: string;
  data?: ChartData[];
  chart?: ChartConfig;
  rows?: any[];
  unit?: string;
}

interface Message {
  role: "user" | "assistant";
  content: MessageContent;
}

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

const getDaysDiff = (from: string | null, to: Date = new Date()): number => {
  if (!from) return 0;
  const diff = to.getTime() - new Date(from).getTime();
  return Math.floor(diff / (1000 * 3600 * 24));
};

const monthKey = (iso: string | null): string => {
  if (!iso || iso.length < 7) return "";
  return `${iso.slice(0, 4)}-${iso.slice(5, 7)}`;
};

// ======================
// API SERVICE
// ======================
class PostPlacementService {
  static async fetchOffers(filters: FilterState = {
    companies: [],
    locations: [],
    packages: [],
    statuses: [],
    offerMonth: "",
    search: "",
  }): Promise<RecordRow[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.companies.length) params.append('companies', filters.companies.join(','));
      if (filters.locations.length) params.append('locations', filters.locations.join(','));
      if (filters.packages.length) params.append('packages', filters.packages.join(','));
      if (filters.statuses.length) params.append('statuses', filters.statuses.join(','));
      if (filters.offerMonth) params.append('offerMonth', filters.offerMonth);
      
      // Set overdue threshold to 60 days
      params.append('overdueDays', '60');
      params.append('limit', '1000');

      const response = await fetch(`${API_BASE_URL}/offers?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Failed to fetch offers:', error);
      throw error;
    }
  }

  static async fetchOffer(id: string): Promise<RecordRow> {
    try {
      const response = await fetch(`${API_BASE_URL}/offers/${id}?overdueDays=60`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch offer:', error);
      throw error;
    }
  }
}

// ======================
// KPI BELT COMPONENT
// ======================
function KpiBelt({
  rows,
  onFilterClick,
}: {
  rows: RecordRow[];
  onFilterClick: (filter: Partial<FilterState>) => void;
}) {
  const metrics = useMemo(() => {
    const totalCollected = rows.reduce((sum, r) => sum + r.collected, 0);
    const outstanding = rows.reduce((sum, r) => sum + r.remaining, 0);
    const totalExpected = totalCollected + outstanding;
    const collectionRate =
      totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    const studentsPlaced = rows.length;
    const avgFeePerStudent =
      studentsPlaced > 0 ? totalExpected / studentsPlaced : 0;

    const daysToFirst = rows
      .filter((r) => r.collected > 0 && r.offerDate)
      .map((r) => {
        const firstPaid = r.installments.find((i) => i.status === "paid");
        if (!firstPaid?.paidDate || !r.offerDate) return 0;
        return getDaysDiff(r.offerDate, new Date(firstPaid.paidDate));
      })
      .filter((d) => d > 0);

    const avgDaysToFirst =
      daysToFirst.length > 0
        ? daysToFirst.reduce((a, b) => a + b, 0) / daysToFirst.length
        : 0;

    return {
      totalCollected,
      outstanding,
      collectionRate,
      studentsPlaced,
      avgFeePerStudent,
      avgDaysToFirst: Math.round(avgDaysToFirst),
    };
  }, [rows]);

  const kpiCards = [
    {
      title: "Total Collected",
      value: currency(metrics.totalCollected),
      icon: IndianRupee,
      color: "emerald",
      trend: "+12%",
      onClick: () => onFilterClick({ statuses: ["paid"] }),
    },
    {
      title: "Outstanding Fees",
      value: currency(metrics.outstanding),
      icon: AlertTriangle,
      color: "amber",
      progress: Math.min(
        (metrics.outstanding / (metrics.totalCollected + metrics.outstanding)) *
          100,
        100
      ),
      onClick: () => onFilterClick({ statuses: ["partial", "overdue"] }),
    },
    {
      title: "Collection Rate",
      value: `${metrics.collectionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "purple",
      progress: metrics.collectionRate,
      onClick: () => {},
    },
    {
      title: "Students Placed",
      value: metrics.studentsPlaced.toString(),
      icon: Users,
      color: "indigo",
      trend: "+5",
      onClick: () => onFilterClick({ statuses: [] }),
    },
    {
      title: "Avg. Fee/Student",
      value: currency(metrics.avgFeePerStudent),
      icon: Package,
      color: "violet",
      onClick: () => {},
    },
    {
      title: "Avg. Days to 1st Collection",
      value: `${metrics.avgDaysToFirst}d`,
      icon: Clock,
      color: "fuchsia",
      onClick: () => {},
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {kpiCards.map((kpi) => (
        <button
          key={kpi.title}
          onClick={kpi.onClick}
          className="group relative overflow-hidden rounded-2xl border border-purple-300/20 bg-white/5 backdrop-blur-sm p-4 text-left shadow-lg hover:shadow-xl hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl bg-${kpi.color}-500/20 border border-${kpi.color}-400/30 flex items-center justify-center`}
            >
              <kpi.icon className={`w-5 h-5 text-${kpi.color}-400`} />
            </div>
            {kpi.trend && (
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                {kpi.trend}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-purple-200/80 mb-1">{kpi.title}</p>
            <p className="text-lg font-semibold text-white mb-2">{kpi.value}</p>
          </div>

          {kpi.progress !== undefined && (
            <div className="w-full bg-purple-900/30 rounded-full h-2 border border-purple-400/20">
              <div
                className={`bg-gradient-to-r from-${kpi.color}-400 to-${kpi.color}-500 h-2 rounded-full transition-all duration-1000`}
                style={{ width: `${Math.min(kpi.progress, 100)}%` }}
              />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ======================
// TRENDS SECTION
// ======================
function TrendsSection({ rows }: { rows: RecordRow[] }) {
  const chartData = useMemo(() => {
    const monthlyCollections = rows.reduce((acc, row) => {
      const month = monthKey(row.offerDate);
      if (!month) return acc;
      if (!acc[month]) acc[month] = { month, collected: 0, placements: 0 };
      acc[month].collected += row.collected;
      acc[month].placements += 1;
      return acc;
    }, {} as Record<string, { month: string; collected: number; placements: number }>);

    const monthlyData = Object.values(monthlyCollections)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const now = new Date();
    const outstandingByAge = rows
      .filter((r) => r.remaining > 0)
      .reduce((acc, row) => {
        const daysSince = row.offerDate ? getDaysDiff(row.offerDate, now) : 0;
        let bucket = "0-30 days";
        if (daysSince > 60) bucket = ">60 days";
        else if (daysSince > 30) bucket = "31-60 days";

        if (!acc[bucket]) acc[bucket] = 0;
        acc[bucket] += row.remaining;
        return acc;
      }, {} as Record<string, number>);

    const outstandingData = Object.entries(outstandingByAge).map(
      ([name, value]) => ({ name, value })
    );

    return { monthlyData, outstandingData };
  }, [rows]);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        Trends & Analysis
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Monthly Collections
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.monthlyData}>
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
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ fill: "#a855f7", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Placements vs Collections
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData.monthlyData}>
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
    </div>
  );
}

// ======================
// STATUS BREAKDOWN
// ======================
function StatusBreakdown({
  rows,
  onFilterClick,
}: {
  rows: RecordRow[];
  onFilterClick: (filter: Partial<FilterState>) => void;
}) {
  const statusData = useMemo(() => {
    const counts = rows.reduce((acc, row) => {
      if (!acc[row.status]) acc[row.status] = 0;
      acc[row.status]++;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        name: "Paid in Full",
        value: counts.paid || 0,
        color: "#10b981",
        status: "paid",
      },
      {
        name: "Partial Payment",
        value: counts.partial || 0,
        color: "#f59e0b",
        status: "partial",
      },
      {
        name: "Overdue",
        value: counts.overdue || 0,
        color: "#ef4444",
        status: "overdue",
      },
    ];
  }, [rows]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6 mb-8">
      <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
        <Package className="w-5 h-5 text-purple-400" />
        Fee Status Distribution
      </h3>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                dataKey="value"
                onClick={(data) => onFilterClick({ statuses: [data.status] })}
                className="cursor-pointer"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1b3a",
                  border: "1px solid #6b46c1",
                  borderRadius: "12px",
                  backdropFilter: "blur(10px)",
                }}
                formatter={(value, name) => [`${value} students`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <div className="grid gap-3">
            {statusData.map((item) => (
              <button
                key={item.name}
                onClick={() => onFilterClick({ statuses: [item.status] })}
                className="flex items-center justify-between p-4 rounded-xl border border-purple-300/20 bg-white/5 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-lg"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{item.value}</div>
                  <div className="text-purple-200/80 text-sm">
                    {rows.length > 0 ? ((item.value / rows.length) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================
// FILTERS BAR
// ======================
function FiltersBar({
  rows,
  filters,
  onFiltersChange,
}: {
  rows: RecordRow[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  const options = useMemo(() => {
    const companies = [
      ...new Set(rows.map((r) => r.company).filter(Boolean)),
    ].sort();
    const locations = [
      ...new Set(rows.map((r) => r.location).filter(Boolean)),
    ].sort();
    const packages = [
      ...new Set(rows.map((r) => r.package).filter(Boolean)),
    ].sort();

    return { companies, locations, packages };
  }, [rows]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      companies: [],
      locations: [],
      packages: [],
      statuses: [],
      offerMonth: "",
      search: "",
    });
  };

  const activeFilterCount = Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length;
    if (typeof value === "string" && value) return count + 1;
    return count;
  }, 0);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
          <input
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search students, companies, locations..."
            className="w-full pl-10 pr-3 py-3 rounded-xl border border-purple-300/20 bg-white/5 backdrop-blur-sm text-white placeholder-purple-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-300" />
          <input
            type="month"
            value={filters.offerMonth}
            onChange={(e) => updateFilter("offerMonth", e.target.value)}
            className="rounded-xl border border-purple-300/20 bg-white/5 backdrop-blur-sm text-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-purple-300/20 bg-white/5 backdrop-blur-sm text-purple-100 hover:bg-white/10 transition-all"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
          />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-4 py-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all text-sm"
          >
            Clear All
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-6 pt-6 border-t border-purple-300/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MultiSelect
              label="Companies"
              options={options.companies}
              selected={filters.companies}
              onChange={(value) => updateFilter("companies", value)}
            />
            <MultiSelect
              label="Locations"
              options={options.locations}
              selected={filters.locations}
              onChange={(value) => updateFilter("locations", value)}
            />
            <MultiSelect
              label="Packages"
              options={options.packages}
              selected={filters.packages}
              onChange={(value) => updateFilter("packages", value)}
            />
            <MultiSelect
              label="Status"
              options={["paid", "partial", "overdue"]}
              selected={filters.statuses}
              onChange={(value) => updateFilter("statuses", value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ======================
// MULTI-SELECT COMPONENT
// ======================
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className="relative">
      <label className="block text-xs text-purple-200/80 mb-2">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-purple-300/20 bg-white/5 backdrop-blur-sm text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
      >
        <span className="truncate">
          {selected.length === 0
            ? `All ${label}`
            : `${selected.length} selected`}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/10 backdrop-blur-sm border border-purple-300/20 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => toggleOption(option)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 transition-all"
            >
              <div
                className={`w-4 h-4 rounded border border-purple-300/30 flex items-center justify-center ${
                  selected.includes(option)
                    ? "bg-purple-500 border-purple-500"
                    : "bg-white/5"
                }`}
              >
                {selected.includes(option) && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="text-white truncate">{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================
// ALERTS PANEL
// ======================
function AlertsPanel({ rows }: { rows: RecordRow[] }) {
  const alerts = useMemo(() => {
    const overdue = rows
      .filter((r) => r.status === "overdue")
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5);

    const upcomingDue = rows
      .filter((r) => {
        const nextDue = r.installments.find((i) => i.status === "pending");
        if (!nextDue?.dueDate) return false;
        const daysUntilDue = getDaysDiff(
          new Date().toISOString().split("T")[0],
          new Date(nextDue.dueDate)
        );
        return daysUntilDue <= 7 && daysUntilDue >= 0;
      })
      .slice(0, 5);

    return { overdue, upcomingDue };
  }, [rows]);

  if (alerts.overdue.length === 0 && alerts.upcomingDue.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-6 mb-8">
      <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        Alerts & Exceptions
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {alerts.overdue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-300 mb-3">
              Overdue Watchlist
            </h4>
            <div className="space-y-2">
              {alerts.overdue.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-400/30"
                >
                  <div>
                    <p className="text-red-200 font-semibold text-sm">
                      {currency(row.remaining)}
                    </p>
                    <p className="text-red-300/80 text-xs">
                      {row.daysSinceOffer}d overdue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.upcomingDue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-300 mb-3">
              Due This Week
            </h4>
            <div className="space-y-2">
              {alerts.upcomingDue.map((row, idx) => {
                const nextDue = row.installments.find(
                  (i) => i.status === "pending"
                );
                const daysUntil = nextDue?.dueDate
                  ? getDaysDiff(
                      new Date().toISOString().split("T")[0],
                      new Date(nextDue.dueDate)
                    )
                  : 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-400/30"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">
                        {row.studentName}
                      </p>
                      <p className="text-amber-300/80 text-xs">{row.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-200 font-semibold text-sm">
                        {currency(nextDue?.amount || 0)}
                      </p>
                      <p className="text-amber-300/80 text-xs">
                        Due in {daysUntil}d
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================
// ENHANCED STUDENT TABLE
// ======================
function EnhancedStudentTable({
  rows,
  onRowClick,
}: {
  rows: RecordRow[];
  onRowClick: (row: RecordRow) => void;
}) {
  const [sortBy, setSortBy] = useState<keyof RecordRow>("offerDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      return sortOrder === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [rows, sortBy, sortOrder]);

  const handleSort = (key: keyof RecordRow) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-emerald-300 bg-emerald-500/20 border-emerald-400/30";
      case "partial":
        return "text-amber-300 bg-amber-500/20 border-amber-400/30";
      case "overdue":
        return "text-red-300 bg-red-500/20 border-red-400/30";
      default:
        return "text-purple-200/80 bg-purple-500/20 border-purple-400/30";
    }
  };

  if (sortedRows.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-8 text-center">
        <Users className="w-12 h-12 text-purple-300/60 mx-auto mb-4" />
        <p className="text-purple-200/80">
          No students found matching your criteria
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-purple-500/10 backdrop-blur-sm sticky top-0">
            <tr>
              {[
                { key: "studentName", label: "Student" },
                { key: "company", label: "Company" },
                { key: "location", label: "Location" },
                { key: "offerDate", label: "Offer Date" },
                { key: "joiningDate", label: "Joining" },
                { key: "package", label: "Package" },
                { key: "collected", label: "Collected" },
                { key: "remaining", label: "Remaining" },
                { key: "status", label: "Status" },
              ].map((col) => (
                <th key={col.key} className="px-4 py-4 text-left">
                  <button
                    onClick={() => handleSort(col.key as keyof RecordRow)}
                    className="flex items-center gap-1 text-xs font-medium text-purple-200 hover:text-white transition-colors"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          sortOrder === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr
                key={`${row._id}-${idx}`}
                onClick={() => onRowClick(row)}
                className={`cursor-pointer hover:bg-white/10 transition-all duration-200 border-b border-purple-300/10 ${
                  row.status === "overdue" ? "bg-red-500/5" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm shadow-lg">
                      {row.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {row.studentName}
                      </p>
                      <p className="text-purple-200/60 text-xs">{row.hrName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-purple-100 text-sm">
                    {row.company || "—"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-purple-100 text-sm">
                    {row.location || "—"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-purple-100 text-sm">
                    {formatDate(row.offerDate)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-purple-100 text-sm">
                    {formatDate(row.joiningDate)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-purple-100 text-sm">
                    {row.package || "—"}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-emerald-300 font-semibold text-sm">
                    {currency(row.collected)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-white font-semibold text-sm">
                    {currency(row.remaining)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      row.status
                    )}`}
                  >
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================
// ENHANCED STUDENT DRAWER
// ======================
function EnhancedStudentDrawer({
  row,
  onClose,
}: {
  row: RecordRow;
  onClose: () => void;
}) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const installmentTimeline = row.installments.map((inst, idx) => ({
    ...inst,
    installmentNumber: idx + 1,
  }));

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl shadow-2xl overflow-y-auto border-l border-purple-300/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-xl border-b border-purple-300/20 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-lg">
                {row.studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {row.studentName}
                </h2>
                <p className="text-purple-200/80">
                  {row.company} • {row.location}
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
        <div className="p-6 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-500/20 rounded-xl border border-emerald-400/30 p-4 backdrop-blur-sm">
              <p className="text-emerald-300 text-xs font-medium">
                Total Collected
              </p>
              <p className="text-emerald-200 text-lg font-semibold">
                {currency(row.collected)}
              </p>
            </div>
            <div className="bg-amber-500/20 rounded-xl border border-amber-400/30 p-4 backdrop-blur-sm">
              <p className="text-amber-300 text-xs font-medium">Remaining</p>
              <p className="text-amber-200 text-lg font-semibold">
                {currency(row.remaining)}
              </p>
            </div>
            <div className="bg-blue-500/20 rounded-xl border border-blue-400/30 p-4 backdrop-blur-sm">
              <p className="text-blue-300 text-xs font-medium">Package</p>
              <p className="text-blue-200 text-lg font-semibold">
                {row.package}
              </p>
            </div>
            <div className="bg-purple-500/20 rounded-xl border border-purple-400/30 p-4 backdrop-blur-sm">
              <p className="text-purple-300 text-xs font-medium">
                Days Since Offer
              </p>
              <p className="text-purple-200 text-lg font-semibold">
                {row.daysSinceOffer}d
              </p>
            </div>
          </div>

          {/* Installment Timeline */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Installment Timeline
            </h3>
            <div className="space-y-3">
              {installmentTimeline.map((inst) => (
                <div
                  key={inst.installmentNumber}
                  className="flex items-center gap-4 p-4 rounded-xl border border-purple-300/20 bg-white/5 backdrop-blur-sm"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                      inst.status === "paid"
                        ? "bg-emerald-500 text-white"
                        : inst.status === "overdue"
                        ? "bg-red-500 text-white"
                        : "bg-purple-500/50 text-purple-100"
                    }`}
                  >
                    {inst.status === "paid" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : inst.status === "overdue" ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium">
                        Installment {inst.installmentNumber}
                      </p>
                      <p className="text-white font-semibold">
                        {currency(inst.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-purple-200/70">
                      <span>Due: {formatDate(inst.dueDate)}</span>
                      {inst.paidDate && (
                        <span className="text-emerald-300">
                          Paid: {formatDate(inst.paidDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-purple-400" />
                HR Contact
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-purple-300/20">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-300" />
                    <span className="text-purple-100">{row.hrName || "—"}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(row.hrName, "HR Name")}
                    className="p-1 rounded hover:bg-white/10 transition-all"
                  >
                    <Copy className="w-4 h-4 text-purple-300" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-purple-300/20">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-300" />
                    <span className="text-purple-100">
                      {row.hrContact || "—"}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(row.hrContact, "HR Contact")}
                    className="p-1 rounded hover:bg-white/10 transition-all"
                  >
                    <Copy className="w-4 h-4 text-purple-300" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-purple-300/20">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-300" />
                    <span className="text-purple-100 truncate">
                      {row.hrEmail || "—"}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(row.hrEmail, "HR Email")}
                    className="p-1 rounded hover:bg-white/10 transition-all"
                  >
                    <Copy className="w-4 h-4 text-purple-300" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Additional Details
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-purple-300/20">
                  <p className="text-xs text-purple-200/80 mb-1">Offer Date</p>
                  <p className="text-purple-100">{formatDate(row.offerDate)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-purple-300/20">
                  <p className="text-xs text-purple-200/80 mb-1">
                    Joining Date
                  </p>
                  <p className="text-purple-100">
                    {formatDate(row.joiningDate)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-purple-300/20">
                  <p className="text-xs text-purple-200/80 mb-1">
                    Total Post-Placement Fee
                  </p>
                  <p className="text-purple-100">{currency(row.totalPPFee)}</p>
                </div>
                {row.discount && (
                  <div className="p-3 rounded-xl bg-green-500/20 border border-green-400/30 backdrop-blur-sm">
                    <p className="text-xs text-green-300 mb-1">
                      Discount Applied
                    </p>
                    <p className="text-green-200">{row.discount}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================
// AI CHAT SIDEBAR
// ======================
function AIChatSidebar() {
  const [open, setOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [msgs, setMsgs] = useState<Message[]>([]);

  const ask = async (): Promise<void> => {
    if (!input.trim()) return;
    const question = input.trim();
    setMsgs((m) => [...m, { role: "user", content: { text: question } }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, debug: true }),
      });
      const data = await res.json();
      console.log("AI RESPONSE", data);
      console.log("AI DEBUG", data?._debug);
      setMsgs((m) => [...m, { role: "assistant", content: data }]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: { type: "text", text: "Error calling AI." },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const renderAssistant = (c: MessageContent): React.ReactNode => {
    if (c?.type === "chart" && c?.chart?.kind === "bar") {
      const y = c.chart.yKeys?.[0] || "value";
      return (
        <div className="mt-2 h-48 w-full">
          <div className="w-full h-full">
            <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3 h-full">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-300 font-medium">
                  Bar Chart
                </span>
              </div>
              <div className="bg-gray-900/50 rounded h-full flex items-end justify-center gap-1 p-2">
                {c.data?.slice(0, 8).map((item: ChartData, i: number) => (
                  <div
                    key={i}
                    className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm min-w-[12px] opacity-80 hover:opacity-100 transition-opacity"
                    style={{
                      height: `${Math.min(
                        Math.max(item[y] || Math.random() * 100, 10),
                        100
                      )}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          {c.unit && (
            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <span className="w-1 h-1 bg-blue-400 rounded-full" />
              Unit: {c.unit}
            </div>
          )}
        </div>
      );
    }

    if (c?.type === "chart" && c?.chart?.kind === "line") {
      return (
        <div className="mt-2 h-48 w-full">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3 h-full">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-300 font-medium">
                Line Chart
              </span>
            </div>
            <div className="bg-gray-900/50 rounded h-full flex items-center justify-center">
              <div className="text-gray-400 text-sm flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Line Chart Visualization
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (c?.type === "list") {
      return (
        <div className="mt-2">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-300 font-medium">
                Data List
              </span>
            </div>
            <div className="bg-gray-900/50 rounded p-2 max-h-32 overflow-auto">
              <pre className="text-xs text-gray-300 font-mono">
                {JSON.stringify(c.rows, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    // Default text response
    return (
      <div className="whitespace-pre-wrap text-gray-100 text-sm leading-relaxed">
        {c?.text ?? String(c)}
      </div>
    );
  };

  const suggestedQueries: string[] = [
    "How many students got placed in July 2025?",
    "Show placement trends by company",
    "What's the average package offered?",
    "Which locations have most placements?",
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed z-50 bottom-6 right-6 p-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
          open ? "scale-0" : "scale-100"
        }`}
        aria-label="Open AI Assistant"
      >
        <span className="text-white flex items-center gap-2  font-semibold ">
          <Sparkles className="w-5 h-5   text-white" />
          Ask IT Jobs Factory AI
        </span>{" "}
      </button>

      {/* Sidebar Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />

          {/* Sidebar */}
          <div className="w-96 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    AI Assistant
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Post-Placement Analytics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {msgs.length === 0 ? (
                /* Welcome Screen */
                <div className="p-4 space-y-4">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-white font-medium mb-2">
                      Welcome to AI Assistant
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Ask me anything about your placement data
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-gray-300 text-xs font-medium uppercase tracking-wide">
                      Suggested Queries
                    </h5>
                    {suggestedQueries.map((query: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setInput(query)}
                        className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/30 hover:border-blue-500/30 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">{query}</span>
                          <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {msgs.map((m: Message, i: number) => (
                    <div key={i} className="space-y-2">
                      {m.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] p-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                            {m.content.text}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start">
                          <div className="max-w-[90%] p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                            {renderAssistant(m.content)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <div
                              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            />
                            <div
                              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            />
                          </div>
                          <span className="text-gray-400 text-sm">
                            AI is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-700/50 p-4 bg-gray-800/30">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Ask about placements, trends, analytics..."
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none"
                    rows={1}
                    style={{ maxHeight: "120px" }}
                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = el.scrollHeight + "px";
                    }}
                  />
                </div>
                <button
                  onClick={ask}
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">
                  Press Enter to send, Shift+Enter for new line
                </div>
                <div className="text-xs text-gray-500">{input.length}/500</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
// ======================
// MAIN COMPONENT
// ======================
export default function PostPlacementPage() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    companies: [],
    locations: [],
    packages: [],
    statuses: [],
    offerMonth: "",
    search: "",
  });
  const [selected, setSelected] = useState<RecordRow | null>(null);

  // Load data using the API service
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await PostPlacementService.fetchOffers(filters);
        setRows(data);
      } catch (err) {
        console.error('Failed to load placement data:', err);
        setError('Failed to load placement data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const filteredRows = useMemo(() => {
    // Since API already handles filtering, we return rows as-is
    // But we can add client-side filtering for real-time search if needed
    if (!filters.search) return rows;
    
    const searchTerm = filters.search.toLowerCase();
    return rows.filter(row => 
      row.studentName.toLowerCase().includes(searchTerm) ||
      row.company.toLowerCase().includes(searchTerm) ||
      row.location.toLowerCase().includes(searchTerm) ||
      row.hrName.toLowerCase().includes(searchTerm)
    );
  }, [rows, filters.search]);

  const handleFilterClick = (partial: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      const data = await PostPlacementService.fetchOffers(filters);
      setRows(data);
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-purple-300/20 p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">
              Post Placement Fee Report
            </h1>
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-purple-200 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-purple-200/80">
            Comprehensive student placement fee tracking and analytics
          </p>
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

        {/* Dashboard Content */}
        {!loading && (
          <div className="space-y-8">
            <KpiBelt rows={filteredRows} onFilterClick={handleFilterClick} />
            <FiltersBar
              rows={rows}
              filters={filters}
              onFiltersChange={setFilters}
            />
            <StatusBreakdown
              rows={filteredRows}
              onFilterClick={handleFilterClick}
            />
            <TrendsSection rows={filteredRows} />
            <AlertsPanel rows={filteredRows} />
            <EnhancedStudentTable rows={filteredRows} onRowClick={setSelected} />
          </div>
        )}

        {/* Student Detail Drawer */}
        {selected && (
          <EnhancedStudentDrawer
            row={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      <AIChatSidebar />
    </div>
  );
}
