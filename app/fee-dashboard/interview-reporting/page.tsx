"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Calendar,
  Clock,
  Building2,
  MessageSquare,
  Search,
  X,
  Users,
  FileText,
  ChevronRight,
  Star,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

// =====================
// Types
// =====================

type Status = "ACTIVE" | "DROPPED" | "PAUSED" | "PLACED";
type Zone = "BLUE" | "YELLOW" | "GREEN";

interface StudentRow {
  _id: string;
  name: string;
  courseName?: string;
  status: Status;
  zone?: Zone;
}

interface Interview {
  _id?: string;
  company: string;
  scheduledAt: string; // ISO
  round?: string;
  remarks?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt?: string;
}

interface StudentInterviewsResponse {
  studentId: string;
  zone?: Zone;
  interviews: Interview[];
}

// =====================
// Helpers
// =====================

const cn = (...arr: Array<string | false | undefined>) =>
  arr.filter(Boolean).join(" ");

const toInputDate = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";

const toInputTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const prettyDT = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN") : "—";

// =====================
// Page
// =====================

export default function GreenInterviewsDashboard() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [sideOpen, setSideOpen] = useState(false);

  // New interview form
  const [ivCompany, setIvCompany] = useState("");
  const [ivDate, setIvDate] = useState(""); // YYYY-MM-DD
  const [ivTime, setIvTime] = useState(""); // HH:mm
  const [ivRound, setIvRound] = useState("");
  const [ivRemarks, setIvRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  // Fetch all GREEN students (names only) — server already excludes PLACED when zone filter is present
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/preplacement/students?zone=GREEN&limit=500`
        );
        const data = await res.json();
        setStudents(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Filtered view
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, search]);

  // Load a student's interviews when selected
  const openStudent = async (s: StudentRow) => {
    setSelectedId(s._id);
    setSelected(s);
    setSideOpen(true);
    setMsg(null);
    setIvCompany("");
    setIvDate("");
    setIvTime("");
    setIvRound("");
    setIvRemarks("");

    try {
      const r = await fetch(
        `${API_BASE_URL}/api/preplacement/students/${s._id}/interviews`
      );
      const j: StudentInterviewsResponse = await r.json();
      setInterviews(
        (j?.interviews || []).filter((iv) => iv.status === "COMPLETED")
      );
    } catch (e) {
      console.error(e);
      setInterviews([]);
    }
  };

  const closeSide = () => {
    setSideOpen(false);
    setSelectedId(null);
    setSelected(null);
    setInterviews([]);
    setMsg(null);
  };

  const submitInterview = async () => {
    if (!selectedId) return;
    if (!ivCompany.trim() || !ivDate || !ivTime) {
      setMsg("Company, date and time are required.");
      setMsgType("error");
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const body = {
        company: ivCompany.trim(),
        date: ivDate, // backend merges date+time to scheduledAt
        time: ivTime,
        round: ivRound.trim() || undefined,
        remarks: ivRemarks.trim() || undefined,
        status: "COMPLETED",
      };
      const res = await fetch(
        `${API_BASE_URL}/api/preplacement/students/${selectedId}/interviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to add interview");

      // refresh the student's interviews
      const r = await fetch(
        `${API_BASE_URL}/api/preplacement/students/${selectedId}/interviews`
      );
      const j: StudentInterviewsResponse = await r.json();
      setInterviews(
        (j?.interviews || []).filter((iv) => iv.status === "COMPLETED")
      );

      // reset form
      setIvCompany("");
      setIvDate("");
      setIvTime("");
      setIvRound("");
      setIvRemarks("");
      setMsg("Interview report added successfully!");
      setMsgType("success");
    } catch (e) {
      console.error(e);
      setMsg("Failed to add interview.");
      setMsgType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const clearMessage = () => setMsg(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0818] via-[#0f0a28] to-[#140d35] text-white">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/20">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-green-200 bg-clip-text text-transparent">
                Green Zone Dashboard
              </h1>
              <p className="text-lg text-purple-200/80 font-medium">
                Interview Reports & Management
              </p>
            </div>
          </div>
          <p className="text-purple-200/60 max-w-2xl leading-relaxed">
            Manage interview reports for all students in the GREEN zone. Click
            on any student card to view their interview history and add new
            reports.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-10">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-400/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200/80 text-sm font-medium">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-emerald-300">
                  {filtered.length}
                </p>
              </div>
              <div className="p-3 bg-emerald-400/20 rounded-xl">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-purple-300/60" />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-purple-200/50 outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/30 transition-all duration-200"
            />
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s, index) => (
            <div
              key={s._id}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
              onClick={() => openStudent(s)}
            >
              <div className="h-full p-6 rounded-2xl bg-gradient-to-r from-white/5 to-white/10 border border-emerald-300/20 backdrop-blur-sm hover:border-emerald-300/40 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/15 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white group-hover:text-emerald-200 transition-colors duration-200">
                      {s.name}
                    </h3>
                    <p className="text-sm text-purple-200/70 mt-1 leading-relaxed">
                      {s.courseName || "Course not specified"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-300/60 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all duration-200" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-300 text-xs font-medium">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    GREEN ZONE
                  </span>
                  <div className="text-xs text-purple-200/60">
                    Click to view
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="col-span-full">
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20 flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-purple-300/60" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No students found
                </h3>
                <p className="text-purple-200/60">
                  Try adjusting your search criteria
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="col-span-full">
              <div className="text-center py-16">
                <div className="animate-spin w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full mx-auto mb-4"></div>
                <p className="text-purple-200/70">Loading students...</p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        {sideOpen && selected && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
              onClick={closeSide}
            />
            <div className="relative z-10 h-full w-full max-w-4xl overflow-y-auto border-l border-white/10 bg-gradient-to-b from-[#0f0b24] to-[#130f2a] shadow-2xl transform transition-transform duration-300 ease-out">
              <div className="sticky top-0 z-20 bg-gradient-to-r from-[#0f0b24] to-[#130f2a] border-b border-white/10 backdrop-blur-sm">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selected.name}
                    </h2>
                    <p className="text-purple-200/70 mt-1">
                      {selected.courseName || ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-emerald-300/30 bg-emerald-400/10 text-emerald-300 text-xs font-medium">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        GREEN ZONE
                      </span>
                      <span className="text-xs text-purple-200/60">•</span>
                      <span className="text-xs text-purple-200/60">
                        {interviews.length} interviews
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={closeSide}
                    className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors duration-200"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Add Interview Form */}
                <div className="rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-white/5 to-white/10 p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-emerald-400/20">
                      <Plus className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      Add Interview Report
                    </h3>
                  </div>

                  {msg && (
                    <div
                      className={cn(
                        "mb-6 p-4 rounded-xl border flex items-center gap-3 transition-all duration-300",
                        msgType === "success"
                          ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-200"
                          : "bg-rose-400/10 border-rose-400/30 text-rose-200"
                      )}
                    >
                      {msgType === "success" ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      )}
                      <span className="text-sm">{msg}</span>
                      <button
                        onClick={clearMessage}
                        className="ml-auto p-1 hover:bg-white/10 rounded transition-colors duration-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field
                      label="Company"
                      icon={<Building2 size={16} />}
                      required
                    >
                      <input
                        value={ivCompany}
                        onChange={(e) => setIvCompany(e.target.value)}
                        placeholder="e.g., Microsoft, Google, Amazon"
                        className="field"
                      />
                    </Field>
                    <Field label="Round" icon={<Star size={16} />}>
                      <input
                        value={ivRound}
                        onChange={(e) => setIvRound(e.target.value)}
                        placeholder="e.g., Technical Round 1, HR Round"
                        className="field"
                      />
                    </Field>
                    <Field label="Date" icon={<Calendar size={16} />} required>
                      <input
                        type="date"
                        value={ivDate}
                        onChange={(e) => setIvDate(e.target.value)}
                        className="field"
                      />
                    </Field>
                    <Field label="Time" icon={<Clock size={16} />} required>
                      <input
                        type="time"
                        value={ivTime}
                        onChange={(e) => setIvTime(e.target.value)}
                        className="field"
                      />
                    </Field>
                  </div>

                  <div className="mt-6">
                    <Field label="Remarks" icon={<MessageSquare size={16} />}>
                      <textarea
                        value={ivRemarks}
                        onChange={(e) => setIvRemarks(e.target.value)}
                        placeholder="Add any additional notes about the interview..."
                        rows={3}
                        className="field resize-none"
                      />
                    </Field>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={submitInterview}
                      disabled={submitting || selected.status === "PLACED"}
                      className={cn(
                        "px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
                        submitting || selected.status === "PLACED"
                          ? "bg-gray-500/20 border border-gray-400/20 text-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-300/30 text-emerald-200 hover:from-emerald-500/30 hover:to-green-500/30 hover:border-emerald-300/50 hover:scale-105"
                      )}
                      title={
                        selected.status === "PLACED"
                          ? "Cannot add interviews for PLACED students"
                          : ""
                      }
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin"></div>
                          Saving Report...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Interview Report
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Interviews List */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-purple-400/20">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      Interview History
                    </h3>
                    <span className="px-2 py-1 rounded-full bg-purple-400/20 text-purple-200 text-xs">
                      {interviews.length} total
                    </span>
                  </div>

                  {interviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-purple-300/60" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        No interviews yet
                      </h4>
                      <p className="text-purple-200/60">
                        Add the first interview report using the form above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interviews.map((iv, index) => (
                        <div
                          key={iv._id || iv.scheduledAt}
                          className="group p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 to-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/15 transition-all duration-300"
                          style={{
                            animationDelay: `${index * 0.1}s`,
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg text-white group-hover:text-emerald-200 transition-colors duration-200">
                                {iv.company}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-sm text-purple-200/80">
                                {iv.round && (
                                  <>
                                    <span className="font-medium">
                                      {iv.round}
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{prettyDT(iv.scheduledAt)}</span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                                iv.status === "SCHEDULED" &&
                                  "border border-sky-300/30 bg-sky-400/10 text-sky-300",
                                iv.status === "COMPLETED" &&
                                  "border border-emerald-300/30 bg-emerald-400/10 text-emerald-300",
                                iv.status === "CANCELLED" &&
                                  "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  iv.status === "COMPLETED" && "bg-emerald-400",
                                  iv.status === "SCHEDULED" && "bg-sky-400",
                                  iv.status === "CANCELLED" && "bg-rose-400"
                                )}
                              ></div>
                              {iv.status}
                            </span>
                          </div>
                          {iv.remarks && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-sm text-purple-200/80 leading-relaxed">
                                <MessageSquare className="w-4 h-4 inline mr-2 text-purple-300/60" />
                                {iv.remarks}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .field {
          @apply w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-purple-200/50 outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400/30 transition-all duration-200;
        }
      `}</style>
    </div>
  );
}

// =====================
// Enhanced Field Component
// =====================

function Field({
  label,
  icon,
  children,
  required,
}: React.PropsWithChildren<{
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
}>) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-200/90">
        {icon && <span className="text-purple-300/70">{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-rose-400 text-xs">*</span>}
      </div>
      {children}
    </label>
  );
}
