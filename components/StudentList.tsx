"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Eye,
  GraduationCap,
  BarChart3,
  Layers,
  ChevronDown,
  Users,
  UserPlus,
  TrendingUp,
  BadgeCheck,
  PauseCircle,
  Phone,
} from "lucide-react";
import ZoneStudentAnalytics from "./ZoneStudentAnalytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  isPaused?: boolean;
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

// One hue per course, reused everywhere that course appears (tiles, matrix,
// chips). Validated for CVD separation + contrast on the dark surface.
const COURSE_COLORS = ["#199e70", "#d95926", "#d55181", "#e66767"];


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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({});
  const skipNextSuggestionRef = useRef(false);
  const [chartData, setChartData] = useState<
    { month: string; admissions: number }[]
  >([]);
  const [availableYears, setAvailableYears] = useState<number[]>([
    new Date().getFullYear(),
  ]);
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
  const [pauseUpdatingId, setPauseUpdatingId] = useState<string | null>(null);
  const [placedFilter, setPlacedFilter] = useState<"all" | "placed" | "notplaced" | "paused">("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [placementUnlocked, setPlacementUnlocked] = useState(false);

  // Whether we are in the "ALL students" drill-down view (any of the 3 top cards)
  const isAllView = selectedCourseId === "ALL";
  // Active students view = ALL view filtered to not-placed (entered via "Active Students" card)
  const isActiveView = isAllView && placedFilter === "notplaced";
  // Pause is a separate feature: its column shows only in the All Enrolled
  // and Paused views, never in the active/course/placed lists.
  const showPauseColumn =
    isAllView && (placedFilter === "all" || placedFilter === "paused");

  // ────────────────────────────────────────────
  // Derived counts from the single enrolled fetch
  // ────────────────────────────────────────────
  // Paused students are excluded here so every "active" surface (cards,
  // course tiles, drill-downs) shows only truly active students; they get
  // their own card + drill-down instead.
  const activeStudentsBase = useMemo(
    () =>
      allEnrolledStudents.filter(
        (s) =>
          s.isRealUser !== true &&
          s.isPlaced !== true &&
          s.isPaused !== true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      ),
    [allEnrolledStudents]
  );

  const activeStudentsCount = activeStudentsBase.length;

  const pausedStudentsCount = useMemo(
    () =>
      allEnrolledStudents.filter(
        (s) =>
          s.isRealUser !== true &&
          s.isPlaced !== true &&
          s.isPaused === true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      ).length,
    [allEnrolledStudents]
  );

  const placedStudentsCount = useMemo(
    () =>
      allEnrolledStudents.filter(
        (s) => s.isRealUser !== true && s.isPlaced === true
      ).length,
    [allEnrolledStudents]
  );

  // Students of the selected course, derived from the same source the course
  // tiles use so the drill-down always matches the tile count. Derived (not
  // state) so zone counts are correct on first render after a course click.
  const courseStudents = useMemo(() => {
    if (!selectedCourseId || selectedCourseId === "ALL") return [];
    return activeStudentsBase.filter(
      (s) =>
        Array.isArray(s.purchasedCourses) &&
        s.purchasedCourses.some((p) => String(p) === String(selectedCourseId))
    );
  }, [selectedCourseId, activeStudentsBase]);

  const newlyEnrolledCount = useMemo(
    () =>
      activeStudentsBase.filter(
        (s) => (s.zone || "").toLowerCase() === "newly_enrolled"
      ).length,
    [activeStudentsBase]
  );

  const totalEnrolled = activeStudentsCount + placedStudentsCount;
  const placementRate =
    totalEnrolled > 0
      ? `${((placedStudentsCount / totalEnrolled) * 100).toFixed(1)}%`
      : "—";

  // Only elapsed months for the current year; the current month renders as
  // month-to-date so a partial number doesn't read as a collapse.
  const isCurrentChartYear = chartYear === new Date().getFullYear();
  const visibleChartData = useMemo(() => {
    if (!isCurrentChartYear) return chartData;
    return chartData.slice(0, new Date().getMonth() + 1);
  }, [chartData, isCurrentChartYear]);
  const chartYearTotal = useMemo(
    () => visibleChartData.reduce((sum, m) => sum + (m.admissions || 0), 0),
    [visibleChartData]
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
          s.isPaused !== true &&
          Array.isArray(s.purchasedCourses) &&
          s.purchasedCourses.length > 0
      );
    } else if (placedFilter === "paused") {
      list = list.filter(
        (s) =>
          s.isPlaced !== true &&
          s.isPaused === true &&
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
    const counts = { blue: 0, yellow: 0, green: 0, newlyEnrolled: 0 };
    source.forEach((s) => {
      const z = (s.zone || "").toLowerCase();
      if (z === "blue") counts.blue += 1;
      else if (z === "yellow") counts.yellow += 1;
      else if (z === "green") counts.green += 1;
      else if (z === "newly_enrolled") counts.newlyEnrolled += 1;
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
      setAllEnrolledStudents(updater);
    } catch (err) {
      console.error("togglePlacement error:", err);
    } finally {
      setPlacementUpdatingId(null);
    }
  };

  const togglePause = async (studentId: string, next: boolean) => {
    try {
      setPauseUpdatingId(studentId);
      const res = await fetch(
        `${API_LMS_URL}/api/users/student-pause-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: studentId, isPaused: next }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Update failed");

      const updater = (prev: Student[]) =>
        prev.map((s) => (s._id === studentId ? { ...s, isPaused: next } : s));

      setStudents(updater);
      setAllEnrolledStudents(updater);
    } catch (err) {
      console.error("togglePause error:", err);
    } finally {
      setPauseUpdatingId(null);
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
        let filtered = courseStudents;
        if (appliedSearch.trim()) {
          const q = appliedSearch.trim().toLowerCase();
          filtered = courseStudents.filter(
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
              (s) =>
                s.isPlaced !== true &&
                s.isPaused !== true &&
                s.isRealUser !== true
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
          if (s.placedFilter === "all" || s.placedFilter === "placed" || s.placedFilter === "notplaced" || s.placedFilter === "paused") setPlacedFilter(s.placedFilter);
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
  }, []);

  // Admissions-by-month chart — aggregated server-side by createdAt (IST).
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `${API_LMS_URL}/api/student-info/admissions-by-month?year=${chartYear}`,
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
          setChartData(Array.isArray(j.data) ? j.data : []);
          if (Array.isArray(j.years) && j.years.length) {
            setAvailableYears(j.years);
          }
        }
      } catch (e) {
        console.error("admissions chart fetch error:", e);
      }
    })();
  }, [chartYear]);

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
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Students Overview
            </h1>
            <p className="mt-1 text-sm text-[#a8a0d6]">
              {totalEnrolled > 0
                ? `${totalEnrolled + pausedStudentsCount} students · ${activeStudentsCount} active · ${pausedStudentsCount} paused · ${placedStudentsCount} placed`
                : "View all students, search them, and open complete details"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/batch-section"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#312a63] bg-[#0f0b24] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640]"
            >
              <Layers className="h-4 w-4" />
              Batch Section
            </Link>

            <details className="relative shrink-0">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[#312a63] bg-[#0f0b24] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#1b1640] [&::-webkit-details-marker]:hidden">
                More
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 rounded-xl border border-[#312a63] bg-[#120f2d] p-1.5 shadow-2xl">
                <button
                  onClick={() => { router.push('/students-call-reports') }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#1b1640]"
                >
                  <Phone className="h-4 w-4 text-[#9a92c9]" />
                  Call Recording Analysis Dashboard
                </button>
                <Link
                  href="/academic-results"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#1b1640]"
                >
                  <GraduationCap className="h-4 w-4 text-[#9a92c9]" />
                  Academic Results
                </Link>
                <Link
                  href="/communication-analytics"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#1b1640]"
                >
                  <BarChart3 className="h-4 w-4 text-[#9a92c9]" />
                  Communication Analytics
                </Link>

                 <Link
                  href="/resume-builder"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#1b1640]"
                >
                  <GraduationCap className="h-4 w-4 text-[#9a92c9]" />
                  C.V. Builder
                </Link>
              </div>
            </details>

            <button
              onClick={() => { router.push('/batch-section/students-zone-update') }}
              className="shrink-0 rounded-lg bg-[#8b5cf6] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
            >
              Update Students Zone
            </button>
          </div>
        </div>

        {/* ── KPI tiles ── */}
        {!selectedCourseId && (
          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
            <button
              onClick={() => {
                setSelectedCourseId("ALL");
                setPlacedFilter("notplaced");
                setPage(1);
                setSearchDraft("");
                setAppliedSearch("");
              }}
              className="rounded-xl border border-[#312a63] bg-[#120f2d] p-4 text-left transition hover:border-[#8b5cf6]/70 hover:bg-[#1b1640]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9a92c9]">
                  Active students
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/15 text-[#8b5cf6]">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-3xl font-bold text-white">
                {activeStudentsCount}
              </p>
              <p className="mt-1 text-xs text-[#a8a0d6]">not placed · enrolled</p>
            </button>

            <button
              onClick={() => {
                setSelectedCourseId("ALL");
                setPlacedFilter("paused");
                setPage(1);
                setSearchDraft("");
                setAppliedSearch("");
              }}
              className="rounded-xl border border-[#312a63] bg-[#120f2d] p-4 text-left transition hover:border-amber-500/60 hover:bg-[#1b1640]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9a92c9]">
                  Paused students
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <PauseCircle className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-3xl font-bold text-white">
                {pausedStudentsCount}
              </p>
              <p className="mt-1 text-xs text-[#a8a0d6]">on break · not active</p>
            </button>

            <button
              onClick={() => {
                setSelectedCourseId("ALL");
                setPlacedFilter("placed");
                setPage(1);
                setSearchDraft("");
                setAppliedSearch("");
              }}
              className="rounded-xl border border-[#312a63] bg-[#120f2d] p-4 text-left transition hover:border-[#8b5cf6]/70 hover:bg-[#1b1640]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9a92c9]">
                  Placed students
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/15 text-[#8b5cf6]">
                  <BadgeCheck className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-3xl font-bold text-white">
                {placedStudentsCount}
              </p>
              <p className="mt-1 text-xs text-[#a8a0d6]">all-time placements</p>
            </button>

            <div className="rounded-xl border border-[#312a63] bg-[#120f2d] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9a92c9]">
                  Placement rate
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/15 text-[#8b5cf6]">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-3xl font-bold text-white">{placementRate}</p>
              <p className="mt-1 text-xs text-[#a8a0d6]">
                {placedStudentsCount} of {totalEnrolled} students
              </p>
            </div>

            <div className="rounded-xl border border-[#312a63] bg-[#120f2d] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9a92c9]">
                  Newly enrolled
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/15 text-[#8b5cf6]">
                  <UserPlus className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 text-3xl font-bold text-white">
                {newlyEnrolledCount}
              </p>
              <p className="mt-1 text-xs text-[#a8a0d6]">awaiting zone assignment</p>
            </div>
          </div>
        )}

        {/* ── Course tiles ── */}
        {!selectedCourseId && (
          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {courses.map((c, idx) => {
              const color = COURSE_COLORS[idx % COURSE_COLORS.length];
              const count = activeStudentsBase.filter(
                (s) =>
                  Array.isArray(s.purchasedCourses) &&
                  s.purchasedCourses.some(
                    (p) => String(p) === String(c._id)
                  )
              ).length;
              const share =
                activeStudentsCount > 0
                  ? Math.round((count / activeStudentsCount) * 100)
                  : 0;
              return (
                <button
                  key={c._id}
                  onClick={() => {
                    setSelectedCourseId(c._id);
                    setPlacedFilter("all");
                    setPage(1);
                    setSearchDraft("");
                    setAppliedSearch("");
                  }}
                  className="rounded-xl border bg-[#120f2d] p-4 text-left transition hover:bg-[#1b1640]"
                  style={{ borderColor: `${color}4d` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="rounded-md px-2 py-1 text-[11px] font-bold tracking-wide"
                      style={{ color, backgroundColor: `${color}24` }}
                    >
                      {shortCourseName(c.title)}
                    </span>
                    <span className="text-2xl font-bold text-white">{count}</span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-white">
                    {c.title || "Untitled Course"}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${share}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#a8a0d6]">
                    {count === 0
                      ? "no active students"
                      : `${share}% of active students`}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Zone matrix + chart ── */}
        {!selectedCourseId && (
          <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ZoneStudentAnalytics />
            </div>

            <div className="flex h-full flex-col rounded-xl border border-[#312a63] bg-[#120f2d] p-5 lg:col-span-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Admissions by month
                  </h2>
                  <p className="mt-0.5 text-xs text-[#a8a0d6]">
                    {chartYearTotal} students joined in {chartYear}
                  </p>
                </div>
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                  className="rounded-lg border border-[#312a63] bg-[#0f0b24] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#8b5cf6]"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-h-56 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visibleChartData} barCategoryGap="28%">
                    <CartesianGrid
                      stroke="#312a63"
                      strokeOpacity={0.6}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#9a92c9"
                      tickLine={false}
                      axisLine={{ stroke: "#312a63" }}
                      fontSize={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#9a92c9"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={30}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} joined`, null]}
                      contentStyle={{
                        backgroundColor: "#120f2d",
                        border: "1px solid #312a63",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      cursor={{ fill: "rgba(139,92,246,0.08)" }}
                    />
                    <Bar dataKey="admissions" radius={[4, 4, 0, 0]} maxBarSize={34}>
                      {visibleChartData.map((entry, i) => (
                        <Cell
                          key={`${entry.month}-${i}`}
                          fill="#8b5cf6"
                          fillOpacity={
                            isCurrentChartYear && i === visibleChartData.length - 1
                              ? 0.45
                              : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {isCurrentChartYear && (
                <p className="mt-2 text-[11px] text-[#9a92c9]">
                  Current month is month-to-date. Remaining months appear as the
                  year progresses.
                </p>
              )}
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
                      : placedFilter === "paused"
                        ? "Paused Students"
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
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/20 to-violet-900/10 p-5">
                <p className="text-sm font-medium uppercase tracking-wider text-[#9a92c9]">Newly Enrolled</p>
                <p className="mt-2 text-3xl font-bold text-violet-300">
                  {zoneCounts.newlyEnrolled}
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
                          e.target.value as "all" | "placed" | "paused"
                        );
                        setPage(1);
                      }}
                      className="rounded-xl border border-[#312a63] bg-[#0f0b24] px-4 py-3 text-white outline-none focus:border-[#8b5cf6]"
                    >
                      <option value="all">All Enrolled</option>
                      <option value="placed">Placed</option>
                      <option value="paused">Paused</option>
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
                    Allow status edits
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
                        {showPauseColumn && (
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                            Status
                          </th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#9a92c9]">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#312a63]">
                      {displayStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={showPauseColumn ? 7 : 6}
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
                                        ? "Tick 'Allow status edits' to enable"
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

                              {showPauseColumn && (
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`${pill} ${student.isPaused
                                          ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                                          : "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30"
                                        }`}
                                    >
                                      {student.isPaused ? "Paused" : "Active"}
                                    </span>
                                    <button
                                      onClick={() =>
                                        togglePause(
                                          student._id,
                                          !student.isPaused
                                        )
                                      }
                                      disabled={
                                        !placementUnlocked ||
                                        pauseUpdatingId === student._id
                                      }
                                      title={
                                        !placementUnlocked
                                          ? "Tick 'Allow status edits' to enable"
                                          : ""
                                      }
                                      className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${student.isPaused
                                          ? "bg-sky-600 hover:bg-sky-700"
                                          : "bg-amber-600 hover:bg-amber-700"
                                        }`}
                                    >
                                      {pauseUpdatingId === student._id
                                        ? "..."
                                        : student.isPaused
                                          ? "Resume"
                                          : "Pause"}
                                    </button>
                                  </div>
                                </td>
                              )}

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