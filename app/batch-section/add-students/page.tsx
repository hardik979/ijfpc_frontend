"use client";

import { Suspense } from "react";
import AddStudentsToBatch from "@/components/batch/AddStudentsToBatch";

export default function AddStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <AddStudentsToBatch />
    </Suspense>
  );
}
