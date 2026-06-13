"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/fixture", label: "Fixture", emoji: "🗓️" },
  { href: "/grupos", label: "Grupos", emoji: "🏟️" },
  { href: "/equipos", label: "Equipos", emoji: "🌎" },
  { href: "/tabla", label: "Tabla", emoji: "📊" },
  { href: "/bonus", label: "Bonus", emoji: "🏆" },
  { href: "/pozo", label: "Pozo", emoji: "💰" },
  { href: "/reglas", label: "Reglas", emoji: "📜" },
];

// Menú hamburguesa con sidebar deslizante, solo en móvil (en desktop está el nav del header)
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin", emoji: "🛠️" }] : LINKS;

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="-ml-1 flex size-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Fondo oscuro; cierra el menú al tocar fuera */}
      <button
        aria-hidden
        tabIndex={-1}
        onClick={close}
        className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-zinc-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <span className="font-bold tracking-tight">Polla 2026</span>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar menú"
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <span aria-hidden className={`text-lg leading-none ${active ? "" : "grayscale"}`}>
                  {link.emoji}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
