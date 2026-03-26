"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { apiPost } from "@/lib/api";

export default function UserSync() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    async function sync() {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const token = await getToken();
        if (!token) return;

        // Extract role from publicMetadata (or unsafeMetadata if that's where you store it)
        // Fallback to "candidate" if not found
        const role = (user.publicMetadata.role as string) || "candidate";

        await apiPost(
          "/api/users/sync",
          {
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            fullName: user.fullName,
            role,
          },
          token,
        );
      } catch (err) {
        console.error("User sync failed", err);
      }
    }

    sync();
  }, [isLoaded, isSignedIn, user, getToken]);

  return null; // This component renders nothing
}
