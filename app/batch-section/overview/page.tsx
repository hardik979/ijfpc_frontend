"use client";

import { Suspense } from "react";
import BatchOverview from "@/components/batch/BatchOverview";

export default function BatchOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <BatchOverview />
    </Suspense>
  );
}
