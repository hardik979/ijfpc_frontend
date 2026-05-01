"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { BlobProvider } from "@react-pdf/renderer";
import {
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Upload,
  Edit3,
  Sparkles,
  Layout,
  FileText,
  Camera,
  Check,
  ChevronLeft,
  Monitor,
  Palette,
  Wand2,
  Type,
  Download,
  Eye,
  X,
} from "lucide-react";

import { ResumeDocumentRouter } from "@/components/resume-builder/ResumePDF";
import EditableResumePreview from "./EditableResumePreview";
import { getCroppedImage } from "@/utils/getCroppedImage";
import type { ResumeData, TemplateKey, ResumeFontFamily } from "@/lib/resume";
import { uploadedPdfTemplateOptions } from "@/components/resume-builder/uploadedPdfResumeTemplates";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const uploadedLayouts = uploadedPdfTemplateOptions.map((item) => ({
  key: item.key as TemplateKey,
  name: item.label,
  note: "Imported PDF-inspired template",
  icon: "🧾",
}));

const LAYOUTS: Array<{
  key: TemplateKey;
  name: string;
  note: string;
  icon: string;
}> = [
    { key: "classicSidebar", name: "Classic Sidebar", note: "Dark left rail, content right", icon: "📄" },
    { key: "accentHeader", name: "Accent Header", note: "Colored band, two-col bottom", icon: "🎯" },
    { key: "splitTwoColumn", name: "Split Two-Column", note: "Info left, work right", icon: "📊" },
    { key: "timeline", name: "Timeline", note: "Left-border experience timeline", icon: "⏱️" },
    { key: "minimalClean", name: "Minimal Clean", note: "Accent strip, airy single column", icon: "✨" },
    { key: "modernCorporate", name: "Modern Corporate", note: "Card header with photo, 65/35", icon: "🏢" },
    { key: "atsCompact", name: "ATS Compact", note: "Plain single column, ATS-safe", icon: "✅" },
    { key: "elegantSidebar", name: "Elegant Sidebar", note: "Soft-toned light sidebar", icon: "🪄" },
    { key: "template9", name: "Modern Left Bar", note: "Solid color left column", icon: "🖤" },
    { key: "template10", name: "Simple Header", note: "Bold gradient header strip", icon: "🎨" },
    { key: "template11", name: "Compact Pro", note: "Strip header, 3-column footer", icon: "💼" },
    { key: "template12", name: "Bold Name", note: "Oversized name, underline rule", icon: "✍️" },
    { key: "template13", name: "Infographic Bar", note: "Visual skill-bar sidebar", icon: "📈" },
    { key: "template14", name: "Top Contact Bar", note: "Contact info banner at top", icon: "📌" },
    { key: "template15", name: "Executive", note: "Right sidebar, premium feel", icon: "👔" },
    { key: "template16", name: "Two-Tone Split", note: "Soft left panel, white right", icon: "🎭" },
    { key: "template17", name: "Minimalist Line", note: "Thin rules, uppercase labels", icon: "📐" },
    { key: "template18", name: "Card Stack", note: "Each section in a bordered card", icon: "🃏" },
    { key: "template19", name: "Fresh Graduate", note: "Photo + name side by side", icon: "🎓" },
    { key: "template20", name: "Tech Dark", note: "Dark themed, inverted sidebar", icon: "💻" },
    {
      key: "naukriStyle",
      name: "Naukri Style",
      note: "Recruiter-friendly Naukri inspired format",
      icon: "📘",
    },
    ...uploadedLayouts,
  ];

const themePills = [
  { key: "blue", name: "Blue", dot: "from-blue-500 to-indigo-600" },
  { key: "slate", name: "Slate", dot: "from-slate-500 to-slate-700" },
  { key: "emerald", name: "Emerald", dot: "from-emerald-500 to-teal-600" },
  { key: "purple", name: "Purple", dot: "from-purple-500 to-violet-700" },
  { key: "rose", name: "Rose", dot: "from-rose-500 to-pink-600" },
  { key: "teal", name: "Teal", dot: "from-teal-500 to-cyan-600" },
  { key: "amber", name: "Amber", dot: "from-amber-500 to-orange-600" },
] as const;

type ThemeKey = (typeof themePills)[number]["key"];

