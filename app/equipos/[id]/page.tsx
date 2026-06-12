import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { fetchTeamDetail, type FdSquadMember, type FdTeamDetail } from "@/lib/football-data";
import { fetchSquadPhotos, initials } from "@/lib/player-photos";

export const metadata = { title: "Equipo — Polla Mundial 2026" };

// Buckets de posición (la API mezcla genéricos "Defence" y específicos "Centre-Back")
const POSITION_BUCKETS: { title: string; emoji: string; matches: string[] }[] = [
  { title: "Porteros", emoji: "🧤", matches: ["goalkeeper"] },
  { title: "Defensas", emoji: "🛡️", matches: ["defence", "defender", "back"] },
  { title: "Mediocampistas", emoji: "🎯", matches: ["midfield"] },
  { title: "Delanteros", emoji: "⚡", matches: ["offence", "attack", "forward", "winger", "striker"] },
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

  // Fotos desde TheSportsDB (cobertura parcial; sin foto → avatar de iniciales)
  const photos = detail
    ? await fetchSquadPhotos(
        team.name,
        detail.squad.map((m) => m.name),
      )
    : new Map<string, string>();

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
    .map((title) => ({
      title,
      emoji: POSITION_BUCKETS.find((b) => b.title === title)?.emoji ?? "📋",
      members: buckets.get(title)!,
    }));

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
              {bucket.members.map((member) => {
                const years = age(member.dateOfBirth);
                const photo = photos.get(member.name) ?? null;
                return (
                  <div
                    key={member.id}
                    className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto remota de TheSportsDB, tamaño fijo
                      <img
                        src={`${photo}/preview`}
                        alt=""
                        width={80}
                        height={80}
                        loading="lazy"
                        className="size-20 rounded-full bg-gradient-to-b from-emerald-50 to-zinc-100 object-cover object-top dark:from-emerald-950 dark:to-zinc-800"
                      />
                    ) : (
                      <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-b from-emerald-50 to-zinc-100 text-xl font-bold text-emerald-700 dark:from-emerald-950 dark:to-zinc-800 dark:text-emerald-400">
                        {initials(member.name)}
                      </span>
                    )}
                    <span className="mt-2.5 line-clamp-2 text-sm font-semibold leading-tight">
                      {member.name}
                    </span>
                    {years !== null && (
                      <span className="mt-1 text-xs text-zinc-400 tabular-nums">{years} años</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
