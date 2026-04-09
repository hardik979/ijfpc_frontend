"use client";

import {
  useForm,
  useFieldArray,
  UseFormRegister,
  UseFormGetValues,
  UseFormSetValue,
  Control,
  useWatch,
} from "react-hook-form";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import {
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Briefcase,
  Building2,
  Calendar,
  Code2,
  ChevronLeft,
  ChevronRight,
  Wand2,
  ListChecks,
  Check,
} from "lucide-react";

export type ExperienceEntry = {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  techStack: string;
  bullets: string[];
  isCurrent: boolean;
};

type Step3Form = {
  experience: ExperienceEntry[];
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
    soft: "from-violet-50 to-indigo-50",
  },
  {
    ring: "ring-sky-200",
    gradient: "from-sky-500 to-blue-600",
    soft: "from-sky-50 to-blue-50",
  },
  {
    ring: "ring-teal-200",
    gradient: "from-teal-500 to-emerald-600",
    soft: "from-teal-50 to-emerald-50",
  },
  {
    ring: "ring-rose-200",
    gradient: "from-rose-500 to-pink-600",
    soft: "from-rose-50 to-pink-50",
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
        lower.includes("bullet points for the experience section") ||
        lower.includes("tailored to the candidate")
      );
    });

  return cleaned.length ? cleaned : [""];
}

