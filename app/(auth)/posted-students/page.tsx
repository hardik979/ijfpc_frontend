"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, Users, Briefcase, MapPin, Calendar, X, Link2, Check } from "lucide-react";
import { API_LMS_URL } from "@/lib/api";

type StudentSuggestion = {
  _id: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
};

type Installment = {
  label: string;
  amount: number;
  date: string;
  mode: string;
  note?: string;
};

type PostPlacementRow = {
  _id: string;
  studentName: string;
  companyName?: string;
  location?: string;
  offerDate?: string;
  joiningDate?: string;
  packageLPA?: number | null;
  totalPostPlacementFee?: number;
  remainingPrePlacementFee?: number;
  discount?: number;
  remainingFee?: number;
  remainingFeeNote?: string;
  hr?: { name?: string; contactNumber?: string; email?: string };
  installments?: Installment[];
  email?: string;
  clerkId?: string;
};

type ApiResponse = {
  status: "success" | "error";
  message: string;
  data?: PostPlacementRow[];
};

const cn = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function PostedStudentsPage() {
  const [studentName, setStudentName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [unconnectedOnly, setUnconnectedOnly] = useState(false);
  const [connectedOnly, setConnectedOnly] = useState(false);

  const dStudent = useDebounced(studentName, 400);
  const dCompany = useDebounced(companyName, 400);
  const dLocation = useDebounced(location, 400);

  const [rows, setRows] = useState<PostPlacementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PostPlacementRow | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [emailQuery, setEmailQuery] = useState("");
  const dEmailQuery = useDebounced(emailQuery, 400);
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!connectMode || !dEmailQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const run = async () => {
      setSuggestLoading(true);
      try {
        const url = `${API_LMS_URL}/api/users/get-student-list?search=${encodeURIComponent(dEmailQuery.trim())}&limit=10`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        setSuggestions(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    };
    run();
  }, [dEmailQuery, connectMode,]);

  const handleConnect = async (s: StudentSuggestion) => {
    if (!selected) return;
    setConnecting(true);
    setConnectMsg(null);
    try {
      const url = `${API_LMS_URL}/api/users/uptade-post-placement-data?_id=${encodeURIComponent(selected._id)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: s.clerkId, email: s.email }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        setConnectMsg(json.message || "Failed to connect");
        return;
      }
      setConnectMsg("Connected successfully");
      setRows((prev) =>
        prev.map((r) => (r._id === selected._id ? { ...r, email: s.email } : r))
      );
      setSelected((prev) => (prev ? { ...prev, email: s.email } : prev));
      setConnectMode(false);
      setEmailQuery("");
      setSuggestions([]);
    } catch (e: any) {
      setConnectMsg(e?.message || "Network error");
    } finally {
      setConnecting(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setConnectMode(false);
    setEmailQuery("");
    setSuggestions([]);
    setConnectMsg(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (dStudent.trim()) params.set("studentName", dStudent.trim());
        if (dCompany.trim()) params.set("companyName", dCompany.trim());
        if (dLocation.trim()) params.set("location", dLocation.trim());
        if (joiningDate) params.set("joiningDate", joiningDate);

        const qs = params.toString();
        const url = `${API_LMS_URL}/api/users/get-post-placement-data${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const json: ApiResponse = await res.json();

        if (!res.ok || json.status !== "success") {
          setRows([]);
          setError(json.message || "Failed to load data");
          return;
        }
        setRows(json.data || []);
      } catch (e: any) {
        setRows([]);
        setError(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dStudent, dCompany, dLocation, joiningDate]);

  const filteredRows = useMemo(() => {
    if (unconnectedOnly) {
      return rows.filter((r) => !r.email?.trim() || !r.clerkId?.trim());
    }
    if (connectedOnly) {
      return rows.filter((r) => !!r.email?.trim() && !!r.clerkId?.trim());
    }
    return rows;
  }, [rows, unconnectedOnly, connectedOnly]);

  const stats = useMemo(() => {
    const totalFee = filteredRows.reduce((s, r) => s + (r.totalPostPlacementFee || 0), 0);
    const remaining = filteredRows.reduce((s, r) => s + (r.remainingFee || 0), 0);
    return { count: filteredRows.length, totalFee, remaining };
  }, [filteredRows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0a1a] via-[#0f0b2a] to-[#1a0f3f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
            Posted Students
          </h1>
          <p className="text-sm text-purple-300/70">
            Post-placement offer records
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Records" value={stats.count} icon={<Users className="w-5 h-5" />} iconBg="bg-purple-500/20" iconColor="text-purple-300" />
          {/* <StatCard title="Total Post-Placement Fee" value={formatINR(stats.totalFee)} icon={<Briefcase className="w-5 h-5" />} iconBg="bg-emerald-500/20" iconColor="text-emerald-300" /> */}
          {/* <StatCard title="Remaining Fee" value={formatINR(stats.remaining)} icon={<Calendar className="w-5 h-5" />} iconBg="bg-amber-500/20" iconColor="text-amber-300" /> */}
        </div>

        <div className="mb-6 rounded-2xl bg-white/5 backdrop-blur-xl p-6 border border-purple-500/20 shadow-xl shadow-purple-900/20">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-300" />
              <h3 className="text-sm font-semibold text-purple-200">Filters</h3>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unconnectedOnly}
                  onChange={(e) => {
                    setUnconnectedOnly(e.target.checked);
                    if (e.target.checked) setConnectedOnly(false);
                  }}
                  className="h-4 w-4 rounded border-purple-500/40 bg-white/10 accent-purple-500"
                />
                <span className="text-xs font-medium text-purple-200">
                  Show only unconnected (missing email or clerkId)
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={connectedOnly}
                  onChange={(e) => {
                    setConnectedOnly(e.target.checked);
                    if (e.target.checked) setUnconnectedOnly(false);
                  }}
                  className="h-4 w-4 rounded border-purple-500/40 bg-white/10 accent-purple-500"
                />
                <span className="text-xs font-medium text-purple-200">
                  Show only connected
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <FilterInput
              label="Student Name"
              value={studentName}
              onChange={setStudentName}
              placeholder="Search student..."
              icon={<Search className="w-4 h-4 text-purple-400" />}
            />
            <FilterInput
              label="Company"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Search company..."
              icon={<Briefcase className="w-4 h-4 text-purple-400" />}
            />
            <FilterInput
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="Search location..."
              icon={<MapPin className="w-4 h-4 text-purple-400" />}
            />
            <div>
              <label className="mb-2 block text-xs font-medium text-purple-300">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full rounded-xl border border-purple-500/30 bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-900/30">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5 border-b border-purple-500/20">
                <tr>
                  <Th>Student</Th>
                  <Th>Company</Th>
                  <Th>Location</Th>
                  <Th>Joining Date</Th>
                  {/* <Th className="text-right">Package (LPA)</Th>
                  <Th className="text-right">Total Fee</Th>
                  <Th className="text-right">Remaining</Th> */}
                  <Th>HR Contact</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {filteredRows.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => setSelected(r)}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Td>
                      <div className="font-semibold text-white">{r.studentName}</div>
                      {r.email && (
                        <div className="text-xs text-purple-300/70 mt-0.5">{r.email}</div>
                      )}
                    </Td>
                    <Td className="text-purple-200">{r.companyName || "—"}</Td>
                    <Td className="text-purple-200">{r.location || "—"}</Td>
                    <Td className="text-purple-200">{formatDate(r.joiningDate)}</Td>
                    {/* <Td className="text-right font-semibold text-white">
                      {r.packageLPA != null ? `${r.packageLPA} LPA` : "—"}
                    </Td>
                    <Td className="text-right font-semibold text-emerald-400">
                      {formatINR(r.totalPostPlacementFee || 0)}
                    </Td>
                    <Td className="text-right font-semibold text-amber-400">
                      {formatINR(r.remainingFee || 0)}
                    </Td> */}
                    <Td>
                      <div className="text-sm text-purple-200">{r.hr?.name || "—"}</div>
                      {r.hr?.contactNumber && (
                        <div className="text-xs text-purple-300/70">{r.hr.contactNumber}</div>
                      )}
                      {r.hr?.email && (
                        <div className="text-xs text-purple-300/70">{r.hr.email}</div>
                      )}
                    </Td>
                  </tr>
                ))}
                {!filteredRows.length && (
                  <tr>
                    <Td colSpan={8} className="py-12 text-center">
                      <div className="text-purple-400/70">
                        {loading ? "Loading..." : error || "No records found"}
                      </div>
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-[#1a0f3f] to-[#0f0b2a] border border-purple-500/30 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-[#1a0f3f]/90 backdrop-blur-xl">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.studentName}</h2>
                <p className="text-xs text-purple-300/70">{selected.companyName || "—"}</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-purple-300 hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Email" value={selected.email || "—"} />
                <DetailField label="Location" value={selected.location || "—"} />
                <DetailField label="Offer Date" value={formatDate(selected.offerDate)} />
                <DetailField label="Joining Date" value={formatDate(selected.joiningDate)} />
                <DetailField label="Package" value={selected.packageLPA != null ? `${selected.packageLPA} LPA` : "—"} />
                <DetailField label="Total Fee" value={formatINR(selected.totalPostPlacementFee || 0)} />
                <DetailField label="Remaining Pre-Placement" value={formatINR(selected.remainingPrePlacementFee || 0)} />
                <DetailField label="Discount" value={formatINR(selected.discount || 0)} />
                <DetailField label="Remaining Fee" value={formatINR(selected.remainingFee || 0)} />
                <DetailField label="HR Name" value={selected.hr?.name || "—"} />
                <DetailField label="HR Contact" value={selected.hr?.contactNumber || "—"} />
                <DetailField label="HR Email" value={selected.hr?.email || "—"} />
              </div>

              {selected.installments && selected.installments.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">Installments</div>
                  <div className="rounded-xl border border-purple-500/20 overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-purple-300">Label</th>
                          <th className="px-3 py-2 text-right text-xs text-purple-300">Amount</th>
                          <th className="px-3 py-2 text-left text-xs text-purple-300">Date</th>
                          <th className="px-3 py-2 text-left text-xs text-purple-300">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-500/10">
                        {selected.installments.map((i, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-purple-200">{i.label}</td>
                            <td className="px-3 py-2 text-right text-emerald-400">{formatINR(i.amount)}</td>
                            <td className="px-3 py-2 text-purple-200">{formatDate(i.date)}</td>
                            <td className="px-3 py-2 text-purple-200">{i.mode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-purple-500/20">
                {!connectMode ? (
                  <button
                    onClick={() => setConnectMode(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Search student by email
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                      <input
                        autoFocus
                        value={emailQuery}
                        onChange={(e) => setEmailQuery(e.target.value)}
                        placeholder="Type email..."
                        className="w-full rounded-xl border border-purple-500/30 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-purple-400/50 outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>

                    {emailQuery.trim() && (
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-purple-500/20 bg-white/5">
                        {suggestLoading ? (
                          <div className="px-4 py-3 text-sm text-purple-300/70">Searching...</div>
                        ) : suggestions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-purple-300/70">No matches</div>
                        ) : (
                          suggestions.map((s) => (
                            <button
                              key={s._id}
                              disabled={connecting}
                              onClick={() => handleConnect(s)}
                              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition disabled:opacity-50"
                            >
                              <div>
                                <div className="text-sm font-semibold text-white">{s.fullName || "—"}</div>
                                <div className="text-xs text-purple-300/70">{s.email || "—"}</div>
                              </div>
                              <Check className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setConnectMode(false);
                          setEmailQuery("");
                          setSuggestions([]);
                        }}
                        className="rounded-xl border border-purple-500/30 px-4 py-2 text-sm text-purple-200 hover:bg-white/5 transition"
                      >
                        Cancel
                      </button>
                      {connectMsg && (
                        <span className="text-xs text-purple-300">{connectMsg}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-purple-300/70 mb-1">{label}</div>
      <div className="text-sm text-white break-words">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th className={cn("px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-purple-300", className)}>
      {children}
    </th>
  );
}

function Td({ children, className = "", colSpan }: React.PropsWithChildren<{ className?: string; colSpan?: number }>) {
  return (
    <td colSpan={colSpan} className={cn("px-6 py-4 text-sm", className)}>
      {children}
    </td>
  );
}

function StatCard({ title, value, icon, iconBg, iconColor }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl p-6 border border-purple-500/20 shadow-xl shadow-purple-900/20">
      <div className={cn("inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 backdrop-blur-sm", iconBg)}>
        <div className={iconColor}>{icon}</div>
      </div>
      <div className="text-xs font-medium text-purple-300/80 mb-1">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder, icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-purple-300">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-purple-500/30 bg-white/10 pr-4 py-2.5 text-sm text-white placeholder:text-purple-400/50 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition backdrop-blur-sm",
            icon ? "pl-10" : "pl-4"
          )}
        />
      </div>
    </div>
  );
}
