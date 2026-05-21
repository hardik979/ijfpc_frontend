"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  Inbox,
  Loader2,
} from "lucide-react";

export type Column<T> = {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: React.ReactNode;
  /** Path on the row to read value from, or a function */
  accessor?: keyof T | ((row: T, index: number) => React.ReactNode);
  /** Custom cell renderer (overrides accessor for rendering) */
  render?: (row: T, index: number) => React.ReactNode;
  /** Enable sort on this column (uses accessor value) */
  sortable?: boolean;
  /** Include this column when searching */
  searchable?: boolean;
  /** Text align */
  align?: "left" | "center" | "right";
  /** Fixed width / class for the column */
  width?: string;
  className?: string;
  headerClassName?: string;
};

export type DataPresentationTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  /** Optional title shown above the table */
  title?: React.ReactNode;
  /** Optional subtitle / description */
  subtitle?: React.ReactNode;
  /** Right-side toolbar slot (buttons, filters, etc.) */
  toolbar?: React.ReactNode;

  /** Show search input */
  searchable?: boolean;
  searchPlaceholder?: string;

  /** Show pagination */
  paginated?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];

  /** Loading & empty states */
  loading?: boolean;
  emptyMessage?: React.ReactNode;

  /** Row interactions */
  onRowClick?: (row: T, index: number) => void;
  rowKey?: keyof T | ((row: T, index: number) => string | number);

  /** Visual */
  striped?: boolean;
  compact?: boolean;
  bordered?: boolean;
  stickyHeader?: boolean;
  className?: string;
};

function getValue<T>(row: T, col: Column<T>, index: number): any {
  if (typeof col.accessor === "function") return col.accessor(row, index);
  if (col.accessor) return (row as any)[col.accessor];
  return (row as any)[col.key];
}

function DataPresentationTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  toolbar,
  searchable = false,
  searchPlaceholder = "Search...",
  paginated = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  loading = false,
  emptyMessage = "No data to display",
  onRowClick,
  rowKey,
  striped = true,
  compact = false,
  bordered = false,
  stickyHeader = false,
  className = "",
}: DataPresentationTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const searchCols = columns.filter(
      (c) => c.searchable !== false && (c.accessor || c.key)
    );
    return data.filter((row, i) =>
      searchCols.some((c) => {
        const v = getValue(row, c, i);
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = getValue(a, col, 0);
      const vb = getValue(b, col, 0);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === "asc" ? -1 : 1;
      if (sa > sb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const total = sorted.length;
  const totalPages = paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageRows = paginated
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir("asc");
    }
  };

  const getRowKey = (row: T, i: number) => {
    if (typeof rowKey === "function") return rowKey(row, i);
    if (rowKey) return (row as any)[rowKey] ?? i;
    return (row as any).id ?? (row as any)._id ?? i;
  };

  const alignClass = (a?: "left" | "center" | "right") =>
    a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

  const cellPad = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div
      className={`w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      {(title || subtitle || toolbar || searchable) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
                />
              </div>
            )}
            {toolbar}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${bordered ? "border-collapse" : ""}`}>
          <thead
            className={`bg-gray-50 text-gray-700 ${
              stickyHeader ? "sticky top-0 z-10" : ""
            }`}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => toggleSort(col)}
                  className={`${cellPad} font-medium text-xs uppercase tracking-wide ${alignClass(
                    col.align
                  )} ${col.sortable ? "cursor-pointer select-none" : ""} ${
                    bordered ? "border border-gray-200" : "border-b border-gray-200"
                  } ${col.headerClassName ?? ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable &&
                      (sortKey !== col.key ? (
                        <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
                      ) : sortDir === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-gray-300" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => {
                const absIndex = paginated
                  ? (currentPage - 1) * pageSize + i
                  : i;
                return (
                  <tr
                    key={getRowKey(row, absIndex)}
                    onClick={() => onRowClick?.(row, absIndex)}
                    className={`${
                      striped && i % 2 === 1 ? "bg-gray-50/60" : "bg-white"
                    } ${
                      onRowClick ? "cursor-pointer hover:bg-blue-50" : "hover:bg-gray-50"
                    } transition-colors`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${cellPad} text-gray-800 ${alignClass(
                          col.align
                        )} ${
                          bordered
                            ? "border border-gray-200"
                            : "border-b border-gray-100"
                        } ${col.className ?? ""}`}
                      >
                        {col.render
                          ? col.render(row, absIndex)
                          : (getValue(row, col, absIndex) as React.ReactNode) ?? (
                              <span className="text-gray-400">—</span>
                            )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paginated && !loading && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPresentationTable;
