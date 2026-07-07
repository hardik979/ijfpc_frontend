"use client";

import { useFormContext } from "react-hook-form";
import { Plus, X, Layers } from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { normalizeSectionPages, type SectionKey } from "@/lib/resume";

/* Compact page manager for the Template (exact PDF) view: add or delete
 * layout pages without leaving the PDF preview. Deleting a page merges its
 * sections into the previous page, so no content is ever lost. */
export default function TemplatePageBar({
  pdfPageCount,
}: {
  pdfPageCount?: number | null;
}) {
  const { watch, setValue } = useFormContext<ResumeFormValues>();
  const pages = normalizeSectionPages(watch("sectionPages"));

  const savePages = (next: SectionKey[][]) =>
    setValue("sectionPages", next, { shouldDirty: true });

  const addPage = () => savePages([...pages.map((p) => [...p]), []]);

  const deletePage = (pageIndex: number) => {
    if (pages.length <= 1) return;
    const next = pages.map((p) => [...p]);
    const [removed] = next.splice(pageIndex, 1);
    if (pageIndex === 0) next[0] = [...removed, ...next[0]];
    else next[pageIndex - 1] = [...next[pageIndex - 1], ...removed];
    savePages(next);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-violet-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-4 py-2 backdrop-blur">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <Layers className="h-3.5 w-3.5 text-violet-500" />
        Pages
      </span>

      {pages.map((keys, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-100 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 pl-2.5 pr-1 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm"
        >
          Page {i + 1}
          <span className="text-[10px] font-medium text-gray-400">
            {keys.length
              ? `${keys.length} section${keys.length > 1 ? "s" : ""}`
              : "empty"}
          </span>
          <button
            type="button"
            onClick={() => deletePage(i)}
            disabled={pages.length <= 1}
            title={
              pages.length <= 1
                ? "The resume needs at least one page"
                : keys.length
                ? "Delete this page (its sections move to the previous page)"
                : "Delete this empty page"
            }
            className="rounded-md p-0.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950/40"
            aria-label={`Delete page ${i + 1}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={addPage}
        className="inline-flex items-center gap-1 rounded-lg border-2 border-dashed border-violet-300 px-2.5 py-1 text-xs font-semibold text-violet-500 transition hover:border-violet-400 hover:bg-violet-50/60 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/30"
      >
        <Plus className="h-3.5 w-3.5" />
        Add page
      </button>

      {typeof pdfPageCount === "number" && pdfPageCount > pages.length && (
        <span className="w-full text-[11px] font-medium leading-snug text-amber-600 dark:text-amber-400">
          The PDF is rendering {pdfPageCount} pages: content that doesn&apos;t
          fit on a page overflows onto an extra one. Deleting a page here
          can&apos;t remove overflow — shorten a section, or rearrange sections
          from the Editable tab.
        </span>
      )}
    </div>
  );
}
