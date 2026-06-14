"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 45_000;

// Mientras haya un partido en vivo o por empezar, refresca los server components
// (marcador, indicador EN VIVO, tabla) sin recargar la página. router.refresh()
// conserva el estado de los componentes cliente, así que no molesta formularios.
// Se pausa cuando la pestaña está oculta para no consultar en segundo plano.
export function LiveRefresher({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => router.refresh(), INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else {
        router.refresh(); // ponerse al día al volver
        start();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, router]);

  return null;
}
