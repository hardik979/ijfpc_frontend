"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useFormContext } from "react-hook-form";
import { Mail, Phone, Linkedin, MapPin } from "lucide-react";

import type { ResumeFormValues } from "@/lib/resumeForm";
import { getThemePalette } from "@/lib/resumePdfStyles";

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

  return (
    <div
      className="origin-top rounded-[20px] border border-violet-100 dark:border-gray-800 bg-white shadow-[0_20px_70px_rgba(76,29,149,0.12)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
      style={{
        width: 794,
        minHeight: 1123,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
    >
      <div
        className="h-full w-full p-10 text-gray-900"
        style={{
          fontFamily: data.fontFamily,
          fontSize: `${fs}px`,
          lineHeight: 1.55,
        }}
      >
        {/* Header */}
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
                <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: palette.primary }} />
                <EditableText
                  as="span"
                  value={data.email}
                  onSave={(v) => set("email", v)}
                  placeholder="Email"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: palette.primary }} />
                <EditableText
                  as="span"
                  value={data.phone}
                  onSave={(v) => set("phone", v)}
                  placeholder="Phone"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5 shrink-0" style={{ color: palette.primary }} />
                <EditableText
                  as="span"
                  value={data.linkedin}
                  onSave={(v) => set("linkedin", v)}
                  placeholder="LinkedIn"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: palette.primary }} />
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

        {/* Summary */}
        {hasText(data.summary) && (
          <section className="mb-8">
            <h2 className="mb-3 font-semibold" style={headingStyle}>
              Summary
            </h2>
            <EditableText
              as="p"
              value={data.summary}
              onSave={(v) => set("summary", v)}
              className="leading-7 text-gray-700"
              style={{ fontSize: sz.body, textAlign: "justify" }}
              placeholder="Write your professional summary here..."
            />
          </section>
        )}

        {/* Skills */}
        {hasSkills && (
          <section className="mb-8">
            <h2 className="mb-3 font-semibold" style={headingStyle}>
              Skills
            </h2>
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
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-semibold" style={headingStyle}>
              Experience
            </h2>
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
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-semibold" style={headingStyle}>
              Projects
            </h2>
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
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-semibold" style={headingStyle}>
              Education
            </h2>
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
          </section>
        )}

        {/* Languages */}
        {hasLanguages && (
          <section>
            <h2 className="mb-3 font-semibold" style={headingStyle}>
              Languages
            </h2>
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
          </section>
        )}
      </div>
    </div>
  );
}
