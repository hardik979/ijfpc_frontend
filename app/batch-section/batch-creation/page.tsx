"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { API_LMS_URL } from '@/lib/api'
import {
  Calendar,
  User,
  BookOpen,
  Video,
  CheckCircle,
  Clock,
  ArrowLeft,
  AlertCircle,
  Hash,
  Sparkles,
  Activity
} from "lucide-react";

type BatchFormData = {
  batch: string;
  course: string;
  mode: string;
  trainerName: string;
  startDate: string;
  endDate: string;
  status: string;
};

type FormErrors = {
  [K in keyof BatchFormData]?: string;
};

export default function BatchCreatePage() {
  const [formData, setFormData] = useState<BatchFormData>({
    batch: '',
    course: "",
    mode: "",
    trainerName: "",
    startDate: "",
    endDate: '',
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
    };

    if (!formData.batch) {
      newErrors.batch = "Batch is required";
    };

    if (!formData.startDate) {
      newErrors.startDate = "Start Date is required";
    };

    if (!formData.endDate) {
      newErrors.endDate = "End Date is required";
    };

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
          batch: formData.batch,
          course: formData.course,
          mode: formData.mode,
          trainerName: formData.trainerName,
          startDate: formData.startDate,
          endDate: formData.endDate,
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
        batch: "",
        course: "",
        mode: "",
        trainerName: "",
        startDate: "",
        endDate: "",
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
    <section className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Enhanced Background Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="group mb-8 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Batch List</span>
        </button>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Create New Batch
            </h1>
            <p className="text-base text-slate-400">
              Configure course, mode, trainer, schedule and batch status
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl transition-all hover:border-white/20">
          {/* Animated Border Gradient */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            {/* Form Header Badge */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                  <Activity className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Batch Creation Form</p>
                  <p className="text-xs text-slate-500">Fill in all required fields</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-medium text-slate-300">Required Fields: 3</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Batch Code */}
              <div className="group/field">
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Hash className="h-4 w-4 text-cyan-400" />
                  Batch
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div
                    className={`rounded-2xl border-2 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 ${errors.batch
                        ? "border-red-500/50 shadow-lg shadow-red-500/20"
                        : "border-white/10 focus-within:border-cyan-500/50 focus-within:shadow-lg focus-within:shadow-cyan-500/20 hover:border-white/20"
                      }`}
                  >
                    <input
                      type="text"
                      name="batch"
                      value={formData.batch}
                      pattern="^batch-\d{2}$"
                      onChange={handleChange}
                      placeholder="Enter Batch e.g. batch-01"
                      className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
                    />
                  </div>
                  {errors.batch && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p className="text-xs font-medium">{errors.batch}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Course and Mode - Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Course */}
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                    Topic
                  </label>
                  <div className="relative">
                    <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 focus-within:border-blue-500/50 focus-within:shadow-lg focus-within:shadow-blue-500/20 hover:border-white/20">
                      <select
                        name="course"
                        value={formData.course}
                        onChange={handleChange}
                        className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                      >
                        <option value="" className="bg-slate-900">
                          Select Course
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
                          Interview Preparation
                        </option>
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Video className="h-4 w-4 text-purple-400" />
                    Mode
                  </label>
                  <div className="relative">
                    <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 focus-within:border-purple-500/50 focus-within:shadow-lg focus-within:shadow-purple-500/20 hover:border-white/20">
                      <select
                        name="mode"
                        value={formData.mode}
                        onChange={handleChange}
                        className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                      >
                        <option value="" className="bg-slate-900">
                          Select Mode
                        </option>
                        <option value="Online" className="bg-slate-900">
                          Online
                        </option>
                        <option value="Offline" className="bg-slate-900">
                          Offline
                        </option>
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trainer Name */}
              <div>
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <User className="h-4 w-4 text-indigo-400" />
                  Trainer Name
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div
                    className={`rounded-2xl border-2 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 ${errors.trainerName
                        ? "border-red-500/50 shadow-lg shadow-red-500/20"
                        : "border-white/10 focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/20 hover:border-white/20"
                      }`}
                  >
                    <input
                      type="text"
                      name="trainerName"
                      value={formData.trainerName}
                      onChange={handleChange}
                      placeholder="Enter trainer's full name"
                      className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
                    />
                  </div>
                  {errors.trainerName && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p className="text-xs font-medium">{errors.trainerName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates - Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Start Date */}
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Calendar className="h-4 w-4 text-green-400" />
                    Start Date
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div
                      className={`rounded-2xl border-2 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 ${errors.startDate
                          ? "border-red-500/50 shadow-lg shadow-red-500/20"
                          : "border-white/10 focus-within:border-green-500/50 focus-within:shadow-lg focus-within:shadow-green-500/20 hover:border-white/20"
                        }`}
                    >
                      <input
                        type="datetime-local"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                      />
                    </div>
                    {errors.startDate && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p className="text-xs font-medium">{errors.startDate}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Clock className="h-4 w-4 text-orange-400" />
                    End Date
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div
                      className={`rounded-2xl border-2 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 ${errors.endDate
                          ? "border-red-500/50 shadow-lg shadow-red-500/20"
                          : "border-white/10 focus-within:border-orange-500/50 focus-within:shadow-lg focus-within:shadow-orange-500/20 hover:border-white/20"
                        }`}
                    >
                      <input
                        type="datetime-local"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                      />
                    </div>
                    {errors.endDate && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p className="text-xs font-medium">{errors.endDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Status
                </label>
                <div className="relative">
                  <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 focus-within:border-emerald-500/50 focus-within:shadow-lg focus-within:shadow-emerald-500/20 hover:border-white/20">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                    >
                      <option value="" className="bg-slate-900">
                        Select Status
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
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="group relative w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-center justify-center gap-2.5">
                    {isLoading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span className="text-base">Creating Batch...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-base">Create Batch</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
