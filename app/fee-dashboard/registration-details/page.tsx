// app/(admin)/students/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type AdmissionPayment = {
  status?: string;
  amount?: number;
  currency?: string;
  orderId?: string;
  paymentId?: string;
  paidAt?: string;
};

type Student = {
  _id: string;
  fullName: string;
  fathersName: string;
  mobile: string;
  email: string;
  address: string;
  degree: string;
  passoutYear: number;
  mode: string;
  receiptNo?: string;
  enrollmentDate?: string;
  counselorName?: string;
  admissionPayment?: AdmissionPayment;
  createdAt?: string;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/students/student-data`);
        const data = await res.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error("Failed to load students:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // filter locally
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) => {
      return (
        s.fullName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.mobile?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.counselorName?.toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      {/* top bar */}
      <div className="border-b border-purple-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          {/* back button */}
          <Link
            href="/fee-dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-200"
          >
            ← Back
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-purple-900">
              Registered Students
            </h1>
            <p className="text-sm text-purple-500">
              All admission form submissions with enrollment details
            </p>
          </div>
          <div className="rounded-full bg-purple-100 px-4 py-1 text-xs font-medium text-purple-700">
            Total: {filtered.length}/{students.length}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* search bar */}
        <div className="mb-6 flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, mobile, address, counselor..."
            className="w-full rounded-lg border border-purple-100 bg-white/70 px-4 py-2 text-sm text-purple-900 outline-none ring-purple-200 focus:ring"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-purple-500">
            Loading students...
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 rounded-lg bg-purple-50 p-8 text-center text-purple-500">
            No students found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((s) => {
              // enrollment date = paidAt first, then enrollmentDate
              const enrollmentDateObj = s.admissionPayment?.paidAt
                ? new Date(s.admissionPayment.paidAt)
                : s.enrollmentDate
                ? new Date(s.enrollmentDate)
                : null;

              const enrollmentDateStr = enrollmentDateObj
                ? enrollmentDateObj.toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—";

              return (
                <div
                  key={s._id}
                  className="rounded-xl border border-purple-100 bg-white/80 p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-purple-900">
                        {s.fullName}
                      </h2>
                      <p className="text-xs text-purple-400">
                        {s.email} • {s.mobile}
                      </p>
                    </div>
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                      {s.mode}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-purple-900/80">
                    <p>
                      <span className="text-xs text-purple-400">Father: </span>
                      {s.fathersName}
                    </p>
                    <p>
                      <span className="text-xs text-purple-400">
                        Degree / Passout:
                      </span>{" "}
                      {s.degree} • {s.passoutYear}
                    </p>
                    <p>
                      <span className="text-xs text-purple-400">Address:</span>{" "}
                      {s.address}
                    </p>
                    {s.counselorName ? (
                      <p>
                        <span className="text-xs text-purple-400">
                          Counselor:
                        </span>{" "}
                        {s.counselorName}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-purple-50 p-2">
                      <p className="text-[10px] uppercase text-purple-400">
                        Enrollment Date
                      </p>
                      <p className="text-sm font-medium text-purple-900">
                        {enrollmentDateStr}
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-2">
                      <p className="text-[10px] uppercase text-purple-400">
                        Payment Status
                      </p>
                      <p className="text-sm font-medium text-purple-900">
                        {s.admissionPayment?.status || "—"}
                      </p>
                    </div>
                  </div>

                  {s.receiptNo ? (
                    <p className="mt-2 text-[10px] text-purple-400">
                      Receipt: {s.receiptNo}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
