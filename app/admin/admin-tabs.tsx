"use client";

import { useState } from "react";
import { PlayersSection } from "./players-section";
import { ResultsSection } from "./results-section";
import { SettingsSection } from "./settings-section";
import { SyncButton } from "./sync-button";
import type { MatchVM, PlayerVM, SettingsVM } from "./types";

type TabKey = "jugadores" | "resultados" | "sync" | "config";

const TABS: { key: TabKey; label: string }[] = [
  { key: "jugadores", label: "Jugadores" },
  { key: "resultados", label: "Resultados" },
  { key: "sync", label: "Sincronización" },
  { key: "config", label: "Configuración" },
];

export function AdminTabs({
  players,
  matches,
  settings,
  myPlayerId,
  pendingCount,
}: {
  players: PlayerVM[];
  matches: MatchVM[];
  settings: SettingsVM;
  myPlayerId: number;
  pendingCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("jugadores");

  return (
    <div className="mt-6">
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                active
                  ? "flex shrink-0 items-center gap-1.5 border-b-2 border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                  : "flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }
            >
              {t.label}
              {t.key === "jugadores" && pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "jugadores" && <PlayersSection players={players} myPlayerId={myPlayerId} />}
        {tab === "resultados" && <ResultsSection matches={matches} />}
        {tab === "sync" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <SyncButton />
            <p className="mt-2 text-xs text-zinc-400">
              El cron lo hace solo cada 10 minutos en ventanas de partido. Este botón fuerza una
              pasada completa contra football-data.org.
            </p>
          </div>
        )}
        {tab === "config" && <SettingsSection settings={settings} />}
      </div>
    </div>
  );
}
