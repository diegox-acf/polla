"use client";

import { useActionState, useState } from "react";
import { savePrediction, type PredictionFormState } from "./actions";

interface Props {
  matchId: number;
  isKnockout: boolean;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  initial?: { homeScore: number; awayScore: number; advancingTeamId: number | null };
}

export function PredictionForm({
  matchId,
  isKnockout,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  initial,
}: Props) {
  const [state, formAction, pending] = useActionState<PredictionFormState, FormData>(
    savePrediction,
    null,
  );
  const [homeScore, setHomeScore] = useState(initial ? String(initial.homeScore) : "");
  const [awayScore, setAwayScore] = useState(initial ? String(initial.awayScore) : "");

  const isDraw =
    homeScore !== "" && awayScore !== "" && Number(homeScore) === Number(awayScore);
  const needsAdvancing = isKnockout && isDraw;

  const inputClass =
    "h-9 w-14 rounded-md border border-zinc-300 bg-transparent text-center tabular-nums dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="matchId" value={matchId} />
      <span className="text-zinc-500 dark:text-zinc-400">Mi pronóstico:</span>
      <input
        type="number"
        inputMode="numeric"
        name="homeScore"
        min={0}
        max={20}
        required
        value={homeScore}
        onChange={(e) => setHomeScore(e.target.value)}
        aria-label={`Goles de ${homeTeamName}`}
        className={inputClass}
      />
      <span className="text-zinc-400">–</span>
      <input
        type="number"
        inputMode="numeric"
        name="awayScore"
        min={0}
        max={20}
        required
        value={awayScore}
        onChange={(e) => setAwayScore(e.target.value)}
        aria-label={`Goles de ${awayTeamName}`}
        className={inputClass}
      />
      {needsAdvancing && (
        <select
          name="advancingTeamId"
          required
          defaultValue={initial?.advancingTeamId ?? ""}
          aria-label="Quién clasifica"
          className="h-9 rounded-md border border-zinc-300 bg-transparent px-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            ¿Quién clasifica?
          </option>
          <option value={homeTeamId}>{homeTeamName}</option>
          <option value={awayTeamId}>{awayTeamName}</option>
        </select>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md bg-foreground px-4 font-medium text-background transition-opacity disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {state && !state.ok && <span className="text-red-600 dark:text-red-400">{state.error}</span>}
      {state?.ok && !pending && (
        <span className="text-emerald-600 dark:text-emerald-400">Guardado ✓</span>
      )}
    </form>
  );
}
