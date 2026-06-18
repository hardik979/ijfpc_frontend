"use client";

import { useCallback, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImage } from "@/utils/getCroppedImage";
import {
  Upload,
  Camera,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  User,
  Briefcase,
  Award,
  X,
  ZoomIn,
  Languages,
  Building2,
  CheckCircle2,
} from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { Field, inputCls } from "./_shared";

const LANGUAGE_OPTIONS = ["English", "Hindi"] as const;

const DOMAIN_OPTIONS = [
  "Healthcare",
  "E-commerce",
  "Telecom",
  "BFSI",
  "Sports management",
] as const;

export default function PersonalInfoSection() {
  const { register, control, setValue } = useFormContext<ResumeFormValues>();

  const photo = useWatch({ control, name: "photo" });
  const languages = useWatch({ control, name: "languages" }) ?? [];

  const [rawPhotoSrc, setRawPhotoSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);

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
      setValue("photo", dataUrl, { shouldDirty: true });
      setShowCropper(false);
    } catch {
      alert("Failed to crop image. Please try again.");
    }
  }, [rawPhotoSrc, croppedAreaPixels, setValue]);

  const toggleLanguage = (lang: string) => {
    const current = languages || [];
    const updated = current.includes(lang)
      ? current.filter((item) => item !== lang)
      : [...current, lang];
    setValue("languages", updated, { shouldDirty: true });
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[160px_1fr]">
      {/* Photo */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          {photo ? (
            <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-violet-200 dark:border-violet-900/50">
              <img
                src={photo}
                alt="Profile"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setValue("photo", null, { shouldDirty: true })}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                <Camera className="h-5 w-5 text-violet-400 dark:text-violet-300" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 dark:text-violet-300">
                No photo
              </p>
            </div>
          )}
        </div>

        <label
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          className={[
            "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-3 transition-all duration-200",
            isDragging
              ? "scale-[1.02] border-violet-500 bg-violet-50 dark:bg-violet-950/40"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/30",
          ].join(" ")}
        >
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Upload className="h-4 w-4 text-violet-400 dark:text-violet-300" />
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {isDragging ? "Drop here" : "Upload photo"}
          </span>
        </label>

        <p className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
          Optional but recommended
        </p>
      </div>

      {/* Crop modal — rendered as a centered overlay so the Crop button always
          has room (it was getting squished inside the narrow photo column). */}
      {showCropper && rawPhotoSrc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCropper(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Adjust your photo
              </h4>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Drag to reposition, slide to zoom, then click Crop &amp; Use.
              </p>
            </div>

            <div className="relative h-72 bg-gray-900">
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

            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2.5">
                <ZoomIn className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-violet-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCrop}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition-all"
                >
                  Crop &amp; Use
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" icon={User} required>
          <input
            {...register("fullName")}
            placeholder="Arjun Sharma"
            className={inputCls()}
          />
        </Field>

        <Field label="Email Address" icon={Mail} required>
          <input
            {...register("email")}
            placeholder="arjun@example.com"
            className={inputCls()}
          />
        </Field>

        <Field label="Phone Number" icon={Phone} required>
          <input
            {...register("phone")}
            placeholder="+91 98765 43210"
            className={inputCls()}
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

        <Field label="Target Job Role" icon={Briefcase} required>
          <input
            {...register("role")}
            placeholder="e.g. DevOps Engineer"
            className={inputCls()}
          />
        </Field>

        <Field label="Domain / Industry" icon={Building2}>
          <select {...register("domain")} className={inputCls()}>
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
            step="any"
            min={0}
            max={50}
            {...register("experienceYears", { valueAsNumber: true })}
            placeholder="e.g. 2"
            className={inputCls()}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Languages" icon={Languages}>
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
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30",
                    ].join(" ")}
                  >
                    {selected && <CheckCircle2 className="h-4 w-4" />}
                    {lang}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
