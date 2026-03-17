import ScoreBars from "./ScoreBars";

export default function AnalysisCard({ analysis }: { analysis?: any }) {
  if (!analysis) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
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
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-900">AI Scorecard</div>
          <div className="mt-1 text-xs text-slate-500">Overall score</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {overall}
          </div>
        </div>
        <div className="w-full max-w-sm">
          <ScoreBars categoryScores={analysis.categoryScores} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="text-xs font-semibold text-slate-600">Positives</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {positives.length ? (
              positives.map((p, i) => <li key={i}>{p}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs font-semibold text-slate-600">
            Improvements
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {improvements.length ? (
              improvements.map((p, i) => <li key={i}>{p}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3">
          <div className="text-xs font-semibold text-slate-600">
            Better Lines
          </div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {betterLines.length ? (
              betterLines.map((l: string, i: number) => (
                <li key={i} className="rounded-md bg-slate-50 p-2">
                  {l}
                </li>
              ))
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </ul>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs font-semibold text-slate-600">Summary</div>
          <p className="mt-2 text-sm text-slate-700">
            {analysis.summary || "—"}
          </p>
        </div>
      </div>

      {(riskFlags.length > 0 || objections.length > 0) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-slate-600">
              Risk Flags (Compliance)
            </div>
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              {riskFlags.map((rf: any, i: number) => (
                <div key={i} className="rounded-md bg-rose-50 p-2">
                  <div className="font-medium">{rf.flag}</div>
                  <div className="text-xs text-slate-600">
                    Severity: {rf.severity}
                  </div>
                  <div className="mt-1 text-xs text-slate-700">
                    “{rf.evidenceQuote}”
                  </div>
                </div>
              ))}
              {riskFlags.length === 0 && (
                <div className="text-sm text-slate-500">—</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-slate-600">
              Objections
            </div>
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              {objections.map((o: any, i: number) => (
                <div key={i} className="rounded-md bg-slate-50 p-2">
                  <div className="font-medium">{o.objection}</div>
                  <div className="mt-1 text-xs text-slate-700">
                    “{o.evidenceQuote}”
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    Recommended response:
                  </div>
                  <div className="text-sm">{o.recommendedResponse}</div>
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
