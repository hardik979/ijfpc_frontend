"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {API_LMS_URL} from '@/lib/api'

// -------------------- Types --------------------
type ZoneKey = "blue" | "yellow" | "green";

type ZoneCounts = Record<ZoneKey, number> & {
  totalBatches: number;
};

type StudentZoneCounts = Record<ZoneKey, number> & {
  totalStudents: number;
};

type ApiResponse = {
  message?: string;
  batches: ZoneCounts;
  students: StudentZoneCounts;
};

function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

export default function ZoneListPage(): JSX.Element {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [batches, setBatches] = useState<ZoneCounts>({
    blue: 0,
    yellow: 0,
    green: 0,
    totalBatches: 0,
  });

  const [students, setStudents] = useState<StudentZoneCounts>({
    blue: 0,
    yellow: 0,
    green: 0,
    totalStudents: 0,
  });

  async function getZoneData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_LMS_URL}/api/preplacement/batch-count-by-zone`, {
        cache: "no-store",
      });

      const json: ApiResponse = await res.json().catch(() => {
        // fallback object to avoid TS issues if JSON parse fails
        return {
          message: "Invalid response",
          batches: { blue: 0, yellow: 0, green: 0, totalBatches: 0 },
          students: { blue: 0, yellow: 0, green: 0, totalStudents: 0 },
        };
      });

      if (!res.ok) throw new Error(json?.message || "Failed to fetch zone data");

      setBatches(json.batches);
      setStudents(json.students);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to fetch zone data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getZoneData();
  }, []);

  const zones = useMemo<ZoneKey[]>(() => ["blue", "yellow", "green"], []);

  const colorMap: Record<ZoneKey | "total", string> = {
    blue: "from-blue-600/90 to-blue-500/70",
    yellow: "from-yellow-500/90 to-amber-400/70",
    green: "from-emerald-600/90 to-emerald-500/70",
    total: "from-purple-600/90 to-fuchsia-500/70",
  };

  const goToZone = (z: ZoneKey) => {
    router.push(`/fee-dashboard/batch-list?zone=${z}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Zone Overview</h2>
          <p className="text-sm text-white">Batches and Students by zone</p>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
          Loading…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          {error}
        </div>
      )}

      {/* Zone Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {zones.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => goToZone(z)}
              className={`text-left rounded-2xl p-6 shadow-sm border border-white/20 bg-gradient-to-br ${colorMap[z]} text-white hover:scale-[1.01] active:scale-[0.99] transition`}
            >
              <p className="text-sm uppercase tracking-wide opacity-90">{z} zone</p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                  <p className="text-xs opacity-85">Batches</p>
                  <p className="text-3xl font-bold mt-1">{batches[z]}</p>
                </div>

                <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                  <p className="text-xs opacity-85">Students</p>
                  <p className="text-3xl font-bold mt-1">{students[z]}</p>
                </div>
              </div>

              <p className="mt-4 text-xs opacity-80">Click to view students</p>
            </button>
          ))}

          {/* Totals card (not clickable) */}
          <div
            className={`rounded-2xl p-6 shadow-sm border border-slate-200 bg-gradient-to-br ${colorMap.total} text-white`}
          >
            <p className="text-sm uppercase tracking-wide opacity-90">Totals</p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <p className="text-xs opacity-85">Total Batches</p>
                <p className="text-3xl font-bold mt-1">{batches.totalBatches}</p>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                <p className="text-xs opacity-85">Total Students</p>
                <p className="text-3xl font-bold mt-1">{students.totalStudents}</p>
              </div>
            </div>

            <p className="mt-4 text-xs opacity-80">Not clickable</p>
          </div>
        </div>
      )}
    </div>
  );
}
