"use client";

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";
import { Calendar } from "lucide-react";

/* ───────────────────────── shared input styling ───────────────────────── */

export const inputCls = (hasError?: boolean) =>
  [
    "w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800",
    "border transition-all duration-200 outline-none",
    "placeholder:text-gray-300 dark:placeholder:text-gray-500",
    hasError
      ? "border-rose-300 dark:border-rose-900/60 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-900/40"
      : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-500 focus:border-violet-400 dark:focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/40",
  ].join(" ");

export const textareaCls =
  "w-full min-h-[94px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-3 text-sm text-gray-900 dark:text-gray-100 outline-none transition-all duration-200 placeholder:text-gray-300 dark:placeholder:text-gray-500 hover:border-violet-300 dark:hover:border-violet-500 focus:border-violet-400 dark:focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/40 resize-y";

/* ───────────────────────── labels ───────────────────────── */

export function Field({
  label,
  icon: Icon,
  required,
  error,
  children,
}: {
  label: string;
  icon: ElementType;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 select-none">
        <Icon className="w-3.5 h-3.5 text-violet-400 dark:text-violet-300" />
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
      <Icon className="h-3 w-3 text-violet-400 dark:text-violet-300" />
      {children}
    </label>
  );
}

/* ───────────────────────── per-card accent palette ───────────────────────── */

export const ACCENTS = [
  { ring: "ring-violet-200", gradient: "from-violet-500 to-indigo-600" },
  { ring: "ring-sky-200", gradient: "from-sky-500 to-blue-600" },
  { ring: "ring-teal-200", gradient: "from-teal-500 to-emerald-600" },
  { ring: "ring-rose-200", gradient: "from-rose-500 to-pink-600" },
];

/* ───────────────────────── AI bullet cleanup ───────────────────────── */

export function sanitizeAIBullets(input: unknown): string[] {
  if (!Array.isArray(input)) return [""];

  const cleaned = input
    .map((item) => String(item ?? "").trim())
    .map((bullet) =>
      bullet
        .replace(/^[-•*]\s*/, "")
        .replace(/^["']|["']$/g, "")
        .trim()
    )
    .filter(Boolean)
    .filter((bullet) => {
      const lower = bullet.toLowerCase();
      return !(
        lower.startsWith("here are ") ||
        lower.includes("bullet points") ||
        lower.includes("tailored to the candidate")
      );
    });

  return cleaned.length ? cleaned : [""];
}

/* ───────────────────────── Year picker ───────────────────────── */

export function YearPicker({
  value,
  onChange,
  placeholder,
  disabled,
  minYear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minYear?: number;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const ref = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const from = minYear && minYear > 1970 ? minYear : 1970;
  const years: number[] = [];

  for (let y = currentYear + 1; y >= from; y--) {
    years.push(y);
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

  if (disabled) {
    return (
      <div
        className={`${inputCls()} flex items-center gap-2 cursor-not-allowed bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 opacity-70`}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
        <span className="italic">Present</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={inputVal}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setInputVal(next);
            onChange(next);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "YYYY"}
          className={`${inputCls()} pr-9`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400 dark:text-violet-300 transition-colors hover:text-violet-600 dark:hover:text-violet-200"
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 border-b border-violet-100 dark:border-gray-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 px-3.5 py-2.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-300" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">
              Select year
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  const next = String(yr);
                  setInputVal(next);
                  onChange(next);
                  setOpen(false);
                }}
                className={[
                  "w-full px-4 py-2.5 text-left text-sm font-semibold transition-all duration-100",
                  String(yr) === value
                    ? "bg-violet-600 text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300",
                ].join(" ")}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
