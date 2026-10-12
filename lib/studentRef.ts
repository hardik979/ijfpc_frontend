// Obfuscates a Clerk ID for use in URLs so it isn't readable at a glance.
// This is encoding, not encryption: access control must still be enforced by the API.
export const encodeStudentRef = (clerkId: string): string => {
  const bytes = new TextEncoder().encode(clerkId);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodeStudentRef = (ref: string | null): string | null => {
  if (!ref) return null;
  try {
    const b64 = ref.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
};
