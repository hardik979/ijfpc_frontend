"use client";

import React, { useEffect, useMemo, useState } from "react";
import {API_LMS_URL} from '@/lib/api'

type Student = {
  _id?: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  batch?: string;
  batchCode?: string;
};

function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
};

function initials(name: string = "") {
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (!parts.length) return "ST";
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "ST";
};

function clampText(v?: string) {
  const s = (v || "").trim();
  return s.length ? s : "—";
};

export default function StudentListClient({ batchCode }: { batchCode?: string }) {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;

    return students.filter((s) => {
      const hay = `${s.fullName || ""} ${s.email || ""} ${s.phone || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [students, q]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStudents() {
      if (!batchCode) {
        setStudents([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("batchCode", batchCode);
        if (q.trim()) params.set("search", q.trim());

        const res = await fetch(`${API_LMS_URL}/api/users/get-student-list?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Failed to load students");

        setStudents(Array.isArray(json?.data) ? json.data : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getErrorMessage(err));
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
    return () => controller.abort();
  }, [batchCode, q]);

  const countText = batchCode ? `${filtered.length} student${filtered.length === 1 ? "" : "s"}` : "—";

  return (
    <section className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with gradient accent */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-white/10 backdrop-blur-xl p-6 mb-8 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 animate-pulse-slow"></div>
          
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-float">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Students
                </h2>
              </div>
              <p className="text-sm text-slate-400 ml-0 sm:ml-13">
                View and search students assigned to a batch
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 px-4 py-2 transition-all duration-300 hover:scale-105 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="relative flex items-center gap-2">
                  <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-xs font-medium text-cyan-200">Batch:</span>
                  <span className="text-sm font-bold text-white">{batchCode || "—"}</span>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 px-4 py-2 transition-all duration-300 hover:scale-105 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="relative flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-bold text-white">{countText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="lg:col-span-8">
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Search Students
            </label>
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-30 blur transition-all duration-500"></div>
              <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-4 py-3.5 shadow-xl transition-all duration-300 focus-within:border-cyan-400/50 focus-within:ring-4 focus-within:ring-cyan-400/10 group-hover:border-white/20 group-hover:shadow-2xl">
                <svg className="h-5 w-5 text-slate-400 transition-all duration-300 group-focus-within:text-cyan-400 group-focus-within:scale-110" viewBox="0 0 24 24" fill="none">
                  <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>

                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, or phone…"
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                />

                {q.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="group/btn relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-red-500/10 to-pink-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition-all duration-300 hover:scale-105 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/20 active:scale-95 animate-fade-in"
                  >
                    <span className="relative z-10">Clear</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Search is applied server-side and updates as you type
            </p>
          </div>

          <div className="lg:col-span-4 flex items-end">
            <div className="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-5 shadow-xl transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Showing</p>
                  <p className="mt-1 text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{countText}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center animate-pulse-slow">
                  <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* States */}
        {!batchCode && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center animate-bounce-slow">
                <svg className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">No Batch Code Provided</p>
                <p className="mt-2 text-sm text-slate-400">
                  Open this page with{" "}
                  <span className="inline-flex items-center gap-1 font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
                    ?batchCode=LIN-OFF-20
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {batchCode && loading && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin"></div>
                <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-400 animate-spin-slow"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-100">Loading Students...</p>
                <p className="mt-1 text-sm text-slate-400">Fetching latest batch roster</p>
              </div>
            </div>
          </div>
        )}

        {batchCode && !loading && error && (
          <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl p-8 shadow-2xl shadow-red-500/20 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-red-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-red-200">Failed to Load Students</p>
                <p className="mt-1 text-sm text-red-100/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {batchCode && !loading && !error && filtered.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">No Results Found</p>
                <p className="mt-2 text-sm text-slate-400">
                  Try clearing the search or confirm the batch code is correct
                </p>
              </div>
              {q.trim() && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-6 py-3 text-sm font-semibold text-cyan-200 transition-all duration-300 hover:scale-105 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95"
                >
                  <span className="relative z-10">Clear Search</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {batchCode && !loading && !error && filtered.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-white/20">
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-6 py-4 border-b border-white/10">
                <p className="text-sm font-medium text-slate-300">
                  Showing <span className="text-lg font-bold text-cyan-400">{filtered.length}</span> students
                </p>
                <p className="text-xs text-slate-400">
                  Batch <span className="font-semibold text-cyan-300">{batchCode}</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950/50">
                      <th className="text-left font-bold text-slate-300 px-6 py-4 tracking-wide">STUDENT</th>
                      <th className="text-left font-bold text-slate-300 px-6 py-4 tracking-wide">EMAIL</th>
                      <th className="text-left font-bold text-slate-300 px-6 py-4 tracking-wide">PHONE</th>
                      <th className="text-left font-bold text-slate-300 px-6 py-4 tracking-wide">BATCH</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((s, idx) => {
                      const name = clampText(s.fullName);
                      const email = clampText(s.email);
                      const phone = clampText(s.phone);
                      const batch = clampText(s.batch || s.batchCode || batchCode);

                      return (
                        <tr
                          key={s._id || s.clerkId || `${email}-${idx}`}
                          className="group border-b border-white/5 transition-all duration-300 hover:bg-gradient-to-r hover:from-cyan-500/5 hover:via-blue-500/5 hover:to-transparent hover:border-cyan-500/30 cursor-pointer animate-fade-in"
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4 min-w-[280px]">
                              <div className="relative h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-cyan-500/50">
                                {initials(name)}
                                <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-100 truncate transition-colors duration-300 group-hover:text-cyan-300">{name}</p>
                                {s.clerkId ? (
                                  <p className="text-xs text-slate-500 mt-0.5 truncate transition-colors duration-300 group-hover:text-slate-400">
                                    ID: {String(s.clerkId).slice(0, 12)}…
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 mt-0.5"> </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="block max-w-[340px] text-slate-300 truncate transition-colors duration-300 group-hover:text-slate-100">
                              {email}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="block max-w-[200px] text-slate-300 truncate transition-colors duration-300 group-hover:text-slate-100">
                              {phone}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-500/40 group-hover:shadow-lg group-hover:shadow-cyan-500/20">
                              {batch}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-4 md:hidden">
              {filtered.map((s, idx) => {
                const name = clampText(s.fullName);
                const email = clampText(s.email);
                const phone = clampText(s.phone);
                const batch = clampText(s.batch || s.batchCode || batchCode);

                return (
                  <div
                    key={s._id || s.clerkId || `${email}-${idx}`}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-5 shadow-xl transition-all duration-500 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10 hover:scale-[1.02] cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    
                    <div className="relative flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-cyan-500/50">
                          {initials(name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-100 truncate transition-colors duration-300 group-hover:text-cyan-300">{name}</p>
                          <p className="text-xs text-slate-400 mt-1 truncate transition-colors duration-300 group-hover:text-slate-300">{email}</p>
                        </div>
                      </div>

                      <span className="shrink-0 inline-flex items-center rounded-full border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-500/40">
                        {batch}
                      </span>
                    </div>

                    <div className="relative grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-800/50 border border-white/10 p-4 transition-all duration-300 group-hover:bg-slate-800/70 group-hover:border-white/20">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                        <p className="text-sm font-semibold text-slate-100 mt-1 truncate">{phone}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-800/50 border border-white/10 p-4 transition-all duration-300 group-hover:bg-slate-800/70 group-hover:border-white/20">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID</p>
                        <p className="text-sm font-semibold text-slate-100 mt-1 truncate">
                          {s.clerkId ? String(s.clerkId).slice(0, 14) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.7s ease-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </section>
  );
}
