"use client";

import { useActionState } from "react";
import { runSyncNow, type AdminFormState } from "./actions";

export function SyncButton() {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(runSyncNow, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Sincronizando…" : "Sincronizar resultados ahora"}
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
