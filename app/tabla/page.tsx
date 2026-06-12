import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/db/schema";
import { computeStandings, type BonusOutcome, type PlayerInput } from "@/lib/scoring/scoring";

export const metadata = { title: "Tabla — Polla Mundial 2026" };

const TIEBREAK_LABELS: Record<string, string> = {
  exactos: "Empate resuelto por más marcadores exactos",
  eliminatorias: "Empate resuelto por puntos en fase eliminatoria",
  campeon: "Empate resuelto por acertar el campeón",
  compartido: "Empate total: comparten posición (y premio)",
};

export default async function TablaPage() {
  const session = await auth();
  if (typeof session?.user.playerId !== "number") redirect("/");

  const [allPlayers, finishedMatches, allPicks, finalMatch] = await Promise.all([
    db.query.players.findMany(),
    db.query.matches.findMany({ where: eq(matches.status, "finished") }),
    db.query.bonusPicks.findMany(),
    db.query.matches.findFirst({ where: eq(matches.stage, "FINAL") }),
  ]);

  const scorable = finishedMatches.filter(
    (m) => m.homeScore90 !== null && m.awayScore90 !== null,
  );
  const scorableIds = scorable.map((m) => m.id);
  const matchById = new Map(scorable.map((m) => [m.id, m]));

  const allPredictions =
    scorableIds.length > 0
      ? await db.query.predictions.findMany({
          where: inArray(predictions.matchId, scorableIds),
        })
      : [];

  // Campeón y finalistas se derivan de la final; el goleador lo marca el admin
  const bonusOutcome: BonusOutcome = {
    championTeamId:
      finalMatch && finalMatch.status === "finished"
        ? (finalMatch.advancingTeamId ??
          (finalMatch.homeScore90 !== null &&
          finalMatch.awayScore90 !== null &&
          finalMatch.homeScore90 !== finalMatch.awayScore90
            ? finalMatch.homeScore90 > finalMatch.awayScore90
              ? finalMatch.homeTeamId
              : finalMatch.awayTeamId
            : null))
        : null,
    finalistTeamIds:
      finalMatch?.homeTeamId != null && finalMatch?.awayTeamId != null
        ? [finalMatch.homeTeamId, finalMatch.awayTeamId]
        : [],
  };

  const pickByPlayer = new Map(allPicks.map((p) => [p.playerId, p]));
  const predsByPlayer = new Map<number, typeof allPredictions>();
  for (const pred of allPredictions) {
    const list = predsByPlayer.get(pred.playerId) ?? [];
    list.push(pred);
    predsByPlayer.set(pred.playerId, list);
  }

  const inputs: PlayerInput[] = allPlayers.map((player) => ({
    playerId: player.id,
    predictions: (predsByPlayer.get(player.id) ?? []).flatMap((pred) => {
      const match = matchById.get(pred.matchId);
      if (!match) return [];
      return [
        {
          prediction: {
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
            advancingTeamId: pred.advancingTeamId,
          },
          result: {
            stage: match.stage,
            homeScore90: match.homeScore90!,
            awayScore90: match.awayScore90!,
            advancingTeamId: match.advancingTeamId,
          },
        },
      ];
    }),
    bonus: pickByPlayer.get(player.id) ?? null,
  }));

  const standings = computeStandings(inputs, bonusOutcome);
  const playerById = new Map(allPlayers.map((p) => [p.id, p]));
  const myPlayerId = session.user.playerId;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Tabla de posiciones</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        3 pts marcador exacto · 1 pt resultado · +1 clasificado · bonus 15/10/5.{" "}
        {scorable.length} {scorable.length === 1 ? "partido jugado" : "partidos jugados"}.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Jugador</th>
              <th className="px-3 py-2.5 text-right font-medium">Pts</th>
              <th className="px-3 py-2.5 text-right font-medium" title="Marcadores exactos (3 pts)">
                Exactos
              </th>
              <th className="px-3 py-2.5 text-right font-medium" title="Solo resultado (1 pt)">
                Result.
              </th>
              <th className="px-3 py-2.5 text-right font-medium" title="Clasificados acertados (+1)">
                Clasif.
              </th>
              <th className="px-3 py-2.5 text-right font-medium" title="Campeón, goleador y finalistas">
                Bonus
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const player = playerById.get(row.playerId);
              const isMe = row.playerId === myPlayerId;
              return (
                <tr
                  key={row.playerId}
                  className={`border-t border-zinc-100 dark:border-zinc-800 ${
                    isMe ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-semibold tabular-nums">
                    {medal(row.rank) ?? row.rank}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      {player?.image && (
                        // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
                        <img
                          src={player.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      {player?.name ?? player?.email ?? `Jugador ${row.playerId}`}
                      {row.tiebrokenBy && (
                        <span
                          title={TIEBREAK_LABELS[row.tiebrokenBy]}
                          className="cursor-help text-xs"
                          aria-label={TIEBREAK_LABELS[row.tiebrokenBy]}
                        >
                          ⚖️
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                    {row.total}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.exactCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.outcomeCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.advancingCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.bonusPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        ⚖️ = posición definida por desempate (pasa el cursor para ver el criterio). El puntaje se
        recalcula desde cero en cada visita: corregir un resultado ajusta todo automáticamente.
      </p>
    </main>
  );
}

function medal(rank: number): string | null {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
}
