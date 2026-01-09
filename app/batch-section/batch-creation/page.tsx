"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import {API_LMS_URL} from '@/lib/api'

type BatchFormData = {
  course: string;
  mode: string;
  trainerName: string;
  date: string;
  status: string;
};

type FormErrors = {
  [K in keyof BatchFormData]?: string;
};

export default function BatchCreatePage() {
  const [formData, setFormData] = useState<BatchFormData>({
    course: "",
    mode: "",
    trainerName: "",
    date: "",
    status: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.trainerName.trim()) {
      newErrors.trainerName = "Trainer name is required";
    } else if (formData.trainerName.trim().length < 2) {
      newErrors.trainerName = "Trainer name must be at least 2 characters";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createBatchFun = async () => {
    try {
      let result = await fetch(`${API_LMS_URL}/api/batches/create-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: formData.course,
          mode: formData.mode,
          trainerName: formData.trainerName,
          startDate: formData.date,
          status: formData.status,
        }),
      });

      const data = await result.json();

      if (!result.ok) {
        toast.error(data.message || "Failed to create batch");
        return;
      }

      toast.success("✅ Batch created successfully");

      setFormData({
        course: "",
        mode: "",
        trainerName: "",
        date: "",
        status: "",
      });

      setTimeout(() => {
        router.push("/batch-section/batch-list");
      }, 1500);
    } catch (error) {
      toast.error("Failed to create batch");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    await createBatchFun();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof BatchFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <section className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      {/* subtle glows (same theme) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-16 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Create Batch
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure course, mode, trainer, start date and batch status.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm backdrop-blur">
          <div className="p-5 sm:p-6">
            {/* Top strip */}
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold">
                  CB
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Batch Creation</p>
                  <p className="text-xs text-slate-500">Classic dark / glass UI</p>
                </div>
              </div>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                Required: Trainer, Date
              </span>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 gap-4">
              {/* Course */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Course
                </label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-sm focus-within:border-slate-300/40 focus-within:ring-2 focus-within:ring-white/5 transition">
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  >
                    <option value="" className="bg-slate-900">
                      Select
                    </option>
                    <option value="SQL" className="bg-slate-900">
                      SQL
                    </option>
                    <option value="Linux" className="bg-slate-900">
                      Linux
                    </option>
                    <option value="Monitoring" className="bg-slate-900">
                      Monitoring
                    </option>
                    <option value="Recorded" className="bg-slate-900">
                      Recorded
                    </option>
                     <option value="InterviewPrep" className="bg-slate-900">
                      Interview Prepration
                    </option>                    
                  </select>
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Mode
                </label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-sm focus-within:border-slate-300/40 focus-within:ring-2 focus-within:ring-white/5 transition">
                  <select
                    name="mode"
                    value={formData.mode}
                    onChange={handleChange}
                    className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  >
                    <option value="" className="bg-slate-900">
                      Select
                    </option>
                    <option value="Online" className="bg-slate-900">
                      Online
                    </option>
                    <option value="Offline" className="bg-slate-900">
                      Offline
                    </option>
                  </select>
                </div>
              </div>

              {/* Trainer */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Trainer Name
                </label>
                <div
                  className={`rounded-2xl border bg-white/[0.04] px-3 py-2.5 shadow-sm transition focus-within:ring-2 ${
                    errors.trainerName
                      ? "border-red-500/30 focus-within:ring-red-500/10"
                      : "border-white/10 focus-within:border-slate-300/40 focus-within:ring-white/5"
                  }`}
                >
                  <input
                    type="text"
                    name="trainerName"
                    value={formData.trainerName}
                    onChange={handleChange}
                    placeholder="Enter trainer name"
                    className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </div>
                {errors.trainerName && (
                  <p className="text-red-300 text-xs mt-2">{errors.trainerName}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Date
                </label>
                <div
                  className={`rounded-2xl border bg-white/[0.04] px-3 py-2.5 shadow-sm transition focus-within:ring-2 ${
                    errors.date
                      ? "border-red-500/30 focus-within:ring-red-500/10"
                      : "border-white/10 focus-within:border-slate-300/40 focus-within:ring-white/5"
                  }`}
                >
                  <input
                    type="datetime-local"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  />
                </div>
                {errors.date && <p className="text-red-300 text-xs mt-2">{errors.date}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Status
                </label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-sm focus-within:border-slate-300/40 focus-within:ring-2 focus-within:ring-white/5 transition">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  >
                    <option value="" className="bg-slate-900">
                      Select
                    </option>
                    <option value="Upcoming" className="bg-slate-900">
                      Upcoming
                    </option>
                    <option value="Active" className="bg-slate-900">
                      Active
                    </option>
                    <option value="Completed" className="bg-slate-900">
                      Completed
                    </option>                    
                  </select>
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className={[
                  "mt-2 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
                  "border border-white/10 bg-green text-slate-100",
                  "transition-all duration-200 shadow-sm",
                  "hover:bg-white/10 hover:shadow-md",
                  "active:scale-[0.99]",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5",
                ].join(" ")}
              >
                {isLoading ? "Creating Batch..." : "Create Batch"}
              </button>

              {/* Footer note */}              
                <Link href='/batch-section/batch-list' className="text-slate-300 font-medium">
                <h1>{'<-'} Back </h1></Link>              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
