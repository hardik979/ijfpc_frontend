"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  School,
} from "lucide-react";

type EducationEntry = {
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
  currentlyStudying?: boolean;
};

/* ── shared input class ─────────────────────────────────────── */
const inputCls = (opts?: { error?: boolean; disabled?: boolean }) =>
  [
    "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white",
    "border transition-all duration-200 outline-none",
    "placeholder:text-gray-300",
    opts?.disabled
      ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
      : opts?.error
      ? "border-rose-300 focus:ring-2 focus:ring-rose-100 text-gray-900"
      : "border-gray-200 hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-gray-900",
  ].join(" ");

/* ── Field label ────────────────────────────────────────────── */
function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-widest text-gray-400 mb-1.5 select-none">
      <Icon className="w-3 h-3 text-violet-400" />
      {children}
    </label>
  );
}

/* ── Year Picker ────────────────────────────────────────────── */
function YearPicker({
  value,
  onChange,
  placeholder,
  disabled,
  minYear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minYear?: number;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const ref = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const from = minYear && minYear > 1970 ? minYear : 1970;
  const years: number[] = [];
  for (let y = currentYear + 1; y >= from; y--) years.push(y);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

  if (disabled) {
    return (
      <div className={inputCls({ disabled: true }) + " flex items-center gap-2"}>
        <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        <span className="text-gray-400 text-sm italic">Present</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "YYYY"}
          className={inputCls() + " pr-9"}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400 hover:text-violet-600 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-violet-100 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <p className="text-[10px] font-800 uppercase tracking-widest text-violet-600">
              Select year
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  setInputVal(String(yr));
                  onChange(String(yr));
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-4 py-2.5 text-sm font-semibold transition-all duration-100",
                  String(yr) === value
                    ? "bg-violet-600 text-white"
                    : "text-gray-700 hover:bg-violet-50 hover:text-violet-700",
                ].join(" ")}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Accent palette per card index ──────────────────────────── */
const ACCENTS = [
  { ring: "ring-violet-200", gradient: "from-violet-500 to-indigo-600" },
  { ring: "ring-sky-200", gradient: "from-sky-500 to-blue-600" },
  { ring: "ring-teal-200", gradient: "from-teal-500 to-emerald-600" },
  { ring: "ring-rose-200", gradient: "from-rose-500 to-pink-600" },
];

/* ── Education card ─────────────────────────────────────────── */
function EduCard({
  index,
  register,
  control,
  setValue,
  onRemove,
  showRemove,
}: {
  index: number;
  register: any;
  control: any;
  setValue: any;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const watched = useWatch({
    control,
    name: `education.${index}`,
  }) as EducationEntry;
  const studying = watched?.currentlyStudying ?? false;
  const startYr = watched?.startYear ?? "";

  return (
    <div
      className={`relative rounded-2xl border-transparent border bg-white p-5 ring-1 ${accent.ring} transition-all duration-300`}
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-md shrink-0`}
          >
            <GraduationCap className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-none">
              Education {index + 1}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[220px]">
              {watched?.degree || watched?.institution
                ? [watched.degree, watched.institution]
                    .filter(Boolean)
                    .join(" · ")
                : "Fill in your details below"}
            </p>
          </div>
        </div>

        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:border-rose-200 transition-all shrink-0"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FieldLabel icon={GraduationCap}>Degree / Qualification</FieldLabel>
          <input
            {...register(`education.${index}.degree`)}
            placeholder="e.g. B.Tech in Computer Science"
            className={inputCls()}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel icon={School}>Institution / University</FieldLabel>
          <input
            {...register(`education.${index}.institution`)}
            placeholder="e.g. IIM Indore, RGPV University"
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>Start Year</FieldLabel>
          <YearPicker
            value={startYr}
            onChange={(v) => setValue(`education.${index}.startYear`, v)}
            placeholder="e.g. 2020"
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>
            End Year
            {studying && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-600 uppercase tracking-wide normal-case">
                Present
              </span>
            )}
          </FieldLabel>
          <YearPicker
            value={studying ? "" : watched?.endYear ?? ""}
            onChange={(v) => setValue(`education.${index}.endYear`, v)}
            placeholder="e.g. 2024"
            disabled={studying}
            minYear={startYr ? Number(startYr) : undefined}
          />
        </div>

        <div className="sm:col-span-2 pt-1">
          <label className="inline-flex items-center gap-2.5 cursor-pointer group select-none">
            <input
              type="checkbox"
              className="sr-only"
              {...register(`education.${index}.currentlyStudying`)}
              onChange={(e) => {
                setValue(
                  `education.${index}.currentlyStudying`,
                  e.target.checked,
                  { shouldValidate: false }
                );
                if (e.target.checked) setValue(`education.${index}.endYear`, "");
              }}
            />
            <span
              className={[
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                studying
                  ? "bg-violet-600 border-violet-600 shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
                  : "bg-white border-gray-300 group-hover:border-violet-400",
              ].join(" ")}
            >
              {studying && (
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <polyline
                    points="2,6 5,9 10,3"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={`text-sm font-medium transition-colors ${
                studying
                  ? "text-violet-700"
                  : "text-gray-600 group-hover:text-gray-800"
              }`}
            >
              I am currently studying here
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ResumeFormStep2({
  onNext,
  onBack,
  initialEducation,
}: {
  onNext: (data: { education: EducationEntry[] }) => void;
  onBack: () => void;
  initialEducation?: EducationEntry[];
}) {
  const defaultEntry = (): EducationEntry => ({
    degree: "",
    institution: "",
    startYear: "",
    endYear: "",
    currentlyStudying: false,
  });

  const { register, control, handleSubmit, setValue, reset } = useForm<{
    education: EducationEntry[];
  }>({
    defaultValues: {
      education: initialEducation?.length ? initialEducation : [defaultEntry()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "education",
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = (data: { education: EducationEntry[] }) => {
    setLoading(true);
    setTimeout(() => {
      onNext(data);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    if (initialEducation) {
      reset({
        education: initialEducation.length
          ? initialEducation
          : [defaultEntry()],
      });
    }
  }, [initialEducation, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-4">
        {fields.map((field, index) => (
          <EduCard
            key={field.id}
            index={index}
            register={register}
            control={control}
            setValue={setValue}
            onRemove={() => remove(index)}
            showRemove={fields.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => append(defaultEntry())}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 text-violet-600 text-sm font-semibold hover:bg-violet-50 hover:border-violet-300 transition-all duration-200"
      >
        <Plus className="w-4 h-4" />
        Add Another Degree
      </button>

      <div className="h-px bg-gradient-to-r from-transparent via-violet-100 to-transparent" />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="submit"
          disabled={loading}
          className={[
            "inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-bold text-white",
            "bg-gradient-to-r from-violet-600 to-indigo-600",
            "shadow-[0_4px_18px_rgba(124,58,237,0.35)]",
            "hover:shadow-[0_6px_24px_rgba(124,58,237,0.5)] hover:-translate-y-0.5",
            "active:translate-y-0 active:shadow-md transition-all duration-200",
            loading ? "opacity-70 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              Continue to Work Experience <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}