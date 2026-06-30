import { describe, expect, it } from "vitest";
import {
  advancingTeamId,
  penaltyScore,
  score90,
  type FdMatch,
  type FdScore,
} from "./football-data";

const match = (stage: string, status: FdMatch["status"], score: FdScore): FdMatch => ({
  id: 1,
  utcDate: "2026-06-29T20:30:00Z",
  status,
  matchday: null,
  stage,
  group: null,
  homeTeam: { id: 759, name: "Germany", shortName: "Germany", tla: "GER", crest: null },
  awayTeam: { id: 761, name: "Paraguay", shortName: "Paraguay", tla: "PAR", crest: null },
  score,
});

describe("advancingTeamId", () => {
  it("usa score.winner cuando está definido (gana en 90' o alargue)", () => {
    const m = match("LAST_16", "FINISHED", {
      winner: "AWAY_TEAM",
      duration: "REGULAR",
      fullTime: { home: 0, away: 1 },
      halfTime: { home: 0, away: 0 },
    });
    expect(advancingTeamId(m)).toBe(761);
  });

  it("penales con winner null: desempata por la tanda / fullTime", () => {
    // Caso real Germany 1-1 Paraguay (537415): football-data deja winner=null
    // y solo el fullTime (que ya incorpora la tanda) desempata → avanza Paraguay.
    const m = match("LAST_32", "FINISHED", {
      winner: null,
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 4, away: 5 },
      halfTime: { home: 0, away: 1 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 4, away: 4 },
    });
    expect(advancingTeamId(m)).toBe(761);
    // y el marcador de 90' sigue siendo el empate reglamentario
    expect(score90(m.score)).toEqual({ home: 1, away: 1 });
  });

  it("penales con tanda decisiva: gana quien metió más penales", () => {
    const m = match("LAST_32", "FINISHED", {
      winner: null,
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 1, away: 1 },
      halfTime: { home: 1, away: 1 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 5, away: 4 },
    });
    expect(advancingTeamId(m)).toBe(759);
  });
});

describe("penaltyScore", () => {
  it("deriva la tanda del fullTime cuando score.penalties viene mal (caso real 537415)", () => {
    // football-data trae penalties 4-4 (empate imposible), pero el fullTime
    // (4-5) ya incorpora la tanda: 4-5 menos el 1-1 reglamentario = 3-4.
    const score: FdScore = {
      winner: null,
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 4, away: 5 },
      halfTime: { home: 0, away: 1 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 4, away: 4 },
    };
    expect(penaltyScore(score)).toEqual({ home: 3, away: 4 });
  });

  it("usa score.penalties cuando el fullTime NO incluye la tanda (formato estándar)", () => {
    // fullTime = empate tras alargue (1-1); la tanda está solo en penalties.
    const score: FdScore = {
      winner: "HOME_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 1, away: 1 },
      halfTime: { home: 0, away: 0 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 5, away: 4 },
    };
    expect(penaltyScore(score)).toEqual({ home: 5, away: 4 });
  });

  it("partido sin penales: null", () => {
    const score: FdScore = {
      winner: "AWAY_TEAM",
      duration: "REGULAR",
      fullTime: { home: 0, away: 1 },
      halfTime: { home: 0, away: 0 },
    };
    expect(penaltyScore(score)).toBeNull();
  });
});

describe("advancingTeamId — más casos", () => {
  it("fase de grupos: siempre null", () => {
    const m = match("GROUP_STAGE", "FINISHED", {
      winner: "HOME_TEAM",
      duration: "REGULAR",
      fullTime: { home: 2, away: 0 },
      halfTime: { home: 1, away: 0 },
    });
    expect(advancingTeamId(m)).toBeNull();
  });

  it("partido no terminado: null", () => {
    const m = match("LAST_16", "IN_PLAY", {
      winner: null,
      duration: "REGULAR",
      fullTime: { home: 1, away: 1 },
      halfTime: { home: 0, away: 0 },
    });
    expect(advancingTeamId(m)).toBeNull();
  });
});
