"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { RecordingStatus } from "@/lib/types";

const statuses: (RecordingStatus | "ALL")[] = [
  "ALL",
  "UPLOADED",
  "TRANSCRIBING",
  "CLEANING",
  "ANALYZING",
  "DONE",
  "FAILED",
];

export default function FiltersBar() {
  const router = useRouter();
  const sp = useSearchParams();

  const initial = useMemo(() => {
    return {
      status: (sp.get("status") as any) || "ALL",
      leadId: sp.get("leadId") || "",
      agentId: sp.get("agentId") || "",
    };
  }, [sp]);

  const [status, setStatus] = useState(initial.status);
  const [leadId, setLeadId] = useState(initial.leadId);
  const [agentId, setAgentId] = useState(initial.agentId);

  function apply() {
    const params = new URLSearchParams(sp.toString());

    if (status && status !== "ALL") params.set("status", status);
    else params.delete("status");

    if (leadId.trim()) params.set("leadId", leadId.trim());
    else params.delete("leadId");

    if (agentId.trim()) params.set("agentId", agentId.trim());
    else params.delete("agentId");

    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  function reset() {
    router.push(`?page=1`);
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Status</label>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Lead ID</label>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. LEAD_004"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Agent ID</label>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. AGENT_01"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={apply}
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply
          </button>
          <button
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
