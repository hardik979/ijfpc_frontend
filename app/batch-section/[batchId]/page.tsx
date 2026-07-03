"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import BatchDetail from "@/components/batch/BatchDetail";

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = Array.isArray(params?.batchId) ? params.batchId[0] : (params?.batchId as string);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <BatchDetail batchId={batchId} />
    </Suspense>
  );
}
