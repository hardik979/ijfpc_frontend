"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  X,
  Loader2,
  Wallet,
  TrendingUp,
  Calendar,
  BarChart3,
  Clock,
} from "lucide-react";
import {API_LMS_URL} from '@/lib/api'
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import ZoneListPage from "./zone-list/page";

/* ----------------------------- Types ----------------------------- */

type Status = "ACTIVE" | "PAUSED" | "PLACED" | "DROPPED";
type StatusFilter = Status | "ALL";

type PreplacementSummaryAPI = {
  totalStudents: number;
  countsByStatus?: Partial<Record<Status, number>>;
  netCollected?: number;
  collectedInRange?: number;
};

type StudentRow = {
  _id: string;
  name: string;
  courseName?: string;
  status: Status;
};

type StudentsListResponse = {
  page: number;
  limit: number;
  total: number;
  rows: Array<
    StudentRow & {
      totalFee?: number;
      totalReceived?: number;
      remainingFee?: number;
    }
  >;
};

type Payment = {
  amount: number;
  date: string | null; // ISO
  mode?: string;
  receiptNos?: string[];
  note?: string;
};

type PreplacementDetail = {
  _id: string;
  name: string;
  courseName?: string;
  status: Status;
  totalFee: number;
  totalReceived: number;
  remainingFee: number;
  payments: Payment[];
  refunds?: Array<{
    amount: number;
    date: string | null;
    mode?: string;
    note?: string;
  }>;
};

type PostInstallment = {
  _id?: string;
  // RAW doc fields:
  label?: string;
  amount: number;
  date?: string | null; // payment date (raw)
  mode?: string;
  note?: string;

  // MAPPED row fields (from toRecordRow):
  paidDate?: string | null;
  dueDate?: string | null;
  status?: string;
};

type PostOffer = {
  _id: string;
  studentName: string;

  // RAW doc fields (when you fetch /offers/:id or when `raw` is attached):
  companyName?: string;
  location?: string;
  offerDate?: string;
  joiningDate?: string;
  totalPostPlacementFee?: number;
  installments?: PostInstallment[]; // raw shape (label/date/mode/note)

  // MAPPED fields from toRecordRow (/offers list):
  company?: string;
  totalPPFee?: number;
  // mapped installments array uses amount + paidDate/dueDate/status
  // (we reuse PostInstallment to cover both shapes)

  // Original Mongo doc (if route attached it as `raw`)
  raw?: {
    companyName?: string;
    location?: string;
    offerDate?: string;
    joiningDate?: string;
    totalPostPlacementFee?: number;
    installments?: PostInstallment[];
  };
};

/* ---------------------------- Helpers ---------------------------- */

const cn = (...cls: Array<string | false | null | undefined>) =>
  cls.filter(Boolean).join(" ");

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

const STATUS_COLORS: Record<Status, string> = {
  ACTIVE:
    "bg-emerald-500/15 text-emerald-300 border-emerald-400/25 shadow-emerald-500/10",
  PAUSED:
    "bg-amber-500/15 text-amber-300 border-amber-400/25 shadow-amber-500/10",
  PLACED: "bg-cyan-500/15 text-cyan-300 border-cyan-400/25 shadow-cyan-500/10",
  DROPPED: "bg-rose-500/15 text-rose-300 border-rose-400/25 shadow-rose-500/10",
};

/* =============================== Page ============================== */

