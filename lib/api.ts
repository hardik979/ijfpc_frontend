export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export const API_HR_URL = process.env.NEXT_PUBLIC_HR_URL;
const BASE = process.env.NEXT_PUBLIC_HR_URL!; // e.g. http://localhost:4000

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
