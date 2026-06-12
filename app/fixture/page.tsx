import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LocalTime } from "@/components/local-time";
import { db } from "@/lib/db";
import { matches, predictions, teams } from "@/lib/db/schema";
import { canPredict, isKnockoutStage } from "@/lib/predictions";
import { groupLabel, stageLabel } from "@/lib/stages";
import { PredictionForm } from "./prediction-form";

type Match = typeof matches.$inferSelect;
type Team = typeof teams.$inferSelect;
type Prediction = typeof predictions.$inferSelect;

export const metadata = { title: "Fixture — Polla Mundial 2026" };

export default async function FixturePage() {
  const session = await auth();
  const playerId = session?.user.playerId;
  if (typeof playerId !== "number") redirect("/");

  const [allMatches, allTeams, myPredictions] = await Promise.all([
    db.query.matches.findMany({ orderBy: [asc(matches.kickoff), asc(matches.id)] }),
    db.query.teams.findMany(),
    // Solo MIS pronósticos: los ajenos no se serializan hacia el cliente antes del kickoff
    db.query.predictions.findMany({ where: eq(predictions.playerId, playerId) }),
  ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const predictionByMatch = new Map(myPredictions.map((p) => [p.matchId, p]));
  const now = new Date();

  const pendingCount = allMatches.filter(
    (m) => canPredict(m, now) && !predictionByMatch.has(m.id),
  ).length;

  // Secciones en orden cronológico: fase de grupos por jornada, luego cada fase eliminatoria
  const sections: { key: string; title: string; matches: Match[] }[] = [];
  const sectionIndex = new Map<string, number>();
  for (const match of allMatches) {
    const key =
      match.stage === "GROUP_STAGE" ? `${match.stage}:${match.matchday ?? 0}` : match.stage;
    let index = sectionIndex.get(key);
    if (index === undefined) {
      index = sections.length;
      sectionIndex.set(key, index);
      sections.push({
        key,
        title:
          match.stage === "GROUP_STAGE" && match.matchday !== null
            ? `${stageLabel(match.stage)} — Jornada ${match.matchday}`
            : stageLabel(match.stage),
        matches: [],
      });
    }
    sections[index].matches.push(match);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Fixture</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Horarios en tu zona horaria. Puedes crear y editar cada pronóstico hasta el kickoff.
      </p>

      {pendingCount > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Tienes <strong>{pendingCount}</strong>{" "}
          {pendingCount === 1
            ? "partido abierto sin pronóstico"
            : "partidos abiertos sin pronóstico"}
          .
        </p>
      )}

      {allMatches.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">
          No hay partidos cargados todavía. Corre <code>npm run db:seed</code>.
        </p>
      )}

      <div className="mt-8 space-y-10">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  home={match.homeTeamId !== null ? teamById.get(match.homeTeamId) : undefined}
                  away={match.awayTeamId !== null ? teamById.get(match.awayTeamId) : undefined}
                  prediction={predictionByMatch.get(match.id)}
                  teamById={teamById}
                  now={now}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function MatchCard({
  match,
  home,
  away,
  prediction,
  teamById,
  now,
}: {
  match: Match;
  home?: Team;
  away?: Team;
  prediction?: Prediction;
  teamById: Map<number, Team>;
  now: Date;
}) {
  const open = canPredict(match, now);
  const hasScore = match.homeScore90 !== null && match.awayScore90 !== null;
  const advancing =
    match.advancingTeamId !== null ? teamById.get(match.advancingTeamId) : undefined;
  const crossUndefined = !home || !away;

  return (
    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{match.group ? groupLabel(match.group) : stageLabel(match.stage)}</span>
        <span className="flex items-center gap-2">
          <StatusBadge status={match.status} />
          <LocalTime iso={match.kickoff.toISOString()} />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={home} align="right" />
        <div className="text-center">
          {hasScore ? (
            <span className="text-xl font-bold tabular-nums">
              {match.homeScore90} – {match.awayScore90}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">vs</span>
          )}
          {advancing && (
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Clasificó {advancing.shortName ?? advancing.name}
            </p>
          )}
        </div>
        <TeamSide team={away} />
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        {open && home && away ? (
          <PredictionForm
            matchId={match.id}
            isKnockout={isKnockoutStage(match.stage)}
            homeTeamId={home.id}
            awayTeamId={away.id}
            homeTeamName={home.shortName ?? home.name}
            awayTeamName={away.shortName ?? away.name}
            initial={
              prediction
                ? {
                    homeScore: prediction.homeScore,
                    awayScore: prediction.awayScore,
                    advancingTeamId: prediction.advancingTeamId,
                  }
                : undefined
            }
          />
        ) : match.status === "scheduled" && crossUndefined ? (
          <p className="text-sm text-zinc-400">
            El pronóstico se habilita cuando se defina el cruce.
          </p>
        ) : (
          <MyLockedPrediction prediction={prediction} teamById={teamById} />
        )}
      </div>
    </article>
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
    <img src={team.crest} alt="" width={20} height={20} className="shrink-0" />
  ) : null;
  return (
    <span className={`flex items-center gap-2 text-sm font-medium ${alignClass}`}>
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

const STATUS_BADGES: Partial<Record<Match["status"], { label: string; className: string }>> = {
  in_play: {
    label: "En juego",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  paused: {
    label: "Entretiempo",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  finished: {
    label: "Final",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
  suspended: {
    label: "Suspendido",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  postponed: {
    label: "Postergado",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

function StatusBadge({ status }: { status: Match["status"] }) {
  const badge = STATUS_BADGES[status];
  if (!badge) return null; // scheduled: sin badge, la hora basta
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function MyLockedPrediction({
  prediction,
  teamById,
}: {
  prediction?: Prediction;
  teamById: Map<number, Team>;
}) {
  if (!prediction) {
    return <p className="text-sm text-zinc-400">Sin pronóstico (0 pts)</p>;
  }
  const advancing =
    prediction.advancingTeamId !== null ? teamById.get(prediction.advancingTeamId) : undefined;
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-300">
      Tu pronóstico:{" "}
      <span className="font-semibold tabular-nums">
        {prediction.homeScore} – {prediction.awayScore}
      </span>
      {advancing && <> · clasifica {advancing.shortName ?? advancing.name}</>}
    </p>
  );
}
