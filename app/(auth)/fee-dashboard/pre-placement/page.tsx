"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Loader2,
  Mail,
  PauseCircle,
  ReceiptText,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Status = "ACTIVE" | "PAUSED" | "PLACED" | "DROPPED";
type StatusFilter = Status | "ALL";

type Payment = {
  amount: number;
  date: string | null;
  mode?: string;
  receiptNos?: string[];
  note?: string;
};

type Refund = {
  amount: number;
  date: string | null;
  mode?: string;
  note?: string;
};

type PrePlacementStudent = {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  degree?: string;
  passoutYear?: number;
  mode?: string;
  courseName?: string;
  terms?: string;
  zone?: string;
  batchCode?: string;
  totalFee: number;
  totalReceived: number;
  totalRefunded: number;
  netCollected: number;
  remainingFee: number;
  paymentsCount: number;
  payments: Payment[];
  refunds?: Refund[];
  status: Status;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type SummaryData = {
  totalStudents: number;
  totalFee: number;
  totalReceived: number;
  totalRefunded: number;
  netCollected: number;
  remainingFee: number;
  collectedInRange?: number;
  countsByStatus?: Partial<Record<Status, number>>;
  monthly?: Array<{ _id: { y: number; m: number }; collected: number }>;
};

type StudentsResponse = {
  page: number;
  limit: number;
  total: number;
  rows: PrePlacementStudent[];
};

const STATUS_OPTIONS: Status[] = ["ACTIVE", "PAUSED", "PLACED", "DROPPED"];
const PAGE_SIZE = 15;
const API_ROOT = "/api/fee-dashboard/pre-placement";

const STATUS_META: Record<
  Status,
  { label: string; badge: string; dot: string; icon: React.ReactNode }
> = {
  ACTIVE: {
    label: "Active",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    dot: "bg-emerald-400",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  PAUSED: {
    label: "Paused",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    dot: "bg-amber-400",
    icon: <PauseCircle className="h-4 w-4" />,
  },
  PLACED: {
    label: "Placed",
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-100",
    dot: "bg-sky-400",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  DROPPED: {
    label: "Dropped",
    badge: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    dot: "bg-rose-400",
    icon: <TrendingDown className="h-4 w-4" />,
  },
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));

const compactCurrency = (value: number) => {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 10_000_000)
    return `₹${(number / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(number) >= 100_000) return `₹${(number / 100_000).toFixed(1)}L`;
  if (Math.abs(number) >= 1_000) return `₹${(number / 1_000).toFixed(0)}K`;
  return `₹${Math.round(number)}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const monthKey = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const studentNet = (student: PrePlacementStudent) =>
  Number.isFinite(Number(student.netCollected))
    ? Number(student.netCollected)
    : Math.max(
        (Number(student.totalReceived) || 0) -
          (Number(student.totalRefunded) || 0),
        0,
      );

async function getJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }
  return body as T;
}

async function loadAllStudents(): Promise<PrePlacementStudent[]> {
  const limit = 200;
  const query = `includePayments=true&includeRefunds=true&limit=${limit}`;
  const first = await getJSON<StudentsResponse>(
    `${API_ROOT}/students?page=1&${query}`,
  );
  const pageCount = Math.ceil(first.total / limit);
  const remaining =
    pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) =>
            getJSON<StudentsResponse>(
              `${API_ROOT}/students?page=${index + 2}&${query}`,
            ),
          ),
        )
      : [];
  return [...first.rows, ...remaining.flatMap((page) => page.rows)];
}

