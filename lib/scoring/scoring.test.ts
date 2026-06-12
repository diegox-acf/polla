import { describe, expect, it } from "vitest";
import {
  computeStandings,
  scoreBonus,
  scoreMatch,
  type BonusOutcome,
  type MatchOutcome,
  type PlayerInput,
} from "./scoring";

const group = (home: number, away: number): MatchOutcome => ({
  stage: "GROUP_STAGE",
  homeScore90: home,
  awayScore90: away,
  advancingTeamId: null,
});

const knockout = (home: number, away: number, advancing: number | null): MatchOutcome => ({
  stage: "LAST_16",
  homeScore90: home,
  awayScore90: away,
  advancingTeamId: advancing,
});

describe("scoreMatch — fase de grupos", () => {
  it("marcador exacto: 3 puntos", () => {
    const t = scoreMatch({ homeScore: 2, awayScore: 1, advancingTeamId: null }, group(2, 1));
    expect(t).toEqual({ points: 3, exact: true, outcomeOnly: false, advancing: false });
  });

  it("solo el resultado (gana local): 1 punto", () => {
    const t = scoreMatch({ homeScore: 3, awayScore: 0, advancingTeamId: null }, group(2, 1));
    expect(t).toEqual({ points: 1, exact: false, outcomeOnly: true, advancing: false });
  });

  it("empate pronosticado y empate real con otro marcador: 1 punto", () => {
    const t = scoreMatch({ homeScore: 0, awayScore: 0, advancingTeamId: null }, group(2, 2));
    expect(t.points).toBe(1);
  });

  it("nada: 0 puntos", () => {
    const t = scoreMatch({ homeScore: 0, awayScore: 2, advancingTeamId: null }, group(2, 1));
    expect(t.points).toBe(0);
  });
});

describe("scoreMatch — eliminatorias", () => {
  it("exacto + clasificado: 4 puntos", () => {
    const t = scoreMatch({ homeScore: 2, awayScore: 1, advancingTeamId: 1 }, knockout(2, 1, 1));
    expect(t).toEqual({ points: 4, exact: true, outcomeOnly: false, advancing: true });
  });

  it("marcador errado pero clasificado correcto: solo el +1", () => {
    // pronosticó 2-0 local, fue 0-1 visita: 0 por marcador, pero el local avanzó en... no:
    // avanzó el equipo 2 (visita) y el jugador eligió el 2 → +1
    const t = scoreMatch({ homeScore: 0, awayScore: 2, advancingTeamId: 2 }, knockout(1, 0, 1));
    expect(t.points).toBe(0);
    const t2 = scoreMatch({ homeScore: 0, awayScore: 2, advancingTeamId: 2 }, knockout(0, 1, 2));
    expect(t2.points).toBe(2); // 1 (resultado) + 1 (clasificado)
  });

  it("empate a 90' real: el +1 depende del pick explícito", () => {
    // partido terminó 1-1 y clasificó el equipo 2 por penales
    const conPick = scoreMatch({ homeScore: 1, awayScore: 1, advancingTeamId: 2 }, knockout(1, 1, 2));
    expect(conPick).toEqual({ points: 4, exact: true, outcomeOnly: false, advancing: true });
    const pickErrado = scoreMatch({ homeScore: 1, awayScore: 1, advancingTeamId: 1 }, knockout(1, 1, 2));
    expect(pickErrado.points).toBe(3);
  });

  it("sin resultado de clasificado todavía: no suma el +1", () => {
    const t = scoreMatch({ homeScore: 2, awayScore: 1, advancingTeamId: 1 }, knockout(2, 1, null));
    expect(t.points).toBe(3);
    expect(t.advancing).toBe(false);
  });
});

describe("scoreBonus", () => {
  const outcome: BonusOutcome = { championTeamId: 10, finalistTeamIds: [10, 20] };

  it("todo acertado: 15 + 10 + 5 + 5 = 35", () => {
    const t = scoreBonus(
      { championTeamId: 10, finalist1TeamId: 20, finalist2TeamId: 10, topScorerCorrect: true },
      outcome,
    );
    expect(t.points).toBe(35);
    expect(t.finalistsCorrect).toBe(2);
  });

  it("finalistas sin importar el lado del bracket", () => {
    const t = scoreBonus(
      { championTeamId: 99, finalist1TeamId: 20, finalist2TeamId: 30, topScorerCorrect: false },
      outcome,
    );
    expect(t.points).toBe(5);
    expect(t.championCorrect).toBe(false);
  });

  it("antes de definirse la final: 0 (salvo goleador marcado)", () => {
    const t = scoreBonus(
      { championTeamId: 10, finalist1TeamId: 10, finalist2TeamId: 20, topScorerCorrect: false },
      { championTeamId: null, finalistTeamIds: [] },
    );
    expect(t.points).toBe(0);
  });

  it("picks vacíos: 0", () => {
    const t = scoreBonus(
      { championTeamId: null, finalist1TeamId: null, finalist2TeamId: null, topScorerCorrect: false },
      outcome,
    );
    expect(t.points).toBe(0);
  });
});

