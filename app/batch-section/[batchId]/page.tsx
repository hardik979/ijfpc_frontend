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
        <div className="min-h-screen bg-[var(--panel-bg-950)] text-[var(--panel-text-primary)] flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <BatchDetail batchId={batchId} />
    </Suspense>
  );
}
