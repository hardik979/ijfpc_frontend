"use client";

import {
  useForm,
  useFieldArray,
  Control,
  UseFormRegister,
  UseFormSetValue,
  useWatch,
} from "react-hook-form";
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
  Check,
  Wand2,
  ListChecks,
} from "lucide-react";

export type EducationEntry = {
  degree: string;
  institution: string;
  startYear: string;
  endYear: string;
  currentlyStudying: boolean;
  highlights: string[];
};

type Step2Form = {
  education: EducationEntry[];
};

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const textareaCls =
  "w-full min-h-[94px] rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-y";

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none">
      <Icon className="h-3 w-3 text-violet-400" />
      {children}
    </label>
  );
}

const ACCENTS = [
  {
    ring: "ring-violet-200",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    ring: "ring-sky-200",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    ring: "ring-teal-200",
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    ring: "ring-rose-200",
    gradient: "from-rose-500 to-pink-600",
  },
];

function sanitizeAIBullets(input: unknown): string[] {
  if (!Array.isArray(input)) return [""];

  const cleaned = input
    .map((item) => String(item ?? "").trim())
    .map((bullet) =>
      bullet
        .replace(/^[-•*]\s*/, "")
        .replace(/^["']|["']$/g, "")
        .trim()
    )
    .filter(Boolean)
    .filter((bullet) => {
      const lower = bullet.toLowerCase();
      return !(
        lower.startsWith("here are ") ||
        lower.includes("bullet points") ||
        lower.includes("tailored to the candidate")
      );
    });

  return cleaned.length ? cleaned : [""];
}

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

  for (let y = currentYear + 1; y >= from; y--) {
    years.push(y);
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

  if (disabled) {
    return (
      <div
        className={`${inputCls} flex items-center gap-2 cursor-not-allowed bg-gray-50 text-gray-400 opacity-70`}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-300" />
        <span className="italic">Present</span>
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
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setInputVal(next);
            onChange(next);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "YYYY"}
          className={`${inputCls} pr-9`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400 transition-colors hover:text-violet-600"
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-3.5 py-2.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
              Select year
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  const next = String(yr);
                  setInputVal(next);
                  onChange(next);
                  setOpen(false);
                }}
                className={[
                  "w-full px-4 py-2.5 text-left text-sm font-semibold transition-all duration-100",
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

function EducationHighlights({
  index,
  control,
  register,
  setValue,
  onGenerateAI,
  aiLoading,
}: {
  index: number;
  control: Control<Step2Form>;
  register: UseFormRegister<Step2Form>;
  setValue: UseFormSetValue<Step2Form>;
  onGenerateAI: () => void;
  aiLoading: boolean;
}) {
  const highlights =
    useWatch({
      control,
      name: `education.${index}.highlights`,
    }) || [""];

  const safeHighlights = highlights.length ? highlights : [""];

  const addHighlight = () => {
    const updated = [...safeHighlights, ""];
    setValue(`education.${index}.highlights`, updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const removeHighlight = (highlightIndex: number) => {
    const updated = safeHighlights.filter((_, i) => i !== highlightIndex);
    setValue(
      `education.${index}.highlights`,
      updated.length ? updated : [""],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FieldLabel icon={ListChecks}>Education Highlights</FieldLabel>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerateAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Generate with AI
              </>
            )}
          </button>

          <button
            type="button"
            onClick={addHighlight}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Bullet
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {safeHighlights.map((_, highlightIndex) => (
          <div key={highlightIndex} className="flex items-start gap-2">
            <div className="mt-3 h-2 w-2 shrink-0 rounded-full bg-violet-400" />

            <textarea
              {...register(`education.${index}.highlights.${highlightIndex}` as const)}
              placeholder={`Describe achievement / learning ${highlightIndex + 1}`}
              className={textareaCls}
              rows={3}
            />

            <button
              type="button"
              onClick={() => removeHighlight(highlightIndex)}
              className="mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100"
              aria-label={`Remove highlight ${highlightIndex + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationCard({
  index,
  control,
  register,
  setValue,
  onRemove,
  showRemove,
  onGenerateAI,
  aiLoading,
}: {
  index: number;
  control: Control<Step2Form>;
  register: UseFormRegister<Step2Form>;
  setValue: UseFormSetValue<Step2Form>;
  onRemove: () => void;
  showRemove: boolean;
  onGenerateAI: () => void;
  aiLoading: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];

  const watched = useWatch({
    control,
    name: `education.${index}`,
  }) as EducationEntry;

  useEffect(() => {
    if (watched?.currentlyStudying) {
      setValue(`education.${index}.endYear`, "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [watched?.currentlyStudying, index, setValue]);

  return (
    <div
      className={`relative rounded-2xl border bg-white p-5 ring-1 ${accent.ring} transition-all duration-300`}
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent.gradient} shadow-md`}
          >
            <GraduationCap className="h-[18px] w-[18px] text-white" />
          </div>

          <div>
            <p className="text-sm font-bold leading-none text-gray-800">
              Education {index + 1}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              {watched?.degree || watched?.institution
                ? [watched?.degree, watched?.institution].filter(Boolean).join(" · ")
                : "Add your qualification, institution, academic years, and highlights"}
            </p>
          </div>
        </div>

        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-500 transition-all hover:border-rose-200 hover:bg-rose-100"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel icon={GraduationCap}>Degree / Qualification</FieldLabel>
          <input
            {...register(`education.${index}.degree` as const)}
            placeholder="e.g. B.Tech in Computer Science"
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel icon={School}>Institution / University</FieldLabel>
          <input
            {...register(`education.${index}.institution` as const)}
            placeholder="e.g. RGPV University"
            className={inputCls}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>Start Year</FieldLabel>
          <YearPicker
            value={watched?.startYear || ""}
            onChange={(v) =>
              setValue(`education.${index}.startYear`, v, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
            placeholder="e.g. 2020"
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>End Year</FieldLabel>
          <YearPicker
            value={watched?.currentlyStudying ? "" : watched?.endYear || ""}
            onChange={(v) =>
              setValue(`education.${index}.endYear`, v, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
            placeholder="e.g. 2024"
            disabled={!!watched?.currentlyStudying}
            minYear={watched?.startYear ? Number(watched.startYear) : undefined}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="inline-flex cursor-pointer items-center gap-3 select-none">
            <input
              type="checkbox"
              {...register(`education.${index}.currentlyStudying` as const)}
              className="peer sr-only"
            />

            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border-[3px] border-gray-300 bg-white transition-all duration-200 peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-100">
              <Check className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
            </span>

            <span className="text-[15px] font-medium text-slate-700">
              I am currently studying here
            </span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <EducationHighlights
            index={index}
            control={control}
            register={register}
            setValue={setValue}
            onGenerateAI={onGenerateAI}
            aiLoading={aiLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default function ResumeFormStep2({
  onNext,
  onBack,
  initialEducation,
}: {
  onNext: (data: Step2Form) => void;
  onBack: () => void;
  initialEducation?: EducationEntry[];
}) {
  const defaultEntry = (): EducationEntry => ({
    degree: "",
    institution: "",
    startYear: "",
    endYear: "",
    currentlyStudying: false,
    highlights: [""],
  });

  const normalizedInitialEducation =
    initialEducation && initialEducation.length
      ? initialEducation.map((item) => ({
          ...item,
          currentlyStudying: item.currentlyStudying ?? false,
          highlights: item.highlights?.length ? item.highlights : [""],
        }))
      : [];

  const { register, control, handleSubmit, setValue, reset, getValues } =
    useForm<Step2Form>({
      defaultValues: {
        education: normalizedInitialEducation,
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "education",
  });

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<number | null>(null);

  useEffect(() => {
    if (initialEducation) {
      reset({
        education: initialEducation.length
          ? initialEducation.map((item) => ({
              ...item,
              currentlyStudying: item.currentlyStudying ?? false,
              highlights: item.highlights?.length ? item.highlights : [""],
            }))
          : [defaultEntry()],
      });
    }
  }, [initialEducation, reset]);

  const onSubmit = (data: Step2Form) => {
    setLoading(true);

    setTimeout(() => {
      onNext({
        education: data.education.map((item) => ({
          ...item,
          endYear: item.currentlyStudying ? "" : item.endYear,
          highlights:
            item.highlights?.map((b) => b.trim()).filter(Boolean).length > 0
              ? item.highlights.map((b) => b.trim()).filter(Boolean)
              : [""],
        })),
      });
      setLoading(false);
    }, 300);
  };

  const generateAI = async (index: number) => {
    const degree = getValues(`education.${index}.degree`)?.trim();
    const institution = getValues(`education.${index}.institution`)?.trim();
    const startYear = getValues(`education.${index}.startYear`)?.trim();
    const endYear = getValues(`education.${index}.endYear`)?.trim();
    const currentlyStudying = getValues(`education.${index}.currentlyStudying`);

    if (!degree || !institution) {
      alert("Please enter degree and institution before generating.");
      return;
    }

    setAiLoading(index);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_LMS_URL}/api/ai/generate-education-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            degree,
            institution,
            startYear,
            endYear,
            currentlyStudying,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to generate AI education highlights");
      }

      const data = await res.json();
      const cleanedBullets = sanitizeAIBullets(data?.bullets || data?.highlights);

      setValue(`education.${index}.highlights`, cleanedBullets, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } catch (err) {
      console.error("AI generation failed:", err);
      alert("AI generation failed. Try again.");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-4">
        {fields.map((field, index) => (
          <EducationCard
            key={field.id}
            index={index}
            control={control}
            register={register}
            setValue={setValue}
            onRemove={() => remove(index)}
            showRemove={fields.length > 1}
            onGenerateAI={() => generateAI(index)}
            aiLoading={aiLoading === index}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => append(defaultEntry())}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 px-4 py-3.5 text-sm font-semibold text-violet-600 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50"
      >
        <Plus className="h-4 w-4" />
        Add Another Degree
      </button>

      <div className="h-px bg-gradient-to-r from-transparent via-violet-100 to-transparent" />

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <button
          type="submit"
          disabled={loading}
          className={[
            "inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3 text-sm font-bold text-white",
            "shadow-[0_4px_18px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(124,58,237,0.5)]",
            "active:translate-y-0 active:shadow-md transition-all duration-200",
            loading ? "cursor-not-allowed opacity-70" : "",
          ].join(" ")}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue to Work Experience
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}