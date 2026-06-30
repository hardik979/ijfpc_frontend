"use client";

import { Suspense } from "react";
import UpdateBatchStatus from "@/components/batch/UpdateBatchStatus";

export default function UpdateBatchStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <UpdateBatchStatus />
    </Suspense>
  );
}
