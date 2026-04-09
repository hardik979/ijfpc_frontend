"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  ListChecks,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

type FormData = {
  skills: { value: string }[];
};

interface ResumeFormStep4Props {
  resumeData?: {
    skillsInput?: string;
  };
  onNext: (data: { skills: string[] }) => void;
  onBack: () => void;
  initialSkills?: string[];
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const steps = [
  { icon: User, label: "Personal Info", active: false },
  { icon: Briefcase, label: "Experience", active: false },
  { icon: GraduationCap, label: "Education", active: false },
  { icon: Award, label: "Final Details", active: true },
];

const parseSkills = (skills?: string): string[] => {
  if (!skills) return [];

  return skills
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
};

export default function ResumeFormStep4({
  resumeData,
  onNext,
  onBack,
  initialSkills,
}: ResumeFormStep4Props) {
  const parsedResumeSkills = parseSkills(resumeData?.skillsInput);

  const skillsFromProps =
    parsedResumeSkills.length > 0
      ? parsedResumeSkills
      : initialSkills && initialSkills.length > 0
      ? initialSkills
      : [""];

  const { register, control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: {
      skills: skillsFromProps.map((s) => ({ value: s })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "skills",
  });

  const [loading, setLoading] = useState(false);
  const watchedSkills = watch("skills");

  const onSubmit = (data: FormData) => {
    setLoading(true);

    const cleanedSkills = data.skills
      .map((s) => s.value.trim())
      .filter((s) => s.length > 0);

    setTimeout(() => {
      onNext({ skills: cleanedSkills });
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    const parsedResumeSkills = parseSkills(resumeData?.skillsInput);

    const nextSkills =
      parsedResumeSkills.length > 0
        ? parsedResumeSkills
        : initialSkills && initialSkills.length > 0
        ? initialSkills
        : [""];

    reset({
      skills: nextSkills.map((s) => ({ value: s })),
    });
  }, [resumeData?.skillsInput, initialSkills, reset]);

  const filledSkillsCount =
    watchedSkills?.filter((skill) => skill?.value?.trim().length > 0).length || 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.10),_transparent_35%),linear-gradient(180deg,#faf7ff_0%,#ffffff_45%,#f8faff_100%)]">
      <div className="border-b border-violet-100/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={[
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200",
                      step.active
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_8px_22px_rgba(124,58,237,0.28)]"
                        : "border border-gray-200 bg-white text-gray-400",
                    ].join(" ")}
                  >
                    <step.icon className="h-4 w-4" />
                    <span className="hidden text-sm font-semibold md:block">
                      {step.label}
                    </span>
                  </div>

                  {idx < steps.length - 1 && (
                    <div className="hidden h-[2px] w-6 rounded-full bg-gradient-to-r from-violet-200 to-indigo-200 sm:block" />
                  )}
                </div>
              ))}
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
              <Sparkles className="h-4 w-4" />
              Step 4 of 4
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_12px_50px_rgba(88,28,135,0.08)]">
            <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-5 py-6 sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_10px_28px_rgba(124,58,237,0.35)]">
                    <ListChecks className="h-6 w-6 text-white" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                      Key Skills
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                      Add the skills that define your profile best. These will be highlighted prominently in your resume summary section.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
                  <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                      Total Rows
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{fields.length}</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                      Filled
                    </p>
                    <p className="mt-1 text-2xl font-bold text-violet-700">{filledSkillsCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7 sm:py-7">
              <div className="mb-5 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Skills Tips</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Prefer role-relevant keywords like React.js, Node.js, SQL, Excel, Power BI, Python, MongoDB, Linux, ServiceNow, or Data Analysis.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Keep it concise
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const hasValue = watchedSkills?.[index]?.value?.trim()?.length > 0;

                  return (
                    <div
                      key={field.id}
                      className={[
                        "group flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200 sm:p-4",
                        hasValue
                          ? "border-violet-200 bg-gradient-to-r from-violet-50/80 to-indigo-50/70 shadow-sm"
                          : "border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-md">
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <input
                          {...register(`skills.${index}.value` as const)}
                          placeholder="e.g. React.js, SQL, Data Analysis"
                          className={inputClass}
                        />
                      </div>

                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition-all hover:border-rose-200 hover:bg-rose-100"
                          aria-label={`Remove skill ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => append({ value: "" })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-4 py-3.5 text-sm font-semibold text-violet-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Skill
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-violet-100 bg-gray-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white",
                  "shadow-[0_8px_24px_rgba(124,58,237,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(124,58,237,0.4)]",
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
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}