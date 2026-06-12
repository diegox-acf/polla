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
    "h-10 w-14 rounded-lg border border-zinc-300 bg-zinc-50 text-center text-base font-semibold tabular-nums outline-emerald-500 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950";

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
          className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-2 outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
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
        className="h-10 rounded-lg bg-emerald-600 px-4 font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
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