export default function PrePlacementDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [students, setStudents] = useState<PrePlacementStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<PrePlacementStudent | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [course, setCourse] = useState("ALL");
  const [month, setMonth] = useState("ALL");
  const [chartYear, setChartYear] = useState("ALL");
  const [page, setPage] = useState(1);

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [summaryData, studentRows] = await Promise.all([
        getJSON<SummaryData>(`${API_ROOT}/summary`),
        loadAllStudents(),
      ]);
      setSummary(summaryData);
      setStudents(studentRows);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load pre-placement fee records",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, status, course, month]);

  const courses = useMemo(
    () =>
      [
        ...new Set(
          students.map((student) => student.courseName).filter(Boolean),
        ),
      ].sort((left, right) =>
        String(left).localeCompare(String(right)),
      ) as string[],
    [students],
  );

  const monthOptions = useMemo(() => {
    const options = [{ value: "ALL", label: "All months" }];
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

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.name.toLowerCase().includes(normalizedSearch) ||
        String(student.email || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        String(student.courseName || "")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesStatus = status === "ALL" || student.status === status;
      const matchesCourse = course === "ALL" || student.courseName === course;
      const hasMonthActivity =
        month === "ALL" ||
        (student.payments || []).some(
          (payment) => monthKey(payment.date) === month,
        ) ||
        (student.refunds || []).some(
          (refund) => monthKey(refund.date) === month,
        );
      return (
        matchesSearch && matchesStatus && matchesCourse && hasMonthActivity
      );
    });
  }, [course, month, search, status, students]);

  const filteredTotals = useMemo(
    () =>
      filteredStudents.reduce(
        (totals, student) => {
          totals.collected +=
            month === "ALL"
              ? studentNet(student)
              : (student.payments || [])
                  .filter((payment) => monthKey(payment.date) === month)
                  .reduce(
                    (sum, payment) => sum + Number(payment.amount || 0),
                    0,
                  ) -
                (student.refunds || [])
                  .filter((refund) => monthKey(refund.date) === month)
                  .reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
          totals.remaining += Number(student.remainingFee || 0);
          return totals;
        },
        { collected: 0, remaining: 0 },
      ),
    [filteredStudents, month],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<Status, number> = {
      ACTIVE: 0,
      PAUSED: 0,
      PLACED: 0,
      DROPPED: 0,
    };
    students.forEach((student) => {
      if (Object.prototype.hasOwnProperty.call(counts, student.status)) {
        counts[student.status] += 1;
      }
    });
    return counts;
  }, [students]);

  const chartData = useMemo(
    () =>
      (summary?.monthly || []).map((item) => ({
        year: String(item._id.y),
        month: new Date(item._id.y, item._id.m - 1, 1).toLocaleDateString(
          "en-IN",
          { month: "short", year: "2-digit" },
        ),
        collected: Number(item.collected || 0),
      })),
    [summary],
  );

  const chartYears = useMemo(
    () =>
      [...new Set(chartData.map((item) => item.year))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [chartData],
  );

  const visibleChartData = useMemo(
    () =>
      chartYear === "ALL"
        ? chartData
        : chartData.filter((item) => item.year === chartYear),
    [chartData, chartYear],
  );

  const pageCount = Math.max(Math.ceil(filteredStudents.length / PAGE_SIZE), 1);
  const visibleStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const collectionRate = summary?.totalFee
    ? Math.min(
        (Number(summary.netCollected || 0) / summary.totalFee) * 100,
        100,
      )
    : 0;

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setCourse("ALL");
    setMonth("ALL");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sky-200">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Loading fee portfolio</p>
            <p className="mt-1 text-sm text-slate-500">
              Connecting to LMS records...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(45,212,191,0.09),transparent_26%),linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:auto,auto,32px_32px,32px_32px]" />

      <div className="relative mx-auto w-full max-w-[1500px] space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-700/70 bg-slate-900/65 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:p-7">
          <div className="flex items-start gap-4">
            <Link
              href="/fee-dashboard"
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 text-slate-300 transition hover:border-sky-400/50 hover:text-white"
              aria-label="Back to fee dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                Pre-placement finance
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Student fee portfolio
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Track collections, outstanding balances, refunds, and
                student-level transactions from LMS.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-400/50 hover:text-white disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </span>
            <button
              type="button"
              onClick={() => void loadData(true)}
              className="font-semibold underline underline-offset-4"
            >
              Retry
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            eyebrow="Total fee"
            value={currency(summary?.totalFee || 0)}
            detail="Total preplacement fee"
            icon={<CircleDollarSign />}
            tone="sky"
          />
          <MetricCard
            eyebrow="Net collected"
            value={currency(summary?.netCollected || 0)}
            detail={`${collectionRate.toFixed(1)}% collection rate`}
            icon={<TrendingUp />}
            tone="emerald"
          />
          <MetricCard
            eyebrow="Remaining Fee"
            value={currency(summary?.remainingFee || 0)}
            detail="Current receivable balance"
            icon={<Clock3 />}
            tone="amber"
          />
          <MetricCard
            eyebrow="Refunded"
            value={currency(summary?.totalRefunded || 0)}
            detail={`Gross receipts ${currency(summary?.totalReceived || 0)}`}
            icon={<TrendingDown />}
            tone="rose"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-1">
          <article className="rounded-3xl border border-slate-700/70 bg-slate-900/60 p-5 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Collection movement
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  Monthly net collections
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Payments less refunds, grouped by month
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={chartYear}
                  onChange={(event) => setChartYear(event.target.value)}
                  aria-label="Collection graph year"
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                >
                  <option value="ALL">All years</option>
                  {chartYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300">
                  {visibleChartData.length} reporting months
                </span>
              </div>
            </div>
            <div className="mt-5 h-64 w-full">
              {visibleChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={visibleChartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="collectionFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#38bdf8"
                          stopOpacity={0.34}
                        />
                        <stop
                          offset="95%"
                          stopColor="#38bdf8"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      tickFormatter={compactCurrency}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f1b2a",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        color: "#e2e8f0",
                      }}
                      formatter={(value) => [
                        currency(Number(value)),
                        "Net collected",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fill="url(#collectionFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center">
                  <TrendingUp className="h-8 w-8 text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-300">
                    No collection history for this year
                  </p>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/65 shadow-xl shadow-black/15 backdrop-blur-xl">
          <div className="border-b border-slate-700 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Student ledger
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Fee records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search, segment, and inspect individual transactions.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
                  {filteredStudents.length} students
                </span>
                <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-emerald-200">
                  {currency(filteredTotals.collected)} collected
                </span>
                <span className="rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2 text-amber-100">
                  {currency(filteredTotals.remaining)} due
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_190px_240px_180px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student, email, or course"
                  className="h-11 w-full rounded-xl border border-slate-600 bg-[#07111f] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                />
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                className="h-11 rounded-xl border border-slate-600 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-sky-400"
              >
                <option value="ALL">All statuses</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {STATUS_META[item].label}
                  </option>
                ))}
              </select>
              <select
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                className="h-11 rounded-xl border border-slate-600 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-sky-400"
              >
                <option value="ALL">All courses</option>
                {courses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-11 rounded-xl border border-slate-600 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-sky-400"
              >
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetFilters}
                className="h-11 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {visibleStudents.length ? (
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-slate-700 bg-[#0d1928] text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-4 py-4">Course</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Total fee</th>
                    <th className="px-4 py-4 text-right">Net collected</th>
                    <th className="px-4 py-4 text-right">Refunded</th>
                    <th className="px-4 py-4 text-right">Outstanding</th>
                    <th className="px-4 py-4">Due date</th>
                    <th className="px-6 py-4 text-right">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {visibleStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="transition hover:bg-slate-800/45"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">
                          {student.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.email ||
                            student.mobile ||
                            "No contact recorded"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-56 font-medium text-slate-200">
                          {student.courseName || "Not assigned"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {student.batchCode || student.zone || "No batch"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-300">
                        {currency(student.totalFee)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-emerald-200">
                        {currency(studentNet(student))}
                      </td>
                      <td className="px-4 py-4 text-right text-rose-200">
                        {currency(student.totalRefunded || 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-amber-100">
                        {currency(student.remainingFee || 0)}
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {formatDate(student.dueDate)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-400/15"
                        >
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <Search className="h-10 w-10 text-slate-600" />
                <p className="mt-3 font-semibold text-slate-200">
                  No matching fee records
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Clear or adjust the current filters.
                </p>
              </div>
            )}
          </div>

          <footer className="flex flex-col gap-3 border-t border-slate-700 bg-slate-900/55 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="text-slate-400">
              Page {page} of {pageCount} · Showing {visibleStudents.length} of{" "}
              {filteredStudents.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-600 px-3 font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, pageCount))
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-600 px-3 font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-40"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSaved={(updated) => {
            setSelectedStudent(updated);
            setStudents((current) =>
              current.map((student) =>
                student._id === updated._id
                  ? { ...student, ...updated }
                  : student,
              ),
            );
            void loadData(true);
          }}
        />
      )}
    </main>
  );
}

