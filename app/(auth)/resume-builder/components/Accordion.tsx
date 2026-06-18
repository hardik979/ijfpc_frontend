"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";

export type AccordionItemConfig = {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient: string; // e.g. "from-violet-500 to-purple-600"
  badge?: ReactNode; // optional count / status chip
  content: ReactNode;
};

function AccordionItem({
  item,
  open,
  onToggle,
}: {
  item: AccordionItemConfig;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;

  return (
    <div
      className={`group overflow-hidden rounded-2xl border bg-white dark:bg-gray-900 transition-all duration-200 ${
        open
          ? "border-violet-200 dark:border-violet-800/70 shadow-[0_8px_30px_rgba(124,58,237,0.12)] ring-1 ring-violet-100 dark:ring-violet-900/40"
          : "border-gray-100 dark:border-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:border-violet-200 dark:hover:border-violet-800/70 hover:shadow-[0_8px_28px_rgba(124,58,237,0.10)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-md transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-[18px] w-[18px] text-white" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`truncate text-sm font-bold transition-colors ${
                open
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300"
              }`}
            >
              {item.title}
            </span>
            {item.badge}
          </span>
          {item.subtitle && (
            <span className="mt-0.5 block truncate text-[11px] text-gray-400 dark:text-gray-500">
              {item.subtitle}
            </span>
          )}
        </span>

        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
            open
              ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300"
              : "text-gray-400 group-hover:bg-violet-50 group-hover:text-violet-500 dark:group-hover:bg-violet-950/40"
          }`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.04 }}
              className="border-t border-gray-50 dark:border-gray-800 px-4 py-5"
            >
              {item.content}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Accordion({
  items,
  defaultOpenIds,
  singleOpen,
}: {
  items: AccordionItemConfig[];
  defaultOpenIds?: string[];
  /** Only one panel open at a time — opening a section closes the others. */
  singleOpen?: boolean;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    if (defaultOpenIds) return new Set(defaultOpenIds);
    if (singleOpen) return new Set(items[0] ? [items[0].id] : []);
    return new Set(items.map((i) => i.id));
  });

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      if (singleOpen) {
        // Opening a new section collapses the rest; clicking the open one closes it.
        return prev.has(id) ? new Set() : new Set([id]);
      }
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          item={item}
          open={openIds.has(item.id)}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}
