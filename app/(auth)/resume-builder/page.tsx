"use client";

import { useEffect, useState } from "react";
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  Download,
  Sparkles,
  FileText,
  CheckCircle2,
  FolderKanban,
  Palette,
} from "lucide-react";
import { BlobProvider } from "@react-pdf/renderer";

import { ResumeDocumentRouter } from "@/components/resume-builder/ResumePDF"
import ResumeFormStep4 from "./ResumeFormStep4";
import ResumeFormStep3 from "./ResumeFormStep3";
import ResumeFormStep1 from "./ResumeFormStep1";
import ResumeFormStep2 from "./ResumeFormStep2";
import ResumeFormStep5 from "./ResumeFormStep5";
import ResumePlayground from "./ResumePlayground";

import type { ResumeData } from "@/lib/resume";
import RestoreDraftDialog from "@/components/resume-builder/RestoreDraftDialog";
import { useResumeDraft } from "@/lib/hooks/useResumeDraft"

const STEPS = [
  {
    number: 1,
    title: "Personal Info",
    short: "You",
    icon: User,
    color: "from-violet-500 to-purple-600",
  },
  {
    number: 2,
    title: "Education",
    short: "Education",
    icon: GraduationCap,
    color: "from-sky-500 to-blue-600",
  },
  {
    number: 3,
    title: "Experience",
    short: "Work",
    icon: Briefcase,
    color: "from-teal-500 to-emerald-600",
  },
  {
    number: 4,
    title: "Projects",
    short: "Projects",
    icon: FolderKanban,
    color: "from-pink-500 to-rose-500",
  },
  {
    number: 5,
    title: "Final Details",
    short: "Skills",
    icon: Award,
    color: "from-orange-500 to-rose-500",
  },
  {
    number: 6,
    title: "Design & Style",
    short: "Design",
    icon: Palette,
    color: "from-indigo-500 to-violet-600",
  },
  {
    number: 7,
    title: "Download",
    short: "Done",
    icon: Download,
    color: "from-violet-600 to-purple-700",
  },
];

const PROGRESS_TIPS = [
  "A great summary can increase interview callbacks by 40%.",
  "Recruiters spend an average of 7 seconds on a resume — make it count.",
  "Quantified achievements get 3× more attention than vague duties.",
  "Tailor keywords to each job description for ATS systems.",
  "Strong project bullets make freshers look much more interview-ready.",
];

const DRAFT_DISABLED_KEY = "resume_draft_disabled";

function StepIcon({
  Icon,
  active,
  done,
  gradient,
}: {
  Icon: any;
  active: boolean;
  done: boolean;
  gradient: string;
}) {
  if (done) {
    return (
      <span
        className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${gradient} shadow-lg`}
      >
        <CheckCircle2 className="w-5 h-5 text-white" />
      </span>
    );
  }

  return (
    <span
      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
      ${active
          ? `bg-gradient-to-br ${gradient} border-transparent shadow-lg scale-110`
          : "bg-white border-gray-200"
        }`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-400"}`} />
    </span>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100);

  return (
    <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-sky-500 to-teal-500 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StepCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-3xl border border-gray-100 shadow-[0_8px_48px_-8px_rgba(0,0,0,0.10)] transition-all duration-500 animate-in slide-in-from-right-6 fade-in-0 ${className}`}
    >
      {children}
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
  gradient,
  skillsInput
}: {
  icon: any;
  title: string;
  subtitle?: string;
  gradient: string;
  skillsInput?: string[];
}) {
  return (
    <div className="flex flex-col items-center text-center pb-6 mb-6 border-b border-gray-50">
      <div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-4`}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-sm text-gray-500 max-w-xs">{subtitle}</p>
      )}
    </div>
  );
}

