-- DropForeignKey
ALTER TABLE "ElectionOpsStatus" DROP CONSTRAINT "ElectionOpsStatus_electionAreaId_fkey";

-- AddForeignKey
ALTER TABLE "ElectionOpsStatus" ADD CONSTRAINT "ElectionOpsStatus_electionAreaId_fkey" FOREIGN KEY ("electionAreaId") REFERENCES "ElectionArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
