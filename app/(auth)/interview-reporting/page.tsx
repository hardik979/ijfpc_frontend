"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Building2,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

import { API_HR_URL } from "@/lib/api";
type DashboardTotals = {
  scheduledInRange: number;
  completedInRange: number;
  cancelledInRange: number;
  feedbackPendingInRange: number;
  calendarFailedInRange: number;
};

type PendingInterview = {
  _id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentBatch?: string;
  studentZone?: any;
  companyName: string;
  scheduledAt: string;
  timezone: string;
  contactValue: string;
  channel: "phone" | "email";
  calendarEventId?: string;
  calendarEventLink?: string;
  calendarSyncStatus?: "synced" | "failed" | "pending" | string;
};

type DashboardResponse = {
  ok: boolean;
  from: string;
  to: string;
  totals: DashboardTotals;
  byDay: {
    date: string;
    scheduled: number;
    completed: number;
    feedbackPending: number;
  }[];
  byCompany: {
    companyName: string;
    scheduled: number;
    completed: number;
    feedbackPending: number;
  }[];
  pendingFeedback: PendingInterview[];
  calendarFailures: any[];
};

function isoDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toISOStartOfDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toISOString();
}

function toISOEndOfDay(dateStr: string) {
  const d = new Date(dateStr + "T23:59:59");
  return d.toISOString();
}

export default function StaffInterviewsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return isoDateInputValue(d);
  }, []);
  const defaultTo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return isoDateInputValue(d);
  }, []);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
    try {
      const from = toISOStartOfDay(fromDate);
      const to = toISOEndOfDay(toDate);

      const url = `${API_HR_URL}/api/staff/interviews/dashboard?from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}`;

      const res = await fetch(url);
      const json = (await res.json()) as DashboardResponse;

      if (!res.ok || !json.ok) {
        throw new Error((json as any)?.error || "Failed to load dashboard");
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const totals = data?.totals;

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case "synced":
        return "text-green-400 bg-green-400/20 border-green-400/30";
      case "failed":
        return "text-red-400 bg-red-400/20 border-red-400/30";
      case "pending":
        return "text-yellow-400 bg-yellow-400/20 border-yellow-400/30";
      default:
        return "text-slate-400 bg-slate-400/20 border-slate-400/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Interview Dashboard
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Track upcoming interviews and collect feedback
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    From Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    To Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={fetchDashboard}
                  disabled={loading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Refresh
                </button>

                <a
                  href="/fee-dashboard/interview-reporting/students"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-blue-100 transition-all duration-200 border border-slate-700/50 hover:border-slate-600"
                >
                  <Users className="w-4 h-4" />
                  Students
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">
                Error Loading Dashboard
              </p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Scheduled"
            value={totals?.scheduledInRange ?? (loading ? "..." : 0)}
            subtitle="In selected range"
            icon={<Calendar className="w-6 h-6" />}
            color="blue"
            loading={loading}
          />
          <KpiCard
            title="Completed"
            value={totals?.completedInRange ?? (loading ? "..." : 0)}
            subtitle="Feedback added"
            icon={<CheckCircle2 className="w-6 h-6" />}
            color="green"
            loading={loading}
          />
          <KpiCard
            title="Feedback Pending"
            value={totals?.feedbackPendingInRange ?? (loading ? "..." : 0)}
            subtitle="Needs staff review"
            icon={<Clock className="w-6 h-6" />}
            color="yellow"
            loading={loading}
          />
          <KpiCard
            title="Calendar Failed"
            value={totals?.calendarFailedInRange ?? (loading ? "..." : 0)}
            subtitle="Sync requires attention"
            icon={<AlertCircle className="w-6 h-6" />}
            color="red"
            loading={loading}
          />
        </div>

        {/* Pending Feedback Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Feedback Pending
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Earliest scheduled interviews first (max 50)
                </p>
              </div>
              <div className="text-sm text-slate-400">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {data?.pendingFeedback?.length || 0} items
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Calendar
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-slate-400">Loading interviews...</p>
                      </div>
                    </td>
                  </tr>
                ) : (data?.pendingFeedback?.length || 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-medium">
                            All caught up!
                          </p>
                          <p className="text-slate-500 text-sm mt-1">
                            No pending feedback in this range
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data!.pendingFeedback.map((it) => (
                    <tr
                      key={it._id}
                      className="hover:bg-slate-700/30 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {it.studentName || "—"}
                            </div>
                            <div className="text-sm text-blue-300">
                              {it.studentEmail || "—"}
                            </div>
                            {it.studentBatch && (
                              <div className="text-xs text-slate-500 mt-1">
                                Batch: {it.studentBatch}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-white font-medium">
                            {it.companyName || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {new Date(it.scheduledAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(it.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {it.timezone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white">
                          {it.channel === "phone" ? (
                            <Phone className="w-4 h-4 text-green-400" />
                          ) : (
                            <Mail className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="font-medium">{it.contactValue}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 capitalize">
                          {it.channel}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSyncStatusColor(
                            it.calendarSyncStatus
                          )}`}
                        >
                          {it.calendarSyncStatus || "Unknown"}
                        </span>
                        {it.calendarEventId && (
                          <div className="text-xs text-slate-500 mt-2 font-mono">
                            {it.calendarEventId.substring(0, 12)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/fee-dashboard/interview-reporting/students/${encodeURIComponent(
                            it.studentId
                          )}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "yellow" | "red";
  loading: boolean;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    green: "from-green-500 to-green-600 shadow-green-500/30",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-500/30",
    red: "from-red-500 to-red-600 shadow-red-500/30",
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}
        >
          <div className="text-white">{icon}</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-400">{title}</div>
        <div className="text-3xl font-bold text-white">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          ) : (
            value
          )}
        </div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}
