"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

type Row = {
  _id: string;
  name?: string;
  zone?: string;
  clerkId?: string;
  mobile?: string;
  createdAt?: string;
};

export default function UpdatePreePlasedUsers() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // local edit state keyed by userId
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");

  const limit = 200;

  async function load(p = page) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      const res = await fetch(
        `${API_LMS_URL}/api/preplacement/admin/users/missing-mobile?` +
          params.toString(),
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch (e: any) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []); // initial

  async function saveMobile(userId: string) {
    const mobile = (drafts[userId] || "").trim();
    if (!mobile) return;
    setSavingId(userId);
    setNotice("");
    setError("");
    try {
      const res = await fetch(
        `${API_LMS_URL}/api/preplacement/admin/users/${userId}/mobile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      // remove the row now that it has a mobile number
      setRows((prev) => prev.filter((r) => r._id !== userId));
      setTotal((t) => Math.max(t - 1, 0));
      setDrafts((d) => {
        const next = { ...d };
        delete next[userId];
        return next;
      });
      setNotice(`Saved mobile for user.`);
    } catch (e: any) {
      setError(e.message || "Failed to save mobile");
    } finally {
      setSavingId("");
    }
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span className="text-base leading-none">←</span> Back
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Update Pre-Placed Users
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Students with no mobile number stored. Add a number to remove them
              from the list.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-medium text-white">{total}</span>
            <span className="text-slate-400">
              user{total === 1 ? "" : "s"} missing mobile
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 sm:w-96"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(1)}
          />
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            onClick={() => load(1)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Search"}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-4 py-2.5 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/20">
          <table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Zone</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Mobile</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r._id}
                  className="border-b border-slate-800/60 transition hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3 font-medium text-white">
                    {r.name || "-"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs text-slate-300">
                      {r.zone || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-5 py-3">
                    <input
                      className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Enter mobile"
                      value={drafts[r._id] || ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r._id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && saveMobile(r._id)}
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => saveMobile(r._id)}
                      disabled={
                        savingId === r._id || !(drafts[r._id] || "").trim()
                      }
                    >
                      {savingId === r._id ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-slate-500"
                    colSpan={5}
                  >
                    No users missing a mobile number
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Page <span className="text-slate-300">{page}</span> of{" "}
            <span className="text-slate-300">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              onClick={() => load(page - 1)}
              disabled={page <= 1 || loading}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              onClick={() => load(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
