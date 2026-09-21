-- CreateEnum
CREATE TYPE "SipsDeclarationLevel" AS ENUM ('CITY_MUNICIPALITY', 'PROVINCE');

-- CreateTable
CREATE TABLE "SipsDeclaration" (
    "id" TEXT NOT NULL,
    "level" "SipsDeclarationLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SipsDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SipsDeclaration_level_idx" ON "SipsDeclaration"("level");

-- CreateIndex
CREATE INDEX "SipsDeclaration_date_idx" ON "SipsDeclaration"("date");

-- AddForeignKey
ALTER TABLE "SipsDeclaration" ADD CONSTRAINT "SipsDeclaration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
