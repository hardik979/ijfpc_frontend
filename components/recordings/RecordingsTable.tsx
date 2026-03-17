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
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const score =
              r.status === "DONE" ? (r.analysis?.overallScore ?? "—") : "—";
            return (
              <tr key={r._id} className="border-t">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {r.leadId}
                </td>
                <td className="px-4 py-3 text-slate-700">{r.agentId || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">{score}</td>
                <td className="px-4 py-3 text-slate-600">
                  {fmtDate(r.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/sales_team_dashboard/staff/recordings/${r._id}`}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                No recordings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
