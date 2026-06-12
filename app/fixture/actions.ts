"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { matches, predictionAudit, predictions } from "@/lib/db/schema";
import { canPredict, resolveAdvancingTeamId } from "@/lib/predictions";

export type PredictionFormState = { ok: true } | { ok: false; error: string } | null;

const predictionInput = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().min(0).max(20),
  awayScore: z.coerce.number().int().min(0).max(20),
  advancingTeamId: z.coerce.number().int().positive().optional(),
});

export async function savePrediction(
  _prev: PredictionFormState,
  formData: FormData,
): Promise<PredictionFormState> {
  const session = await auth();
  const playerId = session?.user.playerId;
  if (typeof playerId !== "number") {
    return { ok: false, error: "Sesión inválida. Vuelve a iniciar sesión." };
  }

  const parsed = predictionInput.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    advancingTeamId: formData.get("advancingTeamId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa el marcador (0 a 20 goles)." };
  }
  const { matchId, homeScore, awayScore } = parsed.data;

  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) return { ok: false, error: "Partido no encontrado." };

  // Deadline server-side: contra el kickoff oficial del fixture, nunca el reloj del cliente
  if (!canPredict(match, new Date())) {
    return {
      ok: false,
      error: "Este partido ya está cerrado: los pronósticos se bloquean en el kickoff.",
    };
  }

  // canPredict garantiza que ambos equipos están definidos
  const resolution = resolveAdvancingTeamId({
    stage: match.stage,
    homeScore,
    awayScore,
    homeTeamId: match.homeTeamId!,
    awayTeamId: match.awayTeamId!,
    pickedTeamId: parsed.data.advancingTeamId,
  });
  if (!resolution.ok) {
    return { ok: false, error: "En eliminatorias con empate debes indicar quién clasifica." };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const existing = await tx.query.predictions.findFirst({
      where: and(eq(predictions.playerId, playerId), eq(predictions.matchId, matchId)),
    });
    await tx
      .insert(predictions)
      .values({
        playerId,
        matchId,
        homeScore,
        awayScore,
        advancingTeamId: resolution.advancingTeamId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [predictions.playerId, predictions.matchId],
        set: {
          homeScore,
          awayScore,
          advancingTeamId: resolution.advancingTeamId,
          updatedAt: now,
        },
      });
    await tx.insert(predictionAudit).values({
      playerId,
      matchId,
      prevHomeScore: existing?.homeScore ?? null,
      prevAwayScore: existing?.awayScore ?? null,
      prevAdvancingTeamId: existing?.advancingTeamId ?? null,
      newHomeScore: homeScore,
      newAwayScore: awayScore,
      newAdvancingTeamId: resolution.advancingTeamId,
    });
  });

  revalidatePath("/fixture");
  revalidatePath(`/partido/${matchId}`);
  return { ok: true };
}
