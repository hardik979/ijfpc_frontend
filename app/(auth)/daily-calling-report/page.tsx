"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  FormEvent,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

/* ---------------------------------------------------------------- types --- */

interface PopulatedUser {
  _id: string;
  fullName?: string;
  email?: string;
}

// HrContactDetail document → left "students" table
interface HrContactDoc {
  _id: string;
  studentId: PopulatedUser | string | null;
  totalCalls: number;
  cvShared: number;
}

// DailyCallingReport document → right "real users" table
interface DailyReportDoc {
  _id: string;
  memmberId: PopulatedUser | string | null;
  totalNumber: number;
  email: number; // stored as a count (emails shared)
  cvShared: number;
}

interface StudentRow {
  id: string; // HrContactDetail doc id
  studentId: string;
  name: string;
  totalCalls: number;
  cvShared: number;
}

interface RealUserRow {
  id: string; // DailyCallingReport doc id
  memberId: string;
  name: string;
  email: string;
  totalNumber: number;
  emailShared: number;
  cvShared: number;
}

interface UserOption {
  _id: string;
  fullName?: string;
  email?: string;
}

type EntryType = "member" | "student";

// pending (draft) rows the user stages before submitting them all at once
interface MemberDraft {
  memberId: string;
  name: string;
  email: string;
  totalNumber: number;
  emailShared: number;
  cvShared: number;
}

interface StudentDraft {
  studentId: string;
  name: string;
  totalCalls: number;
  cvShared: number;
}

/* -------------------------------------------------------------- helpers --- */

const formatDate = (d: string | Date): string => {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
};

const toInputDate = (d: Date): string => d.toISOString().slice(0, 10);

const userName = (u: PopulatedUser | string | null): string =>
  u && typeof u === "object" ? u.fullName || "Unknown" : "Unknown";

const userEmail = (u: PopulatedUser | string | null): string =>
  u && typeof u === "object" ? u.email || "" : "";

const userId = (u: PopulatedUser | string | null): string =>
  u && typeof u === "object" ? u._id : typeof u === "string" ? u : "";

/* ------------------------------------------------------------- NumCell ---- */

interface NumCellProps {
  value: number;
  onChange: (v: number) => void;
  editable: boolean;
}

const NumCell: React.FC<NumCellProps> = ({ value, onChange, editable }) => {
  if (!editable) {
    return <span className="text-gray-100">{value === 0 ? "-" : value}</span>;
  }
  return (
    <input
      type="number"
      min="0"
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-16 px-2 py-1 text-center border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-700 text-gray-100 placeholder-gray-500"
    />
  );
};

/* ------------------------------------------------------------ component --- */

