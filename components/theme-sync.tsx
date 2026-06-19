"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

// Mantiene el tema en sintonía con el SO cuando está en modo "Sistema".
// Va SIEMPRE montado en el layout: el selector de tema solo existe mientras
// el menú de usuario está abierto, así que no puede ser él quien escuche los
// cambios de preferencia del SO (si no, "Sistema" solo reacciona al recargar).
export function ThemeSync() {
  useEffect(() => {
    // applyTheme resuelve "system" según el SO; con "light"/"dark" ignora al
    // SO, así que reaplicar ante cualquier evento es inofensivo.
    const apply = () => applyTheme(getStoredTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    // Cambio de preferencia del SO (solo cambia algo en modo "Sistema").
    mq.addEventListener("change", apply);
    // Cambio de selección en esta pestaña (theme-change) u otra (storage).
    window.addEventListener("theme-change", apply);
    window.addEventListener("storage", apply);
    // En móvil el evento "change" suele no dispararse con la app en segundo
    // plano; reaplicamos al volver a primer plano para no quedar desfasados.
    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("theme-change", apply);
      window.removeEventListener("storage", apply);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
