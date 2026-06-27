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
    return { session, playerId: null as number | null, approved: false, isAdmin: false };
  }
  const row = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    columns: { approved: true, role: true },
  });
  const isAdmin = row?.role === "admin";
  return {
    session,
    playerId,
    // Un admin siempre tiene acceso, aunque su flag approved no esté seteado.
    approved: (row?.approved ?? false) || isAdmin,
    isAdmin,
  };
}

/** Devuelve el playerId solo si el jugador está aprobado; si no, null. Para server actions. */
export async function approvedPlayerId(): Promise<number | null> {
  const { playerId, approved } = await getAccess();
  return approved ? playerId : null;
}

/**
 * Devuelve el playerId solo si el jugador es admin; si no, null. Leído fresco de
 * la BD (no del JWT), así un admin recién promovido manda de inmediato sin
 * re-loguearse. Para server actions y gates de página.
 */
export async function requireAdmin(): Promise<number | null> {
  const { playerId, isAdmin } = await getAccess();
  return isAdmin ? playerId : null;
}
