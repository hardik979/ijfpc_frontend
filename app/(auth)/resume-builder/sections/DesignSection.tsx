"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Layout, Palette, Type, Check } from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import {
  TEMPLATE_OPTIONS,
  THEME_OPTIONS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
} from "@/lib/resumeForm";

export default function DesignSection() {
  const { control, register, setValue } = useFormContext<ResumeFormValues>();
  const layout = useWatch({ control, name: "layout" });
  const theme = useWatch({ control, name: "theme" });

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Layout className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Template Layout
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATE_OPTIONS.map((t) => {
            const selected = layout === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setValue("layout", t.key, { shouldDirty: true })}
                className={[
                  "relative rounded-2xl border p-3 text-left transition-all duration-200",
                  selected
                    ? "border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 ring-2 ring-violet-100 dark:ring-violet-900/40 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-200 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/30",
                ].join(" ")}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-xl">{t.icon}</span>
                  {selected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t.name}
                </div>
                <div className="mt-0.5 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                  {t.note}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme accent */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Palette className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Theme Accent
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {THEME_OPTIONS.map((t) => {
            const selected = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setValue("theme", t.key, { shouldDirty: true })}
                className={[
                  "rounded-xl border px-2 py-2 text-[11px] font-semibold transition-all",
                  selected
                    ? "border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-900/40"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:border-violet-200 dark:hover:border-violet-700",
                ].join(" ")}
              >
                <div
                  className={`mx-auto mb-1.5 h-2.5 w-8 rounded-full bg-gradient-to-r ${t.dot}`}
                />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Type className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Typography
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Font Family
            </label>
            <select
              {...register("fontFamily")}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-100 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/40"
            >
              {FONT_FAMILY_OPTIONS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Font Size
            </label>
            <select
              {...register("fontSize", { valueAsNumber: true })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-100 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/40"
            >
              {FONT_SIZE_OPTIONS.map((size) => (
                <option key={size.key} value={size.value}>
                  {size.name} ({size.value}px)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
