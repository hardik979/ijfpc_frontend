"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/healper/conformationTab";
import {  FilePenLine, Trash2 } from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import FilterBar from "@/components/shared/FilterBar";
import {API_LMS_URL} from '@/lib/api'

// -------------------- Types --------------------
interface BatchHistoryItem {
  _id: string;
  from: string;
  to: string;
  changedAt: string; // ISO date string
  changedBy: string;
  note?: string;
}

interface Student {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string;
  batchHistory?: BatchHistoryItem[];
  feePlan: string;
  joinedMonth: string; // ISO date string or month string (your backend)
  avatar?: string;
  zone: string;
}

type ApiResponse = {
  status: "success" | "error";
  message: string;
};

// -------------------- UI helpers --------------------
const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30";
  if (z === "yellow") return "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-500/30";
  if (z === "green") return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30";
};

const feeBadge = (feePlan?: string) => {
  const fp = (feePlan || "").toLowerCase();
  if (!fp || fp === "-" || fp === "none") return "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30";
  if (fp.includes("emi")) return "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30";
  if (fp.includes("one") || fp.includes("full")) return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  if (fp.includes("admission") || fp.includes("advance")) return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30";
  return "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30";
};

const safeDate = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val; // if joinedMonth is not ISO, just show it
  return d.toLocaleDateString();
};

// -------------------- Main Page --------------------
const StudentsListPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();



  // server-side filters
  const [filterStatus] = useState<string>("all"); // kept for your deps

  // modals
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // server pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Search (apply button approach)
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const getStudentList = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());

      const response = await fetch(`${API_LMS_URL}/api/users/get-student-list?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json?.message || "Failed to load Student List");

      const list = Array.isArray(json?.data) ? (json.data as Student[]) : [];
      setStudents(list);
      setTotal(Number(json?.total || 0));
    } catch (err) {
      console.error(err);
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStudentList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, appliedSearch, filterStatus]);

  const deleteUser = async (clerkId: string): Promise<ApiResponse> => {
    try {
      const res = await fetch(`${API_LMS_URL}/api/users/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clerkId }),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok) {
        throw new Error(json?.message || "Failed to delete user");
      }

      await getStudentList();

      return json;
    } catch (err: any) {
      console.error("deleteUser error:", err);
      return { status: "error", message: err?.message || "Server error" };
    }
  };

  const handleDeleteClick = (clerkId: string): void => {
    setStudentToDelete(clerkId);
    setShowDeleteModal(true);
  };

  const handleEditClick = (student: Student): void => {
    router.push(`/batch-section/batch-assign?clerkId=${student?.clerkId}`);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!studentToDelete) return;

    setDeleteLoading(true);
    try {
      const result = await deleteUser(studentToDelete);

      if (result.status !== "success") {
        throw new Error(result.message || "Delete failed");
      }

      setStudents((prev) => prev.filter((s) => s.clerkId !== studentToDelete));
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error("handleDeleteConfirm error:", error);
      alert(error?.message || "Failed to delete user");
    } finally {
      setDeleteLoading(false);
      setStudentToDelete(null);
    }
  };

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-slate-300">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Students Management</h1>
            <p className="text-slate-300 mt-2">View and manage all enrolled students</p>
          </div>

          {/* Filters and Search */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 mb-6">
            <FilterBar
            value={searchDraft}
            onChange={setSearchDraft}
            onApply={() => {
              setAppliedSearch(searchDraft);
              setPage(1);
            }}
            onReset={() => {
              setSearchDraft("");
              setAppliedSearch("");
              setPage(1);
            }}
            placeholder="Search by name or email..."
          />
          </div>

          {/* Students Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Batch Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      FeePlan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Zone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Enrollment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center text-slate-300">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const batchCode =
                        student.batchHistory?.length
                          ? student.batchHistory[student.batchHistory.length - 1]?.to
                          : "—";

                      return (
                        <tr key={student._id} className="hover:bg-white/5 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold">
                                {(student.fullName || "S").slice(0, 1).toUpperCase()}
                              </div>

                              <div className="ml-4">
                                <div className="text-sm font-semibold text-white">{student.fullName}</div>
                                <div className="text-sm text-slate-300">{student.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${pill} bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30`}>
                              {batchCode}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${pill} ${feeBadge(student.feePlan)}`}>
                              {student.feePlan || "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`${pill} ${zoneBadge(student.zone)}`}>
                              {student?.zone?.toUpperCase() || "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-200">{safeDate(student.joinedMonth)}</div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleEditClick(student)}
                                className="text-emerald-300 hover:text-emerald-200 transition"
                              >
                                <FilePenLine />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(student.clerkId)}
                                className="text-rose-300 hover:text-rose-200 transition"
                                aria-label={`Delete ${student.fullName}`}
                              >
                                <Trash2/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setStudentToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          loading={deleteLoading}
        />
      </div>
    </>
  );
};

export default StudentsListPage;
