"use client";

import { useEffect, useState } from "react";
import { Search, Users, ArrowLeft, Loader2, User } from "lucide-react";

import { API_HR_URL } from "@/lib/api";

type StudentRow = {
  clerkId: string;
  fullName: string;
  email: string;
  batch: string;
  zone: any;
};

export default function StaffStudentPickerPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchStudents(query: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_HR_URL}/api/staff/students/green?q=${encodeURIComponent(
        query
      )}&limit=50`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json?.error || "Failed");

      setItems(json.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchStudents(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Green Zone Students
                </h1>
                <p className="text-blue-200 text-sm mt-1">
                  Search and manage student interview history
                </p>
              </div>
            </div>

            <a
              href="/fee-dashboard/interview-reporting"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-blue-100 transition-all duration-200 border border-slate-700/50 hover:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Interviews
            </a>
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6 shadow-xl">
          <label className="block text-sm font-medium text-blue-200 mb-3">
            Search Students
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, batch, or clerk ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            {error ? (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                {error}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-300 text-sm">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading students...
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    {items.length} student{items.length !== 1 ? "s" : ""} found
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Student Information
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-slate-400">Loading students...</p>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                          <Users className="w-8 h-8 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-medium">
                            No students found
                          </p>
                          <p className="text-slate-500 text-sm mt-1">
                            Try adjusting your search criteria
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((s, idx) => (
                    <tr
                      key={s.clerkId}
                      className="hover:bg-slate-700/30 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {s.fullName || "—"}
                            </div>
                            <div className="text-sm text-blue-300 mt-0.5">
                              {s.email || "—"}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                              ID: {s.clerkId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {s.batch || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/fee-dashboard/interview-reporting/students/${encodeURIComponent(
                            s.clerkId
                          )}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                        >
                          View Interviews
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        {!loading && items.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-400">
            Displaying {items.length} of {items.length} students
          </div>
        )}
      </div>
    </div>
  );
}
