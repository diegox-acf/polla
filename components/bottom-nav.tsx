"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/fixture", label: "Fixture", emoji: "🗓️" },
  { href: "/grupos", label: "Grupos", emoji: "🏟️" },
  { href: "/tabla", label: "Tabla", emoji: "📊" },
  { href: "/bonus", label: "Bonus", emoji: "🏆" },
  { href: "/pozo", label: "Pozo", emoji: "💰" },
];

// Barra de pestañas inferior, solo en móvil (en desktop está el nav del header)
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-zinc-800"
    >
      <div className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span aria-hidden className={`text-lg leading-none ${active ? "" : "grayscale"}`}>
                {tab.emoji}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
