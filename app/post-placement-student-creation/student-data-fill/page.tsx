"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Building2,
  Calendar,
  IndianRupee,
  Phone,
  Mail,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "@/lib/api";

// ------------------ Types & Constants ------------------
const PAYMENT_MODES = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];

interface InstallmentInput {
  label: string;
  amount: number | "";
  date: string; // yyyy-mm-dd
  mode: PaymentMode;
  note?: string;
}

interface FormState {
  studentName: string;
  offerDate: string; // yyyy-mm-dd
  joiningDate: string; // yyyy-mm-dd
  companyName: string;
  location: string;
  hrName: string;
  hrContact: string;
  hrEmail: string;
  packageLPA: number | "";
  totalPostPlacementFee: number | "";
  remainingPrePlacementFee: number | "";
  discount: number | "";
  installments: InstallmentInput[];
}

const ORDINAL = ["1ST", "2ND", "3RD"]; // afterwards use `${n}TH`
const ordinal = (n: number) => (n <= 3 ? ORDINAL[n - 1] : `${n}TH`);

function sanitizeKeyPart(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function makeDedupeKey(name: string, company: string, offerDate: string) {
  // Example: "ram kumar|tcs|2025-08-27"
  return [
    sanitizeKeyPart(name),
    sanitizeKeyPart(company),
    offerDate || "-",
  ].join("|");
}

function isoOrUndefined(d: string) {
  return d ? new Date(d + "T00:00:00Z").toISOString() : undefined;
}

// ------------------ Page Component ------------------
export default function NewPostPlacementOfferPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    studentName: "",
    offerDate: "",
    joiningDate: "",
    companyName: "",
    location: "",
    hrName: "",
    hrContact: "",
    hrEmail: "",
    packageLPA: "",
    totalPostPlacementFee: "",
    remainingPrePlacementFee: "",
    discount: "",
    installments: [],
  });

  const paid = useMemo(
    () => form.installments.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    [form.installments]
  );

  const gross = Number(form.totalPostPlacementFee) || 0;
  const discount = Number(form.discount) || 0;
  const remainingPreview = Math.max(gross - discount - paid, 0);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function updateInstallment(idx: number, patch: Partial<InstallmentInput>) {
    setForm((f) => ({
      ...f,
      installments: f.installments.map((it, i) =>
        i === idx ? { ...it, ...patch } : it
      ),
    }));
  }

  function addInstallment() {
    const n = form.installments.length + 1;
    setForm((f) => ({
      ...f,
      installments: [
        ...f.installments,
        {
          label: `${ordinal(n)} INSTALLMENT`,
          amount: "",
          date: "",
          mode: "CASH",
          note: "",
        },
      ],
    }));
  }

  function removeInstallment(idx: number) {
    setForm((f) => ({
      ...f,
      installments: f.installments.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Basic client-side checks to avoid empty requireds
    if (!form.studentName.trim()) {
      toast.error("Student name is required");
      return;
    }
    if (!form.totalPostPlacementFee && !form.packageLPA) {
      toast.info("Tip: Fill Total PP Fee to track remaining accurately.");
    }

    const payload: any = {
      studentName: form.studentName.trim(),
      offerDate: isoOrUndefined(form.offerDate),
      joiningDate: isoOrUndefined(form.joiningDate),
      companyName: form.companyName.trim() || undefined,
      location: form.location.trim() || undefined,
      hr: {
        name: form.hrName.trim() || undefined,
        contactNumber: form.hrContact.trim() || undefined,
        email: form.hrEmail.trim() || undefined,
      },
      packageLPA: form.packageLPA === "" ? undefined : Number(form.packageLPA),
      totalPostPlacementFee:
        form.totalPostPlacementFee === ""
          ? 0
          : Number(form.totalPostPlacementFee),
      remainingPrePlacementFee:
        form.remainingPrePlacementFee === ""
          ? 0
          : Number(form.remainingPrePlacementFee),
      discount: form.discount === "" ? 0 : Number(form.discount),
      installments: form.installments
        .filter((it) => it.amount !== "" && it.date)
        .map((it) => ({
          label: it.label.trim() || "INSTALLMENT",
          amount: Number(it.amount) || 0,
          date: isoOrUndefined(it.date),
          mode: it.mode,
          note: it.note?.trim() || undefined,
        })),
      source: "portal",
    };

    // Generate a stable dedupeKey on the client to prevent duplicate entries
    const key = makeDedupeKey(
      payload.studentName || "",
      payload.companyName || "",
      form.offerDate || ""
    );
    payload.dedupeKey = key;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/post-placement/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const created = await res.json();
      toast.success("Post-placement record created");

      // Navigate to list (adjust if you have a detail page)
      setTimeout(() => {
        router.push("/post-placement-student-creation/post-placement-records");
      }, 600);
    } catch (err: any) {
      const msg = String(err?.message || err || "Failed to create");
      if (msg.includes("duplicate key") || msg.includes("E11000")) {
        toast.error(
          "Duplicate detected (same name/company/offer date). Please review."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm border border-purple-200 px-4 py-2.5 text-sm font-medium text-purple-700 transition-all hover:bg-purple-50 hover:border-purple-300 hover:shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              New Post‑Placement Record
            </h1>
            <p className="text-purple-600/70 text-sm mt-1">
              Create a comprehensive placement record
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Student & Dates */}
          <section className="bg-white/70 backdrop-blur-sm rounded-3xl border border-purple-200/50 p-6 shadow-lg shadow-purple-100/50">
            <h2 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></div>
              Student Information
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Student Name *
                </label>
                <input
                  value={form.studentName}
                  onChange={(e) => update("studentName", e.target.value)}
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="e.g., Ram Kumar"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Offer Date
                </label>
                <div className="relative">
                  <Calendar
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="date"
                    value={form.offerDate}
                    onChange={(e) => update("offerDate", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Joining Date
                </label>
                <div className="relative">
                  <Calendar
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => update("joiningDate", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Company & HR */}
          <section className="bg-white/70 backdrop-blur-sm rounded-3xl border border-purple-200/50 p-6 shadow-lg shadow-purple-100/50">
            <h2 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></div>
              Company & HR Details
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Company
                </label>
                <div className="relative">
                  <Building2
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="e.g., TCS"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Location
                </label>
                <input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  HR Name
                </label>
                <input
                  value={form.hrName}
                  onChange={(e) => update("hrName", e.target.value)}
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="Person name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  HR Contact
                </label>
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    value={form.hrContact}
                    onChange={(e) => update("hrContact", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  HR Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="email"
                    value={form.hrEmail}
                    onChange={(e) => update("hrEmail", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Package & Fees */}
          <section className="bg-white/70 backdrop-blur-sm rounded-3xl border border-purple-200/50 p-6 shadow-lg shadow-purple-100/50">
            <h2 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></div>
              Financial Details
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Package (LPA)
                </label>
                <div className="relative">
                  <IndianRupee
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.packageLPA}
                    onChange={(e) =>
                      update(
                        "packageLPA",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="e.g., 4"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Total PP Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.totalPostPlacementFee}
                  onChange={(e) =>
                    update(
                      "totalPostPlacementFee",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="e.g., 25000"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Remaining Pre‑Placement Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.remainingPrePlacementFee}
                  onChange={(e) =>
                    update(
                      "remainingPrePlacementFee",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.discount}
                  onChange={(e) =>
                    update(
                      "discount",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div className="md:col-span-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-purple-600 font-medium">
                      Paid so far:
                    </span>{" "}
                    <span className="font-bold text-purple-800">
                      ₹{paid.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-600 font-medium">
                      Computed remaining (preview):
                    </span>{" "}
                    <span className="font-bold text-indigo-800">
                      ₹{remainingPreview.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-purple-500 text-xs">
                    (Backend will auto‑compute and store{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      remainingFee
                    </code>
                    )
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Installments */}
          <section className="bg-white/70 backdrop-blur-sm rounded-3xl border border-purple-200/50 p-6 shadow-lg shadow-purple-100/50">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></div>
                Initial Payments (optional)
              </h2>
              <button
                type="button"
                onClick={addInstallment}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-200 transition-all hover:shadow-purple-300 hover:scale-105"
              >
                <Plus size={16} /> Add Installment
              </button>
            </div>

            {form.installments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus size={24} className="text-purple-400" />
                </div>
                <p className="text-purple-600">No installments added yet.</p>
                <p className="text-sm text-purple-500 mt-1">
                  Click "Add Installment" to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.installments.map((inst, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 items-end gap-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-white/80 to-purple-50/80 p-5 shadow-sm md:grid-cols-12"
                  >
                    <div className="md:col-span-3">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Label
                      </label>
                      <input
                        value={inst.label}
                        onChange={(e) =>
                          updateInstallment(idx, { label: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={inst.amount}
                        onChange={(e) =>
                          updateInstallment(idx, {
                            amount:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Paid Date
                      </label>
                      <input
                        type="date"
                        value={inst.date}
                        onChange={(e) =>
                          updateInstallment(idx, { date: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Mode
                      </label>
                      <select
                        value={inst.mode}
                        onChange={(e) =>
                          updateInstallment(idx, {
                            mode: e.target.value as PaymentMode,
                          })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      >
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Note
                      </label>
                      <input
                        value={inst.note || ""}
                        onChange={(e) =>
                          updateInstallment(idx, { note: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="Receipt #, remarks"
                      />
                    </div>
                    <div className="md:col-span-12 flex items-center justify-end pt-3 border-t border-purple-200">
                      <button
                        type="button"
                        onClick={() => removeInstallment(idx)}
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 hover:border-red-300"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm border-2 border-purple-200 px-6 py-3 text-sm font-medium text-purple-700 transition-all hover:bg-purple-50 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100"
            >
              <ArrowLeft size={16} /> Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-200 transition-all hover:shadow-purple-300 hover:scale-105 disabled:opacity-60 disabled:scale-100 disabled:hover:shadow-purple-200"
            >
              <Save size={16} /> {submitting ? "Saving..." : "Create Record"}
            </button>
          </div>
        </form>

        <ToastContainer position="bottom-right" />
      </div>
    </div>
  );
}
