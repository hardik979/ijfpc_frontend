"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { pdf } from "@react-pdf/renderer";
import { ZoomIn, ZoomOut, Pencil, FileText } from "lucide-react";

import EditableResumePreview from "../EditableResumePreview";
import { ResumeDocumentRouter } from "@/components/resume-builder/ResumePDF";
import { formToResumeData, type ResumeFormValues } from "@/lib/resumeForm";

const A4_WIDTH = 794;

function PreviewScale({
  zoomMul,
  children,
}: {
  zoomMul: number;
  children: (scale: number) => React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const maxW = entry.contentRect.width - 40;
      const fitScale = Math.min(maxW / A4_WIDTH, 1);
      setScale(Math.max(0.4, fitScale) * zoomMul);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [zoomMul]);

  return (
    <div ref={wrapRef} className="no-scrollbar flex w-full justify-center overflow-auto">
      <div className="pt-2">{children(scale)}</div>
    </div>
  );
}

/* Live PDF of the currently-selected template. Built imperatively and debounced
 * so it doesn't rebuild on every keystroke — and crucially we keep the LAST good
 * PDF on screen while the next one renders, instead of remounting a spinner each
 * time (which made it flicker "come and go"). */
function TemplatePdfPreview() {
  const { control } = useFormContext<ResumeFormValues>();
  const values = useWatch({ control }) as ResumeFormValues;

  // Map to the PDF data on every render, but gate the rebuild on a STABLE STRING
  // key (photo collapsed to its length). Depending on the values object directly
  // caused an infinite loop: setUrl re-renders → new object ref → effect re-runs
  // → rebuild → setUrl … (the source of the blinking + runaway requests).
  const data = formToResumeData(values);
  const docKey = JSON.stringify({
    ...data,
    photo: data.photo ? `p${data.photo.length}` : "",
  });

  const dataRef = useRef(data);
  dataRef.current = data;

  const [url, setUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const id = ++reqId.current;
      try {
        const blob = await pdf(
          <ResumeDocumentRouter data={dataRef.current} />
        ).toBlob();
        if (id !== reqId.current) return; // a newer build superseded this one
        const next = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
      } catch {
        /* keep showing the last good preview */
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  return (
    <div className="flex h-full w-full justify-center p-4">
      <div className="h-full w-full max-w-3xl overflow-hidden rounded-xl border border-violet-100 dark:border-gray-800 bg-white shadow">
        {url ? (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
            className="h-full w-full border-0 bg-white"
            title="Template preview"
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 dark:border-violet-900 border-t-violet-600 dark:border-t-violet-400" />
            Rendering template…
          </div>
        )}
      </div>
    </div>
  );
}

export default function LivePreviewPanel() {
  const [zoomMul, setZoomMul] = useState(1);
  const [mode, setMode] = useState<"edit" | "template">("edit");

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-4 py-3 backdrop-blur">
        {/* Editable / Template toggle */}
        <div className="inline-flex rounded-xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === "edit"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow"
                : "text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-300"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editable
          </button>
          <button
            type="button"
            onClick={() => setMode("template")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === "template"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow"
                : "text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-300"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Template
          </button>
        </div>

        {mode === "edit" ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setZoomMul((z) => Math.max(0.5, +(z - 0.05).toFixed(2)))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">
              {Math.round(zoomMul * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomMul((z) => Math.min(1.4, +(z + 0.05).toFixed(2)))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
            Exact PDF of the selected template
          </span>
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-auto bg-gradient-to-b from-violet-50/50 to-white dark:from-violet-950/20 dark:to-gray-900 p-4 lg:p-6">
        {mode === "edit" ? (
          <PreviewScale zoomMul={zoomMul}>
            {(scale) => <EditableResumePreview scale={scale} />}
          </PreviewScale>
        ) : (
          <TemplatePdfPreview />
        )}
      </div>
    </div>
  );
}
