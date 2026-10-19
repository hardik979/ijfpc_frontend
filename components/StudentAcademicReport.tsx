"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Reply,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { API_LMS_URL } from "@/lib/api";
import { encodeStudentRef } from "@/lib/studentRef";
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
  overallScore: number | null;
  level: "strong" | "developing" | "at-risk" | "no-data";
  attendancePercentage: number | null;
  dailyQuizScore: number | null;
  megaTestScore: number | null;
  mockInterviewScore: number | null;
  aiHrCallScore: number | null;
};

type BatchOption = { _id: string; batch?: string };

type SortKey =
  | "fullName"
  | "zone"
  | "batch"
  | "overallScore"
  | "attendancePercentage"
  | "dailyQuizScore"
  | "megaTestScore"
  | "mockInterviewScore"
  | "aiHrCallScore";

type SortDir = "asc" | "desc";

const zoneBadge = (zone?: string | null) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-700 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  if (z === "newly_enrolled") return "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30";
  return "bg-gray-500/15 text-gray-700 ring-1 ring-gray-500/30";
};

const levelBadge = (level: ReportRow["level"]) => {
  if (level === "strong") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  if (level === "developing") return "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30";
  if (level === "at-risk") return "bg-red-500/15 text-red-700 ring-1 ring-red-500/30";
  return "bg-gray-500/15 text-gray-700 ring-1 ring-gray-500/30";
};

const scoreLabel = (value: number | null) => (value === null || value === undefined ? "—" : `${value}%`);

const scoreColor = (value: number | null) => {
  if (value === null || value === undefined) return "text-[var(--so-text-muted)]";
  if (value >= 75) return "text-emerald-600";
  if (value >= 45) return "text-amber-600";
  return "text-red-600";
};

const LIMIT = 20;

export default function StudentAcademicReport() {
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

  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
        `${API_LMS_URL}/api/admin/students-academic-report?${params.toString()}`,
        {
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok || json?.status !== "success") {
        throw new Error(json?.message || "Failed to load academic report");
      }
      setRows(json.data.students || []);
      setTotal(json.data.total ?? 0);
      setTotalPages(json.data.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || "Failed to load academic report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, zoneFilter, batchFilter, appliedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchDraft);
  };

  const handleView = (clerkId: string) => {
    router.push(`/student-full-info?ref=${encodeStudentRef(clerkId)}`);
  };

  const rangeLabel = useMemo(() => {
    if (!total) return "0 students";
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

  const SortableTh = ({
    column,
    children,
    align,
  }: {
    column: SortKey;
    children: React.ReactNode;
    align?: "right";
  }) => (
    <th className={`${thClass} ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className={`inline-flex items-center gap-1 transition hover:text-[var(--so-text-primary)] ${align === "right" ? "flex-row-reverse" : ""
          }`}
      >
        {children}
        <SortIcon column={column} />
      </button>
    </th>
  );

  return (
    <div className="min-h-screen bg-[var(--so-bg-page)] p-6 text-[var(--so-text-primary)]">
      <div className="mx-auto max-w-7xl">
        {/* ── Header bar ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-4">
          <Link
            href="/studentOverview"
            aria-label="Back to Students Overview"
            title="Back to Students Overview"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)]"
          >
            <Reply className="h-4 w-4" />
          </Link>

          <div className="h-6 w-px shrink-0 bg-[var(--so-border)]" />

          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap className="hidden h-5 w-5 shrink-0 text-[#8b5cf6] md:block" />
            <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-[var(--so-text-primary)] sm:text-2xl">
              Academic Report
            </h1>
            <span className="hidden truncate text-xs text-[var(--so-text-secondary)] md:inline">
              {loading ? "· Loading…" : `· ${rangeLabel}`}
            </span>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={fetchReport}
              aria-label="Refresh"
              title="Refresh"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                  <th className={thClass}>Student</th>
                  <th className={thClass}>Zone</th>
                  <SortableTh column="batch">Batch</SortableTh>
                  <SortableTh column="overallScore">Overall</SortableTh>
                  <SortableTh column="attendancePercentage">Attendance</SortableTh>
                  <SortableTh column="dailyQuizScore">Daily Quiz</SortableTh>
                  <SortableTh column="megaTestScore">Mega Test</SortableTh>
                  <SortableTh column="mockInterviewScore">AI Mock In.</SortableTh>
                  <SortableTh column="aiHrCallScore">AI HR Call</SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--so-border)]">
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-[var(--so-text-secondary)]">
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-b-transparent" />
                      Loading academic report…
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-[var(--so-text-secondary)]">
                      No active students match these filters.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  sortedRows.map((row) => (
                    <tr
                      key={row._id}
                      onClick={() => handleView(row.clerkId)}
                      title="View full student info"
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
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${levelBadge(row.level)}`}>
                          {scoreLabel(row.overallScore)}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 font-medium ${scoreColor(row.attendancePercentage)}`}>
                        {scoreLabel(row.attendancePercentage)}
                      </td>
                      <td className={`px-4 py-3.5 font-medium ${scoreColor(row.dailyQuizScore)}`}>
                        {scoreLabel(row.dailyQuizScore)}
                      </td>
                      <td className={`px-4 py-3.5 font-medium ${scoreColor(row.megaTestScore)}`}>
                        {scoreLabel(row.megaTestScore)}
                      </td>
                      <td className={`px-4 py-3.5 font-medium ${scoreColor(row.mockInterviewScore)}`}>
                        {scoreLabel(row.mockInterviewScore)}
                      </td>
                      <td className={`px-4 py-3.5 font-medium ${scoreColor(row.aiHrCallScore)}`}>
                        {scoreLabel(row.aiHrCallScore)}
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
      </div>
    </div>
  );
}
