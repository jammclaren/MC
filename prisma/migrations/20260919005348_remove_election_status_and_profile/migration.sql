-- DropForeignKey
ALTER TABLE "PartyProvinceResult" DROP CONSTRAINT IF EXISTS "PartyProvinceResult_partyId_fkey";

-- DropForeignKey
ALTER TABLE "Candidate" DROP CONSTRAINT IF EXISTS "Candidate_partyId_fkey";

-- DropForeignKey
ALTER TABLE "Candidate" DROP CONSTRAINT IF EXISTS "Candidate_jtfId_fkey";

-- DropForeignKey
ALTER TABLE "ElectionOpsStatus" DROP CONSTRAINT IF EXISTS "ElectionOpsStatus_electionAreaId_fkey";

-- DropTable
DROP TABLE IF EXISTS "PartyProvinceResult";

-- DropTable
DROP TABLE IF EXISTS "Candidate";

-- DropTable
DROP TABLE IF EXISTS "Party";

-- DropTable
DROP TABLE IF EXISTS "ElectionOpsStatus";
