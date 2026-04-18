"use client";

import type { ResumeData, ResumeFontFamily, TemplateKey } from "@/lib/resume";

type ThemeKey =
  | "blue"
  | "slate"
  | "emerald"
  | "purple"
  | "rose"
  | "teal"
  | "amber";

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
  data: ResumeWithExtras;
  scale?: number;
  updateField: <K extends keyof ResumeWithExtras>(
    key: K,
    value: ResumeWithExtras[K]
  ) => void;
  updateSkill: (index: number, value: string) => void;
  updateExperienceField: (
    expIndex: number,
    key: "jobTitle" | "company" | "startDate" | "endDate" | "start" | "end",
    value: string
  ) => void;
  updateExperienceBullet: (
    expIndex: number,
    bulletIndex: number,
    value: string
  ) => void;
};

function EditableText({
  value,
  onSave,
  className = "",
  as = "div",
  placeholder = "Click to edit",
}: {
  value?: string;
  onSave: (value: string) => void;
  className?: string;
  as?: "div" | "h1" | "h2" | "p" | "span";
  placeholder?: string;
}) {
  const Tag = as;

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onSave(e.currentTarget.textContent || "")}
      className={`cursor-text rounded-md px-1 outline-none transition hover:bg-violet-50 focus:bg-violet-50 focus:ring-2 focus:ring-violet-200 ${className}`}
    >
      {value?.trim() ? value : placeholder}
    </Tag>
  );
}

export default function EditableResumePreview({
  data,
  scale = 1,
  updateField,
  updateSkill,
  updateExperienceField,
  updateExperienceBullet,
}: Props) {
  const safeSkills = Array.isArray(data.skills) ? data.skills : [];
  const safeExperience = Array.isArray(data.experience) ? data.experience : [];
  const safeLanguages = Array.isArray(data.languages) ? data.languages : [];
  const safeProjects = Array.isArray(data.projects) ? data.projects : [];
  const safeEducation = Array.isArray(data.education) ? data.education : [];

  return (
    <div
      className="origin-top rounded-[20px] border border-violet-100 bg-white shadow-[0_20px_70px_rgba(76,29,149,0.12)]"
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
          fontSize: `${data.fontSize}px`,
          lineHeight: 1.55,
        }}
      >
        <div className="mb-8 flex items-start gap-6 border-b border-gray-200 pb-6">
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
              onSave={(val) => updateField("fullName", val)}
              className="text-3xl font-bold text-gray-900"
              placeholder="Your Name"
            />

            <EditableText
              as="p"
              value={data.role}
              onSave={(val) => updateField("role", val)}
              className="mt-2 text-lg text-gray-600"
              placeholder="Your Role"
            />

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
              <EditableText
                as="p"
                value={data.email}
                onSave={(val) => updateField("email", val)}
                placeholder="Email"
              />
              <EditableText
                as="p"
                value={data.phone}
                onSave={(val) => updateField("phone", val)}
                placeholder="Phone"
              />
              <EditableText
                as="p"
                value={data.address}
                onSave={(val) => updateField("address", val)}
                className="col-span-2"
                placeholder="Address"
              />
            </div>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-violet-700">Summary</h2>
          <EditableText
            as="p"
            value={data.summary}
            onSave={(val) => updateField("summary", val)}
            className="leading-7 text-gray-700"
            placeholder="Write your professional summary here..."
          />
        </section>

        {!!safeSkills.length && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-violet-700">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {safeSkills.map((skill, index) => (
                <EditableText
                  key={index}
                  as="span"
                  value={skill}
                  onSave={(val) => updateSkill(index, val)}
                  className="rounded-full border border-violet-200 px-3 py-1 text-sm text-gray-700"
                  placeholder="Skill"
                />
              ))}
            </div>
          </section>
        )}

        {!!safeExperience.length && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-violet-700">Experience</h2>

            <div className="space-y-6">
              {safeExperience.map((exp, expIndex) => (
                <div key={expIndex} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <EditableText
                        as="h2"
                        value={exp.jobTitle}
                        onSave={(val) =>
                          updateExperienceField(expIndex, "jobTitle", val)
                        }
                        className="text-xl font-semibold text-gray-900"
                        placeholder="Job Title"
                      />

                      <EditableText
                        as="p"
                        value={exp.company}
                        onSave={(val) =>
                          updateExperienceField(expIndex, "company", val)
                        }
                        className="text-sm text-gray-600"
                        placeholder="Company Name"
                      />
                    </div>

                    <div className="min-w-[140px] text-right text-sm text-gray-500">
                      <EditableText
                        as="p"
                        value={exp.startDate || exp.start}
                        onSave={(val) =>
                          updateExperienceField(expIndex, "startDate", val)
                        }
                        placeholder="Start"
                      />
                      <EditableText
                        as="p"
                        value={exp.endDate || exp.end}
                        onSave={(val) =>
                          updateExperienceField(expIndex, "endDate", val)
                        }
                        placeholder="End"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(exp.bullets || exp.points || []).map((bullet, bulletIndex) => (
                      <EditableText
                        key={bulletIndex}
                        as="p"
                        value={bullet}
                        onSave={(val) =>
                          updateExperienceBullet(expIndex, bulletIndex, val)
                        }
                        className="text-sm leading-6 text-gray-700"
                        placeholder="Write bullet point"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!!safeProjects.length && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-violet-700">Projects</h2>
            <div className="space-y-4">
              {safeProjects.map((project, index) => (
                <div key={index} className="rounded-xl border border-gray-200 p-4">
                  <EditableText
                    as="h2"
                    value={project?.name}
                    onSave={() => {}}
                    className="text-lg font-semibold"
                    placeholder="Project Name"
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    {project?.techStack || "Tech stack"}
                  </p>
                  {!!project?.bullets?.length && (
                    <div className="mt-3 space-y-2">
                      {project.bullets.map((bullet, bulletIndex) => (
                        <p key={bulletIndex} className="text-sm text-gray-700">
                          • {bullet}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!!safeEducation.length && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-violet-700">Education</h2>
            <div className="space-y-4">
              {safeEducation.map((edu, index) => (
                <div key={index} className="rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-gray-900">{edu.degree}</p>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                  <p className="text-sm text-gray-500">
                    {edu.startYear || ""} {edu.startYear || edu.endYear ? " - " : ""}
                    {edu.endYear || ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!!safeLanguages.length && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-violet-700">Languages</h2>
            <div className="flex flex-wrap gap-2">
              {safeLanguages.map((lang, index) => (
                <span
                  key={index}
                  className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700"
                >
                  {lang}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}