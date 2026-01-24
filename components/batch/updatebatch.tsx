"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { API_LMS_URL } from "@/lib/api";
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
    Activity,
} from "lucide-react";

type BatchFormData = {
    data: any;
    batch: string;
    course: string;
    mode: string;
    trainerName: string;
    startDate: string;
    endDate: string;
    status: string;
    code: string;
};

type FormErrors = {
    [K in keyof BatchFormData]?: string;
};

type BatchApiResponse = Partial<BatchFormData> & {
    _id?: string;
};

function toDateTimeLocal(value: any): string {
    if (!value) return "";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    // local datetime-local format: YYYY-MM-DDTHH:mm (no seconds, no Z)
    const pad = (n: number) => String(n).padStart(2, "0");

    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}


export default function BatchUpdationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams<{ batchId?: string }>();

    // batchId from either dynamic route or query param
    const batchId = useMemo(() => {
        const fromParams = params?.batchId;
        const fromQuery = searchParams?.get("batchId") || undefined;
        return fromParams || fromQuery;
    }, [params, searchParams]);

    const isEditMode = Boolean(batchId);

    const [formData, setFormData] = useState<BatchFormData>({
        data: {},
        batch: "",
        course: "",
        mode: "",
        trainerName: "",
        startDate: "",
        endDate: "",
        status: "",
        code: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const resetForm = () => {
        setFormData({
            data: {},
            batch: "",
            course: "",
            mode: "",
            trainerName: "",
            startDate: "",
            endDate: "",
            status: "",
            code: "",
        });
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.trainerName.trim()) {
            newErrors.trainerName = "Trainer name is required";
        } else if (formData.trainerName.trim().length < 2) {
            newErrors.trainerName = "Trainer name must be at least 2 characters";
        }

        if (!formData.batch) newErrors.batch = "Batch is required";
        if (!formData.code) newErrors.code = "Subject Code is required";
        if (!formData.startDate) newErrors.startDate = "Start Date is required";
        if (!formData.endDate) newErrors.endDate = "End Date is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ✅ Fetch batch details when edit mode
    useEffect(() => {
        const fetchBatchDetails = async () => {
            if (!batchId) return;

            try {
                setIsFetching(true);

                const params = new URLSearchParams();
                params.set("batchId", String(batchId));

                // Change this endpoint if your backend uses a different route
                const res = await fetch(`${API_LMS_URL}/api/batches/get-batches?${params.toString()}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });

                const data: BatchApiResponse = await res.json();
                

                if (!res.ok) {
                    toast.error((data as any)?.message || "Failed to fetch batch details");
                    return;
                }

                // Map API response to your form fields (adjust keys if API differs)
                setFormData((prev) => ({
                    ...prev,
                    batch: data?.data?.[0]?.batch ?? "",
                    course: data?.data?.[0]?.course ?? "",
                    mode: data?.data?.[0]?.mode ?? "",
                    trainerName: data?.data?.[0]?.trainerName ?? "",
                    startDate: toDateTimeLocal(data?.data?.[0]?.startDate),
                    endDate: toDateTimeLocal(data?.data?.[0]?.endDate),
                    status: data?.data?.[0]?.status ?? "",
                    code: data?.data?.[0]?.code ?? "",
                }));
            } catch (err) {
                toast.error("Failed to fetch batch details");
            } finally {
                setIsFetching(false);
            }
        };

        fetchBatchDetails();
    }, [batchId]);

    const createBatch = async () => {
        const res = await fetch(`${API_LMS_URL}/api/batches/create-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
            toast.error(data?.message || "Failed to create batch");
            return false;
        }

        toast.success("✅ Batch created successfully");
        return true;
    };

    const updateBatch = async () => {
        if (!batchId) return false;

        
        const res = await fetch(`${API_LMS_URL}/api/batches/update-batch-details/${batchId}`, {
            method: "PUT", // or PATCH (match your backend)
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
            toast.error(data?.message || "Failed to update batch");
            return false;
        }

        toast.success("✅ Batch updated successfully");
        return true;
    };

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsLoading(true);

            const ok = isEditMode ? await updateBatch() : await createBatch();

            if (!ok) return;

            // ✅ after success: empty fields
            resetForm();

            // ✅ redirect after a short delay
            setTimeout(() => {
                router.push("/batch-section/batch-list");
            }, 1200);
        } catch {
            toast.error(isEditMode ? "Failed to update batch" : "Failed to create batch");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
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
                <div
                    className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                />
                <div
                    className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse"
                    style={{ animationDelay: "2s" }}
                />
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
                            {isEditMode ? "Update Batch" : "Create New Batch"}
                        </h1>
                        <p className="text-base text-slate-400">
                            {isEditMode
                                ? "Edit batch details and save changes"
                                : "Configure course, mode, trainer, schedule and batch status"}
                        </p>
                    </div>
                </div>

                {/* Main Form Card */}
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl transition-all hover:border-white/20">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="relative p-6 sm:p-8 lg:p-10">
                        {/* Form Header Badge */}
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                                    <Activity className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {isEditMode ? "Batch Update Form" : "Batch Creation Form"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {isFetching
                                            ? "Loading batch details..."
                                            : "Fill in all required fields"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                                <span className="text-xs font-medium text-slate-300">
                                    {isEditMode ? "Editing Mode" : "Create Mode"}
                                </span>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className={`space-y-6 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
                            {/* Subject Code */}
                            <div className="group/field">
                                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                    <Hash className="h-4 w-4 text-cyan-400" />
                                    Subject Code <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <div
                                        className={`rounded-2xl border-2 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 ${errors.code
                                            ? "border-red-500/50 shadow-lg shadow-red-500/20"
                                            : "border-white/10 focus-within:border-cyan-500/50 focus-within:shadow-lg focus-within:shadow-cyan-500/20 hover:border-white/20"
                                            }`}
                                    >
                                        <input
                                            type="text"
                                            name="code"
                                            value={formData.code}
                                            onChange={handleChange}
                                            placeholder="Enter Subject Code e.g. SQL-OFF-01 || SQL-ONN-01"
                                            className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
                                        />
                                    </div>
                                    {errors.code && (
                                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-300">
                                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                            <p className="text-xs font-medium">{errors.code}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Batch */}
                            <div className="group/field">
                                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                    <Hash className="h-4 w-4 text-cyan-400" />
                                    Batch <span className="text-red-400">*</span>
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

                            {/* Course + Mode */}
                            <div className="grid gap-6 sm:grid-cols-2">
                                {/* Course */}
                                <div>
                                    <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                        <BookOpen className="h-4 w-4 text-blue-400" />
                                        Topic
                                    </label>
                                    <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 focus-within:border-blue-500/50 focus-within:shadow-lg focus-within:shadow-blue-500/20 hover:border-white/20">
                                        <select
                                            name="course"
                                            value={formData.course}
                                            onChange={handleChange}
                                            className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                                        >
                                            <option value="" className="bg-slate-900">Select Course</option>
                                            <option value="SQL" className="bg-slate-900">SQL</option>
                                            <option value="Linux" className="bg-slate-900">Linux</option>
                                            <option value="Monitoring" className="bg-slate-900">Monitoring</option>
                                            <option value="Recorded" className="bg-slate-900">Recorded</option>
                                            <option value="InterviewPrep" className="bg-slate-900">Interview Preparation</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Mode */}
                                <div>
                                    <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                        <Video className="h-4 w-4 text-purple-400" />
                                        Mode
                                    </label>
                                    <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 focus-within:border-purple-500/50 focus-within:shadow-lg focus-within:shadow-purple-500/20 hover:border-white/20">
                                        <select
                                            name="mode"
                                            value={formData.mode}
                                            onChange={handleChange}
                                            className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                                        >
                                            <option value="" className="bg-slate-900">Select Mode</option>
                                            <option value="Online" className="bg-slate-900">Online</option>
                                            <option value="Offline" className="bg-slate-900">Offline</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Trainer */}
                            <div>
                                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                    <User className="h-4 w-4 text-indigo-400" />
                                    Trainer Name <span className="text-red-400">*</span>
                                </label>
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

                            {/* Dates */}
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                        <Calendar className="h-4 w-4 text-green-400" />
                                        Start Date <span className="text-red-400">*</span>
                                    </label>
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

                                <div>
                                    <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                        <Clock className="h-4 w-4 text-orange-400" />
                                        End Date <span className="text-red-400">*</span>
                                    </label>
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

                            {/* Status */}
                            <div>
                                <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                    Status
                                </label>
                                <div className="rounded-2xl border-2 border-white/10 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 focus-within:border-emerald-500/50 focus-within:shadow-lg focus-within:shadow-emerald-500/20 hover:border-white/20">
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full appearance-none bg-transparent px-4 py-3.5 text-sm text-slate-100 outline-none"
                                    >
                                        <option value="" className="bg-slate-900">Select Status</option>
                                        <option value="Upcoming" className="bg-slate-900">Upcoming</option>
                                        <option value="Active" className="bg-slate-900">Active</option>
                                        <option value="Completed" className="bg-slate-900">Completed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading || isFetching}
                                    className="group relative w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                    <div className="relative flex items-center justify-center gap-2.5">
                                        {(isLoading || isFetching) ? (
                                            <>
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                <span className="text-base">
                                                    {isFetching ? "Loading..." : isEditMode ? "Updating Batch..." : "Creating Batch..."}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="text-base">
                                                    {isEditMode ? "Update Batch" : "Create Batch"}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>

                            {/* Optional: Cancel in edit mode */}
                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        router.push("/batch-section/batch-list");
                                    }}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                                >
                                    Cancel Update
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
