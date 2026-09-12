-- CreateTable
CREATE TABLE "PollingCenter" (
    "id" TEXT NOT NULL,
    "electionAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numPrecincts" INTEGER,

    CONSTRAINT "PollingCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PollingCenter_electionAreaId_idx" ON "PollingCenter"("electionAreaId");

-- AddForeignKey
ALTER TABLE "PollingCenter" ADD CONSTRAINT "PollingCenter_electionAreaId_fkey" FOREIGN KEY ("electionAreaId") REFERENCES "ElectionArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
