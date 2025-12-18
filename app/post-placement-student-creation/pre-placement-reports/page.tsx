"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
} from "lucide-react";

// =====================
// Types
// =====================
type Zone = "BLUE" | "YELLOW" | "GREEN";
const ZONE_OPTIONS = ["BLUE", "YELLOW", "GREEN"] as const;
type Status = "ACTIVE" | "DROPPED" | "PAUSED" | "PLACED";

type Payment = {
  amount: number;
  date: string | null;
  mode?: string;
  receiptNos?: string[];
  note?: string;
};

type StudentRow = {
  _id: string;
  name: string;
  courseName?: string;
  terms?: string;
  totalFee: number;
  totalReceived: number;
  remainingFee: number;
  status: Status;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  paymentsCount?: number;
  collectedInRange?: number;
  zone?: Zone;
  payments?: Payment[];
  allReceiptNos?: string[];
};

type StudentDetail = StudentRow & { payments: Payment[] };

type ListResponse = {
  page: number;
  limit: number;
  total: number;
  rows: StudentRow[];
  range?: { from: string; to: string } | null;
};

const API_BASE_URL = "https://lms-backend-tgrh.onrender.com";

type SummaryResponse = {
  totalStudents: number;
  totalFee: number;
  totalReceived: number;
  remainingFee: number;
  collectedInRange: number;
  monthly: Array<{ _id: { y: number; m: number }; collected: number }>;
  range?: { from: string; to: string } | null;
  filters?: { status: Status | null; course: string | null };
};

// =====================
// Utils
// =====================
const STATUS_OPTIONS: Status[] = ["ACTIVE", "PAUSED", "PLACED", "DROPPED"];
const cn = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const toInputDate = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";
const fromInputDate = (d: string) => (d ? new Date(d).toISOString() : null);

function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// =====================
// Page Component
// =====================

export default function PrePlacementStudentManagerPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 400);

  const [month, setMonth] = useState<string>("");
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [list, setList] = useState<ListResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<Zone | "ALL">("ALL");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<StudentDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  // Helper function to get unique receipt numbers for a student
  const getReceiptNumbers = (student: StudentRow): string[] => {
    // Prefer allReceiptNos if present
    if (student.allReceiptNos && student.allReceiptNos.length > 0) {
      return student.allReceiptNos.map((r) => r.trim()).filter(Boolean);
    }

    // Otherwise compute from payments
    if (student.payments && student.payments.length > 0) {
      const receipts = student.payments
        .flatMap((p) => p.receiptNos || [])
        .map((r) => r.trim())
        .filter(Boolean);

      // Make unique while preserving order
      return [...new Set(receipts)];
    }

    return [];
  };

  // Fetch list + summary
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Main list params (paged)
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          includePayments: "true",
        });

        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());
        if (month) params.set("month", month);
        if (status !== "ALL") params.set("status", status);
        if (zoneFilter !== "ALL") params.set("zone", zoneFilter);

        // Active count params (NOT paged for display; we only read `total`)
        const activeParams = new URLSearchParams({
          page: "1",
          limit: "1",
          includePayments: "false",
          status: "ACTIVE",
        });

        if (debouncedSearch.trim())
          activeParams.set("search", debouncedSearch.trim());
        if (month) activeParams.set("month", month);
        if (zoneFilter !== "ALL") activeParams.set("zone", zoneFilter);

        const [listRes, summaryRes, activeRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/preplacement/students?${params.toString()}`
          ),
          fetch(
            `${API_BASE_URL}/api/preplacement/summary?${(() => {
              const p = new URLSearchParams();
              if (month) p.set("month", month);
              if (status !== "ALL") p.set("status", status);
              return p.toString();
            })()}`
          ),
          fetch(
            `${API_BASE_URL}/api/preplacement/students?${activeParams.toString()}`
          ),
        ]);

        const listJson: ListResponse = await listRes.json();
        const summaryJson: SummaryResponse = await summaryRes.json();
        const activeJson: ListResponse = await activeRes.json();

        setList(listJson);
        setSummary(summaryJson);

        // IMPORTANT: this must be a state you created like:
        // const [activeCount, setActiveCount] = useState(0);
        setActiveCount(activeJson?.total ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [debouncedSearch, month, status, page, limit, zoneFilter]);

  const openEditor = async (id: string) => {
    setEditingId(id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/preplacement/students/${id}`
      );
      const data: StudentDetail = await res.json();
      setEditData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveStudent = async () => {
    if (!editingId || !editData) return;
    setSaving(true);
    try {
      const body = {
        name: editData.name,
        courseName: editData.courseName,
        terms: editData.terms,
        totalFee: editData.totalFee,
        dueDate: editData.dueDate,
        status: editData.status,
        payments: (editData.payments || []).map((p) => ({
          amount: Number(p.amount || 0),
          date: p.date,
          mode: p.mode || "",
          receiptNos: p.receiptNos || [],
          note: p.note || "",
        })),
      } as any;

      const res = await fetch(
        `${API_BASE_URL}/api/preplacement/students/${editingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        includePayments: "true",
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (month) params.set("month", month);
      if (status !== "ALL") params.set("status", status);
      const listRes = await fetch(
        `${API_BASE_URL}/api/preplacement/students?${params.toString()}`
      );
      const listJson: ListResponse = await listRes.json();
      setList(listJson);

      closeEditor();
    } catch (e) {
      console.error(e);
      alert("Save failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = useMemo(
    () => (list ? Math.max(1, Math.ceil(list.total / list.limit)) : 1),
    [list]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0a1a] via-[#0f0b2a] to-[#1a0f3f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold  mb-1 bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                Fee Management
              </h1>
              <p className="text-sm text-purple-300/70">
                Track and manage student fee records
              </p>
            </div>

            <button className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105">
              <Plus size={20} />
              Add Student
            </button>
          </div>
        </div>

        {/* Stats Grid with Active Students */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Active Students"
            value={activeCount}
            icon={<Users className="w-5 h-5" />}
            gradient="from-emerald-500 to-teal-500"
            iconBg="bg-emerald-500/20"
            iconColor="text-emerald-300"
          />
          <StatCard
            title="Total Students"
            value={summary?.totalStudents ?? 0}
            icon={<Users className="w-5 h-5" />}
            gradient="from-purple-500 to-indigo-500"
            iconBg="bg-purple-500/20"
            iconColor="text-purple-300"
          />
          <StatCard
            title="Total Fee"
            value={formatINR(summary?.totalFee || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            gradient="from-violet-500 to-purple-500"
            iconBg="bg-violet-500/20"
            iconColor="text-violet-300"
          />
          <StatCard
            title="Collected"
            value={formatINR(summary?.totalReceived || 0)}
            icon={<TrendingUp className="w-5 h-5" />}
            gradient="from-green-500 to-emerald-500"
            iconBg="bg-green-500/20"
            iconColor="text-green-300"
          />
          <StatCard
            title="Remaining"
            value={formatINR(summary?.remainingFee || 0)}
            icon={<AlertCircle className="w-5 h-5" />}
            gradient="from-amber-500 to-orange-500"
            iconBg="bg-amber-500/20"
            iconColor="text-amber-300"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl bg-white/5 backdrop-blur-xl p-6 border border-purple-500/20 shadow-xl shadow-purple-900/20">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-purple-200">Filters</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="col-span-2">
              <label className="mb-2 block text-xs font-medium text-purple-300">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or course..."
                  className="w-full rounded-xl border border-purple-500/30 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-purple-400/50 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-purple-300">
                Month Filter
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-purple-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
              >
                <option value="ALL" className="bg-[#1a0f3f]">
                  All Status
                </option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-[#1a0f3f]">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-purple-300">
                Zone
              </label>
              <select
                value={zoneFilter}
                onChange={(e) => {
                  setZoneFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
              >
                <option value="ALL" className="bg-[#1a0f3f]">
                  All Zones
                </option>
                {ZONE_OPTIONS.map((z) => (
                  <option key={z} value={z} className="bg-[#1a0f3f]">
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-900/30">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5 border-b border-purple-500/20">
                <tr>
                  <Th>Student Details</Th>
                  <Th>Course</Th>
                  <Th className="text-right">Total Fee</Th>
                  <Th className="text-right">Collected</Th>
                  <Th className="text-right">Balance</Th>
                  <Th>Receipt No.</Th>
                  <Th>Zone</Th>
                  <Th>Status</Th>
                  <Th className="text-center">Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {list?.rows?.map((s) => (
                  <tr
                    key={s._id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <Td>
                      <div>
                        <div className="font-semibold text-white">{s.name}</div>
                        {s.terms && (
                          <div className="text-xs text-purple-300/70 mt-0.5">
                            {s.terms}
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td className="text-purple-200">{s.courseName || "—"}</Td>
                    <Td className="text-right font-semibold text-white">
                      {formatINR(s.totalFee || 0)}
                    </Td>
                    <Td className="text-right font-semibold text-emerald-400">
                      {formatINR(s.totalReceived || 0)}
                    </Td>
                    <Td className="text-right font-semibold text-amber-400">
                      {formatINR(s.remainingFee || 0)}
                    </Td>
                    <Td>
                      {(() => {
                        const receipts = getReceiptNumbers(s);
                        if (receipts.length > 0) {
                          return (
                            <span className="text-xs text-purple-300/70 font-mono">
                              {receipts.join(", ")}
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs text-purple-300/70 font-mono">
                            —
                          </span>
                        );
                      })()}
                    </Td>
                    <Td>
                      {(() => {
                        const z = s.zone as Zone | undefined;
                        if (!z)
                          return <span className="text-purple-400/50">—</span>;
                        const zCls: Record<Zone, string> = {
                          BLUE: "bg-blue-500/20 text-blue-300 border-blue-400/30",
                          YELLOW:
                            "bg-amber-500/20 text-amber-300 border-amber-400/30",
                          GREEN:
                            "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
                        };
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border backdrop-blur-sm",
                              zCls[z]
                            )}
                          >
                            {z}
                          </span>
                        );
                      })()}
                    </Td>
                    <Td>
                      {(() => {
                        const cls: Record<Status, string> = {
                          ACTIVE:
                            "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
                          PAUSED:
                            "bg-amber-500/20 text-amber-300 border-amber-400/30",
                          PLACED:
                            "bg-blue-500/20 text-blue-300 border-blue-400/30",
                          DROPPED:
                            "bg-rose-500/20 text-rose-300 border-rose-400/30",
                        };
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border backdrop-blur-sm",
                              cls[s.status]
                            )}
                          >
                            {s.status}
                          </span>
                        );
                      })()}
                    </Td>
                    <Td className="text-center">
                      <button
                        onClick={() => openEditor(s._id)}
                        className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1.5 text-xs font-medium text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105"
                      >
                        Edit
                      </button>
                    </Td>
                  </tr>
                ))}
                {!list?.rows?.length && (
                  <tr>
                    <Td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-purple-400/70">
                          {loading
                            ? "Loading students..."
                            : "No students found"}
                        </div>
                      </div>
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 border-t border-purple-500/20 bg-white/5 px-6 py-4">
            <div className="text-sm text-purple-300">
              Page{" "}
              <span className="font-semibold text-white">
                {list?.page ?? 1}
              </span>{" "}
              of <span className="font-semibold text-white">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={(list?.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-purple-500/30 bg-white/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition backdrop-blur-sm"
              >
                Previous
              </button>
              <button
                disabled={(list?.page ?? 1) >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-purple-500/30 bg-white/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition backdrop-blur-sm"
              >
                Next
              </button>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="rounded-lg border border-purple-500/30 bg-white/10 px-3 py-2 text-sm font-medium text-purple-200 backdrop-blur-sm"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n} className="bg-[#1a0f3f]">
                    {n}/page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Editor Modal */}
        {editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-[#1a0f3f] to-[#0f0b2a] border border-purple-500/30 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-purple-500/30 bg-[#1a0f3f]/95 backdrop-blur-xl px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  Edit Student:{" "}
                  <span className="text-purple-300">{editData.name}</span>
                </h2>
                <button
                  onClick={closeEditor}
                  className="rounded-lg border border-purple-500/30 bg-white/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-white/15 transition backdrop-blur-sm"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Student Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LabeledInput
                    label="Student Name"
                    value={editData.name}
                    onChange={(v) => setEditData({ ...editData, name: v })}
                  />
                  <LabeledInput
                    label="Course Name"
                    value={editData.courseName || ""}
                    onChange={(v) =>
                      setEditData({ ...editData, courseName: v })
                    }
                  />
                  <LabeledInput
                    label="Terms"
                    value={editData.terms || ""}
                    onChange={(v) => setEditData({ ...editData, terms: v })}
                  />
                  <LabeledNumber
                    label="Total Fee Amount"
                    value={editData.totalFee}
                    onChange={(v) => setEditData({ ...editData, totalFee: v })}
                  />
                  <LabeledDate
                    label="Due Date"
                    value={toInputDate(editData.dueDate || undefined)}
                    onChange={(d) =>
                      setEditData({ ...editData, dueDate: fromInputDate(d) })
                    }
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-purple-300">
                      Status
                    </label>
                    <select
                      value={editData.status}
                      onChange={async (e) => {
                        const next = e.target.value as Status;
                        setEditData({ ...editData, status: next });
                        try {
                          const r = await fetch(
                            `${API_BASE_URL}/api/preplacement/students/${editingId}/status`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: next }),
                            }
                          );
                          if (!r.ok) throw new Error("Status update failed");

                          const params = new URLSearchParams({
                            page: String(page),
                            limit: String(limit),
                            includePayments: "true",
                          });
                          if (debouncedSearch.trim())
                            params.set("search", debouncedSearch.trim());
                          if (month) params.set("month", month);
                          if (status !== "ALL") params.set("status", status);

                          const listRes = await fetch(
                            `${API_BASE_URL}/api/preplacement/students?${params.toString()}`
                          );
                          const listJson: ListResponse = await listRes.json();
                          setList(listJson);
                        } catch (err) {
                          console.error(err);
                          alert("Failed to update status");
                        }
                      }}
                      className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[#1a0f3f]">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-purple-300">
                      Zone
                    </label>
                    <select
                      value={editData.zone || "BLUE"}
                      onChange={async (e) => {
                        const next = e.target.value as Zone;
                        if (editData.status === "PLACED") return;

                        const prev = editData.zone;
                        setEditData({ ...editData, zone: next });

                        try {
                          const r = await fetch(
                            `${API_BASE_URL}/api/preplacement/students/${editingId}/zone`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ zone: next }),
                            }
                          );
                          if (!r.ok) throw new Error("Zone update failed");

                          const params = new URLSearchParams({
                            page: String(page),
                            limit: String(limit),
                            includePayments: "true",
                          });
                          if (debouncedSearch.trim())
                            params.set("search", debouncedSearch.trim());
                          if (month) params.set("month", month);
                          if (status !== "ALL") params.set("status", status);
                          if (zoneFilter !== "ALL")
                            params.set("zone", zoneFilter);

                          const listRes = await fetch(
                            `${API_BASE_URL}/api/preplacement/students?${params.toString()}`
                          );
                          const listJson: ListResponse = await listRes.json();
                          setList(listJson);
                        } catch (err) {
                          console.error(err);
                          setEditData({ ...editData, zone: prev });
                          alert("Failed to update zone");
                        }
                      }}
                      disabled={editData.status === "PLACED"}
                      className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 backdrop-blur-sm"
                    >
                      {ZONE_OPTIONS.map((z) => (
                        <option key={z} value={z} className="bg-[#1a0f3f]">
                          {z}
                        </option>
                      ))}
                    </select>
                    {editData.status === "PLACED" && (
                      <p className="mt-1.5 text-xs text-purple-400/70">
                        Zones don't apply to placed students
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 backdrop-blur-sm">
                    <div className="text-xs font-medium text-emerald-300">
                      Total Received
                    </div>
                    <div className="mt-1 text-lg font-bold text-emerald-200">
                      {formatINR(editData.totalReceived || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 backdrop-blur-sm">
                    <div className="text-xs font-medium text-amber-300">
                      Remaining
                    </div>
                    <div className="mt-1 text-lg font-bold text-amber-200">
                      {formatINR(editData.remainingFee || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 backdrop-blur-sm">
                    <div className="text-xs font-medium text-purple-300">
                      Total Payments
                    </div>
                    <div className="mt-1 text-lg font-bold text-purple-200">
                      {editData.payments?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Payments */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Payment History
                    </h3>
                    <button
                      onClick={() =>
                        setEditData({
                          ...editData,
                          payments: [
                            ...(editData.payments || []),
                            {
                              amount: 0,
                              date: null,
                              mode: "",
                              receiptNos: [],
                              note: "",
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-105"
                    >
                      <Plus size={16} />
                      Add Payment
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(editData.payments || []).map((p, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-purple-500/30 bg-white/5 p-4 backdrop-blur-sm"
                      >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                          <LabeledNumber
                            label="Amount"
                            value={Number(p.amount || 0)}
                            onChange={(v) =>
                              updatePayment(editData, setEditData, idx, {
                                amount: v,
                              })
                            }
                          />
                          <LabeledDate
                            label="Date"
                            value={toInputDate(p.date || undefined)}
                            onChange={(d) =>
                              updatePayment(editData, setEditData, idx, {
                                date: fromInputDate(d),
                              })
                            }
                          />
                          <LabeledInput
                            label="Mode"
                            value={p.mode || ""}
                            onChange={(v) =>
                              updatePayment(editData, setEditData, idx, {
                                mode: v,
                              })
                            }
                          />
                          <LabeledInput
                            label="Receipt Nos"
                            value={(p.receiptNos || []).join(", ")}
                            onChange={(v) =>
                              updatePayment(editData, setEditData, idx, {
                                receiptNos: v
                                  .split(",")
                                  .map((x) => x.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                          <LabeledInput
                            label="Note"
                            value={p.note || ""}
                            onChange={(v) =>
                              updatePayment(editData, setEditData, idx, {
                                note: v,
                              })
                            }
                          />
                          <div className="flex items-end justify-end">
                            <button
                              onClick={() =>
                                removePayment(editData, setEditData, idx)
                              }
                              className="h-10 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-4 text-sm font-medium text-white hover:shadow-lg hover:shadow-rose-500/30 transition-all hover:scale-105"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!editData.payments || editData.payments.length === 0) && (
                      <div className="py-8 text-center text-purple-400/70">
                        No payments recorded yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-purple-500/30 bg-[#1a0f3f]/95 backdrop-blur-xl px-6 py-4">
                <button
                  onClick={closeEditor}
                  className="rounded-lg border border-purple-500/30 bg-white/10 px-6 py-2.5 text-sm font-medium text-purple-200 hover:bg-white/15 transition backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStudent}
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-medium text-white hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// Components
// =====================

function Th({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={cn(
        "px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-purple-300",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: React.PropsWithChildren<{ className?: string; colSpan?: number }>) {
  return (
    <td colSpan={colSpan} className={cn("px-6 py-4 text-sm", className)}>
      {children}
    </td>
  );
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl p-6 border border-purple-500/20 shadow-xl shadow-purple-900/20">
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br",
          gradient
        )}
      />
      <div className="relative">
        <div
          className={cn(
            "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 backdrop-blur-sm",
            iconBg
          )}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="text-xs font-medium text-purple-300/80 mb-1">
          {title}
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-purple-300">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-purple-400/50 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
      />
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-purple-300">
        {label}
      </label>
      <input
        type="number"
        value={isNaN(value) ? 0 : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
      />
    </div>
  );
}

function LabeledDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-purple-300">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
      />
    </div>
  );
}

function updatePayment(
  editData: StudentDetail,
  setEditData: React.Dispatch<React.SetStateAction<StudentDetail | null>>,
  idx: number,
  patch: Partial<Payment>
) {
  const payments = [...(editData.payments || [])];
  payments[idx] = { ...payments[idx], ...patch } as Payment;
  setEditData({ ...editData, payments });
}

function removePayment(
  editData: StudentDetail,
  setEditData: React.Dispatch<React.SetStateAction<StudentDetail | null>>,
  idx: number
) {
  const payments = [...(editData.payments || [])];
  payments.splice(idx, 1);
  setEditData({ ...editData, payments });
}
