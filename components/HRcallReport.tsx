import { useEffect, useMemo, useState } from "react";

function HRCallReport() {
  type Row = {
    DATE?: string;
    "STUDENT NAME"?: string;
    "NO OF CALLS"?: string;
    MAILS?: string;
    INTERVIEW?: string;
  };

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; // D/M/YYYY
  }, []);

  const items = useMemo(
    () =>
      rows
        .filter((r) => {
          const [a, b, y] = (r.DATE || "")
            .split("/")
            .map((n) => parseInt(n, 10));
          if (!a || !b || !y) return false;
          const normalized = `${a}/${b}/${y}`;
          return normalized === today;
        })
        .sort((a, b) =>
          (a["STUDENT NAME"] || "").localeCompare(b["STUDENT NAME"] || "")
        ),
    [rows, today]
  );

  return (
    <section className="mt-8">
      <h3 className="text-2xl font-bold text-white mb-4">
        HR Call Report (Today)
      </h3>

      {loading && <div className="text-white/80">Loading…</div>}
      {err && <div className="text-red-300">{err}</div>}
      {!loading && !err && !items.length && (
        <div className="text-white/70">No entries for today.</div>
      )}

      {!!items.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((r, i) => {
            const name = (r["STUDENT NAME"] || "—").trim();
            const calls = (r["NO OF CALLS"] || "").trim();
            const mails = (r.MAILS || "").trim();
            const hasInterview =
              (r.INTERVIEW || "").toUpperCase() === "INTERVIEW";
            const showStats = calls !== "" || mails !== "";

            return hasInterview && !showStats ? (
              <div
                key={name + i}
                className="rounded-2xl bg-fuchsia-600 text-white p-6 shadow-lg"
              >
                <div className="text-xl font-extrabold tracking-wide">
                  {name}
                </div>
                <div className="mt-4 text-lg font-semibold">INTERVIEW</div>
              </div>
            ) : (
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
                  {mails !== "" && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✉️</span>
                      <span className="text-lg">{mails} Mails</span>
                    </div>
                  )}
                  {hasInterview && showStats && (
                    <span className="mt-2 inline-flex rounded-lg bg-fuchsia-600/90 px-3 py-1 text-sm font-bold">
                      INTERVIEW
                    </span>
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
