"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Building2,
  Calendar,
  CreditCard,
  IndianRupee,
  Phone,
  Mail,
  LoaderCircle,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_LMS_URL } from "@/lib/api";
import OfferLetterUpload from "@/components/post-placement/OfferLetterUpload";
import { uploadPostPlacementOfferLetter } from "@/lib/postPlacementOfferLetter";
import styles from "./StudentDataFill.module.css";

gsap.registerPlugin(useGSAP);

// ------------------ Types & Constants ------------------
const PAYMENT_MODES = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];

interface EligibleStudent {
  _id: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
  enrollmentId?: string;
  zone?: string;
  courseNames: string[];
}

interface InstallmentInput {
  label: string;
  amount: number | "";
  date: string; // yyyy-mm-dd
  mode: PaymentMode;
  note?: string;
}

interface FormState {
  studentName: string;
  offerDate: string; // yyyy-mm-dd
  joiningDate: string; // yyyy-mm-dd
  companyName: string;
  location: string;
  hrName: string;
  hrContact: string;
  hrEmail: string;
  packageLPA: number | "";
  totalPostPlacementFee: number | "";
  remainingPrePlacementFee: number | "";
  discount: number | "";
  installments: InstallmentInput[];
}

const ORDINAL = ["1ST", "2ND", "3RD"]; // afterwards use `${n}TH`
const ordinal = (n: number) => (n <= 3 ? ORDINAL[n - 1] : `${n}TH`);

