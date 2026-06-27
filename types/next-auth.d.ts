import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      playerId?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    playerId?: number;
  }
}
