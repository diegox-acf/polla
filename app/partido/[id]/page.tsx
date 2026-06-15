import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { LiveDot } from "@/components/live-dot";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";
import { matches, players, predictions, teams } from "@/lib/db/schema";
import { canPredict, isKnockoutStage } from "@/lib/predictions";
import { scoreMatch, type MatchTally } from "@/lib/scoring/scoring";
import { groupLabel, stageLabel } from "@/lib/stages";
import { PredictionForm } from "@/app/fixture/prediction-form";

type Team = typeof teams.$inferSelect;

export const metadata = { title: "Partido — Polla Mundial 2026" };

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();

  const session = await auth();
  const playerId = session?.user.playerId;
  if (typeof playerId !== "number") redirect("/");

  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) notFound();

  const allTeams = await db.query.teams.findMany();
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const home = match.homeTeamId !== null ? teamById.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId !== null ? teamById.get(match.awayTeamId) : undefined;

  const now = new Date();
  const open = canPredict(match, now);
  const knockout = isKnockoutStage(match.stage);
  const hasScore = match.homeScore90 !== null && match.awayScore90 !== null;
  const advancing =
    match.advancingTeamId !== null ? teamById.get(match.advancingTeamId) : undefined;

  // Regla de visibilidad (server-side): antes del kickoff SOLO mi pronóstico
  // sale del servidor; los ajenos ni siquiera se consultan.
  const locked = !open && (match.status !== "scheduled" || now >= match.kickoff);

  const myPrediction = await db.query.predictions.findFirst({
    where: (p, { and: andOp }) => andOp(eq(p.playerId, playerId), eq(p.matchId, matchId)),
  });

  const result = hasScore
    ? {
        stage: match.stage,
        homeScore90: match.homeScore90!,
        awayScore90: match.awayScore90!,
        advancingTeamId: match.advancingTeamId,
      }
    : null;

  let rows: {
    playerId: number;
    label: string;
    image: string | null;
    prediction: { homeScore: number; awayScore: number; advancingTeamId: number | null } | null;
    tally: MatchTally | null;
  }[] = [];

  if (locked) {
    const [allPlayers, allPredictions] = await Promise.all([
      db.query.players.findMany({ where: eq(players.approved, true) }),
      db.query.predictions.findMany({ where: eq(predictions.matchId, matchId) }),
    ]);
    const predByPlayer = new Map(allPredictions.map((p) => [p.playerId, p]));
    rows = allPlayers.map((player) => {
      const pred = predByPlayer.get(player.id) ?? null;
      return {
        playerId: player.id,
        label: player.name ?? player.email,
        image: player.image,
        prediction: pred
          ? {
              homeScore: pred.homeScore,
              awayScore: pred.awayScore,
              advancingTeamId: pred.advancingTeamId,
            }
          : null,
        tally: pred && result ? scoreMatch(pred, result) : null,
      };
    });
    rows.sort(
      (a, b) =>
        (b.tally?.points ?? -1) - (a.tally?.points ?? -1) || a.label.localeCompare(b.label),
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      {/* ---- Cabecera del partido ---- */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium dark:bg-zinc-800">
            {match.group ? groupLabel(match.group) : stageLabel(match.stage)}
          </span>
          <span className="flex items-center gap-2">
            {(match.status === "in_play" || match.status === "paused") && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/60 dark:text-red-300">
                <LiveDot />
                {match.status === "in_play" ? "En vivo" : "Entretiempo"}
              </span>
            )}
            {match.status === "finished" && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Final
              </span>
            )}
            <LocalTime iso={match.kickoff.toISOString()} />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <BigTeam team={home} align="right" />
          <div className="text-center">
            {hasScore ? (
              <span className="text-4xl font-extrabold tabular-nums">
                {match.homeScore90} – {match.awayScore90}
              </span>
            ) : (
              <span className="text-sm font-medium uppercase text-zinc-400">vs</span>
            )}
            {advancing && (
              <p className="mt-1 text-xs text-zinc-500">
                Clasificó {advancing.shortName ?? advancing.name}
              </p>
            )}
          </div>
          <BigTeam team={away} />
        </div>
      </div>

      {/* ---- Pronósticos ---- */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
          Pronósticos
        </h2>

        {open && home && away ? (
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <PredictionForm
              matchId={match.id}
              isKnockout={knockout}
              homeTeamId={home.id}
              awayTeamId={away.id}
              homeTeamName={home.shortName ?? home.name}
              awayTeamName={away.shortName ?? away.name}
              initial={
                myPrediction
                  ? {
                      homeScore: myPrediction.homeScore,
                      awayScore: myPrediction.awayScore,
                      advancingTeamId: myPrediction.advancingTeamId,
                    }
                  : undefined
              }
            />
            <p className="mt-3 text-xs text-zinc-400">
              Los pronósticos de los demás se revelan al kickoff.
            </p>
          </div>
        ) : !locked ? (
          <p className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            El pronóstico se habilita cuando se defina el cruce.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => {
                const isMe = row.playerId === playerId;
                const pickName =
                  row.prediction?.advancingTeamId != null
                    ? (teamById.get(row.prediction.advancingTeamId)?.shortName ??
                      teamById.get(row.prediction.advancingTeamId)?.name)
                    : null;
                return (
                  <li
                    key={row.playerId}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${
                      isMe ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""
                    }`}
                  >
                    {row.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
                      <img src={row.image} alt="" width={28} height={28} className="rounded-full" />
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">
                        ⚽
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
                    {row.prediction ? (
                      <span className="tabular-nums">
                        <span className="font-semibold">
                          {row.prediction.homeScore} – {row.prediction.awayScore}
                        </span>
                        {pickName && (
                          <span className="ml-1.5 text-xs text-zinc-500">→ {pickName}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs italic text-zinc-400">Sin pronóstico</span>
                    )}
                    {result && <PointsBadge tally={row.tally} />}
                  </li>
                );
              })}
            </ul>
            {match.status !== "finished" && result && (
              <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800">
                Puntos provisorios con el marcador actual.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function BigTeam({ team, align = "left" }: { team?: Team; align?: "left" | "right" }) {
  const alignClass = align === "right" ? "items-end text-right" : "items-start text-left";
  if (!team) {
    return <span className={`flex flex-col ${alignClass} text-sm italic text-zinc-400`}>Por definir</span>;
  }
  return (
    <span className={`flex flex-col gap-1.5 ${alignClass}`}>
      {team.crest && (
        // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
        <img src={team.crest} alt="" width={40} height={40} className="drop-shadow-sm" />
      )}
      <span className="text-base font-bold">{team.shortName ?? team.name}</span>
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
      className={`min-w-10 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums ${className}`}
    >
      +{points}
    </span>
  );
}
