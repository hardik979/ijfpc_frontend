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
} from "lucide-react";

import { ResumeDocumentRouter } from "@/components/resume-builder/ResumePDF";
import { getCroppedImage } from "@/utils/getCroppedImage";
import type { ResumeData, TemplateKey, ResumeFontFamily } from "@/lib/resume";
import {
  uploadedPdfTemplateOptions,
  type UploadedPdfTemplateKey,
} from "@/components/resume-builder/uploadedPdfResumeTemplates";

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
    ...uploadedLayouts
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

function AutoFitA4({
  children,
  zoomMul,
}: {
  children: (dims: { w: number; h: number }) => React.ReactNode;
  zoomMul: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [baseW, setBaseW] = useState<number>(600);

  useEffect(() => {
    if (!wrapRef.current) return;

    const ro = new ResizeObserver(([entry]) => {
      const maxW = entry.contentRect.width;
      const baseFit = Math.max(320, Math.min(maxW - 48, 1200));
      setBaseW(Math.round(baseFit));
    });

    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const aspect = A4_HEIGHT / A4_WIDTH;
  const scaledW = Math.round(baseW * zoomMul);
  const scaledH = Math.round(baseW * aspect * zoomMul);

  return (
    <div ref={wrapRef} className="w-full flex justify-center">
      <div
        className="overflow-hidden rounded-[20px] border border-violet-100 bg-white shadow-[0_20px_70px_rgba(76,29,149,0.12)] ring-1 ring-violet-100/70"
        style={{ width: scaledW, height: scaledH, flexShrink: 0 }}
      >
        <div
          style={{
            width: baseW,
            height: baseW * aspect,
            transform: `scale(${zoomMul})`,
            transformOrigin: "top left",
          }}
        >
          {children({ w: baseW, h: Math.round(baseW * aspect) })}
        </div>
      </div>
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
  onNext: (d: PlaygroundDesign) => void;
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

  const initialAbout = useMemo(() => {
    return typeof data.summary === "string" ? data.summary : "";
  }, [data.summary]);

  const initialPhoto = (safeData.profileImage ?? safeData.photo ?? null) as string | null;

  const [about, setAbout] = useState<string>(initialAbout);
  const [layout, setLayout] = useState<TemplateKey>(
    isValidTemplateKey(safeData.layout) ? safeData.layout : "classicSidebar"
  );
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [rawPhotoSrc, setRawPhotoSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState<boolean>(false);

  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(
    isValidTheme(safeData.theme) ? safeData.theme : "blue"
  );

  const [selectedFontFamily, setSelectedFontFamily] = useState<ResumeFontFamily>(
    isValidFontFamily(safeData.fontFamily) ? safeData.fontFamily : "Helvetica"
  );

  const [selectedFontSize, setSelectedFontSize] = useState<number>(
    typeof safeData.fontSize === "number" ? safeData.fontSize : 12
  );

  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.2);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [zoomMul, setZoomMul] = useState<number>(1);

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

      setPhoto(dataUrl);
      setShowCropper(false);
    } catch (error) {
      console.error("Crop save failed:", error);
    }
  };

  const effectivePhoto = photo ?? safeData.profileImage ?? safeData.photo ?? undefined;

  const mergedData: ResumeWithExtras = {
    ...data,
    summary: about,
    layout,
    profileImage: effectivePhoto,
    photo: effectivePhoto,
    theme: selectedTheme,
    fontFamily: selectedFontFamily,
    fontSize: selectedFontSize,
  };

  const docKey = useMemo(() => JSON.stringify(mergedData), [mergedData]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_28%),linear-gradient(180deg,#faf7ff_0%,#ffffff_48%,#f8fbff_100%)] text-gray-900">
      <aside
        className="sticky top-16 h-[calc(100vh-64px)] w-[300px] xl:w-[360px] shrink-0 overflow-y-auto border-r border-violet-100 bg-white/80 px-5 py-6 backdrop-blur-2xl flex flex-col"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_10px_28px_rgba(124,58,237,0.35)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Design Studio</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Customize your resume with a premium layout.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-600" />
            <p className="text-sm font-semibold text-gray-800">Design Tips</p>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-gray-500">
            Pick a layout, refine your summary, and adjust theme and typography for a stronger preview.
          </p>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Layout className="h-4 w-4 text-violet-600" />
            <div className="text-sm font-semibold text-gray-900">Layout Style</div>
            <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              {LAYOUTS.length} templates
            </span>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                {LAYOUTS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setLayout(t.key)}
                    className={[
                      "group relative rounded-2xl border p-3 text-left transition-all duration-200",
                      layout === t.key
                        ? "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 ring-2 ring-violet-100 shadow-sm"
                        : "border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="text-xl">{t.icon}</span>
                      {layout === t.key && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="line-clamp-1 text-xs font-semibold text-gray-900">
                        {t.name}
                      </div>
                      <div className="line-clamp-2 text-[10px] leading-4 text-gray-500">
                        {t.note}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-gray-900">Theme Accent</h3>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {themePills.map((theme) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => setSelectedTheme(theme.key)}
                className={[
                  "rounded-xl border px-2 py-2 text-[11px] font-semibold transition-all",
                  selectedTheme === theme.key
                    ? "border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-100"
                    : "border-gray-200 bg-white text-gray-600 hover:border-violet-200",
                ].join(" ")}
              >
                <div
                  className={`mx-auto mb-1.5 h-2.5 w-6 rounded-full bg-gradient-to-r ${theme.dot}`}
                />
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-gray-900">Typography</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Font Family
              </label>
              <select
                value={selectedFontFamily}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isValidFontFamily(value)) {
                    setSelectedFontFamily(value);
                  }
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                {fontFamilies.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Font Size
              </label>
              <select
                value={selectedFontSize}
                onChange={(e) => setSelectedFontSize(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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

        <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-gray-900">Profile Photo</h3>
          </div>

          <div className="mb-3 flex items-center gap-3">
            {photo ? (
              <img
                src={photo}
                className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-lg ring-2 ring-violet-100"
                alt="Profile"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-violet-50 to-indigo-50 shadow-lg ring-2 ring-violet-100">
                <Camera className="h-6 w-6 text-violet-300" />
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit Crop
                </button>
              )}
            </div>
          </div>

          {showCropper && rawPhotoSrc && (
            <div className="mt-3 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm">
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

              <div className="space-y-2.5 bg-violet-50/60 p-3">
                <div className="flex items-center gap-2.5">
                  <ZoomOut className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-violet-600"
                  />
                  <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCropper(false)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <div className="text-sm font-semibold text-gray-900">Profile Summary</div>
          </div>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 outline-none transition-all duration-200 placeholder:text-gray-300 hover:border-violet-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 resize-none"
            placeholder="Write a compelling 3–5 line summary about yourself..."
          />
          <div className="mt-1 text-xs font-medium text-gray-400">
            {about.length} characters
          </div>
        </div>

        <div className="flex-1" />

        <div className="sticky bottom-0 border-t border-violet-100 bg-white/90 pt-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={() =>
                onNext({
                  about,
                  photo,
                  layout,
                  theme: selectedTheme,
                  fontFamily: selectedFontFamily,
                  fontSize: selectedFontSize,
                })
              }
              className="ml-auto inline-flex items-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(124,58,237,0.30)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(124,58,237,0.38)]"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto px-6 py-8 xl:px-10">
        <div className="flex h-full flex-col">
          <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-violet-100 bg-white/75 px-5 py-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                <Monitor className="h-3 w-3" />
                Live Preview
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Resume Preview</h1>
              <p className="mt-0.5 text-xs text-gray-500">
                Your resume updates in real time while you refine the design.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2.5 rounded-xl border border-violet-100 bg-white px-3 py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setZoomMul((z) => Math.max(0.4, +(z - 0.05).toFixed(2)))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition-all hover:bg-gray-200"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <span className="min-w-[3.5rem] text-center text-sm font-bold tabular-nums text-gray-700">
                {Math.round(zoomMul * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setZoomMul((z) => Math.min(1.5, +(z + 0.05).toFixed(2)))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition-all hover:bg-gray-200"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-start justify-center rounded-[28px] border border-violet-100 bg-gradient-to-b from-violet-50/50 to-white p-5 xl:p-8 overflow-auto">
            <AutoFitA4 zoomMul={zoomMul}>
              {({ w, h }) => (
                <BlobProvider
                  key={docKey}
                  document={<ResumeDocumentRouter data={mergedData} />}
                >
                  {({ url, loading, error }) => {
                    if (loading) {
                      return (
                        <div
                          style={{ width: w, height: h }}
                          className="flex flex-col items-center justify-center bg-white gap-3"
                        >
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
                          <span className="text-sm text-gray-400">Rendering PDF...</span>
                        </div>
                      );
                    }

                    if (error) {
                      return (
                        <div
                          style={{ width: w, height: h }}
                          className="flex items-center justify-center bg-red-50 p-4 text-sm text-red-700"
                        >
                          PDF preview failed: {String(error)}
                        </div>
                      );
                    }

                    if (!url) {
                      return (
                        <div
                          style={{ width: w, height: h }}
                          className="flex items-center justify-center bg-white text-gray-400 text-sm"
                        >
                          Generating preview...
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{ width: w, height: h, position: "relative" }}
                        className="bg-white"
                      >
                        <a
                          href={url}
                          download="resume.pdf"
                          className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(124,58,237,0.30)]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download PDF
                        </a>

                        <iframe
                          src={`${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
                          style={{
                            width: w,
                            height: h,
                            border: "none",
                            background: "#ffffff",
                            display: "block",
                          }}
                          title="Resume preview"
                        />
                      </div>
                    );
                  }}
                </BlobProvider>
              )}
            </AutoFitA4>
          </div>
        </div>
      </main>
    </div>
  );
}