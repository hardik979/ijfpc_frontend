"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormContext } from "react-hook-form";
import { BlobProvider } from "@react-pdf/renderer";
import { Download, FileText, X, CheckCircle2 } from "lucide-react";

import { ResumeDocumentRouter } from "@/components/resume-builder/ResumePDF";
import type { ResumeData } from "@/lib/resume";
import type { ResumeFormValues } from "@/lib/resumeForm";
import { formToResumeData } from "@/lib/resumeForm";

function PdfModal({ data, onClose }: { data: ResumeData; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">
              Final PDF
            </p>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Preview &amp; Download
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <BlobProvider document={<ResumeDocumentRouter data={data} />}>
              {({ url, loading }) => (
                <a
                  href={url ?? "#"}
                  download="resume.pdf"
                  className={[
                    "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] transition-all hover:-translate-y-0.5",
                    loading ? "pointer-events-none opacity-60" : "",
                  ].join(" ")}
                >
                  <Download className="h-4 w-4" />
                  {loading ? "Preparing…" : "Download PDF"}
                </a>
              )}
            </BlobProvider>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
          <BlobProvider document={<ResumeDocumentRouter data={data} />}>
            {({ url, loading, error }) => {
              if (loading) {
                return (
                  <div className="flex h-full items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 dark:border-violet-900 border-t-violet-600 dark:border-t-violet-400" />
                    Rendering your resume…
                  </div>
                );
              }
              if (error || !url) {
                return (
                  <div className="flex h-full items-center justify-center text-sm text-red-500 dark:text-red-400">
                    Preview failed — try the download button above.
                  </div>
                );
              }
              return (
                <iframe
                  src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
                  className="h-full w-full border-0 bg-white"
                  title="Resume PDF preview"
                />
              );
            }}
          </BlobProvider>
        </div>
      </div>
    </div>
  );
}

export default function EditorTopBar({ savedLabel }: { savedLabel: string }) {
  const { getValues } = useFormContext<ResumeFormValues>();
  const [docData, setDocData] = useState<ResumeData | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="shrink-0 sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_4px_14px_rgba(124,58,237,0.4)]">
            <FileText className="h-[18px] w-[18px] text-white" />
          </span>
          <div className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white">
              Resume Builder
            </span>
            {savedLabel ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {savedLabel}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                Build a standout resume
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDocData(formToResumeData(getValues()))}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)]"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Preview &amp; Download</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      {mounted &&
        docData &&
        createPortal(
          <PdfModal data={docData} onClose={() => setDocData(null)} />,
          document.body
        )}
    </header>
  );
}
