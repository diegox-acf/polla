"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bonusPicks, matches, players, resultAudit, settings } from "@/lib/db/schema";
import { resolveAdvancingTeamId } from "@/lib/predictions";
import { syncResults } from "@/lib/sync";

export type AdminFormState = { ok: true; message?: string } | { ok: false; error: string } | null;

async function requireAdmin(): Promise<number | null> {
  const session = await auth();
  if (session?.user.role !== "admin" || typeof session.user.playerId !== "number") return null;
  return session.user.playerId;
}

// --- Allowlist ---

const emailInput = z.string().trim().toLowerCase().email();

export async function addPlayer(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  if ((await requireAdmin()) === null) return { ok: false, error: "No autorizado." };

  const parsed = emailInput.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "Email inválido." };

  const inserted = await db
    .insert(players)
    .values({ email: parsed.data })
    .onConflictDoNothing()
    .returning({ id: players.id });
  if (inserted.length === 0) {
    return { ok: false, error: "Ese email ya está en la lista." };
  }

  revalidatePath("/admin");
  return { ok: true, message: `${parsed.data} agregado.` };
}

export async function removePlayer(formData: FormData): Promise<void> {
  const adminId = await requireAdmin();
  if (adminId === null) return;

  const playerId = z.coerce.number().int().positive().safeParse(formData.get("playerId"));
  if (!playerId.success || playerId.data === adminId) return; // no puedes borrarte a ti mismo

  // La página solo ofrece borrar jugadores sin datos; el FK protege el resto
  try {
    await db.delete(players).where(eq(players.id, playerId.data));
  } catch {
    return;
  }
  revalidatePath("/admin");
}

export async function togglePaid(formData: FormData): Promise<void> {
  if ((await requireAdmin()) === null) return;

  const parsed = z
    .object({
      playerId: z.coerce.number().int().positive(),
      paid: z.coerce.boolean(),
    })
    .safeParse({ playerId: formData.get("playerId"), paid: formData.get("paid") });
  if (!parsed.success) return;

  await db
    .update(players)
    .set({ paid: parsed.data.paid })
    .where(eq(players.id, parsed.data.playerId));
  revalidatePath("/admin");
}

// El goleador es texto libre: al final del torneo el admin marca quién acertó
export async function toggleTopScorerCorrect(formData: FormData): Promise<void> {
  if ((await requireAdmin()) === null) return;

  const parsed = z
    .object({
      playerId: z.coerce.number().int().positive(),
      correct: z.coerce.boolean(),
    })
    .safeParse({ playerId: formData.get("playerId"), correct: formData.get("correct") });
  if (!parsed.success) return;

  await db
    .update(bonusPicks)
    .set({ topScorerCorrect: parsed.data.correct })
    .where(eq(bonusPicks.playerId, parsed.data.playerId));
  revalidatePath("/admin");
  revalidatePath("/tabla");
}

// --- Settings ---

export async function updateSettings(formData: FormData): Promise<void> {
  if ((await requireAdmin()) === null) return;

  const parsed = z
    .object({
      entryAmount: z.coerce.number().int().min(0),
      currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
      // datetime-local sin zona: se interpreta como UTC (así está rotulado en la UI)
      bonusDeadline: z
        .string()
        .trim()
        .transform((v) => (v === "" ? null : new Date(`${v}:00Z`)))
        .refine((d) => d === null || !Number.isNaN(d.getTime()), "Fecha inválida"),
    })
    .safeParse({
      entryAmount: formData.get("entryAmount"),
      currency: formData.get("currency"),
      bonusDeadline: formData.get("bonusDeadline"),
    });
  if (!parsed.success) return;

  await db
    .update(settings)
    .set({
      entryAmount: parsed.data.entryAmount,
      currency: parsed.data.currency,
      bonusDeadline: parsed.data.bonusDeadline,
    })
    .where(eq(settings.id, 1));
  revalidatePath("/admin");
  revalidatePath("/bonus");
  revalidatePath("/pozo");
}

// --- Resultados ---

const resultInput = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore90: z.coerce.number().int().min(0).max(20),
  awayScore90: z.coerce.number().int().min(0).max(20),
  advancingTeamId: z.coerce.number().int().positive().optional(),
});

export async function overrideResult(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const adminId = await requireAdmin();
  if (adminId === null) return { ok: false, error: "No autorizado." };

  const parsed = resultInput.safeParse({
    matchId: formData.get("matchId"),
    homeScore90: formData.get("homeScore90"),
    awayScore90: formData.get("awayScore90"),
    advancingTeamId: formData.get("advancingTeamId") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { matchId, homeScore90, awayScore90 } = parsed.data;

  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) return { ok: false, error: "Partido no encontrado." };
  if (match.kickoff.getTime() > Date.now()) {
    return { ok: false, error: "El partido aún no se juega." };
  }
  if (match.homeTeamId === null || match.awayTeamId === null) {
    return { ok: false, error: "El cruce no está definido." };
  }

  const resolution = resolveAdvancingTeamId({
    stage: match.stage,
    homeScore: homeScore90,
    awayScore: awayScore90,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    pickedTeamId: parsed.data.advancingTeamId,
  });
  if (!resolution.ok) {
    return { ok: false, error: "Empate a los 90': indica quién clasificó." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(matches)
      .set({
        status: "finished",
        homeScore90,
        awayScore90,
        advancingTeamId: resolution.advancingTeamId,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, matchId));
    await tx.insert(resultAudit).values({
      matchId,
      source: "admin",
      actorPlayerId: adminId,
      prevHomeScore: match.homeScore90,
      prevAwayScore: match.awayScore90,
      prevAdvancingTeamId: match.advancingTeamId,
      newHomeScore: homeScore90,
      newAwayScore: awayScore90,
      newAdvancingTeamId: resolution.advancingTeamId,
    });
  });

  revalidatePath("/admin");
  revalidatePath("/fixture");
  revalidatePath("/tabla");
  return { ok: true, message: "Resultado guardado." };
}

// --- Sync manual ---

export async function runSyncNow(): Promise<AdminFormState> {
  if ((await requireAdmin()) === null) return { ok: false, error: "No autorizado." };

  try {
    const summary = await syncResults({ force: true });
    revalidatePath("/admin");
    revalidatePath("/fixture");
    revalidatePath("/tabla");
    return {
      ok: true,
      message: `Sync ok: ${summary.updated} de ${summary.checked} partidos actualizados.`,
    };
  } catch (error) {
    console.error("[admin/sync]", error);
    return { ok: false, error: "El sync falló (¿API caída o token inválido?)." };
  }
}
