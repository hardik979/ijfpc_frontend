"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useFormContext } from "react-hook-form";
import {
  Mail,
  Phone,
  Linkedin,
  MapPin,
  GripVertical,
  Trash2,
  Plus,
} from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { normalizeSectionPages, type SectionKey } from "@/lib/resume";
import { getThemePalette } from "@/lib/resumePdfStyles";

/* A4 at 96dpi — the same sheet size the PDF templates target. */
const PAGE_W = 794;
const PAGE_H = 1123;

const SECTION_TITLES: Record<SectionKey, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  languages: "Languages",
};

/* Inline click-to-edit text. Single source of truth is the RHF form: we set the
 * DOM text from `value` ONLY when the element is not focused, so the caret never
 * jumps while the user types here, and onBlur writes back via `onSave`.
 * Placeholder is shown via CSS ([data-ph]:empty::before in globals.css). */
function EditableText({
  value,
  onSave,
  className = "",
  as = "div",
  placeholder = "",
  style,
}: {
  value?: string;
  onSave: (value: string) => void;
  className?: string;
  as?: "div" | "h1" | "h2" | "p" | "span";
  placeholder?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = as as any;

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const next = value ?? "";
    if (el.textContent !== next) el.textContent = next;
  }, [value]);

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onBlur={(e: React.FocusEvent<HTMLElement>) =>
        onSave(e.currentTarget.textContent || "")
      }
      style={style}
      className={`cursor-text rounded-md px-1 outline-none transition hover:bg-violet-50/70 focus:bg-violet-50 focus:ring-2 focus:ring-violet-200 ${className}`}
    />
  );
}

const hasText = (v?: string) => !!(v && v.trim());

/* One A4 sheet. Grows past A4 height if its sections don't fit, and draws a
 * dashed marker at the real A4 boundary so the user knows where the printed
 * page ends. */
function PageSheet({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollHeight > PAGE_H + 4);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="rounded-[20px] border border-violet-100 dark:border-gray-800 bg-white shadow-[0_20px_70px_rgba(76,29,149,0.12)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
        style={{ width: PAGE_W, minHeight: PAGE_H }}
      >
        {children}
      </div>
      {overflow && (
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{ top: PAGE_H }}
        >
          <div className="border-t-2 border-dashed border-amber-400" />
          <p className="mt-1 text-center text-[11px] font-semibold text-amber-500">
            A4 page ends here — content below this line flows onto the next
            page in the PDF
          </p>
        </div>
      )}
    </div>
  );
}

