// Cliente de football-data.org (v4). Free tier: incluye el Mundial (WC), 10 req/min.

const BASE_URL = "https://api.football-data.org/v4";

export interface FdTeamRef {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

export interface FdScoreSide {
  home: number | null;
  away: number | null;
}

export interface FdScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  fullTime: FdScoreSide;
  halfTime: FdScoreSide;
  // presente cuando duration !== REGULAR
  regularTime?: FdScoreSide;
  extraTime?: FdScoreSide;
  penalties?: FdScoreSide;
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "SUSPENDED"
    | "POSTPONED"
    | "CANCELLED"
    | "AWARDED";
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FdTeamRef;
  awayTeam: FdTeamRef;
  score: FdScore;
}

// `revalidateSeconds` cachea la respuesta en el data cache de Next (una sola
// llamada real cada N segundos, compartida entre todos los usuarios) — clave
// para el free tier de 10 req/min.
async function fdFetch<T>(path: string, revalidateSeconds?: number): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error("FOOTBALL_DATA_TOKEN no está definido (ver .env.example)");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
    ...(revalidateSeconds !== undefined && { next: { revalidate: revalidateSeconds } }),
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} respondió ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWorldCupTeams(): Promise<FdTeamRef[]> {
  const data = await fdFetch<{ teams: FdTeamRef[] }>("/competitions/WC/teams");
  return data.teams;
}

export async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const data = await fdFetch<{ matches: FdMatch[] }>("/competitions/WC/matches");
  return data.matches;
}

// --- Tablas de grupos en vivo ---

export interface FdTableEntry {
  position: number;
  team: FdTeamRef;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FdStanding {
  stage: string;
  type: "TOTAL" | "HOME" | "AWAY";
  group: string | null;
  table: FdTableEntry[];
}

// Cacheado 10 min: las tablas solo cambian al terminar partidos.
// Ojo: en este endpoint el Mundial reporta stage "ALL" y group "Group A"
// (legible, distinto del "GROUP_A" de /matches).
export async function fetchWorldCupStandings(): Promise<FdStanding[]> {
  const data = await fdFetch<{ standings: FdStanding[] }>(
    "/competitions/WC/standings",
    600,
  );
  return data.standings.filter((s) => s.type === "TOTAL" && s.group !== null);
}

// --- Goleadores (Bota de Oro) ---

export interface FdScorer {
  player: { id: number; name: string; nationality: string | null };
  team: FdTeamRef;
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

// Cacheado 10 min
export async function fetchWorldCupScorers(limit = 10): Promise<FdScorer[]> {
  const data = await fdFetch<{ scorers: FdScorer[] }>(
    `/competitions/WC/scorers?limit=${limit}`,
    600,
  );
  return data.scorers;
}

// --- Plantel de un equipo ---

export interface FdSquadMember {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
}

export interface FdTeamDetail {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  area: { name: string; flag: string | null } | null;
  coach: { name: string | null; nationality: string | null } | null;
  squad: FdSquadMember[];
}

// Cacheado 24 h: las nóminas casi no cambian durante el torneo. Se consulta
// un equipo por visita (nunca los 48 de golpe), así que el rate limit no sufre.
export async function fetchTeamDetail(teamId: number): Promise<FdTeamDetail> {
  return fdFetch<FdTeamDetail>(`/teams/${teamId}`, 86400);
}

// Marcador al final de los 90' (REGLAS.md). Si hubo alargue, football-data
// deja el resultado reglamentario en score.regularTime.
export function score90(score: FdScore): FdScoreSide {
  if (score.duration !== "REGULAR" && score.regularTime) {
    return score.regularTime;
  }
  return score.fullTime;
}

// Quién clasifica en eliminatorias (sí considera alargue/penales). null en
// fase de grupos o partidos no terminados.
export function advancingTeamId(match: FdMatch): number | null {
  if (match.stage === "GROUP_STAGE") return null;
  if (match.status !== "FINISHED" && match.status !== "AWARDED") return null;
  if (match.score.winner === "HOME_TEAM") return match.homeTeam.id;
  if (match.score.winner === "AWAY_TEAM") return match.awayTeam.id;
  return null;
}

const STATUS_MAP = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "in_play",
  PAUSED: "paused",
  FINISHED: "finished",
  AWARDED: "finished",
  SUSPENDED: "suspended",
  POSTPONED: "postponed",
  CANCELLED: "cancelled",
} as const;

export type MatchStatus = (typeof STATUS_MAP)[keyof typeof STATUS_MAP];

export function mapStatus(status: FdMatch["status"]): MatchStatus {
  return STATUS_MAP[status];
}
