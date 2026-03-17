"use client";

import { ReactNode } from "react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: Props) {
  const pathname = usePathname();

  return (
    <>
      <SignedIn>{children}</SignedIn>

      <SignedOut>
        {/* sends the user to sign in, then returns them to the page they tried to open */}
        <RedirectToSignIn redirectUrl={pathname || "/sign-in"} />
      </SignedOut>
    </>
  );
}
