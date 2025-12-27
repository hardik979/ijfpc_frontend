"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  User,
  Building2,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  ArrowLeft,
  Users,
  Loader2,
  X,
  AlertCircle,
  Target,
  Flag,
  Award,
  UserCheck,
  Timer,
} from "lucide-react";

import { API_HR_URL } from "@/lib/api";

type StudentProfile = {
  clerkId: string;
  fullName: string;
  email: string;
  batch: string;
  zone: any;
};

type InterviewFeedback = {
  given?: boolean;
  givenAt?: string;
  round?: number;
  mentoredBy?: string;
  durationMinutes?: number;
  rank?: "bad" | "average" | "good";
  communication?: "bad" | "average" | "good";
  readability?: "bad" | "average" | "good";
  confidence?: "bad" | "average" | "good";
  technical?: "bad" | "average" | "good";
  feedback?: string;
};

type InterviewRow = {
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
  status: "scheduled" | "completed" | "cancelled" | string;
  remark?: string;
  calendarEventId?: string;
  calendarEventLink?: string;
  calendarSyncStatus?: string;
  calendarLastError?: string;
  feedback?: InterviewFeedback;
  createdAt?: string;
  updatedAt?: string;
};

export default function StaffStudentInterviewsPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = decodeURIComponent(params.studentId);

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [items, setItems] = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<InterviewRow | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [sRes, iRes] = await Promise.all([
        fetch(
          `${API_HR_URL}/api/staff/students/${encodeURIComponent(studentId)}`
        ),
        fetch(
          `${API_HR_URL}/api/staff/interviews/by-student/${encodeURIComponent(
            studentId
          )}?status=all`
        ),
      ]);

      const sJson = await sRes.json();
      const iJson = await iRes.json();

      if (!sRes.ok || !sJson.ok)
        throw new Error(sJson?.error || "Failed to load student");
      if (!iRes.ok || !iJson.ok)
        throw new Error(iJson?.error || "Failed to load interviews");

      setStudent(sJson.student);
      setItems(iJson.items || []);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
      setStudent(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [studentId]);

  const stats = useMemo(() => {
    const scheduled = items.filter((x) => x.status === "scheduled").length;
    const completed = items.filter((x) => x.status === "completed").length;
    const feedbackPending = items.filter(
      (x) => x.status === "scheduled" && x.feedback?.given !== true
    ).length;

    return { scheduled, completed, feedbackPending };
  }, [items]);

  function openFeedback(i: InterviewRow) {
    setActive(i);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setActive(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">
                    Student Interviews
                  </h1>
                  {!loading && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm font-medium">
                      {items.length} Total
                    </span>
                  )}
                </div>
                <p className="text-blue-200 text-sm mt-1">
                  View interview history and submit feedback
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/fee-dashboard/interview-reporting"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-blue-100 transition-all duration-200 border border-slate-700/50 hover:border-slate-600"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </a>
              <a
                href="/fee-dashboard/interview-reporting/students"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-blue-100 transition-all duration-200 border border-slate-700/50 hover:border-slate-600"
              >
                <Users className="w-4 h-4" />
                Students
              </a>
            </div>
          </div>
        </div>

        {err && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error Loading Data</p>
              <p className="text-red-300 text-sm mt-1">{err}</p>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6 shadow-xl">
          {loading ? (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading student profile...
            </div>
          ) : !student ? (
            <div className="text-slate-400">Student not found</div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {student.fullName || "—"}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-blue-300">
                    <Mail className="w-4 h-4" />
                    <span>{student.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className="px-2 py-1 rounded-md bg-slate-700/50 border border-slate-600">
                      Batch: {student.batch || "—"}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-slate-700/50 border border-slate-600 font-mono text-xs">
                      {student.clerkId}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-slate-700/50 border border-slate-600">
                      Zone:{" "}
                      {typeof student.zone === "string"
                        ? student.zone
                        : JSON.stringify(student.zone)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  icon={<Clock className="w-5 h-5" />}
                  label="Scheduled"
                  value={stats.scheduled}
                  color="blue"
                />
                <StatCard
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  label="Completed"
                  value={stats.completed}
                  color="green"
                />
                <StatCard
                  icon={<AlertCircle className="w-5 h-5" />}
                  label="Pending"
                  value={stats.feedbackPending}
                  color="yellow"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Interview Records
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Latest interviews first
                </p>
              </div>
              <button
                onClick={loadAll}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-blue-100 transition-all duration-200 border border-slate-700/50 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Feedback
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Contact
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
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-medium">
                            No interview records
                          </p>
                          <p className="text-slate-500 text-sm mt-1">
                            This student hasn't had any interviews yet
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((it) => {
                    const feedbackGiven = it.feedback?.given === true;
                    const needsFeedback =
                      it.status === "scheduled" && !feedbackGiven;

                    return (
                      <tr
                        key={it._id}
                        className="hover:bg-slate-700/30 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {it.companyName || "—"}
                              </div>
                              {it.remark && (
                                <div className="text-sm text-slate-400 mt-1 line-clamp-1">
                                  {it.remark}
                                </div>
                              )}
                            </div>
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
                          <StatusPill status={it.status} />
                          {it.calendarSyncStatus && (
                            <div className="text-xs text-slate-500 mt-2">
                              Calendar: {it.calendarSyncStatus}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {feedbackGiven ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-yellow-400" />
                                <span className="text-white font-medium capitalize">
                                  {it.feedback?.rank || "—"}
                                </span>
                              </div>
                              {it.feedback?.round && (
                                <div className="text-sm text-slate-400">
                                  Round {it.feedback.round}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-yellow-400">
                              {needsFeedback && (
                                <>
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm">Pending</span>
                                </>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-white">
                            {it.channel === "phone" ? (
                              <Phone className="w-4 h-4 text-green-400" />
                            ) : (
                              <Mail className="w-4 h-4 text-blue-400" />
                            )}
                            <span className="font-medium">
                              {it.contactValue || "—"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 capitalize">
                            {it.channel}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openFeedback(it)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {feedbackGiven ? "Edit" : "Give"} Feedback
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {open && active && (
          <FeedbackModal
            interview={active}
            onClose={closeModal}
            onSaved={async () => {
              closeModal();
              await loadAll();
            }}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "yellow";
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    green: "from-green-500 to-green-600 shadow-green-500/30",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-500/30",
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
      <div
        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg mb-3`}
      >
        <div className="text-white">{icon}</div>
      </div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  const config = {
    scheduled: {
      class: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      icon: <Clock className="w-3 h-3" />,
    },
    completed: {
      class: "bg-green-500/20 text-green-300 border-green-500/30",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelled: {
      class: "bg-red-500/20 text-red-300 border-red-500/30",
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const current = config[s as keyof typeof config] || {
    class: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${current.class}`}
    >
      {current.icon}
      {status}
    </span>
  );
}
function FeedbackModal({
  interview,
  onClose,
  onSaved,
}: {
  interview: InterviewRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = interview.feedback;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<string>(
    existing?.round ? String(existing.round) : ""
  );
  const [mentoredBy, setMentoredBy] = useState<string>(
    existing?.mentoredBy || ""
  );
  const [durationMinutes, setDurationMinutes] = useState<string>(
    existing?.durationMinutes ? String(existing.durationMinutes) : ""
  );
  const [rank, setRank] = useState<string>(existing?.rank || "average");
  const [communication, setCommunication] = useState<string>(
    existing?.communication || "average"
  );
  const [readability, setReadability] = useState<string>(
    existing?.readability || "average"
  );
  const [confidence, setConfidence] = useState<string>(
    existing?.confidence || "average"
  );
  const [technical, setTechnical] = useState<string>(
    existing?.technical || "average"
  );
  const [feedback, setFeedback] = useState<string>(existing?.feedback || "");
  const [statusToSet, setStatusToSet] = useState<string>("completed"); // ✅ FIXED
  const API_BASE_URL = "http://localhost:4000";

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        rank,
        communication,
        readability,
        confidence,
        technical,
        feedback,
        setStatus: statusToSet,
      };

      if (round.trim()) payload.round = Number(round);
      if (mentoredBy.trim()) payload.mentoredBy = mentoredBy;
      if (durationMinutes.trim())
        payload.durationMinutes = Number(durationMinutes);

      const res = await fetch(
        `${API_BASE_URL}/api/staff/interviews/${encodeURIComponent(
          interview._id
        )}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json?.message || json?.error || "Failed");

      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  Interview Feedback
                </h3>
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {interview.studentName} • {interview.companyName} •{" "}
                {new Date(interview.scheduledAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Round
                </div>
              </label>
              <input
                type="number"
                min="1"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Mentored By
                </div>
              </label>
              <input
                type="text"
                value={mentoredBy}
                onChange={(e) => setMentoredBy(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Duration (min)
                </div>
              </label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 30"
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Overall Rank
                </div>
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bad">Bad</option>
                <option value="average">Average</option>
                <option value="good">Good</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Communication
                </div>
              </label>
              <select
                value={communication}
                onChange={(e) => setCommunication(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bad">Bad</option>
                <option value="average">Average</option>
                <option value="good">Good</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Readability
                </div>
              </label>
              <select
                value={readability}
                onChange={(e) => setReadability(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bad">Bad</option>
                <option value="average">Average</option>
                <option value="good">Good</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Confidence
                </div>
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bad">Bad</option>
                <option value="average">Average</option>
                <option value="good">Good</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Technical
                </div>
              </label>
              <select
                value={technical}
                onChange={(e) => setTechnical(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bad">Bad</option>
                <option value="average">Average</option>
                <option value="good">Good</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Detailed Feedback
              </div>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide detailed feedback about the interview..."
              rows={6}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Update Status
              </div>
            </label>
            <select
              value={statusToSet}
              onChange={(e) => setStatusToSet(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
