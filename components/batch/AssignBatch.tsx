"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:5000";

type BatchItem = {
  _id: string;
  course?: string;
  mode?: string;
  code?: string;
  batchCode?: string;
  status?: string;
};

export default function AssignBatch() {
  const searchParams = useSearchParams();
  const clerkId = searchParams.get("clerkId") || "";

  const [formData, setFormData] = useState(() => ({
    clerkId,
    batchCode: "",
  }));

  const router = useRouter();

  useEffect(() => {
    setFormData((p) => ({ ...p, clerkId }));
  }, [clerkId]);

  const [batchData, setBatchData] = useState<BatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableBatches = useMemo(() => {
    return (batchData || []).filter(
      (b) => (b?.status || "").toLowerCase() !== "completed"
    );
  }, [batchData]);

  async function fetchBatches() {
    try {
      setLoadingBatches(true);
      const res = await fetch(`${API_BASE_URL}/api/batches/get-batches`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load batches");
      setBatchData(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load batches");
      setBatchData([]);
    } finally {
      setLoadingBatches(false);
    }
  }

  useEffect(() => {
    fetchBatches();
  }, []);

  const updateBatchDetails = async () => {
    try {
      if (!formData.clerkId.trim()) {
        toast.error("ClerkId is required");
        return;
      }
      if (!formData.batchCode.trim()) {
        toast.error("Please select a batch");
        return;
      }

      setSaving(true);

      const result = await fetch(`${API_BASE_URL}/api/users/update-user-batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: formData.clerkId.trim(),
          batchCode: formData.batchCode.trim(),
        }),
      });

      const data = await result.json();
      if (!result.ok) {
        toast.error(data?.message || "Failed to update user batch");
        return;
      }

      toast.success("✅ Batch updated successfully");
      setFormData((p) => ({ ...p, batchCode: "" }));
      setTimeout(() => {
        router.push(`/batch-section/student-list`);
      }, 1500);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update user batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      {/* subtle glows like your screenshot theme */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-16 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Assign Batch
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Update the student&apos;s batch using Clerk ID and batch code.
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm backdrop-blur">
          <div className="p-5 sm:p-6">
            {/* top strip */}
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Batch Assignment
                  </p>
                  <p className="text-xs text-slate-500">
                    Classic dark / glass UI
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {loadingBatches ? "Loading batches…" : `${availableBatches.length} active`}
              </span>
            </div>

            <div className="space-y-4">
              {/* Clerk ID */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Clerk ID
                </label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-slate-300/40 focus-within:ring-2 focus-within:ring-white/5">
                  <input
                    value={formData.clerkId}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, clerkId: e.target.value }))
                    }
                    type="text"
                    className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="Enter clerkId…"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Tip: this is usually passed from the list page via query params.
                </p>
              </div>

              {/* Select Batch */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Batch
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-slate-300/40 focus-within:ring-2 focus-within:ring-white/5">
                  <select
                    value={formData.batchCode}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, batchCode: e.target.value }))
                    }
                    className="w-full bg-transparent text-sm text-slate-100 outline-none"
                    disabled={loadingBatches}
                  >
                    <option value="" className="bg-slate-900">
                      {loadingBatches ? "Loading batches..." : "Select a batch"}
                    </option>

                    {availableBatches.map((itm) => {
                      const code =
                        itm.batchCode ||
                        itm.code ||
                        (itm.course && itm.mode
                          ? `${itm.course}-${itm.mode}`
                          : itm._id);

                      return (
                        <option key={itm._id} value={code} className="bg-slate-900">
                          {code}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={updateBatchDetails}
                disabled={saving}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update Batch"}
              </button>

              {/* footer helper */}
              <div className="pt-2 text-xs text-slate-500">
              
                <Link href='/batch-section/student-list' className="text-slate-300 font-medium">
                  <h1> {'<-'} Back to Student List</h1> 
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
