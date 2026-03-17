export default function ScoreBars({
  categoryScores,
}: {
  categoryScores?: Record<string, number>;
}) {
  const entries = Object.entries(categoryScores || {});
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => {
        const pct = Math.max(0, Math.min(100, (Number(v) / 20) * 100));
        return (
          <div key={k}>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="capitalize">{k}</span>
              <span className="font-medium text-slate-900">{v}/20</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
