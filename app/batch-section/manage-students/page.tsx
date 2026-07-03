"use client";

import { Suspense } from "react";
import ManageBatchStudents from "@/components/batch/ManageBatchStudents";

export default function ManageStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <ManageBatchStudents />
    </Suspense>
  );
}
