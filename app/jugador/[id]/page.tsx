import { desc, eq, lte } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { LiveDot } from "@/components/live-dot";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";
import { matches, players, predictions, teams } from "@/lib/db/schema";
import { scoreMatch, type MatchTally } from "@/lib/scoring/scoring";
import { groupLabel, stageLabel } from "@/lib/stages";

type Team = typeof teams.$inferSelect;

export const metadata = { title: "Jugador — Polla Mundial 2026" };

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profileId = Number(id);
  if (!Number.isInteger(profileId) || profileId <= 0) notFound();

  const session = await auth();
  const myPlayerId = session?.user.playerId;
  if (typeof myPlayerId !== "number") redirect("/");

  const player = await db.query.players.findFirst({ where: eq(players.id, profileId) });
  // Los no aprobados no aparecen en la tabla; tampoco tienen perfil público.
  if (!player || !player.approved) notFound();

  const now = new Date();

  const [pastMatches, allTeams, playerPreds] = await Promise.all([
    // "Pasados" = ya pasó el kickoff. A partir de ahí los pronósticos ajenos
    // son públicos (misma regla que /partido/[id]), así que no se filtra nada nuevo.
    db.query.matches.findMany({
      where: lte(matches.kickoff, now),
      orderBy: [desc(matches.kickoff), desc(matches.id)],
    }),
    db.query.teams.findMany(),
    db.query.predictions.findMany({ where: eq(predictions.playerId, profileId) }),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const predByMatch = new Map(playerPreds.map((p) => [p.matchId, p]));

  const rows = pastMatches.map((match) => {
    const pred = predByMatch.get(match.id) ?? null;
    const hasScore = match.homeScore90 !== null && match.awayScore90 !== null;
    const tally: MatchTally | null =
      pred && hasScore
        ? scoreMatch(pred, {
            stage: match.stage,
            homeScore90: match.homeScore90!,
            awayScore90: match.awayScore90!,
            advancingTeamId: match.advancingTeamId,
          })
        : null;
    return { match, pred, hasScore, tally };
  });

  // Resumen: solo cuentan los partidos ya puntuables (con marcador)
  const scored = rows.filter((r) => r.tally);
  const totalPoints = scored.reduce((sum, r) => sum + (r.tally?.points ?? 0), 0);
  const exactCount = scored.filter((r) => r.tally?.exact).length;
  const predictedCount = rows.filter((r) => r.pred).length;

  const isMe = profileId === myPlayerId;
  const displayName = player.name ?? player.email;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/tabla"
        className="text-sm text-zinc-500 underline-offset-4 hover:text-emerald-700 hover:underline dark:text-zinc-400 dark:hover:text-emerald-400"
      >
        ← Tabla de posiciones
      </Link>

      {/* Cabecera del jugador */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {player.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
          <img src={player.image} alt="" width={56} height={56} className="rounded-full" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
            ⚽
          </span>
        )}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-2xl font-extrabold tracking-tight">
            {displayName}
            {isMe && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                Tú
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">{totalPoints} pts</span>{" "}
            en partidos · {exactCount} {exactCount === 1 ? "marcador exacto" : "marcadores exactos"}{" "}
            · {predictedCount} {predictedCount === 1 ? "pronóstico" : "pronósticos"}
          </p>
        </div>
      </div>

      <h2 className="mt-8 flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
        Pronósticos de partidos jugados
        <span className="font-normal normal-case tracking-normal text-zinc-400">
          ({rows.length})
        </span>
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          Todavía no hay partidos jugados.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map(({ match, pred, hasScore, tally }) => {
            const home = match.homeTeamId !== null ? teamById.get(match.homeTeamId) : undefined;
            const away = match.awayTeamId !== null ? teamById.get(match.awayTeamId) : undefined;
            const pickName =
              pred?.advancingTeamId != null
                ? (teamById.get(pred.advancingTeamId)?.shortName ??
                  teamById.get(pred.advancingTeamId)?.name)
                : null;
            const live = match.status === "in_play" || match.status === "paused";
            return (
              <article
                key={match.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium dark:bg-zinc-800">
                    {match.group ? groupLabel(match.group) : stageLabel(match.stage)}
                  </span>
                  <span className="flex items-center gap-2">
                    {live ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/60 dark:text-red-300">
                        <LiveDot />
                        {match.status === "in_play" ? "En vivo" : "Entretiempo"}
                      </span>
                    ) : (
                      match.status === "finished" && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Final
                        </span>
                      )
                    )}
                    <LocalTime iso={match.kickoff.toISOString()} />
                  </span>
                </div>

                <Link
                  href={`/partido/${match.id}`}
                  title="Ver detalle del partido"
                  className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <TeamSide team={home} align="right" />
                  <div className="min-w-16 text-center">
                    {hasScore ? (
                      <span className="text-2xl font-extrabold tabular-nums">
                        {match.homeScore90} – {match.awayScore90}
                      </span>
                    ) : (
                      <span className="text-xs font-medium uppercase text-zinc-400">vs</span>
                    )}
                  </div>
                  <TeamSide team={away} />
                </Link>

                <div className="mt-3 flex items-center justify-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {pred ? (
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">
                      Pronóstico:{" "}
                      <span className="font-semibold tabular-nums">
                        {pred.homeScore} – {pred.awayScore}
                      </span>
                      {pickName && (
                        <span className="ml-1 text-xs text-zinc-500">→ {pickName}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm italic text-zinc-400">Sin pronóstico</span>
                  )}
                  {hasScore && <PointsBadge tally={tally} />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function TeamSide({ team, align = "left" }: { team?: Team; align?: "left" | "right" }) {
  const alignClass = align === "right" ? "justify-end text-right" : "justify-start text-left";
  if (!team) {
    return (
      <span className={`flex items-center gap-2 text-sm italic text-zinc-400 ${alignClass}`}>
        Por definir
      </span>
    );
  }
  const name = team.shortName ?? team.name;
  const crest = team.crest ? (
    // eslint-disable-next-line @next/next/no-img-element -- crests remotos de football-data, tamaño fijo
    <img src={team.crest} alt="" width={24} height={24} className="shrink-0 drop-shadow-sm" />
  ) : null;
  return (
    <span className={`flex items-center gap-2.5 text-sm font-semibold ${alignClass}`}>
      {align === "right" ? (
        <>
          {name}
          {crest}
        </>
      ) : (
        <>
          {crest}
          {name}
        </>
      )}
    </span>
  );
}

function PointsBadge({ tally }: { tally: MatchTally | null }) {
  const points = tally?.points ?? 0;
  const className =
    points >= 3
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      : points >= 1
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  const detail = tally
    ? [
        tally.exact ? "marcador exacto" : tally.outcomeOnly ? "resultado" : null,
        tally.advancing ? "clasificado" : null,
      ]
        .filter(Boolean)
        .join(" + ") || "sin aciertos"
    : "sin pronóstico";
  return (
    <span
      title={detail}
      className={`min-w-10 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums ${className}`}
    >
      +{points}
    </span>
  );
}
