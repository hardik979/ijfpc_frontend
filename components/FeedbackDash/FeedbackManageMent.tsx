"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import {
  MessageSquareText,
  RefreshCw,
  Search,
  Calendar,
  X,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  AlertTriangle,
  User,
  Tag,
} from "lucide-react";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

interface FeedbackItem {
  _id: string;
  name: string;
  category: string;
  files: string[];
  feedback: string;
  createdAt: string;
  updatedAt?: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CATEGORY_STYLES: Record<string, string> = {
  bug: "bg-red-50 text-red-700 border-red-200",
  suggestion: "bg-blue-50 text-blue-700 border-blue-200",
  complaint: "bg-orange-50 text-orange-700 border-orange-200",
  praise: "bg-green-50 text-green-700 border-green-200",
};

const categoryBadge = (category: string) =>
  CATEGORY_STYLES[(category || "").trim().toLowerCase()] ||
  "bg-[#FAF5EC] text-[#8B4513] border-[#E5D9C6]";

const initials = (name: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";

const cardBase =
  "rounded-[1.5rem] sm:rounded-[2rem] border border-[#E9E2D6] bg-white shadow-sm hover:shadow-md transition-all";

export default function FeedbackManageMent() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(
        `${API_LMS_URL}/api/feedback/get-qr-feedbacks?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load feedback submissions");
      }

      setFeedbacks(json.feedbacks || []);
      setMeta(json.pagination || { total: 0, page: 1, limit, totalPages: 1 });
    } catch (err: any) {
      const message = err?.message || "Failed to load feedback submissions";
      setError(message);
      toast.error(message);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, startDate, endDate]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft")
        setLightbox((prev) =>
          prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : prev
        );
      if (e.key === "ArrowRight")
        setLightbox((prev) =>
          prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : prev
        );
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    feedbacks.forEach((f) => {
      const c = f.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [feedbacks]);

  const visibleFeedbacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return feedbacks.filter((f) => {
      const matchesCategory = categoryFilter === "all" || f.category?.trim() === categoryFilter;
      const matchesSearch =
        !term ||
        f.name?.toLowerCase().includes(term) ||
        f.feedback?.toLowerCase().includes(term) ||
        f.category?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [feedbacks, search, categoryFilter]);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadCSV = () => {
    if (visibleFeedbacks.length === 0) return;
    const headers = ["Name", "Category", "Feedback", "Images", "Submitted At"];
    const rows = visibleFeedbacks.map((f) => [
      f.name,
      f.category?.trim(),
      (f.feedback || "").replace(/\n/g, " "),
      String(f.files?.length || 0),
      dayjs(f.createdAt).format("DD MMM YYYY, hh:mm A"),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR_Feedback_Page${meta.page}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const hasActiveFilters = Boolean(search || categoryFilter !== "all" || startDate || endDate);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#FCFAF6] to-[#F5F1EB] px-3 sm:px-4 lg:px-6 pb-10 sm:pb-16 pt-4">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* ═══════════════════ HEADER ═══════════════════ */}
        <div className="rounded-[2rem] border border-[#E5D9C6] bg-gradient-to-r from-white via-[#FAF5EC] to-white p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#8B4513] rounded-xl shadow-md">
                  <MessageSquareText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#8B4513] uppercase tracking-wider">
                    Feedback Dashboard
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#2D1F16] leading-tight">
                    QR Feedback Management
                  </h1>
                </div>
              </div>
              <p className="text-sm text-[#7A6753] mt-1">
                {meta.total} total submission{meta.total === 1 ? "" : "s"} collected via QR code scans
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={downloadCSV}
                disabled={visibleFeedbacks.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#8B4513] bg-white px-5 py-3 text-sm font-bold text-[#8B4513] transition hover:bg-[#8B4513] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={fetchFeedbacks}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#8B4513] bg-[#8B4513] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5D4037] disabled:cursor-not-allowed disabled:opacity-60 shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════ FILTERS ═══════════════════ */}
        <div className={`${cardBase} p-4 sm:p-5`}>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7968]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, feedback, or category..."
                className="w-full rounded-xl border border-[#E5D9C6] bg-[#FAF5EC] pl-9 pr-3 py-2.5 text-sm text-[#2D1F16] focus:outline-none focus:ring-2 focus:ring-[#8B4513]/30 focus:border-[#8B4513] transition"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#E5D9C6] bg-[#FAF5EC] px-3 py-2.5 text-sm font-medium text-[#2D1F16] focus:outline-none focus:ring-2 focus:ring-[#8B4513]/30 focus:border-[#8B4513] transition cursor-pointer capitalize"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 rounded-xl border border-[#E5D9C6] bg-[#FAF5EC] px-3 py-2">
              <Calendar className="w-4 h-4 text-[#8A7968] shrink-0" />
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-sm font-medium text-[#2D1F16] focus:outline-none cursor-pointer"
              />
              <span className="text-[#A1887F] text-sm">to</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-sm font-medium text-[#2D1F16] focus:outline-none cursor-pointer"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B4513] hover:underline px-2 whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════ ERROR ═══════════════════ */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={fetchFeedbacks}
              className="text-sm font-semibold text-red-700 hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══════════════════ LOADING SKELETONS ═══════════════════ */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
              <div key={i} className={`${cardBase} p-5 animate-pulse`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF5EC]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-[#FAF5EC] rounded" />
                    <div className="h-2.5 w-16 bg-[#FAF5EC] rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 w-full bg-[#FAF5EC] rounded" />
                  <div className="h-2.5 w-4/5 bg-[#FAF5EC] rounded" />
                  <div className="h-2.5 w-3/5 bg-[#FAF5EC] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════ EMPTY STATE ═══════════════════ */}
        {!loading && !error && visibleFeedbacks.length === 0 && (
          <div className={`${cardBase} p-12 flex flex-col items-center justify-center text-center gap-3`}>
            <div className="p-4 bg-[#FAF5EC] rounded-full">
              <Inbox className="w-8 h-8 text-[#8B4513]" />
            </div>
            <p className="font-semibold text-[#2D1F16]">No feedback found</p>
            <p className="text-sm text-[#7A6753] max-w-sm">
              {feedbacks.length === 0
                ? "No QR feedback submissions exist for the selected date range yet."
                : "No submissions match your current search or filters."}
            </p>
          </div>
        )}

        {/* ═══════════════════ FEEDBACK GRID ═══════════════════ */}
        {!loading && !error && visibleFeedbacks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {visibleFeedbacks.map((f) => {
              const isLong = (f.feedback || "").length > 180;
              const isExpanded = expanded.has(f._id);
              const visibleImages = f.files?.slice(0, 4) || [];
              const extraCount = (f.files?.length || 0) - visibleImages.length;

              return (
                <div key={f._id} className={`${cardBase} p-5 flex flex-col gap-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5EEDC] font-bold text-[#8B4513]">
                        {initials(f.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#2D1F16] truncate flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#A1887F] shrink-0" />
                          {f.name || "Anonymous"}
                        </p>
                        <p className="text-xs text-[#8A7968] mt-0.5">
                          {dayjs(f.createdAt).format("DD MMM YYYY, hh:mm A")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize shrink-0 ${categoryBadge(
                        f.category
                      )}`}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {f.category?.trim() || "general"}
                    </span>
                  </div>

                  <p
                    className={`text-sm text-[#3E2723] leading-relaxed whitespace-pre-wrap ${
                      !isExpanded && isLong ? "line-clamp-4" : ""
                    }`}
                  >
                    {f.feedback}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => toggleExpanded(f._id)}
                      className="-mt-2 self-start text-xs font-semibold text-[#8B4513] hover:underline"
                    >
                      {isExpanded ? "Show less" : "Read more"}
                    </button>
                  )}

                  {f.files && f.files.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {visibleImages.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightbox({ images: f.files, index: idx })}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#E5D9C6] shadow-sm hover:opacity-80 transition"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === visibleImages.length - 1 && extraCount > 0 && (
                            <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                              +{extraCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[#A1887F]">
                      <ImageOff className="w-3.5 h-3.5" />
                      No attachments
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════ PAGINATION ═══════════════════ */}
        {!loading && meta.totalPages > 0 && (
          <div className={`${cardBase} px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3`}>
            <p className="text-sm text-[#7A6753]">
              Showing <span className="font-semibold text-[#2D1F16]">{from}</span>–
              <span className="font-semibold text-[#2D1F16]">{to}</span> of{" "}
              <span className="font-semibold text-[#2D1F16]">{meta.total}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E5D9C6] bg-white px-3 py-2 text-sm font-semibold text-[#5D4037] hover:border-[#8B4513] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-sm font-semibold text-[#2D1F16] px-2">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E5D9C6] bg-white px-3 py-2 text-sm font-semibold text-[#5D4037] hover:border-[#8B4513] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-[#E5D9C6] bg-white px-3 py-2 text-sm font-semibold text-[#5D4037] focus:outline-none cursor-pointer"
            >
              <option value={6}>6 / page</option>
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        )}
      </div>

      {/* ═══════════════════ IMAGE LIGHTBOX ═══════════════════ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-6 h-6" />
          </button>

          {lightbox.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((prev) =>
                  prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : prev
                );
              }}
              className="absolute left-4 sm:left-8 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.images[lightbox.index]}
            alt={`Attachment ${lightbox.index + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />

          {lightbox.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((prev) =>
                  prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : prev
                );
              }}
              className="absolute right-4 sm:right-8 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {lightbox.images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
