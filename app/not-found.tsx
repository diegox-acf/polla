import Link from "next/link";
import { Mascotas } from "@/components/mascotas";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <Mascotas className="h-36 w-auto" />
      <h1 className="text-3xl font-extrabold tracking-tight">Fuera de juego</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Esta página no existe (404). Ni Maple, Zayu ni Clutch la encontraron.
      </p>
      <Link
        href="/"
        className="h-11 rounded-full bg-emerald-600 px-6 leading-[44px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
