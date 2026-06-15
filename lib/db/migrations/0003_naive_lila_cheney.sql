ALTER TABLE "players" ADD COLUMN "approved" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Los jugadores que ya estaban en el allowlist quedan aprobados; los nuevos (registro abierto) no.
UPDATE "players" SET "approved" = true;