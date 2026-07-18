"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Layers,
  Search,
  Activity,
  Pencil,
  Tag,
  AlertCircle,
} from "lucide-react";

type Batch = {
  _id: string;
  batch?: string;
  status?: string;
};

const statusBadge = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  if (s === "completed") return "bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/30";
  return "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30";
};

export default function UpdateBatchName() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [search, setSearch] = useState("");

  const [batchName, setBatchName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load batches on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingBatches(true);
        const res = await fetch(`${API_LMS_URL}/api/batches/get-batches?limit=100`, {
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load batches");
        setBatches(Array.isArray(json?.data) ? json.data : []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load batches");
        setBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    })();
  }, []);

  const selectedBatch = useMemo(
    () => batches.find((b) => b._id === batchId) || null,
    [batches, batchId]
  );

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        (b.batch || "").toLowerCase().includes(q) ||
        (b.status || "").toLowerCase().includes(q)
    );
  }, [batches, search]);

  // Prefill the name input with the batch the user picks
  useEffect(() => {
    if (!selectedBatch) return;
    setBatchName(selectedBatch.batch || "");
  }, [selectedBatch]);

  const trimmedName = batchName.trim();
  const unchanged =
    !!selectedBatch && (selectedBatch.batch || "").trim() === trimmedName;

  const handleSubmit = async () => {
    if (!batchId) {
      toast.error("Please select a batch");
      return;
    }
    if (!trimmedName) {
      toast.error("Batch name is required");
      return;
    }
    if (unchanged) {
      toast.info("Name is already set to " + trimmedName);
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_LMS_URL}/api/batches/update-batch-name/${encodeURIComponent(batchId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchName: trimmedName }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update batch name");

      const updatedName = json?.data?.batch || trimmedName;

      // Reflect the change locally without a refetch
      setBatches((prev) =>
        prev.map((b) => (b._id === batchId ? { ...b, batch: updatedName } : b))
      );
      setBatchName(updatedName);
      toast.success(`✅ Name updated to ${updatedName}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update batch name");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-br from-[var(--panel-bg-950)] via-[var(--panel-bg-900)] to-[var(--panel-bg-950)] text-[var(--panel-text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back + Theme toggle */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/batch-section")}
            className="group flex items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card)] px-4 py-2.5 text-sm font-medium text-[var(--panel-text-secondary)] backdrop-blur-sm transition-all hover:border-[var(--panel-border)] hover:bg-[var(--panel-border)] hover:text-[var(--panel-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Batch Section</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm">
              <Pencil className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--panel-text-primary)] sm:text-4xl">
              Update Batch Name
            </h1>
            <p className="text-base text-[var(--panel-text-muted)]">
              Select an existing batch and rename it.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-card)] shadow-2xl backdrop-blur-xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center gap-3 border-b border-[var(--panel-border)] pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                <Activity className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--panel-text-primary)]">Rename Form</p>
                <p className="text-xs text-[var(--panel-text-faint)]">Fields marked * are required</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                  <Search className="h-4 w-4 text-orange-400" />
                  Find a batch
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-text-faint)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or status..."
                    className="w-full rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] py-3.5 pl-10 pr-3 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none transition-all focus:border-orange-500/50 hover:border-[var(--panel-border)]"
                  />
                </div>
              </div>

              {/* Batch + New name */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <Layers className="h-4 w-4 text-amber-400" />
                    Batch <span className="text-red-700">*</span>
                  </label>
                  <div className="rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all focus-within:border-amber-500/50 hover:border-[var(--panel-border)]">
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      disabled={loadingBatches}
                      className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-[var(--panel-text-primary)] outline-none"
                    >
                      <option value="" className="bg-[var(--panel-bg-900)]">
                        {loadingBatches ? "Loading batches..." : "Select a batch"}
                      </option>
                      {filteredBatches.map((b) => (
                        <option key={b._id} value={b._id} className="bg-[var(--panel-bg-900)]">
                          {b.batch || b._id}
                          {b.status ? ` — ${b.status}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--panel-text-secondary)]">
                    <Tag className="h-4 w-4 text-emerald-400" />
                    New name <span className="text-red-700">*</span>
                  </label>
                  <div className="rounded-2xl border-2 border-[var(--panel-border)] bg-[var(--panel-card-soft)] transition-all focus-within:border-emerald-500/50 hover:border-[var(--panel-border)]">
                    <input
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      disabled={!batchId}
                      placeholder="Enter new batch name"
                      className="w-full bg-transparent px-4 py-3.5 text-sm text-[var(--panel-text-primary)] placeholder:text-[var(--panel-text-faint)] outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Selected batch summary */}
              {selectedBatch && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-card-soft)] px-4 py-3 text-sm">
                  <span className="text-[var(--panel-text-muted)]">Renaming:</span>
                  <span className="font-semibold text-[var(--panel-text-primary)]">
                    {selectedBatch.batch || selectedBatch._id}
                  </span>
                  <span className="text-[var(--panel-text-faint)]">→</span>
                  <span className="text-[var(--panel-text-muted)]">New:</span>
                  <span className="font-semibold text-[var(--panel-text-primary)]">
                    {trimmedName || "—"}
                  </span>
                  {selectedBatch.status && (
                    <>
                      <span className="text-[var(--panel-text-faint)]">·</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(
                          selectedBatch.status
                        )}`}
                      >
                        {selectedBatch.status}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !batchId || !trimmedName || unchanged}
                  className="group relative w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="relative flex items-center justify-center gap-2.5">
                    {submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span className="text-base">Updating Name...</span>
                      </>
                    ) : (
                      <>
                        <Pencil className="h-5 w-5" />
                        <span className="text-base">
                          {selectedBatch && trimmedName
                            ? `Rename to ${trimmedName}`
                            : "Update Batch Name"}
                        </span>
                      </>
                    )}
                  </div>
                </button>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--panel-text-faint)]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  The name will be capitalized automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
