"use client";

import { useSyncExternalStore } from "react";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Claro", icon: "☀️" },
  { value: "dark", label: "Oscuro", icon: "🌙" },
  { value: "system", label: "Sistema", icon: "🖥️" },
];

// Store externo: la fuente de verdad es localStorage. Re-renderizamos al
// elegir tema (evento propio) o si cambia en otra pestaña (evento storage).
function subscribe(onChange: () => void) {
  window.addEventListener("theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, () => "system");

  // El seguimiento en vivo de la preferencia del SO vive en <ThemeSync>, que
  // está siempre montado (este selector solo existe con el menú abierto).
  function choose(value: Theme) {
    setTheme(value);
    window.dispatchEvent(new Event("theme-change"));
  }

  return (
    <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
      <p className="px-1 pb-1.5 text-xs font-medium text-zinc-400">Tema</p>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-900 dark:text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span aria-hidden className="text-sm">
                {opt.icon}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
