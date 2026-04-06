// components/resume-builder/ResumeTemplateClassic.tsx
import type { ResumeData} from "@/lib/resume";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Sparkles,
  GraduationCap,
  Briefcase,
  Wrench,
} from "lucide-react";

export default function ResumeTemplateClassic({
  data,
}: {
  data: Partial<ResumeData>;
}) {
  const skills = data.skills ?? [];
  const exp = data.experience ?? [];
  const edu = data.education ?? [];

  return (
    <div className="flex h-full w-full overflow-hidden bg-white text-gray-900">
      <aside className="relative w-[290px] overflow-hidden bg-gradient-to-b from-violet-700 via-indigo-700 to-slate-900 p-7 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(167,139,250,0.18),_transparent_25%)]" />

        <div className="relative z-10 space-y-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/14 backdrop-blur">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                Resume Profile
              </p>
              <p className="mt-1 text-sm font-semibold text-white/95">
                Professional Snapshot
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            {data.profileImage ? (
              <img
                src={data.profileImage}
                alt="Profile"
                className="h-28 w-28 rounded-full object-cover border-4 border-white/20 shadow-[0_12px_30px_rgba(15,23,42,0.35)]"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/15 bg-white/10 text-3xl font-bold shadow-[0_12px_30px_rgba(15,23,42,0.35)]">
                {(data.fullName || "Y")?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
              {data.fullName || "Your Name"}
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {exp?.[0]?.jobTitle || "Professional Title"}
            </p>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
              Contact
            </div>
            <div className="space-y-3 text-[13px] leading-5 text-white/90">
              {data.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  <span>{data.phone}</span>
                </div>
              )}
              {data.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  <span className="break-all">{data.email}</span>
                </div>
              )}
              {data.linkedin && (
                <div className="flex items-start gap-2.5">
                  <Linkedin className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  <span className="break-all">{data.linkedin}</span>
                </div>
              )}
              {data.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  <span>{data.address}</span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
              <Wrench className="h-3.5 w-3.5 text-violet-200" />
              Skills
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/95"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/70">Add your key skills</span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
              <GraduationCap className="h-3.5 w-3.5 text-violet-200" />
              Education
            </div>
            <div className="space-y-4 text-[13px]">
              {edu.length > 0 ? (
                edu.map((e, i) => (
                  <div key={i} className="border-l border-white/15 pl-3">
                    <div className="font-semibold text-white">{e.degree}</div>
                    <div className="mt-0.5 text-white/80">{e.institution}</div>
                    {(e.startYear || e.endYear) && (
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/55">
                        {[e.startYear, e.endYear].filter(Boolean).join(" – ")}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/70">
                  Add your education details
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>

      <main className="flex-1 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-9">
        <div className="border-b border-violet-100 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Resume Overview
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
            {data.fullName || "Your Name"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {data.summary || "Add a short professional summary…"}
          </p>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600">
                Experience
              </div>
              <div className="text-lg font-bold text-gray-900">
                Work Experience
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {exp.length > 0 ? (
              exp.slice(0, 8).map((e, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {e.jobTitle || "Job Title"}
                      </div>
                      <div className="mt-1 text-sm font-medium text-violet-700">
                        {e.company || "Company Name"}
                      </div>
                    </div>
                    {(e.startDate || e.endDate) && (
                      <div className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
                        {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                      </div>
                    )}
                  </div>

                  {Array.isArray(e.bullets) && e.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2 text-[13px] leading-6 text-gray-700">
                      {e.bullets.slice(0, 6).map((b, bi) => (
                        <li key={bi} className="flex items-start gap-2.5">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-5 text-sm text-gray-500">
                Add your work experience to populate this section.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}