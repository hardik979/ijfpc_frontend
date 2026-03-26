// app/hr/page.tsx
"use client";
import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState } from "react";

export default function HrDirectoryPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (company) params.set("company", company);
    const res = await fetch(`${API_BASE_URL}/api/hr?` + params.toString(), {
      cache: "no-store",
    });
    setRows(await res.json());
  }

  useEffect(() => {
    load();
  }, []); // initial

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">HR Directory</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="border p-2 rounded"
          placeholder="Search (name/email/phone/company/student)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Filter by company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={load}
        >
          Search
        </button>
        <a className="px-4 py-2 border rounded" href="/api/hr/export.csv">
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Name(s)</th>
              <th className="p-2 text-left">Email(s)</th>
              <th className="p-2 text-left">Phone(s)</th>
              <th className="p-2 text-left">Companies</th>
              <th className="p-2 text-left">Offers</th>
              <th className="p-2 text-left">Students</th>
              <th className="p-2 text-left">Last Offer</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.key} className="border-t">
                <td className="p-2">{(r.names || []).join(", ")}</td>
                <td className="p-2">{(r.emails || []).join(", ")}</td>
                <td className="p-2">{(r.phones || []).join(", ")}</td>
                <td className="p-2">{(r.companies || []).join(", ")}</td>
                <td className="p-2">{r.offersCount}</td>
                <td className="p-2">{r.studentsCount}</td>
                <td className="p-2">
                  {r.lastOfferDate
                    ? new Date(r.lastOfferDate).toLocaleDateString()
                    : "-"}
                </td>
                <td className="p-2">
                  <a
                    className="underline"
                    href={`/api/hr/offers?key=${encodeURIComponent(r.key)}`}
                    target="_blank"
                  >
                    View offers →
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={8}>
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
