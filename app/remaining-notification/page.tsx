"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import {
  Bell,
  Check,
  Clock,
  CalendarDays,
  TriangleAlert,
  RefreshCw,
  Filter,
  Search,
  Eye,
  EyeOff,
  Inbox,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Sparkles,
  Zap,
  TrendingUp,
  Settings,
  Users,
} from "lucide-react";

type NotifType = "OVERDUE" | "DUE_DAY" | "FIVE_DAY";
type Row = {
  studentId: string;
  type: NotifType;
  title: string;
  message: string;
  dueDate: string;
  remainingFee: number;
  courseName: string;
  urgencyRank: number;
  seen: boolean;
  seenAt: string | null;
  daysUntilDue: number;
};

type NotificationsResponse = {
  anchorDate: string;
  timezone: string;
  daysBefore: number;
  counts: { dueToday: number; dueInN: number; overdue: number };
  page: number;
  limit: number;
  total: number;
  rows: Row[];
};

const TZ_LABEL = "Asia/Kolkata";

// Format helpers
function formatINR(n: number) {
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const typeIcon: Record<NotifType, JSX.Element> = {
  OVERDUE: <TriangleAlert className="h-4 w-4" />,
  DUE_DAY: <CalendarDays className="h-4 w-4" />,
  FIVE_DAY: <Clock className="h-4 w-4" />,
};

const typeLabel: Record<NotifType, string> = {
  OVERDUE: "Overdue",
  DUE_DAY: "Due Today",
  FIVE_DAY: "Due in N",
};

const typeBadgeClasses: Record<NotifType, string> = {
  OVERDUE:
    "bg-gradient-to-r from-red-50 to-pink-50 text-red-600 border border-red-100 shadow-sm",
  DUE_DAY:
    "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-100 shadow-sm",
  FIVE_DAY:
    "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-100 shadow-sm",
};

export default function NotificationsPage() {
  // Server params
  const [daysBefore, setDaysBefore] = useState<number>(5);
  const [tz] = useState<string>(TZ_LABEL);
  const [typeFilter, setTypeFilter] = useState<"ALL" | NotifType>("ALL");
  const [q, setQ] = useState<string>("");

  // Paging
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<NotificationsResponse | null>(null);

  // Selection for bulk mark-seen
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setErr(null);

      const params = new URLSearchParams({
        daysBefore: String(daysBefore),
        tz,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(
        `${API_BASE_URL}/api/preplacement/notifications?${params.toString()}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const json: NotificationsResponse = await res.json();

      setData(json);
      setSelectedIds({});
    } catch (e: any) {
      setErr(`Failed to load: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, daysBefore, tz]);

  // Filter rows on client
  const { unseen, seen } = useMemo(() => {
    const rows = data?.rows ?? [];
    let filtered = rows;

    if (typeFilter !== "ALL") {
      filtered = filtered.filter((r) => r.type === typeFilter);
    }
    if (q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filtered = filtered.filter(
        (r) => rx.test(r.title) || rx.test(r.courseName)
      );
    }

    return {
      unseen: filtered.filter((r) => !r.seen),
      seen: filtered.filter((r) => r.seen),
    };
  }, [data, typeFilter, q]);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1),
    [data]
  );

  // Mark seen with optimistic updates
  const markSeen = async (row: Row) => {
    try {
      setData((prev) => {
        if (!prev) return prev;
        const nextRows = prev.rows.map((r) =>
          r.studentId === row.studentId && r.type === row.type
            ? { ...r, seen: true, seenAt: new Date().toISOString() }
            : r
        );
        return { ...prev, rows: nextRows };
      });

      const res = await fetch(
        `${API_BASE_URL}/api/preplacement/notifications/${row.studentId}/seen`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: row.type }),
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
    } catch (e: any) {
      setData((prev) => {
        if (!prev) return prev;
        const nextRows = prev.rows.map((r) =>
          r.studentId === row.studentId && r.type === row.type
            ? { ...r, seen: false, seenAt: null }
            : r
        );
        return { ...prev, rows: nextRows };
      });
      alert(`Failed to mark seen: ${e?.message || e}`);
    }
  };

  const toggleSelect = (row: Row) => {
    setSelectedIds((s) => ({
      ...s,
      [row.studentId + "|" + row.type]: !s[row.studentId + "|" + row.type],
    }));
  };

  const allUnseenSelected = useMemo(() => {
    const keys = unseen.map((r) => r.studentId + "|" + r.type);
    return keys.length > 0 && keys.every((k) => selectedIds[k]);
  }, [unseen, selectedIds]);

  const toggleSelectAllUnseen = () => {
    if (allUnseenSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      unseen.forEach((r) => (next[r.studentId + "|" + r.type] = true));
      setSelectedIds(next);
    }
  };

  const bulkMarkSeen = async () => {
    const targets = unseen.filter(
      (r) => selectedIds[r.studentId + "|" + r.type]
    );
    if (!targets.length) return;

    setData((prev) => {
      if (!prev) return prev;
      const nextRows = prev.rows.map((r) => {
        const key = r.studentId + "|" + r.type;
        return selectedIds[key]
          ? { ...r, seen: true, seenAt: new Date().toISOString() }
          : r;
      });
      return { ...prev, rows: nextRows };
    });
    setSelectedIds({});

    try {
      for (const t of targets) {
        await fetch(
          `${API_BASE_URL}/preplacement/notifications/${t.studentId}/seen`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ type: t.type }),
          }
        ).then((r) => {
          if (!r.ok) throw new Error(`${r.status}`);
        });
      }
    } catch (e: any) {
      alert(`Some items failed to mark seen. Reloading…`);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                  Finance Notifications
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Live · {data?.timezone || TZ_LABEL}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>Inbox Style</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="group relative overflow-hidden px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw
                    className={`h-4 w-4 transition-transform duration-500 ${
                      loading ? "animate-spin" : "group-hover:rotate-180"
                    }`}
                  />
                  <span className="font-medium">Refresh</span>
                </div>
              </button>
              <button className="p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={<TriangleAlert className="h-5 w-5" />}
              label="Overdue"
              value={data?.counts.overdue ?? 0}
              gradient="from-red-500 to-pink-500"
              bgGradient="from-red-50 to-pink-50"
              iconBg="from-red-500/10 to-pink-500/10"
              textColor="text-red-700"
            />
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Due Today"
              value={data?.counts.dueToday ?? 0}
              gradient="from-amber-500 to-orange-500"
              bgGradient="from-amber-50 to-orange-50"
              iconBg="from-amber-500/10 to-orange-500/10"
              textColor="text-amber-700"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label={`Due in ${daysBefore} days`}
              value={data?.counts.dueInN ?? 0}
              gradient="from-purple-500 to-indigo-500"
              bgGradient="from-purple-50 to-indigo-50"
              iconBg="from-purple-500/10 to-indigo-500/10"
              textColor="text-purple-700"
            />
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Search */}
            <div className="lg:col-span-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search students or courses..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-300 shadow-lg hover:shadow-xl"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="lg:col-span-3">
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-300 shadow-lg hover:shadow-xl appearance-none cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="DUE_DAY">Due Today</option>
                  <option value="FIVE_DAY">Due in N</option>
                </select>
              </div>
            </div>

            {/* Days Before */}
            <div className="lg:col-span-3">
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <div className="flex items-center pl-11 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl">
                  <span className="text-sm font-medium text-gray-600 mr-2">
                    Days:
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={daysBefore}
                    onChange={(e) =>
                      setDaysBefore(Math.max(0, Number(e.target.value || 0)))
                    }
                    className="w-16 bg-transparent outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAllUnseen}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                  title={
                    allUnseenSelected ? "Unselect all" : "Select all unseen"
                  }
                >
                  {allUnseenSelected ? (
                    <CheckSquare className="h-4 w-4 text-purple-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={bulkMarkSeen}
                  disabled={!Object.values(selectedIds).some(Boolean)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Check className="h-4 w-4" />
                  <span className="font-medium">Mark Seen</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Lists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Unseen Notifications */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700">
                <EyeOff className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Unseen</h2>
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-sm font-semibold">
                {unseen.length}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <EmptyState loading />
              ) : err ? (
                <ErrorState message={err} />
              ) : unseen.length ? (
                unseen.map((r) => (
                  <NotificationRow
                    key={r.studentId + "|" + r.type}
                    row={r}
                    selectable
                    selected={!!selectedIds[r.studentId + "|" + r.type]}
                    onToggleSelect={() => toggleSelect(r)}
                    onMarkSeen={() => markSeen(r)}
                  />
                ))
              ) : (
                <EmptyState
                  message="All caught up! No unseen notifications."
                  icon={<Sparkles className="h-8 w-8" />}
                />
              )}
            </div>
          </section>

          {/* Seen Notifications */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 text-green-700">
                <Eye className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Seen</h2>
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-semibold">
                {seen.length}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <EmptyState loading />
              ) : err ? (
                <ErrorState message={err} />
              ) : seen.length ? (
                seen.map((r) => (
                  <NotificationRow key={r.studentId + "|" + r.type} row={r} />
                ))
              ) : (
                <EmptyState
                  message="No seen notifications yet."
                  icon={<Eye className="h-8 w-8" />}
                />
              )}
            </div>
          </section>
        </div>

        {/* Enhanced Pagination */}
        <div className="mt-12 flex items-center justify-between">
          <div className="text-sm text-gray-600 font-medium">
            {data ? (
              <span>
                Page{" "}
                <span className="font-bold text-purple-600">{data.page}</span>{" "}
                of{" "}
                <span className="font-bold text-purple-600">{totalPages}</span>{" "}
                · Total{" "}
                <span className="font-bold text-purple-600">{data.total}</span>{" "}
                notifications
              </span>
            ) : (
              "-"
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data || page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="font-medium">Previous</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!data || page >= totalPages}
            >
              <span className="font-medium">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/30 text-sm text-gray-600">
            <Inbox className="h-4 w-4" />
            <span>Real-time notifications with optimistic updates</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  row,
  selectable = false,
  selected = false,
  onToggleSelect,
  onMarkSeen,
}: {
  row: Row;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onMarkSeen?: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl ${
        !row.seen ? "ring-2 ring-purple-100" : ""
      }`}
    >
      {!row.seen && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${
              typeBadgeClasses[row.type]
            }`}
          >
            <span className="flex items-center gap-2">
              {typeIcon[row.type]}
              {typeLabel[row.type]}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {row.title}
              </h3>
              {!row.seen && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold">New</span>
                </div>
              )}
            </div>

            <p className="text-gray-600 mb-3 leading-relaxed">{row.message}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <CalendarDays className="h-4 w-4" />
                <span>
                  Due:{" "}
                  <span className="font-semibold text-gray-700">
                    {formatDate(row.dueDate)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>
                  Amount:{" "}
                  <span className="font-semibold text-gray-700">
                    {formatINR(row.remainingFee || 0)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 col-span-1 sm:col-span-2">
                <span>
                  Course:{" "}
                  <span className="font-semibold text-gray-700">
                    {row.courseName || "-"}
                  </span>
                </span>
              </div>
              {typeof row.daysUntilDue === "number" && (
                <div className="col-span-1 sm:col-span-2">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      row.daysUntilDue < 0
                        ? "bg-red-100 text-red-700"
                        : row.daysUntilDue === 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {row.daysUntilDue < 0
                      ? `Overdue by ${Math.abs(row.daysUntilDue)} day${
                          Math.abs(row.daysUntilDue) === 1 ? "" : "s"
                        }`
                      : row.daysUntilDue === 0
                      ? "Due today"
                      : `Due in ${row.daysUntilDue} day${
                          row.daysUntilDue === 1 ? "" : "s"
                        }`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectable && (
              <button
                onClick={onToggleSelect}
                className={`p-3 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                  selected
                    ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-600"
                    : "bg-white/80 border-gray-200 hover:bg-white text-gray-500 hover:text-purple-600"
                }`}
              >
                {selected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            )}

            {!row.seen && onMarkSeen ? (
              <button
                onClick={onMarkSeen}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              >
                <Check className="h-4 w-4" />
                Mark Seen
              </button>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                ✓ Seen
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  gradient,
  bgGradient,
  iconBg,
  textColor,
}: {
  icon: JSX.Element;
  label: string;
  value: number | string;
  gradient: string;
  bgGradient: string;
  iconBg: string;
  textColor: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} border border-white/50 p-6 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-r ${iconBg} backdrop-blur-sm border border-white/30`}
          >
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600 mb-1">
              {label}
            </div>
            <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
          </div>
        </div>
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-r ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
        ></div>
      </div>
    </div>
  );
}

function EmptyState({
  loading = false,
  message = "Nothing here.",
  icon,
}: {
  loading?: boolean;
  message?: string;
  icon?: JSX.Element;
}) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/50 p-12 text-center shadow-lg">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
          </div>
          <div className="text-gray-600 font-medium">
            Loading notifications...
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-600">
            {icon || <Inbox className="h-8 w-8" />}
          </div>
          <div className="text-gray-600 font-medium">{message}</div>
        </div>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 p-8 text-center shadow-lg">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-100 to-pink-100 text-red-600">
          <TriangleAlert className="h-8 w-8" />
        </div>
        <div className="text-red-700 font-medium">{message}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
