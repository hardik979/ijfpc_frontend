"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

type ZoneKey = "blue" | "yellow" | "green" | "newly_enrolled";
type SubKey = "PS" | "DE" | "DS" | "DA";

type ZoneBreakdown = {
  total: number;
  subs: Record<SubKey, number>;
};

type ZoneCountMap = Record<ZoneKey, ZoneBreakdown>;

type ZoneMeta = {
  key: ZoneKey;
  label: string;
  dot: string;
};

type SubMeta = {
  key: SubKey;
  color: string;
};

// One hue per course, matching COURSE_COLORS in StudentList.tsx so a course
// reads the same everywhere on the page.
const SUBS: SubMeta[] = [
  { key: "PS", color: "#199e70" },
  { key: "DE", color: "#d95926" },
  { key: "DS", color: "#d55181" },
  { key: "DA", color: "#e66767" },
];

type Student = {
  _id?: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
  joinedMonth?: string;
  courses?: string[];
  isPaused?: boolean;
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
  { key: "blue", label: "Blue", dot: "#3987e5" },
  { key: "yellow", label: "Yellow", dot: "#c98500" },
  { key: "green", label: "Green", dot: "#1f9d1f" },
  { key: "newly_enrolled", label: "Newly enrolled", dot: "#9085e9" },
];

const EMPTY_BREAKDOWN: ZoneBreakdown = {
  total: 0,
  subs: { "PS": 0, DE: 0, DS: 0, DA: 0 },
};

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}

// The backend's Atlas connection occasionally drops mid-query; one retry
// after a short pause usually succeeds.
async function fetchJsonWithRetry<T extends { success: boolean; message?: string }>(
  url: string,
  retries = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      const json = (await res.json()) as T;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Request failed");
      }
      return json;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
  throw lastError;
}

export default function ZoneStudentAnalytics() {
  const [counts, setCounts] = useState<ZoneCountMap>({
    blue: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
    yellow: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
    green: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
    newly_enrolled: { ...EMPTY_BREAKDOWN, subs: { ...EMPTY_BREAKDOWN.subs } },
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
          newly_enrolled: normalizeBreakdown(json.data?.newly_enrolled),
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

  const subTotals = SUBS.map((sub) =>
    ZONES.reduce((sum, zone) => sum + counts[zone.key].subs[sub.key], 0)
  );

  const cellButton =
    "rounded-md px-2 py-1 text-sm tabular-nums transition hover:bg-[#8b5cf6]/15 hover:font-semibold hover:text-[#8b5cf6]";

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border border-[#312a63] bg-[#120f2d] p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-white">
            Active students by zone and course
          </h2>
          <p className="mt-0.5 text-xs text-[#a8a0d6]">
            Click any count to see those students
          </p>
        </div>

        {countsError ? (
          <div className="text-sm text-red-400">{countsError}</div>
        ) : loadingCounts ? (
          <div className="flex flex-1 items-center justify-center py-10 text-[#a8a0d6]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading zones...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <thead>
                <tr className="border-b border-[#312a63] text-[11px] font-semibold uppercase tracking-wider text-[#9a92c9]">
                  <th className="pb-2 pr-2 text-left font-semibold">Zone</th>
                  {SUBS.map((sub) => (
                    <th key={sub.key} className="pb-2 text-right font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: sub.color }}
                        />
                        {sub.key}
                      </span>
                    </th>
                  ))}
                  <th className="pb-2 text-right font-semibold">Total</th>
                  <th className="pb-2 pl-4 text-right font-semibold">
                    Share of active
                  </th>
                </tr>
              </thead>
              <tbody>
                {ZONES.map((zone) => {
                  const breakdown = counts[zone.key];
                  const share =
                    total > 0
                      ? Math.round((breakdown.total / total) * 100)
                      : 0;
                  return (
                    <tr
                      key={zone.key}
                      className="border-b border-[#312a63]/50 transition hover:bg-[#1b1640]/60"
                    >
                      <td className="whitespace-nowrap py-2.5 pr-2 font-medium text-white">
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full align-[1px]"
                          style={{ backgroundColor: zone.dot }}
                        />
                        {zone.label}
                      </td>
                      {SUBS.map((sub) => {
                        const value = breakdown.subs[sub.key];
                        return (
                          <td key={sub.key} className="py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => openZone(zone.key, sub.key)}
                              className={`${cellButton} ${
                                value === 0
                                  ? "text-[#9a92c9]"
                                  : "text-white"
                              }`}
                            >
                              {value}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => openZone(zone.key)}
                          className={`${cellButton} font-bold text-white`}
                        >
                          {breakdown.total}
                        </button>
                      </td>
                      <td className="py-2.5 pl-4">
                        <span className="flex items-center justify-end gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${share}%`,
                                backgroundColor: zone.dot,
                              }}
                            />
                          </span>
                          <span className="w-8 text-right text-xs text-[#a8a0d6]">
                            {share}%
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="text-sm font-semibold text-[#a8a0d6]">
                  <td className="pt-2.5 pr-2">All active</td>
                  {subTotals.map((value, i) => (
                    <td key={SUBS[i].key} className="pt-2.5 pr-2 text-right">
                      {value}
                    </td>
                  ))}
                  <td className="pt-2.5 pr-2 text-right font-bold text-white">
                    {total}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="mt-auto pt-3 text-[11px] text-[#9a92c9]">
          PS = Job-Assistance · DE = Data Engineering · DS = Data Science · DA =
          Data Analyst
        </p>
      </div>

      {activeZone ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#120f2d] shadow-xl ring-1 ring-[#312a63]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeMeta?.label ?? "Zone"} students`}
          >
            <div className="flex items-center justify-between border-b border-[#312a63] px-5 py-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeMeta?.dot ?? "#9a92c9" }}
                />
                <h4 className="text-sm font-semibold text-white">
                  {activeMeta?.label ?? "Zone"} zone students
                  {activeSub ? ` — ${activeSub}` : ""}
                </h4>
                <span className="ml-2 text-xs text-[#a8a0d6]">
                  ({students.length})
                </span>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-[#a8a0d6] hover:bg-[#1b1640] hover:text-white"
                aria-label="Close student list"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12 text-[#a8a0d6]">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading students...
                </div>
              ) : studentsError ? (
                <div className="p-6 text-sm text-red-400">
                  {studentsError}
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#a8a0d6]">
                  No students found in this zone.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#120f2d]/95 text-xs uppercase text-[#9a92c9] backdrop-blur">
                    <tr>
                      <th className="px-5 py-2 text-left font-medium">#</th>
                      <th className="px-5 py-2 text-left font-medium">Name</th>
                      <th className="px-5 py-2 text-left font-medium">Email</th>
                      <th className="px-5 py-2 text-left font-medium">
                        Course
                      </th>
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
                        className="border-t border-[#312a63]/60 hover:bg-[#1b1640]/60"
                      >
                        <td className="px-5 py-2 text-[#9a92c9]">
                          {index + 1}
                        </td>
                        <td className="px-5 py-2 text-white">
                          {student.fullName || "—"}
                          {student.isPaused ? (
                            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-amber-500/30">
                              Paused
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-2 text-[#a8a0d6]">
                          {student.email || "—"}
                        </td>
                        <td className="px-5 py-2">
                          {student.courses && student.courses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {student.courses.map((course) => (
                                <span
                                  key={course}
                                  className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-[#a8a0d6] ring-1 ring-[#312a63]"
                                >
                                  {course}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#9a92c9]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-2 text-[#9a92c9]">
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
