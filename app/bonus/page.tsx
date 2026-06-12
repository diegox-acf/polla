import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";
import { bonusPicks, players, teams } from "@/lib/db/schema";
import { BonusForm } from "./bonus-form";

export const metadata = { title: "Bonus — Polla Mundial 2026" };

export default async function BonusPage() {
  const session = await auth();
  const playerId = session?.user.playerId;
  if (typeof playerId !== "number") redirect("/");

  const [settingsRow, allTeams, myPicks] = await Promise.all([
    db.query.settings.findFirst(),
    db.query.teams.findMany({ orderBy: [asc(teams.name)] }),
    db.query.bonusPicks.findFirst({ where: eq(bonusPicks.playerId, playerId) }),
  ]);

  const deadline = settingsRow?.bonusDeadline ?? null;
  const locked = deadline !== null && new Date() >= deadline;
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const teamName = (id: number | null) =>
    id !== null ? (teamById.get(id)?.name ?? "?") : "—";

  // Ocultos entre jugadores hasta el bloqueo; visibles para todos después (FEATURES §4)
  const everyonesPicks = locked
    ? await db
        .select({
          playerId: bonusPicks.playerId,
          playerName: players.name,
          playerEmail: players.email,
          championTeamId: bonusPicks.championTeamId,
          topScorer: bonusPicks.topScorer,
          finalist1TeamId: bonusPicks.finalist1TeamId,
          finalist2TeamId: bonusPicks.finalist2TeamId,
        })
        .from(bonusPicks)
        .innerJoin(players, eq(players.id, bonusPicks.playerId))
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Bonus</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Campeón (15 pts), goleador (10 pts) y los dos finalistas (5 pts cada uno). Se eligen una
        vez y quedan bloqueados en el deadline.
      </p>

      <p className="mt-5 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        {deadline === null ? (
          <>El admin aún no fijó el deadline de bonus. Puedes editar tus picks mientras tanto.</>
        ) : locked ? (
          <>
            El deadline cerró el <LocalTime iso={deadline.toISOString()} />. Los picks ya son
            visibles para todos.
          </>
        ) : (
          <>
            Puedes editar hasta el <LocalTime iso={deadline.toISOString()} /> — después quedan
            bloqueados y visibles para todos.
          </>
        )}
      </p>

      {locked ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
            Mis picks (bloqueados)
          </h2>
          {myPicks ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Campeón" value={teamName(myPicks.championTeamId)} />
              <Row label="Goleador" value={myPicks.topScorer ?? "—"} />
              <Row
                label="Finalistas"
                value={`${teamName(myPicks.finalist1TeamId)} / ${teamName(myPicks.finalist2TeamId)}`}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              No alcanzaste a elegir tus picks antes del deadline (0 pts de bonus).
            </p>
          )}
        </section>
      ) : (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <BonusForm
            teams={allTeams.map((t) => ({ id: t.id, name: t.name }))}
            initial={
              myPicks
                ? {
                    championTeamId: myPicks.championTeamId,
                    topScorer: myPicks.topScorer,
                    finalist1TeamId: myPicks.finalist1TeamId,
                    finalist2TeamId: myPicks.finalist2TeamId,
                  }
                : undefined
            }
          />
        </div>
      )}

      {locked && everyonesPicks.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
            Picks de todos
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-1.5 pr-3 font-medium">Jugador</th>
                  <th className="py-1.5 pr-3 font-medium">Campeón</th>
                  <th className="py-1.5 pr-3 font-medium">Goleador</th>
                  <th className="py-1.5 font-medium">Finalistas</th>
                </tr>
              </thead>
              <tbody>
                {everyonesPicks.map((pick) => (
                  <tr
                    key={pick.playerId}
                    className="border-t border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-3 font-medium">
                      {pick.playerName ?? pick.playerEmail}
                    </td>
                    <td className="py-2 pr-3">{teamName(pick.championTeamId)}</td>
                    <td className="py-2 pr-3">{pick.topScorer ?? "—"}</td>
                    <td className="py-2">
                      {teamName(pick.finalist1TeamId)} / {teamName(pick.finalist2TeamId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
