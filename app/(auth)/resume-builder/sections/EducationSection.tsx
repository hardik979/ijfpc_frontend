"use client";

import { useEffect } from "react";
import {
  useFormContext,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import {
  GraduationCap,
  Plus,
  Trash2,
  Calendar,
  School,
  Check,
} from "lucide-react";

import type { ResumeFormValues, EducationFormEntry } from "@/lib/resumeForm";
import { emptyEducation } from "@/lib/resumeForm";
import { ACCENTS, FieldLabel, inputCls, YearPicker } from "./_shared";

function EducationCard({
  index,
  control,
  register,
  setValue,
  onRemove,
  showRemove,
}: {
  index: number;
  control: Control<ResumeFormValues>;
  register: UseFormRegister<ResumeFormValues>;
  setValue: UseFormSetValue<ResumeFormValues>;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const watched = useWatch({
    control,
    name: `education.${index}`,
  }) as EducationFormEntry;

  useEffect(() => {
    if (watched?.currentlyStudying) {
      setValue(`education.${index}.endYear`, "", { shouldDirty: true });
    }
  }, [watched?.currentlyStudying, index, setValue]);

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
            <GraduationCap className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-gray-800 dark:text-gray-100">
              Education {index + 1}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {watched?.degree || watched?.institution
                ? [watched?.degree, watched?.institution].filter(Boolean).join(" · ")
                : "Add your qualification, institution, and academic years"}
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
        <div className="sm:col-span-2">
          <FieldLabel icon={GraduationCap}>Degree / Qualification</FieldLabel>
          <input
            {...register(`education.${index}.degree` as const)}
            placeholder="e.g. B.Tech in Computer Science"
            className={inputCls()}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel icon={School}>Institution / University</FieldLabel>
          <input
            {...register(`education.${index}.institution` as const)}
            placeholder="e.g. RGPV University"
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>Start Year</FieldLabel>
          <YearPicker
            value={watched?.startYear || ""}
            onChange={(v) =>
              setValue(`education.${index}.startYear`, v, { shouldDirty: true })
            }
            placeholder="e.g. 2020"
          />
        </div>

        <div>
          <FieldLabel icon={Calendar}>End Year</FieldLabel>
          <YearPicker
            value={watched?.currentlyStudying ? "" : watched?.endYear || ""}
            onChange={(v) =>
              setValue(`education.${index}.endYear`, v, { shouldDirty: true })
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
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border-[3px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 transition-all duration-200 peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-100 dark:peer-focus-visible:ring-violet-900/40">
              <Check className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100" />
            </span>
            <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
              I am currently studying here
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default function EducationSection() {
  const { register, control, setValue } = useFormContext<ResumeFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "education",
  });

  return (
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
        />
      ))}

      <button
        type="button"
        onClick={() => append(emptyEducation())}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 px-4 py-3.5 text-sm font-semibold text-violet-600 dark:text-violet-300 transition-all duration-200 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40"
      >
        <Plus className="h-4 w-4" /> Add Another Degree
      </button>
    </div>
  );
}
