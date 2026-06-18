"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { inputCls } from "./_shared";

export default function SkillsSection() {
  const { register, control } = useFormContext<ResumeFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "skills" as never,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          Skills tips
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Prefer role-relevant keywords like React.js, Node.js, SQL, Excel, Power
          BI, Python, MongoDB, Linux, or Data Analysis. Keep each one concise.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-md">
              {index + 1}
            </div>

            <input
              {...register(`skills.${index}` as const)}
              placeholder="e.g. React.js, SQL, Data Analysis"
              className={inputCls()}
            />

            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-300 transition-all hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"
                aria-label={`Remove skill ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append("" as never)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3.5 text-sm font-semibold text-violet-700 dark:text-violet-300 transition-all duration-200 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40"
      >
        <Plus className="h-4 w-4" />
        Add Another Skill
      </button>
    </div>
  );
}