function sanitizeKeyPart(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function makeDedupeKey(name: string, company: string, offerDate: string) {
  // Example: "ram kumar|tcs|2025-08-27"
  return [
    sanitizeKeyPart(name),
    sanitizeKeyPart(company),
    offerDate || "-",
  ].join("|");
}

function isoOrUndefined(d: string) {
  return d ? new Date(d + "T00:00:00Z").toISOString() : undefined;
}

const LMS_API_KEY = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "";
const offersApiUrl = (path: string) => {
  if (!API_LMS_URL) {
    throw new Error("NEXT_PUBLIC_LMS_URL is not configured");
  }
  return `${API_LMS_URL.replace(/\/$/, "")}/api/offers${path}`;
};

const lmsHeaders = (includeJson = false): HeadersInit => ({
  ...(includeJson ? { "Content-Type": "application/json" } : {}),
  "x-api-key": LMS_API_KEY,
});

// ------------------ Page Component ------------------
export default function NewPostPlacementOfferPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const studentPickerRef = useRef<HTMLDivElement>(null);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);
  const [uploadingOfferLetter, setUploadingOfferLetter] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [candidateStudents, setCandidateStudents] = useState<EligibleStudent[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<EligibleStudent | null>(
    null,
  );

  const [form, setForm] = useState<FormState>({
    studentName: "",
    offerDate: "",
    joiningDate: "",
    companyName: "",
    location: "",
    hrName: "",
    hrContact: "",
    hrEmail: "",
    packageLPA: "",
    totalPostPlacementFee: "",
    remainingPrePlacementFee: "",
    discount: "",
    installments: [],
  });

  const paid = useMemo(
    () => form.installments.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    [form.installments]
  );

  const gross = Number(form.totalPostPlacementFee) || 0;
  const discount = Number(form.discount) || 0;
  const remainingPreview = Math.max(gross - discount - paid, 0);

  const loadCandidates = useCallback(async (query: string, signal: AbortSignal) => {
    setCandidateLoading(true);
    setCandidateError("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      const response = await fetch(
        offersApiUrl(`/candidates${params.size ? `?${params.toString()}` : ""}`),
        {
          headers: lmsHeaders(),
          cache: "no-store",
          signal,
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Could not search students");
      }
      setCandidateStudents(
        Array.isArray(payload?.students) ? payload.students : [],
      );
      setActiveCandidateIndex(0);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCandidateStudents([]);
      setCandidateError(
        error instanceof Error ? error.message : "Could not search students",
      );
    } finally {
      if (!signal.aborted) setCandidateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!studentPickerOpen || selectedStudent) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      loadCandidates(studentQuery, controller.signal);
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadCandidates, selectedStudent, studentPickerOpen, studentQuery]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        studentPickerRef.current &&
        !studentPickerRef.current.contains(event.target as Node)
      ) {
        setStudentPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".post-placement-entry", {
          autoAlpha: 0,
          y: 16,
          duration: 0.42,
          stagger: 0.06,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
        });
      });
      return () => media.revert();
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      if (!studentPickerOpen || selectedStudent) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".eligible-student-menu",
          { autoAlpha: 0, y: -6 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.2,
            ease: "power2.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    },
    {
      scope: studentPickerRef,
      dependencies: [studentPickerOpen, selectedStudent],
      revertOnUpdate: true,
    },
  );

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function updateInstallment(idx: number, patch: Partial<InstallmentInput>) {
    setForm((f) => ({
      ...f,
      installments: f.installments.map((it, i) =>
        i === idx ? { ...it, ...patch } : it
      ),
    }));
  }

  function addInstallment() {
    const n = form.installments.length + 1;
    setForm((f) => ({
      ...f,
      installments: [
        ...f.installments,
        {
          label: `${ordinal(n)} INSTALLMENT`,
          amount: "",
          date: "",
          mode: "CASH",
          note: "",
        },
      ],
    }));
  }

  function removeInstallment(idx: number) {
    setForm((f) => ({
      ...f,
      installments: f.installments.filter((_, i) => i !== idx),
    }));
  }

  const selectStudent = (student: EligibleStudent) => {
    setSelectedStudent(student);
    setStudentQuery(student.fullName || student.email || "Selected student");
    update("studentName", student.fullName || "");
    setStudentPickerOpen(false);
  };

  const clearSelectedStudent = () => {
    setSelectedStudent(null);
    setStudentQuery("");
    update("studentName", "");
    setStudentPickerOpen(true);
    window.requestAnimationFrame(() => studentSearchInputRef.current?.focus());
  };

  const handleStudentSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      setStudentPickerOpen(false);
      return;
    }
    if (!studentPickerOpen || candidateStudents.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCandidateIndex((index) =>
        Math.min(index + 1, candidateStudents.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCandidateIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const candidate = candidateStudents[activeCandidateIndex];
      if (candidate) selectStudent(candidate);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Basic client-side checks to avoid empty requireds
    if (!selectedStudent) {
      toast.error("Select a student with a valid purchased course");
      return;
    }
    if (!form.totalPostPlacementFee && !form.packageLPA) {
      toast.info("Tip: Fill Total PP Fee to track remaining accurately.");
    }

    const payload: any = {
      studentUserId: selectedStudent._id,
      studentName: selectedStudent.fullName?.trim() || form.studentName.trim(),
      email: selectedStudent.email?.trim() || undefined,
      clerkId: selectedStudent.clerkId?.trim() || undefined,
      offerDate: isoOrUndefined(form.offerDate),
      joiningDate: isoOrUndefined(form.joiningDate),
      companyName: form.companyName.trim() || undefined,
      location: form.location.trim() || undefined,
      hr: {
        name: form.hrName.trim() || undefined,
        contactNumber: form.hrContact.trim() || undefined,
        email: form.hrEmail.trim() || undefined,
      },
      packageLPA: form.packageLPA === "" ? undefined : Number(form.packageLPA),
      totalPostPlacementFee:
        form.totalPostPlacementFee === ""
          ? 0
          : Number(form.totalPostPlacementFee),
      remainingPrePlacementFee:
        form.remainingPrePlacementFee === ""
          ? 0
          : Number(form.remainingPrePlacementFee),
      discount: form.discount === "" ? 0 : Number(form.discount),
      installments: form.installments
        .filter((it) => it.amount !== "" && it.date)
        .map((it) => ({
          label: it.label.trim() || "INSTALLMENT",
          amount: Number(it.amount) || 0,
          date: isoOrUndefined(it.date),
          mode: it.mode,
          note: it.note?.trim() || undefined,
        })),
      source: "portal",
    };

    // Generate a stable dedupeKey on the client to prevent duplicate entries
    const key = makeDedupeKey(
      payload.studentName || "",
      payload.companyName || "",
      form.offerDate || ""
    );
    payload.dedupeKey = key;

    try {
      setSubmitting(true);
      const res = await fetch(offersApiUrl("/create"), {
        method: "POST",
        headers: lmsHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const createdOffer: { _id?: string } = await res.json();
      if (!createdOffer._id) {
        throw new Error("Record was created without a valid offer ID");
      }

      if (offerLetterFile) {
        try {
          setUploadingOfferLetter(true);
          await uploadPostPlacementOfferLetter(createdOffer._id, offerLetterFile);
        } catch (uploadError) {
          const uploadMessage =
            uploadError instanceof Error
              ? uploadError.message
              : "Offer letter upload failed";
          toast.error(
            `Record created, but the offer letter was not uploaded: ${uploadMessage}`,
          );
          setTimeout(() => {
            router.push("/post-placement-student-creation/post-placement-records");
          }, 1800);
          return;
        } finally {
          setUploadingOfferLetter(false);
        }
      }

      toast.success(
        offerLetterFile
          ? "Record and offer letter saved successfully"
          : "Post-placement record created",
      );

      // Navigate to list (adjust if you have a detail page)
      setTimeout(() => {
        router.push("/post-placement-student-creation/post-placement-records");
      }, 600);
    } catch (err: any) {
      const msg = String(err?.message || err || "Failed to create");
      if (msg.includes("duplicate key") || msg.includes("E11000")) {
        toast.error(
          "Duplicate detected (same name/company/offer date). Please review."
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={pageRef}
      data-theme="dark"
      className={styles.page}
    >
      <div className={styles.shell}>
        {/* Header */}
        <div className={`post-placement-entry ${styles.header} [will-change:transform,opacity]`}>
          <button
            onClick={() => router.back()}
            className={`${styles.backButton} inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold`}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <p className={styles.eyebrow}>Placement operations / New record</p>
            <h1 className={`${styles.title} text-2xl font-bold sm:text-3xl`}>
              New <span className={styles.titleAccent}>Post-Placement</span> Record
            </h1>
            <p className={`${styles.subtitle} mt-1 text-sm leading-6`}>
              Select an eligible student and capture their complete offer and fee record.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Student & Dates */}
          <section className={`post-placement-entry ${styles.card} ${styles.studentCard} [will-change:transform,opacity]`}>
            <h2 className={`${styles.sectionHeading} text-lg`}>
              <span className={styles.sectionIcon}>
                <UserRound size={17} aria-hidden="true" />
              </span>
              Student Information
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div ref={studentPickerRef} className="relative md:col-span-2">
                <label
                  htmlFor="eligible-student-search"
                  className="mb-2 block text-sm font-semibold text-purple-700"
                >
                  Select eligible student *
                </label>

                {selectedStudent ? (
                  <div className={`${styles.selectedStudent} flex min-h-20 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={20} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {selectedStudent.fullName || "Unnamed student"}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-600">
                          {selectedStudent.email || "Email unavailable"}
                          {selectedStudent.enrollmentId
                            ? ` · ${selectedStudent.enrollmentId}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          {selectedStudent.zone ? `${selectedStudent.zone} zone \u00b7 ` : ""}{selectedStudent.courseNames.join(", ")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedStudent}
                      className={`${styles.changeButton} inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600`}
                    >
                      <X size={16} aria-hidden="true" />
                      Change student
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search
                        className={styles.searchIcon}
                        size={18}
                        aria-hidden="true"
                      />
                      <input
                        ref={studentSearchInputRef}
                        id="eligible-student-search"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls="eligible-student-options"
                        aria-expanded={studentPickerOpen}
                        aria-activedescendant={
                          studentPickerOpen && candidateStudents[activeCandidateIndex]
                            ? `eligible-student-${candidateStudents[activeCandidateIndex]._id}`
                            : undefined
                        }
                        value={studentQuery}
                        onFocus={() => setStudentPickerOpen(true)}
                        onChange={(event) => {
                          setStudentQuery(event.target.value);
                          setStudentPickerOpen(true);
                        }}
                        onKeyDown={handleStudentSearchKeyDown}
                        className={styles.searchInput}
                        placeholder="Search by student name, email, or enrollment ID"
                        autoComplete="off"
                      />
                    </div>

                    {studentPickerOpen ? (
                      <div
                        id="eligible-student-options"
                        role="listbox"
                        aria-label="Students with a valid purchased course"
                        className={`eligible-student-menu ${styles.candidateMenu} absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl p-2 [will-change:transform,opacity]`}
                      >
                        {candidateLoading ? (
                          <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-slate-600" role="status">
                            <LoaderCircle
                              className="animate-spin motion-reduce:animate-none"
                              size={18}
                              aria-hidden="true"
                            />
                            Searching eligible students...
                          </div>
                        ) : candidateError ? (
                          <p className="px-3 py-5 text-center text-sm text-red-700" role="alert">
                            {candidateError}
                          </p>
                        ) : candidateStudents.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <UserRound className="mx-auto text-slate-400" size={22} aria-hidden="true" />
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              No eligible students found
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Only students with a valid purchased course appear here.
                            </p>
                          </div>
                        ) : (
                          candidateStudents.map((student, index) => (
                            <button
                              key={student._id}
                              id={`eligible-student-${student._id}`}
                              type="button"
                              role="option"
                              aria-selected={index === activeCandidateIndex}
                              onMouseEnter={() => setActiveCandidateIndex(index)}
                              onClick={() => selectStudent(student)}
                              className={`${styles.candidateOption} flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                index === activeCandidateIndex
                                  ? styles.candidateOptionActive
                                  : ""
                              }`}
                            >
                              <span className={styles.candidateAvatar}>
                                <UserRound size={18} aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={styles.candidateName}>
                                  {student.fullName || "Unnamed student"}
                                </span>
                                <span className={styles.candidateEmail}>
                                  {student.email || "Email unavailable"}
                                </span>
                                <span className={styles.candidateCourse}>
                                  {student.courseNames.join(", ")}
                                </span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                    <p className={styles.helperText}>
                      Results are restricted to students with at least one valid purchased course.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Offer Date
                </label>
                <div className="relative">
                  <Calendar
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="date"
                    value={form.offerDate}
                    onChange={(e) => update("offerDate", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Joining Date
                </label>
                <div className="relative">
                  <Calendar
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => update("joiningDate", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Company & HR */}
          <section className={`post-placement-entry ${styles.card} ${styles.companyCard} [will-change:transform,opacity]`}>
            <h2 className={`${styles.sectionHeading} text-lg`}>
              <span className={styles.sectionIcon}>
                <Building2 size={17} aria-hidden="true" />
              </span>
              Company & HR Details
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Company
                </label>
                <div className="relative">
                  <Building2
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="e.g., TCS"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Location
                </label>
                <input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  HR Name
                </label>
                <input
                  value={form.hrName}
                  onChange={(e) => update("hrName", e.target.value)}
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="Person name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  HR Contact
                </label>
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    value={form.hrContact}
                    onChange={(e) => update("hrContact", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  HR Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="email"
                    value={form.hrEmail}
                    onChange={(e) => update("hrEmail", e.target.value)}
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Package & Fees */}
          <section className={`post-placement-entry ${styles.card} ${styles.financeCard} [will-change:transform,opacity]`}>
            <h2 className={`${styles.sectionHeading} text-lg`}>
              <span className={styles.sectionIcon}>
                <IndianRupee size={17} aria-hidden="true" />
              </span>
              Financial Details
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Package (LPA)
                </label>
                <div className="relative">
                  <IndianRupee
                    className="pointer-events-none absolute right-4 top-4 text-purple-400"
                    size={16}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.packageLPA}
                    onChange={(e) =>
                      update(
                        "packageLPA",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 pr-12 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                    placeholder="e.g., 4"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Total PP Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.totalPostPlacementFee}
                  onChange={(e) =>
                    update(
                      "totalPostPlacementFee",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="e.g., 25000"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Remaining Pre‑Placement Fee (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.remainingPrePlacementFee}
                  onChange={(e) =>
                    update(
                      "remainingPrePlacementFee",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-purple-700">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.discount}
                  onChange={(e) =>
                    update(
                      "discount",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border-2 border-purple-200 bg-white/50 px-4 py-3 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div className={`${styles.financeSummary} md:col-span-4 rounded-2xl p-4 text-sm`}>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="font-medium">
                      Paid so far:
                    </span>{" "}
                    <span className="font-bold">
                      ₹{paid.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">
                      Computed remaining (preview):
                    </span>{" "}
                    <span className="font-bold">
                      ₹{remainingPreview.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs opacity-75">
                    (Backend will auto‑compute and store{" "}
                    <code className="rounded bg-amber-100 px-1 text-amber-950">
                      remainingFee
                    </code>
                    )
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Offer letter */}
          <section className={`post-placement-entry ${styles.card} ${styles.documentCard} [will-change:transform,opacity]`}>
            <OfferLetterUpload
              file={offerLetterFile}
              onFileChange={setOfferLetterFile}
              isUploading={uploadingOfferLetter}
              disabled={submitting}
            />
          </section>

          {/* Installments */}
          <section className={`post-placement-entry ${styles.card} ${styles.paymentsCard} [will-change:transform,opacity]`}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className={`${styles.sectionHeading} mb-0 text-lg`}>
                <span className={styles.sectionIcon}>
                  <CreditCard size={17} aria-hidden="true" />
                </span>
                Initial Payments (optional)
              </h2>
              <button
                type="button"
                onClick={addInstallment}
                className={`${styles.addButton} inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold`}
              >
                <Plus size={16} /> Add Installment
              </button>
            </div>

            {form.installments.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                  <CreditCard size={24} className="text-violet-600" aria-hidden="true" />
                </div>
                <p className="font-medium text-slate-700">No installments added yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add the initial payment entries if any were collected.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.installments.map((inst, idx) => (
                  <div
                    key={idx}
                    className={`${styles.installmentCard} grid grid-cols-1 items-end gap-4 rounded-2xl p-5 md:grid-cols-12`}
                  >
                    <div className="md:col-span-3">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Label
                      </label>
                      <input
                        value={inst.label}
                        onChange={(e) =>
                          updateInstallment(idx, { label: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={inst.amount}
                        onChange={(e) =>
                          updateInstallment(idx, {
                            amount:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Paid Date
                      </label>
                      <input
                        type="date"
                        value={inst.date}
                        onChange={(e) =>
                          updateInstallment(idx, { date: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Mode
                      </label>
                      <select
                        value={inst.mode}
                        onChange={(e) =>
                          updateInstallment(idx, {
                            mode: e.target.value as PaymentMode,
                          })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      >
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-purple-700">
                        Note
                      </label>
                      <input
                        value={inst.note || ""}
                        onChange={(e) =>
                          updateInstallment(idx, { note: e.target.value })
                        }
                        className="w-full rounded-lg border-2 border-purple-200 bg-white/70 px-3 py-2 text-gray-800 placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="Receipt #, remarks"
                      />
                    </div>
                    <div className="md:col-span-12 flex items-center justify-end pt-3 border-t border-purple-200">
                      <button
                        type="button"
                        onClick={() => removeInstallment(idx)}
                        className={`${styles.removeButton} inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold`}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Actions */}
          <div className={`post-placement-entry ${styles.actions} [will-change:transform,opacity]`}>
            <button
              type="button"
              onClick={() => router.back()}
              className={`${styles.secondaryButton} inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold`}
            >
              <ArrowLeft size={16} /> Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedStudent}
              className={`${styles.primaryButton} inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold`}
            >
              <Save size={16} />
              {uploadingOfferLetter
                ? "Uploading offer letter..."
                : submitting
                  ? "Saving..."
                  : "Create Record"}
            </button>
          </div>
        </form>

        <ToastContainer position="bottom-right" />
      </div>
    </div>
  );
}
