"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Mail, Clock, RefreshCw, BadgeCheck } from "lucide-react";

/** =========================
 *  CONFIG
 *  ========================= */
const API_URL = "https://sheetdb.io/api/v1/7lyfccoteysho"; // ← put your endpoint here
// If you’re hitting SheetDB directly, e.g.:
// const API_URL = "https://sheetdb.io/api/v1/<id>?sheet=HR%20Calls";

/** =========================
 *  TYPES (from your sheet)
 *  ========================= */
type SheetRow = {
  DATE?: string;
  "STUDENT NAME"?: string;
  CALLS?: string | number;
  MAILS?: string | number;
  INTERVIEW?: string;
  INCOMING?: string | number;
  ABSENT?: string;
  ASSESSMENT?: string; // some sheets use this
  ASSESMENT?: string; // misspelling seen in some tabs
};

type Entry = {
  dateISO: string; // YYYY-MM-DD
  student: string;
  calls: number;
  mails: number;
  interview: boolean;
  absent: boolean;
  assessment: boolean;
};

/** =========================
 *  DATE HELPERS
 *  ========================= */

/** normalize most common sheet date strings to YYYY-MM-DD */
function normalizeDate(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();

  // DD/MM/YY or DD/MM/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const yy = m[3];
    const yyyy =
      yy.length === 2 ? (Number(yy) < 50 ? "20" + yy : "19" + yy) : yy;
    return `${yyyy}-${mo}-${d}`;
  }

  // DD-MM-YY or DD-MM-YYYY
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const yy = m[3];
    const yyyy =
      yy.length === 2 ? (Number(yy) < 50 ? "20" + yy : "19" + yy) : yy;
    return `${yyyy}-${mo}-${d}`;
  }

  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // fallback: Date parse
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);

  return null;
}

