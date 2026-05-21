"use client";

import { useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarDayData = {
  date: string; // YYYY-MM-DD
  [key: string]: any;
};

export type CalendarFormateProps = {
  data?: CalendarDayData[];
  initialMonth?: string; // YYYY-MM
  loading?: boolean;
  onMonthChange?: (month: string) => void; // YYYY-MM
  onDateSelect?: (date: string, dayData: CalendarDayData | null) => void;
  renderCell?: (args: {
    date: string;
    inMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    dayData: CalendarDayData | null;
  }) => React.ReactNode;
  title?: string;
  className?: string;
  highlightToday?: boolean;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarFormate({
  data = [],
  initialMonth,
  loading = false,
  onMonthChange,
  onDateSelect,
  renderCell,
  title,
  className = "",
  highlightToday = true,
}: CalendarFormateProps) {
  const [cursor, setCursor] = useState<Dayjs>(() =>
    initialMonth ? dayjs(`${initialMonth}-01`) : dayjs().startOf("month")
  );
  const [selected, setSelected] = useState<string | null>(null);

  const dataMap = useMemo(() => {
    const m = new Map<string, CalendarDayData>();
    for (const d of data) m.set(d.date, d);
    return m;
  }, [data]);

  const todayStr = dayjs().format("YYYY-MM-DD");

  const cells = useMemo(() => {
    const startOfMonth = cursor.startOf("month");
    const endOfMonth = cursor.endOf("month");
    const gridStart = startOfMonth.subtract(startOfMonth.day(), "day");
    const gridEnd = endOfMonth.add(6 - endOfMonth.day(), "day");

    const days: { date: string; inMonth: boolean }[] = [];
    let d = gridStart;
    while (d.isBefore(gridEnd) || d.isSame(gridEnd, "day")) {
      days.push({
        date: d.format("YYYY-MM-DD"),
        inMonth: d.month() === cursor.month(),
      });
      d = d.add(1, "day");
    }
    return days;
  }, [cursor]);

  const changeMonth = (delta: number) => {
    const next = cursor.add(delta, "month");
    setCursor(next);
    onMonthChange?.(next.format("YYYY-MM"));
  };

  const goToday = () => {
    const t = dayjs().startOf("month");
    setCursor(t);
    onMonthChange?.(t.format("YYYY-MM"));
  };

  const handleSelect = (dateStr: string, inMonth: boolean, isFuture: boolean) => {
    if (!inMonth || isFuture) return;
    setSelected(dateStr);
    onDateSelect?.(dateStr, dataMap.get(dateStr) ?? null);
  };

  return (
    <div
      className={`w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          )}
          <p className="text-lg font-semibold text-gray-800">
            {cursor.format("MMMM YYYY")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className={[
              "text-center text-xs font-medium py-1",
              i === 0
                ? "text-red-500"
                : i === 6
                ? "text-gray-500"
                : "text-emerald-600",
            ].join(" ")}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }) => {
          const dayData = dataMap.get(date) ?? null;
          const isToday = highlightToday && date === todayStr;
          const isSelected = selected === date;
          const dow = dayjs(date).day();
          const isSunday = dow === 0;
          const isWeekday = dow >= 1 && dow <= 5;
          const isFuture = dayjs(date).isAfter(dayjs(), "day");
          const disabled = !inMonth || isFuture;

          if (renderCell) {
            return (
              <button
                key={date}
                type="button"
                onClick={() => handleSelect(date, inMonth, isFuture)}
                disabled={disabled}
                className="h-20 sm:h-[88px] w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {renderCell({ date, inMonth, isToday, isSelected, dayData })}
              </button>
            );
          }

          const hasData = !!dayData;
          const baseColor = !inMonth
            ? "text-gray-300"
            : isFuture
            ? "text-gray-300"
            : isSunday
            ? "text-red-500"
            : isWeekday
            ? "text-emerald-600"
            : "text-gray-800";

          return (
            <button
              key={date}
              type="button"
              onClick={() => handleSelect(date, inMonth, isFuture)}
              disabled={disabled}
              className={[
                "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition",
                "disabled:cursor-not-allowed",
                isSelected
                  ? "bg-blue-600 text-white"
                  : isToday
                  ? `bg-blue-50 border border-blue-200 ${baseColor}`
                  : hasData && !isFuture
                  ? `bg-emerald-50 hover:bg-emerald-100 ${baseColor}`
                  : `${baseColor} ${disabled ? "" : "hover:bg-gray-50"}`,
              ].join(" ")}
            >
              <span className="font-medium">{dayjs(date).date()}</span>
              {hasData && !isSelected && !isFuture && (
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="mt-3 text-center text-xs text-gray-400">Loading…</div>
      )}
    </div>
  );
}
