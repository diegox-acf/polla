import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";

/**
 * Estado de acceso del usuario logueado, leído fresco de la BD. No usamos el JWT
 * para `approved` porque quedaría desactualizado entre la aprobación del admin y
 * el siguiente login del jugador.
 */
export async function getAccess() {
  const session = await auth();
  const playerId = session?.user.playerId;
  if (typeof playerId !== "number") {
    return { session, playerId: null as number | null, approved: false };
  }
  const row = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    columns: { approved: true },
  });
  return { session, playerId, approved: row?.approved ?? false };
}

/** Devuelve el playerId solo si el jugador está aprobado; si no, null. Para server actions. */
export async function approvedPlayerId(): Promise<number | null> {
  const { playerId, approved } = await getAccess();
  return approved ? playerId : null;
}
