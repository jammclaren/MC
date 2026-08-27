-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('LOGGED', 'MAP_MARKER');

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "source" "IncidentSource" NOT NULL DEFAULT 'LOGGED';
