"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, RefreshCw, Search, Table as TableIcon, Download } from "lucide-react";

type Course = { _id: string; title?: string };

type Student = {
  _id: string;
  fullName?: string;
  email?: string;
  zone?: string;
  isPlaced?: boolean;
};

type Session = { _id?: string; topic?: string; time?: string };

type Batch = {
  _id: string;
  batch?: string;
  status?: string;
  topic?: string;
  trainerName?: string;
  classRoom?: string;
  classDate?: string;
  classTime?: string;
  sessions?: Session[];
  course?: Course | string | null;
  students?: Student[];
  createdAt?: string;
};

const ZONES = ["blue", "yellow", "green"] as const;
type ZoneFilter = "all" | (typeof ZONES)[number];

const topicLabel = (t?: string) => (t ? t.replace(/_/g, " ") : "—");

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const fmtTime = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

// Format a "YYYY-MM-DD" string without timezone drift
const fmtDateOnly = (ymd?: string) => {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

// Solid block tint by (batch-level) zone
const zoneRowClass = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/15";
  if (z === "yellow") return "bg-yellow-500/15";
  if (z === "green") return "bg-emerald-500/15";
  return "";
};

// Small zone chip
const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return "bg-blue-500/20 text-blue-700 ring-1 ring-blue-500/40";
  if (z === "yellow") return "bg-yellow-500/20 text-yellow-700 ring-1 ring-yellow-500/40";
  if (z === "green") return "bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/40";
  return "bg-slate-500/15 text-slate-700 ring-1 ring-slate-500/30";
};

const courseTitle = (course: Batch["course"]) => {
  if (!course || typeof course === "string") return "";
  return course.title || "";
};

// A batch's zone = the most common zone among its students (batches are
// normally a single zone, so this is uniform in practice).
const deriveZone = (students: Student[]): string | undefined => {
  const counts: Record<string, number> = {};
  for (const s of students) {
    const z = (s.zone || "").toLowerCase();
    if (z) counts[z] = (counts[z] || 0) + 1;
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [z, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = z;
      bestN = n;
    }
  }
  return best;
};

type Group = {
  key: string;
  batchId: string;
  time: string;
  date: string;
  trainer: string;
  batchNo: string;
  topic: string;
  classRoom: string;
  zone?: string;
  count: number;
  students: string[];
};

