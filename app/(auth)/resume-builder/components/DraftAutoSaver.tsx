"use client";

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";

import { formToResumeData, type ResumeFormValues } from "@/lib/resumeForm";
import type { ResumeData } from "@/lib/resume";

/* Write-only autosaver: subscribes to the whole form, debounces, and persists a
 * ResumeData snapshot via the draft hook's autoSave. It never reads the draft
 * (to avoid render loops) and skips identical writes. */
export default function DraftAutoSaver({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: (data: ResumeData) => void;
}) {
  const { watch } = useFormContext<ResumeFormValues>();
  const values = watch();

  const lastSerialized = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const data = formToResumeData(values);
      const serialized = JSON.stringify(data);
      if (serialized === lastSerialized.current) return;
      lastSerialized.current = serialized;
      onSave(data);
    }, 600);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, disabled, onSave]);

  return null;
}
