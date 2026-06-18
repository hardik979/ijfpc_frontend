"use client";

import {
  useFormContext,
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import {
  FolderKanban,
  Plus,
  Trash2,
  Link as LinkIcon,
  Wrench,
  ListChecks,
} from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { emptyProject } from "@/lib/resumeForm";
import { ACCENTS, FieldLabel, inputCls } from "./_shared";

function ProjectCard({
  index,
  control,
  register,
  onRemove,
  showRemove,
}: {
  index: number;
  control: Control<ResumeFormValues>;
  register: UseFormRegister<ResumeFormValues>;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const accent = ACCENTS[index % ACCENTS.length];

  const {
    fields: bulletFields,
    append: appendBullet,
    remove: removeBullet,
  } = useFieldArray({
    control,
    name: `projects.${index}.bullets` as never,
  });

  return (
    <div
      className={`relative rounded-2xl border border-transparent dark:border-gray-800 bg-white dark:bg-gray-900 p-5 ring-1 ${accent.ring} dark:ring-gray-800 transition-all duration-300`}
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent.gradient} shadow-md`}
          >
            <FolderKanban className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-gray-800 dark:text-gray-100">
              Project {index + 1}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              Add project title, stack, link and resume bullet points
            </p>
          </div>
        </div>

        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-[11px] font-semibold text-rose-500 dark:text-rose-300 transition-all hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel icon={FolderKanban}>Project Name</FieldLabel>
          <input
            {...register(`projects.${index}.name` as const)}
            placeholder="e.g. Sales Dashboard Analysis"
            className={inputCls()}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel icon={Wrench}>Tech Stack</FieldLabel>
          <input
            {...register(`projects.${index}.techStack` as const)}
            placeholder="e.g. SQL, Power BI, Excel, Python"
            className={inputCls()}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel icon={LinkIcon}>Project Link</FieldLabel>
          <input
            {...register(`projects.${index}.link` as const)}
            placeholder="e.g. GitHub / Live Demo / Portfolio Link"
            className={inputCls()}
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <FieldLabel icon={ListChecks}>Project Bullet Points</FieldLabel>
            <button
              type="button"
              onClick={() => appendBullet("" as never)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-300 transition-all hover:bg-violet-100 dark:hover:bg-violet-950/60"
            >
              <Plus className="h-3 w-3" /> Add Bullet
            </button>
          </div>

          <div className="space-y-2.5">
            {bulletFields.map((field, bulletIndex) => (
              <div key={field.id} className="flex items-start gap-2">
                <span className="mt-4 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 dark:bg-violet-500" />
                <input
                  {...register(
                    `projects.${index}.bullets.${bulletIndex}` as const
                  )}
                  placeholder="e.g. Built an interactive dashboard to track KPIs and improve reporting visibility."
                  className={inputCls()}
                />
                {bulletFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBullet(bulletIndex)}
                    className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-300 transition-all hover:bg-rose-100 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsSection() {
  const { register, control } = useFormContext<ResumeFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <ProjectCard
          key={field.id}
          index={index}
          control={control}
          register={register}
          onRemove={() => remove(index)}
          showRemove={fields.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={() => append(emptyProject())}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 px-4 py-3.5 text-sm font-semibold text-violet-600 dark:text-violet-300 transition-all duration-200 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40"
      >
        <Plus className="h-4 w-4" /> Add Another Project
      </button>
    </div>
  );
}
