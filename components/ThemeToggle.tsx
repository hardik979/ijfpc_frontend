"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Dark mode" : "Light mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 hover:opacity-80"
      style={{ color: "var(--text-secondary)" }}
    >
      {theme === "dark" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
    </button>
  );
}