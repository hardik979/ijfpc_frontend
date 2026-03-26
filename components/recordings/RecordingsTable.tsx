import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { Recording } from "@/lib/types";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function RecordingsTable({ items }: { items: Recording[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-white/5 text-slate-300">
          <tr>
            <th className="px-6 py-4 font-semibold tracking-wider">Lead</th>
            <th className="px-6 py-4 font-semibold tracking-wider">Agent</th>
            <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
            <th className="px-6 py-4 font-semibold tracking-wider">Score</th>
            <th className="px-6 py-4 font-semibold tracking-wider">Created</th>
            <th className="px-6 py-4 font-semibold tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((r) => {
            const score =
              r.status === "DONE" ? (r.analysis?.overallScore ?? "—") : "—";
            return (
              <tr key={r._id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">
                  {r.leadId}
                </td>
                <td className="px-6 py-4 text-slate-400">{r.agentId || "—"}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-6 py-4 text-slate-300">{score}</td>
                <td className="px-6 py-4 text-slate-400">
                  {fmtDate(r.createdAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sales_team_dashboard/staff/recordings/${r._id}`}
                    className="glass-button text-xs py-1.5 px-3"
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td className="px-6 py-12 text-center text-slate-500" colSpan={6}>
                No recordings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
