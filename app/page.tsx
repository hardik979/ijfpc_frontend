"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/redirect");
    }
  }, [isLoaded, isSignedIn, router]);

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
