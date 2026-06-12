// Reglas puras de pronósticos (sin DB ni framework): testeadas en predictions.test.ts

export interface PredictableMatch {
  status: string;
  kickoff: Date;
  homeTeamId: number | null;
  awayTeamId: number | null;
}

// Un partido acepta pronósticos hasta el kickoff oficial (hora del fixture,
// nunca el reloj del cliente) y solo con ambos equipos definidos: los cruces
// eliminatorios muestran "por definir" hasta entonces.
export function canPredict(match: PredictableMatch, now: Date): boolean {
  return (
    match.status === "scheduled" &&
    now.getTime() < match.kickoff.getTime() &&
    match.homeTeamId !== null &&
    match.awayTeamId !== null
  );
}

export function isKnockoutStage(stage: string): boolean {
  return stage !== "GROUP_STAGE";
}

// En eliminatorias el clasificado va implícito en el marcador pronosticado,
// salvo empate, donde el jugador lo elige explícitamente (REGLAS.md §1).
// En fase de grupos siempre es null.
export function resolveAdvancingTeamId(input: {
  stage: string;
  homeScore: number;
  awayScore: number;
  homeTeamId: number;
  awayTeamId: number;
  pickedTeamId?: number;
}): { ok: true; advancingTeamId: number | null } | { ok: false } {
  if (!isKnockoutStage(input.stage)) return { ok: true, advancingTeamId: null };
  if (input.homeScore > input.awayScore) {
    return { ok: true, advancingTeamId: input.homeTeamId };
  }
  if (input.awayScore > input.homeScore) {
    return { ok: true, advancingTeamId: input.awayTeamId };
  }
  if (input.pickedTeamId === input.homeTeamId || input.pickedTeamId === input.awayTeamId) {
    return { ok: true, advancingTeamId: input.pickedTeamId };
  }
  return { ok: false };
}
