-- Moneda de la polla: boliviano (BOB) en vez del CLP inicial
ALTER TABLE "settings" ALTER COLUMN "currency" SET DEFAULT 'BOB';
UPDATE "settings" SET "currency" = 'BOB' WHERE "currency" = 'CLP';
