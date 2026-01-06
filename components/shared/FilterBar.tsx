"use client";

import React from "react";

type FilterBarProps = {
  value: string;
  onChange: (val: string) => void;
  onApply: () => void;
  onReset: () => void;
  placeholder?: string;
};

export default function FilterBar({ value, onChange, onApply, onReset, placeholder = "Search..." }: FilterBarProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent"
          />
        </div>

        <button
          onClick={onApply}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:opacity-95 transition whitespace-nowrap"
        >
          Filter
        </button>

        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition font-semibold whitespace-nowrap"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