describe("computeStandings — desempates REGLAS.md §3", () => {
  const noBonus: BonusOutcome = { championTeamId: null, finalistTeamIds: [] };

  const playerWith = (
    playerId: number,
    preds: { prediction: [number, number, number | null]; result: MatchOutcome }[],
    bonus: PlayerInput["bonus"] = null,
  ): PlayerInput => ({
    playerId,
    predictions: preds.map((p) => ({
      prediction: {
        homeScore: p.prediction[0],
        awayScore: p.prediction[1],
        advancingTeamId: p.prediction[2],
      },
      result: p.result,
    })),
    bonus,
  });

  it("ordena por total y desempata por exactos, señalizándolo", () => {
    // Ambos 3 puntos: A con un exacto (3), B con tres resultados (1+1+1)
    const a = playerWith(1, [{ prediction: [2, 1, null], result: group(2, 1) }]);
    const b = playerWith(2, [
      { prediction: [1, 0, null], result: group(2, 0) },
      { prediction: [1, 0, null], result: group(3, 1) },
      { prediction: [0, 1, null], result: group(1, 2) },
    ]);
    const rows = computeStandings([b, a], noBonus);
    expect(rows.map((r) => r.playerId)).toEqual([1, 2]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
    expect(rows[0].tiebrokenBy).toBe("exactos");
    expect(rows[1].tiebrokenBy).toBe("exactos");
  });

  it("mismos exactos: desempata por puntos en eliminatorias", () => {
    // Ambos: 1 exacto en grupos (3 pts) + 1 punto extra → 4 pts totales.
    // A consigue su punto extra en eliminatorias (resultado ok, clasificado errado),
    // B en grupos.
    const a = playerWith(1, [
      { prediction: [2, 1, null], result: group(2, 1) },
      { prediction: [1, 0, 2], result: knockout(2, 0, 1) },
    ]);
    const b = playerWith(2, [
      { prediction: [2, 1, null], result: group(2, 1) },
      { prediction: [1, 0, null], result: group(2, 0) },
    ]);
    const rows = computeStandings([b, a], noBonus);
    expect(rows.map((r) => r.playerId)).toEqual([1, 2]);
    expect(rows[0].tiebrokenBy).toBe("eliminatorias");
  });

  it("empate en todo: comparten rank", () => {
    const a = playerWith(1, [{ prediction: [1, 0, null], result: group(2, 0) }]);
    const b = playerWith(2, [{ prediction: [1, 0, null], result: group(3, 0) }]);
    const rows = computeStandings([a, b], noBonus);
    expect(rows.map((r) => r.rank)).toEqual([1, 1]);
    expect(rows[0].tiebrokenBy).toBe("compartido");
    expect(rows[1].tiebrokenBy).toBe("compartido");
  });

  it("el bonus entra al total y el campeón desempata al final", () => {
    const outcome: BonusOutcome = { championTeamId: 10, finalistTeamIds: [10, 20] };
    // A y B: mismos puntos de partidos (0), mismo bonus total (15 por distintas vías
    // no es posible aquí; usamos goleador 10 + finalista 5 vs campeón 15)
    const a = playerWith(
      1,
      [],
      { championTeamId: 10, finalist1TeamId: 99, finalist2TeamId: 98, topScorerCorrect: false },
    );
    const b = playerWith(
      2,
      [],
      { championTeamId: 99, finalist1TeamId: 10, finalist2TeamId: 98, topScorerCorrect: true },
    );
    const rows = computeStandings([a, b], outcome);
    // ambos 15 pts, 0 exactos, 0 KO → desempata "acertó el campeón": gana A
    expect(rows.map((r) => r.playerId)).toEqual([1, 2]);
    expect(rows[0].tiebrokenBy).toBe("campeon");
  });

  it("sin pronósticos ni bonus: 0 puntos, no revienta", () => {
    const rows = computeStandings([playerWith(7, [])], noBonus);
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(0);
    expect(rows[0].rank).toBe(1);
  });
});
