import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { matches, teams } from "@/lib/db/schema";
import { groupLabel } from "@/lib/stages";

export const metadata = { title: "Equipos — Polla Mundial 2026" };

export default async function EquiposPage() {
  const session = await auth();
  if (typeof session?.user.playerId !== "number") redirect("/");

  const [allTeams, groupMatches] = await Promise.all([
    db.query.teams.findMany({ orderBy: [asc(teams.name)] }),
    db.query.matches.findMany({ where: eq(matches.stage, "GROUP_STAGE") }),
  ]);

  // Grupo de cada equipo, derivado del fixture
  const groupByTeam = new Map<number, string>();
  for (const match of groupMatches) {
    if (!match.group) continue;
    if (match.homeTeamId !== null) groupByTeam.set(match.homeTeamId, match.group);
    if (match.awayTeamId !== null) groupByTeam.set(match.awayTeamId, match.group);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Equipos</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Las {allTeams.length} selecciones del Mundial. Entra a cualquiera para ver su plantel.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {allTeams.map((team) => {
          const group = groupByTeam.get(team.id);
          return (
            <Link
              key={team.id}
              href={`/equipos/${team.id}`}
              className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-zinc-200/60 bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-300/70 hover:shadow-xl hover:shadow-emerald-500/15 dark:border-zinc-800/60 dark:bg-zinc-900 dark:hover:border-emerald-700/60 dark:hover:shadow-emerald-400/10"
            >
              {/* Brillo que entra desde arriba al hacer hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-emerald-900/40"
              />
              {team.crest ? (
                // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
                <img
                  src={team.crest}
                  alt=""
                  width={48}
                  height={48}
                  className="relative drop-shadow-sm transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-125 group-hover:drop-shadow-md"
                />
              ) : (
                <span className="relative text-4xl transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-125">
                  ⚽
                </span>
              )}
              <span className="relative text-sm font-semibold transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                {team.shortName ?? team.name}
              </span>
              {group && (
                <span className="relative rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-emerald-900/60 dark:group-hover:text-emerald-300">
                  {groupLabel(group)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
