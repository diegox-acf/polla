"use client";

import {
  CalendarDays,
  CircleDollarSign,
  Globe,
  LayoutGrid,
  ListOrdered,
  Menu,
  ScrollText,
  Settings,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/fixture", label: "Fixture", Icon: CalendarDays },
  { href: "/grupos", label: "Grupos", Icon: LayoutGrid },
  { href: "/equipos", label: "Equipos", Icon: Globe },
  { href: "/tabla", label: "Tabla", Icon: ListOrdered },
  { href: "/bonus", label: "Bonus", Icon: Trophy },
  { href: "/pozo", label: "Pozo", Icon: CircleDollarSign },
  { href: "/reglas", label: "Reglas", Icon: ScrollText },
];

function subscribe() {
  return () => {};
}

// Menú hamburguesa con sidebar deslizante, solo en móvil (en desktop está el nav del header).
// El overlay se monta vía portal en <body> para no quedar atrapado en el contexto
// de posicionamiento del header (su backdrop-filter crea un containing block para fixed).
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // En el servidor no hay document para el portal; montamos solo en el cliente.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const links = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin", Icon: Settings }]
    : LINKS;

  const overlay = (
    <>
      {/* Fondo oscuro; cierra el menú al tocar fuera */}
      <button
        aria-hidden
        tabIndex={-1}
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform duration-200 ease-out sm:hidden dark:bg-zinc-900 ${
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
            <X size={18} aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                  className={active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="-ml-1 flex size-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Menu size={22} aria-hidden />
      </button>

      {mounted && createPortal(overlay, document.body)}
    </div>
  );
}
