import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ROLES, type Role } from "@/lib/rbac";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = (user.publicMetadata as any)?.role as Role | undefined;

  const ALLOWED_ROLES: readonly Role[] = [ROLES.FOUNDER, ROLES.SUPER_ADMIN];

  if (!role || !ALLOWED_ROLES.includes(role)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