function formatPretty(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

/** =========================
 *  SHEET -> ENTRY MAPPER
 *  ========================= */
const toNumber = (x: any): number => {
  if (x == null || x === "") return 0;
  if (typeof x === "number") return x;
  const n = parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function mapRow(r: SheetRow): Entry | null {
  const dateISO = normalizeDate(r.DATE ?? "");
  if (!dateISO) return null;

  const student = (r["STUDENT NAME"] || "").toString().trim();
  if (!student) return null;

  const calls = toNumber(r.CALLS);
  const mails = toNumber(r.MAILS);

  const interview =
    String(r.INTERVIEW || "")
      .trim()
      .toUpperCase() === "INTERVIEW";
  const absent =
    String(r.ABSENT || "")
      .trim()
      .toUpperCase() === "ABSENT";
  // support either spelling
  const assessmentRaw = String((r.ASSESSMENT ?? r.ASSESMENT) || "")
    .trim()
    .toUpperCase();
  const assessment =
    assessmentRaw === "ASSESSMENT" || assessmentRaw === "EVALUATION";

  return { dateISO, student, calls, mails, interview, absent, assessment };
}

/** =========================
 *  UI STYLES
 *  ========================= */
const badge = (className = "") =>
  `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`;

const STATUS_STYLES = {
  INTERVIEW: badge("bg-fuchsia-600 text-white"),
  ABSENT: badge("bg-rose-600 text-white"),
  ASSESSMENT: badge("bg-amber-500 text-black"),
};

const CARD_BASE =
  "rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-5";

/** =========================
 *  MAIN COMPONENT
 *  ========================= */
export default function HRCallReportPage() {
  const [all, setAll] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // selected date in ISO; default to "latest in data"
  const [selectedISO, setSelectedISO] = useState<string>("");

  // fetch all + derive latest date
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: SheetRow[] = await res.json();

        const entries = json.map(mapRow).filter(Boolean) as Entry[];

        // find latest date present in data
        const latest = entries
          .map((e) => e.dateISO)
          .filter(Boolean)
          .sort((a, b) => (a < b ? 1 : -1))[0];

        setAll(entries);
        setSelectedISO(
          (prev) => prev || latest || new Date().toISOString().slice(0, 10)
        );
      } catch (e: any) {
        setErr(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const datesAvailable = useMemo(() => {
    const set = new Set(all.map((e) => e.dateISO));
    return Array.from(set).sort(); // oldest → newest
  }, [all]);

  const latestDate = datesAvailable[datesAvailable.length - 1];

  const rowsForSelected = useMemo(() => {
    if (!selectedISO) return [];
    return all.filter((e) => e.dateISO === selectedISO);
  }, [all, selectedISO]);

  // group by student (some sheets may have multiple entries per day)
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of rowsForSelected) {
      const k = e.student.toUpperCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    // reduce to one display row per student
    return Array.from(map.entries()).map(([studentKey, arr]) => {
      const first = arr[0];
      const mails = arr.reduce((s, r) => s + r.mails, 0);
      const calls = arr.reduce((s, r) => s + r.calls, 0);
      const interview = arr.some((r) => r.interview);
      const absent = arr.some((r) => r.absent);
      const assessment = arr.some((r) => r.assessment);
      return {
        dateISO: first.dateISO,
        student: first.student,
        mails,
        calls,
        interview,
        absent,
        assessment,
      };
    });
  }, [rowsForSelected]);

  /** ====== UI ====== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#241b72] via-[#3b228a] to-[#8a1dac] flex items-center justify-center text-white/90">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading HR Call Report…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#241b72] via-[#3b228a] to-[#8a1dac] flex items-center justify-center text-white/90 p-6">
        <div className="max-w-md w-full bg-white/10 border border-white/15 rounded-2xl p-6 text-center">
          <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <p className="font-semibold mb-1">Couldn’t load data</p>
          <p className="text-white/70 text-sm">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#241b72] via-[#3b228a] to-[#8a1dac] p-6">
      <div className="max-w-6xl mx-auto">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-extrabold">
              HR Call Report
            </h1>
            <p className="text-white/70">
              Showing:{" "}
              <span className="font-semibold">{formatPretty(selectedISO)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* back one day */}
            <button
              className="px-3 py-2 rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/15"
              onClick={() => {
                const idx = datesAvailable.indexOf(selectedISO);
                if (idx > 0) setSelectedISO(datesAvailable[idx - 1]);
              }}
              title="Previous date in data"
            >
              &lt;
            </button>

            {/* date input */}
            <div className="relative">
              <Calendar className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                className="pl-9 pr-3 py-2 rounded-xl bg-white/10 text-white border border-white/15 outline-none"
                value={selectedISO}
                onChange={(e) => setSelectedISO(e.target.value)}
              />
            </div>

            {/* forward one day */}
            <button
              className="px-3 py-2 rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/15 disabled:opacity-50"
              onClick={() => {
                const idx = datesAvailable.indexOf(selectedISO);
                if (idx >= 0 && idx < datesAvailable.length - 1)
                  setSelectedISO(datesAvailable[idx + 1]);
              }}
              disabled={selectedISO === latestDate}
              title="Next date in data"
            >
              &gt;
            </button>

            {/* latest */}
            <button
              className="px-4 py-2 rounded-xl bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-500"
              onClick={() => latestDate && setSelectedISO(latestDate)}
              title="Jump to latest available date"
            >
              Latest
            </button>
          </div>
        </div>

        {/* content */}
        {grouped.length === 0 ? (
          <div className="text-white/80 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            No entries found for {formatPretty(selectedISO)}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {grouped.map((g) => (
              <div key={g.student} className={`${CARD_BASE}`}>
                <div className="mb-3">
                  <div className="text-white font-extrabold text-lg tracking-wide">
                    {g.student.toUpperCase()}
                  </div>
                </div>

                {/* status badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {g.interview && (
                    <span className={STATUS_STYLES.INTERVIEW}>INTERVIEW</span>
                  )}
                  {g.assessment && (
                    <span className={STATUS_STYLES.ASSESSMENT}>ASSESSMENT</span>
                  )}
                  {g.absent && (
                    <span className={STATUS_STYLES.ABSENT}>ABSENT</span>
                  )}
                  {!g.interview && !g.assessment && !g.absent && (
                    <span
                      className={badge(
                        "bg-white/10 text-white/80 border border-white/15"
                      )}
                    >
                      No Interview
                    </span>
                  )}
                </div>

                {/* mails / calls */}
                <div className="flex items-center gap-4 text-white/85">
                  {g.mails > 0 && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 opacity-80" />
                      <span className="text-sm">{g.mails} Mails</span>
                    </div>
                  )}
                  {g.calls > 0 && (
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 opacity-80" />
                      <span className="text-sm">{g.calls} Calls</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* footer hint */}
        <div className="mt-6 text-xs text-white/60">
          Tip: Use the date arrows or the “Latest” button to jump between days
          that actually have data. Dates are normalized, so Sheet entries like{" "}
          <code>30/09/25</code> will match the picker’s <code>2025-09-30</code>.
        </div>
      </div>
    </div>
  );
}
