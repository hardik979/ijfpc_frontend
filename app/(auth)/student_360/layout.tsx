import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ROLES, type Role } from "@/lib/rbac";

export default async function Student360Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const role = user.publicMetadata?.role as Role | undefined;

  if (role !== ROLES.MANAGERS) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
