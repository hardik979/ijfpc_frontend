import React, { Suspense } from "react";
import BatchListClient from "./BatchListClient";

export default async function BatchListPage({ searchParams }: any) {
  // prefer server-provided searchParams for initial render - await to support potential Promise
  const sp = await searchParams;
  const zoneRaw = sp?.zone;
  const zone = Array.isArray(zoneRaw) ? zoneRaw[0] || "" : zoneRaw || "";

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BatchListClient zone={String(zone)} />
    </Suspense>
  );
}
