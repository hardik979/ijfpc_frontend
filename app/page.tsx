"use client";

import { useUser } from "@clerk/nextjs";

import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ChevronRight,
  BarChart3,
  SheetIcon,
  Database,
  GraduationCap,
  ComputerIcon,
  Plus,
  Vault,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { Variants } from "framer-motion";
import Link from "next/link";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/redirect");
    }
  }, [isLoaded, isSignedIn, router]);

  const dashboardCards = [
    {
      id: "it-jobs-factory",
      title: "IT Jobs Factory Fees",
      description:
        "Monitor and manage job posting fees, payment tracking, and revenue analytics",
      icon: BarChart3,
      gradient: "from-purple-500 to-indigo-600",
      path: "/fee-dashboard", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-sheets",
      title: "Excel Sheets",
      description:
        "Track and get access to all the Excel sheets of all the data at one place",
      icon: SheetIcon,
      gradient: "from-blue-500 to-sky-400",
      path: "/fee-dashboard/excel-sheets", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-hrdb",
      title: "HR Database",
      description:
        "Get access to the database of all hr contacts from different company in one place",
      icon: Database,
      gradient: "from-emerald-500 to-green-400",
      path: "/fee-dashboard/hr-database", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-pc",
      title: "IT Jobs Factory Placement Cell",
      description:
        "This dashboard is for the it jobs factory placement cell to manage and update placement data",
      icon: GraduationCap,
      gradient: "from-red-400 to-red-500",
      path: "/post-placement-student-creation", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-IR",
      title: "IT Jobs Factory Interview Reporting",
      description:
        "This dashboard is for the teachers to fill interview reports of students right after the interview.",
      icon: ComputerIcon,
      gradient: "from-amber-300 to-orange-400",
      path: "/fee-dashboard/interview-reporting", // You can update this path as needed
    },
    {
      id: "it-jobs-factory-Bs",
      title: "IT Jobs Factory Batch Section",
      description:
        "Design, launch, and manage training batches with full control over course structure, trainers, schedules, and batch status.",
      icon: Plus,
      gradient: "from-slate-700 to-indigo-600",
      path: "/batch-section", // You can update this path as needed
    },
    // {
    //   id: "it-jobs-factory-BA",
    //   title: "IT Jobs Factory Batch Assignment",
    //   description:
    //     "Assign students to the right batch and update batch changes anytime with a few clicks.",
    //   icon: Vault,
    //   gradient: "from-teal-500 to-cyan-600",//gradient: "from-indigo-600 to-violet-700"
    //   path: "/batch-section/student-list", // You can update this path as needed
    // },
  ];

  // While Clerk is loading, avoid UI flicker
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-md w-full px-8 py-10 rounded-2xl bg-slate-900/70 border border-slate-700 shadow-xl text-center space-y-6">
        <div className="flex items-center justify-center gap-3 text-2xl font-semibold">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          IT Jobs Factory
        </div>

        <p className="text-sm text-slate-300">
          Secure internal access for staff dashboards and operations.
        </p>

        <a
          href="/sign-in"
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2.5 text-sm font-medium"
        >
          Sign in
          <ArrowRight className="w-4 h-4" />
        </a>

        <p className="text-xs text-slate-400">
          Access is restricted to authorized team members only.
        </p>
      </div>
    </main>
  );
}
