"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

type ZoneKey = "blue" | "yellow" | "green";
type SubKey = "PS" | "DE" | "DS" | "DA";

type ZoneBreakdown = {
  total: number;
  subs: Record<SubKey, number>;
};

type ZoneCountMap = Record<ZoneKey, ZoneBreakdown>;

type ZoneMeta = {
  key: ZoneKey;
  label: string;
  card: string;
  text: string;
  number: string;
};

type SubMeta = {
  key: SubKey;
  pill: string;
};

const SUBS: SubMeta[] = [
  { key: "PS", pill: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30" },
  { key: "DE", pill: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" },
  { key: "DS", pill: "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30" },
  { key: "DA", pill: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30" },
];

type Student = {
  _id?: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
  joinedMonth?: string;
};

type ZoneCountApiValue = number | Partial<ZoneBreakdown>;

type ZoneCountResponse = {
  success: boolean;
  message?: string;
  data?: Partial<Record<ZoneKey, ZoneCountApiValue>>;
  total?: number;
};

function normalizeBreakdown(value: ZoneCountApiValue | undefined): ZoneBreakdown {
  if (value == null) {
    return { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } };
  }
  if (typeof value === "number") {
    return { total: value, subs: { ...EMPTY_BREAKDOWN.subs } };
  }
  return {
    total: value.total ?? 0,
    subs: {
      "PS": value.subs?.["PS"] ?? 0,
      DE: value.subs?.DE ?? 0,
      DS: value.subs?.DS ?? 0,
      DA: value.subs?.DA ?? 0,
    },
  };
}

type ZoneStudentsResponse = {
  success: boolean;
  message?: string;
  students?: Student[];
  data?: Student[];
};

const ZONES: ZoneMeta[] = [
  {
    key: "blue",
    label: "BLUE ZONE",
    card: "bg-blue-950/40 ring-1 ring-blue-500/40 hover:ring-blue-400/70",
    text: "text-blue-400",
    number: "text-blue-400",
  },
  {
    key: "yellow",
    label: "YELLOW ZONE",
    card: "bg-yellow-950/30 ring-1 ring-yellow-500/40 hover:ring-yellow-400/70",
    text: "text-yellow-400",
    number: "text-yellow-400",
  },
  {
    key: "green",
    label: "GREEN ZONE",
    card: "bg-emerald-950/30 ring-1 ring-emerald-500/40 hover:ring-emerald-400/70",
    text: "text-emerald-400",
    number: "text-emerald-400",
  },
];

const EMPTY_BREAKDOWN: ZoneBreakdown = {
  total: 0,
  subs: { "PS": 0, DE: 0, DS: 0, DA: 0 },
};

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}

export default function ZoneStudentAnalytics() {
  const [counts, setCounts] = useState<ZoneCountMap>({
    blue: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
    yellow: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
    green: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
  });

  const [total, setTotal] = useState<number>(0);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
  const [countsError, setCountsError] = useState<string>("");

  const [activeZone, setActiveZone] = useState<ZoneKey | null>(null);
  const [activeSub, setActiveSub] = useState<SubKey | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [studentsError, setStudentsError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function fetchZoneCounts() {
      try {
        setLoadingCounts(true);
        setCountsError("");

        if (!API_LMS_URL) {
          throw new Error("NEXT_PUBLIC_LMS_URL is missing in .env");
        }

        const res = await fetch(
          `${API_LMS_URL}/api/users/get-studentCount-by-zone`
        );

        const json = (await res.json()) as ZoneCountResponse;

        if (cancelled) return;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load zone counts");
        }

        setCounts({
          blue: normalizeBreakdown(json.data?.blue),
          yellow: normalizeBreakdown(json.data?.yellow),
          green: normalizeBreakdown(json.data?.green),
        });

        setTotal(json.total ?? 0);
      } catch (error: unknown) {
        if (!cancelled) {
          setCountsError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingCounts(false);
        }
      }
    }

    fetchZoneCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const openZone = async (zoneKey: ZoneKey, subKey: SubKey | null = null) => {
    setActiveZone(zoneKey);
    setActiveSub(subKey);
    setStudents([]);
    setStudentsError("");
    setLoadingStudents(true);

    try {
      if (!API_LMS_URL) {
        throw new Error("NEXT_PUBLIC_LMS_URL is missing in .env");
      }

      const subQuery = subKey ? `&sub=${encodeURIComponent(subKey)}` : "";
      const res = await fetch(
        `${API_LMS_URL}/api/users/get-students-by-zone?zone=${encodeURIComponent(
          zoneKey
        )}${subQuery}`
      );

      const json = (await res.json()) as ZoneStudentsResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load students");
      }

      setStudents(json.students ?? json.data ?? []);
    } catch (error: unknown) {
      setStudentsError(getErrorMessage(error));
    } finally {
      setLoadingStudents(false);
    }
  };

  const closeModal = () => {
    setActiveZone(null);
    setActiveSub(null);
    setStudents([]);
    setStudentsError("");
  };

  const activeMeta = ZONES.find((zone) => zone.key === activeZone);

  return (
    <>
      <div className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-slate-700/60">
       {countsError ? (
          <div className="text-sm text-red-400">{countsError}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ZONES.map((zone) => {
              const breakdown = counts[zone.key];
              return (
                <button
                  key={zone.key}
                  type="button"
                  onClick={() => openZone(zone.key)}
                  disabled={loadingCounts}
                  className={`group rounded-2xl ${zone.card} p-5 text-left transition disabled:opacity-60`}
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <span className={`text-sm font-bold tracking-wider ${zone.text}`}>
                      {zone.label}
                    </span>
                    <span className={`text-2xl font-bold leading-none ${zone.number}`}>
                      {loadingCounts ? (
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      ) : (
                        breakdown.total
                      )}
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {SUBS.map((sub) => (
                      <span
                        key={sub.key}
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          openZone(zone.key, sub.key);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            openZone(zone.key, sub.key);
                          }
                        }}
                        className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.pill} hover:brightness-125`}
                      >
                        {sub.key}: {breakdown.subs[sub.key]}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-slate-400">Tap to filter</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeZone ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-xl ring-1 ring-slate-700"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeMeta?.label ?? "Zone"} students`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/70 px-5 py-4">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    activeMeta?.number?.replace("text-", "bg-") ?? "bg-slate-400"
                  }`}
                />
                <h4 className="text-sm font-semibold text-slate-100">
                  {activeMeta?.label ?? "Zone"} Students
                  {activeSub ? ` — ${activeSub}` : ""}
                </h4>
                <span className="ml-2 text-xs text-slate-400">
                  ({students.length})
                </span>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close student list"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading students...
                </div>
              ) : studentsError ? (
                <div className="p-6 text-sm text-red-400">
                  {studentsError}
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No students found in this zone.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase text-slate-400 backdrop-blur">
                    <tr>
                      <th className="px-5 py-2 text-left font-medium">#</th>
                      <th className="px-5 py-2 text-left font-medium">Name</th>
                      <th className="px-5 py-2 text-left font-medium">Email</th>
                      <th className="px-5 py-2 text-left font-medium">
                        Joined
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student, index) => (
                      <tr
                        key={
                          student._id ??
                          student.clerkId ??
                          `${student.email}-${index}`
                        }
                        className="border-t border-slate-800 hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-2 text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-5 py-2 text-slate-100">
                          {student.fullName || "—"}
                        </td>
                        <td className="px-5 py-2 text-slate-300">
                          {student.email || "—"}
                        </td>
                        <td className="px-5 py-2 text-slate-400">
                          {student.joinedMonth || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}