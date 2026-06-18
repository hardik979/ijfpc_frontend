"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  FormProvider,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  User,
  FileText,
  Award,
  Briefcase,
  GraduationCap,
  FolderKanban,
  Palette,
  Pencil,
  Eye,
} from "lucide-react";

import type { ResumeData } from "@/lib/resume";
import {
  EMPTY_FORM,
  draftToForm,
  type ResumeFormValues,
} from "@/lib/resumeForm";
import { useResumeDraft } from "@/lib/hooks/useResumeDraft";
import RestoreDraftDialog from "@/components/resume-builder/RestoreDraftDialog";

import Accordion, { type AccordionItemConfig } from "./components/Accordion";
import EditorTopBar from "./components/EditorTopBar";
import LivePreviewPanel from "./components/LivePreviewPanel";
import DraftAutoSaver from "./components/DraftAutoSaver";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import SummarySection from "./sections/SummarySection";
import SkillsSection from "./sections/SkillsSection";
import ExperienceSection from "./sections/ExperienceSection";
import EducationSection from "./sections/EducationSection";
import ProjectsSection from "./sections/ProjectsSection";
import DesignSection from "./sections/DesignSection";

const DRAFT_DISABLED_KEY = "resume_draft_disabled";
const DRAFT_STORAGE_KEY = "resume_builder_draft_v1";

type ArrayName = "skills" | "experience" | "education" | "projects";

function countFilled(name: ArrayName, arr: unknown): number {
  if (!Array.isArray(arr)) return 0;
  switch (name) {
    case "skills":
      return arr.filter((s) => String(s ?? "").trim()).length;
    case "experience":
      return arr.filter((e) => e?.jobTitle?.trim() || e?.company?.trim()).length;
    case "education":
      return arr.filter((e) => e?.degree?.trim() || e?.institution?.trim()).length;
    case "projects":
      return arr.filter((p) => p?.name?.trim()).length;
  }
}

function CountBadge({ name }: { name: ArrayName }) {
  const { control } = useFormContext<ResumeFormValues>();
  const arr = useWatch({ control, name });
  const n = countFilled(name, arr);
  if (!n) return null;
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-1.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
      {n}
    </span>
  );
}

const ACCORDION_ITEMS: AccordionItemConfig[] = [
  {
    id: "personal",
    title: "Personal Info",
    subtitle: "Name, contact, photo & languages",
    icon: User,
    gradient: "from-violet-500 to-purple-600",
    content: <PersonalInfoSection />,
  },
  {
    id: "skills",
    title: "Skills",
    subtitle: "Add these first — the AI builds from them",
    icon: Award,
    gradient: "from-orange-500 to-rose-500",
    badge: <CountBadge name="skills" />,
    content: <SkillsSection />,
  },
  {
    id: "summary",
    title: "Professional Summary",
    subtitle: "A short, strong intro (uses your skills)",
    icon: FileText,
    gradient: "from-fuchsia-500 to-pink-600",
    content: <SummarySection />,
  },
  {
    id: "experience",
    title: "Work Experience",
    subtitle: "Roles, dates & achievements",
    icon: Briefcase,
    gradient: "from-teal-500 to-emerald-600",
    badge: <CountBadge name="experience" />,
    content: <ExperienceSection />,
  },
  {
    id: "education",
    title: "Education",
    subtitle: "Degrees & highlights",
    icon: GraduationCap,
    gradient: "from-sky-500 to-blue-600",
    badge: <CountBadge name="education" />,
    content: <EducationSection />,
  },
  {
    id: "projects",
    title: "Projects",
    subtitle: "Best work with strong bullets",
    icon: FolderKanban,
    gradient: "from-pink-500 to-rose-500",
    badge: <CountBadge name="projects" />,
    content: <ProjectsSection />,
  },
  {
    id: "design",
    title: "Design & Style",
    subtitle: "Template, theme & typography",
    icon: Palette,
    gradient: "from-indigo-500 to-violet-600",
    content: <DesignSection />,
  },
];

export default function ResumeBuilderPage() {
  const methods = useForm<ResumeFormValues>({ defaultValues: EMPTY_FORM });

  const { autoSave, clearDraft } = useResumeDraft<Partial<ResumeData>>();

  const [restoreState, setRestoreState] = useState<"checking" | "prompt" | "none">(
    "checking"
  );
  const [bootDraftData, setBootDraftData] = useState<Partial<ResumeData> | null>(
    null
  );
  const [restored, setRestored] = useState(false);
  const [draftDisabled, setDraftDisabled] = useState(true);

  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  // One-time boot check: decide whether to offer a restore, independent of the
  // autosaver (so a fresh empty form can't clobber a real saved draft).
  useEffect(() => {
    try {
      const disabled = localStorage.getItem(DRAFT_DISABLED_KEY) === "true";
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw && !disabled) {
        const parsed = JSON.parse(raw);
        if (parsed?.data) {
          setBootDraftData(parsed.data as Partial<ResumeData>);
          setRestoreState("prompt");
          setDraftDisabled(false);
          return;
        }
      }
      setRestoreState("none");
      setDraftDisabled(disabled);
    } catch {
      setRestoreState("none");
      setDraftDisabled(false);
    }
  }, []);

  const showRestore = restoreState === "prompt" && !restored;
  const autosaveDisabled =
    draftDisabled || restoreState === "checking" || showRestore;

  const acceptRestore = () => {
    if (bootDraftData) methods.reset(draftToForm(bootDraftData));
    setRestored(true);
  };

  const discardRestore = () => {
    clearDraft();
    localStorage.setItem(DRAFT_DISABLED_KEY, "true");
    setDraftDisabled(true);
    setRestored(true);
  };

  const savedLabel = autosaveDisabled ? "" : "Saved to this browser";

  return (
    <FormProvider {...methods}>
      <div className="flex h-screen flex-col bg-[#F8F7FF] dark:bg-gray-950">
        <EditorTopBar savedLabel={savedLabel} />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* LEFT — input accordion */}
          <section
            className={`no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:pb-6 ${
              mobileView === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            <div className="mx-auto max-w-2xl">
              <Accordion
                items={ACCORDION_ITEMS}
                defaultOpenIds={["personal"]}
                singleOpen
              />
            </div>
          </section>

          {/* RIGHT — live preview */}
          <aside
            className={`min-h-0 flex-1 overflow-hidden border-t border-gray-100 dark:border-gray-800 lg:border-l lg:border-t-0 ${
              mobileView === "edit" ? "hidden lg:block" : "block"
            }`}
          >
            <LivePreviewPanel />
          </aside>
        </div>

        {/* Mobile Edit / Preview toggle */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("edit")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              mobileView === "edit"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow"
                : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              mobileView === "preview"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow"
                : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
        </div>

        <DraftAutoSaver
          disabled={autosaveDisabled}
          onSave={(data) => autoSave({ step: 0, data })}
        />

        <RestoreDraftDialog
          open={showRestore}
          onUse={acceptRestore}
          onDiscard={discardRestore}
        />
      </div>
    </FormProvider>
  );
}