export default function ResumeBuilderPage() {
  const [step, setStep] = useState<number>(1);
  const [resumeData, setResumeData] = useState<Partial<ResumeData>>({});

  const { draft, restored, autoSave, clearDraft, markRestored } =
    useResumeDraft<Partial<ResumeData>>();

  const [draftDisabled, setDraftDisabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDraftDisabled(localStorage.getItem(DRAFT_DISABLED_KEY) === "true");
    }
  }, []);

  const showRestore = !!draft && !restored && !draftDisabled;

  const acceptRestore = () => {
    if (!draft) return;
    setResumeData((draft.data || {}) as Partial<ResumeData>);
    setStep(draft.step || 1);
    markRestored();
  };

  const discardRestore = () => {
    clearDraft();

    if (typeof window !== "undefined") {
      localStorage.setItem(DRAFT_DISABLED_KEY, "true");
    }

    setDraftDisabled(true);
  };

  const handleNext = (data: Partial<ResumeData>) => {
    setResumeData((prev) => ({ ...prev, ...data }));

    setStep((prev) => {
      const next = prev + 1;

      if (!draftDisabled) {
        queueMicrotask(() =>
          autoSave({ step: next, data: { ...resumeData, ...data } })
        );
      }

      return next;
    });
  };

  const handleBack = () => {
    setStep((prev) => {
      const next = Math.max(1, prev - 1);

      if (!draftDisabled) {
        autoSave({ step: next, data: resumeData });
      }

      return next;
    });
  };

  useEffect(() => {
    if (draftDisabled) return;
    autoSave({ step, data: resumeData });
  }, [resumeData, step, autoSave, draftDisabled]);

  const isFormStep = step >= 1 && step <= 5;

  const finalDocKey = JSON.stringify({
    fullName: resumeData.fullName,
    role: (resumeData as any).role,
    jobRole: (resumeData as any).jobRole,
    summary: resumeData.summary,
    profileImage: resumeData.profileImage ?? (resumeData as any).photo,
    layout: (resumeData as any).layout,
    theme: (resumeData as any).theme,
    fontFamily: (resumeData as any).fontFamily,
    fontSize: (resumeData as any).fontSize,
    experience: resumeData.experience,
    education: (resumeData as any).education,
    skills: (resumeData as any).skills,
    projects: (resumeData as any).projects,
  });

  const Navbar = (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow">
            <FileText className="w-4 h-4 text-white" />
          </span>
          <span className="font-bold text-gray-900 tracking-tight">
            Resume
          </span>
        </div>

        <span className="text-xs font-medium text-gray-400">
          {step <= 7 ? `Step ${Math.min(step, 7)} of 7` : "Done"}
        </span>
      </div>
    </header>
  );

  // ONLY SHOWING IMPORTANT PART (STEP 6 FIXED)

  if (step === 6) {
    return (
      <div className="min-h-screen bg-[#F8F7FF]">
        <RestoreDraftDialog
          open={showRestore}
          onUse={acceptRestore}
          onDiscard={discardRestore}
        />
        {Navbar}

        <ResumePlayground
          data={resumeData as ResumeData}
          onBack={handleBack}
          onNext={(finalData: any) => {
            const updated = {
              ...resumeData,
              ...finalData,
              fullName: finalData.fullName ?? resumeData.fullName ?? "",
              role: finalData.role ?? finalData.jobRole ?? resumeData.role ?? resumeData.jobRole ?? "",
              jobRole: finalData.jobRole ?? finalData.role ?? resumeData.jobRole ?? resumeData.role ?? "",
              profileImage:
                finalData.profileImage ??
                finalData.photo ??
                resumeData.profileImage ??
                (resumeData as any).photo ??
                undefined,
              photo:
                finalData.photo ??
                finalData.profileImage ??
                (resumeData as any).photo ??
                resumeData.profileImage ??
                undefined,
            };

            setResumeData(updated);

            if (!draftDisabled) {
              autoSave({ step: 7, data: updated });
            }

            setStep(7);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <RestoreDraftDialog
        open={showRestore}
        onUse={acceptRestore}
        onDiscard={discardRestore}
      />

      {Navbar}

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="space-y-5">

          {isFormStep && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {STEPS.slice(0, 5).map((s, i) => {
                  const active = step === s.number;
                  const done = step > s.number;
                  const Icon = s.icon;

                  return (
                    <div
                      key={s.number}
                      className="flex items-center gap-2 flex-1 min-w-[92px]"
                    >
                      <div className="flex flex-col items-center gap-1 min-w-[44px]">
                        <StepIcon
                          Icon={Icon}
                          active={active}
                          done={done}
                          gradient={s.color}
                        />
                        <span
                          className={`text-[10px] font-semibold tracking-wide uppercase transition-colors
                          ${active
                              ? "text-violet-600"
                              : done
                                ? "text-gray-400"
                                : "text-gray-300"
                            }`}
                        >
                          {s.short}
                        </span>
                      </div>

                      {i < 5 - 1 && (
                        <div
                          className={`flex-1 h-px transition-colors duration-500
                          ${step > s.number
                              ? "bg-gradient-to-r from-violet-400 to-sky-300"
                              : "bg-gray-150"
                            }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <ProgressBar step={step} total={7} />
            </div>
          )}

          {step === 1 && (
            <StepCard>
              <div className="p-8">
                <StepHeader
                  icon={User}
                  title="Personal Information"
                  subtitle="Let's start with the basics — your name, contact, and a quick summary."
                  gradient="from-violet-500 to-purple-600"
                />

                <ResumeFormStep1
                  initial={{
                    fullName: resumeData.fullName,
                    email: resumeData.email,
                    phone: resumeData.phone,
                    address: resumeData.address,
                    linkedin: resumeData.linkedin,
                    summary: resumeData.summary || "",
                    profileImage: resumeData.profileImage ?? null,
                    profileImageRaw: resumeData.profileImageRaw ?? null,
                    skillsInput: resumeData.skillsInput,
                    jobRole: resumeData.role || resumeData.jobRole || "",
                    experienceYears: resumeData.experienceYears,
                    languages: resumeData.languages ?? [],
                    domain: (resumeData as any).domain || "",
                  }}
                  onNext={(data) => handleNext(data)}
                />
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard>
              <div className="p-8">
                <StepHeader
                  icon={GraduationCap}
                  title="Education"
                  subtitle="Add your degrees, certifications, and academic achievements."
                  gradient="from-sky-500 to-blue-600"
                />

                <ResumeFormStep2
                  initialEducation={(resumeData as any).education}
                  onBack={handleBack}
                  onNext={(data) => handleNext(data)}
                />
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard>
              <div className="p-8">
                <StepHeader
                  icon={Briefcase}
                  title="Work Experience"
                  subtitle="Showcase your professional journey — roles, companies, and impact."
                  gradient="from-teal-500 to-emerald-600"
                />

                <ResumeFormStep3
                  initialExperience={resumeData.experience as any}
                  onBack={handleBack}
                  onNext={(data) => handleNext(data)}
                  skillsInput={resumeData?.skillsInput}
                />
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard>
              <div className="p-8">
                <StepHeader
                  icon={FolderKanban}
                  title="Projects"
                  subtitle="Add your best projects with strong bullet points and links."
                  gradient="from-pink-500 to-rose-500"
                />

                <ResumeFormStep5
                  initialProjects={(resumeData as any).projects}
                  onBack={handleBack}
                  onNext={(data) => handleNext(data)}
                />
              </div>
            </StepCard>
          )}

          {step === 5 && (
            <StepCard>
              <div className="p-8">
                <StepHeader
                  icon={Award}
                  title="Final Details"
                  subtitle="Skills, languages, and anything that makes you stand out."
                  gradient="from-orange-500 to-rose-500"
                />

                <ResumeFormStep4
                  initialSkills={(resumeData as any).skills}
                  onBack={handleBack}
                  onNext={(finalData) => {
                    const full = { ...resumeData, ...finalData };
                    setResumeData(full);

                    if (!draftDisabled) {
                      autoSave({ step: 6, data: full });
                    }

                    setStep(6);
                  }}
                  resumeData={{
                    skillsInput: Array.isArray(resumeData?.skillsInput)
                      ? resumeData.skillsInput.join(", ")
                      : resumeData?.skillsInput
                  }}
                />
              </div>
            </StepCard>
          )}

          {step === 7 && (
            <div className="space-y-5 animate-in slide-in-from-bottom-6 fade-in-0 duration-500">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-violet-200" />
                    <span className="text-sm font-semibold text-violet-200 uppercase tracking-widest">
                      All done!
                    </span>
                  </div>

                  <h2 className="text-3xl font-bold mb-1">
                    Your resume is ready.
                  </h2>

                  <p className="text-violet-200 text-sm max-w-sm">
                    Preview below, then download a pixel-perfect PDF to start
                    applying.
                  </p>
                </div>

                <span className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                <span className="absolute right-10 bottom-0 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
              </div>

              <div className="w-full rounded-3xl border border-gray-100 bg-white shadow-[0_8px_48px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
                <BlobProvider
                  key={finalDocKey}
                  document={
                    <ResumeDocumentRouter
                      data={{
                        ...resumeData,
                        profileImage: resumeData.profileImage ?? (resumeData as any).photo ?? undefined,
                        photo: (resumeData as any).photo ?? resumeData.profileImage ?? undefined,
                        role: (resumeData as any).role ?? (resumeData as any).jobRole ?? "",
                        jobRole: (resumeData as any).jobRole ?? (resumeData as any).role ?? "",
                      }}
                    />
                  }
                >
                  {({ url, loading, error }) => {
                    if (loading) {
                      return (
                        <div
                          className="flex flex-col items-center justify-center gap-3 bg-gray-50/80"
                          style={{ height: "640px" }}
                        >
                          <div className="h-9 w-9 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
                          <span className="text-sm text-gray-400">
                            Preparing your resume…
                          </span>
                        </div>
                      );
                    }

                    if (error || !url) {
                      return (
                        <div
                          className="flex items-center justify-center bg-red-50 text-sm text-red-500"
                          style={{ height: "300px" }}
                        >
                          Preview failed — use the download button below.
                        </div>
                      );
                    }

                    return (
                      <iframe
                        src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
                        className="w-full border-0 bg-white block"
                        style={{ height: "820px" }}
                        title="Resume PDF preview"
                      />
                    );
                  }}
                </BlobProvider>

                <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    ← Back 
                  </button>

                  <div className="flex items-center gap-3">
                    <BlobProvider
                      document={
                        <ResumeDocumentRouter data={{ ...resumeData, profileImage: resumeData.profileImage || undefined }} />
                      }
                    >
                      {({ url, loading }) => (
                        <a
                          href={url ?? "#"}
                          download="resume.pdf"
                          className={[
                            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white",
                            "bg-gradient-to-r from-violet-600 to-indigo-600",
                            "shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)]",
                            "hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200",
                            loading ? "opacity-60 pointer-events-none" : "",
                          ].join(" ")}
                        >
                          <Download className="w-4 h-4" />
                          {loading ? "Preparing…" : "Download PDF"}
                        </a>
                      )}
                    </BlobProvider>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        <aside className="hidden lg:flex flex-col gap-4 sticky top-24">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Your Progress
            </p>

            <ul className="space-y-2.5">
              {STEPS.map((s) => {
                const done = step > s.number;
                const active = step === s.number;

                return (
                  <li key={s.number} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all
                      ${done
                          ? `bg-gradient-to-br ${s.color} text-white shadow`
                          : active
                            ? "bg-gray-100 text-gray-700 ring-2 ring-violet-400 ring-offset-1"
                            : "bg-gray-100 text-gray-400"
                        }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        s.number
                      )}
                    </span>

                    <span
                      className={`text-sm ${active
                        ? "font-semibold text-gray-900"
                        : done
                          ? "text-gray-500"
                          : "text-gray-300"
                        }`}
                    >
                      {s.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {step <= 5 && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-widest">
                  Pro tip
                </span>
              </div>

              <p className="text-sm text-violet-800 leading-relaxed">
                {PROGRESS_TIPS[(step - 1) % PROGRESS_TIPS.length]}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Templates", value: "12+" },
              { label: "Downloads", value: "50k+" },
              { label: "ATS-ready", value: "100%" },
              { label: "Free", value: "Always" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"
              >
                <p className="text-base font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {isFormStep && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 flex items-center gap-2 text-xs text-violet-700 z-20">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="truncate">
            {PROGRESS_TIPS[(step - 1) % PROGRESS_TIPS.length]}
          </span>
        </div>
      )}
    </div>
  );
}