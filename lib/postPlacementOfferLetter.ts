import { API_LMS_URL } from "@/lib/api";

export const OFFER_LETTER_MAX_BYTES = 10 * 1024 * 1024;
export const OFFER_LETTER_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp";

export const OFFER_LETTER_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateOfferLetter(file: File): string | null {
  if (!OFFER_LETTER_TYPES.has(file.type)) {
    return "Choose a PDF, JPG, PNG, or WebP file.";
  }
  if (file.size > OFFER_LETTER_MAX_BYTES) {
    return "Offer letter must be 10 MB or smaller.";
  }
  return null;
}

export async function uploadPostPlacementOfferLetter<T>(
  offerId: string,
  file: File,
): Promise<T> {
  if (!API_LMS_URL) {
    throw new Error("NEXT_PUBLIC_LMS_URL is not configured");
  }

  const validationError = validateOfferLetter(file);
  if (validationError) throw new Error(validationError);

  const body = new FormData();
  body.append("offerLetter", file);

  const response = await fetch(
    `${API_LMS_URL.replace(/\/$/, "")}/api/offers/${offerId}/offer-letter`,
    {
      method: "POST",
      headers: {
        "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
      },
      body,
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to upload offer letter");
  }
  return payload as T;
}

