// Motor de puntaje (REGLAS.md): funciones puras sin DB, testeadas en scoring.test.ts.
// El cálculo es idempotente: las posiciones se recomputan desde los datos en cada
// lectura, así que corregir un resultado recalcula todo automáticamente.

// import relativo (no "@/") para que vitest resuelva sin config extra
import { isKnockoutStage } from "../predictions";

export interface MatchOutcome {
  stage: string;
  homeScore90: number;
  awayScore90: number;
  // solo eliminatorias; null si aún no se conoce
  advancingTeamId: number | null;
}

export interface PredictionLike {
  homeScore: number;
  awayScore: number;
  advancingTeamId: number | null;
}

export interface MatchTally {
  points: number;
  exact: boolean;
  outcomeOnly: boolean;
  advancing: boolean;
}

// 3 exacto / 1 solo resultado / 0 nada; +1 clasificado en eliminatorias.
// El +1 es independiente del marcador (puedes errar el marcador y sumar el +1).
export function scoreMatch(prediction: PredictionLike, result: MatchOutcome): MatchTally {
  const exact =
    prediction.homeScore === result.homeScore90 &&
    prediction.awayScore === result.awayScore90;
  const sameOutcome =
    Math.sign(prediction.homeScore - prediction.awayScore) ===
    Math.sign(result.homeScore90 - result.awayScore90);
  const advancing =
    isKnockoutStage(result.stage) &&
    result.advancingTeamId !== null &&
    prediction.advancingTeamId === result.advancingTeamId;

  const base = exact ? 3 : sameOutcome ? 1 : 0;
  return {
    points: base + (advancing ? 1 : 0),
    exact,
    outcomeOnly: !exact && sameOutcome,
    advancing,
  };
}

export interface BonusPickLike {
  championTeamId: number | null;
  finalist1TeamId: number | null;
  finalist2TeamId: number | null;
  // marcado por el admin al final del torneo (el goleador es texto libre)
  topScorerCorrect: boolean;
}

export interface BonusOutcome {
  // null hasta que la final esté jugada
  championTeamId: number | null;
  // vacío hasta que se definan los cruces de la final
  finalistTeamIds: number[];
}

export interface BonusTally {
  points: number;
  championCorrect: boolean;
  finalistsCorrect: number;
  topScorerCorrect: boolean;
}

// Campeón 15 / goleador 10 / 5 por finalista acertado, sin importar el lado (máx. 10)
export function scoreBonus(pick: BonusPickLike, outcome: BonusOutcome): BonusTally {
  const championCorrect =
    pick.championTeamId !== null && pick.championTeamId === outcome.championTeamId;
  const finalistsCorrect = [pick.finalist1TeamId, pick.finalist2TeamId].filter(
    (id) => id !== null && outcome.finalistTeamIds.includes(id),
  ).length;
  return {
    points: (championCorrect ? 15 : 0) + (pick.topScorerCorrect ? 10 : 0) + 5 * finalistsCorrect,
    championCorrect,
    finalistsCorrect,
    topScorerCorrect: pick.topScorerCorrect,
  };
}

export interface PlayerInput {
  playerId: number;
  predictions: { prediction: PredictionLike; result: MatchOutcome }[];
  bonus: BonusPickLike | null;
}

export type TiebreakReason = "exactos" | "eliminatorias" | "campeon" | "compartido";

export interface StandingRow {
  playerId: number;
  rank: number;
  total: number;
  matchPoints: number;
  bonusPoints: number;
  exactCount: number;
  outcomeCount: number;
  advancingCount: number;
  // puntos obtenidos en partidos de fase eliminatoria (criterio de desempate 2)
  knockoutPoints: number;
  championCorrect: boolean;
  finalistsCorrect: number;
  topScorerCorrect: boolean;
  // cómo se resolvió el empate en puntos con el vecino (null si no hubo empate)
  tiebrokenBy: TiebreakReason | null;
}

// Desempates de REGLAS.md §3, en orden: más exactos → más puntos en fase
// eliminatoria → acertó el campeón → se comparte el premio (mismo rank).
export function computeStandings(
  players: PlayerInput[],
  bonusOutcome: BonusOutcome,
): StandingRow[] {
  const rows = players.map((player): StandingRow => {
    let matchPoints = 0;
    let exactCount = 0;
    let outcomeCount = 0;
    let advancingCount = 0;
    let knockoutPoints = 0;

    for (const { prediction, result } of player.predictions) {
      const tally = scoreMatch(prediction, result);
      matchPoints += tally.points;
      if (tally.exact) exactCount++;
      if (tally.outcomeOnly) outcomeCount++;
      if (tally.advancing) advancingCount++;
      if (isKnockoutStage(result.stage)) knockoutPoints += tally.points;
    }

    const bonus = player.bonus
      ? scoreBonus(player.bonus, bonusOutcome)
      : { points: 0, championCorrect: false, finalistsCorrect: 0, topScorerCorrect: false };

    return {
      playerId: player.playerId,
      rank: 0,
      total: matchPoints + bonus.points,
      matchPoints,
      bonusPoints: bonus.points,
      exactCount,
      outcomeCount,
      advancingCount,
      knockoutPoints,
      championCorrect: bonus.championCorrect,
      finalistsCorrect: bonus.finalistsCorrect,
      topScorerCorrect: bonus.topScorerCorrect,
      tiebrokenBy: null,
    };
  });

  const sortKey = (r: StandingRow) => [
    r.total,
    r.exactCount,
    r.knockoutPoints,
    r.championCorrect ? 1 : 0,
  ];
  rows.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return kb[i] - ka[i];
    }
    return a.playerId - b.playerId; // orden estable para keys iguales
  });

  // Ranks: empate total en todos los criterios = mismo rank (premio compartido)
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) {
      rows[i].rank = 1;
      continue;
    }
    const prev = rows[i - 1];
    const fullTie = sortKey(prev).every((v, j) => v === sortKey(rows[i])[j]);
    rows[i].rank = fullTie ? prev.rank : i + 1;
  }

  // Señalizar cómo se resolvió cada empate en puntos (FEATURES §6)
  for (let i = 1; i < rows.length; i++) {
    const above = rows[i - 1];
    const row = rows[i];
    if (above.total !== row.total) continue;
    let reason: TiebreakReason;
    if (above.exactCount !== row.exactCount) reason = "exactos";
    else if (above.knockoutPoints !== row.knockoutPoints) reason = "eliminatorias";
    else if (above.championCorrect !== row.championCorrect) reason = "campeon";
    else reason = "compartido";
    above.tiebrokenBy ??= reason;
    row.tiebrokenBy ??= reason;
  }

  return rows;
}
