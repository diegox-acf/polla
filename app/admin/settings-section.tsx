"use client";

import { updateSettings } from "./actions";
import type { SettingsVM } from "./types";

export function SettingsSection({ settings }: { settings: SettingsVM }) {
  return (
    <form
      action={updateSettings}
      className="max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Entrada por jugador</span>
          <input
            type="number"
            name="entryAmount"
            min={0}
            required
            defaultValue={settings.entryAmount}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Moneda</span>
          <select
            name="currency"
            defaultValue={settings.currency}
            className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-2 text-sm outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="BOB">BOB — Boliviano</option>
            <option value="PEN">PEN — Sol peruano</option>
            <option value="CLP">CLP — Peso chileno</option>
            <option value="ARS">ARS — Peso argentino</option>
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Deadline de bonus (hora UTC)</span>
        <input
          type="datetime-local"
          name="bonusDeadline"
          defaultValue={settings.bonusDeadlineLocal}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <span className="mt-1 block text-xs text-zinc-400">
          Vacío = sin deadline (picks editables). Al pasar, los picks se bloquean y se hacen
          públicos.
        </span>
      </label>
      <button
        type="submit"
        className="h-10 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98]"
      >
        Guardar configuración
      </button>
    </form>
  );
}
