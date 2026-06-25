// Sync de resultados desde football-data.org. Lo invocan el cron
// (/api/cron/sync) y el botón "Sincronizar ahora" del admin.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, resultAudit } from "@/lib/db/schema";
import {
  advancingTeamId,
  fetchWorldCupMatches,
  mapStatus,
  score90,
} from "@/lib/football-data";

const ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h tras el kickoff

export interface SyncSummary {
  skipped: boolean;
  checked: number;
  updated: number;
}

// Solo llama a la API en ventanas de partido (free tier: 10 req/min, y el
// workflow lo dispara cada ~10 min). `force` salta el guard — para el botón
// manual del admin.
export async function syncResults({ force = false } = {}): Promise<SyncSummary> {
  const existing = await db.query.matches.findMany();
  const now = Date.now();

  const hasActiveWindow = existing.some(
    (m) =>
      m.status === "in_play" ||
      m.status === "paused" ||
      (m.status === "scheduled" &&
        m.kickoff.getTime() <= now &&
        m.kickoff.getTime() > now - ACTIVE_WINDOW_MS),
  );
  if (!hasActiveWindow && !force) {
    return { skipped: true, checked: 0, updated: 0 };
  }

  const apiMatches = await fetchWorldCupMatches();
  const byId = new Map(existing.map((m) => [m.id, m]));
  let updated = 0;

  for (const apiMatch of apiMatches) {
    const s90 = score90(apiMatch.score);
    const current = byId.get(apiMatch.id);

    // football-data deja homeTeam/awayTeam en null mientras un cruce de
    // eliminatorias no está sorteado, y a veces un slot ya resuelto vuelve a
    // null entre syncs. No pisamos un equipo ya conocido con null: si lo
    // hiciéramos, el cuadro perdería los clasificados que ya habían aparecido
    // (se "borran" tras un sync). Solo avanzamos null→equipo o equipo→otro.
    const next = {
      stage: apiMatch.stage,
      group: apiMatch.group,
      matchday: apiMatch.matchday,
      homeTeamId: apiMatch.homeTeam.id ?? current?.homeTeamId ?? null,
      awayTeamId: apiMatch.awayTeam.id ?? current?.awayTeamId ?? null,
      kickoff: new Date(apiMatch.utcDate),
      status: mapStatus(apiMatch.status),
      homeScore90: s90.home,
      awayScore90: s90.away,
      advancingTeamId: advancingTeamId(apiMatch),
    };

    if (!current) {
      // Partido nuevo (no debería pasar tras el seed, pero el upsert es barato)
      await db.insert(matches).values({ id: apiMatch.id, ...next, updatedAt: new Date() });
      updated++;
      continue;
    }

    const changed =
      current.stage !== next.stage ||
      current.group !== next.group ||
      current.matchday !== next.matchday ||
      current.homeTeamId !== next.homeTeamId ||
      current.awayTeamId !== next.awayTeamId ||
      current.kickoff.getTime() !== next.kickoff.getTime() ||
      current.status !== next.status ||
      current.homeScore90 !== next.homeScore90 ||
      current.awayScore90 !== next.awayScore90 ||
      current.advancingTeamId !== next.advancingTeamId;
    if (!changed) continue;

    const resultChanged =
      current.homeScore90 !== next.homeScore90 ||
      current.awayScore90 !== next.awayScore90 ||
      current.advancingTeamId !== next.advancingTeamId;

    await db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({ ...next, updatedAt: new Date() })
        .where(eq(matches.id, apiMatch.id));
      if (resultChanged) {
        await tx.insert(resultAudit).values({
          matchId: apiMatch.id,
          source: "api",
          actorPlayerId: null,
          prevHomeScore: current.homeScore90,
          prevAwayScore: current.awayScore90,
          prevAdvancingTeamId: current.advancingTeamId,
          newHomeScore: next.homeScore90,
          newAwayScore: next.awayScore90,
          newAdvancingTeamId: next.advancingTeamId,
        });
      }
    });
    updated++;
  }

  return { skipped: false, checked: apiMatches.length, updated };
}
