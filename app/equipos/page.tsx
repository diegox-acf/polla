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
              className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
            >
              {team.crest ? (
                // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
                <img
                  src={team.crest}
                  alt=""
                  width={48}
                  height={48}
                  className="drop-shadow-sm transition-transform group-hover:scale-110"
                />
              ) : (
                <span className="text-4xl">⚽</span>
              )}
              <span className="text-sm font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                {team.shortName ?? team.name}
              </span>
              {group && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
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
