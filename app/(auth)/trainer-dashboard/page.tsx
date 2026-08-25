"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Ban,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ListChecks,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import styles from "./TrainerDashboard.module.css";

gsap.registerPlugin(useGSAP);

interface StudentCourse {
  _id: string;
  title: string;
}

interface EligibleStudent {
  _id: string;
  fullName: string;
  email?: string;
  clerkId?: string;
  enrollmentId?: string;
  zone?: string;
  courses: StudentCourse[];
}

interface RosterSelection {
  student: EligibleStudent;
  courseId: string;
  assignedTeacher: string;
}

interface ManualMockSchedule {
  _id: string;
  dateKey: string;
  student: string;
  studentName: string;
  studentEmail?: string;
  enrollmentId?: string;
  course: string;
  courseTitle: string;
  assignedTeacher?: string;
  trainerName: string;
  status: "scheduled" | "completed" | "cancelled";
  feedback?: string;
  cancellationReason?: string;
  statusUpdatedByName?: string;
  statusUpdatedAt?: string;
}

interface ScheduleUpdateInput {
  status: "completed" | "cancelled";
  feedback?: string;
  cancellationReason?: string;
}

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isSunday: boolean;
  isToday: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MANUAL_MOCK_TEACHERS = [
  "Paridhi Tamrakar",
  "Shalini Rathore",
  "Poorva Rajput",
  "Harsha Wadekar",
  "Simran Soumya",
] as const;

const apiUrl = (path = "") => "/api/trainer/manual-mocks" + path;

const pad = (value: number) => String(value).padStart(2, "0");

const toDateKey = (date: Date) =>
  date.getFullYear() +
  "-" +
  pad(date.getMonth() + 1) +
  "-" +
  pad(date.getDate());

const toMonthKey = (date: Date) =>
  date.getFullYear() + "-" + pad(date.getMonth() + 1);

const formatLongDate = (dateKey: string) =>
  new Date(dateKey + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const isSundayDateKey = (dateKey: string) =>
  Boolean(dateKey) &&
  new Date(dateKey + "T00:00:00.000Z").getUTCDay() === 0;

const getInclusiveDayCount = (startDateKey: string, endDateKey: string) => {
  if (!startDateKey || !endDateKey || startDateKey > endDateKey) return 0;

  const start = Date.parse(startDateKey + "T00:00:00.000Z");
  const end = Date.parse(endDateKey + "T00:00:00.000Z");
  const calendarDays = Math.floor((end - start) / 86_400_000) + 1;
  const fullWeeks = Math.floor(calendarDays / 7);
  const remainder = calendarDays % 7;
  const startWeekday = new Date(start).getUTCDay();
  let sundays = fullWeeks;

  for (let index = 0; index < remainder; index += 1) {
    if ((startWeekday + index) % 7 === 0) sundays += 1;
  }

  return calendarDays - sundays;
};

const getNextOperatingDate = (date: Date) => {
  const next = new Date(date);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);
  return next;
};

const buildCalendarDays = (cursor: Date): CalendarDay[] => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
    const dateKey = toDateKey(date);
    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isSunday: date.getDay() === 0,
      isToday: dateKey === todayKey,
    };
  });
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "ST";

const countWords = (value: string) =>
  value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;

