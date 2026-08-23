-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT,
    "nameOnBallot" TEXT NOT NULL,
    "partyId" TEXT,
    "isCocFiler" BOOLEAN NOT NULL DEFAULT true,
    "votesEncoded" INTEGER NOT NULL DEFAULT 0,
    "sourceNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_abbreviation_key" ON "Party"("abbreviation");

-- CreateIndex
CREATE INDEX "Candidate_jtfId_idx" ON "Candidate"("jtfId");

-- CreateIndex
CREATE INDEX "Candidate_province_idx" ON "Candidate"("province");

-- CreateIndex
CREATE INDEX "Candidate_partyId_idx" ON "Candidate"("partyId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
