"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, X, Users, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/shared/Pagination";
import { API_LMS_URL } from "@/lib/api";

interface BatchHistoryItem {
  _id: string;
  from: string;
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
  feePlan: string;
  joinedMonth: string;
  zone: string;
  isPlaced?: boolean;
  purchasedCourses?: any[];
}

type ZoneOption = "blue" | "green" | "yellow";

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue")
    return "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30";
  if (z === "yellow")
    return "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-500/30";
  if (z === "green")
    return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30";
};

const ZONE_META: Record<
  ZoneOption,
  { label: string; dot: string; ring: string; bg: string; text: string }
> = {
  blue: {
    label: "Blue",
    dot: "bg-blue-500",
    ring: "ring-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    text: "text-blue-200",
  },
  green: {
    label: "Green",
    dot: "bg-emerald-500",
    ring: "ring-emerald-400",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    text: "text-emerald-200",
  },
  yellow: {
    label: "Yellow",
    dot: "bg-yellow-400",
    ring: "ring-yellow-300",
    bg: "bg-yellow-500/10 hover:bg-yellow-500/20",
    text: "text-yellow-200",
  },
};

const StudentsZoneUpdatePage: React.FC = () => {
  const router = useRouter();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [zoneDraft, setZoneDraft] = useState<"" | ZoneOption>("");
  const [appliedZone, setAppliedZone] = useState<"" | ZoneOption>("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [chosenZone, setChosenZone] = useState<ZoneOption | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filteredStudents = useMemo(() => {
    let list = allStudents.filter(
      (s) =>
        s.isPlaced !== true &&
        Array.isArray(s.purchasedCourses) &&
        s.purchasedCourses.length > 0
    );

    if (appliedZone) {
      list = list.filter(
        (s) => (s.zone || "").toLowerCase() === appliedZone
      );
    }

    if (appliedSearch.trim()) {
      const q = appliedSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [allStudents, appliedSearch, appliedZone]);

  const total = filteredStudents.length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const students = useMemo(
    () => filteredStudents.slice((page - 1) * limit, page * limit),
    [filteredStudents, page, limit]
  );

  const allOnPageSelected =
    students.length > 0 && students.every((s) => selected.has(s.clerkId));

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_LMS_URL}/api/users/active-placement-students?status=all`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load students");

      const enrolled: Student[] = Array.isArray(json?.students)
        ? json.students
        : [];
      setAllStudents(
        enrolled.filter((s: any) => s.isRealUser !== true)
      );
    } catch (err) {
      console.error(err);
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleOne = (clerkId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clerkId)) next.delete(clerkId);
      else next.add(clerkId);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        students.forEach((s) => next.delete(s.clerkId));
      } else {
        students.forEach((s) => next.add(s.clerkId));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const openZoneModal = () => {
    if (selected.size === 0) return;
    setChosenZone(null);
    setModalOpen(true);
  };

  const submitZoneUpdate = async () => {
    if (!chosenZone || selected.size === 0) return;
    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_LMS_URL}/api/student-info/students-zone-update`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" ,"x-api-key" : "Jobs.tenx@123"},          
          credentials: "include",
          body: JSON.stringify({
            clerkIds: Array.from(selected),
            zone: chosenZone,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update zone");

      setToast({
        type: "success",
        message: `Updated ${selected.size} student${
          selected.size > 1 ? "s" : ""
        } to ${chosenZone.toUpperCase()} zone`,
      });
      setModalOpen(false);
      clearSelection();
      await fetchStudents();
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        message: err?.message || "Failed to update zone",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <button
                onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-white">
                Students Zone Update
              </h1>
              <p className="text-slate-300 mt-2">
                Select students and update their zone in bulk
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-300" />
                <span className="font-semibold text-white">
                  {selected.size}
                </span>
                selected
              </div>
              <button
                onClick={openZoneModal}
                disabled={selected.size === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-900/30 hover:from-indigo-400 hover:to-violet-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Update Zone
              </button>
            </div>
          </div>

          {/* Filter */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setAppliedSearch(searchDraft);
                      setAppliedZone(zoneDraft);
                      setPage(1);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent"
                />
              </div>

              <select
                value={zoneDraft}
                onChange={(e) =>
                  setZoneDraft(e.target.value as "" | ZoneOption)
                }
                className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent min-w-[160px]"
              >
                <option value="" className="bg-slate-900">
                  All Zones
                </option>
                <option value="blue" className="bg-slate-900">
                  Blue
                </option>
                <option value="green" className="bg-slate-900">
                  Green
                </option>
                <option value="yellow" className="bg-slate-900">
                  Yellow
                </option>
              </select>

              <button
                onClick={() => {
                  setAppliedSearch(searchDraft);
                  setAppliedZone(zoneDraft);
                  setPage(1);
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:opacity-95 transition whitespace-nowrap"
              >
                Filter
              </button>

              <button
                onClick={() => {
                  setSearchDraft("");
                  setAppliedSearch("");
                  setZoneDraft("");
                  setAppliedZone("");
                  setPage(1);
                }}
                className="px-6 py-3 rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition font-semibold whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Selection bar */}
          {selected.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
              <div className="text-sm text-indigo-100">
                <span className="font-semibold">{selected.size}</span> student
                {selected.size > 1 ? "s" : ""} selected across pages
              </div>
              <button
                onClick={clearSelection}
                className="text-sm text-indigo-200 hover:text-white transition"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={togglePage}
                        aria-label="Select all on page"
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400 cursor-pointer accent-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Batch
                    </th>                   
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Current Zone
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="inline-flex items-center gap-3 text-slate-300">
                          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
                          Loading students...
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-14 text-center text-slate-300"
                      >
                        No students found
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const checked = selected.has(student.clerkId);
                      const batchCode = student.batchHistory?.length
                        ? student.batchHistory[
                            student.batchHistory.length - 1
                          ]?.to
                        : "—";
                      return (
                        <tr
                          key={student._id}
                          onClick={() => toggleOne(student.clerkId)}
                          className={`cursor-pointer transition ${
                            checked
                              ? "bg-indigo-500/10 hover:bg-indigo-500/15"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(student.clerkId)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${student.fullName}`}
                              className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400 cursor-pointer accent-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold">
                                {(student.fullName || "S")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-white">
                                  {student.fullName}
                                </div>
                                <div className="text-sm text-slate-300">
                                  {student.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`${pill} bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/30`}
                            >
                              {batchCode}
                            </span>
                          </td>                         
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`${pill} ${zoneBadge(student.zone)}`}
                            >
                              {student?.zone?.toUpperCase() || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              limit={limit}
              onPageChange={(p) => {
                if (p < 1 || p > totalPages) return;
                setPage(p);
              }}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Zone Picker Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Update Zone
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Choose a zone for{" "}
                  <span className="text-white font-semibold">
                    {selected.size}
                  </span>{" "}
                  student{selected.size > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              {(Object.keys(ZONE_META) as ZoneOption[]).map((z) => {
                const meta = ZONE_META[z];
                const active = chosenZone === z;
                return (
                  <button
                    key={z}
                    onClick={() => setChosenZone(z)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border transition ${
                      meta.bg
                    } ${
                      active
                        ? `border-transparent ring-2 ${meta.ring}`
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-4 w-4 rounded-full ${meta.dot} shadow`}
                      />
                      <span className={`font-semibold ${meta.text}`}>
                        {meta.label} Zone
                      </span>
                    </div>
                    {active && (
                      <CheckCircle2 className={`w-5 h-5 ${meta.text}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-slate-200 hover:bg-white/5 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={submitZoneUpdate}
                disabled={!chosenZone || submitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-900/30 hover:from-indigo-400 hover:to-violet-500 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting && (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {submitting ? "Updating..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-100"
              : "bg-rose-500/15 border-rose-500/30 text-rose-100"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
};

export default StudentsZoneUpdatePage;
