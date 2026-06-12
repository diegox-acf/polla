"use client";

import { useActionState } from "react";
import { saveBonusPicks, type BonusFormState } from "./actions";

export interface TeamOption {
  id: number;
  name: string;
}

interface Props {
  teams: TeamOption[];
  initial?: {
    championTeamId: number | null;
    topScorer: string | null;
    finalist1TeamId: number | null;
    finalist2TeamId: number | null;
  };
}

export function BonusForm({ teams, initial }: Props) {
  const [state, formAction, pending] = useActionState<BonusFormState, FormData>(
    saveBonusPicks,
    null,
  );

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <Field label="Campeón del mundo (15 pts)">
        <TeamSelect name="championTeamId" teams={teams} defaultValue={initial?.championTeamId} />
      </Field>
      <Field label="Goleador del torneo (10 pts)">
        <input
          name="topScorer"
          type="text"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initial?.topScorer ?? ""}
          placeholder="Nombre del jugador"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 outline-emerald-500 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>
      <Field label="Finalista 1 (5 pts)">
        <TeamSelect name="finalist1TeamId" teams={teams} defaultValue={initial?.finalist1TeamId} />
      </Field>
      <Field label="Finalista 2 (5 pts)">
        <TeamSelect name="finalist2TeamId" teams={teams} defaultValue={initial?.finalist2TeamId} />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-emerald-600 px-5 font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar picks"}
        </button>
        {state && !state.ok && (
          <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
        )}
        {state?.ok && !pending && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Guardado ✓</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function TeamSelect({
  name,
  teams,
  defaultValue,
}: {
  name: string;
  teams: TeamOption[];
  defaultValue?: number | null;
}) {
  return (
    <select
      name={name}
      required
      defaultValue={defaultValue ?? ""}
      className="h-10 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2 outline-emerald-500 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
    >
      <option value="" disabled>
        Elige un equipo
      </option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
