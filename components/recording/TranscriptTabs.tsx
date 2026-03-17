"use client";

import { useState } from "react";

export default function TranscriptTabs({
  raw,
  clean,
}: {
  raw?: string;
  clean?: string;
}) {
  const [tab, setTab] = useState<"clean" | "raw">("clean");

  const content = tab === "clean" ? clean : raw;

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-medium text-slate-900">Transcript</div>
        <div className="flex gap-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === "clean"
                ? "bg-slate-900 text-white"
                : "border hover:bg-slate-50"
            }`}
            onClick={() => setTab("clean")}
          >
            Clean
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === "raw"
                ? "bg-slate-900 text-white"
                : "border hover:bg-slate-50"
            }`}
            onClick={() => setTab("raw")}
          >
            Raw
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {content || "No transcript yet."}
        </pre>
      </div>
    </div>
  );
}
