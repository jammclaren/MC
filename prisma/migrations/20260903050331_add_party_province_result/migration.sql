-- CreateTable
CREATE TABLE "PartyProvinceResult" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "votesEncoded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyProvinceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyProvinceResult_province_idx" ON "PartyProvinceResult"("province");

-- CreateIndex
CREATE UNIQUE INDEX "PartyProvinceResult_partyId_province_key" ON "PartyProvinceResult"("partyId", "province");

-- AddForeignKey
ALTER TABLE "PartyProvinceResult" ADD CONSTRAINT "PartyProvinceResult_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
