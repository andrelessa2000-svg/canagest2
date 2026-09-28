"use client";

import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const context = useTheme();

  if (!context) {
    return null;
  }

  const { theme, toggleTheme } = context;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
      aria-label={theme === "light" ? "Alternar para modo escuro" : "Alternar para modo claro"}
      title={theme === "light" ? "Modo escuro" : "Modo claro"}
    >
      {theme === "light" ? (
        <Moon className="size-5" strokeWidth={2} />
      ) : (
        <Sun className="size-5" strokeWidth={2} />
      )}
    </button>
  );
}