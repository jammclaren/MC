-- CreateEnum
CREATE TYPE "WarfightingFunction" AS ENUM ('COMMAND_CONTROL', 'INTELLIGENCE', 'FIRES', 'MANEUVER', 'PROTECTION', 'SUSTAINMENT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'WFC_STAFF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "warfightingFunction" "WarfightingFunction";
