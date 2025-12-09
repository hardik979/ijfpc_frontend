"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
// =====================
// Types
// =====================
type Zone = "BLUE" | "YELLOW" | "GREEN";
const ZONE_OPTIONS = ["BLUE", "YELLOW", "GREEN"] as const;
type Status = "ACTIVE" | "DROPPED" | "PAUSED" | "PLACED";

type Payment = {
  amount: number;
  date: string | null; // ISO
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
  dueDate?: string | null; // ISO
  createdAt?: string;
  updatedAt?: string;
  paymentsCount?: number;
  collectedInRange?: number;
  zone?: Zone;
};

type StudentDetail = StudentRow & { payments: Payment[] };

type ListResponse = {
  page: number;
  limit: number;
  total: number;
  rows: StudentRow[];
  range?: { from: string; to: string } | null;
};
const API_BASE_URL = "https://ijfpc-backend.onrender.com";
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

const formatINRShort = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e7) return `${sign}₹${+(v / 1e7).toFixed(v % 1e7 === 0 ? 0 : 1)}Cr`;
  if (v >= 1e5) return `${sign}₹${+(v / 1e5).toFixed(v % 1e5 === 0 ? 0 : 1)}L`;
  if (v >= 1e3) return `${sign}₹${+(v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1)}K`;
  return `${sign}₹${v}`;
};

const toInputDate = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";
const fromInputDate = (d: string) => (d ? new Date(d).toISOString() : null);

