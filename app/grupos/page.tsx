import { asc, ne } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LocalTime } from "@/components/local-time";
import { Mascotas } from "@/components/mascotas";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { fetchWorldCupStandings, type FdStanding } from "@/lib/football-data";
import { groupLabel, stageShortLabel } from "@/lib/stages";

type Match = typeof matches.$inferSelect;
type Team = typeof teams.$inferSelect;

export const metadata = { title: "Grupos — Polla Mundial 2026" };

export default async function GruposPage() {
  const session = await auth();
  if (typeof session?.user.playerId !== "number") redirect("/");

  let standings: FdStanding[] | null = null;
  try {
    standings = await fetchWorldCupStandings();
  } catch {
    // API caída: la página degrada con un mensaje, no revienta
  }

  // Cuadro de eliminatorias desde nuestra DB (sin llamadas extra a la API)
  const [koMatches, allTeams] = await Promise.all([
    db.query.matches.findMany({
      where: ne(matches.stage, "GROUP_STAGE"),
      orderBy: [asc(matches.kickoff), asc(matches.id)],
    }),
    db.query.teams.findMany(),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  const rounds: { stage: string; label: string; matches: Match[] }[] = [];
  for (const match of koMatches) {
    const existing = rounds.find((r) => r.stage === match.stage);
    if (existing) existing.matches.push(match);
    else rounds.push({ stage: match.stage, label: stageShortLabel(match.stage), matches: [match] });
  }
  const thirdPlace = rounds.find((r) => r.stage === "THIRD_PLACE")?.matches[0];
  const bracketRounds = rounds.filter((r) => r.stage !== "THIRD_PLACE");

  // Reordena cada ronda para que los partidos queden junto a su cruce destino.
  // Antes de definirse los cruces no hay nada que ordenar; cuando un partido de
  // la ronda siguiente ya tiene equipos, sus alimentadores se identifican por
  // el clasificado y las líneas del cuadro quedan correctas.
  for (let i = bracketRounds.length - 1; i >= 1; i--) {
    const targets = bracketRounds[i].matches;
    const prev = bracketRounds[i - 1].matches;
    if (prev.length !== targets.length * 2) continue;
    const used = new Set<number>();
    const slots: (Match | null)[] = [];
    for (const target of targets) {
      const teamIds = [target.homeTeamId, target.awayTeamId].filter((x): x is number => x !== null);
      const feeders = prev
        .filter(
          (p) =>
            !used.has(p.id) &&
            p.advancingTeamId !== null &&
            teamIds.includes(p.advancingTeamId),
        )
        .slice(0, 2);
      for (const feeder of feeders) used.add(feeder.id);
      slots.push(feeders[0] ?? null, feeders[1] ?? null);
    }
    const remaining = prev.filter((p) => !used.has(p.id));
    bracketRounds[i - 1].matches = slots.map((slot) => slot ?? remaining.shift()!);
  }

  // fetchWorldCupStandings ya filtra a tablas TOTAL con grupo
  const groups = standings ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Grupos</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Tablas reales del torneo, directo de football-data.org (se actualizan cada ~10 min).
        Útiles para afinar los pronósticos de las próximas jornadas.
      </p>

      {groups.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <Mascotas className="h-28 w-auto" />
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            No se pudieron cargar las tablas en este momento. Intenta de nuevo en unos minutos.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section
            key={group.group}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="border-b border-zinc-100 px-4 py-2.5 text-sm font-bold dark:border-zinc-800">
              {groupLabel(group.group!)}
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="py-1.5 pl-4 pr-2 text-left font-medium">Equipo</th>
                  <th className="px-1.5 py-1.5 text-right font-medium" title="Partidos jugados">
                    PJ
                  </th>
                  <th className="px-1.5 py-1.5 text-right font-medium" title="Diferencia de gol">
                    DG
                  </th>
                  <th className="py-1.5 pl-1.5 pr-4 text-right font-medium" title="Puntos">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.table.map((row) => (
                  <tr
                    key={row.team.id ?? row.position}
                    className={`border-t border-zinc-100 dark:border-zinc-800 ${
                      // Top 2 clasifican directo (y algunos terceros — se marcan suave)
                      row.position <= 2 ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                    }`}
                  >
                    <td className="py-2 pl-4 pr-2">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="w-4 text-right tabular-nums text-zinc-400">
                          {row.position}
                        </span>
                        {row.team.crest && (
                          // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
                          <img src={row.team.crest} alt="" width={16} height={16} />
                        )}
                        {row.team.id !== null ? (
                          <Link
                            href={`/equipos/${row.team.id}`}
                            className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
                          >
                            {row.team.shortName ?? row.team.name}
                          </Link>
                        ) : (
                          (row.team.shortName ?? row.team.name)
                        )}
                      </span>
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{row.playedGames}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="py-2 pl-1.5 pr-4 text-right font-bold tabular-nums">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {groups.length > 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          Sombreado = puestos de clasificación directa (los mejores terceros también avanzan).
        </p>
      )}

      {/* ---- Cuadro de eliminatorias ---- */}
      {bracketRounds.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
            Cuadro de eliminatorias
          </h2>
          <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2">
            <div className="flex items-stretch gap-8">
              {bracketRounds.map((round, roundIndex) => {
                const isFinal = round.stage === "FINAL";
                const pairs: Match[][] = [];
                if (!isFinal) {
                  for (let i = 0; i < round.matches.length; i += 2) {
                    pairs.push(round.matches.slice(i, i + 2));
                  }
                }
                return (
                  <div key={round.stage} className="flex flex-col">
                    <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {round.label}
                    </p>
                    {isFinal ? (
                      <div className="flex flex-1 flex-col justify-center">
                        <BracketCard match={round.matches[0]} teamById={teamById} incoming />
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-col">
                        {pairs.map((pair, pairIndex) => (
                          <div
                            key={pairIndex}
                            className="relative flex flex-1 flex-col justify-around"
                          >
                            {pair.map((match) => (
                              <BracketCard
                                key={match.id}
                                match={match}
                                teamById={teamById}
                                incoming={roundIndex > 0}
                                outgoing
                              />
                            ))}
                            {/* línea vertical entre los dos partidos de la llave */}
                            <span
                              aria-hidden
                              className="absolute bottom-1/4 right-[-16px] top-1/4 w-px bg-zinc-300 dark:bg-zinc-700"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {thirdPlace && (
                <div className="flex flex-col">
                  <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    3er puesto
                  </p>
                  <div className="flex flex-1 flex-col justify-center">
                    <BracketCard match={thirdPlace} teamById={teamById} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Los cruces se completan a medida que avanza el torneo. Toca un partido para verlo.
          </p>
        </section>
      )}
    </main>
  );
}

function BracketCard({
  match,
  teamById,
  incoming = false,
  outgoing = false,
}: {
  match: Match;
  teamById: Map<number, Team>;
  incoming?: boolean;
  outgoing?: boolean;
}) {
  const home = match.homeTeamId !== null ? teamById.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId !== null ? teamById.get(match.awayTeamId) : undefined;
  return (
    <div className="relative py-1">
      {incoming && (
        <span
          aria-hidden
          className="absolute left-[-16px] top-1/2 h-px w-4 bg-zinc-300 dark:bg-zinc-700"
        />
      )}
      {outgoing && (
        <span
          aria-hidden
          className="absolute right-[-16px] top-1/2 h-px w-4 bg-zinc-300 dark:bg-zinc-700"
        />
      )}
      <Link
        href={`/partido/${match.id}`}
        className="block w-44 shrink-0 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
      >
        <p className="mb-1 text-[10px] text-zinc-400">
          <LocalTime iso={match.kickoff.toISOString()} />
        </p>
        <BracketTeam
          team={home}
          score={match.homeScore90}
          advancing={home !== undefined && match.advancingTeamId === home.id}
        />
        <BracketTeam
          team={away}
          score={match.awayScore90}
          advancing={away !== undefined && match.advancingTeamId === away.id}
        />
      </Link>
    </div>
  );
}

function BracketTeam({
  team,
  score,
  advancing,
}: {
  team?: Team;
  score: number | null;
  advancing: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 py-0.5 text-xs ${
        team ? (advancing ? "font-bold" : "") : "italic text-zinc-400"
      }`}
    >
      {team?.crest && (
        // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
        <img src={team.crest} alt="" width={14} height={14} className="shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {team ? (team.shortName ?? team.name) : "Por definir"}
      </span>
      {score !== null && <span className="font-semibold tabular-nums">{score}</span>}
      {advancing && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
    </p>
  );
}
