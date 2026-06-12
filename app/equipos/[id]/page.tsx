import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import {
  fetchTeamDetail,
  fetchWorldCupScorers,
  type FdSquadMember,
  type FdTeamDetail,
} from "@/lib/football-data";
import { fetchSquadInfo, initials, type PlayerInfo } from "@/lib/player-photos";

export const metadata = { title: "Equipo — Polla Mundial 2026" };

// Buckets de posición (la API mezcla genéricos "Defence" y específicos "Centre-Back")
const POSITION_BUCKETS: { title: string; emoji: string; abbr: string; matches: string[] }[] = [
  { title: "Porteros", emoji: "🧤", abbr: "POR", matches: ["goalkeeper"] },
  { title: "Defensas", emoji: "🛡️", abbr: "DEF", matches: ["defence", "defender", "back"] },
  { title: "Mediocampistas", emoji: "🎯", abbr: "MED", matches: ["midfield"] },
  {
    title: "Delanteros",
    emoji: "⚡",
    abbr: "DEL",
    matches: ["offence", "attack", "forward", "winger", "striker"],
  },
];

function bucketFor(position: string | null): string {
  const p = (position ?? "").toLowerCase();
  for (const bucket of POSITION_BUCKETS) {
    if (bucket.matches.some((m) => p.includes(m))) return bucket.title;
  }
  return "Otros";
}

function age(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// Carta estilo álbum: marco degradado (dorado si ya marcó en el Mundial),
// posición + escudo arriba, foto grande, nombre, club y barra de stats.
function PlayerCard({
  member,
  info,
  goals,
  abbr,
  crest,
}: {
  member: FdSquadMember;
  info?: PlayerInfo;
  goals: number;
  abbr: string;
  crest: string | null;
}) {
  const years = age(member.dateOfBirth);
  const photo = info?.photo ?? null;
  const isScorer = goals > 0;

  return (
    <div
      className={`group rounded-2xl p-[2px] shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
        isScorer
          ? "bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-700 hover:shadow-amber-500/30"
          : "bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 hover:shadow-emerald-500/25"
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[14px] bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between px-3 pt-2.5">
          <span
            className={`text-sm font-black tracking-wider ${
              isScorer
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {abbr}
          </span>
          {crest && (
            // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
            <img src={crest} alt="" width={22} height={22} className="drop-shadow-sm" />
          )}
        </div>

        <div className="mt-1.5 flex justify-center">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto remota de TheSportsDB, tamaño fijo
            <img
              src={`${photo}/preview`}
              alt=""
              width={128}
              height={128}
              loading="lazy"
              className="size-32 rounded-full bg-gradient-to-b from-emerald-50 to-zinc-100 object-cover object-top transition-transform duration-300 ease-out group-hover:scale-110 dark:from-emerald-950 dark:to-zinc-800"
            />
          ) : (
            <span className="flex size-32 items-center justify-center rounded-full bg-gradient-to-b from-emerald-50 to-zinc-100 text-3xl font-bold text-emerald-700 transition-transform duration-300 ease-out group-hover:scale-110 dark:from-emerald-950 dark:to-zinc-800 dark:text-emerald-400">
              {initials(member.name)}
            </span>
          )}
        </div>

        <h3 className="mt-2.5 line-clamp-2 px-2 text-center text-sm font-extrabold uppercase leading-tight tracking-tight">
          {member.name}
        </h3>
        <p className="mb-2 mt-0.5 truncate px-2 text-center text-[11px] text-zinc-400">
          {info?.club ?? " "}
        </p>

        <div className="mt-auto grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          <CardStat label="Edad" value={years !== null ? String(years) : "—"} />
          <CardStat label="Goles" value={String(goals)} highlight={isScorer} />
          <CardStat label="Altura" value={info?.height?.replace(" ", "") ?? "—"} />
        </div>
      </div>
    </div>
  );
}

function CardStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-1 py-2 text-center">
      <p
        className={`text-[13px] font-extrabold tabular-nums ${
          highlight ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  );
}

export default async function EquipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();

  const session = await auth();
  if (typeof session?.user.playerId !== "number") redirect("/");

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) notFound();

  let detail: FdTeamDetail | null = null;
  try {
    detail = await fetchTeamDetail(teamId);
  } catch {
    // API caída: mostramos lo que tenemos en DB y un aviso
  }

  // Fotos/club/altura desde TheSportsDB + goles del torneo desde football-data
  const [squadInfo, scorers] = detail
    ? await Promise.all([
        fetchSquadInfo(
          team.name,
          detail.squad.map((m) => m.name),
        ),
        fetchWorldCupScorers(50).catch(() => []),
      ])
    : [new Map<string, PlayerInfo>(), []];

  // Los goles vienen de la misma fuente que la nómina: el nombre matchea exacto
  const goalsByName = new Map(
    scorers.filter((s) => s.team.id === teamId).map((s) => [s.player.name, s.goals]),
  );

  const squad = detail?.squad ?? [];
  const buckets = new Map<string, FdSquadMember[]>();
  for (const member of squad) {
    const key = bucketFor(member.position);
    const list = buckets.get(key) ?? [];
    list.push(member);
    buckets.set(key, list);
  }
  const orderedBuckets = [...POSITION_BUCKETS.map((b) => b.title), "Otros"]
    .filter((title) => buckets.has(title))
    .map((title) => {
      const bucket = POSITION_BUCKETS.find((b) => b.title === title);
      return {
        title,
        emoji: bucket?.emoji ?? "📋",
        abbr: bucket?.abbr ?? "JUG",
        members: buckets.get(title)!,
      };
    });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/equipos"
        className="text-sm text-zinc-500 underline-offset-4 hover:text-emerald-700 hover:underline dark:text-zinc-400 dark:hover:text-emerald-400"
      >
        ← Todos los equipos
      </Link>

      {/* Cabecera */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {team.crest ? (
          // eslint-disable-next-line @next/next/no-img-element -- crest remoto de football-data, tamaño fijo
          <img src={team.crest} alt="" width={64} height={64} className="drop-shadow-sm" />
        ) : (
          <span className="text-5xl">⚽</span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{team.name}</h1>
          {detail?.coach?.name && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              DT: <span className="font-medium">{detail.coach.name}</span>
            </p>
          )}
          {squad.length > 0 && (
            <p className="text-xs text-zinc-400">{squad.length} jugadores en la nómina</p>
          )}
        </div>
      </div>

      {!detail && (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No se pudo cargar el plantel en este momento. Intenta de nuevo en unos minutos.
        </p>
      )}

      {detail && squad.length === 0 && (
        <p className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          football-data.org todavía no publica la nómina de este equipo.
        </p>
      )}

      {/* Plantel por posición */}
      <div className="mt-8 space-y-8">
        {orderedBuckets.map((bucket) => (
          <section key={bucket.title}>
            <h2 className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span aria-hidden className="h-4 w-1 rounded-full bg-emerald-500" />
              {bucket.emoji} {bucket.title} ({bucket.members.length})
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {bucket.members.map((member) => (
                <PlayerCard
                  key={member.id}
                  member={member}
                  info={squadInfo.get(member.name)}
                  goals={goalsByName.get(member.name) ?? 0}
                  abbr={bucket.abbr}
                  crest={team.crest}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
