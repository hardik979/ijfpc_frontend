import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ROLES, type Role } from "@/lib/rbac";

/** Uploading is for the placement cell; everyone else is sent back to browsing. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = (user.publicMetadata as { role?: Role })?.role;

  const ALLOWED_ROLES: readonly Role[] = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.PLACEMENT_STAFF,
    ROLES?.PREEPLACEMENT_STAFF,
  ];

  if (!role || !ALLOWED_ROLES.includes(role)) redirect("/interview-questions");

  return <>{children}</>;
}
