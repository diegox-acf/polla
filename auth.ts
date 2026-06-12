import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    // Allowlist: solo entran emails que el admin agregó a la tabla players.
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const player = await db.query.players.findFirst({
        where: eq(players.email, email),
      });
      if (!player) return false;
      // Completa nombre y foto desde Google en el primer login
      await db
        .update(players)
        .set({
          name: player.name ?? user.name ?? null,
          image: user.image ?? player.image,
        })
        .where(eq(players.id, player.id));
      return true;
    },
    async jwt({ token, trigger }) {
      const email = token.email?.toLowerCase();
      if (email && (trigger === "signIn" || token.playerId === undefined)) {
        const player = await db.query.players.findFirst({
          where: eq(players.email, email),
        });
        if (player) {
          token.playerId = player.id;
          token.role = player.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.playerId === "number") {
        session.user.playerId = token.playerId;
        session.user.role = token.role as "admin" | "player";
      }
      return session;
    },
  },
});
