"use client";

import { useActionState } from "react";
import { addPlayer, type AdminFormState } from "./actions";

export function AddPlayerForm() {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(addPlayer, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="email@gmail.com"
        className="h-10 w-64 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Agregando…" : "Invitar"}
      </button>
      {state && !state.ok && (
        <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
      )}
      {state?.ok && !pending && (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</span>
      )}
    </form>
  );
}
