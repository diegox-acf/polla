import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Pozo — Polla Mundial 2026" };

export default async function PozoPage() {
  const session = await auth();
  if (typeof session?.user.playerId !== "number") redirect("/");

  const [settingsRow, allPlayers] = await Promise.all([
    db.query.settings.findFirst(),
    db.query.players.findMany({ orderBy: (p, { asc }) => [asc(p.createdAt)] }),
  ]);

  const entry = settingsRow?.entryAmount ?? 0;
  const currency = settingsRow?.currency ?? "BOB";
  const paid = allPlayers.filter((p) => p.paid);
  const unpaid = allPlayers.filter((p) => !p.paid);
  const pot = entry * paid.length;
  const potFull = entry * allPlayers.length;

  const pcts = [
    { label: "1º", emoji: "🥇", pct: settingsRow?.prizeFirstPct ?? 60 },
    { label: "2º", emoji: "🥈", pct: settingsRow?.prizeSecondPct ?? 30 },
    { label: "3º", emoji: "🥉", pct: settingsRow?.prizeThirdPct ?? 10 },
  ];

  const fmt = new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Pozo</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Entrada de {fmt.format(entry)} por jugador. Los pagos son transferencias entre amigos —
        aquí solo se lleva el registro.
      </p>

      {entry === 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          El admin aún no define el monto de entrada (se configura en /admin).
        </p>
      )}

      {/* ---- Pozo y premios ---- */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Pozo acumulado
          </p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200">
            {fmt.format(pot)}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            {paid.length} de {allPlayers.length} entradas pagadas
            {pot < potFull && <> · {fmt.format(potFull)} con todos al día</>}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Premios proyectados
          </p>
          <ul className="mt-2 space-y-1.5">
            {pcts.map((prize) => (
              <li key={prize.label} className="flex items-center justify-between text-sm">
                <span>
                  {prize.emoji} {prize.label} <span className="text-zinc-400">({prize.pct}%)</span>
                </span>
                <span className="font-bold tabular-nums">
                  {fmt.format(Math.round((pot * prize.pct) / 100))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---- Quién pagó ---- */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
          Pagos
        </h2>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...unpaid, ...paid].map((player) => (
              <li key={player.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {player.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
                  <img src={player.image} alt="" width={24} height={24} className="rounded-full" />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">
                    ⚽
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium">
                  {player.name ?? player.email}
                </span>
                <span
                  className={
                    player.paid
                      ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : "rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
                  }
                >
                  {player.paid ? "Pagó ✓" : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {unpaid.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400">
            {unpaid.length} {unpaid.length === 1 ? "jugador debe" : "jugadores deben"} la entrada.
            El admin marca los pagos.
          </p>
        )}
      </section>
    </main>
  );
}