function MetricCard({
  eyebrow,
  value,
  detail,
  icon,
  tone,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    sky: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  };
  return (
    <article className="rounded-3xl border border-slate-700/70 bg-slate-900/65 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border [&>svg]:h-5 [&>svg]:w-5 ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status] || STATUS_META.ACTIVE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
    >
      {meta.icon} {meta.label}
    </span>
  );
}

function StudentDetailModal({
  student,
  onClose,
  onSaved,
}: {
  student: PrePlacementStudent;
  onClose: () => void;
  onSaved: (student: PrePlacementStudent) => void;
}) {
  const [nextStatus, setNextStatus] = useState<Status>(student.status);
  const [dropReason, setDropReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNextStatus(student.status);
    setDropReason("");
  }, [student._id, student.status]);

  const saveStatus = async () => {
    if (nextStatus === student.status) return;
    setSaving(true);
    setError("");
    try {
      const updated = await getJSON<PrePlacementStudent>(
        `${API_ROOT}/students/${student._id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            ...(nextStatus === "DROPPED" && dropReason.trim()
              ? { dropReason: dropReason.trim() }
              : {}),
          }),
        },
      );
      onSaved(updated);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update student status",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020712]/90 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${student.name} fee record`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#091421] shadow-2xl shadow-black/50">
        <header className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-200">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Student fee record
              </p>
              <h2 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                {student.name}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-400">
                {student.courseName || "Course not assigned"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 bg-slate-800 p-2.5 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Close student record"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailMetric
              label="Total fee"
              value={currency(student.totalFee)}
              icon={<CircleDollarSign />}
            />
            <DetailMetric
              label="Net collected"
              value={currency(studentNet(student))}
              icon={<TrendingUp />}
              positive
            />
            <DetailMetric
              label="Refunded"
              value={currency(student.totalRefunded || 0)}
              icon={<TrendingDown />}
            />
            <DetailMetric
              label="Outstanding"
              value={currency(student.remainingFee || 0)}
              icon={<Clock3 />}
              warning
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
            <section className="rounded-2xl border border-slate-700 bg-slate-900/45 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Student information
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Info
                  icon={<Mail />}
                  label="Email"
                  value={student.email || "Not recorded"}
                />
                <Info
                  icon={<BookOpen />}
                  label="Course"
                  value={student.courseName || "Not assigned"}
                />
                <Info
                  icon={<CalendarDays />}
                  label="Due date"
                  value={formatDate(student.dueDate)}
                />
                <Info
                  icon={<Users />}
                  label="Batch / zone"
                  value={student.batchCode || student.zone || "Not assigned"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/45 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Record status
              </p>
              <div className="mt-4">
                <StatusBadge status={student.status} />
                <select
                  value={nextStatus}
                  onChange={(event) =>
                    setNextStatus(event.target.value as Status)
                  }
                  className="mt-4 h-11 w-full rounded-xl border border-slate-600 bg-[#07111f] px-3 text-sm text-white outline-none focus:border-sky-400"
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {STATUS_META[item].label}
                    </option>
                  ))}
                </select>
                {nextStatus === "DROPPED" && (
                  <textarea
                    value={dropReason}
                    onChange={(event) => setDropReason(event.target.value)}
                    placeholder="Optional drop reason"
                    rows={2}
                    className="mt-3 w-full resize-none rounded-xl border border-slate-600 bg-[#07111f] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
                  />
                )}
                {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
                <button
                  type="button"
                  onClick={() => void saveStatus()}
                  disabled={saving || nextStatus === student.status}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save status
                </button>
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TransactionSection
              title="Payment history"
              icon={<WalletCards className="h-5 w-5" />}
              items={student.payments || []}
              tone="emerald"
              empty="No payments recorded for this student."
            />
            <TransactionSection
              title="Refund history"
              icon={<ReceiptText className="h-5 w-5" />}
              items={student.refunds || []}
              tone="rose"
              empty="No refunds recorded for this student."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  icon,
  positive,
  warning,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/45 p-4">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
        {icon} {label}
      </span>
      <p
        className={`mt-2 text-xl font-bold ${positive ? "text-emerald-200" : warning ? "text-amber-100" : "text-white"}`}
      >
        {value}
      </p>
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
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
        {icon} {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function TransactionSection({
  title,
  icon,
  items,
  tone,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<Payment | Refund>;
  tone: "emerald" | "rose";
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/45">
      <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
        <span
          className={`flex items-center gap-2 text-sm font-bold ${tone === "emerald" ? "text-emerald-200" : "text-rose-200"}`}
        >
          {icon} {title}
        </span>
        <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-400">
          {items.length}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {items.length ? (
          <div className="divide-y divide-slate-800">
            {items.map((item, index) => (
              <div
                key={`${item.date}-${item.amount}-${index}`}
                className="flex items-start justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p
                    className={`font-bold ${tone === "emerald" ? "text-emerald-200" : "text-rose-200"}`}
                  >
                    {currency(item.amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(item.date)} · {item.mode || "Mode not recorded"}
                  </p>
                  {item.note && (
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {item.note}
                    </p>
                  )}
                </div>
                {"receiptNos" in item && item.receiptNos?.length ? (
                  <span className="max-w-40 truncate rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-400">
                    {item.receiptNos.join(", ")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}
