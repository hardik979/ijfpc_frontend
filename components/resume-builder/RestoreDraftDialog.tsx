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
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          Resume draft found
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          We found a previously saved draft. Would you like to continue from
          where you left off?
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onDiscard}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Discard
          </button>
          <button
            onClick={onUse}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-white hover:bg-cyan-800"
          >
            Use Saved Draft
          </button>
        </div>
      </div>
    </div>
  );
}