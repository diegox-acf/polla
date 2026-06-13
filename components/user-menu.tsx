"use client";

import { useState } from "react";

interface Props {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  signOutAction: () => Promise<void>;
}

export function UserMenu({ name, email, image, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="relative ml-2 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de usuario"
        className="block rounded-full ring-2 ring-emerald-600/30 transition-shadow hover:ring-emerald-500/60"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
          <img src={image} alt="" width={30} height={30} className="rounded-full" />
        ) : (
          <span className="flex size-[30px] items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
            {(name ?? email ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Cierra el menú al tocar fuera */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="truncate text-sm font-semibold">{name ?? "Jugador"}</p>
              {email && <p className="truncate text-xs text-zinc-400">{email}</p>}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
