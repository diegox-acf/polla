// View-models que el server component (page.tsx) arma y pasa a los
// componentes cliente con tabs/filtros. Todo serializable (fechas como ISO).

export type PlayerVM = {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "player";
  approved: boolean;
  paid: boolean;
  topScorer: string | null;
  topScorerCorrect: boolean;
  // Solo se puede quitar a jugadores sin pronósticos ni picks (y nunca a ti mismo)
  deletable: boolean;
};

export type TeamVM = {
  id: number;
  name: string;
  shortName: string | null;
  crest: string | null;
};

export type MatchVM = {
  id: number;
  stage: string;
  group: string | null;
  kickoffIso: string;
  status: string;
  isKnockout: boolean;
  hasResult: boolean;
  homeScore90: number | null;
  awayScore90: number | null;
  advancingTeamId: number | null;
  home: TeamVM;
  away: TeamVM;
};

export type SettingsVM = {
  entryAmount: number;
  currency: string;
  // Listo para <input type="datetime-local"> (UTC, sin segundos). "" = sin deadline.
  bonusDeadlineLocal: string;
};
