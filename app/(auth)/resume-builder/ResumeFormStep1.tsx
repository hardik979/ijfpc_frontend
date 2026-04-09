"use client";

import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImage } from "@/utils/getCroppedImage";
import type { ResumeData } from "@/lib/resume";
import {
  Sparkles,
  Upload,
  Camera,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  User,
  ChevronRight,
  Loader2,
  Briefcase,
  Award,
  X,
  ZoomIn,
  CheckCircle2,
  Languages,
  Building2,
} from "lucide-react";

const LANGUAGE_OPTIONS = ["English", "Hindi"] as const;

const DOMAIN_OPTIONS = [
  "Healthcare",
  "E-commerce",
  "Telecom",
  "BFSI",
  "Sports management"
] as const;

type Step1Data = Pick<
  ResumeData,
  | "fullName"
  | "email"
  | "phone"
  | "address"
  | "linkedin"
  | "summary"
  | "profileImage"
  | "profileImageRaw"
  | "skillsInput"
  | "jobRole"
  | "experienceYears"
  | "languages"
  | "role"
> & {
  domain?: string;
};

interface Step1Props {
  onNext: (data: Step1Data) => void;
  initial?: Partial<Step1Data>;
}

const MAX_SUMMARY_LENGTH = 1000;

function Field({
  label,
  icon: Icon,
  required,
  error,
  children,
}: {
  label: string;
  icon: React.ElementType;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 select-none">
        <Icon className="w-3.5 h-3.5 text-violet-400" />
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  [
    "w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 bg-white",
    "border transition-all duration-200 outline-none",
    "placeholder:text-gray-300",
    hasError
      ? "border-rose-300 focus:ring-2 focus:ring-rose-200"
      : "border-gray-200 hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
  ].join(" ");

export default function ResumeFormStep1({ onNext, initial }: Step1Props) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    watch,
    reset,
  } = useForm<Step1Data>({
    defaultValues: {
      summary: "",
      languages: [],
      domain: "",
      ...initial,
    },
  });

  
  const [rawPhotoSrc, setRawPhotoSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  const summaryText = watch("summary") ?? "";
  const profileImage = watch("profileImage");
  const languages = watch("languages") ?? [];
  const selectedDomain = watch("domain") ?? "";

  const charCount = summaryText.length;
  const charPct = Math.min((charCount / MAX_SUMMARY_LENGTH) * 100, 100);

  const handleFile = useCallback((file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawPhotoSrc(reader.result as string);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1.2);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop: React.DragEventHandler<HTMLLabelElement> = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const onDragOver: React.DragEventHandler<HTMLLabelElement> = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
    },
    []
  );

  const onDragLeave: React.DragEventHandler<HTMLLabelElement> = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
    },
    []
  );

  const saveCrop = useCallback(async () => {
    if (!rawPhotoSrc || !croppedAreaPixels) return;
    try {
      const dataUrl = await getCroppedImage(
        rawPhotoSrc,
        {
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
        },
        700
      );

      setValue("profileImageRaw", rawPhotoSrc);
      setValue("profileImage", dataUrl);
      setShowCropper(false);
    } catch {
      alert("Failed to crop image. Please try again.");
    }
  }, [rawPhotoSrc, croppedAreaPixels, setValue]);

  const toggleLanguage = (lang: string) => {
    const current = getValues("languages") || [];
    const exists = current.includes(lang);

    const updated = exists
      ? current.filter((item) => item !== lang)
      : [...current, lang];

    setValue("languages", updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleAI = async () => {
    const { fullName, jobRole, experienceYears, domain } = getValues();

    if (!fullName || !jobRole) {
      alert("Please enter your name and target job role first.");
      return;
    }

    try {
      setAiLoading(true);
      setAiSuccess(false);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_LMS_URL}/api/ai/generate-overview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            jobRole,
            domain,
            ...(Number.isFinite(experienceYears)
              ? { experienceYears: Number(experienceYears) }
              : {}),
          }),
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setValue("summary", data.summary || "");
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch {
      alert("Failed to generate summary. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = (data: Step1Data) => {
    setSubmitting(true);

    setTimeout(() => {
      onNext({
        ...data,
        role: data.jobRole || data.role || "",
        languages: data.languages || [],
        domain: data.domain || "",
      });
      setSubmitting(false);
    }, 250);
  };

  useEffect(() => {
    if (initial) {
      reset({
        summary: "",
        languages: [],
        domain: "",
        ...initial,
      });
    }
  }, [initial, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[160px_1fr]">
        <div className="flex flex-col gap-3">
          <div className="relative">
            {profileImage ? (
              <div className="group relative">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="aspect-square w-full rounded-2xl object-cover ring-2 ring-violet-200 ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    setValue("profileImage", null as any);
                    setValue("profileImageRaw", null as any);
                  }}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                  <Camera className="h-5 w-5 text-violet-400" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
                  No photo
                </p>
              </div>
            )}
          </div>

          <label
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={[
              "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-3 transition-all duration-200",
              isDragging
                ? "scale-[1.02] border-violet-500 bg-violet-50"
                : "border-gray-200 bg-gray-50 hover:border-violet-300 hover:bg-violet-50/50",
            ].join(" ")}
          >
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Upload className="h-4 w-4 text-violet-400" />
            <span className="text-[11px] font-semibold text-gray-500">
              {isDragging ? "Drop here" : "Upload photo"}
            </span>
          </label>

          {showCropper && rawPhotoSrc && (
            <div className="overflow-hidden rounded-xl border border-violet-200 shadow-lg">
              <div className="relative h-48 bg-gray-900">
                <Cropper
                  image={rawPhotoSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  restrictPosition
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, px) => setCroppedAreaPixels(px)}
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2.5">
                <ZoomIn className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-violet-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCrop}
                  className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-700"
                >
                  Crop
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[10px] font-medium text-gray-400">
            Optional but recommended
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Full Name"
            icon={User}
            required
            error={errors.fullName?.message}
          >
            <input
              {...register("fullName", { required: "Required" })}
              placeholder="Arjun Sharma"
              className={inputCls(!!errors.fullName)}
            />
          </Field>

          <Field
            label="Email Address"
            icon={Mail}
            required
            error={errors.email?.message}
          >
            <input
              {...register("email", {
                required: "Required",
                pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
              })}
              placeholder="arjun@example.com"
              className={inputCls(!!errors.email)}
            />
          </Field>

          <Field
            label="Phone Number"
            icon={Phone}
            required
            error={errors.phone?.message}
          >
            <input
              {...register("phone", { required: "Required" })}
              placeholder="+91 98765 43210"
              className={inputCls(!!errors.phone)}
            />
          </Field>

          <Field label="Location" icon={MapPin}>
            <input
              {...register("address")}
              placeholder="Indore, MP"
              className={inputCls()}
            />
          </Field>

          <Field label="LinkedIn URL" icon={Linkedin}>
            <input
              {...register("linkedin")}
              placeholder="linkedin.com/in/arjun"
              className={inputCls()}
            />
          </Field>

          <Field
            label="Target Job Role"
            icon={Briefcase}
            required
            error={errors.jobRole?.message}
          >
            <input
              {...register("jobRole", { required: "Required" })}
              placeholder="e.g. DevOps Engineer"
              className={inputCls(!!errors.jobRole)}
            />
          </Field>

          <Field
            label="Domain / Industry"
            icon={Building2}
            required
            //error={errors.domain?.message}
          >
            <select
              {...register("domain")}
              className={inputCls(!!errors.domain)}
              defaultValue={selectedDomain || ""}
            >
              <option value="">Select domain</option>
              {DOMAIN_OPTIONS.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Years of Experience" icon={Award}>
            <input
              type="number"
              step='any'
              min={0}
              max={50}
              {...register("experienceYears", { valueAsNumber: true })}
              placeholder="e.g. 2"
              className={inputCls()}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Key Skills" icon={Sparkles}>
              <input
                {...register("skillsInput")}
                placeholder="React, Node.js, SQL"
                className={inputCls()}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Languages" icon={Languages}>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const selected = languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={[
                          "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200",
                          selected
                            ? "border-violet-500 bg-violet-600 text-white shadow-md"
                            : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50",
                        ].join(" ")}
                      >
                        {selected && <CheckCircle2 className="h-4 w-4" />}
                        {lang}
                      </button>
                    );
                  })}
                </div>

                {languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Select one or more languages.
                  </p>
                )}
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-violet-100 to-transparent" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            Professional Summary
            <span className="ml-0.5 text-rose-400">*</span>
          </label>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold ${
                charCount > MAX_SUMMARY_LENGTH ? "text-rose-500" : "text-gray-400"
              }`}
            >
              {charCount}/{MAX_SUMMARY_LENGTH}
            </span>

            <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="#EDE9FE"
                strokeWidth="2.5"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke={charCount > MAX_SUMMARY_LENGTH ? "#F43F5E" : "#7C3AED"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 8}`}
                strokeDashoffset={`${2 * Math.PI * 8 * (1 - charPct / 100)}`}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
          </div>
        </div>

        <div className="relative">
          <textarea
            {...register("summary", {
              required: "Required",
              maxLength: {
                value: MAX_SUMMARY_LENGTH,
                message: `Max ${MAX_SUMMARY_LENGTH} characters`,
              },
            })}
            rows={5}
            placeholder="Results-driven professional with hands-on experience in building scalable solutions, improving operations, and delivering business value..."
            className={[inputCls(!!errors.summary), "resize-none leading-relaxed"].join(" ")}
          />
          {errors.summary && (
            <p className="mt-1 text-[11px] font-medium text-rose-500">
              {errors.summary.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAI}
            disabled={aiLoading}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
              aiSuccess
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)]",
              aiLoading ? "cursor-not-allowed opacity-70" : "",
            ].join(" ")}
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : aiSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Generated!
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate with AI
              </>
            )}
          </button>

          <p className="text-[11px] text-gray-400">
            Fill name, role, and domain first for better AI summary.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <p className="text-[11px] text-gray-400">
          Fields marked <span className="font-bold text-rose-400">*</span> are required
        </p>

        <button
          type="submit"
          disabled={submitting}
          className={[
            "inline-flex items-center gap-2.5 rounded-xl px-7 py-3 text-sm font-semibold text-white",
            "bg-gradient-to-r from-violet-600 to-indigo-600",
            "shadow-[0_4px_18px_rgba(124,58,237,0.35)]",
            "hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(124,58,237,0.5)]",
            "active:translate-y-0 active:shadow-md",
            "transition-all duration-200",
            submitting ? "cursor-not-allowed opacity-70" : "",
          ].join(" ")}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              Continue to Education <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}