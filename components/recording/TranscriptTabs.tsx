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
    <div className="glass-card">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="text-sm font-medium text-slate-200">Transcript</div>
        <div className="flex gap-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "clean"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            onClick={() => setTab("clean")}
          >
            Clean
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "raw"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            onClick={() => setTab("raw")}
          >
            Raw
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300 font-mono">
          {content || "No transcript yet."}
        </pre>
      </div>
    </div>
  );
}
