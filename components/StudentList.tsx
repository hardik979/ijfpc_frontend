"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, X, GraduationCap, BarChart3 } from "lucide-react";
import AcademicResults from "./AcademicResults";
import ZoneStudentAnalytics from "./ZoneStudentAnalytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";

interface BatchHistoryItem {
  _id: string;
  from: string | null;
  to: string;
  changedAt: string;
  changedBy: string;
  note?: string;
}

interface Student {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string;
  batchHistory?: BatchHistoryItem[];
  feePlan?: string;
  joinedMonth?: string;
  avatar?: string;
  zone?: string;
  recordingCount?: number;
  isPlaced?: boolean;
  purchasedCourses?: unknown[];
  isRealUser?: boolean;
}

interface StudentsListResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
}

interface StudentSuggestion {
  _id: string;
  clerkId: string;
  fullName: string;
  email: string;
}

interface Course {
  _id: string;
  title?: string;
}

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const zoneBadge = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue")
    return "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30";
  if (z === "yellow")
    return "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30";
  if (z === "green")
    return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  return "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30";
};

const shortCourseName = (title?: string) => {
  if (!title) return "—";
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 3);
};

const courseThemes = [
  {
    grad: "from-sky-600/25 to-sky-900/20",
    border: "border-sky-500/40",
    hover: "hover:border-sky-400",
    text: "text-sky-300",
    badge: "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30",
  },
  {
    grad: "from-emerald-600/25 to-emerald-900/20",
    border: "border-emerald-500/40",
    hover: "hover:border-emerald-400",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30",
  },
  {
    grad: "from-violet-600/25 to-violet-900/20",
    border: "border-violet-500/40",
    hover: "hover:border-violet-400",
    text: "text-violet-300",
    badge: "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/30",
  },
  {
    grad: "from-orange-600/25 to-orange-900/20",
    border: "border-orange-500/40",
    hover: "hover:border-orange-400",
    text: "text-orange-300",
    badge: "bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/30",
  },
];


const zoneOrder = (zone?: string) => {
  const z = (zone || "").toLowerCase();
  if (z === "blue") return 0;
  if (z === "yellow") return 1;
  if (z === "green") return 2;
  return 3;
};

const sortByZone = (list: Student[]) =>[...list].sort((a, b) => zoneOrder(a.zone) - zoneOrder(b.zone));

