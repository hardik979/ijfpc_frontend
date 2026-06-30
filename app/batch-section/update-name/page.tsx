"use client";

import { Suspense } from "react";
import UpdateBatchName from "@/components/batch/UpdateBatchName";

export default function UpdateBatchNamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <UpdateBatchName />
    </Suspense>
  );
}
