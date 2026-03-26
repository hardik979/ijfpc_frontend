import ScoreBars from "./ScoreBars";

export default function AnalysisCard({ analysis }: { analysis?: any }) {
  if (!analysis) {
    return (
      <div className="glass-card p-4 text-sm text-slate-400">
        No analysis available yet.
      </div>
    );
  }

  const overall = analysis.overallScore ?? "—";
  const positives: string[] = analysis.positives || [];
  const improvements: string[] = analysis.improvements || [];
  const betterLines: string[] =
    analysis.betterLines || analysis.suggestedLines || []; // fallback
  const riskFlags = analysis.riskFlags || [];
  const objections = analysis.objections || [];

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-200">AI Scorecard</div>
          <div className="mt-1 text-xs text-slate-400">Overall score</div>
          <div className="mt-1 text-3xl font-semibold text-white">
            {overall}
          </div>
        </div>
        <div className="w-full max-w-sm">
          <ScoreBars categoryScores={analysis.categoryScores} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Positives
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-slate-300 marker:text-emerald-500">
            {positives.length ? (
              positives.map((p, i) => <li key={i}>{p}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Improvements
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-slate-300 marker:text-amber-500">
            {improvements.length ? (
              improvements.map((p, i) => <li key={i}>{p}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Better Lines
          </div>
          <ul className="mt-3 space-y-3 text-sm text-slate-300">
            {betterLines.length ? (
              betterLines.map((l: string, i: number) => (
                <li
                  key={i}
                  className="rounded-lg bg-white/5 p-3 border border-white/5"
                >
                  {l}
                </li>
              ))
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Summary
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            {analysis.summary || "—"}
          </p>
        </div>
      </div>

      {(riskFlags.length > 0 || objections.length > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Risk Flags (Compliance)
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {riskFlags.map((rf: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3"
                >
                  <div className="font-medium text-rose-200">{rf.flag}</div>
                  <div className="text-xs text-rose-300/70 mt-1">
                    Severity: {rf.severity}
                  </div>
                  <div className="mt-2 text-xs text-slate-300 italic">
                    “{rf.evidenceQuote}”
                  </div>
                </div>
              ))}
              {riskFlags.length === 0 && (
                <div className="text-sm text-slate-500">—</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Objections
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {objections.map((o: any, i: number) => (
                <div
                  key={i}
                  className="rounded-lg bg-white/5 border border-white/10 p-3"
                >
                  <div className="font-medium text-purple-200">
                    {o.objection}
                  </div>
                  <div className="mt-1 text-xs text-slate-400 italic">
                    “{o.evidenceQuote}”
                  </div>
                  <div className="mt-3 text-xs text-slate-500 uppercase tracking-wider">
                    Recommended response:
                  </div>
                  <div className="mt-1 text-sm">{o.recommendedResponse}</div>
                </div>
              ))}
              {objections.length === 0 && (
                <div className="text-sm text-slate-500">—</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
