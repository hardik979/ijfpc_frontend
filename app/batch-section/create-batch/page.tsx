"use client";

import { Suspense } from "react";
import CreateBatch from "@/components/batch/CreateBatch";

export default function CreateBatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <CreateBatch />
    </Suspense>
  );
}
