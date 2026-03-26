import React, { Suspense } from "react";
import StudentListClient from "./StudentListClient";

export default async function StudentListPage({ searchParams }: any): Promise<JSX.Element> {
  const sp = await searchParams;
  const raw = sp?.batchCode;
  const batchCode = Array.isArray(raw) ? raw[0] || "" : raw || "";

  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <StudentListClient batchCode={String(batchCode)} />
    </React.Suspense>
  );
}