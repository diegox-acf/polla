import { desc, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { matches, predictionAudit, predictions } from "@/lib/db/schema";
import { isKnockoutStage } from "@/lib/predictions";
import { AdminTabs } from "./admin-tabs";
import type { MatchVM, PlayerVM } from "./types";

export const metadata = { title: "Admin — Polla Mundial 2026" };

export default async function AdminPage() {
  const { isAdmin, playerId } = await getAccess();
  if (!isAdmin || playerId === null) {
    redirect("/");
  }
  const myPlayerId = playerId;

  const [allPlayers, allTeams, allPicks, settingsRow, playedMatches, predPlayers, auditPlayers] =
    await Promise.all([
      db.query.players.findMany({ orderBy: (p, { asc }) => [asc(p.createdAt)] }),
      db.query.teams.findMany(),
      db.query.bonusPicks.findMany(),
      db.query.settings.findFirst(),
      db.query.matches.findMany({
        where: lt(matches.kickoff, new Date()),
        orderBy: [desc(matches.kickoff)],
      }),
      db.selectDistinct({ playerId: predictions.playerId }).from(predictions),
      db.selectDistinct({ playerId: predictionAudit.playerId }).from(predictionAudit),
    ]);

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const pickByPlayer = new Map(allPicks.map((p) => [p.playerId, p]));
  const pendingCount = allPlayers.filter((p) => !p.approved && p.role !== "admin").length;
  const playersWithData = new Set([
    ...predPlayers.map((p) => p.playerId),
    ...auditPlayers.map((p) => p.playerId),
    ...allPicks.map((p) => p.playerId),
  ]);

  const playerVMs: PlayerVM[] = allPlayers.map((player) => {
    const pick = pickByPlayer.get(player.id);
    return {
      id: player.id,
      name: player.name,
      email: player.email,
      image: player.image,
      role: player.role,
      approved: player.approved,
      paid: player.paid,
      topScorer: pick?.topScorer ?? null,
      topScorerCorrect: pick?.topScorerCorrect ?? false,
      deletable: player.id !== myPlayerId && !playersWithData.has(player.id),
    };
  });

  const matchVMs: MatchVM[] = playedMatches.flatMap((match) => {
    const home = match.homeTeamId !== null ? teamById.get(match.homeTeamId) : undefined;
    const away = match.awayTeamId !== null ? teamById.get(match.awayTeamId) : undefined;
    if (!home || !away) return [];
    return [
      {
        id: match.id,
        stage: match.stage,
        group: match.group,
        kickoffIso: match.kickoff.toISOString(),
        status: match.status,
        isKnockout: isKnockoutStage(match.stage),
        hasResult: match.homeScore90 !== null && match.awayScore90 !== null,
        homeScore90: match.homeScore90,
        awayScore90: match.awayScore90,
        advancingTeamId: match.advancingTeamId,
        home: { id: home.id, name: home.name, shortName: home.shortName, crest: home.crest },
        away: { id: away.id, name: away.name, shortName: away.shortName, crest: away.crest },
      },
    ];
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Aprobaciones, pagos, resultados y configuración de la polla.
      </p>

      <AdminTabs
        players={playerVMs}
        matches={matchVMs}
        settings={{
          entryAmount: settingsRow?.entryAmount ?? 0,
          currency: settingsRow?.currency ?? "BOB",
          bonusDeadlineLocal: settingsRow?.bonusDeadline?.toISOString().slice(0, 16) ?? "",
        }}
        myPlayerId={myPlayerId}
        pendingCount={pendingCount}
      />
    </main>
  );
}