const fontFamilies: Array<{ key: ResumeFontFamily; name: string }> = [
  { key: "Helvetica", name: "Helvetica" },
  { key: "Times-Roman", name: "Times" },
  { key: "Courier", name: "Courier" },
  { key: "Roboto", name: "Roboto" },
];

const fontSizes = [
  { key: "small", name: "Small", value: 10 },
  { key: "medium", name: "Medium", value: 12 },
  { key: "large", name: "Large", value: 14 },
] as const;

function isValidTheme(value: unknown): value is ThemeKey {
  return themePills.some((t) => t.key === value);
}

function isValidFontFamily(value: unknown): value is ResumeFontFamily {
  return fontFamilies.some((f) => f.key === value);
}

function isValidTemplateKey(value: unknown): value is TemplateKey {
  return LAYOUTS.some((t) => t.key === value);
}

function PreviewScale({
  children,
  zoomMul,
}: {
  children: (scale: number) => React.ReactNode;
  zoomMul: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.78);

  useEffect(() => {
    if (!wrapRef.current) return;

    const ro = new ResizeObserver(([entry]) => {
      const maxW = entry.contentRect.width - 40;
      const fitScale = Math.min(maxW / A4_WIDTH, 1);
      setScale(Math.max(0.45, fitScale) * zoomMul);
    });

    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [zoomMul]);

  return (
    <div ref={wrapRef} className="flex w-full justify-center overflow-auto">
      <div className="pt-2">{children(scale)}</div>
    </div>
  );
}

export type PlaygroundDesign = {
  about: string;
  photo: string | null;
  layout: TemplateKey;
  theme: ThemeKey;
  fontFamily: ResumeFontFamily;
  fontSize: number;
};

type ResumeWithExtras = ResumeData & {
  summary: string;
  layout: TemplateKey;
  profileImage?: string;
  photo?: string;
  theme: ThemeKey;
  fontFamily: ResumeFontFamily;
  fontSize: number;
};

type Props = {
  data: ResumeData;
  onNext: (d: ResumeWithExtras) => void;
  onBack: () => void;
};

export default function ResumePlayground({ data, onNext, onBack }: Props) {
  const safeData = data as ResumeData & {
    layout?: TemplateKey;
    profileImage?: string;
    photo?: string;
    theme?: ThemeKey;
    fontFamily?: ResumeFontFamily;
    fontSize?: number;
  };

  const [resumeState, setResumeState] = useState<ResumeWithExtras>({
    ...data,
    summary: typeof data.summary === "string" ? data.summary : "",
    layout: isValidTemplateKey(safeData.layout) ? safeData.layout : "classicSidebar",
    profileImage: safeData.profileImage ?? safeData.photo ?? undefined,
    photo: safeData.profileImage ?? safeData.photo ?? undefined,
    theme: isValidTheme(safeData.theme) ? safeData.theme : "blue",
    fontFamily: isValidFontFamily(safeData.fontFamily)
      ? safeData.fontFamily
      : "Helvetica",
    fontSize: typeof safeData.fontSize === "number" ? safeData.fontSize : 12,
  });

  const [rawPhotoSrc, setRawPhotoSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [zoomMul, setZoomMul] = useState<number>(1);
  const [previewLayout, setPreviewLayout] = useState<TemplateKey | null>(null);

  const updateField = <K extends keyof ResumeWithExtras>(
    key: K,
    value: ResumeWithExtras[K]
  ) => {
    setResumeState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setResumeState((prev) => {
      const nextSkills = Array.isArray(prev.skills) ? [...prev.skills] : [];
      nextSkills[index] = value;
      return { ...prev, skills: nextSkills };
    });
  };

  const updateExperienceField = (
    expIndex: number,
    key: "jobTitle" | "company" | "startDate" | "endDate" | "start" | "end",
    value: string
  ) => {
    setResumeState((prev) => {
      const nextExperience = Array.isArray(prev.experience)
        ? [...prev.experience]
        : [];
      const current = nextExperience[expIndex] || {};
      nextExperience[expIndex] = {
        ...current,
        [key]: value,
      };
      return { ...prev, experience: nextExperience };
    });
  };

  const updateExperienceBullet = (
    expIndex: number,
    bulletIndex: number,
    value: string
  ) => {
    setResumeState((prev) => {
      const nextExperience = Array.isArray(prev.experience)
        ? [...prev.experience]
        : [];
      const current = nextExperience[expIndex] || {};
      const bullets = Array.isArray(current.bullets)
        ? [...current.bullets]
        : Array.isArray(current.points)
          ? [...current.points]
          : [];

      bullets[bulletIndex] = value;

      nextExperience[expIndex] = {
        ...current,
        bullets,
      };

      return { ...prev, experience: nextExperience };
    });
  };

  const onFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setRawPhotoSrc(result);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1.2);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  };

  const saveCrop = async () => {
    try {
      if (!rawPhotoSrc || !croppedAreaPixels) return;

      const dataUrl = await getCroppedImage(
        rawPhotoSrc,
        {
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
        },
        700
      );

      updateField("photo", dataUrl);
      updateField("profileImage", dataUrl);
      setShowCropper(false);
    } catch (error) {
      console.error("Crop save failed:", error);
    }
  };

  const docKey = useMemo(() => JSON.stringify(resumeState), [resumeState]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_28%),linear-gradient(180deg,#faf7ff_0%,#ffffff_48%,#f8fbff_100%)] dark:bg-none dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <aside
        className="sticky top-16 hidden h-[calc(100vh-64px)] w-[240px] shrink-0 overflow-y-auto border-r border-violet-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-5 py-6 backdrop-blur-2xl xl:flex xl:flex-col"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_10px_28px_rgba(124,58,237,0.35)]">
            <Layout className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">Templates</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Select the layout for your resume.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Template Library</p>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Choose the structure first, then edit content directly in the center preview.
          </p>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Layout className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Templates</div>
          <span className="ml-auto rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
            {LAYOUTS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {LAYOUTS.map((t) => (
            <div
              key={t.key}
              className={[
                "group relative rounded-2xl border p-3 transition-all duration-200",
                resumeState.layout === t.key
                  ? "border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 ring-2 ring-violet-100 dark:ring-violet-900/40 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-200 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/30",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => updateField("layout", t.key)}
                className="block w-full text-left"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-xl">{t.icon}</span>
                  {resumeState.layout === t.key && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</div>
                  <div className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t.note}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewLayout(t.key);
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-gray-800 px-2 py-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto px-2 py-6 lg:px-4 xl:px-6">
        <div className="flex h-full flex-col">
          <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-violet-100 dark:border-gray-800 bg-white/75 dark:bg-gray-900/75 px-5 py-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-violet-100 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
                <Monitor className="h-3 w-3" />
                Live Preview
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Resume Preview
              </h1>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Click any text in preview to edit it directly.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2.5 rounded-xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setZoomMul((z) => Math.max(0.5, +(z - 0.05).toFixed(2)))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <span className="min-w-[3.5rem] text-center text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">
                {Math.round(zoomMul * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setZoomMul((z) => Math.min(1.4, +(z + 0.05).toFixed(2)))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-start justify-center min-h-[800px] rounded-[28px] border border-violet-100 dark:border-gray-800 bg-gradient-to-b from-violet-50/50 to-white dark:from-violet-950/20 dark:to-gray-900 p-4 lg:p-6 xl:p-8 overflow-auto">
            <PreviewScale zoomMul={zoomMul}>
              {(scale) => (
                <EditableResumePreview
                  data={resumeState}
                  scale={scale}
                  updateField={updateField}
                  updateSkill={updateSkill}
                  updateExperienceField={updateExperienceField}
                  updateExperienceBullet={updateExperienceBullet}
                />
              )}
            </PreviewScale>
          </div>
        </div>
      </main>

      <aside
        className="sticky top-16 hidden h-[calc(100vh-64px)] shadow-inner w-[280px] shrink-0 overflow-y-auto border-l border-violet-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-5 py-6 backdrop-blur-2xl xl:flex xl:flex-col"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_10px_28px_rgba(124,58,237,0.35)]">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">Customize</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Adjust theme, typography, photo, and summary.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Design Tips</p>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Content can now be edited directly in preview. Use this panel for styling controls.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Theme Accent</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {themePills.map((theme) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => updateField("theme", theme.key)}
                className={[
                  "rounded-xl border px-2 py-2 text-[11px] font-semibold transition-all",
                  resumeState.theme === theme.key
                    ? "border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-900/40"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:border-violet-200 dark:hover:border-violet-700",
                ].join(" ")}
              >
                <div
                  className={`mx-auto mb-1.5 h-2.5 w-8 rounded-full bg-gradient-to-r ${theme.dot}`}
                />
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Typography</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Font Family
              </label>
              <select
                value={resumeState.fontFamily}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidFontFamily(value)) {
                    updateField("fontFamily", value);
                  }
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-100 outline-none transition-all focus:border-violet-400 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/40"
              >
                {fontFamilies.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Font Size
              </label>
              <select
                value={resumeState.fontSize}
                onChange={(e) => updateField("fontSize", Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-100 outline-none transition-all focus:border-violet-400 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/40"
              >
                {fontSizes.map((size) => (
                  <option key={size.key} value={size.value}>
                    {size.name} ({size.value}px)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile Photo</h3>
          </div>

          <div className="mb-3 flex items-center gap-3">
            {resumeState.photo ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-violet-200 dark:border-violet-900/50 shadow-md">
                <img
                  src={resumeState.photo}
                  className="absolute inset-0 h-full w-full object-cover"
                  alt="Profile"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 shadow-md">
                <Camera className="h-6 w-6 text-violet-300 dark:text-violet-400" />
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              <label className="block w-full cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFileSelect(f);
                  }}
                />
                <div className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(124,58,237,0.32)]">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo
                </div>
              </label>

              {rawPhotoSrc && (
                <button
                  type="button"
                  onClick={() => setShowCropper(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-all hover:border-violet-200 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/30"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit Crop
                </button>
              )}
            </div>
          </div>

          {showCropper && rawPhotoSrc && (
            <div className="mt-3 overflow-hidden rounded-xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="relative h-52 bg-gray-900">
                <Cropper
                  image={rawPhotoSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  restrictPosition
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="space-y-2.5 bg-violet-50/60 dark:bg-violet-950/30 p-3">
                <div className="flex items-center gap-2.5">
                  <ZoomOut className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-violet-600"
                  />
                  <ZoomIn className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCropper(false)}
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveCrop}
                    className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile Summary</div>
          </div>

          <textarea
            value={resumeState.summary}
            onChange={(e) => updateField("summary", e.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-100 outline-none transition-all duration-200 placeholder:text-gray-300 dark:placeholder:text-gray-500 hover:border-violet-300 dark:hover:border-violet-500 focus:border-violet-400 dark:focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/40"
            placeholder="Write a compelling 3–5 line summary about yourself..."
          />
          <div className="mt-1 text-xs font-medium text-gray-400 dark:text-gray-500">
            {resumeState.summary.length} characters
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Export PDF</h3>
          </div>

          <BlobProvider
            key={docKey}
            document={<ResumeDocumentRouter data={resumeState} />}
          >
            {({ url, loading }) =>
              loading ? (
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/40 px-3 py-2 text-xs text-violet-700 dark:text-violet-300">
                  Generating PDF...
                </div>
              ) : url ? (
                <a
                  href={url}
                  download="resume.pdf"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              ) : (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  PDF not ready
                </div>
              )
            }
          </BlobProvider>
        </div>

        <div className="sticky bottom-0 mt-4 border-t border-violet-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 pt-4 pb-2 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={() => onNext(resumeState)}

              className="ml-auto inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(124,58,237,0.30)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,58,237,0.38)]"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {previewLayout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreviewLayout(null)}
        >
          <div
            className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">
                  Template Preview
                </p>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {LAYOUTS.find((l) => l.key === previewLayout)?.name ?? previewLayout}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewLayout) updateField("layout", previewLayout);
                    setPreviewLayout(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition-all"
                >
                  <Check className="h-4 w-4" />
                  Use this template
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLayout(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
              <BlobProvider
                key={previewLayout}
                document={
                  <ResumeDocumentRouter
                    data={{ ...(resumeState as any), layout: previewLayout } as ResumeData}
                  />
                }
              >
                {({ url, loading, error }) => {
                  if (loading) {
                    return (
                      <div className="flex h-full items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 dark:border-violet-900 border-t-violet-600 dark:border-t-violet-400" />
                        Rendering preview…
                      </div>
                    );
                  }
                  if (error || !url) {
                    return (
                      <div className="flex h-full items-center justify-center text-sm text-red-500 dark:text-red-400">
                        Preview failed to render.
                      </div>
                    );
                  }
                  return (
                    <iframe
                      src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`}
                      className="h-full w-full border-0"
                      title="Template preview"
                    />
                  );
                }}
              </BlobProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}