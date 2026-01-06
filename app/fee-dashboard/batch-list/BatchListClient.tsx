"use client";

import React, { useEffect, useMemo, useState } from "react";

const LMS_ROUTES = "https://lms-backend-tgrh.onrender.com";

type ZoneKey = "blue" | "yellow" | "green";

type BatchItem = {
  _id?: string;
  batchCode?: string;
  zone?: ZoneKey | string;
  totalStudents?: number;
  trainerName?: string;
  startDate?: string;
};

type BatchesApiResponse = {
  message?: string;
  data?: BatchItem[];
};

function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

function zoneBadge(zone: string = ""): string {
  const z = String(zone).toLowerCase();
  if (z === "blue") return "border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-200";
  if (z === "yellow") return "border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-200";
  if (z === "green") return "border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-200";
  return "border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200";
}

function zoneGradient(zone: string = ""): string {
  const z = String(zone).toLowerCase();
  if (z === "blue") return "from-blue-500/10 via-blue-600/5 to-transparent";
  if (z === "yellow") return "from-yellow-500/10 via-yellow-600/5 to-transparent";
  if (z === "green") return "from-emerald-500/10 via-emerald-600/5 to-transparent";
  return "from-cyan-500/10 via-blue-500/5 to-transparent";
}

function zoneIcon(zone: string = ""): string {
  const z = String(zone).toLowerCase();
  if (z === "blue") return "from-blue-400 to-blue-600";
  if (z === "yellow") return "from-yellow-400 to-yellow-600";
  if (z === "green") return "from-emerald-400 to-emerald-600";
  return "from-cyan-400 to-blue-600";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function BatchListClient({ zone: zoneProp }: { zone?: string }) {
  const zone = (zoneProp || "").trim();

  const [loading, setLoading] = useState<boolean>(true);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    if (!zone) return;

    const controller = new AbortController();

    const fetchBatches = async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch(
          `${LMS_ROUTES}/api/preplacement/batch-according-Zone?zone=${encodeURIComponent(zone)}`,
          { signal: controller.signal, cache: "no-store" }
        );

        const json: BatchesApiResponse = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(json?.message || "Failed to fetch batches");

        setBatches(Array.isArray(json?.data) ? json.data : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getErrorMessage(err, "Failed to fetch batches"));
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
    return () => controller.abort();
  }, [zone]);

  const filtered = useMemo<BatchItem[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return batches;

    return batches.filter((b) => {
      const code = String(b.batchCode || "").toLowerCase();
      const trainer = String(b.trainerName || "").toLowerCase();
      const z = String(b.zone || "").toLowerCase();
      return code.includes(term) || z.includes(term) || trainer.includes(term);
    });
  }, [batches, q]);

  const totalStudentsInZone = useMemo<number>(() => {
    return filtered.reduce((sum, b) => sum + Number(b.totalStudents || 0), 0);
  }, [filtered]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-white/10 backdrop-blur-xl p-6 sm:p-8 mb-8 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 animate-pulse-slow"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${zoneIcon(zone)} flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-float`}>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Preplacement Management</p>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Batch Directory
                </h1>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">Viewing zone:</span>
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full border text-sm font-bold transition-all duration-300 hover:scale-105 ${zoneBadge(zone)}`}>
                    {zone ? zone.toUpperCase() : "—"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 px-4 py-2 transition-all duration-300 hover:scale-105 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div className="relative flex items-center gap-2">
                      <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-xs font-medium text-cyan-200">Batches:</span>
                      <span className="text-sm font-bold text-white">{loading ? "…" : filtered.length}</span>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 px-4 py-2 transition-all duration-300 hover:scale-105 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div className="relative flex items-center gap-2">
                      <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-xs font-medium text-purple-200">Students:</span>
                      <span className="text-sm font-bold text-white">{loading ? "…" : totalStudentsInZone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="w-full lg:w-[400px]">
                <label className="block text-sm font-semibold text-slate-300 mb-3">Search Batches</label>
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-30 blur transition-all duration-500"></div>
                  <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-4 py-3 shadow-xl transition-all duration-300 focus-within:border-cyan-400/50 focus-within:ring-4 focus-within:ring-cyan-400/10 group-hover:border-white/20">
                    <svg className="h-5 w-5 text-slate-400 transition-all duration-300 group-focus-within:text-cyan-400 group-focus-within:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search by batch code or trainer..."
                      className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                    />
                    {q.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setQ("")}
                        className="group/btn relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-red-500/10 to-pink-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition-all duration-300 hover:scale-105 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/20 active:scale-95 animate-fade-in"
                      >
                        <span className="relative z-10">Clear</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No zone provided */}
        {!zone && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center animate-bounce-slow">
                <svg className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">Zone Not Provided</p>
                <p className="mt-2 text-sm text-slate-400">
                  Open this page with a zone parameter:
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="font-mono text-blue-300 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">?zone=blue</span>
                  <span className="font-mono text-yellow-300 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">?zone=yellow</span>
                  <span className="font-mono text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">?zone=green</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {zone && loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="h-5 w-32 bg-white/10 rounded-lg" />
                <div className="mt-4 h-8 w-24 bg-white/10 rounded-lg" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="h-20 bg-white/10 rounded-2xl" />
                  <div className="h-20 bg-white/10 rounded-2xl" />
                </div>
                <div className="mt-4 h-4 w-40 bg-white/10 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {zone && !loading && error && (
          <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-pink-500/10 backdrop-blur-xl p-8 shadow-2xl shadow-red-500/20 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-red-500/20 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-red-200">Failed to Load Batches</p>
                <p className="mt-1 text-sm text-red-100/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {zone && !loading && !error && filtered.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">No Batches Found</p>
                <p className="mt-2 text-sm text-slate-400">
                  Try clearing search or verify the zone value
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

        {/* Batch Cards */}
        {zone && !loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b, idx) => {
              const key = b._id || b.batchCode || `batch-${idx}`;
              const studentListUrl = b.batchCode
                ? `/fee-dashboard/student-list?batchCode=${encodeURIComponent(b.batchCode)}`
                : '#';

              return (
                <a
                  key={key}
                  href={studentListUrl}
                  onClick={(e) => {
                    if (!b.batchCode) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  className="group relative text-left rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl overflow-hidden shadow-xl transition-all duration-500 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10 hover:scale-[1.02] animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                  {/* Zone accent bar */}
                  <div className={`h-2 w-full bg-gradient-to-r ${zoneGradient(zone)}`}></div>

                  <div className="relative p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Batch Code</p>
                        <p className="text-xl font-bold text-slate-100 truncate transition-colors duration-300 group-hover:text-cyan-300">
                          {b.batchCode || "—"}
                        </p>
                      </div>

                      <span className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-300 group-hover:scale-105 ${zoneBadge(String(b.zone || zone))}`}>
                        {String(b.zone || zone || "—").toUpperCase()}
                      </span>
                    </div>

                    {/* Trainer */}
                    <div className="mb-5">
                      <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Trainer</p>
                      <p className="text-lg font-semibold text-slate-200 truncate transition-colors duration-300 group-hover:text-slate-100">
                        {b.trainerName || "—"}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="rounded-2xl bg-slate-800/50 border border-white/10 p-4 transition-all duration-300 group-hover:bg-slate-800/70 group-hover:border-cyan-500/20 group-hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{Number(b.totalStudents || 0)}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-800/50 border border-white/10 p-4 transition-all duration-300 group-hover:bg-slate-800/70 group-hover:border-cyan-500/20 group-hover:scale-105">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-100">{formatDate(b.startDate)}</p>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 transition-all duration-300 group-hover:border-cyan-500/40 group-hover:from-cyan-500/15 group-hover:to-blue-500/15">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-sm font-semibold text-cyan-200">View Students</span>
                      </div>
                      <svg className="h-5 w-5 text-cyan-400 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              );
            })}
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

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
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
      `}</style>
    </div>
  );
}
