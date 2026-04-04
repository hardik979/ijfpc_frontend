"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  FolderKanban,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link as LinkIcon,
  Wrench,
  ListChecks,
} from "lucide-react";

type ProjectEntry = {
  name: string;
  techStack: string;
  link: string;
  bullets: string[];
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

/* ── Accent palette per card index ──────────────────────────── */
const ACCENTS = [
  { ring: "ring-violet-200", gradient: "from-violet-500 to-indigo-600" },
  { ring: "ring-sky-200", gradient: "from-sky-500 to-blue-600" },
  { ring: "ring-teal-200", gradient: "from-teal-500 to-emerald-600" },
  { ring: "ring-rose-200", gradient: "from-rose-500 to-pink-600" },
];

/* ── Project card ───────────────────────────────────────────── */
function ProjectCard({
  index,
  control,
  register,
  onRemove,
  showRemove,
}: {
  index: number;
  control: any;
  register: any;
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
    name: `projects.${index}.bullets`,
  });

  return (
    <div
      className={`relative rounded-2xl border-transparent border bg-white p-5 ring-1 ${accent.ring} transition-all duration-300`}
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,.05)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-md shrink-0`}
          >
            <FolderKanban className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-none">
              Project {index + 1}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Add project title, stack, link and resume bullet points
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
        {/* Project Name */}
        <div className="sm:col-span-2">
          <FieldLabel icon={FolderKanban}>Project Name</FieldLabel>
          <input
            {...register(`projects.${index}.name`)}
            placeholder="e.g. Sales Dashboard Analysis"
            className={inputCls()}
          />
        </div>

        {/* Tech Stack */}
        <div className="sm:col-span-2">
          <FieldLabel icon={Wrench}>Tech Stack</FieldLabel>
          <input
            {...register(`projects.${index}.techStack`)}
            placeholder="e.g. SQL, Power BI, Excel, Python"
            className={inputCls()}
          />
        </div>

        {/* Link */}
        <div className="sm:col-span-2">
          <FieldLabel icon={LinkIcon}>Project Link</FieldLabel>
          <input
            {...register(`projects.${index}.link`)}
            placeholder="e.g. GitHub / Live Demo / Portfolio Link"
            className={inputCls()}
          />
        </div>

        {/* Bullet points */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <FieldLabel icon={ListChecks}>Project Bullet Points</FieldLabel>

            <button
              type="button"
              onClick={() => appendBullet("")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all"
            >
              <Plus className="w-3 h-3" />
              Add Bullet
            </button>
          </div>

          <div className="space-y-2.5">
            {bulletFields.map((field, bulletIndex) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="mt-3 text-violet-400 text-sm">•</div>
                <input
                  {...register(`projects.${index}.bullets.${bulletIndex}`)}
                  placeholder="e.g. Built an interactive dashboard to track KPIs and improve reporting visibility."
                  className={inputCls()}
                />
                {bulletFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBullet(bulletIndex)}
                    className="mt-1 flex items-center justify-center w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
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

/* ═══════════════════════════════════════════════════════════ */
export default function ResumeFormStep5({
  onNext,
  onBack,
  initialProjects,
}: {
  onNext: (data: { projects: ProjectEntry[] }) => void;
  onBack: () => void;
  initialProjects?: ProjectEntry[];
}) {
  const defaultProject = (): ProjectEntry => ({
    name: "",
    techStack: "",
    link: "",
    bullets: [""],
  });

  const { register, control, handleSubmit, reset } = useForm<{
    projects: ProjectEntry[];
  }>({
    defaultValues: {
      projects: initialProjects?.length ? initialProjects : [defaultProject()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = (data: { projects: ProjectEntry[] }) => {
    const cleanedProjects = data.projects.map((project) => ({
      ...project,
      bullets: (project.bullets || []).filter((b) => b.trim() !== ""),
    }));

    setLoading(true);
    setTimeout(() => {
      onNext({ projects: cleanedProjects });
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    if (initialProjects) {
      reset({
        projects: initialProjects.length ? initialProjects : [defaultProject()],
      });
    }
  }, [initialProjects, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Cards */}
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
      </div>

      {/* Add another */}
      <button
        type="button"
        onClick={() => append(defaultProject())}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 text-violet-600 text-sm font-semibold hover:bg-violet-50 hover:border-violet-300 transition-all duration-200"
      >
        <Plus className="w-4 h-4" />
        Add Another Project
      </button>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-violet-100 to-transparent" />

      {/* Footer */}
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
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}