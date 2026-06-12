import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LocalTime } from "@/components/local-time";
import { Mascotas } from "@/components/mascotas";
import { db } from "@/lib/db";
import { matches, predictions, teams } from "@/lib/db/schema";
import { canPredict, isKnockoutStage } from "@/lib/predictions";
import { groupLabel, stageLabel, stageShortLabel, stageSlug } from "@/lib/stages";
import { PredictionForm } from "./prediction-form";

type Match = typeof matches.$inferSelect;
type Team = typeof teams.$inferSelect;
type Prediction = typeof predictions.$inferSelect;

export const metadata = { title: "Fixture — Polla Mundial 2026" };

export default async function FixturePage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const { fase } = await searchParams;
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
  interface Section {
    slug: string;
    title: string;
    shortTitle: string;
    matches: Match[];
    pending: number;
  }
  const sections: Section[] = [];
  const sectionIndex = new Map<string, number>();
  for (const match of allMatches) {
    const isGroup = match.stage === "GROUP_STAGE";
    const slug = isGroup ? `jornada-${match.matchday ?? 0}` : stageSlug(match.stage);
    let index = sectionIndex.get(slug);
    if (index === undefined) {
      index = sections.length;
      sectionIndex.set(slug, index);
      sections.push({
        slug,
        title:
          isGroup && match.matchday !== null
            ? `${stageLabel(match.stage)} — Jornada ${match.matchday}`
            : stageLabel(match.stage),
        shortTitle: isGroup ? `J${match.matchday ?? "?"}` : stageShortLabel(match.stage),
        matches: [],
        pending: 0,
      });
    }
    sections[index].matches.push(match);
    if (canPredict(match, now) && !predictionByMatch.has(match.id)) {
      sections[index].pending++;
    }
  }

  // Sin filtro en la URL: aterriza en la fase "vigente" (próximo partido o en juego)
  const isCurrent = (m: Match) =>
    m.status === "in_play" ||
    m.status === "paused" ||
    (m.status === "scheduled" && m.kickoff.getTime() >= now.getTime());
  const defaultSlug =
    (sections.find((s) => s.matches.some(isCurrent)) ?? sections.at(-1))?.slug ?? null;
  const activeSlug =
    fase === "todos" ? null : sections.some((s) => s.slug === fase) ? fase! : defaultSlug;
  const visibleSections = activeSlug
    ? sections.filter((s) => s.slug === activeSlug)
    : sections;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Fixture</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Horarios en tu zona horaria. Puedes crear y editar cada pronóstico hasta el kickoff.
      </p>

      {pendingCount > 0 && (
        <p className="mt-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span aria-hidden>⏳</span>
          <span>
            Tienes <strong>{pendingCount}</strong>{" "}
            {pendingCount === 1
              ? "partido abierto sin pronóstico"
              : "partidos abiertos sin pronóstico"}
            .
          </span>
        </p>
      )}

      {allMatches.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Mascotas className="h-28 w-auto" />
          <p className="text-sm text-zinc-500">
            No hay partidos cargados todavía. Corre <code>npm run db:seed</code>.
          </p>
        </div>
      )}

      {/* Filtro por jornada / fase */}
      <nav
        aria-label="Filtrar por fase"
        className="sticky top-[53px] z-[5] -mx-4 mt-5 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur"
      >
        <div className="flex w-max items-center gap-1.5">
          <FilterChip href="/fixture?fase=todos" active={activeSlug === null}>
            Todos
          </FilterChip>
          {sections.map((section) => (
            <FilterChip
              key={section.slug}
              href={`/fixture?fase=${section.slug}`}
              active={section.slug === activeSlug}
            >
              {section.shortTitle}
              {section.pending > 0 && (
                <span
                  aria-label={`${section.pending} pendientes`}
                  className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500"
                />
              )}
            </FilterChip>
          ))}
        </div>
      </nav>

      <div className="mt-4 space-y-10">
        {visibleSections.map((section) => (
          <section key={section.slug}>
            <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
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

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex shrink-0 items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
          : "flex shrink-0 items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
      }
    >
      {children}
    </Link>
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
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium dark:bg-zinc-800">
            {match.group ? groupLabel(match.group) : stageLabel(match.stage)}
          </span>
          {open && (
            <span
              className={
                prediction
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : "rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
              }
            >
              {prediction ? "Listo ✓" : "Pendiente"}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge status={match.status} />
          <LocalTime iso={match.kickoff.toISOString()} />
        </span>
      </div>

      <Link
        href={`/partido/${match.id}`}
        title="Ver detalle del partido"
        className="mt-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <TeamSide team={home} align="right" />
        <div className="min-w-16 text-center">
          {hasScore ? (
            <span className="text-2xl font-extrabold tabular-nums">
              {match.homeScore90} – {match.awayScore90}
            </span>
          ) : (
            <span className="text-xs font-medium uppercase text-zinc-400">vs</span>
          )}
          {advancing && (
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Clasificó {advancing.shortName ?? advancing.name}
            </p>
          )}
        </div>
        <TeamSide team={away} />
      </Link>

      <div className="mt-3.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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
    <img src={team.crest} alt="" width={24} height={24} className="shrink-0 drop-shadow-sm" />
  ) : null;
  return (
    <span className={`flex items-center gap-2.5 text-sm font-semibold ${alignClass}`}>
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
    label: "● En juego",
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