function ExperienceBullets({
  index,
  control,
  register,
  setValue,
  onGenerateAI,
  aiLoading,
}: {
  index: number;
  control: Control<Step3Form>;
  register: UseFormRegister<Step3Form>;
  setValue: UseFormSetValue<Step3Form>;
  onGenerateAI: () => void;
  aiLoading: boolean;
}) {
  const bullets =
    useWatch({
      control,
      name: `experience.${index}.bullets`,
    }) || [""];

  const safeBullets = bullets.length ? bullets : [""];

  const addBullet = () => {
    const updated = [...safeBullets, ""];
    setValue(`experience.${index}.bullets`, updated, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const removeBullet = (bulletIndex: number) => {
    const updated = safeBullets.filter((_, i) => i !== bulletIndex);
    setValue(
      `experience.${index}.bullets`,
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
        <FieldLabel icon={ListChecks}>
          Achievement / Responsibility Bullets
        </FieldLabel>

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
            onClick={addBullet}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Bullet
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {safeBullets.map((_, bulletIndex) => (
          <div key={bulletIndex} className="flex items-start gap-2">
            <div className="mt-3 h-2 w-2 shrink-0 rounded-full bg-violet-400" />

            <textarea
              {...register(`experience.${index}.bullets.${bulletIndex}` as const)}
              placeholder={`Describe impact / responsibility ${bulletIndex + 1}`}
              className={textareaCls}
              rows={3}
            />

            <button
              type="button"
              onClick={() => removeBullet(bulletIndex)}
              className="mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100"
              aria-label={`Remove bullet ${bulletIndex + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExperienceCard({
  index,
  control,
  register,
  getValues,
  setValue,
  onRemove,
  showRemove,
  onGenerateAI,
  aiLoading,
}: {
  index: number;
  control: Control<Step3Form>;
  register: UseFormRegister<Step3Form>;
  getValues: UseFormGetValues<Step3Form>;
  setValue: UseFormSetValue<Step3Form>;
  onRemove: () => void;
  showRemove: boolean;
  onGenerateAI: () => void;
  aiLoading: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];

  const watched = useWatch({
    control,
    name: `experience.${index}`,
  }) as ExperienceEntry;

  useEffect(() => {
    if (watched?.isCurrent) {
      setValue(`experience.${index}.endDate`, "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [watched?.isCurrent, index, setValue]);

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
            <Briefcase className="h-[18px] w-[18px] text-white" />
          </div>

          <div>
            <p className="text-sm font-bold leading-none text-gray-800">
              Experience {index + 1}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              {watched?.jobTitle || watched?.company
                ? [watched?.jobTitle, watched?.company].filter(Boolean).join(" · ")
                : "Add your role, dates, stack, and key achievements"}
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
        <div>
          <FieldLabel icon={Briefcase}>Job Title</FieldLabel>
          <input
            {...register(`experience.${index}.jobTitle` as const)}
            placeholder="e.g. Full Stack Developer"
            className={inputCls}
          />
        </div>

        <div>
          <FieldLabel icon={Building2}>Company</FieldLabel>
          <input
            {...register(`experience.${index}.company` as const)}
            placeholder="e.g. IT Jobs Factory"
            className={inputCls}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>Start Date</FieldLabel>
          <input
            type="month"
            {...register(`experience.${index}.startDate` as const)}
            className={inputCls}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>End Date</FieldLabel>
          <input
            type="month"
            {...register(`experience.${index}.endDate` as const)}
            disabled={!!watched?.isCurrent}
            className={`${inputCls} ${
              watched?.isCurrent
                ? "cursor-not-allowed bg-gray-50 text-gray-400 opacity-70"
                : ""
            }`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="inline-flex cursor-pointer items-center gap-3 select-none">
            <input
              type="checkbox"
              {...register(`experience.${index}.isCurrent` as const)}
              className="peer sr-only"
            />

            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border-[3px] border-gray-300 bg-white transition-all duration-200 peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-100">
              <Check className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
            </span>

            <span className="text-[15px] font-medium text-slate-700">
              I am currently working here
            </span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <FieldLabel icon={Code2}>Tech Stack</FieldLabel>
          <input
            {...register(`experience.${index}.techStack` as const)}
            placeholder="e.g. React, Node.js, Express, MongoDB"
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <ExperienceBullets
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

export default function ResumeFormStep3({
  onNext,
  onBack,
  initialExperience,
  skillsInput
}: {
  onNext: (data: Step3Form) => void;
  onBack: () => void;
  initialExperience?: ExperienceEntry[];
  skillsInput?: string | string[];
}) {
  const defaultEntry = (): ExperienceEntry => ({
    jobTitle: "",
    company: "",
    startDate: "",
    endDate: "",
    techStack: "",
    bullets: [""],
    isCurrent: false,
  });

  console.log('skillsInput --->', skillsInput);


  const normalizedInitialExperience =
    initialExperience && initialExperience.length
      ? initialExperience.map((item) => ({
          ...item,
          isCurrent: item.isCurrent ?? false,
          bullets: item.bullets?.length ? item.bullets : [""],
        }))
      : [defaultEntry()];

  const { register, control, handleSubmit, getValues, setValue, reset } =
    useForm<Step3Form>({
      defaultValues: {
        experience: normalizedInitialExperience,
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "experience",
  });

  useEffect(() => {
    if (initialExperience) {
      reset({
        experience: initialExperience.length
          ? initialExperience.map((item) => ({
              ...item,
              isCurrent: item.isCurrent ?? false,
              bullets: item.bullets?.length ? item.bullets : [""],
            }))
          : [defaultEntry()],
      });
    }
  }, [initialExperience, reset]);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<number | null>(null);

  const onSubmit = (data: Step3Form) => {
    setLoading(true);

    setTimeout(() => {
      onNext({
        experience: data.experience.map((item) => ({
          ...item,
          endDate: item.isCurrent ? "" : item.endDate,
          bullets:
            item.bullets?.map((b) => b.trim()).filter(Boolean).length > 0
              ? item.bullets.map((b) => b.trim()).filter(Boolean)
              : [""],
        })),
      });
      setLoading(false);
    }, 300);
  };
 
  const generateAI = async (index: number) => {
  const job = getValues(`experience.${index}.jobTitle`)?.trim();
  const company = getValues(`experience.${index}.company`)?.trim();
  const tech = getValues(`experience.${index}.techStack`) || "SQL, Linux";

  if (!job || !company) {
    alert("Please enter job title and company before generating.");
    return;
  }

  const techStack = tech
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

 let cleanedSkills: string[] = [];

if (Array.isArray(skillsInput)) {
  cleanedSkills = skillsInput
    .map((s) => String(s || "").trim())
    .filter(Boolean);
} else if (typeof skillsInput === "string") {
  cleanedSkills = skillsInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
  setAiLoading(index);

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_LMS_URL}/api/ai/generate-experience`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job,
          company,
          techStack,
          skills: cleanedSkills, // ✅ pass skills also
        }),
      }
    );

    if (!res.ok) {
      throw new Error("Failed to generate AI bullets");
    }

    const data = await res.json();
    const cleanedBullets = sanitizeAIBullets(data?.bullets);

    setValue(`experience.${index}.bullets`, cleanedBullets, {
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
          <ExperienceCard
            key={field.id}
            index={index}
            control={control}
            register={register}
            getValues={getValues}
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
        Add Another Experience
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
              Continue to Final Details
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}