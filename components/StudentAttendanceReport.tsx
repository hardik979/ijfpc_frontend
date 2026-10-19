"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Reply,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  CalendarCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

const API_KEY = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "";

type ZoneFilter = "all" | "blue" | "yellow" | "green" | "newly_enrolled";

type ReportRow = {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string | null;
  zone: string | null;
  batch: string | null;
  attendancePercentage: number | null;
  attendanceMatched: boolean;
};

type BatchOption = { _id: string; batch?: string };

type SortKey = "batch" | "attendancePercentage";
type SortDir = "asc" | "desc";

// Simplified rule, not the staff-attendance half-day/leave/exception policy:
// Sunday is always Week Off; any other day is Present only with BOTH a
// punch-in and a punch-out on record, otherwise Absent.
type AttendanceStatus = "present" | "absent" | "week_off";

type AttendanceRecord = {
  dateKey: string;
  dayOfWeek: string;
  status: AttendanceStatus;
  inTime: string | null;
  outTime: string | null;
  workedMinutes: number | null;
  workedLabel: string | null;
};

type AttendanceSummary = {
  presentDays: number;
  absentDays: number;
  weekOffDays: number;
  attendancePercentage: number;
};

type AttendanceDetail = {
  matched: boolean;
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  availableMonths: string[];
};

const zoneBadge = (zone?: string | null) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-700 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  if (z === "newly_enrolled") return "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30";
  return "bg-gray-500/15 text-gray-700 ring-1 ring-gray-500/30";
};

const attendanceColor = (value: number | null) => {
  if (value === null || value === undefined) return "text-[var(--so-text-muted)]";
  return value >= 75 ? "text-emerald-600" : "text-red-600";
};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30",
  absent: "bg-red-500/15 text-red-700 ring-1 ring-red-500/30",
  week_off: "bg-slate-300 text-black ring-1 ring-slate-400/40",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  week_off: "Week Off",
};

const formatMonthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const formatDateLabel = (dateKey: string) => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const LIMIT = 20;