export default function OverviewPage() {
  const [studentsSummary, setStudentsSummary] =
    useState<PreplacementSummaryAPI>({
      totalStudents: 0,
      countsByStatus: { ACTIVE: 0, PAUSED: 0, PLACED: 0, DROPPED: 0 },
    });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [studentsModal, setStudentsModal] = useState<{
    open: boolean;
    status: StatusFilter;
  }>({ open: false, status: "ALL" });

  // Revenue state
  const [revMonth, setRevMonth] = useState("");
  const [revLoading, setRevLoading] = useState(true);
  const [preRevenue, setPreRevenue] = useState(0);
  const [postRevenue, setPostRevenue] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoadingSummary(true);
        const data = await getJSON<any>(
          `${API_LMS_URL}/api/preplacement/summary`
        );
        const counts = (data?.countsByStatus || {}) as Partial<
          Record<Status, number>
        >;
        setStudentsSummary({
          totalStudents: data?.totalStudents || 0,
          countsByStatus: {
            ACTIVE: counts.ACTIVE || 0,
            PAUSED: counts.PAUSED || 0,
            PLACED: counts.PLACED || 0,
            DROPPED: counts.DROPPED || 0,
          },
          netCollected: data?.netCollected || 0,
          collectedInRange: data?.collectedInRange || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSummary(false);
      }
    })();
  }, []);

  // Fetch revenue data when revMonth changes
  useEffect(() => {
    (async () => {
      try {
        setRevLoading(true);

        // Fetch pre-placement revenue
        let preUrl = `${API_LMS_URL}/api/preplacement/summary`;
        if (revMonth) {
          preUrl += `?month=${revMonth}`;
        }
        const preData = await getJSON<any>(preUrl);
        const preRev = revMonth
          ? preData?.collectedInRange || 0
          : preData?.netCollected || 0;
        setPreRevenue(preRev);

        // Fetch post-placement revenue
        const postData = await getJSON<{ items: any[] }>(
          `${API_BASE_URL}/api/post-placement/offers?limit=2000`
        );

        let postRev = 0;
        (postData.items || []).forEach((item: any) => {
          // Prefer raw.installments if available
          const installments =
            item.raw?.installments || item.installments || [];

          installments.forEach((inst: any) => {
            const amount = Number(inst.amount);
            if (isNaN(amount)) return;

            // Get date from raw installment or mapped installment
            const date = inst.date || inst.paidDate || inst.dueDate;

            if (revMonth) {
              if (!date) return; // Skip if no date and month filter is active

              try {
                const instDate = new Date(date);
                const instMonth = instDate.toISOString().slice(0, 7); // YYYY-MM in UTC
                if (instMonth === revMonth) {
                  postRev += amount;
                }
              } catch (e) {
                // Skip invalid dates
                return;
              }
            } else {
              // All time - include all installments with valid amounts
              postRev += amount;
            }
          });
        });

        setPostRevenue(postRev);
      } catch (e) {
        console.error(e);
        setPreRevenue(0);
        setPostRevenue(0);
      } finally {
        setRevLoading(false);
      }
    })();
  }, [revMonth]);

  const chips = useMemo(() => {
    const c = studentsSummary.countsByStatus || {};
    return (["ACTIVE", "PAUSED", "PLACED", "DROPPED"] as Status[]).map((s) => ({
      status: s,
      count: c[s] || 0,
    }));
  }, [studentsSummary]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [{ value: "", label: "All time" }];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM
      const label = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      options.push({ value: yearMonth, label });
    }

    return options;
  }, []);

  const totalRevenue = preRevenue + postRevenue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-400/5 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <Link href={"/"}>
            {" "}
            <h1 className="text-5xl font-[Righteous] font-bold text-sky-400">
              <span className="text-yellow-500">IT</span> Jobs Factory
              Fees-Summary
            </h1>
          </Link>

          <p className="text-lg text-purple-200/80">
            Comprehensive analytics and insights across your students
          </p>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Students Tile */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Open all students"
            onClick={() => setStudentsModal({ open: true, status: "ALL" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setStudentsModal({ open: true, status: "ALL" });
              }
            }}
            className="group relative overflow-hidden rounded-3xl border border-purple-400/20 bg-white/5 backdrop-blur-xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:border-purple-400/40 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-start gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30 shadow-lg">
                <Users className="h-8 w-8 text-purple-300" />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-sm font-medium text-purple-200/70 uppercase tracking-wider">
                    Total Students
                  </div>
                  <div className="mt-2 text-4xl font-bold text-white">
                    {loadingSummary ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
                        <span className="text-2xl">Loading...</span>
                      </div>
                    ) : (
                      studentsSummary.totalStudents
                    )}
                  </div>
                </div>

                {/* Status chips 2×2 */}
                <div className="mt-4 grid grid-cols-2 gap-3 max-w-md">
                  {chips.map(({ status, count }) => (
                    <button
                      key={status}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent parent tile click (ALL) from firing
                        setStudentsModal({ open: true, status });
                      }}
                      className={cn(
                        "w-full inline-flex items-center justify-between rounded-xl px-4 py-2 text-sm font-medium border shadow-sm cursor-pointer hover:shadow-2xl hover:scale-[1.05] hover:shadow-purple-500/20 transition-all duration-300",
                        STATUS_COLORS[status]
                      )}
                      title={`View ${status} students`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                        <span>{status}</span>
                      </span>
                      <span className="font-bold">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center text-purple-200/70 text-sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Click to view detailed breakdown
                </div>
              </div>
            </div>
          </div>

          {/* Total Revenue Tile */}
          <div className="group relative overflow-hidden rounded-3xl border border-purple-400/20 bg-white/5 backdrop-blur-xl ">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-400/30 shadow-lg">
                    <Wallet className="h-8 w-8 text-emerald-300" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-purple-200/70 uppercase tracking-wider">
                      Total Revenue
                    </div>
                    <div className="text-4xl font-bold text-white">
                      {revLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                          <span className="text-2xl">Loading...</span>
                        </div>
                      ) : (
                        formatINR(totalRevenue)
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="relative z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={revMonth}
                    onChange={(e) => setRevMonth(e.target.value)}
                    className="rounded-xl border border-purple-400/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200 hover:bg-white/15"
                  >
                    {monthOptions.map(({ value, label }) => (
                      <option
                        key={value}
                        value={value}
                        className="bg-purple-800 text-white"
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Link href={"/fee-dashboard/pre-placement"}>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:border-purple-400/40 hover:shadow-2xl hover:shadow-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-purple-300" />
                        <span className="text-xs font-medium text-purple-200/70 uppercase tracking-wider">
                          Pre-Placement
                        </span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {revLoading ? "..." : formatINR(preRevenue)}
                      </div>
                    </div>
                  </Link>
                  <Link href={"/fee-dashboard/post-placement"}>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:border-purple-400/40 hover:shadow-2xl hover:shadow-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-cyan-300" />
                        <span className="text-xs font-medium text-purple-200/70 uppercase tracking-wider">
                          Post-Placement
                        </span>
                      </div>

                      <div className="text-lg font-bold text-white">
                        {revLoading ? "..." : formatINR(postRevenue)}
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center text-purple-200/70 text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Click to view detailed collections
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Reports Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white/90">Reports</h2>
          </div>

          {/* Report cards grid (add more later) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/fee-dashboard/Timesheet-reports">
              <div
                role="button"
                aria-label="Open Timesheet Report"
                className="group relative rounded-2xl border border-purple-400/20 bg-white/5 p-4 backdrop-blur-xl
                   hover:bg-white/10 hover:border-purple-400/40 hover:shadow-2xl hover:shadow-purple-500/20
                   transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-purple-400/30">
                    <BarChart3 className="h-5 w-5 text-indigo-200" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                      Timesheet Report
                    </div>
                    <p className="mt-1 text-xs text-purple-200/80">
                      Daily/Monthly hours & productivity overview
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Example placeholders for future reports (keep or remove) */}

            <Link href="/fee-dashboard/registration-details">
              <div className="group relative rounded-2xl border border-purple-400/20 bg-white/5 p-4 backdrop-blur-xl hover:bg-white/10 hover:border-purple-400/40 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30">
                    <Wallet className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                      Registration Records
                    </div>
                    <p className="mt-1 text-xs text-purple-200/80">
                      Detailed records of student registrations
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {studentsModal.open && (
        <StudentsModal
          initialStatus={studentsModal.status}
          onClose={() => setStudentsModal({ open: false, status: "ALL" })}
        />
      )}
    </div>
  );
}

/* ============================ Students Modal ============================ */

function StudentsModal({
  onClose,
  initialStatus = "ALL",
}: {
  onClose: () => void;
  initialStatus?: StatusFilter;
}) {
  // ---------- NEW: safe unique key helper ----------
  const safeKey = (
    idx: number,
    ...parts: Array<string | number | undefined | null>
  ) => {
    const base = parts
      .filter((p) => p !== undefined && p !== null && p !== "")
      .join("|");
    return base ? `${base}#${idx}` : `row#${idx}`;
  };

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StudentsListResponse | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pre, setPre] = useState<PreplacementDetail | null>(null);
  const [post, setPost] = useState<PostOffer[]>([]);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchList = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) qs.set("search", search.trim());
      if (status !== "ALL") qs.set("status", status);
      const res = await getJSON<StudentsListResponse>(
        `${API_LMS_URL}/api/preplacement/students?${qs.toString()}`
      );
      setData(res);
    } catch (e) {
      console.error(e);
      setData({ page: 1, limit: 50, total: 0, rows: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchList();
  };

  const openDetail = async (row: StudentRow) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setPre(null);
      setPost([]);

      const preData = await getJSON<PreplacementDetail>(
        `${API_BASE_URL}/api/preplacement/students/${row._id}`
      );
      setPre(preData);

      const all = await getJSON<{ items: any[] }>(
        `${API_BASE_URL}/api/post-placement/offers?search=${encodeURIComponent(
          row.name
        )}&limit=100`
      );
      const exact = (all.items || []).filter(
        (o) =>
          String(o?.studentName || "").toLowerCase() === row.name.toLowerCase()
      );
      setPost(exact as PostOffer[]);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setPre(null);
    setPost([]);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={() => (detailOpen ? closeDetail() : onClose())}
      />
      {/* Modal Shell */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden rounded-3xl border border-purple-400/30 bg-purple-900/95 backdrop-blur-xl shadow-2xl flex flex-col overscroll-contain">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-400/20 p-6 bg-gradient-to-r from-purple-800/50 to-purple-900/50">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Students Overview
              </h2>
              <p className="text-purple-200/70 mt-1">
                Manage and view student details
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-purple-400/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all duration-200"
            >
              <X className="mr-2 inline-block h-4 w-4" />
              Close
            </button>
          </div>

          {/* Controls */}
          <div className="p-6 bg-gradient-to-r from-purple-800/30 to-purple-900/30 border-b border-purple-400/20">
            <div className="flex flex-wrap items-end gap-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch(e);
                }}
                className="flex-1 min-w-[280px]"
              >
                <label className="mb-2 block text-sm font-medium text-purple-200/80">
                  Search Students
                </label>
                <div className="flex gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student or course name..."
                    className="w-full rounded-xl border border-purple-400/30 bg-white/10 backdrop-blur-sm px-4 py-3 text-white placeholder-purple-300/50 outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-purple-400/30 bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div>
                <label className="mb-2 block text-sm font-medium text-purple-200/80">
                  Filter by Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  className="rounded-xl border border-purple-400/30 bg-white/10 backdrop-blur-sm px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200"
                >
                  <option value="ALL" className="bg-purple-800">
                    All Statuses
                  </option>
                  {(["ACTIVE", "PAUSED", "PLACED", "DROPPED"] as Status[]).map(
                    (s) => (
                      <option key={s} value={s} className="bg-purple-800">
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                onClick={fetchList}
                className="h-[48px] rounded-xl border border-purple-400/30 bg-white/10 backdrop-blur-sm px-6 text-sm font-medium text-white hover:bg-white/20 transition-all duration-200"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-6xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
                {/*  <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-purple-800/80 backdrop-blur-sm text-left text-purple-100 border-b border-purple-400/20">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-purple-900/50">
                {loading ? (
                  <tr>
                    <td className="px-6 py-12 text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-300" />
                        <span className="text-purple-200">
                          Loading students...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (data?.rows?.length || 0) > 0 ? (
                  data!.rows.map((r, i) => (
                    <tr
                      key={r._id ?? safeKey(i, r.name, r.courseName, r.status)}
                      className="border-b border-purple-400/10 hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDetail(r)}
                          className="text-left font-medium text-white hover:text-purple-200 hover:underline transition-colors duration-200"
                          title="View student details"
                        >
                          {r.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-purple-100">
                        {r.courseName || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-xl px-3 py-1 text-xs font-medium border",
                            STATUS_COLORS[r.status]
                          )}
                        >
                          <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-6 py-12 text-center text-purple-200/70"
                      colSpan={3}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-purple-300/50" />
                        <span>No students found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>   */}
                <ZoneListPage />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-purple-400/20 p-4 bg-gradient-to-r from-purple-800/30 to-purple-900/30 text-sm">
            <div className="text-purple-200/70">
              Page {page} • Showing {data?.rows?.length ?? 0} of{" "}
              {data?.total ?? 0}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-purple-400/30 bg-white/10 text-white disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page * limit >= (data?.total ?? 0)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-purple-400/30 bg-white/10 text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== Detail Modal (Pre + Post) ==================== */}
      {detailOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden rounded-3xl border border-purple-400/30 bg-purple-900/95 backdrop-blur-xl shadow-2xl flex flex-col overscroll-contain">
              <div className="flex items-center justify-between border-b border-purple-400/20 p-6 bg-gradient-to-r from-purple-800/50 to-purple-900/50">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {pre?.name || "Student Details"}
                  </h3>
                  <p className="text-purple-200/70 mt-1">
                    Complete fee and placement overview
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  className="rounded-xl border border-purple-400/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all duration-200"
                >
                  <X className="mr-2 inline-block h-4 w-4" />
                  Close
                </button>
              </div>

              {detailLoading ? (
                <div className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
                    <span className="text-lg text-purple-200">
                      Loading student details...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="space-y-8 p-6">
                    {/* Pre-placement */}
                    {pre && (
                      <section>
                        <div className="flex items-center gap-3 mb-6">
                          <TrendingUp className="h-6 w-6 text-purple-300" />
                          <h4 className="text-xl font-semibold text-white">
                            Pre-Placement Overview
                          </h4>
                        </div>

                        <div className="rounded-2xl border border-purple-400/20 bg-white/5 backdrop-blur-sm overflow-hidden">
                          <div className="p-4 bg-gradient-to-r from-purple-800/30 to-purple-900/30 border-b border-purple-400/20">
                            <h5 className="font-semibold text-white">
                              Payment History
                            </h5>
                          </div>
                          <div className="max-h-[400px] overflow-auto">
                            <table className="min-w-full text-sm">
                              <thead className="sticky top-0 bg-purple-800/80 backdrop-blur-sm text-left text-purple-100">
                                <tr>
                                  <th className="px-4 py-3 font-medium">
                                    Amount
                                  </th>
                                  <th className="px-4 py-3 font-medium">
                                    Date
                                  </th>
                                  <th className="px-4 py-3 font-medium">
                                    Mode
                                  </th>
                                  <th className="px-4 py-3 font-medium">
                                    Receipt Nos
                                  </th>
                                  <th className="px-4 py-3 font-medium">
                                    Note
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(pre.payments || []).length ? (
                                  pre.payments.map((p, i) => (
                                    <tr
                                      key={
                                        (p as any)?._id ??
                                        safeKey(i, p.date, p.amount, p.mode)
                                      }
                                      className="border-b border-purple-400/10 hover:bg-white/5 transition-colors duration-200"
                                    >
                                      <td className="px-4 py-3 text-emerald-300 font-semibold">
                                        {formatINR(p.amount || 0)}
                                      </td>
                                      <td className="px-4 py-3 text-white">
                                        {p.date
                                          ? new Date(p.date).toLocaleDateString(
                                            "en-IN"
                                          )
                                          : "—"}
                                      </td>
                                      <td className="px-4 py-3 text-purple-200">
                                        {p.mode || "—"}
                                      </td>
                                      <td className="px-4 py-3 text-purple-200">
                                        {(p.receiptNos || []).join(", ") || "—"}
                                      </td>
                                      <td className="px-4 py-3 text-purple-200">
                                        {p.note || "—"}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      className="px-4 py-8 text-center text-purple-200/70"
                                      colSpan={5}
                                    >
                                      <div className="flex flex-col items-center gap-2">
                                        <Wallet className="h-8 w-8 text-purple-300/50" />
                                        <span>No payment records found</span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Post-placement */}
                    <section>
                      <div className="flex items-center gap-3 mb-6">
                        <Users className="h-6 w-6 text-cyan-300" />
                        <h4 className="text-xl font-semibold text-white">
                          Post-Placement Overview
                          {post.length > 0 && (
                            <span className="ml-2 text-sm text-cyan-300 font-normal">
                              ({post.length} placement
                              {post.length !== 1 ? "s" : ""})
                            </span>
                          )}
                        </h4>
                      </div>

                      {post.length ? (
                        <div className="space-y-6">
                          {post.map((o, oi) => {
                            const companyName =
                              o.company || o.raw?.companyName || "Company —";
                            const location =
                              o.location || o.raw?.location || "—";
                            const totalPP =
                              (typeof o.totalPPFee === "number"
                                ? o.totalPPFee
                                : undefined) ??
                              Number(o.raw?.totalPostPlacementFee || 0);

                            const postInst = (o as any)?.raw?.installments
                              ?.length
                              ? (o as any).raw.installments.map((i: any) => ({
                                label: i.label || "—",
                                amount: Number(i.amount || 0),
                                date: i.date || null,
                                mode: i.mode || "—",
                                note: i.note || "—",
                                _id: i._id,
                              }))
                              : (o.installments || []).map((i: any) => ({
                                label: "—",
                                amount: Number(i.amount || 0),
                                date: i.paidDate || i.dueDate || null,
                                mode: "—",
                                note: "—",
                                _id: i._id,
                              }));

                            const collected = postInst.reduce(
                              (s: number, i: any) => s + (i.amount || 0),
                              0
                            );
                            const remaining = Math.max(
                              Number(totalPP || 0) - collected,
                              0
                            );

                            return (
                              <div
                                key={
                                  o._id ??
                                  safeKey(
                                    oi,
                                    o.studentName,
                                    companyName,
                                    o.offerDate
                                  )
                                }
                                className="rounded-2xl border border-purple-400/20 bg-white/5 backdrop-blur-sm overflow-hidden"
                              >
                                <div className="p-6">
                                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                    <div className="text-white">
                                      <div className="text-lg font-semibold">
                                        {companyName}
                                      </div>
                                      <div className="text-sm text-purple-200/70">
                                        {location}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-purple-400/20 bg-white/5 overflow-hidden">
                                    <div className="p-3 bg-gradient-to-r from-purple-800/30 to-purple-900/30 border-b border-purple-400/20">
                                      <h6 className="font-medium text-white text-sm">
                                        Installment Details
                                      </h6>
                                    </div>
                                    <div className="max-h-[300px] overflow-auto">
                                      <table className="min-w-full text-sm">
                                        <thead className="sticky top-0 bg-purple-800/80 backdrop-blur-sm text-left text-purple-100">
                                          <tr>
                                            <th className="px-4 py-2 font-medium">
                                              Label
                                            </th>
                                            <th className="px-4 py-2 font-medium">
                                              Amount
                                            </th>
                                            <th className="px-4 py-2 font-medium">
                                              Date
                                            </th>
                                            <th className="px-4 py-2 font-medium">
                                              Mode
                                            </th>
                                            <th className="px-4 py-2 font-medium">
                                              Note
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {postInst.length ? (
                                            postInst.map(
                                              (inst: any, ii: number) => (
                                                <tr
                                                  key={
                                                    inst._id ??
                                                    safeKey(
                                                      ii,
                                                      inst.date,
                                                      inst.amount,
                                                      inst.label
                                                    )
                                                  }
                                                  className="border-b border-purple-400/10 hover:bg-white/5 transition-colors duration-200"
                                                >
                                                  <td className="px-4 py-2 text-purple-200">
                                                    {inst.label || "—"}
                                                  </td>
                                                  <td className="px-4 py-2 text-emerald-300 font-semibold">
                                                    {formatINR(
                                                      Number(inst.amount || 0)
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 text-white">
                                                    {inst.date
                                                      ? new Date(
                                                        inst.date
                                                      ).toLocaleDateString(
                                                        "en-IN"
                                                      )
                                                      : "—"}
                                                  </td>
                                                  <td className="px-4 py-2 text-purple-200">
                                                    {inst.mode || "—"}
                                                  </td>
                                                  <td className="px-4 py-2 text-purple-200">
                                                    {inst.note || "—"}
                                                  </td>
                                                </tr>
                                              )
                                            )
                                          ) : (
                                            <tr>
                                              <td
                                                className="px-4 py-6 text-center text-purple-200/70"
                                                colSpan={5}
                                              >
                                                <div className="flex flex-col items-center gap-2">
                                                  <Calendar className="h-6 w-6 text-purple-300/50" />
                                                  <span>
                                                    No installments recorded
                                                  </span>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-purple-400/20 bg-white/5 backdrop-blur-sm p-12 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <Users className="h-16 w-16 text-purple-300/50" />
                            <div>
                              <h5 className="text-lg font-semibold text-white mb-2">
                                No Placements Found
                              </h5>
                              <p className="text-purple-200/70">
                                This student hasn't been placed yet or placement
                                records are not available.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </>
  );
}
