export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // Port 5000
export const API_HR_URL = process.env.NEXT_PUBLIC_HR_URL;     // Port 4000
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!; 

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiPost<T>(
  path: string,
  body: any,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