// basic debounce hook
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

  const [month, setMonth] = useState<string>(""); // YYYY-MM
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

  // Fetch list + summary
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());
        if (month) params.set("month", month);
        if (status !== "ALL") params.set("status", status);
        if (zoneFilter !== "ALL") params.set("zone", zoneFilter);

        const [listRes, summaryRes] = await Promise.all([
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
        ]);

        const listJson: ListResponse = await listRes.json();
        const summaryJson: SummaryResponse = await summaryRes.json();
        setList(listJson);
        setSummary(summaryJson);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [debouncedSearch, month, status, page, limit]);

  // Open editor
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

  // Save (PUT full, replace payments)
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

      // refresh list
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
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
    <div className="min-h-screen bg-gradient-to-b from-[#0b0a1a] via-[#0f0b2a] to-[#120f2f] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Pre-Placement Student Management
            </h1>
            <p className="text-sm text-purple-200/70">
              Search, filter, and edit student fee records.
            </p>
          </div>

          <Link
            href="/post-placement-student-creation/pre-placement-data-fill"
            className="self-start sm:self-auto"
          >
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-emerald-200 hover:bg-emerald-500/25 hover:text-emerald-100 transition">
              <Plus size={18} />
              New Student
            </span>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-purple-200/80">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student or course…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-purple-200/80">
              Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-purple-200/80">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
            >
              <option value="ALL">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#120f2f]">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-purple-200/80">
              Zone
            </label>
            <select
              value={zoneFilter}
              onChange={(e) => {
                setZoneFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
            >
              <option value="ALL" className="bg-[#120f2f]">
                All
              </option>
              {ZONE_OPTIONS.map((z) => (
                <option key={z} value={z} className="bg-[#120f2f]">
                  {z}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <SummaryCard title="Students" value={summary?.totalStudents ?? 0} />
          <SummaryCard
            title="Total Fee"
            value={formatINR(summary?.totalFee || 0)}
          />
          <SummaryCard
            title="Collected"
            value={formatINR(summary?.totalReceived || 0)}
          />
          <SummaryCard
            title="Remaining"
            value={formatINR(summary?.remainingFee || 0)}
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-purple-300/20 bg-white/5">
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[#171332] text-left text-purple-200">
                <tr>
                  <Th>Name</Th>
                  <Th>Course</Th>
                  <Th className="text-right">Total Fee</Th>
                  <Th className="text-right">Received</Th>
                  <Th className="text-right">Remaining</Th>
                  <Th>Zone</Th>
                  <Th>Status</Th>
                  <Th>Due</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {list?.rows?.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <Td>
                      <div className="font-medium">{s.name}</div>
                      {s.terms ? (
                        <div className="text-xs text-purple-200/70">
                          {s.terms}
                        </div>
                      ) : null}
                    </Td>
                    <Td className="text-purple-100">{s.courseName || "—"}</Td>
                    <Td className="text-right">{formatINR(s.totalFee || 0)}</Td>
                    <Td className="text-right text-emerald-300">
                      {formatINR(s.totalReceived || 0)}
                    </Td>
                    <Td className="text-right text-amber-300">
                      {formatINR(s.remainingFee || 0)}
                    </Td>
                    <Td>
                      {(() => {
                        const z = s.zone as Zone | undefined;
                        if (!z) return "—";
                        const zCls: Record<Zone, string> = {
                          BLUE: "bg-sky-400/10    text-sky-300    border border-sky-300/30",
                          YELLOW:
                            "bg-amber-400/10  text-amber-300  border border-amber-300/30",
                          GREEN:
                            "bg-emerald-400/10 text-emerald-300 border border-emerald-300/30",
                        };
                        return (
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs",
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
                            "bg-emerald-400/10 text-emerald-300 border border-emerald-300/30",
                          PAUSED:
                            "bg-amber-400/10  text-amber-300  border border-amber-300/30",
                          PLACED:
                            "bg-sky-400/10    text-sky-300    border border-sky-300/30",
                          DROPPED:
                            "bg-rose-400/10   text-rose-300   border border-rose-300/30",
                        };
                        return (
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs",
                              cls[s.status]
                            )}
                          >
                            {s.status}
                          </span>
                        );
                      })()}
                    </Td>

                    <Td className="text-purple-200/80">
                      {s.dueDate
                        ? new Date(s.dueDate).toLocaleDateString("en-IN")
                        : "—"}
                    </Td>
                    <Td>
                      <button
                        onClick={() => openEditor(s._id)}
                        className="rounded-lg border border-purple-300/30 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
                      >
                        Edit
                      </button>
                    </Td>
                  </tr>
                ))}
                {!list?.rows?.length && (
                  <tr>
                    <Td
                      colSpan={8}
                      className="py-8 text-center text-purple-200/70"
                    >
                      {loading ? "Loading…" : "No records"}
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 border-t border-white/10 p-3 text-xs">
            <div className="text-purple-200/70">
              Page {list?.page ?? 1} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={(list?.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={(list?.page ?? 1) >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="rounded-lg border border-white/10 bg-transparent px-2 py-1"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n} className="bg-[#120f2f]">
                    {n}/page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Editor Drawer / Modal */}
        {editData && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeEditor}
            />
            <div className="relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#0f0b24] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit: {editData.name}</h2>
                <button
                  onClick={closeEditor}
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>

              {/* Top-level fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <LabeledInput
                  label="Name"
                  value={editData.name}
                  onChange={(v) => setEditData({ ...editData, name: v })}
                />
                <LabeledInput
                  label="Course"
                  value={editData.courseName || ""}
                  onChange={(v) => setEditData({ ...editData, courseName: v })}
                />
                <LabeledInput
                  label="Terms (S)"
                  value={editData.terms || ""}
                  onChange={(v) => setEditData({ ...editData, terms: v })}
                />
                <LabeledNumber
                  label="Total Fee"
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
                  <label className="mb-1 block text-xs text-purple-200/80">
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

                        // refresh list after status change
                        const params = new URLSearchParams({
                          page: String(page),
                          limit: String(limit),
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[#0f0b24]">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-purple-200/80">
                    Zone
                  </label>
                  <select
                    value={editData.zone || "BLUE"}
                    onChange={async (e) => {
                      const next = e.target.value as Zone;
                      // disallow changing zone for PLACED (UI guard; backend also enforces)
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

                        // refresh list (same snippet you already use elsewhere)
                        const params = new URLSearchParams({
                          page: String(page),
                          limit: String(limit),
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
                        // revert UI on failure
                        setEditData({ ...editData, zone: prev });
                        alert("Failed to update zone");
                      }
                    }}
                    disabled={editData.status === "PLACED"}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    title={
                      editData.status === "PLACED"
                        ? "Zones do not apply to PLACED students"
                        : ""
                    }
                  >
                    {ZONE_OPTIONS.map((z) => (
                      <option key={z} value={z} className="bg-[#0f0b24]">
                        {z}
                      </option>
                    ))}
                  </select>
                  {editData.status === "PLACED" && (
                    <div className="mt-1 text-xs text-purple-200/70">
                      Zones don’t apply to PLACED students.
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <MiniStat
                  label="Received"
                  value={formatINR(editData.totalReceived || 0)}
                />
                <MiniStat
                  label="Remaining"
                  value={formatINR(editData.remainingFee || 0)}
                />
                <MiniStat
                  label="Payments"
                  value={String(editData.payments?.length || 0)}
                />
              </div>

              {/* Payments */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Payments</h3>
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
                    className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"
                  >
                    + Add Payment
                  </button>
                </div>

                <div className="space-y-3">
                  {(editData.payments || []).map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
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
                          label="Receipt Nos (comma)"
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
                            className="h-10 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 text-xs text-rose-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-white/10 bg-[#0f0b24] py-4">
                <button
                  onClick={closeEditor}
                  className="rounded-lg border border-white/10 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStudent}
                  disabled={saving}
                  className="rounded-lg border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
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
// Small Components
// =====================

function Th({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium uppercase tracking-wider",
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
    <td
      colSpan={colSpan}
      className={cn("px-4 py-3 align-top text-sm text-purple-100", className)}
    >
      {children}
    </td>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-purple-300/20 bg-white/5 p-4">
      <div className="text-xs text-purple-200/70">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-purple-200/70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
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
      <label className="mb-1 block text-xs text-purple-200/80">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
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
      <label className="mb-1 block text-xs text-purple-200/80">{label}</label>
      <input
        type="number"
        value={isNaN(value) ? 0 : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
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
      <label className="mb-1 block text-xs text-purple-200/80">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40"
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
