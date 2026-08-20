"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  CirclePause,
  Mail,
  Moon,
  RefreshCw,
  Search,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import styles from "./Student360Overview.module.css";

gsap.registerPlugin(useGSAP);

interface Student {
  _id: string;
  clerkId?: string;
  fullName?: string;
  email?: string;
  isPlaced?: boolean;
  isPaused?: boolean;
  isRealUser?: boolean;
  zone?: string;
  purchasedCourses?: unknown[];
}

const API_LMS_URL = process.env.NEXT_PUBLIC_LMS_URL;
const API_KEY = process.env.NEXT_PUBLIC_STUDENT_INFO_API_KEY || "";
const SUGGESTION_LIMIT = 8;

const isCourseId = (course: unknown) => {
  if (typeof course === "string") return course.trim().length > 0;
  if (course && typeof course === "object" && "_id" in course) {
    return String((course as { _id?: unknown })._id ?? "").trim().length > 0;
  }
  return false;
};

const isEnrolled = (student: Student) =>
  Array.isArray(student.purchasedCourses) &&
  student.purchasedCourses.some(isCourseId);

const studentInitials = (student: Student) => {
  const source = student.fullName?.trim() || student.email?.trim() || "Student";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const studentStatus = (student: Student) => {
  if (student.isPlaced === true) return "Placed";
  if (student.isPaused === true) return "Paused";
  return "Active";
};

const studentStatusTone = (student: Student) => {
  if (student.isPlaced === true) return styles.statusPlaced;
  if (student.isPaused === true) return styles.statusPaused;
  return styles.statusActive;
};

const zoneLabel = (zone?: string) => {
  if (!zone) return "Zone not assigned";
  return zone
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function Student360Overview() {
  const containerRef = useRef<HTMLElement>(null);
  const searchRegionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const loadDashboard = useCallback(async (signal: AbortSignal) => {
    if (!API_LMS_URL) {
      throw new Error("NEXT_PUBLIC_LMS_URL is not configured.");
    }

    const response = await fetch(
      `${API_LMS_URL}/api/users/active-placement-students?status=all&includeWithoutCourse=true`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        cache: "no-store",
        signal,
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message || "Could not load students.");
    }

    setStudents(
      Array.isArray(payload?.students)
        ? (payload.students as Student[]).filter(
            (student) => student.isRealUser !== true,
          )
        : [],
    );
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    loadDashboard(controller.signal)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the dashboard.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadDashboard, refreshKey]);

  const searchableStudents = students;

  const dashboardStats = useMemo(() => {
    const active = students.filter(
      (student) =>
        isEnrolled(student) &&
        student.isPlaced !== true &&
        student.isPaused !== true,
    ).length;
    const paused = students.filter(
      (student) =>
        isEnrolled(student) &&
        student.isPlaced !== true &&
        student.isPaused === true,
    ).length;
    const placed = students.filter(
      (student) => student.isPlaced === true,
    ).length;

    return { active, paused, placed };
  }, [students]);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return searchableStudents
      .filter((student) => {
        const name = student.fullName?.toLowerCase() || "";
        const email = student.email?.toLowerCase() || "";
        return name.includes(normalizedQuery) || email.includes(normalizedQuery);
      })
      .sort((first, second) => {
        const firstName = first.fullName?.toLowerCase() || "";
        const secondName = second.fullName?.toLowerCase() || "";
        const firstStartsWith = firstName.startsWith(normalizedQuery) ? 1 : 0;
        const secondStartsWith = secondName.startsWith(normalizedQuery) ? 1 : 0;

        if (firstStartsWith !== secondStartsWith) {
          return secondStartsWith - firstStartsWith;
        }
        return firstName.localeCompare(secondName);
      })
      .slice(0, SUGGESTION_LIMIT);
  }, [searchableStudents, query]);

  const showSuggestions = isSearchFocused && query.trim().length > 0;

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [query]);

  useGSAP(
    () => {
      if (loading || error) return;

      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const timeline = gsap.timeline({
            defaults: { duration: 0.48, ease: "power3.out" },
          });

          timeline
            .from(".student360-hero", {
              autoAlpha: 0,
              y: 14,
              clearProps: "transform,opacity,visibility",
            })
            .from(".student360-search-panel", {
              autoAlpha: 0,
              y: 18,
              duration: 0.52,
              clearProps: "transform,opacity,visibility",
            }, "-=0.22")
            .from(".student360-section-heading", {
              autoAlpha: 0,
              y: 10,
              duration: 0.34,
              clearProps: "transform,opacity,visibility",
            }, "-=0.18")
            .from(".student360-kpi", {
              autoAlpha: 0,
              y: 14,
              stagger: 0.065,
              clearProps: "transform,opacity,visibility",
            }, "-=0.16");
        },
      );

      return () => media.revert();
    },
    {
      scope: containerRef,
      dependencies: [loading, error, refreshKey],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      if (!showSuggestions || suggestions.length === 0) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".student360-suggestion", {
          autoAlpha: 0,
          y: 6,
          duration: 0.22,
          stagger: 0.025,
          ease: "power1.out",
          clearProps: "transform,opacity,visibility",
        });
      });

      return () => media.revert();
    },
    {
      scope: searchRegionRef,
      dependencies: [showSuggestions, suggestions.length, query],
      revertOnUpdate: true,
    },
  );

  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    setQuery(student.fullName?.trim() || student.email?.trim() || "");
    setIsSearchFocused(false);
    inputRef.current?.blur();
    router.push(`/student_360/${encodeURIComponent(student._id)}`);
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedStudent(null);
    setActiveSuggestionIndex(0);
    inputRef.current?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveSuggestionIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }

    if (event.key === "Enter" && suggestions.length > 0) {
      event.preventDefault();
      selectStudent(suggestions[activeSuggestionIndex] || suggestions[0]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsSearchFocused(false);
    }
  };

  const statusCards = [
    {
      label: "Total active students",
      value: dashboardStats.active,
      description: "Enrolled and currently active",
      icon: UsersRound,
    },
    {
      label: "Placed students",
      value: dashboardStats.placed,
      description: "Successfully placed students",
      icon: BadgeCheck,
    },
    {
      label: "Paused students",
      value: dashboardStats.paused,
      description: "On pause and excluded from activity",
      icon: CirclePause,
    },
  ];
  const visibleStatusCards = loading
    ? Array.from({ length: 3 }, () => null)
    : statusCards;

  return (
    <main
      ref={containerRef}
      className={`${styles.page} min-h-screen px-4 py-5 sm:px-6 sm:py-7 lg:px-8`}
    >
      <span className={styles.ambientOrbOne} aria-hidden="true" />
      <span className={styles.ambientOrbTwo} aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <header className={`student360-hero ${styles.heroPanel} mb-8 flex flex-col gap-6 rounded-[1.75rem] p-5 [will-change:transform,opacity] sm:p-7 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <div
              className={`${styles.workspaceBadge} mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]`}
            >
              <span className={styles.statusDot} aria-hidden="true" />
              Manager workspace
            </div>
            <h1 className={`${styles.heroTitle} text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-[2.8rem]`}>
              IJF Students 360
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--s360-text-secondary)] sm:text-base">
              One reliable workspace for student identity, fees, interviews, and academic performance.
            </p>
            {!loading && !error ? (
              <p
                className="mt-2 text-xs font-medium text-[var(--s360-text-muted)]"
                aria-live="polite"
              >
                {searchableStudents.length.toLocaleString("en-IN")} students available
                {lastUpdated ? (
                  <>
                    {" | Updated "}
                    {lastUpdated.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className={`${styles.heroActions} flex items-center gap-2 self-start lg:self-auto`}>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className={`${styles.glassControl} inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className={`${styles.glassControl} inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none`}
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          </div>
        </header>

        {error ? (
          <section role="alert" className={`${styles.errorGlass} rounded-2xl p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">Student data could not be loaded</h2>
                  <p className="mt-1 text-sm text-[var(--s360-text-secondary)]">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="min-h-11 cursor-pointer rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--s360-bg)]"
              >
                Try again
              </button>
            </div>
          </section>
        ) : (
          <div className={styles.dashboardFlow} aria-busy={loading} aria-live="polite">
            <section className={styles.statusSection} aria-labelledby="student-status-heading">
              <div className="student360-section-heading mb-4 [will-change:transform,opacity]">
                <p className={styles.eyebrow}>Student status</p>
                <h2
                  id="student-status-heading"
                  className="mt-1 text-xl font-semibold tracking-tight"
                >
                  Enrollment snapshot
                </h2>
              </div>

              <div className={`${styles.kpiGrid} grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`}>
                {visibleStatusCards.map((card, index) => {
                  if (!card) {
                    return (
                      <div
                        key={`status-skeleton-${index}`}
                        className={`${styles.glassCard} h-[168px] animate-pulse rounded-2xl p-5 motion-reduce:animate-none`}
                      >
                        <div className="flex justify-between">
                          <div className={`${styles.skeletonBar} h-3 w-32 rounded`} />
                          <div className={`${styles.skeletonBar} h-11 w-11 rounded-xl`} />
                        </div>
                        <div className={`${styles.skeletonBar} mt-7 h-9 w-20 rounded`} />
                        <div className={`${styles.skeletonBar} mt-3 h-3 w-44 rounded`} />
                      </div>
                    );
                  }

                  const Icon = card.icon;
                  return (
                    <article
                      key={card.label}
                      className={`student360-kpi ${styles.glassCard} ${styles.kpiCard} rounded-2xl p-5 [will-change:transform,opacity]`}
                    >
                      <span className={styles.kpiAccent} aria-hidden="true" />
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--s360-text-secondary)]">
                          {card.label}
                        </p>
                        <span
                          className={`${styles.iconWell} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>
                      <p className="mt-4 text-4xl font-bold tracking-[-0.04em] tabular-nums">
                        {card.value.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-2 text-sm text-[var(--s360-text-secondary)]">
                        {card.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              className={`student360-search-panel ${styles.searchStage} mt-10 rounded-[1.75rem] p-5 [will-change:transform,opacity] sm:p-7 lg:p-9`}
              aria-labelledby="student-search-heading"
            >
              <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:gap-10">
                <div className={styles.searchCopy}>
                  <p className={styles.eyebrow}>Student lookup</p>
                  <h2
                    id="student-search-heading"
                    className="mt-2 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl"
                  >
                    Find the complete student story
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--s360-text-secondary)] sm:text-base">
                    Search by name or email, then move directly into an individual 360-degree record.
                  </p>
                  <div className={styles.searchSignals} aria-label="Available profile information">
                    <span>Identity</span>
                    <span>Fees</span>
                    <span>Interviews</span>
                    <span>Academics</span>
                  </div>
                </div>

                <div
                  ref={searchRegionRef}
                  className="relative"
                  onFocusCapture={() => setIsSearchFocused(true)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setIsSearchFocused(false);
                    }
                  }}
                >
                <div
                  className={`${styles.searchShell} ${isSearchFocused ? styles.searchShellFocused : ""} flex items-center rounded-2xl`}
                >
                  <Search
                    className={`${styles.searchIcon} ml-5 h-5 w-5 shrink-0`}
                    aria-hidden="true"
                  />
                  <label htmlFor="student-360-search" className="sr-only">
                    Search students by name or email
                  </label>
                  <input
                    ref={inputRef}
                    id="student-360-search"
                    type="search"
                    role="combobox"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls="student-360-suggestions"
                    aria-activedescendant={
                      showSuggestions && suggestions[activeSuggestionIndex]
                        ? `student-suggestion-${suggestions[activeSuggestionIndex]._id}`
                        : undefined
                    }
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedStudent(null);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Start typing a student name or email..."
                    className={`${styles.searchInput} min-h-16 min-w-0 flex-1 bg-transparent px-4 text-base outline-none sm:text-lg`}
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label="Clear student search"
                      className={`${styles.clearButton} mr-3 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline-none`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {showSuggestions ? (
                  <div
                    id="student-360-suggestions"
                    role="listbox"
                    aria-label="Matching students"
                    className={`${styles.suggestionList} absolute inset-x-0 top-[calc(100%+0.65rem)] z-30 max-h-[28rem] overflow-y-auto rounded-2xl p-2`}
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((student, index) => {
                        const isActive = index === activeSuggestionIndex;
                        return (
                          <button
                            key={student._id}
                            id={`student-suggestion-${student._id}`}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseEnter={() => setActiveSuggestionIndex(index)}
                            onClick={() => selectStudent(student)}
                            className={`student360-suggestion ${styles.suggestionItem} ${
                              isActive ? styles.suggestionItemActive : ""
                            } flex min-h-[4.75rem] w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left [will-change:transform,opacity] focus-visible:outline-none`}
                          >
                            <span
                              className={`${styles.studentAvatar} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold`}
                              aria-hidden="true"
                            >
                              {studentInitials(student)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold sm:text-base">
                                {student.fullName || "Unnamed student"}
                              </span>
                              <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--s360-text-secondary)] sm:text-sm">
                                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className="truncate">{student.email || "Email unavailable"}</span>
                              </span>
                            </span>
                            <span className="hidden shrink-0 text-right sm:block">
                              <span className={`${styles.statusBadge} ${studentStatusTone(student)} inline-flex rounded-full px-2.5 py-1 text-xs font-semibold`}>
                                {studentStatus(student)}
                              </span>
                              <span className="mt-1.5 block text-xs text-[var(--s360-text-muted)]">
                                {zoneLabel(student.zone)}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-5 py-8 text-center" role="status">
                        <UserRound
                          className="mx-auto h-6 w-6 text-[var(--s360-text-muted)]"
                          aria-hidden="true"
                        />
                        <p className="mt-3 text-sm font-semibold">No student found</p>
                        <p className="mt-1 text-xs text-[var(--s360-text-secondary)] sm:text-sm">
                          Check the spelling or try the student&apos;s email address.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {selectedStudent ? (
                  <p className="mt-3 text-center text-sm text-[var(--s360-text-secondary)]" aria-live="polite">
                    <span className={styles.selectedIndicator} aria-hidden="true" />
                    {selectedStudent.fullName || selectedStudent.email} selected
                  </p>
                ) : (
                  <p className="mt-3 text-center text-xs text-[var(--s360-text-muted)] sm:text-sm">
                    Use the arrow keys to navigate suggestions and Enter to select.
                  </p>
                )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
