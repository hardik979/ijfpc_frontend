"use client";

import React, { Suspense } from "react";
import AssignBatch from "@/components/batch/AssignBatch";

export default function UpdateUserbatch() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AssignBatch />
    </Suspense>
  );
}