const safeDate = (val?: string) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StudentsListPage = () => {
  const router = useRouter();
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [showAcademicResults, setShowAcademicResults] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({});
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const skipNextSuggestionRef = useRef(false);
  const [allStudentsForChart, setAllStudentsForChart] = useState<Student[]>([]);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());

  // --- Active/Placed students fetched once with status="all" (all enrolled) ---
  const [allEnrolledStudents, setAllEnrolledStudents] = useState<Student[]>([]);
  const [allEnrolledLoading, setAllEnrolledLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [searchSuggestions, setSearchSuggestions] = useState<StudentSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [placementUpdatingId, setPlacementUpdatingId] = useState<string | null>(null);
  const [placedFilter, setPlacedFilter] = useState<"all" | "placed" | "notplaced">("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [placementUnlocked, setPlacementUnlocked] = useState(false);

  // Whether we are in the "ALL students" drill-down view (any of the 3 top cards)
  const isAllView = selectedCourseId === "ALL";
  // Active students view = ALL view filtered to not-placed (entered via "Active Students" card)
  const isActiveView = isAllView && placedFilter === "notplaced";

  // ────────────────────────────────────────────
  // Derived counts from the single enrolled fetch
  // ────────────────────────────────────────────
  const activeStudentsCount = useMemo(
    () =>
      allEnrolledStudents.filter(
        (s) =>
          s.isRealUser !== true &&
          s.isPlaced !== true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      ).length,
    [allEnrolledStudents]
  );

  const activeStudentsBase = useMemo(
    () =>
      allEnrolledStudents.filter(
        (s) =>
          s.isRealUser !== true &&
          s.isPlaced !== true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      ),
    [allEnrolledStudents]
  );

  const placedStudentsCount = useMemo(
    () =>
      allEnrolledStudents.filter(
        (s) => s.isRealUser !== true && s.isPlaced === true
      ).length,
    [allEnrolledStudents]
  );

  // ────────────────────────────────────────────
  // displayStudents for the "ALL" drill-down view
  // Filters + client-side pagination
  // ────────────────────────────────────────────
  const filteredAllStudents = useMemo(() => {
    if (!isAllView) return [];

    let list = allEnrolledStudents;

    if (placedFilter === "placed") {
      list = list.filter((s) => s.isPlaced === true);
    } else if (placedFilter === "notplaced") {
      list = list.filter(
        (s) =>
          s.isPlaced !== true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      );
    }
    // "all" → show all enrolled (purchasedCourses not empty is already guaranteed by the API)

    if (isActiveView) {
      if (zoneFilter !== "all") {
        list = list.filter(
          (s) => (s.zone || "").toLowerCase() === zoneFilter.toLowerCase()
        );
      }
      if (courseFilter !== "all") {
        list = list.filter(
          (s) =>
            Array.isArray(s.purchasedCourses) &&
            s.purchasedCourses.some((c) => String(c) === courseFilter)
        );
      }
    }

    if (appliedSearch.trim()) {
      const q = appliedSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q)
      );
    }
    return sortByZone(list);
  }, [isAllView, isActiveView, allEnrolledStudents, placedFilter, zoneFilter, courseFilter, appliedSearch]);

  const allViewTotal = filteredAllStudents.length;
  const allViewTotalPages = Math.max(1, Math.ceil(allViewTotal / limit));

  const allViewPageStudents = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAllStudents.slice(start, start + limit);
  }, [filteredAllStudents, page, limit]);

  // ────────────────────────────────────────────
  // For course-specific or general paginated view
  // ────────────────────────────────────────────
  const visibleStudents = useMemo(() => {
    if (placedFilter === "all") return students;
    if (placedFilter === "placed") return students.filter((s) => s.isPlaced);
    return students.filter((s) => !s.isPlaced);
  }, [students, placedFilter]);

  // Final display list
  const displayStudents = isAllView ? allViewPageStudents : visibleStudents;
  const displayTotal = isAllView ? allViewTotal : total;
  const displayTotalPages = isAllView ? allViewTotalPages : Math.max(1, Math.ceil(total / limit));

  // Zone counts for the current drill-down list
  const zoneCounts = useMemo(() => {
    const source: Student[] = isAllView
      ? filteredAllStudents
      : (() => {
          let list = courseStudents;
          if (appliedSearch.trim()) {
            const q = appliedSearch.trim().toLowerCase();
            list = list.filter(
              (s) =>
                (s.fullName || "").toLowerCase().includes(q) ||
                (s.email || "").toLowerCase().includes(q)
            );
          }
          return list;
        })();
    const counts = { blue: 0, yellow: 0, green: 0 };
    source.forEach((s) => {
      const z = (s.zone || "").toLowerCase();
      if (z === "blue") counts.blue += 1;
      else if (z === "yellow") counts.yellow += 1;
      else if (z === "green") counts.green += 1;
    });
    return counts;
  }, [isAllView, filteredAllStudents, courseStudents, appliedSearch]);

  // ────────────────────────────────────────────
  // Placement toggle — update both local states
  // ────────────────────────────────────────────
  const togglePlacement = async (studentId: string, next: boolean) => {
    try {
      setPlacementUpdatingId(studentId);
      const res = await fetch(
        `${API_LMS_URL}/api/users/student-placement-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: studentId, isPlaced: next }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Update failed");

      const updater = (prev: Student[]) =>
        prev.map((s) => (s._id === studentId ? { ...s, isPlaced: next } : s));

      setStudents(updater);
      setCourseStudents(updater);
      setAllEnrolledStudents(updater);
    } catch (err) {
      console.error("togglePlacement error:", err);
    } finally {
      setPlacementUpdatingId(null);
    }
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  // ────────────────────────────────────────────
  // Fetch: general student list / course students
  // (only used when NOT in "ALL" view)
  // ────────────────────────────────────────────
  const getStudentList = async () => {
    if (isAllView) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (selectedCourseId && selectedCourseId !== "ALL") {
        let list = courseStudents;
        if (list.length === 0) {
          // Derive from the same source the course cards use so the
          // drill-down count always matches the card count.
          list = activeStudentsBase.filter(
            (s) =>
              Array.isArray(s.purchasedCourses) &&
              s.purchasedCourses.some(
                (p) => String(p) === String(selectedCourseId)
              )
          );
          setCourseStudents(list);
        }

        let filtered = list;
        if (appliedSearch.trim()) {
          const q = appliedSearch.trim().toLowerCase();
          filtered = list.filter(
            (s) =>
              (s.fullName || "").toLowerCase().includes(q) ||
              (s.email || "").toLowerCase().includes(q)
          );
        }

        const sorted = sortByZone(filtered);
        const start = (page - 1) * limit;
        setStudents(sorted.slice(start, start + limit));
        setTotal(sorted.length);
        return;
      }

      // General list (no course selected, no "ALL")
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());

      const response = await fetch(
        `${API_LMS_URL}/api/student-info/get-student-list?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        }
      );
      const json: StudentsListResponse = await response.json();
      if (!response.ok) throw new Error("Failed to load student list");
      const dataList = Array.isArray(json.data) ? json.data : [];
      const filteredData = dataList.filter((s) => s.isRealUser !== true);
      setStudents(filteredData);
      setTotal(Number(json.total || 0) - (dataList.length - filteredData.length));
    } catch (error) {
      console.error("getStudentList error:", error);
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const getCourses = async () => {
    try {
      const response = await fetch(`${API_LMS_URL}/api/courses/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
        },
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error("Failed to fetch courses");
      const list: Course[] = Array.isArray(json) ? json : [];
      setCourses(list);

      const results = await Promise.all(
        list.map(async (c) => {
          try {
            const r = await fetch(
              `${API_LMS_URL}/api/users/find-student-by-course?courseId=${encodeURIComponent(
                c._id
              )}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key":
                    process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
                },
                cache: "no-store",
              }
            );
            const j = await r.json();
            const studentsArr: Student[] = Array.isArray(j.students)
              ? j.students
              : [];
            const activeCount = studentsArr.filter(
              (s) => s.isPlaced !== true && s.isRealUser !== true
            ).length;
            return [c._id, activeCount] as const;
          } catch {
            return [c._id, 0] as const;
          }
        })
      );
      setCourseCounts(Object.fromEntries(results));
    } catch (error) {
      console.error("getCourses error:", error);
      setCourses([]);
    }
  };

  // ────────────────────────────────────────────
  // Fetch ALL enrolled students once on mount
  // (used for cards + drill-down)
  // ────────────────────────────────────────────
  const fetchAllEnrolledStudents = async () => {
    try {
      setAllEnrolledLoading(true);
      const res = await fetch(
        `${API_LMS_URL}/api/users/active-placement-students?status=all`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || "Failed to fetch enrolled students");
      const enrolled = Array.isArray(json.students) ? json.students : [];
      setAllEnrolledStudents(
        enrolled.filter((s: Student) => s.isRealUser !== true)
      );
    } catch (error) {
      console.error("fetchAllEnrolledStudents error:", error);
      setAllEnrolledStudents([]);
    } finally {
      setAllEnrolledLoading(false);
    }
  };

  const getSearchSuggestions = async (keyword: string) => {
    try {
      if (!keyword.trim()) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setSuggestionLoading(true);

      // If in "ALL" view, search locally from allEnrolledStudents
      if (isAllView) {
        const q = keyword.trim().toLowerCase();
        const local = allEnrolledStudents
          .filter(
            (s) =>
              (s.fullName || "").toLowerCase().includes(q) ||
              (s.email || "").toLowerCase().includes(q)
          )
          .slice(0, 6)
          .map((s) => ({
            _id: s._id,
            clerkId: s.clerkId,
            fullName: s.fullName,
            email: s.email,
          }));
        setSearchSuggestions(local);
        setShowSuggestions(true);
        setActiveSuggestionIndex(-1);
        setSuggestionLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "6");
      params.set("search", keyword.trim());

      const response = await fetch(
        `${API_LMS_URL}/api/student-info/get-student-list?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
          },
          cache: "no-store",
        }
      );
      const json: StudentsListResponse = await response.json();
      if (!response.ok) throw new Error("Failed to load suggestions");

      const suggestionData = (Array.isArray(json.data) ? json.data : []).filter(
        (s) => s.isRealUser !== true
      );
      setSearchSuggestions(
        suggestionData.map((student) => ({
          _id: student._id,
          clerkId: student.clerkId,
          fullName: student.fullName,
          email: student.email,
        }))
      );
      setShowSuggestions(true);
      setActiveSuggestionIndex(-1);
    } catch (error) {
      console.error("getSearchSuggestions error:", error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSuggestionLoading(false);
    }
  };

  // ── Effects ──────────────────────────────────

  useEffect(() => {
    getStudentList();
  }, [page, limit, appliedSearch, selectedCourseId, activeStudentsBase]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("studentsListState");
      if (saved) {
        const s = JSON.parse(saved);
        if (s && typeof s === "object") {
          if (typeof s.selectedCourseId === "string") setSelectedCourseId(s.selectedCourseId);
          if (s.placedFilter === "all" || s.placedFilter === "placed" || s.placedFilter === "notplaced") setPlacedFilter(s.placedFilter);
          if (typeof s.page === "number") setPage(s.page);
          if (typeof s.limit === "number") setLimit(s.limit);
          if (typeof s.appliedSearch === "string") setAppliedSearch(s.appliedSearch);
          if (typeof s.searchDraft === "string") setSearchDraft(s.searchDraft);
          skipNextSuggestionRef.current = true;
        }
        sessionStorage.removeItem("studentsListState");
      }
    } catch { }

    getCourses();
    fetchAllEnrolledStudents();

    // Chart data
    (async () => {
      try {
        const r = await fetch(
          `${API_LMS_URL}/api/student-info/get-student-list?page=1&limit=10000`,
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "",
            },
            cache: "no-store",
          }
        );
        const j = await r.json();
        if (r.ok) {
          const chartList = (Array.isArray(j.data) ? j.data : []).filter(
            (s: Student) => s.isRealUser !== true
          );
          setAllStudentsForChart(chartList);
         
        }
      } catch (e) {
        console.error("chart fetch error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    setCourseStudents([]);
  }, [selectedCourseId]);

  useEffect(() => {
    if (skipNextSuggestionRef.current) {
      skipNextSuggestionRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (!searchDraft.trim()) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      if (selectedCourseId && selectedCourseId !== "ALL") {
        const q = searchDraft.trim().toLowerCase();
        const local = courseStudents
          .filter(
            (s) =>
              (s.fullName || "").toLowerCase().includes(q) ||
              (s.email || "").toLowerCase().includes(q)
          )
          .slice(0, 6)
          .map((s) => ({
            _id: s._id,
            clerkId: s.clerkId,
            fullName: s.fullName,
            email: s.email,
          }));
        setSearchSuggestions(local);
        setShowSuggestions(true);
        setActiveSuggestionIndex(-1);
        return;
      }
      getSearchSuggestions(searchDraft);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft, selectedCourseId, courseStudents, allEnrolledStudents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Helpers ──────────────────────────────────

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    allStudentsForChart.forEach((s) => {
      if (!s.joinedMonth) return;
      const d = new Date(s.joinedMonth);
      if (!Number.isNaN(d.getTime())) set.add(d.getFullYear());
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [allStudentsForChart]);

  const chartData = useMemo(() => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const counts = Array(12).fill(0);
    allStudentsForChart.forEach((s) => {
      if (!s.joinedMonth) return;
      const d = new Date(s.joinedMonth);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== chartYear) return;
      counts[d.getMonth()] += 1;
    });
    return months.map((m, i) => ({ month: m, admissions: counts[i] }));
  }, [allStudentsForChart, chartYear]);

  const handlePageChange = (newPage: number) => {
    const maxPages = isAllView ? allViewTotalPages : totalPages;
    if (newPage < 1 || newPage > maxPages) return;
    setPage(newPage);
  };

  const handleViewStudent = (clerkId: string) => {
    try {
      sessionStorage.setItem(
        "studentsListState",
        JSON.stringify({
          selectedCourseId,
          placedFilter,
          page,
          limit,
          appliedSearch,
          searchDraft,
        })
      );
    } catch { }
    router.push(`/student-full-info?clerkId=${clerkId}`);
  };

  const handleApplySearch = (value: string) => {
    const finalValue = value.trim();
    skipNextSuggestionRef.current = true;
    setSearchDraft(finalValue);
    setAppliedSearch(finalValue);
    setPage(1);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (student: StudentSuggestion) => {
    skipNextSuggestionRef.current = true;
    setSearchDraft(student.fullName || student.email);
    setAppliedSearch(student.fullName || student.email);
    setPage(1);
    setShowSuggestions(false);
  };

  const getPageNumbers = () => {
    const maxPages = isAllView ? allViewTotalPages : totalPages;
    const visiblePages = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(maxPages, start + visiblePages - 1);
    if (end - start < visiblePages - 1) {
      start = Math.max(1, end - visiblePages + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // ── Render ───────────────────────────────────

  if (loading && !isAllView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09061a]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#8b5cf6]" />
          <p className="mt-4 text-[#a8a0d6]">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09061a] p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Students Overview</h1>
            <p className="mt-2 text-[#a8a0d6]">
              View all students, search them, and open complete details
            </p>
          </div>

          <button
            onClick={() => { router.push('/batch-section/students-zone-update') }}
            className="shrink-0 rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640]"
          >
            Update Students Zone
          </button>

          <button
            onClick={() => { router.push('/students-call-reports') }}
            className="shrink-0 rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640]"
          >
            Call Recording Annalysiss Dashboard
          </button>

          <button
            onClick={() => setShowAcademicResults((v) => !v)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640]"
          >
            <GraduationCap className="h-4 w-4" />
            {showAcademicResults ? "Hide Academic Results" : "Academic Results"}
          </button>

          <Link
            href="/communication-analytics"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640]"
          >
            <BarChart3 className="h-4 w-4" />
            Communication Analytics
          </Link>
        </div>

        {showAcademicResults && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-[#312a63] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <AcademicResults />
          </div>
        )}

        {/* ── Cards ── */}
        {!selectedCourseId && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* <button
              onClick={() => {
                setSelectedCourseId("ALL");
                setPlacedFilter("all");
                setPage(1);
                setSearchDraft("");
                setAppliedSearch("");
              }}
              className="rounded-2xl border border-[#8b5cf6]/40 bg-gradient-to-br from-[#1c1642] to-[#120f2d] p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:border-[#8b5cf6] hover:from-[#231b52]"
            >
              <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">
                Total
              </p>
              <p className="mt-2 truncate text-xl font-semibold text-white">
                All Students
              </p>
              <p className="mt-4 text-3xl font-bold text-[#8b5cf6]">
                {totalStudents ?? "…"}
                <span className="ml-2 text-sm font-medium text-[#a8a0d6]">
                  students
                </span>
              </p>
            </button> */}

            <button
              onClick={() => {
                setSelectedCourseId("ALL");
                setPlacedFilter("notplaced");
                setPage(1);
                setSearchDraft("");
                setAppliedSearch("");
              }}
              className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#0f2a22] to-[#120f2d] p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:border-emerald-400 hover:from-[#143a2e]"
            >
              <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">
                Active
              </p>
              <p className="mt-2 truncate text-xl font-semibold text-white">
                Active Students
              </p>
              <p className="mt-4 text-3xl font-bold text-emerald-400">
                {activeStudentsCount}
                <span className="ml-2 text-sm font-medium text-[#a8a0d6]">
                  not placed · enrolled
                </span>
              </p>
            </button>

            <div className="sm:col-span-2 xl:col-span-2">
              <ZoneStudentAnalytics />
            </div>

            <button
              onClick={() => {
                setSelectedCourseId("ALL");
                setPlacedFilter("placed");
                setPage(1);
                setSearchDraft("");
                setAppliedSearch("");
              }}
              className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#2a200f] to-[#120f2d] p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:border-amber-400 hover:from-[#3a2c14]"
            >
              <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">
                Placed
              </p>
              <p className="mt-2 truncate text-xl font-semibold text-white">
                Placed Students
              </p>
              <p className="mt-4 text-3xl font-bold text-amber-400">
                {placedStudentsCount}
                <span className="ml-2 text-sm font-medium text-[#a8a0d6]">
                  placed
                </span>
              </p>
            </button>
            {courses.map((c, idx) => {
              const theme = courseThemes[idx % courseThemes.length];
              const count = activeStudentsBase.filter(
                (s) =>
                  Array.isArray(s.purchasedCourses) &&
                  s.purchasedCourses.some(
                    (p) => String(p) === String(c._id)
                  )
              ).length;
              const isSelected = courseFilter === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => {
                    // setCourseFilter(isSelected ? "all" : c._id);
                    // setPage(1);
                    setSelectedCourseId(c._id);
                    setPlacedFilter("all");
                    setPage(1);
                    setSearchDraft("");
                    setAppliedSearch("");
                  }}

                  className={`rounded-2xl border ${theme.border} ${theme.hover} bg-gradient-to-br ${theme.grad} p-5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition ${isSelected ? "ring-2 ring-white/20" : ""
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${theme.badge} text-xs font-bold`}
                    >
                      {shortCourseName(c.title)}
                    </span>
                    <span className={`text-3xl font-bold ${theme.text}`}>
                      {count}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-lg font-semibold text-white">
                    {c.title || "Untitled Course"}
                  </p>
                  <p className="mt-1 text-xs text-[#a8a0d6]">
                    {isSelected ? "Filter applied · tap to clear" : "Tap to filter"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Chart ── */}
        {!selectedCourseId && (
          <div className="mb-6 rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Admissions by Month
                </h2>
                <p className="text-sm text-[#a8a0d6]">
                  Total students joined per month
                </p>
              </div>
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-2 text-white outline-none focus:border-[#8b5cf6]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#312a63" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#a8a0d6" />
                  <YAxis allowDecimals={false} stroke="#a8a0d6" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#120f2d",
                      border: "1px solid #312a63",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(139,92,246,0.1)" }}
                  />
                  <Bar
                    dataKey="admissions"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Drill-down (course or ALL) ── */}
        {selectedCourseId && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedCourseId("");
                  setSearchDraft("");
                  setAppliedSearch("");
                  setPage(1);
                  setPlacedFilter("all");
                }}
                className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640]"
              >
                ← Back to Courses
              </button>
              <p className="text-lg font-semibold text-white">
                {isAllView
                  ? placedFilter === "placed"
                    ? "Placed Students"
                    : placedFilter === "notplaced"
                      ? "Active Students"
                      : "All Enrolled Students"
                  : courses.find((c) => c._id === selectedCourseId)?.title ||
                  "Course"}
                <span className="ml-2 text-sm font-normal text-[#a8a0d6]">
                  (
                  {isAllView
                    ? `${allViewTotal} students`
                    : `${courseCounts[selectedCourseId] ?? 0} students`}
                  )
                </span>
              </p>
            </div>

            {/* ── Zone counts ── */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-600/20 to-blue-900/10 p-5">
                <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">Blue Zone</p>
                <p className="mt-2 text-3xl font-bold text-blue-300">
                  {zoneCounts.blue}
                  <span className="ml-2 text-sm font-medium text-[#a8a0d6]">students</span>
                </p>
              </div>
              <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-600/20 to-yellow-900/10 p-5">
                <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">Yellow Zone</p>
                <p className="mt-2 text-3xl font-bold text-yellow-300">
                  {zoneCounts.yellow}
                  <span className="ml-2 text-sm font-medium text-[#a8a0d6]">students</span>
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/20 to-emerald-900/10 p-5">
                <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">Green Zone</p>
                <p className="mt-2 text-3xl font-bold text-emerald-300">
                  {zoneCounts.green}
                  <span className="ml-2 text-sm font-medium text-[#a8a0d6]">students</span>
                </p>
              </div>
            </div>

            {/* ── Search / Filter bar ── */}
            <div className="mb-6 rounded-2xl border border-[#312a63] bg-[#120f2d] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
                <div ref={searchBoxRef} className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#9a92c9]" />
                  <input
                    type="text"
                    value={searchDraft}
                    onChange={(e) => {
                      setSearchDraft(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (searchSuggestions.length > 0)
                        setShowSuggestions(true);
                    }}
                    placeholder="Search by student name or email..."
                    className="w-full rounded-xl border border-[#312a63] bg-[#0f0b24] py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-[#8f87bf] focus:border-[#8b5cf6]"
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setShowSuggestions(true);
                        setActiveSuggestionIndex((prev) =>
                          prev < searchSuggestions.length - 1 ? prev + 1 : prev
                        );
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveSuggestionIndex((prev) =>
                          prev > 0 ? prev - 1 : 0
                        );
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (
                          showSuggestions &&
                          activeSuggestionIndex >= 0 &&
                          searchSuggestions[activeSuggestionIndex]
                        ) {
                          handleSuggestionClick(
                            searchSuggestions[activeSuggestionIndex]
                          );
                        } else {
                          handleApplySearch(searchDraft);
                        }
                      }
                      if (e.key === "Escape") setShowSuggestions(false);
                    }}
                  />

                  {showSuggestions &&
                    (searchDraft.trim() || suggestionLoading) && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#312a63] bg-[#120f2d] shadow-2xl">
                        {suggestionLoading ? (
                          <div className="px-4 py-3 text-sm text-[#a8a0d6]">
                            Searching...
                          </div>
                        ) : searchSuggestions.length > 0 ? (
                          <ul className="max-h-80 overflow-y-auto py-2">
                            {searchSuggestions.map((student, index) => (
                              <li key={student._id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSuggestionClick(student)
                                  }
                                  className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${activeSuggestionIndex === index
                                      ? "bg-[#1c1642] text-white"
                                      : "hover:bg-[#1c1642] hover:text-white"
                                    }`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-white">
                                      {student.fullName || "Unnamed Student"}
                                    </p>
                                    <p className="truncate text-sm text-[#a8a0d6]">
                                      {student.email || "No email"}
                                    </p>
                                  </div>
                                  <span className="ml-3 shrink-0 text-xs text-[#9a92c9]">
                                    Select
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="px-4 py-3 text-sm text-[#a8a0d6]">
                            No suggestions found
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <div className="flex gap-3">
                  {isActiveView && (
                    <>
                      <select
                        value={zoneFilter}
                        onChange={(e) => {
                          setZoneFilter(e.target.value);
                          setPage(1);
                        }}
                        className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                      >
                        <option value="all">All Zones</option>
                        <option value="blue">Blue</option>
                        <option value="yellow">Yellow</option>
                        <option value="green">Green</option>
                      </select>
                      <select
                        value={courseFilter}
                        onChange={(e) => {
                          setCourseFilter(e.target.value);
                          setPage(1);
                        }}
                        className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                      >
                        <option value="all">All Courses</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.title || "Untitled Course"}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {isAllView && !isActiveView && (
                    <select
                      value={placedFilter}
                      onChange={(e) => {
                        setPlacedFilter(
                          e.target.value as "all" | "placed" | "notplaced"
                        );
                        setPage(1);
                      }}
                      className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                    >
                      <option value="all">All Enrolled</option>
                      <option value="placed">Placed</option>
                    </select>
                  )}

                  {!isAllView && (
                    <select
                      value={placedFilter}
                      onChange={(e) =>
                        setPlacedFilter(
                          e.target.value as "all" | "placed" | "notplaced"
                        )
                      }
                      className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                    >
                      <option value="all">All Placement</option>
                      <option value="placed">Placed</option>
                      <option value="notplaced">Not Placed</option>
                    </select>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={placementUnlocked}
                      onChange={(e) => setPlacementUnlocked(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-[#8b5cf6]"
                    />
                    Allow placement edit
                  </label>

                  <button
                    onClick={() => handleApplySearch(searchDraft)}
                    className="rounded-xl bg-[#8b5cf6] px-5 py-3 font-medium text-white transition hover:bg-[#7c3aed]"
                  >
                    Search
                  </button>

                  <button
                    onClick={() => {
                      setSearchDraft("");
                      setAppliedSearch("");
                      setSearchSuggestions([]);
                      setShowSuggestions(false);
                      setActiveSuggestionIndex(-1);
                      setZoneFilter("all");
                      setCourseFilter("all");
                      setPage(1);
                    }}
                    className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-5 py-3 font-medium text-white transition hover:bg-[#1b1640]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* ── Loading for ALL view ── */}
            {isAllView && allEnrolledLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#8b5cf6]" />
                  <p className="mt-4 text-[#a8a0d6]">Loading students...</p>
                </div>
              </div>
            )}

            {/* ── Table ── */}
            {!(isAllView && allEnrolledLoading) && (
              <div className="overflow-hidden rounded-2xl border border-[#312a63] bg-[#120f2d] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead className="border-b border-[#312a63] bg-[#151033]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Student
                        </th>
                        {/* <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Batch
                        </th> */}
                        {/* <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Fee Plan
                        </th> */}
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Zone
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Joined
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Placement
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#312a63]">
                      {displayStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-14 text-center text-[#a8a0d6]"
                          >
                            No students found
                          </td>
                        </tr>
                      ) : (
                        displayStudents.map((student) => {
                          const batchCode = student.batchHistory?.length
                            ? student.batchHistory[
                              student.batchHistory.length - 1
                            ]?.to
                            : "—";
                          return (
                            <tr
                              key={student._id}
                              className="transition-colors hover:bg-[#1a1538]"
                            >
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#8b5cf6]/15 ring-1 ring-[#8b5cf6]/30">
                                    {student.avatar ? (
                                      <img
                                        src={student.avatar}
                                        alt={student.fullName}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="font-semibold text-white">
                                        {student.fullName
                                          ?.charAt(0)
                                          ?.toUpperCase() || "S"}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">
                                      {student.fullName || "Unnamed Student"}
                                    </p>
                                    <p className="text-sm text-[#a8a0d6]">
                                      {student.email || "No email"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* <td className="px-6 py-5 text-white">
                                {batchCode || "—"}
                              </td> */}

                              {/* <td className="px-6 py-5">
                                <span
                                  className={`${pill} ${feeBadge(
                                    student.feePlan
                                  )}`}
                                >
                                  {student.feePlan || "N/A"}
                                </span>
                              </td> */}

                              <td className="px-6 py-5">
                                <span
                                  className={`${pill} ${zoneBadge(
                                    student.zone
                                  )}`}
                                >
                                  {student.zone || "N/A"}
                                </span>
                              </td>

                              <td className="px-6 py-5 text-[#a8a0d6]">
                                {safeDate(student.joinedMonth)}
                              </td>

                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`${pill} ${student.isPlaced
                                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                                        : "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30"
                                      }`}
                                  >
                                    {student.isPlaced
                                      ? "Placed"
                                      : "Not Placed"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      togglePlacement(
                                        student._id,
                                        !student.isPlaced
                                      )
                                    }
                                    disabled={
                                      !placementUnlocked ||
                                      placementUpdatingId === student._id
                                    }
                                    title={
                                      !placementUnlocked
                                        ? "Tick 'Allow placement edit' to enable"
                                        : ""
                                    }
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${student.isPlaced
                                        ? "bg-rose-600 hover:bg-rose-700"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                      }`}
                                  >
                                    {placementUpdatingId === student._id
                                      ? "..."
                                      : student.isPlaced
                                        ? "Unmark"
                                        : "Mark Placed"}
                                  </button>
                                </div>
                              </td>

                              <td className="px-6 py-5">
                                <button
                                  onClick={() =>
                                    handleViewStudent(student.clerkId)
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7c3aed]"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ── */}
                <div className="flex flex-col gap-4 border-t border-[#312a63] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-sm text-[#a8a0d6]">
                    Showing{" "}
                    <span className="font-semibold text-white">
                      {displayTotal === 0 ? 0 : (page - 1) * limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-white">
                      {Math.min(page * limit, displayTotal)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-white">
                      {displayTotal}
                    </span>{" "}
                    students
                  </div>

                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-3 py-2 text-white outline-none focus:border-[#8b5cf6]"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-white transition hover:bg-[#1b1640] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>

                      {getPageNumbers().map((pageNumber) => (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`h-10 min-w-10 rounded-lg px-3 text-sm font-medium transition ${page === pageNumber
                              ? "bg-[#8b5cf6] text-white"
                              : "border border-[#312a63] bg-[#0f0b24] text-white hover:bg-[#1b1640]"
                            }`}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === displayTotalPages}
                        className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-4 py-2 text-white transition hover:bg-[#1b1640] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}        
      </div>
    </div>
  );
};

export default StudentsListPage;