const DailyCallingReport: React.FC = () => {
  const { getToken } = useAuth();
  const router = useRouter();

  const [reportDate, setReportDate] = useState<string>(toInputDate(new Date()));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [realUsers, setRealUsers] = useState<RealUserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editable, setEditable] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [entryType, setEntryType] = useState<EntryType>("member");

  // staged (pending) rows — collect several users, then submit them together
  const [memberDrafts, setMemberDrafts] = useState<MemberDraft[]>([]);
  const [studentDrafts, setStudentDrafts] = useState<StudentDraft[]>([]);

  // member-search combobox state
  const [userQuery, setUserQuery] = useState<string>("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // student-search combobox state
  const [studentQuery, setStudentQuery] = useState<string>("");
  const [studentResults, setStudentResults] = useState<UserOption[]>([]);
  const [studentSearching, setStudentSearching] = useState<boolean>(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState<boolean>(false);
  const studentSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // combobox container refs (for click-outside-to-close)
  const memberBoxRef = useRef<HTMLDivElement>(null);
  const studentBoxRef = useRef<HTMLDivElement>(null);

  const authHeaders = useCallback(
    async (json = false): Promise<HeadersInit> => {
      const token = await getToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (json) headers["Content-Type"] = "application/json";
      return headers;
    },
    [getToken]
  );

  // single reusable request helper — handles auth, JSON body and errors
  const apiCall = useCallback(
    async <T,>(
      path: string,
      opts: { method?: string; body?: unknown } = {}
    ): Promise<T> => {
      const { method = "GET", body } = opts;
      const headers = await authHeaders(body !== undefined);
      const res = await fetch(`${LMS_URL}${path}`, {
        method,
        headers,
        cache: "no-store",
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {
          /* ignore non-JSON error bodies */
        }
        throw new Error(msg);
      }
      if (res.status === 204) return null as T;
      return (await res.json()) as T;
    },
    [authHeaders]
  );

  /* ----------------------------------------------------------- fetch ----- */

  const fetchReport = useCallback(
    async (date: string) => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const headers = await authHeaders();
        const [hrRes, dailyRes] = await Promise.all([
          fetch(`${LMS_URL}/api/hr-contact/hr-contact-detail?date=${date}`, {
            headers,
            cache: "no-store",
          }),
          fetch(
            `${LMS_URL}/api/calling-report/daily-calling-report?date=${date}`,
            { headers, cache: "no-store" }
          ),
        ]);

        if (!hrRes.ok || !dailyRes.ok) throw new Error("Failed to fetch report");

        const hrDocs: HrContactDoc[] = await hrRes.json();
        const dailyDocs: DailyReportDoc[] = await dailyRes.json();

        setStudents(
          hrDocs.map((d) => ({
            id: d._id,
            studentId: userId(d.studentId),
            name: userName(d.studentId),
            totalCalls: d.totalCalls,
            cvShared: d.cvShared,
          }))
        );
        setRealUsers(
          dailyDocs.map((d) => ({
            id: d._id,
            memberId: userId(d.memmberId),
            name: userName(d.memmberId),
            email: userEmail(d.memmberId),
            totalNumber: d.totalNumber,
            emailShared: d.email,
            cvShared: d.cvShared,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStudents([]);
        setRealUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [authHeaders]
  );

  useEffect(() => {
    fetchReport(reportDate);
  }, [reportDate, fetchReport]);

  // close suggestion dropdowns when clicking outside their combobox
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (memberBoxRef.current && !memberBoxRef.current.contains(target)) {
        setShowDropdown(false);
      }
      if (studentBoxRef.current && !studentBoxRef.current.contains(target)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ------------------------------------------------------ user search ---- */

  // member suggestions (real users only)
  useEffect(() => {
    if (!showForm || entryType !== "member") return;
    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${LMS_URL}/api/calling-report/get-member-suggestions?query=${encodeURIComponent(
            userQuery
          )}`,
          { headers, cache: "no-store" }
        );
        if (!res.ok) throw new Error("search failed");
        setUserResults(await res.json());
      } catch {
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [userQuery, showForm, entryType, authHeaders]);

  // student suggestions (get-student-list)
  useEffect(() => {
    if (!showForm || entryType !== "student") return;
    if (studentSearchTimer.current) clearTimeout(studentSearchTimer.current);

    studentSearchTimer.current = setTimeout(async () => {
      setStudentSearching(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${LMS_URL}/api/users/get-student-list?search=${encodeURIComponent(
            studentQuery
          )}&limit=20`,
          { headers, cache: "no-store" }
        );
        if (!res.ok) throw new Error("search failed");
        const json = await res.json();
        // getStudentList returns { data: [...] } (or no data when empty)
        setStudentResults(Array.isArray(json.data) ? json.data : []);
      } catch {
        setStudentResults([]);
      } finally {
        setStudentSearching(false);
      }
    }, 300);

    return () => {
      if (studentSearchTimer.current) clearTimeout(studentSearchTimer.current);
    };
  }, [studentQuery, showForm, entryType, authHeaders]);

  // selecting a member stages it into the pending list (clears search for next)
  const selectUser = (u: UserOption) => {
    setMemberDrafts((prev) =>
      prev.some((d) => d.memberId === u._id)
        ? prev
        : [
            ...prev,
            {
              memberId: u._id,
              name: u.fullName || "",
              email: u.email || "",
              totalNumber: 0,
              emailShared: 0,
              cvShared: 0,
            },
          ]
    );
    setUserQuery("");
    setShowDropdown(false);
  };

  const selectStudent = (u: UserOption) => {
    setStudentDrafts((prev) =>
      prev.some((d) => d.studentId === u._id)
        ? prev
        : [
            ...prev,
            {
              studentId: u._id,
              name: u.fullName || "",
              totalCalls: 0,
              cvShared: 0,
            },
          ]
    );
    setStudentQuery("");
    setShowStudentDropdown(false);
  };

  /* ------------------------------------------------------ draft edits ---- */

  const updateMemberDraft = (
    memberId: string,
    field: keyof MemberDraft,
    value: number
  ) => {
    setMemberDrafts((prev) =>
      prev.map((d) => (d.memberId === memberId ? { ...d, [field]: value } : d))
    );
  };

  const removeMemberDraft = (memberId: string) =>
    setMemberDrafts((prev) => prev.filter((d) => d.memberId !== memberId));

  const updateStudentDraft = (
    studentId: string,
    field: keyof StudentDraft,
    value: number
  ) => {
    setStudentDrafts((prev) =>
      prev.map((d) =>
        d.studentId === studentId ? { ...d, [field]: value } : d
      )
    );
  };

  const removeStudentDraft = (studentId: string) =>
    setStudentDrafts((prev) => prev.filter((d) => d.studentId !== studentId));

  /* --------------------------------------------------------- mutations --- */

  const updateStudent = (id: string, field: keyof StudentRow, value: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const updateRealUser = (
    id: string,
    field: keyof RealUserRow,
    value: number
  ) => {
    setRealUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u))
    );
  };

  const studentTotals = useMemo(
    () =>
      students.reduce(
        (acc, s) => ({
          totalCalls: acc.totalCalls + (Number(s.totalCalls) || 0),
          cvShared: acc.cvShared + (Number(s.cvShared) || 0),
        }),
        { totalCalls: 0, cvShared: 0 }
      ),
    [students]
  );

  const realUserTotals = useMemo(
    () =>
      realUsers.reduce(
        (acc, u) => ({
          totalNumber: acc.totalNumber + (Number(u.totalNumber) || 0),
          emailShared: acc.emailShared + (Number(u.emailShared) || 0),
          cvShared: acc.cvShared + (Number(u.cvShared) || 0),
        }),
        { totalNumber: 0, emailShared: 0, cvShared: 0 }
      ),
    [realUsers]
  );

  const resetForm = () => {
    setMemberDrafts([]);
    setStudentDrafts([]);
    setUserQuery("");
    setUserResults([]);
    setStudentQuery("");
    setStudentResults([]);
    setShowForm(false);
  };

  // submit every staged row of the active entry type in ONE bulk request
  const handleSubmitNewEntry = async (e: FormEvent) => {
    e.preventDefault();

    if (entryType === "member" && memberDrafts.length === 0) {
      setError("Add at least one member before submitting");
      return;
    }
    if (entryType === "student" && studentDrafts.length === 0) {
      setError("Add at least one student before submitting");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (entryType === "member") {
        const created = await apiCall<DailyReportDoc[]>(
          "/api/calling-report/daily-calling-report/bulk",
          {
            method: "POST",
            body: {
              entries: memberDrafts.map((d) => ({
                memmberId: d.memberId,
                totalNumber: Number(d.totalNumber) || 0,
                email: Number(d.emailShared) || 0,
                cvShared: Number(d.cvShared) || 0,
              })),
            },
          }
        );

        // response preserves order, so zip it back with the staged drafts
        setRealUsers((prev) => [
          ...prev,
          ...memberDrafts.map((d, i) => ({
            id: created[i]?._id ?? d.memberId,
            memberId: d.memberId,
            name: d.name,
            email: d.email,
            totalNumber: Number(d.totalNumber) || 0,
            emailShared: Number(d.emailShared) || 0,
            cvShared: Number(d.cvShared) || 0,
          })),
        ]);
        setMessage(`${memberDrafts.length} member entr${
          memberDrafts.length === 1 ? "y" : "ies"
        } added successfully`);
      } else {
        const created = await apiCall<HrContactDoc[]>(
          "/api/hr-contact/hr-contact-detail/bulk",
          {
            method: "POST",
            body: {
              entries: studentDrafts.map((d) => ({
                studentId: d.studentId,
                totalCalls: Number(d.totalCalls) || 0,
                cvShared: Number(d.cvShared) || 0,
              })),
            },
          }
        );

        setStudents((prev) => [
          ...prev,
          ...studentDrafts.map((d, i) => ({
            id: created[i]?._id ?? d.studentId,
            studentId: d.studentId,
            name: d.name,
            totalCalls: Number(d.totalCalls) || 0,
            cvShared: Number(d.cvShared) || 0,
          })),
        ]);
        setMessage(`${studentDrafts.length} student entr${
          studentDrafts.length === 1 ? "y" : "ies"
        } added successfully`);
      }

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const headers = await authHeaders(true);
      const requests: Promise<Response>[] = [
        ...students.map((s) =>
          fetch(`${LMS_URL}/api/hr-contact/hr-contact-detail/${s.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
              totalCalls: Number(s.totalCalls) || 0,
              cvShared: Number(s.cvShared) || 0,
            }),
          })
        ),
        ...realUsers.map((u) =>
          fetch(
            `${LMS_URL}/api/calling-report/daily-calling-report/${u.id}`,
            {
              method: "PUT",
              headers,
              body: JSON.stringify({
                totalNumber: Number(u.totalNumber) || 0,
                email: Number(u.emailShared) || 0,
                cvShared: Number(u.cvShared) || 0,
              }),
            }
          )
        ),
      ];

      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) throw new Error("Some rows failed to save");

      setMessage("Report saved successfully");
      setEditable(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(
        `${LMS_URL}/api/hr-contact/hr-contact-detail/${id}`,
        { method: "DELETE", headers: await authHeaders() }
      );
      if (!res.ok) throw new Error("Failed to delete");
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDeleteRealUser = async (id: string) => {
    try {
      const res = await fetch(
        `${LMS_URL}/api/calling-report/daily-calling-report/${id}`,
        { method: "DELETE", headers: await authHeaders() }
      );
      if (!res.ok) throw new Error("Failed to delete");
      setRealUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  /* ----------------------------------------------------------- render ---- */

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 bg-gray-800 border border-gray-600 text-gray-200 rounded-md hover:bg-gray-700 transition"
              title="Go back"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-100">Calling Report</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-4 py-2 bg-purple-900 border border-purple-500 text-purple-300 rounded-md hover:bg-purple-800 transition"
            >
              {showForm ? "Close Form" : "+ Add Entry"}
            </button>
            <button
              onClick={() => setEditable((v) => !v)}
              className="px-4 py-2 bg-gray-800 border border-purple-500 text-purple-300 rounded-md hover:bg-gray-700 transition"
            >
              {editable ? "View Mode" : "Edit Mode"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editable}
              className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : "Save Report"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded-md">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-950 border border-green-800 text-green-300 rounded-md">
            {message}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-gray-800 border border-purple-700 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-100">
                Submit New Entry
              </h2>
              {/* entry type toggle */}
              <div className="inline-flex rounded-md border border-purple-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEntryType("member")}
                  className={`px-4 py-1.5 text-sm font-medium transition ${
                    entryType === "member"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-purple-300 hover:bg-gray-700"
                  }`}
                >
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType("student")}
                  className={`px-4 py-1.5 text-sm font-medium transition border-l border-purple-600 ${
                    entryType === "student"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-purple-300 hover:bg-gray-700"
                  }`}
                >
                  Student
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitNewEntry} className="space-y-4">
              <p className="text-xs text-gray-300">
                Search and click users to add them to the list below, fill in
                their numbers, then submit everyone at once.
              </p>

              {entryType === "member" ? (
                <>
                  {/* searchable member select */}
                  <div className="relative" ref={memberBoxRef}>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      ADD MEMBER <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => {
                        setUserQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search member by name or email..."
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      autoComplete="off"
                    />
                    {showDropdown && (
                      <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-gray-800 border border-gray-600 rounded-md shadow-lg">
                        {searching ? (
                          <div className="px-3 py-2 text-sm text-gray-300">
                            Searching...
                          </div>
                        ) : userResults.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-300">
                            No members found
                          </div>
                        ) : (
                          userResults.map((u) => {
                            const added = memberDrafts.some(
                              (d) => d.memberId === u._id
                            );
                            return (
                              <button
                                key={u._id}
                                type="button"
                                disabled={added}
                                onClick={() => selectUser(u)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 border-b border-gray-700 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <span className="font-medium text-gray-100">
                                  {u.fullName || "Unnamed"}
                                </span>
                                {u.email && (
                                  <span className="text-gray-300">
                                    {" "}
                                    — {u.email}
                                  </span>
                                )}
                                {added && (
                                  <span className="text-green-400">
                                    {" "}
                                    (added)
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* staged member rows */}
                  <div className="overflow-x-auto border border-gray-700 rounded-md">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-700 text-gray-200">
                          <th className="py-2 px-3 text-left font-semibold">
                            NAME
                          </th>
                          <th className="py-2 px-3 font-semibold w-28">
                            TOTAL NUMBER
                          </th>
                          <th className="py-2 px-3 font-semibold w-28">
                            EMAIL SHARED
                          </th>
                          <th className="py-2 px-3 font-semibold w-24">
                            CV SHARED
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {memberDrafts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 text-center text-gray-400"
                            >
                              No members added yet
                            </td>
                          </tr>
                        ) : (
                          memberDrafts.map((d) => (
                            <tr
                              key={d.memberId}
                              className="border-t border-gray-700"
                            >
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-100">
                                  {d.name}
                                </span>
                                {d.email && (
                                  <span className="text-gray-400 text-xs">
                                    {" "}
                                    — {d.email}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <NumCell
                                  value={d.totalNumber}
                                  onChange={(v) =>
                                    updateMemberDraft(
                                      d.memberId,
                                      "totalNumber",
                                      v
                                    )
                                  }
                                  editable
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <NumCell
                                  value={d.emailShared}
                                  onChange={(v) =>
                                    updateMemberDraft(
                                      d.memberId,
                                      "emailShared",
                                      v
                                    )
                                  }
                                  editable
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <NumCell
                                  value={d.cvShared}
                                  onChange={(v) =>
                                    updateMemberDraft(d.memberId, "cvShared", v)
                                  }
                                  editable
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeMemberDraft(d.memberId)}
                                  className="text-red-500 hover:text-red-300 font-bold"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  {/* searchable student select */}
                  <div className="relative" ref={studentBoxRef}>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      ADD STUDENT <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => {
                        setStudentQuery(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Search student by name or email..."
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      autoComplete="off"
                    />
                    {showStudentDropdown && (
                      <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-gray-800 border border-gray-600 rounded-md shadow-lg">
                        {studentSearching ? (
                          <div className="px-3 py-2 text-sm text-gray-300">
                            Searching...
                          </div>
                        ) : studentResults.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-300">
                            No students found
                          </div>
                        ) : (
                          studentResults.map((u) => {
                            const added = studentDrafts.some(
                              (d) => d.studentId === u._id
                            );
                            return (
                              <button
                                key={u._id}
                                type="button"
                                disabled={added}
                                onClick={() => selectStudent(u)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 border-b border-gray-700 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <span className="font-medium text-gray-100">
                                  {u.fullName || "Unnamed"}
                                </span>
                                {u.email && (
                                  <span className="text-gray-300">
                                    {" "}
                                    — {u.email}
                                  </span>
                                )}
                                {added && (
                                  <span className="text-green-400">
                                    {" "}
                                    (added)
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* staged student rows */}
                  <div className="overflow-x-auto border border-gray-700 rounded-md">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-700 text-gray-200">
                          <th className="py-2 px-3 text-left font-semibold">
                            NAME
                          </th>
                          <th className="py-2 px-3 font-semibold w-28">
                            TOTAL CALLS
                          </th>
                          <th className="py-2 px-3 font-semibold w-24">
                            CV SHARED
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {studentDrafts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-4 text-center text-gray-400"
                            >
                              No students added yet
                            </td>
                          </tr>
                        ) : (
                          studentDrafts.map((d) => (
                            <tr
                              key={d.studentId}
                              className="border-t border-gray-700"
                            >
                              <td className="py-2 px-3 font-medium text-gray-100">
                                {d.name}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <NumCell
                                  value={d.totalCalls}
                                  onChange={(v) =>
                                    updateStudentDraft(
                                      d.studentId,
                                      "totalCalls",
                                      v
                                    )
                                  }
                                  editable
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <NumCell
                                  value={d.cvShared}
                                  onChange={(v) =>
                                    updateStudentDraft(
                                      d.studentId,
                                      "cvShared",
                                      v
                                    )
                                  }
                                  editable
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeStudentDraft(d.studentId)
                                  }
                                  className="text-red-500 hover:text-red-300 font-bold"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (entryType === "member"
                      ? memberDrafts.length === 0
                      : studentDrafts.length === 0)
                  }
                  className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting
                    ? "Submitting..."
                    : `Submit All (${
                        entryType === "member"
                          ? memberDrafts.length
                          : studentDrafts.length
                      })`}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-300">
            Loading report...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 text-gray-100 shadow-sm border border-gray-600 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      colSpan={editable ? 5 : 4}
                      className="bg-purple-900 text-gray-100 font-bold text-base py-3 px-4 border border-gray-600"
                    >
                      CALLING REPORT {formatDate(reportDate)}
                    </th>
                  </tr>
                  <tr className="bg-gray-700">
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600 w-16">
                      S.NO.
                    </th>
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      NAME
                    </th>
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      TOTAL CALLS
                    </th>
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      CV SHARED
                    </th>
                    {editable && (
                      <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600 w-12" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={editable ? 5 : 4}
                        className="text-center py-6 text-gray-300 border border-gray-700"
                      >
                        No students found
                      </td>
                    </tr>
                  ) : (
                    students.map((s, idx) => (
                      <tr
                        key={s.id}
                        className="bg-gray-800 hover:bg-gray-700 transition"
                      >
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-sm border border-gray-700">
                          {s.name}
                        </td>
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          <NumCell
                            value={s.totalCalls}
                            onChange={(v) =>
                              updateStudent(s.id, "totalCalls", v)
                            }
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          <NumCell
                            value={s.cvShared}
                            onChange={(v) => updateStudent(s.id, "cvShared", v)}
                            editable={editable}
                          />
                        </td>
                        {editable && (
                          <td className="py-2 px-3 text-center text-sm border border-gray-700">
                            <button
                              onClick={() => handleDeleteStudent(s.id)}
                              className="text-red-500 hover:text-red-300 font-bold"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                  {students.length > 0 && (
                    <tr className="bg-purple-900 font-bold">
                      <td
                        colSpan={2}
                        className="py-2 px-3 text-center border border-gray-600"
                      >
                        TOTAL
                      </td>
                      <td className="py-2 px-3 text-center border border-gray-600">
                        {studentTotals.totalCalls}
                      </td>
                      <td className="py-2 px-3 text-center border border-gray-600">
                        {studentTotals.cvShared}
                      </td>
                      {editable && (
                        <td className="border border-gray-600" />
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-800 text-gray-100 shadow-sm border border-gray-600 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600 w-12">
                      S.NO.
                    </th>
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      NAME
                    </th>
                   
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      TOTAL NUMBER
                    </th>
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      EMAIL SHARED
                    </th>
                    <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600">
                      CV SHARED
                    </th>
                    {editable && (
                      <th className="py-2 px-3 text-sm font-bold text-gray-100 border border-gray-600 w-12" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {realUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={editable ? 6 : 5}
                        className="text-center py-6 text-gray-300 border border-gray-700"
                      >
                        No entries yet. Click &quot;+ Add Entry&quot; to submit
                        data.
                      </td>
                    </tr>
                  ) : (
                    realUsers.map((u, idx) => (
                      <tr
                        key={u.id}
                        className="bg-gray-800 hover:bg-gray-700 transition"
                      >
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-sm font-semibold border border-gray-700 uppercase">
                          {u.name}
                        </td>
                       
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          <NumCell
                            value={u.totalNumber}
                            onChange={(v) =>
                              updateRealUser(u.id, "totalNumber", v)
                            }
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          <NumCell
                            value={u.emailShared}
                            onChange={(v) =>
                              updateRealUser(u.id, "emailShared", v)
                            }
                            editable={editable}
                          />
                        </td>
                        <td className="py-2 px-3 text-center text-sm border border-gray-700">
                          <NumCell
                            value={u.cvShared}
                            onChange={(v) => updateRealUser(u.id, "cvShared", v)}
                            editable={editable}
                          />
                        </td>
                        {editable && (
                          <td className="py-2 px-3 text-center text-sm border border-gray-700">
                            <button
                              onClick={() => handleDeleteRealUser(u.id)}
                              className="text-red-500 hover:text-red-300 font-bold"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                  {realUsers.length > 0 && (
                    <tr className="bg-purple-900 font-bold">
                      <td
                        colSpan={2}
                        className="py-2 px-3 text-center border border-gray-600"
                      >
                        TOTAL
                      </td>
                      <td className="py-2 px-3 text-center border border-gray-600">
                        {realUserTotals.totalNumber}
                      </td>
                      <td className="py-2 px-3 text-center border border-gray-600">
                        {realUserTotals.emailShared}
                      </td>
                      <td className="py-2 px-3 text-center border border-gray-600">
                        {realUserTotals.cvShared}
                      </td>
                      {editable && <td className="border border-gray-600" />}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCallingReport;
