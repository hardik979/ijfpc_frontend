"use client";

import { useEffect, useState } from "react";
import {
  useFormContext,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import {
  Plus,
  Trash2,
  Loader2,
  Briefcase,
  Building2,
  Calendar,
  Wand2,
  ListChecks,
  Check,
} from "lucide-react";

import type { ResumeFormValues, ExperienceFormEntry } from "@/lib/resumeForm";
import { emptyExperience } from "@/lib/resumeForm";
import {
  ACCENTS,
  FieldLabel,
  inputCls,
  textareaCls,
  sanitizeAIBullets,
} from "./_shared";

function ExperienceBullets({
  index,
  control,
  register,
  setValue,
  onGenerateAI,
  aiLoading,
}: {
  index: number;
  control: Control<ResumeFormValues>;
  register: UseFormRegister<ResumeFormValues>;
  setValue: UseFormSetValue<ResumeFormValues>;
  onGenerateAI: () => void;
  aiLoading: boolean;
}) {
  const bullets =
    useWatch({ control, name: `experience.${index}.bullets` }) || [""];
  const safeBullets = bullets.length ? bullets : [""];

  const addBullet = () =>
    setValue(`experience.${index}.bullets`, [...safeBullets, ""], {
      shouldDirty: true,
    });

  const removeBullet = (bulletIndex: number) => {
    const updated = safeBullets.filter((_, i) => i !== bulletIndex);
    setValue(`experience.${index}.bullets`, updated.length ? updated : [""], {
      shouldDirty: true,
    });
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" /> Generate with AI
              </>
            )}
          </button>

          <button
            type="button"
            onClick={addBullet}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-300 transition hover:bg-violet-50 dark:hover:bg-violet-950/40"
          >
            <Plus className="h-3.5 w-3.5" /> Add Bullet
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {safeBullets.map((_, bulletIndex) => (
          <div key={bulletIndex} className="flex items-start gap-2">
            <div className="mt-3 h-2 w-2 shrink-0 rounded-full bg-violet-400 dark:bg-violet-500" />
            <textarea
              {...register(`experience.${index}.bullets.${bulletIndex}` as const)}
              placeholder={`Describe impact / responsibility ${bulletIndex + 1}`}
              className={textareaCls}
              rows={3}
            />
            <button
              type="button"
              onClick={() => removeBullet(bulletIndex)}
              className="mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-300 transition hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"
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
  setValue,
  onRemove,
  showRemove,
  onGenerateAI,
  aiLoading,
}: {
  index: number;
  control: Control<ResumeFormValues>;
  register: UseFormRegister<ResumeFormValues>;
  setValue: UseFormSetValue<ResumeFormValues>;
  onRemove: () => void;
  showRemove: boolean;
  onGenerateAI: () => void;
  aiLoading: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const watched = useWatch({
    control,
    name: `experience.${index}`,
  }) as ExperienceFormEntry;

  useEffect(() => {
    if (watched?.isCurrent) {
      setValue(`experience.${index}.endDate`, "", { shouldDirty: true });
    }
  }, [watched?.isCurrent, index, setValue]);

  return (
    <div
      className={`relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 ring-1 ${accent.ring} dark:ring-gray-800 transition-all duration-300`}
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
            <p className="text-sm font-bold leading-none text-gray-800 dark:text-gray-100">
              Experience {index + 1}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-[11px] font-semibold text-rose-500 dark:text-rose-300 transition-all hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel icon={Briefcase}>Job Title</FieldLabel>
          <input
            {...register(`experience.${index}.jobTitle` as const)}
            placeholder="e.g. Full Stack Developer"
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel icon={Building2}>Company</FieldLabel>
          <input
            {...register(`experience.${index}.company` as const)}
            placeholder="e.g. IT Jobs Factory"
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>Start Date</FieldLabel>
          <input
            type="month"
            {...register(`experience.${index}.startDate` as const)}
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>End Date</FieldLabel>
          <input
            type="month"
            {...register(`experience.${index}.endDate` as const)}
            disabled={!!watched?.isCurrent}
            className={`${inputCls()} ${
              watched?.isCurrent
                ? "cursor-not-allowed bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 opacity-70"
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
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border-[3px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 transition-all duration-200 peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-100 dark:peer-focus-visible:ring-violet-900/40">
              <Check className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
            </span>
            <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
              I am currently working here
            </span>
          </label>
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

export default function ExperienceSection() {
  const { register, control, getValues, setValue } =
    useFormContext<ResumeFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "experience",
  });
  const [aiLoading, setAiLoading] = useState<number | null>(null);

  const generateAI = async (index: number) => {
    const job = getValues(`experience.${index}.jobTitle`)?.trim();
    const company = getValues(`experience.${index}.company`)?.trim();

    if (!job || !company) {
      alert("Please enter job title and company before generating.");
      return;
    }

    // Build the bullets from the skills the user entered in the Skills section.
    const skills = (getValues("skills") ?? [])
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    if (!skills.length) {
      alert("Add a few skills in the Skills section first — the AI builds the bullets from them.");
      return;
    }

    setAiLoading(index);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_LMS_URL}/api/ai/generate-experience`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Feed skills as the role's tech stack too, so each skill is used.
          body: JSON.stringify({
            jobTitle: job,
            company,
            techStack: skills,
            skills,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to generate AI bullets");
      const data = await res.json();
      setValue(
        `experience.${index}.bullets`,
        sanitizeAIBullets(data?.bullets),
        { shouldDirty: true }
      );
    } catch (err) {
      console.error("AI generation failed:", err);
      alert("AI generation failed. Try again.");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <ExperienceCard
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

      <button
        type="button"
        onClick={() => append(emptyExperience())}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 px-4 py-3.5 text-sm font-semibold text-violet-600 dark:text-violet-300 transition-all duration-200 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40"
      >
        <Plus className="h-4 w-4" /> Add Another Experience
      </button>
    </div>
  );
}