export default function BatchOverview() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState<ZoneFilter>("all");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_LMS_URL}/api/batches/overview`, {
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load overview");
      setBatches(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load overview");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo<Group[]>(() => {
    const q = search.trim().toLowerCase();
    const out: Group[] = [];

    for (const b of batches) {
      const allStudents = b.students || [];
      const dzone = deriveZone(allStudents);

      if (zone !== "all" && dzone !== zone) continue;

      const sess = (b.sessions || []).filter((s) => (s.topic || "").trim() || (s.time || "").trim());

      const batchMatches =
        !q ||
        (b.batch || "").toLowerCase().includes(q) ||
        (b.trainerName || "").toLowerCase().includes(q) ||
        topicLabel(b.topic).toLowerCase().includes(q) ||
        courseTitle(b.course).toLowerCase().includes(q) ||
        (b.classRoom || "").toLowerCase().includes(q) ||
        sess.some((s) => topicLabel(s.topic).toLowerCase().includes(q));

      let names: string[];
      if (batchMatches) {
        names = allStudents.map((s) => s.fullName || "Unnamed student");
      } else {
        names = allStudents
          .filter((s) => (s.fullName || "").toLowerCase().includes(q))
          .map((s) => s.fullName || "Unnamed student");
        if (names.length === 0) continue; // nothing in this batch matched the search
      }

      const date = b.classDate?.trim() ? fmtDateOnly(b.classDate) : fmtDate(b.createdAt);
      const shared = {
        batchId: b._id,
        date,
        trainer: b.trainerName || "—",
        batchNo: b.batch || "—",
        classRoom: b.classRoom || "—",
        zone: dzone,
        count: allStudents.length,
        students: names,
      };

      if (sess.length > 0) {
        // One block per class in the day's timetable
        sess.forEach((s, si) => {
          out.push({
            ...shared,
            key: `${b._id}-s${si}`,
            time: s.time?.trim() ? s.time : b.classTime?.trim() ? b.classTime : fmtTime(b.createdAt),
            topic: topicLabel(s.topic),
          });
        });
      } else {
        // Fallback: single block from the batch's primary topic/time
        out.push({
          ...shared,
          key: `${b._id}-p`,
          time: b.classTime?.trim() ? b.classTime : fmtTime(b.createdAt),
          topic: topicLabel(b.topic),
        });
      }
    }

    return out;
  }, [batches, search, zone]);

  const rowCount = useMemo(
    () => groups.reduce((n, g) => n + Math.max(g.students.length, 1), 0),
    [groups]
  );

  const zoneCounts = useMemo(() => {
    const counts = { blue: 0, yellow: 0, green: 0, other: 0, total: 0 };
    for (const b of batches) {
      const z = deriveZone(b.students || []);
      counts.total++;
      if (z === "blue") counts.blue++;
      else if (z === "yellow") counts.yellow++;
      else if (z === "green") counts.green++;
      else counts.other++;
    }
    return counts;
  }, [batches]);

  const HEADERS = [
    "Time",
    "Batch Date",
    "Trainer's Name",
    "Batch No.",
    "Topic",
    "Venue",
    "Zone",
    "No. of Student",
    "Student Name",
  ];

  const exportCsv = () => {
    const dataRows: (string | number)[][] = [];
    for (const g of groups) {
      const names = g.students.length ? g.students : ["—"];
      for (const name of names) {
        dataRows.push([g.time, g.date, g.trainer, g.batchNo, g.topic, g.classRoom, g.zone || "", g.count, name]);
      }
    }
    if (dataRows.length === 0) {
      toast.info("Nothing to export for the current filter.");
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [HEADERS.map(esc).join(","), ...dataRows.map((r) => r.map(esc).join(","))];
    // Prepend BOM so Excel reads UTF-8 correctly
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Shared cell border for the gridline look
  const cell = "border border-[var(--panel-border)] px-4 py-2.5 align-middle";

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[var(--panel-bg-950)] via-[var(--panel-bg-950)] to-[var(--panel-bg-900)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/batch-section")}
            className="group inline-flex items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] backdrop-blur-sm transition-all hover:text-[var(--panel-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Batches</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
                <TableIcon className="h-7 w-7 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--panel-text-primary)] sm:text-4xl">
                Batch Overview
              </h1>
              <p className="mt-1 text-sm text-[var(--panel-text-muted)]">
                {loading
                  ? "Loading…"
                  : `${groups.length} class block${groups.length === 1 ? "" : "s"} · ${rowCount} student row${rowCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={exportCsv}
              disabled={loading || groups.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={load}
              title="Refresh"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] text-[var(--panel-text-secondary)] transition hover:text-[var(--panel-text-primary)]"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Legend + filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, batch, trainer, topic…"
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-3 pl-10 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] p-1">
            {(["all", ...ZONES] as ZoneFilter[]).map((z) => {
              const active = zone === z;
              const label =
                z === "all"
                  ? `All (${zoneCounts.total})`
                  : z === "blue"
                  ? `Blue (${zoneCounts.blue})`
                  : z === "yellow"
                  ? `Yellow (${zoneCounts.yellow})`
                  : `Green (${zoneCounts.green})`;
              const dot =
                z === "blue"
                  ? "bg-blue-500"
                  : z === "yellow"
                  ? "bg-yellow-500"
                  : z === "green"
                  ? "bg-emerald-500"
                  : "bg-slate-400";
              return (
                <button
                  key={z}
                  onClick={() => setZone(z)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                    active
                      ? "bg-[var(--panel-card)] text-[var(--panel-text-primary)]"
                      : "text-[var(--panel-text-muted)] hover:text-[var(--panel-text-secondary)]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border border-white/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {HEADERS.map((h) => (
                        <td key={h} className={cell}>
                          <div className="h-4 w-full animate-pulse rounded bg-[var(--panel-card)]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={HEADERS.length} className="px-4 py-16 text-center text-sm text-[var(--panel-text-muted)]">
                      No rows match your search / filter.
                    </td>
                  </tr>
                ) : (
                  groups.flatMap((g) => {
                    const names = g.students.length ? g.students : ["—"];
                    const span = names.length;
                    const tint = zoneRowClass(g.zone);
                    return names.map((name, idx) => (
                      <tr key={`${g.key}-${idx}`} className={tint}>
                        {idx === 0 && (
                          <>
                            <td rowSpan={span} className={`${cell} whitespace-nowrap text-center font-medium text-[var(--panel-text-secondary)]`}>
                              {g.time}
                            </td>
                            <td rowSpan={span} className={`${cell} whitespace-nowrap text-center text-[var(--panel-text-secondary)]`}>
                              {g.date}
                            </td>
                            <td rowSpan={span} className={`${cell} whitespace-nowrap font-medium text-[var(--panel-text-primary)]`}>
                              {g.trainer}
                            </td>
                            <td rowSpan={span} className={`${cell} whitespace-nowrap text-center font-semibold text-[var(--panel-text-primary)]`}>
                              {g.batchNo}
                            </td>
                            <td rowSpan={span} className={`${cell} text-center text-[var(--panel-text-secondary)]`}>
                              {g.topic}
                            </td>
                            <td rowSpan={span} className={`${cell} text-center text-[var(--panel-text-secondary)]`}>
                              {g.classRoom}
                            </td>
                            <td rowSpan={span} className={`${cell} text-center`}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${zoneBadge(g.zone)}`}>
                                {g.zone || "—"}
                              </span>
                            </td>
                            <td rowSpan={span} className={`${cell} text-center text-base font-bold text-[var(--panel-text-primary)]`}>
                              {g.count}
                            </td>
                          </>
                        )}
                        <td className={`${cell} whitespace-nowrap text-center font-medium text-[var(--panel-text-primary)]`}>
                          {name}
                        </td>
                      </tr>
                    ));
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
