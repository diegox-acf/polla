import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchWorldCupStandings, type FdStanding } from "@/lib/football-data";
import { groupLabel } from "@/lib/stages";

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
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No se pudieron cargar las tablas en este momento. Intenta de nuevo en unos minutos.
        </p>
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
    </main>
  );
}
