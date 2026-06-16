// Estado "en vivo" de un partido (puro, sin DB ni framework).
//
// football-data.org a veces tarda en mover un partido de "scheduled" a
// "in_play" tras el pitazo inicial. Para no quedarnos sin indicador en ese
// hueco, tratamos como en vivo a un partido cuyo kickoff ya pasó aunque la API
// todavía no lo confirme — hasta una ventana razonable (alargue + penales).

export interface LiveMatch {
  status: string;
  kickoff: Date;
}

// 2h30 cubre 90' + entretiempo + alargue + penales con holgura. Pasada la
// ventana sin confirmación de la API dejamos de marcarlo en vivo (evita un
// indicador "pegado" si la API nunca lo cierra).
export const LIVE_WINDOW_MS = 150 * 60 * 1000;

// En vivo confirmado por la API, o kickoff ya pasado y aún sin confirmación.
export function isLive(match: LiveMatch, now: Date): boolean {
  if (match.status === "in_play" || match.status === "paused") return true;
  if (match.status !== "scheduled") return false;
  const kickoff = match.kickoff.getTime();
  return now.getTime() >= kickoff && now.getTime() < kickoff + LIVE_WINDOW_MS;
}

// Etiqueta del indicador. "Entretiempo" solo cuando la API lo confirma; el
// estado provisional (scheduled ya empezado) se rotula simplemente "En vivo".
export function liveLabel(status: string): string {
  return status === "paused" ? "Entretiempo" : "En vivo";
}
