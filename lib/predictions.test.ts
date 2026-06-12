import { describe, expect, it } from "vitest";
import { canPredict, isKnockoutStage, resolveAdvancingTeamId } from "./predictions";

const match = {
  status: "scheduled",
  kickoff: new Date("2026-06-20T18:00:00Z"),
  homeTeamId: 1,
  awayTeamId: 2,
};
const beforeKickoff = new Date("2026-06-20T17:59:59Z");
const atKickoff = new Date("2026-06-20T18:00:00Z");

describe("canPredict", () => {
  it("permite pronosticar antes del kickoff", () => {
    expect(canPredict(match, beforeKickoff)).toBe(true);
  });

  it("bloquea en el kickoff exacto", () => {
    expect(canPredict(match, atKickoff)).toBe(false);
  });

  it("bloquea si el partido ya no está programado", () => {
    expect(canPredict({ ...match, status: "in_play" }, beforeKickoff)).toBe(false);
    expect(canPredict({ ...match, status: "finished" }, beforeKickoff)).toBe(false);
  });

  it("bloquea cruces eliminatorios sin equipos definidos", () => {
    expect(canPredict({ ...match, homeTeamId: null }, beforeKickoff)).toBe(false);
    expect(canPredict({ ...match, awayTeamId: null }, beforeKickoff)).toBe(false);
  });
});

describe("isKnockoutStage", () => {
  it("solo la fase de grupos no es eliminatoria", () => {
    expect(isKnockoutStage("GROUP_STAGE")).toBe(false);
    expect(isKnockoutStage("LAST_16")).toBe(true);
    expect(isKnockoutStage("FINAL")).toBe(true);
  });
});

describe("resolveAdvancingTeamId", () => {
  const knockout = { stage: "LAST_16", homeTeamId: 1, awayTeamId: 2 };

  it("fase de grupos: siempre null, aunque venga un pick", () => {
    expect(
      resolveAdvancingTeamId({
        stage: "GROUP_STAGE",
        homeScore: 1,
        awayScore: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        pickedTeamId: 1,
      }),
    ).toEqual({ ok: true, advancingTeamId: null });
  });

  it("eliminatoria con ganador: clasifica el ganador implícito", () => {
    expect(
      resolveAdvancingTeamId({ ...knockout, homeScore: 2, awayScore: 1 }),
    ).toEqual({ ok: true, advancingTeamId: 1 });
    expect(
      resolveAdvancingTeamId({ ...knockout, homeScore: 0, awayScore: 3 }),
    ).toEqual({ ok: true, advancingTeamId: 2 });
  });

  it("eliminatoria con ganador: ignora un pick contradictorio", () => {
    expect(
      resolveAdvancingTeamId({ ...knockout, homeScore: 2, awayScore: 1, pickedTeamId: 2 }),
    ).toEqual({ ok: true, advancingTeamId: 1 });
  });

  it("empate: usa el pick explícito", () => {
    expect(
      resolveAdvancingTeamId({ ...knockout, homeScore: 1, awayScore: 1, pickedTeamId: 2 }),
    ).toEqual({ ok: true, advancingTeamId: 2 });
  });

  it("empate sin pick o con pick ajeno al partido: inválido", () => {
    expect(resolveAdvancingTeamId({ ...knockout, homeScore: 0, awayScore: 0 })).toEqual({
      ok: false,
    });
    expect(
      resolveAdvancingTeamId({ ...knockout, homeScore: 0, awayScore: 0, pickedTeamId: 99 }),
    ).toEqual({ ok: false });
  });
});
