"use client";

import { useMemo, useState } from "react";
import {
  removePlayer,
  toggleApproved,
  togglePaid,
  toggleRole,
  toggleTopScorerCorrect,
} from "./actions";
import { AddPlayerForm } from "./add-player-form";
import type { PlayerVM } from "./types";

type Filter = "all" | "pending" | "paid" | "unpaid" | "admins";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid", label: "Pagaron" },
  { key: "unpaid", label: "No pagaron" },
  { key: "admins", label: "Admins" },
];

const isPending = (p: PlayerVM) => !p.approved && p.role !== "admin";

export function PlayersSection({
  players,
  myPlayerId,
}: {
  players: PlayerVM[];
  myPlayerId: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: players.length,
      pending: players.filter(isPending).length,
      paid: players.filter((p) => p.paid).length,
      unpaid: players.filter((p) => !p.paid).length,
      admins: players.filter((p) => p.role === "admin").length,
    }),
    [players],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => {
        if (q && !`${p.name ?? ""} ${p.email}`.toLowerCase().includes(q)) return false;
        switch (filter) {
          case "pending":
            return isPending(p);
          case "paid":
            return p.paid;
          case "unpaid":
            return !p.paid;
          case "admins":
            return p.role === "admin";
          default:
            return true;
        }
      })
      // Pendientes primero (sort estable: conserva el orden de creación dentro de cada grupo)
      .sort((a, b) => Number(isPending(b)) - Number(isPending(a)));
  }, [players, query, filter]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <AddPlayerForm />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="h-9 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm outline-emerald-500 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="ml-1 tabular-nums opacity-60">{counts[f.key]}</span>
            </Chip>
          ))}
        </div>
      </div>

      <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
        {shown.map((player) => (
          <PlayerRow key={player.id} player={player} isSelf={player.id === myPlayerId} />
        ))}
        {shown.length === 0 && (
          <li className="py-6 text-center text-sm text-zinc-400">Nadie coincide con el filtro.</li>
        )}
      </ul>

      <p className="mt-3 text-xs text-zinc-400">
        Cualquiera entra con Google, pero queda <strong>pendiente</strong> hasta que lo apruebes —
        sin aprobación no puede pronosticar. Agregar un email aquí lo deja aprobado de una. Solo se
        pueden quitar jugadores sin pronósticos ni picks.
      </p>
    </div>
  );
}

function PlayerRow({ player, isSelf }: { player: PlayerVM; isSelf: boolean }) {
  const pending = isPending(player);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 text-sm">
      <Avatar name={player.name} email={player.email} image={player.image} />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{player.name ?? player.email}</span>
          {player.role === "admin" && (
            <StatusBadge tone="amber">admin{isSelf ? " (tú)" : ""}</StatusBadge>
          )}
          {pending && <StatusBadge tone="amber">pendiente</StatusBadge>}
        </span>
        {player.name && <span className="truncate text-xs text-zinc-400">{player.email}</span>}
      </div>

      {/* Acciones de estado: aprobación y pago */}
      <div className="flex items-center gap-1.5">
        {player.role !== "admin" && (
          <ActionForm action={toggleApproved} playerId={player.id} extra={{ approved: player.approved ? "" : "true" }}>
            <Toggle
              on={player.approved}
              title={player.approved ? "Revocar acceso (vuelve a pendiente)" : "Aprobar acceso a la app"}
            >
              {player.approved ? "Aprobado ✓" : "Aprobar"}
            </Toggle>
          </ActionForm>
        )}

        <ActionForm action={togglePaid} playerId={player.id} extra={{ paid: player.paid ? "" : "true" }}>
          <Toggle on={player.paid} title="Alternar pago de la entrada">
            {player.paid ? "Pagó ✓" : "No pagó"}
          </Toggle>
        </ActionForm>

        {player.topScorer && (
          <ActionForm
            action={toggleTopScorerCorrect}
            playerId={player.id}
            extra={{ correct: player.topScorerCorrect ? "" : "true" }}
          >
            <Toggle
              on={player.topScorerCorrect}
              title={`Pick de goleador: "${player.topScorer}". Márcalo si acertó (10 pts).`}
            >
              ⚽ {player.topScorerCorrect ? "Goleador ✓" : "Goleador"}
            </Toggle>
          </ActionForm>
        )}
      </div>

      {/* Acciones administrativas (rol / quitar): separadas del estado */}
      {!isSelf && (
        <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
          <ActionForm
            action={toggleRole}
            playerId={player.id}
            extra={{ role: player.role === "admin" ? "player" : "admin" }}
          >
            <button
              type="submit"
              title={
                player.role === "admin"
                  ? "Quitar permisos de admin"
                  : "Dar permisos de admin (también aprueba el acceso)"
              }
              className="rounded-full px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {player.role === "admin" ? "Quitar admin" : "Hacer admin"}
            </button>
          </ActionForm>

          {player.deletable && (
            <ActionForm action={removePlayer} playerId={player.id}>
              <button
                type="submit"
                title="Quitar del allowlist"
                className="rounded-full px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
              >
                Quitar
              </button>
            </ActionForm>
          )}
        </div>
      )}
    </li>
  );
}

function ActionForm({
  action,
  playerId,
  extra,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  playerId: number;
  extra?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="playerId" value={playerId} />
      {extra &&
        Object.entries(extra).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {children}
    </form>
  );
}

function Avatar({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
      <img src={image} alt="" width={32} height={32} className="rounded-full" />
    );
  }
  const initial = (name ?? email).trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
      {initial}
    </span>
  );
}

function StatusBadge({ tone, children }: { tone: "amber"; children: React.ReactNode }) {
  const tones = {
    amber:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

function Toggle({
  on,
  title,
  children,
}: {
  on: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      title={title}
      className={
        on
          ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
          : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }
    >
      {children}
    </button>
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
          ? "rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
          : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }
    >
      {children}
    </button>
  );
}
