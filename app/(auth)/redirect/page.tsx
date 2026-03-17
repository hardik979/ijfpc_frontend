"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { ROLES } from "@/lib/rbac";

export default function RedirectAfterLogin() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const role = (user?.publicMetadata as any)?.role as string | undefined;

    switch (role) {
      case ROLES.SUPER_ADMIN:
        router.replace("/fee-dashboard");
        break;
      case ROLES.FEE_STAFF:
        router.replace("/fee-dashboard");
        break;
      case ROLES.CALLING_STAFF:
        router.replace("/sales_team_dashboard/staff/recordings");
        break;
      case ROLES.PLACEMENT_STAFF:
        router.replace("/post-placement-student-creation");
        break;
      case ROLES.INTERVIEWER:
        router.replace("/interview-reporting");
        break;
      case ROLES.FOUNDER:
        router.replace("/founder");
        break;
      default:
        router.replace("/unauthorized");
    }
  }, [isLoaded, isSignedIn, user, router]);

  const roleLabel =
    typeof (user?.publicMetadata as any)?.role === "string"
      ? ((user?.publicMetadata as any)?.role as string)
      : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex flex-col items-center gap-6 px-6 py-10 rounded-2xl bg-slate-900/70 border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3 text-xl font-semibold">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          IT Jobs Factory
        </div>

        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />

        <div className="text-center space-y-1">
          <p className="text-sm text-slate-300">
            Verifying access & preparing your dashboard
          </p>

          {roleLabel ? (
            <p className="text-xs text-slate-400">
              Role:{" "}
              <span className="font-medium text-slate-200">{roleLabel}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
