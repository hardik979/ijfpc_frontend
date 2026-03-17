"use client";
import { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  User,
  CheckCircle,
  Coffee,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

interface Task {
  title: string;
  start: string;
  end: string;
  durationMin: number;
  notes?: string;
  tags?: string[];
}

interface StaffMember {
  name: string;
  email: string;
  clockIn: string;
  clockOut: string | null;
  totalTaskMinutes: number;
  breakMinutes: number;

  tasks: Task[];
}

interface EODResponse {
  ok: boolean;
  dayKey: string;
  data: StaffMember[];
}

export default function EODReportsPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reportData, setReportData] = useState<EODResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const API_URL = "https://ijfpc-backend.onrender.com";
  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/reports/eod?day=${selectedDate}`,
        {}
      );

      if (!response.ok) throw new Error("Failed to fetch report");

      const data: EODResponse = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffExpanded = (email: string) => {
    const newExpanded = new Set(expandedStaff);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedStaff(newExpanded);
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateTotals = () => {
    if (!reportData) return { totalStaff: 0, totalHours: 0, totalTasks: 0 };

    return {
      totalStaff: reportData.data.length,

      totalTasks: reportData.data.reduce(
        (sum, staff) => sum + staff.tasks.length,
        0
      ),
    };
  };

  const totals = calculateTotals();

  const exportToCSV = () => {
    if (!reportData) return;

    let csv =
      "Name,Email,Clock In,Clock Out,Task Minutes,Break Minutes,Paid Minutes,Tasks Count\n";
    reportData.data.forEach((staff) => {
      csv += `"${staff.name}","${staff.email}","${formatTime(
        staff.clockIn
      )}","${staff.clockOut ? formatTime(staff.clockOut) : "Active"}",${
        staff.totalTaskMinutes
      },${staff.breakMinutes},${staff.tasks.length}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eod-report-${selectedDate}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                End of Day Reports
              </h1>
              <p className="text-purple-200">
                Team activity and productivity summary
              </p>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <button
                onClick={exportToCSV}
                disabled={!reportData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Staff</p>
                <p className="text-3xl font-bold">{totals.totalStaff}</p>
              </div>
              <User className="w-12 h-12 opacity-30" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent"></div>
            <p className="text-white mt-4">Loading report...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-6 text-center border border-red-400/30">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Staff List */}
        {!loading && !error && reportData && (
          <div className="space-y-4">
            {reportData.data.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
                <p className="text-white text-lg">
                  No staff activity recorded for this date
                </p>
              </div>
            ) : (
              reportData.data.map((staff) => (
                <div
                  key={staff.email}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden transition-all hover:bg-white/15"
                >
                  {/* Staff Header */}
                  <div
                    onClick={() => toggleStaffExpanded(staff.email)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              {staff.name}
                            </h3>
                            <p className="text-purple-300 text-sm">
                              {staff.email}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-300 text-xs mb-1">
                              Clock In
                            </p>
                            <p className="text-white font-semibold">
                              {formatTime(staff.clockIn)}
                            </p>
                          </div>

                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-300 text-xs mb-1">
                              Clock Out
                            </p>
                            <p className="text-white font-semibold">
                              {staff.clockOut ? (
                                formatTime(staff.clockOut)
                              ) : (
                                <span className="text-green-400">Active</span>
                              )}
                            </p>
                          </div>

                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-300 text-xs mb-1">
                              Tasks
                            </p>
                            <p className="text-white font-semibold">
                              {formatDuration(staff.totalTaskMinutes)}
                            </p>
                          </div>

                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-300 text-xs mb-1">
                              Breaks
                            </p>
                            <p className="text-white font-semibold">
                              {formatDuration(staff.breakMinutes)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
                        {expandedStaff.has(staff.email) ? (
                          <ChevronUp className="w-6 h-6 text-white" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tasks */}
                  {expandedStaff.has(staff.email) && (
                    <div className="border-t border-white/20 p-6 bg-black/20">
                      <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Tasks Completed ({staff.tasks.length})
                      </h4>

                      {staff.tasks.length === 0 ? (
                        <p className="text-purple-300 text-center py-4">
                          No tasks recorded
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {staff.tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="bg-white/10 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="text-white font-medium flex-1">
                                  {task.title}
                                </h5>
                                <span className="text-purple-300 text-sm ml-4">
                                  {formatDuration(task.durationMin)}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-purple-300 mb-2">
                                <span>
                                  {formatTime(task.start)} -{" "}
                                  {formatTime(task.end)}
                                </span>
                              </div>

                              {task.notes && (
                                <p className="text-purple-200 text-sm mt-2 italic">
                                  {task.notes}
                                </p>
                              )}

                              {task.tags && task.tags.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {task.tags.map((tag, tagIdx) => (
                                    <span
                                      key={tagIdx}
                                      className="px-2 py-1 bg-purple-500/30 text-purple-200 rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
