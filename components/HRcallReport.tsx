import { useEffect, useMemo, useState } from "react";

function HRCallReport() {
  // ======================
  // Types
  // ======================
  type Row = {
    DATE?: string;
    "STUDENT NAME"?: string;
    "NO OF CALLS"?: string;
    MAILS?: string;
    INTERVIEW?: string;
    ABSENT?: string;
    ASSESMENT?: string; // note: sheet may use "ASSESMENT" (misspelling)
    // NEW:
    INCOMING?: string | number;
    REMARK?: string;
  };

  type Status = "INTERVIEW" | "ABSENT" | "ASSESSMENT";

  // Centralized styles per status (card + badge)
  const STATUS_STYLES: Record<Status, { card: string; badge: string }> = {
    INTERVIEW: {
      card: "bg-fuchsia-600 text-white",
      badge: "bg-fuchsia-600/90 text-white",
    },
    ABSENT: {
      card: "bg-rose-600 text-white",
      badge: "bg-rose-600/90 text-white",
    },
    ASSESSMENT: {
      card: "bg-amber-400 text-black",
      badge: "bg-amber-400/90 text-black",
    },
  };

  // ======================
  // State
  // ======================
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // D/M/YYYY

  // ======================
  // Helpers
  // ======================
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Parse "D/M/YYYY" or "DD/MM/YYYY" into Date (local)
  const parseDMY = (dmy: string): Date | null => {
    const [d, m, y] = (dmy || "").split("/").map((n) => parseInt(n, 10));
    if (!d || !m || !y) return null;
    const dt = new Date(y, m - 1, d);
    return Number.isFinite(dt.valueOf()) ? dt : null;
  };

  // Format Date -> "D/M/YYYY"
  const formatDMY = (dt: Date) =>
    `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;

  // Convert "D/M/YYYY" -> "YYYY-MM-DD" (for <input type="date">)
  const dmyToInput = (dmy: string): string => {
    const [d, m, y] = dmy.split("/").map((n) => parseInt(n, 10));
    if (!d || !m || !y) return "";
    return `${y}-${pad2(m)}-${pad2(d)}`;
  };

  // Convert "YYYY-MM-DD" -> "D/M/YYYY"
  const inputToDMY = (iso: string): string => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };

  // ======================
  // Data load
  // ======================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("https://sheetdb.io/api/v1/7lyfccoteysho", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data: Row[] = await res.json();
        setRows(data || []);
      } catch (e: any) {
        setErr(`Failed to load: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ======================
  // Dates derived from sheet
  // ======================
  const allValidDates = useMemo(() => {
    // array of {raw: "D/M/YYYY", dt: Date}
    const out: { raw: string; dt: Date }[] = [];
    for (const r of rows) {
      const raw = (r.DATE || "").trim();
      if (!raw) continue;
      const dt = parseDMY(raw);
      if (dt) out.push({ raw: formatDMY(dt), dt }); // normalize "D/M/YYYY"
    }
    // unique by raw
    const map = new Map<string, Date>();
    for (const { raw, dt } of out) {
      if (!map.has(raw)) map.set(raw, dt);
    }
    // sort ascending by actual date
    return [...map.entries()]
      .map(([raw, dt]) => ({ raw, dt }))
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());
  }, [rows]);

  const latestDateDMY = useMemo(() => {
    if (!allValidDates.length) return null;
    return allValidDates[allValidDates.length - 1].raw; // D/M/YYYY
  }, [allValidDates]);

  const minDateInput = useMemo(() => {
    if (!allValidDates.length) return "";
    return dmyToInput(allValidDates[0].raw);
  }, [allValidDates]);

  const maxDateInput = useMemo(() => {
    if (!allValidDates.length) return "";
    return dmyToInput(allValidDates[allValidDates.length - 1].raw);
  }, [allValidDates]);

  // Set default (most recent) once rows are loaded
  useEffect(() => {
    if (!selectedDate && latestDateDMY) {
      setSelectedDate(latestDateDMY);
    }
  }, [latestDateDMY, selectedDate]);

  // ======================
  // Navigation (Prev / Next / Latest)
  // ======================
  const goByDays = (offset: number) => {
    if (!selectedDate) return;
    const cur = parseDMY(selectedDate);
    if (!cur) return;
    const next = new Date(cur);
    next.setDate(cur.getDate() + offset);
    const target = formatDMY(next);
    setSelectedDate(target);
  };

  const jumpToLatest = () => {
    if (latestDateDMY) setSelectedDate(latestDateDMY);
  };

  // ======================
  // Filtered items for selected date
  // ======================
  const items = useMemo(
    () =>
      rows
        .filter((r) => {
          if (!selectedDate) return false;
          const dt = parseDMY(r.DATE || "");
          if (!dt) return false;
          const normalized = formatDMY(dt);
          return normalized === selectedDate;
        })
        .sort((a, b) =>
          (a["STUDENT NAME"] || "").localeCompare(b["STUDENT NAME"] || "")
        ),
    [rows, selectedDate]
  );

  // ======================
  // UI
  // ======================
  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-white">HR Call Report</h3>
          <p className="text-white/70 text-sm">
            {selectedDate ? `Showing: ${selectedDate}` : "Pick a date"}
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2">
          {/* Prev */}
          <button
            type="button"
            onClick={() => goByDays(-1)}
            className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white hover:bg-white/15 transition"
            title="Previous day"
          >
            ←
          </button>

          {/* Native Date Picker */}
          <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 focus-within:ring-2 focus-within:ring-white/30">
            <input
              type="date"
              className="bg-transparent text-white outline-none"
              value={selectedDate ? dmyToInput(selectedDate) : ""}
              min={minDateInput || undefined}
              max={maxDateInput || undefined}
              onChange={(e) => {
                const iso = e.target.value; // YYYY-MM-DD
                const dmy = inputToDMY(iso);
                setSelectedDate(dmy || null);
              }}
            />
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={() => goByDays(1)}
            className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white hover:bg-white/15 transition"
            title="Next day"
          >
            →
          </button>

          {/* Latest */}
          <button
            type="button"
            onClick={jumpToLatest}
            className="rounded-xl bg-fuchsia-600 px-3 py-2 text-white font-semibold shadow hover:brightness-110 transition"
            title="Jump to most recent date in sheet"
          >
            Latest
          </button>
        </div>
      </div>

      {loading && <div className="text-white/80">Loading…</div>}
      {err && <div className="text-red-300">{err}</div>}
      {!loading && !err && !!selectedDate && !items.length && (
        <div className="text-white/70">No entries for {selectedDate}.</div>
      )}

      {!!items.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((r, i) => {
            const name = (r["STUDENT NAME"] || "—").trim();
            const calls = (r["NO OF CALLS"] ?? "").toString().trim();
            const mails = (r.MAILS ?? "").toString().trim();
            const incoming = (r.INCOMING ?? "").toString().trim();
            const remark = (r.REMARK ?? "").toString().trim();

            // Normalize status flags coming from the sheet
            const flags = [r.INTERVIEW, r.ABSENT, r.ASSESMENT].map((v) =>
              String(v ?? "")
                .trim()
                .toUpperCase()
            );

            // Choose the first non-empty flag
            const rawFlag = flags.find((v) => v.length > 0) || "";

            // Canonical status label
            let status: Status | null = null;
            if (rawFlag === "INTERVIEW") status = "INTERVIEW";
            else if (rawFlag === "ABSENT") status = "ABSENT";
            else if (rawFlag === "ASSESMENT" || rawFlag === "ASSESSMENT")
              status = "ASSESSMENT";

            const hasStatus = !!status;
            const hasIncoming = incoming !== "" && incoming !== "0";
            const showStats = calls !== "" || mails !== "" || hasIncoming;

            // Style for current status (if any)
            const style = status ? STATUS_STYLES[status] : undefined;

            return hasStatus && !showStats ? (
              // Status-only card (INTERVIEW / ABSENT / ASSESSMENT)
              <div
                key={name + i}
                className={`rounded-2xl p-6 shadow-lg ${
                  style?.card ?? "bg-fuchsia-600 text-white"
                }`}
              >
                <div className="text-xl font-extrabold tracking-wide">
                  {name}
                </div>
                <div className="mt-4 text-lg font-semibold">{status}</div>
                {remark && (
                  <p className="mt-3 text-sm/6 bg-white/15 rounded-lg px-3 py-2">
                    {remark}
                  </p>
                )}
              </div>
            ) : (
              // Stats card
              <div
                key={name + i}
                className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-6 text-white shadow-lg"
              >
                <div className="text-xl font-extrabold tracking-wide">
                  {name}
                </div>

                <div className="mt-4 space-y-2">
                  {calls !== "" && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📞</span>
                      <span className="text-lg">{calls} Calls</span>
                    </div>
                  )}
                  {hasIncoming && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⬅️</span>
                      <span className="text-lg">{incoming} Incoming</span>
                    </div>
                  )}
                  {mails !== "" && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✉️</span>
                      <span className="text-lg">{mails} Mails</span>
                    </div>
                  )}

                  {hasStatus && showStats && (
                    <span
                      className={`mt-2 inline-flex rounded-lg px-3 py-1 text-sm font-bold ${
                        style?.badge ?? "bg-fuchsia-600/90 text-white"
                      }`}
                    >
                      {status}
                    </span>
                  )}

                  {remark && (
                    <p className="mt-3 text-sm/6 text-white/90 bg-white/10 rounded-lg px-3 py-2">
                      {remark}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HRCallReport;
