"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-semibold text-sm transition-all duration-300 shadow-sm"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-primary)",
        color: "var(--text-secondary)",
      }}
    >
      <div className="relative w-10 h-5 rounded-full transition-all duration-300"
        style={{ backgroundColor: theme === "dark" ? "var(--brand)" : "var(--border-primary)" }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
          style={{ left: theme === "dark" ? "calc(100% - 18px)" : "2px" }}
        />
      </div>
      {theme === "dark" ? (
        <Moon className="w-4 h-4" style={{ color: "var(--brand)" }} />
      ) : (
        <Sun className="w-4 h-4" style={{ color: "var(--brand)" }} />
      )}
      <span style={{ color: "var(--text-muted)" }}>
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}