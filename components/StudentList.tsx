"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, X } from "lucide-react";

interface BatchHistoryItem {
  _id: string;
  from: string | null;
  to: string;
  changedAt: string;
  changedBy: string;
  note?: string;
}

interface Student {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string;
  batchHistory?: BatchHistoryItem[];
  feePlan?: string;
  joinedMonth?: string;
  avatar?: string;
  zone?: string;
  recordingCount?: number;
}

interface StudentsListResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
}

interface StudentSuggestion {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string;
}

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const pill =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();

  if (z === "blue") {
    return "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30";
  }
  if (z === "yellow") {
    return "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30";
  }
  if (z === "green") {
    return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  }

  return "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30";
};

const feeBadge = (feePlan?: string) => {
  const fp = (feePlan || "").toLowerCase();

  if (!fp || fp === "-" || fp === "none") {
    return "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30";
  }

  if (fp.includes("emi")) {
    return "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30";
  }

  if (fp.includes("one") || fp.includes("full")) {
    return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  }

  if (fp.includes("admission") || fp.includes("advance")) {
    return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  }

  return "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30";
};

const safeDate = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


const StudentsListPage = () => {
  const router = useRouter();
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [searchSuggestions, setSearchSuggestions] = useState<
    StudentSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [selectedStudentForCalls, setSelectedStudentForCalls] = useState<{
    clerkId: string;
    fullName: string;
  } | null>(null);
  const [studentRecordings, setStudentRecordings] = useState<any[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [showCallsModal, setShowCallsModal] = useState(false);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

 

  const getStudentList = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (appliedSearch.trim()) {
        params.set("search", appliedSearch.trim());
      }

      const response = await fetch(
        `${API_LMS_URL}/api/student-info/get-student-list?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        },
      );

      const json: StudentsListResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to load student list");
      }

      setStudents(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total || 0));
    } catch (error) {
      console.error("getStudentList error:", error);
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const getSearchSuggestions = async (keyword: string) => {
    try {
      if (!keyword.trim()) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setSuggestionLoading(true);

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "6");
      params.set("search", keyword.trim());

      const response = await fetch(
        `${API_LMS_URL}/api/student-info/get-student-list?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        },
      );

      const json: StudentsListResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to load suggestions");
      }

      const suggestionData = Array.isArray(json.data) ? json.data : [];

      setSearchSuggestions(
        suggestionData.map((student) => ({
          _id: student._id,
          clerkId: student.clerkId,
          fullName: student.fullName,
          email: student.email,
        })),
      );
      setShowSuggestions(true);
      setActiveSuggestionIndex(-1);
    } catch (error) {
      console.error("getSearchSuggestions error:", error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSuggestionLoading(false);
    }
  };

  useEffect(() => {
    getStudentList();
  }, [page, limit, appliedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft.trim()) {
        getSearchSuggestions(searchDraft);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleViewStudent = (clerkId: string) => {
    router.push(`/fee-dashboard/student-full-info?clerkId=${clerkId}`);
  };

  const handleApplySearch = (value: string) => {
    const finalValue = value.trim();
    setSearchDraft(finalValue);
    setAppliedSearch(finalValue);
    setPage(1);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (student: StudentSuggestion) => {
    setSearchDraft(student.fullName || student.email);
    setAppliedSearch(student.fullName || student.email);
    setPage(1);
    setShowSuggestions(false);
  };

  const openCallsModal = async (student: {
    clerkId: string;
    fullName: string;
  }) => {
    try {
      setSelectedStudentForCalls(student);
      setShowCallsModal(true);
      setRecordingsLoading(true);
      setStudentRecordings([]);

      const response = await fetch(
        `${API_LMS_URL}/api/student-info/student-recordings/${student.clerkId}`,
        {
          headers: {
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
        },
      );
      const json = await response.json();
      if (response.ok) {
        setStudentRecordings(json.data || []);
      }
    } catch (error) {
      console.error("fetchRecordings error:", error);
    } finally {
      setRecordingsLoading(false);
    }
  };

  const getPageNumbers = () => {
    const visiblePages = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + visiblePages - 1);

    if (end - start < visiblePages - 1) {
      start = Math.max(1, end - visiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09061a]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#8b5cf6]" />
          <p className="mt-4 text-[#a8a0d6]">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09061a] p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Students Overview</h1>
          <p className="mt-2 text-[#a8a0d6]">
            View all students, search them, and open complete details
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
            <div ref={searchBoxRef} className="relative flex-1">
              <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#9a92c9]" />

              <input
                type="text"
                value={searchDraft}
                onChange={(e) => {
                  setSearchDraft(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Search by student name or email..."
                className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-[#8f87bf] focus:border-[#8b5cf6]"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setShowSuggestions(true);
                    setActiveSuggestionIndex((prev) =>
                      prev < searchSuggestions.length - 1 ? prev + 1 : prev,
                    );
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveSuggestionIndex((prev) =>
                      prev > 0 ? prev - 1 : 0,
                    );
                  }

                  if (e.key === "Enter") {
                    e.preventDefault();

                    if (
                      showSuggestions &&
                      activeSuggestionIndex >= 0 &&
                      searchSuggestions[activeSuggestionIndex]
                    ) {
                      handleSuggestionClick(
                        searchSuggestions[activeSuggestionIndex],
                      );
                    } else {
                      handleApplySearch(searchDraft);
                    }
                  }

                  if (e.key === "Escape") {
                    setShowSuggestions(false);
                  }
                }}
              />

              {showSuggestions && (searchDraft.trim() || suggestionLoading) && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#312a63] bg-[#120f2d] shadow-2xl">
                  {suggestionLoading ? (
                    <div className="px-4 py-3 text-sm text-[#a8a0d6]">
                      Searching...
                    </div>
                  ) : searchSuggestions.length > 0 ? (
                    <ul className="max-h-80 overflow-y-auto py-2">
                      {searchSuggestions.map((student, index) => (
                        <li key={student._id}>
                          <button
                            type="button"
                            onClick={() => handleSuggestionClick(student)}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                              activeSuggestionIndex === index
                                ? "bg-[#1c1642] text-white"
                                : "hover:bg-[#1c1642] hover:text-white"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {student.fullName || "Unnamed Student"}
                              </p>
                              <p className="truncate text-sm text-[#a8a0d6]">
                                {student.email || "No email"}
                              </p>
                            </div>

                            <span className="ml-3 shrink-0 text-xs text-[#9a92c9]">
                              Select
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-[#a8a0d6]">
                      No suggestions found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApplySearch(searchDraft)}
                className="rounded-xl bg-[#8b5cf6] px-5 py-3 font-medium text-white transition hover:bg-[#7c3aed]"
              >
                Search
              </button>

              <button
                onClick={() => {
                  setSearchDraft("");
                  setAppliedSearch("");
                  setSearchSuggestions([]);
                  setShowSuggestions(false);
                  setActiveSuggestionIndex(-1);
                  setPage(1);
                }}
                className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-5 py-3 font-medium text-white transition hover:bg-[#1b1640]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#312a63] bg-[#120f2d] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-[#312a63] bg-[#151033]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    Batch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    Fee Plan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    Zone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    HR Calls
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#312a63]">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-14 text-center text-[#a8a0d6]"
                    >
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const batchCode = student.batchHistory?.length
                      ? student.batchHistory[student.batchHistory.length - 1]
                          ?.to
                      : "—";

                    return (
                      <tr
                        key={student._id}
                        className="transition-colors hover:bg-[#1a1538]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#8b5cf6]/15 ring-1 ring-[#8b5cf6]/30">
                              {student.avatar ? (
                                <img
                                  src={student.avatar}
                                  alt={student.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="font-semibold text-white">
                                  {student.fullName?.charAt(0)?.toUpperCase() ||
                                    "S"}
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-white">
                                {student.fullName || "Unnamed Student"}
                              </p>
                              <p className="text-sm text-[#a8a0d6]">
                                {student.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-white">
                          {batchCode || "—"}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`${pill} ${feeBadge(student.feePlan)}`}
                          >
                            {student.feePlan || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`${pill} ${zoneBadge(student.zone)}`}
                          >
                            {student.zone || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-[#a8a0d6]">
                          {safeDate(student.joinedMonth)}
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() =>
                              openCallsModal({
                                clerkId: student.clerkId,
                                fullName: student.fullName,
                              })
                            }
                            className="text-[#8b5cf6] underline hover:text-[#7c3aed]"
                          >
                            {student.recordingCount || 0} calls
                          </button>
                        </td>

                        <td className="px-6 py-5">
                          <button
                            onClick={() => handleViewStudent(student.clerkId)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7c3aed]"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#312a63] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-[#a8a0d6]">
              Showing{" "}
              <span className="font-semibold text-white">
                {total === 0 ? 0 : (page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-white">
                {Math.min(page * limit, total)}
              </span>{" "}
              of <span className="font-semibold text-white">{total}</span>{" "}
              students
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-2 text-white outline-none focus:border-[#8b5cf6]"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-white transition hover:bg-[#1b1640] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {getPageNumbers().map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`h-10 min-w-10 rounded-lg px-3 text-sm font-medium transition ${
                      page === pageNumber
                        ? "bg-[#8b5cf6] text-white"
                        : "border border-[#312a63] bg-[#0f0b24] text-white hover:bg-[#1b1640]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-white transition hover:bg-[#1b1640] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCallsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCallsModal(false)}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#312a63] bg-[#120f2d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#312a63] p-5">
              <h3 className="text-xl font-bold text-white">
                HR Call Reports: {selectedStudentForCalls?.fullName}
              </h3>
              <button
                onClick={() => setShowCallsModal(false)}
                className="rounded-lg p-2 text-[#9a92c9] hover:bg-[#1c1642] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {recordingsLoading ? (
                <div className="flex flex-col items-center py-10 text-[#a8a0d6]">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#8b5cf6]" />
                  <p className="mt-4">Loading reports...</p>
                </div>
              ) : studentRecordings.length === 0 ? (
                <div className="py-10 text-center text-[#a8a0d6]">
                  No call reports found for this student.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#312a63] text-[#9a92c9]">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">
                        Date
                      </th>
                      <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="pb-3 font-semibold uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#312a63]">
                    {studentRecordings.map((rec) => (
                      <tr key={rec._id}>
                        <td className="py-4 pr-4 text-white">
                          {safeDate(rec.date)}
                        </td>
                        <td className="py-4 pr-4 text-white">
                          {rec.phoneNumber}
                        </td>
                        <td className="py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              rec.status === "DONE"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-rose-500/15 text-rose-300"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-[#312a63] bg-[#1a1538] p-5 text-right">
              <button
                onClick={() => setShowCallsModal(false)}
                className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-6 py-2.5 font-medium text-white transition hover:bg-[#1b1640]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsListPage;