export default function EditableResumePreview({
  scale = 1,
}: {
  scale?: number;
}) {
  const { watch, setValue } = useFormContext<ResumeFormValues>();
  // watch() reliably reflects setValue on every field (incl. photo, which has
  // no registered input) and re-renders this leaf on each change.
  const data = watch();

  const palette = getThemePalette(data.theme);

  // All text sizes derive from the chosen font size so the Design & Style
  // "Font Size" control (Small/Medium/Large) actually changes the preview.
  const fs = typeof data.fontSize === "number" ? data.fontSize : 12;
  const sz = {
    name: fs * 2.1,
    role: fs * 1.35,
    heading: fs * 1.25,
    jobTitle: fs * 1.35,
    body: fs,
    small: fs * 0.9,
    chip: fs * 0.95,
  };

  const skills = (data.skills ?? []).map((s, i) => [s, i] as const);
  const experience = data.experience ?? [];
  const projects = data.projects ?? [];
  const education = data.education ?? [];
  const languages = (data.languages ?? []).map((l, i) => [l, i] as const);

  const hasSkills = skills.some(([s]) => hasText(s));
  const hasLanguages = languages.some(([l]) => hasText(l));

  const headingStyle: CSSProperties = {
    color: palette.primary,
    fontSize: sz.heading,
  };
  const bulletStyle: CSSProperties = {
    fontSize: sz.body,
    textAlign: "justify",
  };

  const set = (path: any, v: string) =>
    setValue(path, v as any, { shouldDirty: true });

  /* ── Pages layout (drag-and-drop) ─────────────────────────────────── */

  const pages = normalizeSectionPages(data.sectionPages);

  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const [overSlot, setOverSlot] = useState<string | null>(null);

  const savePages = (next: SectionKey[][]) =>
    setValue("sectionPages", next, { shouldDirty: true });

  const moveSection = (key: SectionKey, toPage: number, toIndex: number) => {
    const next = pages.map((p) => [...p]);
    for (let p = 0; p < next.length; p++) {
      const i = next[p].indexOf(key);
      if (i === -1) continue;
      next[p].splice(i, 1);
      if (p === toPage && i < toIndex) toIndex -= 1;
      break;
    }
    next[toPage].splice(toIndex, 0, key);
    savePages(next);
  };

  const addPage = () => savePages([...pages.map((p) => [...p]), []]);

  const deletePage = (pageIndex: number) => {
    if (pages.length <= 1) return;
    const next = pages.map((p) => [...p]);
    const [removed] = next.splice(pageIndex, 1);
    // keep the removed page's sections: merge into the neighbouring page
    if (pageIndex === 0) next[0] = [...removed, ...next[0]];
    else next[pageIndex - 1] = [...next[pageIndex - 1], ...removed];
    savePages(next);
  };

  /* Sections with no content stay hidden (as before) but keep their slot in
   * the pages layout, so only visible sections can be dragged. */
  const visibleMap: Record<SectionKey, boolean> = {
    summary: hasText(data.summary),
    skills: hasSkills,
    experience: experience.length > 0,
    projects: projects.length > 0,
    education: education.length > 0,
    languages: hasLanguages,
  };

  /* Drop target between sections. Insert position = index within the page's
   * key array. Invisible when nothing is being dragged. Plain render helpers
   * (not components) so React never remounts the editable text around them. */
  const renderDropZone = (page: number, index: number, tall?: boolean) => {
    const id = `${page}:${index}`;
    const over = overSlot === id;
    if (dragKey === null) {
      return tall ? (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
          This page is empty — drag a section heading here, or delete the page
        </div>
      ) : (
        <div aria-hidden className="-my-1 h-2" />
      );
    }
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (overSlot !== id) setOverSlot(id);
        }}
        onDragLeave={() => setOverSlot((s) => (s === id ? null : s))}
        onDrop={(e) => {
          e.preventDefault();
          moveSection(dragKey, page, index);
          setDragKey(null);
          setOverSlot(null);
        }}
        className={`my-2 flex items-center justify-center rounded-xl border-2 border-dashed text-xs font-semibold transition-all ${
          tall ? "h-40" : "h-10"
        } ${
          over
            ? "border-violet-500 bg-violet-100/80 text-violet-700"
            : "border-violet-300 bg-violet-50/60 text-violet-400"
        }`}
      >
        Drop “{SECTION_TITLES[dragKey]}” here
      </div>
    );
  };

  /* Section wrapper: the heading row is the drag handle, so dragging never
   * fights with the contentEditable text below it. */
  const renderSectionShell = (k: SectionKey, children: React.ReactNode) => (
    <section
      className={`mb-8 transition-opacity ${
        dragKey === k ? "opacity-40" : ""
      }`}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", k);
          setDragKey(k);
        }}
        onDragEnd={() => {
          setDragKey(null);
          setOverSlot(null);
        }}
        className="group relative mb-3 flex cursor-grab items-center active:cursor-grabbing"
        title="Drag to move this section — you can drop it on any page"
      >
        <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 transition group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </span>
        <h2 className="font-semibold" style={headingStyle}>
          {SECTION_TITLES[k]}
        </h2>
      </div>
      {children}
    </section>
  );

  const renderSectionBody = (k: SectionKey): React.ReactNode => {
    switch (k) {
      case "summary":
        return (
          <EditableText
            as="p"
            value={data.summary}
            onSave={(v) => set("summary", v)}
            className="leading-7 text-gray-700"
            style={{ fontSize: sz.body, textAlign: "justify" }}
            placeholder="Write your professional summary here..."
          />
        );

      case "skills":
        return (
          <div className="flex flex-wrap gap-2">
            {skills.map(([skill, index]) =>
              hasText(skill) ? (
                <EditableText
                  key={index}
                  as="span"
                  value={skill}
                  onSave={(v) => set(`skills.${index}`, v)}
                  className="rounded-full border px-3 py-1 text-gray-700"
                  style={{ borderColor: palette.border, fontSize: sz.chip }}
                  placeholder="Skill"
                />
              ) : null
            )}
          </div>
        );

      case "experience":
        return (
          <div className="space-y-6">
            {experience.map((exp, expIndex) => {
              const bullets = exp.bullets ?? [];
              const visible =
                hasText(exp.jobTitle) ||
                hasText(exp.company) ||
                bullets.some(hasText);
              if (!visible) return null;

              return (
                <div
                  key={expIndex}
                  className="rounded-xl border p-4"
                  style={{ borderColor: palette.border }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <EditableText
                        as="h2"
                        value={exp.jobTitle}
                        onSave={(v) =>
                          set(`experience.${expIndex}.jobTitle`, v)
                        }
                        className="font-semibold text-gray-900"
                        style={{ fontSize: sz.jobTitle }}
                        placeholder="Job Title"
                      />
                      <EditableText
                        as="p"
                        value={exp.company}
                        onSave={(v) =>
                          set(`experience.${expIndex}.company`, v)
                        }
                        style={{ color: palette.subText, fontSize: sz.small }}
                        placeholder="Company Name"
                      />
                    </div>

                    <div
                      className="min-w-[140px] text-right"
                      style={{ color: palette.subText, fontSize: sz.small }}
                    >
                      <EditableText
                        as="p"
                        value={exp.startDate}
                        onSave={(v) =>
                          set(`experience.${expIndex}.startDate`, v)
                        }
                        placeholder="Start"
                      />
                      <EditableText
                        as="p"
                        value={exp.isCurrent ? "Present" : exp.endDate}
                        onSave={(v) =>
                          set(`experience.${expIndex}.endDate`, v)
                        }
                        placeholder="End"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {bullets.map((bullet, bulletIndex) =>
                      hasText(bullet) ? (
                        <EditableText
                          key={bulletIndex}
                          as="p"
                          value={bullet}
                          onSave={(v) =>
                            set(
                              `experience.${expIndex}.bullets.${bulletIndex}`,
                              v
                            )
                          }
                          className="leading-6 text-gray-700"
                          style={bulletStyle}
                          placeholder="Write bullet point"
                        />
                      ) : null
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "projects":
        return (
          <div className="space-y-4">
            {projects.map((project, index) => {
              const bullets = project.bullets ?? [];
              const visible =
                hasText(project.name) ||
                hasText(project.techStack) ||
                bullets.some(hasText);
              if (!visible) return null;

              return (
                <div
                  key={index}
                  className="rounded-xl border p-4"
                  style={{ borderColor: palette.border }}
                >
                  <EditableText
                    as="h2"
                    value={project.name}
                    onSave={(v) => set(`projects.${index}.name`, v)}
                    className="font-semibold"
                    style={{ fontSize: sz.jobTitle }}
                    placeholder="Project Name"
                  />
                  <EditableText
                    as="p"
                    value={project.techStack}
                    onSave={(v) => set(`projects.${index}.techStack`, v)}
                    className="mt-1"
                    style={{ color: palette.subText, fontSize: sz.small }}
                    placeholder="Tech stack"
                  />
                  <div className="mt-3 space-y-2">
                    {bullets.map((bullet, bulletIndex) =>
                      hasText(bullet) ? (
                        <EditableText
                          key={bulletIndex}
                          as="p"
                          value={bullet}
                          onSave={(v) =>
                            set(
                              `projects.${index}.bullets.${bulletIndex}`,
                              v
                            )
                          }
                          className="leading-6 text-gray-700"
                          style={bulletStyle}
                          placeholder="Write bullet point"
                        />
                      ) : null
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "education":
        return (
          <div className="space-y-4">
            {education.map((edu, index) => {
              const visible =
                hasText(edu.degree) ||
                hasText(edu.institution) ||
                hasText(edu.startYear) ||
                hasText(edu.endYear);
              if (!visible) return null;

              return (
                <div
                  key={index}
                  className="rounded-xl border p-4"
                  style={{ borderColor: palette.border }}
                >
                  <EditableText
                    as="p"
                    value={edu.degree}
                    onSave={(v) => set(`education.${index}.degree`, v)}
                    className="font-semibold text-gray-900"
                    style={{ fontSize: sz.body }}
                    placeholder="Degree / Qualification"
                  />
                  <EditableText
                    as="p"
                    value={edu.institution}
                    onSave={(v) => set(`education.${index}.institution`, v)}
                    style={{ color: palette.subText, fontSize: sz.small }}
                    placeholder="Institution"
                  />
                  <p style={{ color: palette.subText, fontSize: sz.small }}>
                    {edu.startYear || ""}
                    {edu.startYear || edu.endYear ? " - " : ""}
                    {edu.currentlyStudying ? "Present" : edu.endYear || ""}
                  </p>
                </div>
              );
            })}
          </div>
        );

      case "languages":
        return (
          <div className="flex flex-wrap gap-2">
            {languages.map(([lang, index]) =>
              hasText(lang) ? (
                <span
                  key={index}
                  className="rounded-full border px-3 py-1 text-gray-700"
                  style={{ borderColor: palette.border, fontSize: sz.chip }}
                >
                  {lang}
                </span>
              ) : null
            )}
          </div>
        );
    }
  };

  return (
    <div
      className="origin-top"
      style={{
        width: PAGE_W,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
    >
      <p className="mb-3 text-center text-[11px] font-medium text-gray-400 dark:text-gray-500">
        Drag a section heading to move it — you can drop it on any page
      </p>

      {pages.map((keys, pageIndex) => {
        const visibleCount = keys.filter((k) => visibleMap[k]).length;

        return (
          <div key={pageIndex}>
            {/* Page toolbar (outside the sheet, never printed) */}
            <div className="mb-2 mt-8 flex items-center justify-between px-1 first:mt-0">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Page {pageIndex + 1} of {pages.length}
              </span>
              <button
                type="button"
                onClick={() => deletePage(pageIndex)}
                disabled={pages.length <= 1}
                title={
                  pages.length <= 1
                    ? "The resume needs at least one page"
                    : "Delete this page (its sections move to the previous page)"
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete page
              </button>
            </div>

            <PageSheet>
              <div
                className="h-full w-full p-10 text-gray-900"
                style={{
                  fontFamily: data.fontFamily,
                  fontSize: `${fs}px`,
                  lineHeight: 1.55,
                }}
              >
                {/* Header — pinned to the top of page 1 */}
                {pageIndex === 0 && (
                  <div
                    className="mb-8 flex items-start gap-6 border-b pb-6"
                    style={{ borderColor: palette.border }}
                  >
                    {data.photo ? (
                      <img
                        src={data.photo}
                        alt="Profile"
                        className="h-24 w-24 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-gray-300 text-xs text-gray-400">
                        No Photo
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <EditableText
                        as="h1"
                        value={data.fullName}
                        onSave={(v) => set("fullName", v)}
                        className="font-bold text-gray-900"
                        style={{ fontSize: sz.name }}
                        placeholder="Your Name"
                      />
                      <EditableText
                        as="p"
                        value={data.role}
                        onSave={(v) => set("role", v)}
                        className="mt-2"
                        style={{ color: palette.subText, fontSize: sz.role }}
                        placeholder="Your Role"
                      />

                      <div
                        className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5"
                        style={{ color: palette.subText, fontSize: sz.small }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Mail
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: palette.primary }}
                          />
                          <EditableText
                            as="span"
                            value={data.email}
                            onSave={(v) => set("email", v)}
                            placeholder="Email"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: palette.primary }}
                          />
                          <EditableText
                            as="span"
                            value={data.phone}
                            onSave={(v) => set("phone", v)}
                            placeholder="Phone"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Linkedin
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: palette.primary }}
                          />
                          <EditableText
                            as="span"
                            value={data.linkedin}
                            onSave={(v) => set("linkedin", v)}
                            placeholder="LinkedIn"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: palette.primary }}
                          />
                          <EditableText
                            as="span"
                            value={data.address}
                            onSave={(v) => set("address", v)}
                            placeholder="Address"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {visibleCount === 0 ? (
                  renderDropZone(pageIndex, keys.length, true)
                ) : (
                  <>
                    {keys.map((k, ki) =>
                      visibleMap[k] ? (
                        <Fragment key={k}>
                          {renderDropZone(pageIndex, ki)}
                          {renderSectionShell(k, renderSectionBody(k))}
                        </Fragment>
                      ) : null
                    )}
                    {renderDropZone(pageIndex, keys.length)}
                  </>
                )}
              </div>
            </PageSheet>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addPage}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 py-4 text-sm font-semibold text-violet-500 transition hover:border-violet-400 hover:bg-violet-50/60 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/30"
      >
        <Plus className="h-4 w-4" />
        Add page
      </button>
    </div>
  );
}
