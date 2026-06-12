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

async function fdFetch<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error("FOOTBALL_DATA_TOKEN no está definido (ver .env.example)");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
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