export default function StudentAttendanceReport() {
  const router = useRouter();

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [batches, setBatches] = useState<BatchOption[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>("attendancePercentage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Drill-down state ──
  const [selectedStudent, setSelectedStudent] = useState<ReportRow | null>(null);
  const [detailMonth, setDetailMonth] = useState<string>("");
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_LMS_URL}/api/batches/get-batches?limit=100`, {
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (res.ok && Array.isArray(json?.data)) setBatches(json.data);
      } catch {
        // Batch filter is a convenience — a failed fetch just leaves it empty.
      }
    })();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (zoneFilter !== "all") params.set("zone", zoneFilter);
      if (batchFilter !== "all") params.set("batchCode", batchFilter);
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());

      const res = await fetch(
        `${API_LMS_URL}/api/admin/students-attendance-report?${params.toString()}`,
        {
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || "Failed to load attendance report");
      }
      setRows(json.data.students || []);
      setTotal(json.data.total ?? 0);
      setTotalPages(json.data.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, zoneFilter, batchFilter, appliedSearch]);

  const fetchDetail = async (student: ReportRow, month: string) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const params = new URLSearchParams({ clerkId: student.clerkId });
      if (student.email) params.set("email", student.email);
      if (month) params.set("month", month);

      const res = await fetch(`${API_LMS_URL}/api/admin/student-attendance-detail?${params.toString()}`, {
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || "Failed to load attendance detail");
      }
      setDetail(json.data);
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load attendance detail");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openStudent = (row: ReportRow) => {
    setSelectedStudent(row);
    setDetailMonth("");
    setDetail(null);
    fetchDetail(row, "");
  };

  const closeStudent = () => {
    setSelectedStudent(null);
    setDetail(null);
    setDetailError(null);
  };

  const handleMonthChange = (month: string) => {
    setDetailMonth(month);
    if (selectedStudent) fetchDetail(selectedStudent, month);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchDraft);
  };

  const rangeLabel = useMemo(() => {
    if (!total) return "0 active students";
    const start = (page - 1) * LIMIT + 1;
    const end = Math.min(page * LIMIT, total);
    return `${start}–${end} of ${total} active students`;
  }, [page, total]);

  // Sorts the students currently loaded on this page — the list itself is
  // server-paginated, so this doesn't re-rank across pages.
  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return dir * av.localeCompare(bv);
      }
      return dir * (Number(av) - Number(bv));
    });
  }, [rows, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const thClass =
    "sticky top-0 z-10 border-b border-[var(--so-border)] bg-[var(--so-bg-header)] px-4 py-3";

  const SortableTh = ({ column, children }: { column: SortKey; children: React.ReactNode }) => (
    <th className={thClass}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 transition hover:text-[var(--so-text-primary)]"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </th>
  );

  return (
    <div className="min-h-screen bg-[var(--so-bg-page)] p-6 text-[var(--so-text-primary)]">
      <div className="mx-auto max-w-5xl">
        {/* ── Header bar ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => (selectedStudent ? closeStudent() : router.back())}
            aria-label={selectedStudent ? "Back to list" : "Back"}
            title={selectedStudent ? "Back to list" : "Back"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)]"
          >
            <Reply className="h-4 w-4" />
          </button>

          <div className="h-6 w-px shrink-0 bg-[var(--so-border)]" />

          <div className="flex min-w-0 items-center gap-2">
            <CalendarCheck className="hidden h-5 w-5 shrink-0 text-[#8b5cf6] md:block" />
            <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-[var(--so-text-primary)] sm:text-2xl">
              Student Attendance
            </h1>
            <span className="hidden truncate text-xs text-[var(--so-text-secondary)] md:inline">
              {selectedStudent ? "· Attendance detail" : loading ? "· Loading…" : `· ${rangeLabel}`}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => (selectedStudent ? fetchDetail(selectedStudent, detailMonth) : fetchReport())}
              aria-label="Refresh"
              title="Refresh"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)]"
            >
              <RefreshCw className={`h-4 w-4 ${(loading || detailLoading) ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {selectedStudent ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]/15 text-sm font-semibold text-[#8b5cf6]">
                {(selectedStudent.fullName || "S").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--so-text-primary)]">{selectedStudent.fullName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${zoneBadge(selectedStudent.zone)}`}>
                    {selectedStudent.zone?.replace("_", " ") || "N/A"}
                  </span>
                  <span className="text-xs text-[var(--so-text-secondary)]">{selectedStudent.batch || "No batch"}</span>
                </div>
              </div>

              <div className="relative shrink-0">
                <select
                  value={detailMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="appearance-none rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] py-2.5 pl-3.5 pr-9 text-sm font-medium text-[var(--so-text-primary)] outline-none focus:border-[#8b5cf6]"
                >
                  <option value="">All Months</option>
                  {detail?.availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--so-text-muted)]" />
              </div>
            </div>

            {!detailLoading && !detailError && detail && !detail.matched ? (
              <div className="rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] px-5 py-16 text-center text-[var(--so-text-secondary)]">
                No attendance device is mapped for this student yet, so there's no punch data to show.
              </div>
            ) : (
              <>
                {/* ── Summary tiles ── */}
                {detail && (
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Attendance", value: `${detail.summary.attendancePercentage}%`, color: attendanceColor(detail.summary.attendancePercentage) },
                      { label: "Present", value: detail.summary.presentDays, color: "text-emerald-600" },
                      { label: "Absent", value: detail.summary.absentDays, color: "text-red-600" },
                      { label: "Week Off", value: detail.summary.weekOffDays, color: "text-[var(--so-text-secondary)]" },
                    ].map((tile) => (
                      <div key={tile.label} className="rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-card)] p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">{tile.label}</p>
                        <p className={`mt-1 text-xl font-bold ${tile.color}`}>{tile.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Day-by-day table ── */}
                <div className="overflow-hidden rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)]">
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                          <th className={thClass}>Date</th>
                          <th className={thClass}>Day</th>
                          <th className={thClass}>Status</th>
                          <th className={thClass}>In</th>
                          <th className={thClass}>Out</th>
                          <th className={thClass}>Worked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--so-border)]">
                        {detailLoading && (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-[var(--so-text-secondary)]">
                              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-b-transparent" />
                              Loading attendance…
                            </td>
                          </tr>
                        )}
                        {!detailLoading && detailError && (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-red-500">
                              {detailError}
                            </td>
                          </tr>
                        )}
                        {!detailLoading && !detailError && detail && detail.records.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-[var(--so-text-secondary)]">
                              No records for this month.
                            </td>
                          </tr>
                        )}
                        {!detailLoading &&
                          !detailError &&
                          detail?.records.map((record) => (
                            <tr key={record.dateKey} className="transition hover:bg-[var(--so-bg-row-hover)]">
                              <td className="px-4 py-3 font-medium text-[var(--so-text-primary)]">
                                {formatDateLabel(record.dateKey)}
                              </td>
                              <td className="px-4 py-3 text-[var(--so-text-secondary)]">{record.dayOfWeek}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[record.status]}`}>
                                  {STATUS_LABEL[record.status]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[var(--so-text-secondary)]">{record.inTime || "—"}</td>
                              <td className="px-4 py-3 text-[var(--so-text-secondary)]">{record.outTime || "—"}</td>
                              <td className="px-4 py-3 text-[var(--so-text-secondary)]">{record.workedLabel || "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* ── Total active students ── */}
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                  Total Active Students
                </p>
                <p className="text-2xl font-bold text-[var(--so-text-primary)]">{loading ? "…" : total}</p>
              </div>
            </div>

            {/* ── Filters ── */}
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--so-text-muted)]" />
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] py-2.5 pl-10 pr-3 text-sm text-[var(--so-text-primary)] outline-none focus:border-[#8b5cf6]"
                />
              </form>

              <div className="relative shrink-0">
                <select
                  value={zoneFilter}
                  onChange={(e) => {
                    setZoneFilter(e.target.value as ZoneFilter);
                    setPage(1);
                  }}
                  className="appearance-none rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] py-2.5 pl-3.5 pr-9 text-sm font-medium text-[var(--so-text-primary)] outline-none focus:border-[#8b5cf6]"
                >
                  <option value="all">All Zones</option>
                  <option value="blue">Blue</option>
                  <option value="yellow">Yellow</option>
                  <option value="green">Green</option>
                  <option value="newly_enrolled">Newly Enrolled</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--so-text-muted)]" />
              </div>

              <div className="relative shrink-0">
                <select
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] py-2.5 pl-3.5 pr-9 text-sm font-medium text-[var(--so-text-primary)] outline-none focus:border-[#8b5cf6]"
                >
                  <option value="all">All Batches</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.batch || "Untitled batch"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--so-text-muted)]" />
              </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-hidden rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)]">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                      <th className={thClass}>Student</th>
                      <th className={thClass}>Zone</th>
                      <SortableTh column="batch">Batch</SortableTh>
                      <SortableTh column="attendancePercentage">Attendance</SortableTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--so-border)]">
                    {loading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-16 text-center text-[var(--so-text-secondary)]">
                          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-b-transparent" />
                          Loading attendance report…
                        </td>
                      </tr>
                    )}

                    {!loading && error && (
                      <tr>
                        <td colSpan={4} className="px-4 py-16 text-center text-red-500">
                          {error}
                        </td>
                      </tr>
                    )}

                    {!loading && !error && sortedRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-16 text-center text-[var(--so-text-secondary)]">
                          No active students match these filters.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !error &&
                      sortedRows.map((row) => (
                        <tr
                          key={row._id}
                          onClick={() => openStudent(row)}
                          title="View attendance table"
                          className="cursor-pointer transition hover:bg-[var(--so-bg-row-hover)]"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]/15 text-xs font-semibold text-[#8b5cf6]">
                                {(row.fullName || "S").slice(0, 1).toUpperCase()}
                              </span>
                              <p className="min-w-0 truncate font-medium text-[var(--so-text-primary)]">{row.fullName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${zoneBadge(row.zone)}`}>
                              {row.zone?.replace("_", " ") || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[var(--so-text-secondary)]">{row.batch || "—"}</td>
                          <td className={`px-4 py-3.5 font-semibold ${attendanceColor(row.attendancePercentage)}`}>
                            {row.attendanceMatched && row.attendancePercentage !== null
                              ? `${row.attendancePercentage}%`
                              : "No data"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--so-border)] px-4 py-3">
                <span className="flex items-center gap-1.5 text-xs text-[var(--so-text-muted)]">
                  <Users className="h-3.5 w-3.5" />
                  {rangeLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--so-border)] bg-[var(--so-bg-input)] text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-medium text-[var(--so-text-secondary)]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--so-border)] bg-[var(--so-bg-input)] text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
