import FiltersBar from "@/components/recordings/FiltersBar";
import RecordingsTable from "@/components/recordings/RecordingsTable";
import { apiGet } from "@/lib/api";
import { ListRecordingsResponse } from "@/lib/types";

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const status = typeof sp.status === "string" ? sp.status : "";
  const leadId = typeof sp.leadId === "string" ? sp.leadId : "";
  const agentId = typeof sp.agentId === "string" ? sp.agentId : "";
  const page = typeof sp.page === "string" ? sp.page : "1";
  const limit = typeof sp.limit === "string" ? sp.limit : "20";

  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (leadId) qs.set("leadId", leadId);
  if (agentId) qs.set("agentId", agentId);
  qs.set("page", page);
  qs.set("limit", limit);

  const data = await apiGet<ListRecordingsResponse>(
    `/recordings?${qs.toString()}`,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recordings</h1>
          <p className="text-sm text-slate-600">
            Review calls, transcripts, and AI scorecards.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Total:{" "}
          <span className="font-medium text-slate-900">{data.total}</span>
        </div>
      </div>

      <FiltersBar />
      <RecordingsTable items={data.items} />
    </div>
  );
}
