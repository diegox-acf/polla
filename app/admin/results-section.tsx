"use client";

import { useMemo, useState } from "react";
import { LocalTime } from "@/components/local-time";
import { groupLabel, stageLabel, stageShortLabel } from "@/lib/stages";
import { ResultForm } from "./result-form";
import type { MatchVM, TeamVM } from "./types";

export function ResultsSection({ matches }: { matches: MatchVM[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [onlyMissing, setOnlyMissing] = useState(false);

  // Stages presentes, en el orden en que aparecen (matches ya viene desc por kickoff)
  const stages = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) seen.add(m.stage);
    return [...seen];
  }, [matches]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (stage !== "all" && m.stage !== stage) return false;
      if (onlyMissing && m.status === "finished") return false;
      if (q) {
        const hay = `${m.home.name} ${m.home.shortName ?? ""} ${m.away.name} ${m.away.shortName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, query, stage, onlyMissing]);

  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        Aún no hay partidos jugados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por equipo…"
          className="h-9 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 sm:max-w-xs"
        />
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Chip active={stage === "all"} onClick={() => setStage("all")}>
            Todas
          </Chip>
          {stages.map((s) => (
            <Chip key={s} active={stage === s} onClick={() => setStage(s)}>
              {stageShortLabel(s)}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={onlyMissing}
          onChange={(e) => setOnlyMissing(e.target.checked)}
          className="h-3.5 w-3.5 accent-emerald-600"
        />
        Solo sin finalizar
      </label>

      {shown.map((match) => (
        <div
          key={match.id}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex min-w-0 items-center gap-1.5">
              <Crest team={match.home} />
              <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                {match.home.shortName ?? match.home.name}
              </span>
              <span className="text-zinc-400">vs</span>
              <Crest team={match.away} />
              <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                {match.away.shortName ?? match.away.name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {match.status !== "finished" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                  {match.hasResult ? match.status : "sin resultado"}
                </span>
              )}
              <LocalTime iso={match.kickoffIso} />
            </span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">
            {match.group ? groupLabel(match.group) : stageLabel(match.stage)}
          </div>
          <div className="mt-2.5">
            <ResultForm
              matchId={match.id}
              isKnockout={match.isKnockout}
              homeTeamId={match.home.id}
              awayTeamId={match.away.id}
              homeTeamName={match.home.shortName ?? match.home.name}
              awayTeamName={match.away.shortName ?? match.away.name}
              initial={
                match.hasResult
                  ? {
                      homeScore90: match.homeScore90!,
                      awayScore90: match.awayScore90!,
                      advancingTeamId: match.advancingTeamId,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      ))}
      {shown.length === 0 && (
        <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          Ningún partido coincide con el filtro.
        </p>
      )}

      <p className="text-xs text-zinc-400">
        Guardar marca el partido como finalizado y queda en el audit log. La tabla se recalcula
        sola.
      </p>
    </div>
  );
}

function Crest({ team }: { team: TeamVM }) {
  if (!team.crest) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- crests remotos de football-data, tamaño fijo
    <img src={team.crest} alt="" width={18} height={18} className="shrink-0 drop-shadow-sm" />
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
          : "shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }
    >
      {children}
    </button>
  );
}
