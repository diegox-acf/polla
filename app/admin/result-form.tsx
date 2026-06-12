"use client";

import { useActionState, useState } from "react";
import { overrideResult, type AdminFormState } from "./actions";

interface Props {
  matchId: number;
  isKnockout: boolean;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  initial?: { homeScore90: number; awayScore90: number; advancingTeamId: number | null };
}

export function ResultForm({
  matchId,
  isKnockout,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  initial,
}: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    overrideResult,
    null,
  );
  const [home, setHome] = useState(initial ? String(initial.homeScore90) : "");
  const [away, setAway] = useState(initial ? String(initial.awayScore90) : "");

  const isDraw = home !== "" && away !== "" && Number(home) === Number(away);
  const needsAdvancing = isKnockout && isDraw;

  const inputClass =
    "h-9 w-12 rounded-lg border border-zinc-300 bg-zinc-50 text-center text-sm font-semibold tabular-nums outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="number"
        inputMode="numeric"
        name="homeScore90"
        min={0}
        max={20}
        required
        value={home}
        onChange={(e) => setHome(e.target.value)}
        aria-label={`Goles de ${homeTeamName} (90')`}
        className={inputClass}
      />
      <span className="text-zinc-400">–</span>
      <input
        type="number"
        inputMode="numeric"
        name="awayScore90"
        min={0}
        max={20}
        required
        value={away}
        onChange={(e) => setAway(e.target.value)}
        aria-label={`Goles de ${awayTeamName} (90')`}
        className={inputClass}
      />
      {needsAdvancing && (
        <select
          name="advancingTeamId"
          required
          defaultValue={initial?.advancingTeamId ?? ""}
          aria-label="Quién clasificó"
          className="h-9 rounded-lg border border-zinc-300 bg-zinc-50 px-2 outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="" disabled>
            ¿Quién clasificó?
          </option>
          <option value={homeTeamId}>{homeTeamName}</option>
          <option value={awayTeamId}>{awayTeamName}</option>
        </select>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg border border-emerald-600 px-3 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
      >
        {pending ? "…" : "Guardar"}
      </button>
      {state && !state.ok && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
      {state?.ok && !pending && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">✓</span>
      )}
    </form>
  );
}
