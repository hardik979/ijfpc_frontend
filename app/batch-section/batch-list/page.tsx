"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  FilePenLine,
  Trash2,
  Calendar,
  User,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_LMS_URL } from "@/lib/api";

type BatchStatus = "Upcoming" | "Active" | "Completed" | string;
type CourseFilter = "All" | "SQL" | "Linux" | "Monitoring";
type StatusFilter = "All" | "Upcoming" | "Active" | "Completed";

type Batch = {
  _id: string;
  course: string;
  mode: string;
  trainerName: string;
  startDate?: string;
  endDate?: string;
  status: BatchStatus;
  code?: string;
  batch?: string;
};

type BatchesResponse = {
  message?: string;
  data?: Batch[];
  total?: number;
  pagination?: {
    totalCount?: number;
    total?: number;
    count?: number;
  };
};

function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

function formatDateTime(dt?: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

function statusPill(status?: string) {
  const s = (status || "").toLowerCase();

  // Default
  let cls =
    "bg-slate-500/15 text-slate-200 border-slate-500/25 ring-slate-500/10";

  if (s.includes("active")) {
    cls =
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25 ring-emerald-500/10";
  } else if (s.includes("completed")) {
    cls =
      "bg-blue-500/15 text-blue-300 border-blue-500/25 ring-blue-500/10";
  } else if (s.includes("upcoming")) {
    cls =
      "bg-amber-500/15 text-amber-300 border-amber-500/25 ring-amber-500/10";
  }

  return `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ring-1 text-sm font-semibold ${cls}`;
}

export default function BatchListPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error" | "";
    message: string;
  }>({ show: false, type: "", message: "" });

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCourse, setFilterCourse] = useState<CourseFilter>("All");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("All");

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const router = useRouter();

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  const stats = useMemo(() => {
    const active = batches.filter((b) => String(b.status).toLowerCase() === "active").length;
    const completed = batches.filter((b) => String(b.status).toLowerCase() === "completed").length;
    const upcoming = batches.filter((b) => String(b.status).toLowerCase() === "upcoming").length;
    return { active, completed, upcoming };
  }, [batches]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    window.setTimeout(() => setNotification({ show: false, type: "", message: "" }), 2800);
  };

  async function fetchBatches() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (filterCourse !== "All") params.set("course", filterCourse);
      if (filterStatus !== "All") params.set("status", filterStatus);

      const res = await fetch(
        `${API_LMS_URL}/api/batches/get-batches?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json: BatchesResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load batches");

      setBatches(json.data ?? []);
      setTotal(json?.pagination?.totalCount ?? 0);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load batches"));
      setBatches([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filterCourse, filterStatus]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      fetchBatches();
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  async function handleDelete(batchId: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_LMS_URL}/api/batches/delete-batch?batchId=${encodeURIComponent(batchId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json: { message?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Delete failed");

      await fetchBatches();
      showNotification("success", "Batch deleted successfully!");
    } catch (err) {
      showNotification("error", getErrorMessage(err, "Delete failed"));
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  }

  const handleAddNewBatch = () => router.push("/batch-section/batch-creation");

  const handleEdit = (id: string) => {
    router.push(`/batch-section/batch-creation?batchId=${id}`);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f1420] to-[#1a1f2e] p-4 sm:p-8">
      {/* Toast */}
      {notification.show && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-slide-in ${
            notification.type === "success"
              ? "bg-emerald-500/90 border-emerald-400/50 text-white"
              : "bg-red-500/90 border-red-400/50 text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-8 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-16 right-8 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Batch Management
              </h1>
            </div>
            <p className="text-gray-400 pl-[60px]">
              Manage all training batches and their details
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Link
              href="/batch-section/student-list"
              className="inline-flex items-center justify-center gap-2 px-6 py-3
                bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700
                text-white font-semibold rounded-xl transition-all duration-200
                shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30
                hover:-translate-y-0.5 active:scale-[0.99]
                border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            >
              <Plus className="w-5 h-5" />
              Assign Batch
            </Link>

            <button
              onClick={handleAddNewBatch}
              className="inline-flex items-center justify-center gap-2 px-6 py-3
                bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700
                text-white font-semibold rounded-xl transition-all duration-200
                shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40
                hover:-translate-y-0.5 active:scale-[0.99]
                border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              <Plus className="w-5 h-5" />
              Create New Batch
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 text-red-300" />
              <div>
                <p className="font-semibold">Failed to load batches</p>
                <p className="text-sm text-red-200/90 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Batches</p>
                <p className="text-3xl font-extrabold text-white">{total}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active (on this page)</p>
                <p className="text-3xl font-extrabold text-emerald-400">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Completed (on this page)</p>
                <p className="text-3xl font-extrabold text-blue-400">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Per Page</p>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  className="mt-1 text-2xl font-extrabold bg-transparent text-white border-none outline-none cursor-pointer"
                >
                  <option value={5} className="bg-[#1a1f2e]">5</option>
                  <option value={10} className="bg-[#1a1f2e]">10</option>
                  <option value={20} className="bg-[#1a1f2e]">20</option>
                  <option value={50} className="bg-[#1a1f2e]">50</option>
                </select>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search / Filters */}
        <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Search Batches
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by trainer, course, mode..."
                className="w-full px-4 py-3 bg-[#0f1420] border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500
                  focus:outline-none focus:border-purple-500 transition-all duration-200 group-hover:border-gray-600"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <BookOpen className="w-4 h-4 inline mr-2" />
                Filter by Course
              </label>
              <select
                value={filterCourse}
                onChange={(e) => {
                  setPage(1);
                  setFilterCourse(e.target.value as CourseFilter);
                }}
                className="w-full px-4 py-3 bg-[#0f1420] border-2 border-gray-700/50 rounded-xl text-white
                  focus:outline-none focus:border-purple-500 transition-all duration-200 cursor-pointer group-hover:border-gray-600"
              >
                <option value="All" className="bg-[#1a1f2e]">All Courses</option>
                <option value="SQL" className="bg-[#1a1f2e]">SQL</option>
                <option value="Linux" className="bg-[#1a1f2e]">Linux</option>
                <option value="Monitoring" className="bg-[#1a1f2e]">Monitoring</option>
              </select>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setPage(1);
                  setFilterStatus(e.target.value as StatusFilter);
                }}
                className="w-full px-4 py-3 bg-[#0f1420] border-2 border-gray-700/50 rounded-xl text-white
                  focus:outline-none focus:border-purple-500 transition-all duration-200 cursor-pointer group-hover:border-gray-600"
              >
                <option value="All" className="bg-[#1a1f2e]">All Statuses</option>
                <option value="Upcoming" className="bg-[#1a1f2e]">Upcoming</option>
                <option value="Active" className="bg-[#1a1f2e]">Active</option>
                <option value="Completed" className="bg-[#1a1f2e]">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="bg-[#262d3f]/60 border-b border-gray-700/50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Course Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Trainer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <span className="text-gray-400 font-medium">Loading batches...</span>
                      </div>
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="max-w-md mx-auto">
                        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-200 font-semibold">No batches found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Try adjusting search/filters or create a new batch.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  batches.map((batch) => (
                    <tr
                      key={batch._id}
                      className="hover:bg-[#262d3f]/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-white/5">
                            <BookOpen className="w-5 h-5 text-purple-300" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{batch.course}</div>
                            {batch.code && (
                              <div className="text-xs text-gray-400 mt-0.5">{batch.code}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-sky-500/15 text-sky-200 text-sm font-semibold rounded-lg border border-sky-500/25">
                          {batch.batch || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-indigo-500/15 text-indigo-200 text-sm font-semibold rounded-lg border border-indigo-500/25">
                          {batch.mode || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-200">{batch.trainerName || "-"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{formatDateTime(batch.startDate)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{formatDateTime(batch.endDate)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={statusPill(String(batch.status))}>
                          {String(batch.status || "-")}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteId(batch._id);
                              setShowDeleteModal(true);
                            }}
                            className="p-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-xl
                              border border-red-500/25 hover:border-red-500/40 transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-red-400/30"
                            aria-label="Delete batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(batch._id)}
                            className="p-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl
                              border border-emerald-500/25 hover:border-emerald-500/40 transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                            aria-label="Edit batch"
                          >
                            <FilePenLine className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-[#262d3f]/30 border-t border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-400">
              Showing <span className="font-semibold text-white">{batches.length}</span> of{" "}
              <span className="font-semibold text-white">{total}</span> batches
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f1420] border border-gray-700/50 text-gray-300 rounded-lg
                  hover:bg-[#151b2b] hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="px-4 py-2 bg-purple-500/15 border border-purple-500/25 text-purple-200 rounded-lg font-semibold">
                Page {page} of {totalPages}
              </div>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f1420] border border-gray-700/50 text-gray-300 rounded-lg
                  hover:bg-[#151b2b] hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1e2538] to-[#151b2b] rounded-2xl border border-gray-700/50 shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Delete Batch</h3>
            <p className="text-gray-400 text-center mb-6">
              This action cannot be undone. Are you sure you want to delete this batch?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteId(null);
                }}
                className="flex-1 px-4 py-3 bg-[#262d3f] hover:bg-[#2d3547] text-gray-200 font-semibold rounded-xl
                  border border-gray-700/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteId) handleDelete(deleteId);
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800
                  text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-red-500/30"
              >
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(12px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out; }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
      `}</style>
    </div>
  );
}
