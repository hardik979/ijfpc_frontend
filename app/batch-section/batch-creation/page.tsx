 "use client";

import BatchUpdationPage from "@/components/batch/updatebatch";
import { Suspense } from "react";

export default function BatchCreatePage() {

  return(
    <>
    <Suspense
    fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
    <BatchUpdationPage/>
    </Suspense>
    </>
  )
}