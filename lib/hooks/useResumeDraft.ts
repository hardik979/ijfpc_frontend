"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "resume_builder_draft_v1";

type DraftPayload<T> = {
  step: number;
  data: T;
  updatedAt: number;
};

export function useResumeDraft<T>() {
  const [draft, setDraft] = useState<DraftPayload<T> | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftPayload<T>;
      if (parsed?.data) setDraft(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const autoSave = useCallback((payload: { step: number; data: T }) => {
    if (typeof window === "undefined") return;

    const fullPayload: DraftPayload<T> = {
      ...payload,
      updatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPayload));
    setDraft(fullPayload);
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    setDraft(null);
  }, []);

  const markRestored = useCallback(() => {
    setRestored(true);
  }, []);

  return useMemo(
    () => ({
      draft,
      restored,
      autoSave,
      clearDraft,
      markRestored,
    }),
    [draft, restored, autoSave, clearDraft, markRestored]
  );
}