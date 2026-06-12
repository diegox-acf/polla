"use client";

import { useSyncExternalStore } from "react";

const FORMATS = {
  datetime: {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  },
  date: { weekday: "long", day: "numeric", month: "long" },
  time: { hour: "2-digit", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

function subscribe() {
  return () => {};
}

// Renderiza un instante UTC en la zona horaria del navegador. El servidor no
// la conoce, así que sirve un placeholder y el cliente formatea al hidratar.
export function LocalTime({
  iso,
  mode = "datetime",
}: {
  iso: string;
  mode?: keyof typeof FORMATS;
}) {
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat("es", FORMATS[mode]).format(new Date(iso)),
    () => null,
  );

  return <time dateTime={iso}>{text ?? "…"}</time>;
}
