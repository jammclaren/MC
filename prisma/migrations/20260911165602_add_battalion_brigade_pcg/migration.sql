-- Rename unitLabel -> battalion (preserves existing data), add brigade
-- (OPCON/attached-to) and pcg (Philippine Coast Guard) count.
ALTER TABLE "TroopDeployment" RENAME COLUMN "unitLabel" TO "battalion";
ALTER TABLE "TroopDeployment" ADD COLUMN     "brigade" TEXT;
ALTER TABLE "TroopDeployment" ADD COLUMN     "pcg" INTEGER NOT NULL DEFAULT 0;
