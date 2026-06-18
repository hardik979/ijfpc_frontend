"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { inputCls } from "./_shared";

const MAX_SUMMARY_LENGTH = 1000;

export default function SummarySection() {
  const { register, control, getValues, setValue } =
    useFormContext<ResumeFormValues>();

  const summaryText = useWatch({ control, name: "summary" }) ?? "";
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  const charCount = summaryText.length;
  const charPct = Math.min((charCount / MAX_SUMMARY_LENGTH) * 100, 100);

  const handleAI = async () => {
    const { fullName, role, experienceYears, domain, skills } = getValues();

    if (!fullName || !role) {
      alert("Please enter your name and target job role first.");
      return;
    }

    try {
      setAiLoading(true);
      setAiSuccess(false);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_LMS_URL}/api/ai/generate-overview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            jobRole: role,
            domain,
            skills: (skills ?? []).map((s) => s.trim()).filter(Boolean),
            ...(Number.isFinite(experienceYears)
              ? { experienceYears: Number(experienceYears) }
              : {}),
          }),
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setValue("summary", data.summary || "", { shouldDirty: true });
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch {
      alert("Failed to generate summary. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold ${
              charCount > MAX_SUMMARY_LENGTH
                ? "text-rose-500 dark:text-rose-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {charCount}/{MAX_SUMMARY_LENGTH}
          </span>

          <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
            <circle cx="10" cy="10" r="8" fill="none" stroke="#EDE9FE" strokeWidth="2.5" />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke={charCount > MAX_SUMMARY_LENGTH ? "#F43F5E" : "#7C3AED"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 8}`}
              strokeDashoffset={`${2 * Math.PI * 8 * (1 - charPct / 100)}`}
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
        </div>
      </div>

      <textarea
        {...register("summary", {
          maxLength: MAX_SUMMARY_LENGTH,
        })}
        rows={5}
        placeholder="Results-driven professional with hands-on experience in building scalable solutions, improving operations, and delivering business value..."
        className={[inputCls(), "resize-none leading-relaxed"].join(" ")}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAI}
          disabled={aiLoading}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
            aiSuccess
              ? "bg-emerald-500 text-white shadow-md"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)]",
            aiLoading ? "cursor-not-allowed opacity-70" : "",
          ].join(" ")}
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : aiSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Generated!
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate with AI
            </>
          )}
        </button>

        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Fill name, role, domain &amp; your Skills first — the AI weaves them in.
        </p>
      </div>
    </div>
  );
}
