"use client";

import React, { useMemo } from "react";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export default function Pagination({ currentPage, totalPages, limit, onPageChange, onLimitChange }: PaginationProps) {
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      return pages;
    }

    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
      <div className="text-sm text-slate-300">
        Page <span className="font-semibold text-white">{currentPage}</span> of <span className="font-semibold text-white">{totalPages}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Previous page"
        >
          Previous
        </button>

        {pageNumbers?.map((p, idx) => (
          <button
            key={idx}
            onClick={() => typeof p === "number" && onPageChange(p)}
            disabled={p === "..."}
            aria-current={p === currentPage ? "page" : undefined}
            className={`px-3 py-1.5 rounded-lg border transition ${
              p === currentPage
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-lg shadow-indigo-500/20"
                : p === "..."
                ? "border-transparent cursor-default text-slate-400"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Next page"
        >
          Next
        </button>
      </div>

      <div className="text-sm text-slate-300">
        <label className="sr-only" htmlFor="per-page-select">
          Items per page
        </label>
        <select
          id="per-page-select"
          value={limit}
          className="border border-white/10 bg-white/5 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40"
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          <option className="text-slate-900" value={10}>
            10 per page
          </option>
          <option className="text-slate-900" value={25}>
            25 per page
          </option>
          <option className="text-slate-900" value={50}>
            50 per page
          </option>
        </select>
      </div>
    </div>
  );
}
