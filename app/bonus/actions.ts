"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { approvedPlayerId } from "@/lib/access";
import { db } from "@/lib/db";
import { bonusPicks } from "@/lib/db/schema";

export type BonusFormState = { ok: true } | { ok: false; error: string } | null;

const bonusInput = z
  .object({
    championTeamId: z.coerce.number().int().positive(),
    topScorer: z.string().trim().min(2, "Escribe el nombre del goleador.").max(120),
    finalist1TeamId: z.coerce.number().int().positive(),
    finalist2TeamId: z.coerce.number().int().positive(),
  })
  .refine((d) => d.finalist1TeamId !== d.finalist2TeamId, {
    message: "Los dos finalistas deben ser equipos distintos.",
  });

export async function saveBonusPicks(
  _prev: BonusFormState,
  formData: FormData,
): Promise<BonusFormState> {
  const playerId = await approvedPlayerId();
  if (playerId === null) {
    return { ok: false, error: "Tu cuenta aún no está aprobada por el admin." };
  }

  // Deadline server-side, configurable por el admin en settings
  const settingsRow = await db.query.settings.findFirst();
  const deadline = settingsRow?.bonusDeadline ?? null;
  if (deadline !== null && Date.now() >= deadline.getTime()) {
    return { ok: false, error: "El deadline de bonus ya pasó: tus picks quedaron bloqueados." };
  }

  const parsed = bonusInput.safeParse({
    championTeamId: formData.get("championTeamId"),
    topScorer: formData.get("topScorer"),
    finalist1TeamId: formData.get("finalist1TeamId"),
    finalist2TeamId: formData.get("finalist2TeamId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const now = new Date();
  try {
    await db
      .insert(bonusPicks)
      .values({ playerId, ...parsed.data, updatedAt: now })
      .onConflictDoUpdate({
        target: bonusPicks.playerId,
        set: { ...parsed.data, updatedAt: now },
      });
  } catch {
    // FK violation: algún teamId no existe
    return { ok: false, error: "Equipo inválido. Recarga la página e intenta de nuevo." };
  }

  revalidatePath("/bonus");
  return { ok: true };
}
