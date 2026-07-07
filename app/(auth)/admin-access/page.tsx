"use client"
// new page
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

interface AdminModule {
  label: string
  description: string
  href: string
  icon: LucideIcon
  accent: string
  tag: string
}

const ADMIN_MODULES: AdminModule[] = [
  {
    label: "Placement Dashboard",
    description:
      "Create, review, and manage pre-placement student records and onboarding data.",
    href: "/post-placement-student-creation",
    icon: LayoutDashboard,
    accent: "from-indigo-500 to-indigo-600",
    tag: "Management",
  },
  {
    label: "Student Overview Analysis",
    description:
      "Track aggregated student performance, placement metrics, and analytics.",
    href: "/studentOverview",
    icon: BarChart3,
    accent: "from-emerald-500 to-emerald-600",
    tag: "Analytics",
  },
  {
    label: "Daily Calling Report",
    description:
      "Review daily calling activities and performance metrics.",
    href: "/daily-calling-report",
    icon: BarChart3,
    accent: "from-emerald-500 to-emerald-600",
    tag: "Analytics",
  },
];

export default function AdminAccessPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Admin Console
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            Welcome back, Administrator
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Select a module below to manage placement operations and review
            student analytics.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <button
                key={mod.href}
                type="button"
                onClick={() => router.push(mod.href)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-left shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-slate-500 hover:bg-slate-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${mod.accent}`}
                />

                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${mod.accent} text-white shadow-md`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-slate-700/70 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {mod.tag}
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-slate-100">
                  {mod.label}
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">
                  {mod.description}
                </p>

                <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-slate-200 transition-colors group-hover:text-indigo-400">
                  Open module
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            )
          })}
        </div>

        <footer className="mt-12 border-t border-slate-700 pt-6 text-center text-xs text-slate-500">
          Restricted access — authorized personnel only.
        </footer>
      </div>
    </main>
  )
}