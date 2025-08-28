"use client";

import React, { useState } from "react";

// =====================
// Types
// =====================

type Status = "ACTIVE" | "DROPPED";

type PaymentInput = {
  amount?: number | string;
  date?: string | null; // ISO from <input type="date">
  mode?: string;
  receiptNos?: string; // comma-separated in UI
  note?: string;
};

// =====================
// Helpers
// =====================

const cn = (...arr: Array<string | false | undefined>) =>
  arr.filter(Boolean).join(" ");

const toISOorNull = (d?: string | null) =>
  d ? new Date(d).toISOString() : null;

const toNumber = (v: any, fallback = 0) => {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(String(v).replace(/[\s,₹]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

// =====================
// Page
// =====================

export default function PrePlacementStudentCreatePage() {
  // top-level fields (all optional in UI)
  const [name, setName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [terms, setTerms] = useState("");
  const [totalFee, setTotalFee] = useState<string | number>("");
  const [dueDate, setDueDate] = useState<string>(""); // YYYY-MM-DD
  const [status, setStatus] = useState<Status>("ACTIVE");

  const [payments, setPayments] = useState<PaymentInput[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const clearForm = () => {
    setName("");
    setCourseName("");
    setTerms("");
    setTotalFee("");
    setDueDate("");
    setStatus("ACTIVE");
    setPayments([]);
    setMessage(null);
  };

  const addPayment = () =>
    setPayments((p) => [
      ...p,
      { amount: "", date: "", mode: "", receiptNos: "", note: "" },
    ]);
  const updatePayment = (idx: number, patch: Partial<PaymentInput>) =>
    setPayments((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...patch } as PaymentInput;
      return next;
    });
  const removePayment = (idx: number) =>
    setPayments((arr) => arr.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        name: (name || "").trim(),
        courseName: (courseName || "").trim(),
        terms: (terms || "").trim(),
        totalFee: toNumber(totalFee, 0), // send 0 if blank
        dueDate: toISOorNull(dueDate || null),
        status,
        payments: (payments || []).map((p) => ({
          amount: toNumber(p.amount, 0),
          date: toISOorNull(p.date || null),
          mode: (p.mode || "").trim(),
          receiptNos: (p.receiptNos || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          note: (p.note || "").trim(),
        })),
      };

      const res = await fetch("/api/preplacement/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || `Create failed (${res.status})`);
      }

      setMessage({ type: "ok", text: "Student created successfully." });
      // Optionally clear after success:
      clearForm();
    } catch (e: any) {
      setMessage({ type: "err", text: e?.message || "Create failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0a1a] via-[#0f0b2a] to-[#120f2f] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Create Pre‑Placement Student
            </h1>
            <p className="text-sm text-purple-200/70">
              All fields are optional. You can fill anything later.
            </p>
          </div>
          <button
            onClick={() => history.back()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            ← Back
          </button>
        </div>

        {/* Alerts */}
        {message && (
          <div
            className={cn(
              "mb-4 rounded-xl border p-3 text-sm",
              message.type === "ok"
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                : "border-rose-300/30 bg-rose-400/10 text-rose-200"
            )}
          >
            {message.text}
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-purple-300/20 bg-white/5 p-5">
          {/* Top-level fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Student Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Akshay Jatav"
                className="field"
              />
            </Field>
            <Field label="Course Name">
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g., Premium 3 Months"
                className="field"
              />
            </Field>
            <Field label="Terms (S)">
              <input
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g., 29k+30%"
                className="field"
              />
            </Field>
            <Field label="Total Fee (₹)">
              <input
                type="number"
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value)}
                placeholder="e.g., 29000"
                className="field"
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="field"
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="field"
              >
                <option value="ACTIVE" className="bg-[#120f2f]">
                  ACTIVE
                </option>
                <option value="DROPPED" className="bg-[#120f2f]">
                  DROPPED
                </option>
              </select>
            </Field>
          </div>

          {/* Payments */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Payments (optional)</h3>
              <button
                onClick={addPayment}
                className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"
              >
                + Add Payment
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-purple-200/70">
                No payments added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                      <Field label="Amount (₹)">
                        <input
                          type="number"
                          value={p.amount as any}
                          onChange={(e) =>
                            updatePayment(idx, { amount: e.target.value })
                          }
                          placeholder="e.g., 1000"
                          className="field"
                        />
                      </Field>
                      <Field label="Date">
                        <input
                          type="date"
                          value={(p.date as string) || ""}
                          onChange={(e) =>
                            updatePayment(idx, { date: e.target.value })
                          }
                          className="field"
                        />
                      </Field>
                      <Field label="Mode">
                        <input
                          value={p.mode || ""}
                          onChange={(e) =>
                            updatePayment(idx, { mode: e.target.value })
                          }
                          placeholder="e.g., UPI Tenx"
                          className="field"
                        />
                      </Field>
                      <Field label="Receipt Nos (comma)">
                        <input
                          value={p.receiptNos || ""}
                          onChange={(e) =>
                            updatePayment(idx, { receiptNos: e.target.value })
                          }
                          placeholder="e.g., 14, 15"
                          className="field"
                        />
                      </Field>
                      <Field label="Note">
                        <input
                          value={p.note || ""}
                          onChange={(e) =>
                            updatePayment(idx, { note: e.target.value })
                          }
                          placeholder="optional"
                          className="field"
                        />
                      </Field>
                      <div className="flex items-end justify-end">
                        <button
                          onClick={() => removePayment(idx)}
                          className="h-10 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 text-xs text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={clearForm}
              className="rounded-lg border border-white/10 px-4 py-2"
            >
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Create Student"}
            </button>
          </div>
        </div>
      </div>

      {/* Tailwind field style */}
      <style jsx>{`
        .field {
          @apply w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400/40;
        }
      `}</style>
    </div>
  );
}

// =====================
// Small comps
// =====================

function Field({
  label,
  children,
}: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="block text-sm">
      <div className="mb-1 text-xs text-purple-200/80">{label}</div>
      {children}
    </label>
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
