import { desc, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";
import { matches, predictionAudit, predictions } from "@/lib/db/schema";
import { isKnockoutStage } from "@/lib/predictions";
import { groupLabel, stageLabel } from "@/lib/stages";
import {
  removePlayer,
  toggleApproved,
  togglePaid,
  toggleTopScorerCorrect,
  updateSettings,
} from "./actions";
import { AddPlayerForm } from "./add-player-form";
import { ResultForm } from "./result-form";
import { SyncButton } from "./sync-button";

export const metadata = { title: "Admin — Polla Mundial 2026" };

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "admin" || typeof session.user.playerId !== "number") {
    redirect("/");
  }
  const myPlayerId = session.user.playerId;

  const [allPlayers, allTeams, allPicks, settingsRow, playedMatches, predPlayers, auditPlayers] =
    await Promise.all([
      db.query.players.findMany({ orderBy: (p, { asc }) => [asc(p.createdAt)] }),
      db.query.teams.findMany(),
      db.query.bonusPicks.findMany(),
      db.query.settings.findFirst(),
      db.query.matches.findMany({
        where: lt(matches.kickoff, new Date()),
        orderBy: [desc(matches.kickoff)],
      }),
      db.selectDistinct({ playerId: predictions.playerId }).from(predictions),
      db.selectDistinct({ playerId: predictionAudit.playerId }).from(predictionAudit),
    ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const pickByPlayer = new Map(allPicks.map((p) => [p.playerId, p]));
  const pendingCount = allPlayers.filter((p) => !p.approved).length;
  const playersWithData = new Set([
    ...predPlayers.map((p) => p.playerId),
    ...auditPlayers.map((p) => p.playerId),
    ...allPicks.map((p) => p.playerId),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Aprobaciones, pagos, resultados y configuración de la polla.
      </p>

      {/* ---- Jugadores ---- */}
      <section className="mt-8">
        <SectionTitle>
          Jugadores ({allPlayers.length})
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium normal-case tracking-normal text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {pendingCount} por aprobar
            </span>
          )}
        </SectionTitle>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <AddPlayerForm />
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {allPlayers.map((player) => {
              const pick = pickByPlayer.get(player.id);
              const deletable = player.id !== myPlayerId && !playersWithData.has(player.id);
              return (
                <li key={player.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {player.image && (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
                      <img src={player.image} alt="" width={24} height={24} className="rounded-full" />
                    )}
                    <span className="truncate font-medium">{player.name ?? player.email}</span>
                    {player.name && (
                      <span className="hidden truncate text-xs text-zinc-400 sm:inline">
                        {player.email}
                      </span>
                    )}
                    {player.role === "admin" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        admin
                      </span>
                    )}
                  </span>

                  {/* Aprobación (registro abierto: el admin habilita el acceso) */}
                  {player.role !== "admin" && (
                    <form action={toggleApproved}>
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="approved" value={player.approved ? "" : "true"} />
                      <button
                        type="submit"
                        title={
                          player.approved
                            ? "Revocar acceso (vuelve a pendiente)"
                            : "Aprobar acceso a la app"
                        }
                        className={
                          player.approved
                            ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                        }
                      >
                        {player.approved ? "Aprobado ✓" : "Aprobar"}
                      </button>
                    </form>
                  )}

                  {/* Pagó */}
                  <form action={togglePaid}>
                    <input type="hidden" name="playerId" value={player.id} />
                    <input type="hidden" name="paid" value={player.paid ? "" : "true"} />
                    <button
                      type="submit"
                      title="Alternar pago de la entrada"
                      className={
                        player.paid
                          ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }
                    >
                      {player.paid ? "Pagó ✓" : "No pagó"}
                    </button>
                  </form>

                  {/* Goleador correcto (al final del torneo) */}
                  {pick?.topScorer && (
                    <form action={toggleTopScorerCorrect}>
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="correct" value={pick.topScorerCorrect ? "" : "true"} />
                      <button
                        type="submit"
                        title={`Pick de goleador: "${pick.topScorer}". Márcalo si acertó (10 pts).`}
                        className={
                          pick.topScorerCorrect
                            ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        ⚽ {pick.topScorerCorrect ? "Goleador ✓" : "Goleador"}
                      </button>
                    </form>
                  )}

                  {/* Quitar (solo sin datos) */}
                  {deletable && (
                    <form action={removePlayer}>
                      <input type="hidden" name="playerId" value={player.id} />
                      <button
                        type="submit"
                        title="Quitar del allowlist"
                        className="rounded-full px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        Quitar
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-zinc-400">
            Cualquiera entra con Google, pero queda <strong>pendiente</strong> hasta que lo
            apruebes — sin aprobación no puede pronosticar. Agregar un email aquí lo deja aprobado
            de una. Solo se pueden quitar jugadores sin pronósticos ni picks.
          </p>
        </div>
      </section>

      {/* ---- Sync ---- */}
      <section className="mt-8">
        <SectionTitle>Sincronización</SectionTitle>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SyncButton />
          <p className="mt-2 text-xs text-zinc-400">
            El cron lo hace solo cada 10 minutos en ventanas de partido. Este botón fuerza una
            pasada completa contra football-data.org.
          </p>
        </div>
      </section>

      {/* ---- Resultados ---- */}
      <section className="mt-8">
        <SectionTitle>Resultados (override manual)</SectionTitle>
        <div className="mt-3 space-y-3">
          {playedMatches.length === 0 && (
            <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              Aún no hay partidos jugados.
            </p>
          )}
          {playedMatches.map((match) => {
            const home = match.homeTeamId !== null ? teamById.get(match.homeTeamId) : undefined;
            const away = match.awayTeamId !== null ? teamById.get(match.awayTeamId) : undefined;
            if (!home || !away) return null;
            const hasResult = match.homeScore90 !== null && match.awayScore90 !== null;
            return (
              <div
                key={match.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    {match.group ? groupLabel(match.group) : stageLabel(match.stage)} ·{" "}
                    {home.shortName ?? home.name} vs {away.shortName ?? away.name}
                  </span>
                  <span className="flex items-center gap-2">
                    {match.status !== "finished" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                        {hasResult ? match.status : "sin resultado"}
                      </span>
                    )}
                    <LocalTime iso={match.kickoff.toISOString()} />
                  </span>
                </div>
                <div className="mt-2.5">
                  <ResultForm
                    matchId={match.id}
                    isKnockout={isKnockoutStage(match.stage)}
                    homeTeamId={home.id}
                    awayTeamId={away.id}
                    homeTeamName={home.shortName ?? home.name}
                    awayTeamName={away.shortName ?? away.name}
                    initial={
                      hasResult
                        ? {
                            homeScore90: match.homeScore90!,
                            awayScore90: match.awayScore90!,
                            advancingTeamId: match.advancingTeamId,
                          }
                        : undefined
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Guardar marca el partido como finalizado y queda en el audit log. La tabla se recalcula
          sola.
        </p>
      </section>

      {/* ---- Configuración ---- */}
      <section className="mt-8">
        <SectionTitle>Configuración</SectionTitle>
        <form
          action={updateSettings}
          className="mt-3 max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Entrada por jugador</span>
              <input
                type="number"
                name="entryAmount"
                min={0}
                required
                defaultValue={settingsRow?.entryAmount ?? 0}
                className="h-10 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Moneda</span>
              <select
                name="currency"
                defaultValue={settingsRow?.currency ?? "BOB"}
                className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-2 text-sm outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="BOB">BOB — Boliviano</option>
                <option value="PEN">PEN — Sol peruano</option>
                <option value="CLP">CLP — Peso chileno</option>
                <option value="ARS">ARS — Peso argentino</option>
                <option value="USD">USD — Dólar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Deadline de bonus (hora UTC)</span>
            <input
              type="datetime-local"
              name="bonusDeadline"
              defaultValue={settingsRow?.bonusDeadline?.toISOString().slice(0, 16) ?? ""}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="mt-1 block text-xs text-zinc-400">
              Vacío = sin deadline (picks editables). Al pasar, los picks se bloquean y se hacen
              públicos.
            </span>
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            Guardar configuración
          </button>
        </form>
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
      {children}
    </h2>
  );
}
