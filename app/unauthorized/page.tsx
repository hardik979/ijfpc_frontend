"use client";

import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { ShieldX, ArrowLeft, Home, LogOut } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const roleLabel =
    typeof (user?.publicMetadata as any)?.role === "string"
      ? ((user?.publicMetadata as any)?.role as string)
      : "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6">
      <div className="max-w-lg w-full rounded-2xl bg-slate-900/70 border border-slate-700 shadow-xl p-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ShieldX className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Access denied</h1>
            <p className="text-sm text-slate-300">
              You don’t have permission to view this page.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-950/50 border border-slate-700 p-4">
          <p className="text-sm text-slate-300">
            If you believe this is a mistake, contact the admin to grant the
            correct role.
          </p>

          {isLoaded && roleLabel ? (
            <p className="mt-2 text-xs text-slate-400">
              Current role:{" "}
              <span className="text-slate-200 font-medium">{roleLabel}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors px-4 py-2.5 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>

          <button
            onClick={() => router.replace("/")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2.5 text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>

        <div className="mt-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Switch account</p>
              <p className="text-xs text-slate-400">
                Sign out and log in with a different authorized account.
              </p>
            </div>

            <SignOutButton redirectUrl="/sign-in">
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 text-sm font-medium">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </main>
  );
}
