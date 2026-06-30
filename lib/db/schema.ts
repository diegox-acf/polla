import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const playerRole = pgEnum("player_role", ["admin", "player"]);

// Estados normalizados desde football-data.org (SCHEDULED/TIMED se colapsan en "scheduled")
export const matchStatus = pgEnum("match_status", [
  "scheduled",
  "in_play",
  "paused",
  "finished",
  "suspended",
  "postponed",
  "cancelled",
]);

export const resultSource = pgEnum("result_source", ["api", "admin"]);

// Registro abierto: cualquiera entra con Google y se crea su fila, pero queda
// inactivo (approved=false) hasta que el admin lo apruebe. El perfil
// (nombre/foto) se completa desde Google en el primer login.
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: playerRole("role").notNull().default("player"),
  // Gate de acceso: sin aprobación del admin el jugador no puede interactuar.
  approved: boolean("approved").notNull().default(false),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Los ids de teams y matches son los de football-data.org, para que el sync sea un upsert directo.
export const teams = pgTable("teams", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  tla: text("tla"),
  crest: text("crest"),
});

export const matches = pgTable("matches", {
  id: integer("id").primaryKey(),
  stage: text("stage").notNull(),
  group: text("group"),
  matchday: integer("matchday"),
  // null mientras el cruce eliminatorio no esté definido
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  kickoff: timestamp("kickoff", { withTimezone: true }).notNull(),
  status: matchStatus("status").notNull().default("scheduled"),
  // marcador al final de los 90' (REGLAS.md: alargue y penales no cuentan)
  homeScore90: integer("home_score_90"),
  awayScore90: integer("away_score_90"),
  // solo eliminatorias: quién clasificó (sí considera alargue/penales)
  advancingTeamId: integer("advancing_team_id").references(() => teams.id),
  // marcador de la tanda de penales (null si el partido no fue a penales).
  // No afecta el puntaje (el marcador se evalúa a los 90'); es solo para mostrar.
  homePenalties: integer("home_penalties"),
  awayPenalties: integer("away_penalties"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id),
    matchId: integer("match_id").notNull().references(() => matches.id),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    // solo eliminatorias
    advancingTeamId: integer("advancing_team_id").references(() => teams.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.playerId, t.matchId)],
);

// Append-only: evidencia ante disputas ("yo había puesto 2-1")
export const predictionAudit = pgTable("prediction_audit", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => players.id),
  matchId: integer("match_id").notNull().references(() => matches.id),
  prevHomeScore: integer("prev_home_score"),
  prevAwayScore: integer("prev_away_score"),
  prevAdvancingTeamId: integer("prev_advancing_team_id"),
  newHomeScore: integer("new_home_score").notNull(),
  newAwayScore: integer("new_away_score").notNull(),
  newAdvancingTeamId: integer("new_advancing_team_id"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only: todo cambio de resultado, venga del sync o del admin
export const resultAudit = pgTable("result_audit", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  source: resultSource("source").notNull(),
  actorPlayerId: integer("actor_player_id").references(() => players.id),
  prevHomeScore: integer("prev_home_score"),
  prevAwayScore: integer("prev_away_score"),
  prevAdvancingTeamId: integer("prev_advancing_team_id"),
  newHomeScore: integer("new_home_score"),
  newAwayScore: integer("new_away_score"),
  newAdvancingTeamId: integer("new_advancing_team_id"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bonusPicks = pgTable("bonus_picks", {
  playerId: integer("player_id").primaryKey().references(() => players.id),
  championTeamId: integer("champion_team_id").references(() => teams.id),
  topScorer: text("top_scorer"),
  finalist1TeamId: integer("finalist1_team_id").references(() => teams.id),
  finalist2TeamId: integer("finalist2_team_id").references(() => teams.id),
  // El goleador es texto libre: el admin marca al final del torneo si acertó
  // (empate de goleadores incluido — basta estar entre ellos, REGLAS.md §2)
  topScorerCorrect: boolean("top_scorer_correct").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Fila única (id = 1)
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  entryAmount: integer("entry_amount").notNull().default(0),
  currency: text("currency").notNull().default("BOB"),
  bonusDeadline: timestamp("bonus_deadline", { withTimezone: true }),
  prizeFirstPct: integer("prize_first_pct").notNull().default(60),
  prizeSecondPct: integer("prize_second_pct").notNull().default(30),
  prizeThirdPct: integer("prize_third_pct").notNull().default(10),
});