function ScheduleAgendaItem({
  schedule,
  onUpdate,
}: {
  schedule: ManualMockSchedule;
  onUpdate: (
    scheduleId: string,
    input: ScheduleUpdateInput,
  ) => Promise<void>;
}) {
  const itemRef = useRef<HTMLElement>(null);
  const disclosureRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"complete" | "cancel">("complete");
  const [feedback, setFeedback] = useState(schedule.feedback || "");
  const [cancellationReason, setCancellationReason] = useState(
    schedule.cancellationReason || "",
  );
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const feedbackWordCount = countWords(feedback);
  const isScheduled = schedule.status === "scheduled";
  const panelId = "manual-mock-actions-" + schedule._id;

  useEffect(() => {
    setFeedback(schedule.feedback || "");
    setCancellationReason(schedule.cancellationReason || "");
  }, [schedule.cancellationReason, schedule.feedback]);

  useGSAP(
    () => {
      if (!open || !disclosureRef.current) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          disclosureRef.current,
          { height: 0, autoAlpha: 0 },
          {
            height: "auto",
            autoAlpha: 1,
            duration: 0.28,
            ease: "power2.out",
            clearProps: "height,opacity,visibility",
          },
        );
      });
      return () => media.revert();
    },
    {
      scope: itemRef,
      dependencies: [open],
      revertOnUpdate: true,
    },
  );

  const saveAction = async () => {
    setActionError("");
    if (action === "complete" && feedbackWordCount < 30) {
      setActionError(
        "Write at least 30 words of feedback before marking this mock as done.",
      );
      return;
    }
    if (action === "cancel" && !cancellationReason.trim()) {
      setActionError(
        "Write a cancellation reason before cancelling this mock.",
      );
      return;
    }

    try {
      setSaving(true);
      await onUpdate(
        schedule._id,
        action === "complete"
          ? { status: "completed", feedback: feedback.trim() }
          : {
              status: "cancelled",
              cancellationReason: cancellationReason.trim(),
            },
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not update this mock interview.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statusClass =
    schedule.status === "completed"
      ? styles.statusCompleted
      : schedule.status === "cancelled"
        ? styles.statusCancelled
        : styles.statusScheduled;

  return (
    <article
      ref={itemRef}
      className={[
        styles.sessionCard,
        open ? styles.sessionCardOpen : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={styles.sessionSummary}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current);
          setActionError("");
        }}
      >
        <span className={styles.studentAvatar}>
          {initials(schedule.studentName)}
        </span>
        <span className={styles.sessionIdentity}>
          <strong>{schedule.studentName}</strong>
          <small>
            {schedule.courseTitle}{" / "}
            {schedule.assignedTeacher || "Teacher not assigned"}
          </small>
        </span>
        <span className={[styles.statusBadge, statusClass].join(" ")}>
          {schedule.status === "completed" ? "Done" : schedule.status}
        </span>
        <span
          className={[
            styles.sessionChevron,
            open ? styles.sessionChevronOpen : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          <ChevronDown size={17} />
        </span>
      </button>

      {open ? (
        <div
          ref={disclosureRef}
          id={panelId}
          className={styles.sessionDisclosure}
        >
          {isScheduled ? (
            <>
              <div
                className={styles.actionChoice}
                role="group"
                aria-label="Interview outcome"
              >
                <button
                  type="button"
                  className={action === "complete" ? styles.actionCompleteActive : ""}
                  onClick={() => {
                    setAction("complete");
                    setActionError("");
                  }}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Mark as done
                </button>
                <button
                  type="button"
                  className={action === "cancel" ? styles.actionCancelActive : ""}
                  onClick={() => {
                    setAction("cancel");
                    setActionError("");
                  }}
                >
                  <Ban size={16} aria-hidden="true" />
                  Mark as cancelled
                </button>
              </div>

              <div className={styles.actionForm}>
                {action === "complete" ? (
                  <label htmlFor={"feedback-" + schedule._id}>
                    <span>
                      Interview feedback
                      <small>Required - minimum 30 words</small>
                    </span>
                    <textarea
                      id={"feedback-" + schedule._id}
                      value={feedback}
                      maxLength={5000}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Cover preparation, communication, technical strengths, improvement areas, and next steps."
                      rows={5}
                    />
                  </label>
                ) : (
                  <label htmlFor={"cancellation-" + schedule._id}>
                    <span>
                      Cancellation reason
                      <small>Required</small>
                    </span>
                    <textarea
                      id={"cancellation-" + schedule._id}
                      value={cancellationReason}
                      maxLength={2000}
                      onChange={(event) => setCancellationReason(event.target.value)}
                      placeholder="Explain why this interview could not take place."
                      rows={4}
                    />
                  </label>
                )}

                <div className={styles.actionMeta}>
                  <span
                    className={
                      action === "complete" && feedbackWordCount >= 30
                        ? styles.wordCounterReady
                        : styles.wordCounter
                    }
                  >
                    {action === "complete"
                      ? feedbackWordCount + " / 30 words"
                      : cancellationReason.trim()
                        ? "Reason ready"
                        : "Reason required"}
                  </span>
                  <button
                    type="button"
                    className={
                      action === "complete"
                        ? styles.actionSubmit
                        : styles.cancelSubmit
                    }
                    disabled={
                      saving ||
                      (action === "complete"
                        ? feedbackWordCount < 30
                        : !cancellationReason.trim())
                    }
                    onClick={saveAction}
                  >
                    {saving ? (
                      <LoaderCircle
                        className={styles.actionSpinner}
                        size={16}
                        aria-hidden="true"
                      />
                    ) : action === "complete" ? (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    ) : (
                      <Ban size={16} aria-hidden="true" />
                    )}
                    {saving
                      ? "Saving..."
                      : action === "complete"
                        ? "Save and mark done"
                        : "Confirm cancellation"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.savedOutcome}>
              {schedule.status === "completed" ? (
                <MessageSquareText size={19} aria-hidden="true" />
              ) : (
                <Ban size={19} aria-hidden="true" />
              )}
              <div>
                <strong>
                  {schedule.status === "completed"
                    ? "Feedback recorded"
                    : "Cancellation reason"}
                </strong>
                <p>
                  {schedule.status === "completed"
                    ? schedule.feedback || "No feedback was stored."
                    : schedule.cancellationReason || "No reason was stored."}
                </p>
                {schedule.statusUpdatedByName ? (
                  <small>Updated by {schedule.statusUpdatedByName}</small>
                ) : null}
              </div>
            </div>
          )}

          {actionError ? (
            <p className={styles.actionError} role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function TrainerDashboardPage() {
  const rootRef = useRef<HTMLElement>(null);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { user } = useUser();

  const today = useMemo(() => getNextOperatingDate(new Date()), []);
  const [rangeStart, setRangeStart] = useState(() => toDateKey(today));
  const [rangeEnd, setRangeEnd] = useState(() => toDateKey(today));
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [schedules, setSchedules] = useState<ManualMockSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleError, setScheduleError] = useState("");

  const [studentQuery, setStudentQuery] = useState("");
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const [roster, setRoster] = useState<RosterSelection[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const rangeDayCount = useMemo(
    () => getInclusiveDayCount(rangeStart, rangeEnd),
    [rangeEnd, rangeStart],
  );
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  const monthKey = toMonthKey(monthCursor);
  const calendarDays = useMemo(
    () => buildCalendarDays(monthCursor),
    [monthCursor],
  );

  const schedulesByDate = useMemo(() => {
    const grouped = new Map<string, ManualMockSchedule[]>();
    for (const schedule of schedules) {
      const existing = grouped.get(schedule.dateKey) || [];
      existing.push(schedule);
      grouped.set(schedule.dateKey, existing);
    }
    return grouped;
  }, [schedules]);

  const selectedDaySchedules = schedulesByDate.get(selectedDate) || [];
  const uniqueStudents = new Set(schedules.map((schedule) => schedule.student))
    .size;
  const upcomingCount = schedules.filter(
    (schedule) =>
      schedule.dateKey >= toDateKey(today) && schedule.status === "scheduled",
  ).length;

  const loadSchedules = useCallback(async (month: string) => {
    setLoadingSchedules(true);
    setScheduleError("");
    try {
      const response = await fetch(
        apiUrl("?month=" + encodeURIComponent(month)),
        {
          cache: "no-store",
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Could not load the calendar");
      }
      setSchedules(Array.isArray(payload?.schedules) ? payload.schedules : []);
    } catch (error) {
      setSchedules([]);
      setScheduleError(
        error instanceof Error ? error.message : "Could not load the calendar",
      );
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  const updateSchedule = useCallback(
    async (scheduleId: string, input: ScheduleUpdateInput) => {
      const response = await fetch(
        apiUrl("/" + encodeURIComponent(scheduleId)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Could not update this mock interview");
      }

      const updated = payload?.schedule as ManualMockSchedule | undefined;
      if (!updated?._id) {
        throw new Error("The updated mock interview was not returned");
      }
      setSchedules((current) =>
        current.map((schedule) =>
          schedule._id === updated._id ? updated : schedule,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    loadSchedules(monthKey);
  }, [loadSchedules, monthKey]);

  const loadStudents = useCallback(
    async (query: string, signal: AbortSignal) => {
      setStudentsLoading(true);
      setStudentError("");
      try {
        const suffix = query.trim()
          ? "?search=" + encodeURIComponent(query.trim())
          : "";
        const response = await fetch(apiUrl("/candidates" + suffix), {
          cache: "no-store",
          signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Could not search students");
        }
        setStudents(Array.isArray(payload?.students) ? payload.students : []);
        setActiveStudentIndex(0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setStudents([]);
        setStudentError(
          error instanceof Error ? error.message : "Could not search students",
        );
      } finally {
        if (!signal.aborted) setStudentsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!studentMenuOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      loadStudents(studentQuery, controller.signal);
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadStudents, studentMenuOpen, studentQuery]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchRootRef.current &&
        !searchRootRef.current.contains(event.target as Node)
      ) {
        setStudentMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".trainer-reveal", {
          autoAlpha: 0,
          y: 16,
          duration: 0.46,
          stagger: 0.07,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
        });
      });
      return () => media.revert();
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      if (!calendarOpen) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".calendar-disclosure", {
          autoAlpha: 0,
          y: -10,
          duration: 0.26,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
        });
      });
      return () => media.revert();
    },
    {
      scope: rootRef,
      dependencies: [calendarOpen, monthKey],
      revertOnUpdate: true,
    },
  );

  const addStudent = (student: EligibleStudent) => {
    if (roster.length >= 100) {
      setFormError("A schedule can include at most 100 students.");
      return;
    }

    if (roster.some((entry) => entry.student._id === student._id)) return;

    setRoster((current) => [
      ...current,
      {
        student,
        courseId: student.courses.length === 1 ? student.courses[0]._id : "",
        assignedTeacher: "",
      },
    ]);
    setStudentQuery("");
    setStudentMenuOpen(false);
    setStudents([]);
    setFormError("");
    setFormMessage("");
  };

  const removeStudent = (studentId: string) => {
    setRoster((current) =>
      current.filter((entry) => entry.student._id !== studentId),
    );
    setFormError("");
    setFormMessage("");
  };

  const updateRosterCourse = (studentId: string, courseId: string) => {
    setRoster((current) =>
      current.map((entry) =>
        entry.student._id === studentId ? { ...entry, courseId } : entry,
      ),
    );
    setFormError("");
    setFormMessage("");
  };

  const updateRosterTeacher = (
    studentId: string,
    assignedTeacher: string,
  ) => {
    setRoster((current) =>
      current.map((entry) =>
        entry.student._id === studentId
          ? { ...entry, assignedTeacher }
          : entry,
      ),
    );
    setFormError("");
    setFormMessage("");
  };

  const moveMonth = (offset: number) => {
    const next = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + offset,
      1,
    );
    setMonthCursor(next);
    setSelectedDate(toDateKey(getNextOperatingDate(next)));
  };

  const goToToday = () => {
    const now = getNextOperatingDate(new Date());
    const todayKey = toDateKey(now);
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayKey);
    setRangeStart(todayKey);
    setRangeEnd(todayKey);
  };

  const selectCalendarDay = (day: CalendarDay) => {
    if (day.isSunday) return;

    setSelectedDate(day.dateKey);
    setRangeStart(day.dateKey);
    setRangeEnd(day.dateKey);
    setFormError("");
    setFormMessage("");
    if (!day.inCurrentMonth) {
      setMonthCursor(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
  };

  const handleRangeStartChange = (dateKey: string) => {
    if (isSundayDateKey(dateKey)) {
      setFormError("Sundays are unavailable for manual mock schedules.");
      return;
    }

    setRangeStart(dateKey);
    if (!dateKey) return;

    setRangeEnd((current) =>
      !current || current < dateKey ? dateKey : current,
    );
    setSelectedDate(dateKey);
    const date = new Date(dateKey + "T00:00:00");
    setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    setFormError("");
    setFormMessage("");
  };

  const handleRangeEndChange = (dateKey: string) => {
    if (isSundayDateKey(dateKey)) {
      setFormError("Sundays are unavailable for manual mock schedules.");
      return;
    }

    setRangeEnd(dateKey);
    setFormError("");
    setFormMessage("");
  };

  const handleStudentKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!studentMenuOpen || students.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveStudentIndex((index) =>
        Math.min(index + 1, students.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveStudentIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const student = students[activeStudentIndex];
      if (student) addStudent(student);
    } else if (event.key === "Escape") {
      setStudentMenuOpen(false);
    }
  };

  const submitSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    if (roster.length === 0) {
      setFormError("Add at least one student to this date range.");
      return;
    }
    if (roster.some((entry) => !entry.courseId)) {
      setFormError("Choose a purchased course for every selected student.");
      return;
    }
    if (roster.some((entry) => !entry.assignedTeacher)) {
      setFormError("Assign a responsible teacher to every selected student.");
      return;
    }
    if (rangeDayCount === 0) {
      setFormError("Choose a valid From and To date.");
      return;
    }
    if (isSundayDateKey(rangeStart) || isSundayDateKey(rangeEnd)) {
      setFormError("Sundays cannot be selected as schedule dates.");
      return;
    }
    if (rangeDayCount > 90) {
      setFormError("The date range can include at most 90 operating days.");
      return;
    }
    if (roster.length * rangeDayCount > 5000) {
      setFormError("This roster and date range create too many entries.");
      return;
    }
    if (!user?.id) {
      setFormError("Trainer identity is not available. Refresh and try again.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDateKey: rangeStart,
          endDateKey: rangeEnd,
          assignments: roster.map((entry) => ({
            studentId: entry.student._id,
            courseId: entry.courseId,
            assignedTeacher: entry.assignedTeacher,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error || "Could not save the manual mock roster",
        );
      }

      const createdCount = Number(payload?.count || 0);
      await loadSchedules(monthKey);
      setFormMessage(
        createdCount +
          (createdCount === 1 ? " schedule entry" : " schedule entries") +
          " created across " +
          rangeDayCount +
          (rangeDayCount === 1 ? " day." : " days."),
      );
      setRoster([]);
      setStudentQuery("");
      setStudents([]);
      setSelectedDate(rangeStart);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not save the manual mock roster",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main ref={rootRef} className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />

      <div className={styles.shell}>
        <header className={"trainer-reveal " + styles.header}>
          <div>
            <div className={styles.workspaceBadge}>
              <Sparkles size={14} aria-hidden="true" />
              Trainer workspace
            </div>
            <h1>Manual mock scheduler</h1>
            <p>
              Build date-based interview rosters across courses using verified
              LMS students and their purchased courses.
            </p>
          </div>
          <div className={styles.trainerIdentity}>
            <span className={styles.trainerAvatar}>
              {initials(user?.fullName || "Trainer")}
            </span>
            <span>
              <strong>{user?.fullName || "Trainer"}</strong>
              <small>Scheduling access</small>
            </span>
          </div>
        </header>

        <div className={styles.workspace}>
          <section className={"trainer-reveal " + styles.calendarPanel}>
            <button
              type="button"
              className={styles.calendarToggle}
              aria-expanded={calendarOpen}
              aria-controls="trainer-calendar-disclosure"
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <span className={styles.calendarToggleIcon}>
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <span className={styles.calendarToggleCopy}>
                <span className={styles.kicker}>Schedule calendar</span>
                <strong>{formatLongDate(selectedDate)}</strong>
              </span>
              <span className={styles.calendarToggleMeta}>
                {loadingSchedules
                  ? "Loading..."
                  : schedules.length +
                    (schedules.length === 1
                      ? " student this month"
                      : " students this month")}
              </span>
              <span
                className={[
                  styles.calendarToggleArrow,
                  calendarOpen ? styles.calendarToggleArrowOpen : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <ChevronDown size={19} aria-hidden="true" />
              </span>
            </button>

            {scheduleError ? (
              <div className={styles.errorBanner} role="alert">
                {scheduleError}
                <button type="button" onClick={() => loadSchedules(monthKey)}>
                  Retry
                </button>
              </div>
            ) : null}

            {calendarOpen ? (
              <div
                id="trainer-calendar-disclosure"
                className={"calendar-disclosure " + styles.calendarDisclosure}
              >
                <div className={styles.panelHeading}>
                  <div>
                    <span className={styles.kicker}>Month view</span>
                    <h2>
                      {monthCursor.toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h2>
                  </div>
                  <div className={styles.calendarActions}>
                    <button type="button" onClick={goToToday}>
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMonth(-1)}
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMonth(1)}
                      aria-label="Next month"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div
                  className={"calendar-grid " + styles.calendarGrid}
                  aria-label="Manual mock schedule calendar"
                >
                  {WEEKDAYS.map((weekday) => (
                    <div key={weekday} className={styles.weekday}>
                      {weekday}
                    </div>
                  ))}
                  {calendarDays.map((day) => {
                    const daySchedules = schedulesByDate.get(day.dateKey) || [];
                    const isSelected = day.dateKey === selectedDate;
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        className={[
                          styles.day,
                          !day.inCurrentMonth ? styles.dayMuted : "",
                          day.isToday ? styles.dayToday : "",
                          day.isSunday ? styles.dayDisabled : "",
                          isSelected ? styles.daySelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => selectCalendarDay(day)}
                        disabled={day.isSunday}
                        aria-pressed={!day.isSunday && isSelected}
                        aria-label={
                          day.isSunday
                            ? formatLongDate(day.dateKey) + ", unavailable"
                            : formatLongDate(day.dateKey) +
                              (daySchedules.length
                                ? ", " + daySchedules.length + " students"
                                : ", no students")
                        }
                      >
                        <span>{day.dayNumber}</span>
                        {daySchedules.length ? (
                          <small>
                            {daySchedules.length}
                            <span className={styles.desktopOnly}>
                              {daySchedules.length === 1
                                ? " student"
                                : " students"}
                            </span>
                          </small>
                        ) : null}
                      </button>
                    );
                  })}
                  {loadingSchedules ? (
                    <div className={styles.calendarLoading} role="status">
                      <LoaderCircle size={20} aria-hidden="true" />
                      Loading schedule...
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={styles.agenda}>
              <div className={styles.agendaHeading}>
                <div>
                  <span className={styles.kicker}>Selected date</span>
                  <h3>{formatLongDate(selectedDate)}</h3>
                </div>
                <span className={styles.sessionCount}>
                  {selectedDaySchedules.length} interviews
                </span>
              </div>

              {selectedDaySchedules.length ? (
                <div className={styles.agendaList}>
                  {selectedDaySchedules.map((schedule) => (
                    <ScheduleAgendaItem
                      key={schedule._id}
                      schedule={schedule}
                      onUpdate={updateSchedule}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyAgenda}>
                  <CalendarDays size={22} aria-hidden="true" />
                  <div>
                    <strong>No students on this date</strong>
                    <p>Use the roster builder to add the first group.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className={"trainer-reveal " + styles.formPanel}>
            <div className={styles.formHeader}>
              <span className={styles.formIcon}>
                <Plus size={19} aria-hidden="true" />
              </span>
              <div>
                <span className={styles.kicker}>New roster</span>
                <h2>Add manual mock students</h2>
              </div>
            </div>

            <form onSubmit={submitSchedule}>
              <section className={styles.dateRangeCard}>
                <div className={styles.dateRangeHeading}>
                  <span className={styles.formIcon}>
                    <CalendarDays size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span className={styles.kicker}>Schedule window</span>
                    <strong>
                      {rangeDayCount || 0}
                      {rangeDayCount === 1
                        ? " operating day"
                        : " operating days"}
                    </strong>
                  </div>
                </div>
                <div className={styles.dateRangeGrid}>
                  <label htmlFor="manual-mock-date-from">
                    From
                    <input
                      id="manual-mock-date-from"
                      type="date"
                      value={rangeStart}
                      max={rangeEnd || undefined}
                      onChange={(event) =>
                        handleRangeStartChange(event.target.value)
                      }
                      required
                    />
                  </label>
                  <label htmlFor="manual-mock-date-to">
                    To
                    <input
                      id="manual-mock-date-to"
                      type="date"
                      value={rangeEnd}
                      min={rangeStart || undefined}
                      onChange={(event) =>
                        handleRangeEndChange(event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
                <p>
                  {roster.length} students x {rangeDayCount || 0} operating days
                  ={" "}
                  <strong>
                    {roster.length * rangeDayCount} schedule entries
                  </strong>
                  <span>Sundays are excluded automatically.</span>
                </p>
              </section>

              <div ref={searchRootRef} className={styles.field}>
                <label htmlFor="manual-mock-student">
                  Add students <span>{roster.length}/100 selected</span>
                </label>
                <div className={styles.searchWrap}>
                  <Search size={17} aria-hidden="true" />
                  <input
                    id="manual-mock-student"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="manual-mock-student-options"
                    aria-expanded={studentMenuOpen}
                    aria-activedescendant={
                      studentMenuOpen && students[activeStudentIndex]
                        ? "manual-mock-student-" +
                          students[activeStudentIndex]._id
                        : undefined
                    }
                    value={studentQuery}
                    onFocus={() => setStudentMenuOpen(true)}
                    onChange={(event) => {
                      setStudentQuery(event.target.value);
                      setStudentMenuOpen(true);
                    }}
                    onKeyDown={handleStudentKeyDown}
                    placeholder="Search and add another student"
                    autoComplete="off"
                  />

                  {studentMenuOpen ? (
                    <div
                      id="manual-mock-student-options"
                      role="listbox"
                      className={styles.studentMenu}
                    >
                      {studentsLoading ? (
                        <div className={styles.menuState} role="status">
                          <LoaderCircle size={18} aria-hidden="true" />
                          Searching enrolled students...
                        </div>
                      ) : studentError ? (
                        <div className={styles.menuError} role="alert">
                          {studentError}
                        </div>
                      ) : students.length ? (
                        students.map((student, index) => {
                          const alreadyAdded = roster.some(
                            (entry) => entry.student._id === student._id,
                          );
                          return (
                            <button
                              key={student._id}
                              id={"manual-mock-student-" + student._id}
                              type="button"
                              role="option"
                              aria-selected={alreadyAdded}
                              disabled={alreadyAdded}
                              className={
                                alreadyAdded
                                  ? styles.studentOptionAdded
                                  : index === activeStudentIndex
                                    ? styles.studentOptionActive
                                    : styles.studentOption
                              }
                              onMouseEnter={() => setActiveStudentIndex(index)}
                              onClick={() => addStudent(student)}
                            >
                              <span className={styles.studentAvatar}>
                                {initials(student.fullName)}
                              </span>
                              <span>
                                <strong>{student.fullName}</strong>
                                <small>
                                  {student.enrollmentId ||
                                    student.email ||
                                    "Student"}
                                </small>
                                <em>
                                  {student.courses
                                    .map((course) => course.title)
                                    .join(", ")}
                                </em>
                              </span>
                              <span className={styles.optionAction}>
                                {alreadyAdded ? "Added" : "Add"}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className={styles.menuState}>
                          No students with purchased courses found.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <p className={styles.fieldHint}>
                  Add students from any course. Every student must have at least
                  one valid purchased course.
                </p>
              </div>

              <section
                className={styles.rosterSection}
                aria-label="Selected roster"
              >
                <div className={styles.rosterHeading}>
                  <div>
                    <span className={styles.kicker}>Selected roster</span>
                    <strong>
                      {roster.length
                        ? roster.length +
                          (roster.length === 1 ? " student" : " students")
                        : "No students yet"}
                    </strong>
                  </div>
                  {roster.length ? (
                    <button type="button" onClick={() => setRoster([])}>
                      Clear all
                    </button>
                  ) : null}
                </div>

                {roster.length ? (
                  <div className={styles.rosterList}>
                    {roster.map(
                      ({ student, courseId, assignedTeacher }, index) => (
                        <article key={student._id} className={styles.rosterRow}>
                          <span className={styles.rosterNumber}>{index + 1}</span>
                          <div className={styles.rosterIdentity}>
                            <span className={styles.studentAvatar}>
                              {initials(student.fullName)}
                            </span>
                            <span>
                              <strong>{student.fullName}</strong>
                              <small>
                                {student.enrollmentId ||
                                  student.email ||
                                  "Enrolled student"}
                              </small>
                            </span>
                          </div>
                          <div className={styles.rosterCourse}>
                            <label htmlFor={"course-" + student._id}>
                              Purchased course
                            </label>
                            <div className={styles.selectWrap}>
                              <BookOpen size={16} aria-hidden="true" />
                              <select
                                id={"course-" + student._id}
                                value={courseId}
                                onChange={(event) =>
                                  updateRosterCourse(
                                    student._id,
                                    event.target.value,
                                  )
                                }
                                required
                              >
                                <option value="">Choose course</option>
                                {student.courses.map((course) => (
                                  <option key={course._id} value={course._id}>
                                    {course.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className={styles.rosterCourse}>
                            <label htmlFor={"teacher-" + student._id}>
                              Responsible teacher
                            </label>
                            <div className={styles.selectWrap}>
                              <Users size={16} aria-hidden="true" />
                              <select
                                id={"teacher-" + student._id}
                                value={assignedTeacher}
                                onChange={(event) =>
                                  updateRosterTeacher(
                                    student._id,
                                    event.target.value,
                                  )
                                }
                                required
                              >
                                <option value="">Assign teacher</option>
                                {MANUAL_MOCK_TEACHERS.map((teacher) => (
                                  <option key={teacher} value={teacher}>
                                    {teacher}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.removeRosterButton}
                            onClick={() => removeStudent(student._id)}
                            aria-label={"Remove " + student.fullName}
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyRoster}>
                    <Users size={20} aria-hidden="true" />
                    <div>
                      <strong>Build a multi-course roster</strong>
                      <p>
                        Search above and add every student for this date range.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {formError ? (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              ) : null}
              {formMessage ? (
                <p className={styles.formSuccess} role="status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {formMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={
                  submitting || roster.length === 0 || rangeDayCount === 0
                }
              >
                {submitting ? (
                  <LoaderCircle size={17} aria-hidden="true" />
                ) : (
                  <GraduationCap size={17} aria-hidden="true" />
                )}
                {submitting
                  ? "Saving roster..."
                  : "Schedule " +
                    roster.length +
                    (roster.length === 1
                      ? " student across "
                      : " students across ") +
                    rangeDayCount +
                    (rangeDayCount === 1
                      ? " operating day"
                      : " operating days")}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}
