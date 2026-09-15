"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Search,
  Star,
  Users,
  AlertTriangle,
} from "lucide-react";
import { API_LMS_URL } from "@/lib/api";

/**
 * Real HR Calling performers — the active green-zone roster with a per-student
 * toggle for `performerInRealHRCalling`.
 *
 * List:   GET   /api/recordings/realhr-calling-performers
 * Toggle: PATCH /api/recordings/set-realhr-calling-performer/:_id  (flips the flag)
 */

interface PerformerRow {
  id: string;
  studentName: string;
  email: string | null;
  zone: string | null;
  batch: string | null;
  course: string | null;
  performer: boolean;
}

type Filter = "all" | "performer" | "not-performer";

const LMS = (API_LMS_URL || "").replace(/\/$/, "");

export default function RealHrPerformers() {
  const [rows, setRows] = useState<PerformerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Ids whose PATCH is in flight — the toggle is disabled while it runs so a
  // double-click can't flip the flag twice.
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${LMS}/api/recordings/realhr-calling-performers`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }
      setRows(data.students || []);
    } catch (err) {
      console.error("Error fetching Real HR performers:", err);
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const togglePerformer = async (row: PerformerRow) => {
    if (pending.has(row.id)) return;

    setPending((s) => new Set(s).add(row.id));
    setRowError((e) => {
      const { [row.id]: _dropped, ...rest } = e;
      return rest;
    });
    // Optimistic flip; reverted below if the server disagrees.
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, performer: !r.performer } : r))
    );

    try {
      const res = await fetch(
        `${LMS}/api/recordings/set-realhr-calling-performer/${row.id}`,
        { method: "PATCH" }
      );
      const data = await res.json();
      if (!res.ok || data?.status !== "success") {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }
      // Trust the server's value over the optimistic one.
      const serverValue = Boolean(data?.response?.performerInRealHRCalling);
      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, performer: serverValue } : r))
      );
    } catch (err) {
      console.error("Error toggling Real HR performer:", err);
      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, performer: row.performer } : r))
      );
      setRowError((e) => ({
        ...e,
        [row.id]: err instanceof Error ? err.message : "Update failed",
      }));
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  };

  const performerCount = useMemo(
    () => rows.filter((r) => r.performer).length,
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "performer" && !r.performer) return false;
      if (filter === "not-performer" && r.performer) return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.batch ?? "").toLowerCase().includes(q) ||
        (r.course ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const filterChip = (key: Filter, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
        filter === key
          ? "bg-[#8B4513] text-white shadow"
          : "bg-white text-[#8D6E63] border border-[#EFEBE9] hover:bg-[#FAF9F6] hover:text-[#8B4513]"
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-2 border-[#EFEBE9] rounded-[2rem] shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 border-b border-[#F5F5DC]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF5EC] flex items-center justify-center">
            <Star className="w-5 h-5 text-[#8B4513]" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-[#3E2723]">
              Real HR Calling <span className="text-[#8B4513]">Performers</span>
            </h2>
            <p className="text-xs text-[#8D6E63]">
              Active green-zone students · toggle to mark a student as a performer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#FAF5EC] rounded-2xl border border-[#EFEBE9]">
            <Users className="w-4 h-4 text-[#8B4513]" />
            <span className="text-xs font-semibold text-[#5D4037]">
              {rows.length} active
            </span>
            <span className="text-[#D2B48C]">·</span>
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-[#5D4037]">
              {performerCount} performers
            </span>
          </div>
          <button
            onClick={fetchRows}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#8B4513] border border-[#EFEBE9] rounded-2xl text-xs font-semibold hover:bg-[#FAF9F6] transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center gap-3 px-6 py-4 border-b border-[#F5F5DC]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D2B48C] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, batch or course…"
            className="w-full bg-white pl-11 pr-4 py-2.5 rounded-2xl border-2 border-[#EFEBE9] outline-none text-sm text-[#4A2C2A] focus:border-[#8B4513] focus:ring-4 focus:ring-[#F5F5DC] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filterChip("all", "All", rows.length)}
          {filterChip("performer", "Performers", performerCount)}
          {filterChip("not-performer", "Not yet", rows.length - performerCount)}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#8B4513] animate-spin" />
            <p className="text-sm text-[#8D6E63]">Loading green-zone students…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button
              onClick={fetchRows}
              className="px-4 py-2 bg-[#8B4513] text-white rounded-2xl text-xs font-semibold"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-2">
            <Users className="w-8 h-8 text-[#D2B48C]" />
            <p className="text-sm text-[#8D6E63]">
              {rows.length === 0
                ? "No active green-zone students found."
                : "No students match this filter."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#FBF8F3] text-[10px] uppercase tracking-[0.15em] text-[#8D6E63]">
              <tr>
                <th className="text-left font-semibold px-6 py-3 w-12">#</th>
                <th className="text-left font-semibold px-4 py-3">Student</th>
                <th className="text-left font-semibold px-4 py-3">Batch</th>
                <th className="text-left font-semibold px-4 py-3">Course</th>
                <th className="text-left font-semibold px-4 py-3">Zone</th>
                <th className="text-right font-semibold px-6 py-3">Performer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F7F0E6]">
              {visible.map((r, i) => {
                const busy = pending.has(r.id);
                return (
                  <tr key={r.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="px-6 py-3 text-[#A1887F] font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FAF5EC] flex items-center justify-center text-xs font-bold text-[#8B4513] uppercase shrink-0">
                          {r.studentName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#3E2723] truncate">{r.studentName}</p>
                          {r.email && (
                            <p className="text-xs text-[#8D6E63] truncate">{r.email}</p>
                          )}
                          {rowError[r.id] && (
                            <p className="text-xs text-red-600 mt-0.5">{rowError[r.id]}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#5D4037]">{r.batch ?? "—"}</td>
                    <td className="px-4 py-3 text-[#5D4037]">{r.course ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {r.zone ?? "green"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={`text-xs font-semibold ${
                            r.performer ? "text-emerald-600" : "text-[#A1887F]"
                          }`}
                        >
                          {r.performer ? "Yes" : "No"}
                        </span>
                        <button
                          role="switch"
                          aria-checked={r.performer}
                          aria-label={`Mark ${r.studentName} as Real HR calling performer`}
                          disabled={busy}
                          onClick={() => togglePerformer(r)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5F5DC] disabled:opacity-60 ${
                            r.performer ? "bg-emerald-500" : "bg-[#D7CCC8]"
                          }`}
                        >
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                              r.performer ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          >
                            {busy && (
                              <Loader2 className="w-3 h-3 text-[#8B4513] animate-spin" />
                            )}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
