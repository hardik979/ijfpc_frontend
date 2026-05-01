"use client";

export default function RestoreDraftDialog({
  open,
  onUse,
  onDiscard,
}: {
  open: boolean;
  onUse: () => void;
  onDiscard: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Resume draft found
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We found a previously saved draft. Would you like to continue from
          where you left off?
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onDiscard}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Discard
          </button>
          <button
            onClick={onUse}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)] transition-all"
          >
            Use Saved Draft
          </button>
        </div>
      </div>
    </div>
  );
}