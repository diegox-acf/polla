// Seed inicial: admin (allowlist) + fixture completo desde football-data.org.
// Idempotente: se puede re-ejecutar; hace upsert de equipos y partidos.
// Uso: npm run db:seed (requiere DATABASE_URL, FOOTBALL_DATA_TOKEN y ADMIN_EMAIL en .env)
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { matches, players, settings, teams } from "../lib/db/schema";
import {
  advancingTeamId,
  fetchWorldCupMatches,
  fetchWorldCupTeams,
  mapStatus,
  score90,
  type FdMatch,
  type FdTeamRef,
} from "../lib/football-data";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email)
    throw new Error("ADMIN_EMAIL no está definido (ver .env.example)");
  await db
    .insert(players)
    .values({ email, role: "admin", approved: true })
    .onConflictDoUpdate({
      target: players.email,
      set: { role: "admin", approved: true },
    });
  console.log(`✔ admin: ${email}`);
}

async function seedSettings() {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  console.log("✔ settings (fila única)");
}

function teamRows(apiTeams: FdTeamRef[], apiMatches: FdMatch[]) {
  // Une /teams con los equipos referenciados en /matches (por si difieren)
  const byId = new Map<number, FdTeamRef>();
  for (const t of apiTeams) {
    if (t.id != null && t.name != null) byId.set(t.id, t);
  }
  for (const m of apiMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t.id != null && t.name != null && !byId.has(t.id)) byId.set(t.id, t);
    }
  }
  return [...byId.values()].map((t) => ({
    id: t.id!,
    name: t.name!,
    shortName: t.shortName,
    tla: t.tla,
    crest: t.crest,
  }));
}

async function main() {
  await seedAdmin();
  await seedSettings();

  console.log("Descargando fixture del Mundial desde football-data.org...");
  const [apiTeams, apiMatches] = [
    await fetchWorldCupTeams(),
    await fetchWorldCupMatches(),
  ];

  const rows = teamRows(apiTeams, apiMatches);
  if (rows.length > 0) {
    await db
      .insert(teams)
      .values(rows)
      .onConflictDoUpdate({
        target: teams.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          tla: sql`excluded.tla`,
          crest: sql`excluded.crest`,
        },
      });
  }
  console.log(`✔ ${rows.length} equipos`);

  for (const m of apiMatches) {
    const s90 = score90(m.score);
    const row = {
      id: m.id,
      stage: m.stage,
      group: m.group,
      matchday: m.matchday,
      homeTeamId: m.homeTeam.id,
      awayTeamId: m.awayTeam.id,
      kickoff: new Date(m.utcDate),
      status: mapStatus(m.status),
      homeScore90: s90.home,
      awayScore90: s90.away,
      advancingTeamId: advancingTeamId(m),
      updatedAt: new Date(),
    };
    await db
      .insert(matches)
      .values(row)
      .onConflictDoUpdate({ target: matches.id, set: row });
  }
  console.log(`✔ ${apiMatches.length} partidos`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
