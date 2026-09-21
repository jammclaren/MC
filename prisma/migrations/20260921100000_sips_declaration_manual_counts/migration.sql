-- Replace the per-declaration SIPS log with a single manually-maintained
-- count (CMO enters the current Municipal/Province tallies directly,
-- rather than logging one row per declared LGU) — the log-based version
-- never went to production, so this drops it outright rather than
-- migrating its data.

-- DropForeignKey
ALTER TABLE "SipsDeclaration" DROP CONSTRAINT "SipsDeclaration_createdById_fkey";

-- DropTable
DROP TABLE "SipsDeclaration";

-- DropEnum
DROP TYPE "SipsDeclarationLevel";

-- CreateTable
CREATE TABLE "SipsDeclarationCount" (
    "id" TEXT NOT NULL,
    "municipalCount" INTEGER NOT NULL DEFAULT 0,
    "provinceCount" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SipsDeclarationCount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SipsDeclarationCount" ADD CONSTRAINT "SipsDeclarationCount_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
