"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

interface PlacedStudent {
  _id: string;
  studentName?: string;
  email?: string;
  clerkId?: string;
  createdAt?: string;
}

interface PlacedStudentsResponse {
  message?: string;
  count?: number;
  data?: PlacedStudent[] | PlacedStudent;
}

interface PlacedStudentFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  clerkId?: string;
}

interface PlacedStudentsListProps {
  onBack: () => void;
}

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function PlacedStudentsList({ onBack }: PlacedStudentsListProps) {
  const [students, setStudents] = useState<PlacedStudent[]>([]);
  const [studentOptions, setStudentOptions] = useState<PlacedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clerkId, setClerkId] = useState("");
  const requestIdRef = useRef(0);
  const unfilteredRequestIdRef = useRef(0);

  const clerkOptions = useMemo(() => {
    const uniqueStudents = new Map<string, PlacedStudent>();
    studentOptions.forEach((student) => {
      if (student.clerkId && !uniqueStudents.has(student.clerkId)) {
        uniqueStudents.set(student.clerkId, student);
      }
    });
    return Array.from(uniqueStudents.values());
  }, [studentOptions]);

  const fetchPlacedStudents = async (filters: PlacedStudentFilters = {}) => {
    const requestId = ++requestIdRef.current;
    const isUnfiltered =
      !filters.search &&
      !filters.startDate &&
      !filters.endDate &&
      !filters.clerkId;

    if (isUnfiltered) {
      unfilteredRequestIdRef.current = requestId;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.clerkId) params.set("clerkId", filters.clerkId);

      const query = params.toString();
      const response = await fetch(
        `${API_LMS_URL}/api/users/get-placed-students-count${query ? `?${query}` : ""}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        }
      );
      const json: PlacedStudentsResponse = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Failed to fetch placed students");
      }

      const rows = Array.isArray(json.data)
        ? json.data
        : json.data
          ? [json.data]
          : [];

      if (isUnfiltered && requestId === unfilteredRequestIdRef.current) {
        setStudentOptions(rows);
      }

      if (requestId !== requestIdRef.current) return;
      setStudents(rows);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      console.error("fetchPlacedStudents error:", fetchError);
      setStudents([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch placed students"
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchPlacedStudents();

    return () => {
      const invalidRequestId = ++requestIdRef.current;
      unfilteredRequestIdRef.current = invalidRequestId;
    };
  }, []);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (clerkId) {
      void fetchPlacedStudents({ clerkId });
      return;
    }

    void fetchPlacedStudents({
      search: search.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setClerkId("");
    void fetchPlacedStudents();
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="self-start rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] px-4 py-2 text-sm font-medium text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)]"
        >
          ← Back to Overview
        </button>
        <p className="text-lg font-semibold text-[var(--so-text-primary)]">
          Placed Students
          <span className="ml-2 text-sm font-normal text-[var(--so-text-secondary)]">
            ({students.length} students)
          </span>
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="mb-6 rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-[var(--so-text-secondary)]">
            Search
            <div className="relative mt-1.5">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--so-text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  if (event.target.value) setClerkId("");
                }}
                placeholder="Name, email, or Clerk ID"
                className="w-full rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] py-3 pl-11 pr-4 text-[var(--so-text-primary)] outline-none placeholder:text-[var(--so-text-placeholder)] focus:border-[#8b5cf6]"
              />
            </div>
          </label>

          <label className="text-sm text-[var(--so-text-secondary)]">
            Start date
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                if (event.target.value) setClerkId("");
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] px-4 py-3 text-[var(--so-text-primary)] outline-none focus:border-[#8b5cf6]"
            />
          </label>

          <label className="text-sm text-[var(--so-text-secondary)]">
            End date
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                if (event.target.value) setClerkId("");
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] px-4 py-3 text-[var(--so-text-primary)] outline-none focus:border-[#8b5cf6]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-[#8b5cf6] px-5 py-3 font-medium text-white transition hover:bg-[#7c3aed]"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-[var(--so-border)] bg-[var(--so-bg-input)] px-5 py-3 font-medium text-[var(--so-text-primary)] transition hover:bg-[var(--so-bg-hover)]"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#8b5cf6]" />
            <p className="mt-4 text-[var(--so-text-secondary)]">
              Loading placed students...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--so-border)] bg-[var(--so-bg-card)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-[var(--so-border)] bg-[var(--so-bg-header)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--so-text-muted)]">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--so-border)]">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-14 text-center text-[var(--so-text-secondary)]"
                    >
                      No placed students found
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr
                      key={student._id || `${student.clerkId}-${student.createdAt}-${index}`}
                      className="transition-colors hover:bg-[var(--so-bg-row-hover)]"
                    >
                      <td className="px-6 py-5 font-semibold text-[var(--so-text-primary)]">
                        {student.studentName || "Unnamed Student"}
                      </td>
                      <td className="px-6 py-5 text-[var(--so-text-secondary)]">
                        {student.email || "—"}
                      </td>
                      <td className="px-6 py-5 text-[var(--so-text-secondary)]">
                        {formatDate(student.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
