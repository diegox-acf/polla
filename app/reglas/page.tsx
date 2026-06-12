import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";

export const metadata = { title: "Reglas — Polla Mundial 2026" };

// Página pública (sin login): útil para mandársela a los amigos antes de invitarlos.
// Los montos y deadlines salen de settings, así nunca quedan desactualizados.
export default async function ReglasPage() {
  const settingsRow = await db.query.settings.findFirst();
  const currency = settingsRow?.currency ?? "BOB";
  const entry = settingsRow?.entryAmount ?? 0;
  const fmt = new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const prizes = [
    { label: "🥇 1er lugar", pct: settingsRow?.prizeFirstPct ?? 60 },
    { label: "🥈 2do lugar", pct: settingsRow?.prizeSecondPct ?? 30 },
    { label: "🥉 3er lugar", pct: settingsRow?.prizeThirdPct ?? 10 },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Reglas</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Copa Mundial FIFA 2026 (USA / México / Canadá) · 11 de junio – 19 de julio · se
        pronostican los <strong>104 partidos</strong>.
      </p>

      {/* ---- Pronósticos ---- */}
      <Section title="1. Pronósticos de partidos">
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Rule>
            Pronosticas el <strong>marcador exacto</strong> de cada partido.
          </Rule>
          <Rule>
            Puedes crear y editar libremente <strong>hasta el kickoff</strong>. Después queda
            bloqueado — sin excepciones, el servidor manda.
          </Rule>
          <Rule>
            Los pronósticos de los demás están <strong>ocultos hasta el kickoff</strong>; al
            cierre se hacen visibles para todos en la página del partido.
          </Rule>
          <Rule>
            Partido sin pronóstico = <strong>0 puntos</strong> (no hay marcador por defecto).
          </Rule>
        </ul>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-3 font-medium">Acierto</th>
              <th className="py-2 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="text-zinc-600 dark:text-zinc-300">
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-3">Marcador exacto (dijiste 2–1 y fue 2–1)</td>
              <td className="py-2 text-right text-base font-bold text-emerald-600 dark:text-emerald-400">
                3
              </td>
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-3">Solo el resultado (gana local / empate / gana visita)</td>
              <td className="py-2 text-right text-base font-bold">1</td>
            </tr>
            <tr>
              <td className="py-2 pr-3">Nada</td>
              <td className="py-2 text-right text-base font-bold text-zinc-400">0</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          <p className="font-semibold">Fase eliminatoria</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              El marcador se evalúa al final de los <strong>90 minutos</strong> (más descuento).
              Alargue y penales <strong>no</strong> cuentan para el marcador.
            </li>
            <li>
              <strong>+1 punto adicional</strong> por acertar qué equipo clasifica a la
              siguiente ronda (este sí considera alargue y penales). Si pronosticas empate, la
              app te pide además quién clasifica.
            </li>
          </ul>
        </div>
      </Section>

      {/* ---- Bonus ---- */}
      <Section title="2. Bonus">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Se eligen una sola vez, antes del inicio del torneo, y quedan bloqueados
          {settingsRow?.bonusDeadline ? (
            <>
              {" "}
              el <LocalTime iso={settingsRow.bonusDeadline.toISOString()} />
            </>
          ) : (
            <> en el deadline que defina el admin</>
          )}
          . Ocultos entre jugadores hasta el bloqueo; después, visibles para todos.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-3 font-medium">Bonus</th>
              <th className="py-2 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="text-zinc-600 dark:text-zinc-300">
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-3">Campeón del mundo</td>
              <td className="py-2 text-right text-base font-bold text-emerald-600 dark:text-emerald-400">
                15
              </td>
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-3">
                Goleador del torneo (Bota de Oro) — si hay empate de goleadores, basta que tu
                elegido esté entre ellos
              </td>
              <td className="py-2 text-right text-base font-bold">10</td>
            </tr>
            <tr>
              <td className="py-2 pr-3">
                Finalistas — 5 por cada equipo acertado, sin importar el lado del bracket
              </td>
              <td className="py-2 text-right text-base font-bold">5 + 5</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ---- Desempates ---- */}
      <Section title="3. Desempates">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Si hay empate en puntos, se resuelve en este orden (en la tabla verás un ⚖️ cuando
          una posición se definió así):
        </p>
        <ol className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          {[
            "Más marcadores exactos en todo el torneo",
            "Más puntos en fase eliminatoria",
            "Acertó el campeón",
            "Se comparte el premio",
          ].map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Section>

      {/* ---- Pozo ---- */}
      <Section title="4. Pozo y premios">
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Rule>
            Entrada fija por jugador:{" "}
            <strong>{entry > 0 ? fmt.format(entry) : "monto por definir"}</strong>.
          </Rule>
          <Rule>
            Reparto entre los tres primeros:{" "}
            <strong>{prizes.map((p) => `${p.pct}%`).join(" / ")}</strong> del pozo (proyección
            en vivo en la página Pozo).
          </Rule>
          <Rule>
            Los pagos se hacen fuera de la app (transferencia entre amigos) — aquí solo se
            registra quién pagó.
          </Rule>
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
        {title}
      </h2>
      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </section>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
      <span>{children}</span>
    </li>
  );
}
