import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      playerId?: number;
      role?: "admin" | "player";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    playerId?: number;
    role?: "admin" | "player";
  }
}
