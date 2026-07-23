"use client";

import { Suspense } from "react";
import StudentZoneUpdate from "@/components/batch/StudentZoneUpdate";

export default function StudentEligibilityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <StudentZoneUpdate />
    </Suspense>
  );
}
