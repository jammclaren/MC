-- DropForeignKey
ALTER TABLE "IntelMeeAsset" DROP CONSTRAINT "IntelMeeAsset_jtfId_fkey";

-- AlterTable
ALTER TABLE "IntelMeeAsset" ALTER COLUMN "jtfId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "IntelUpdate" ADD COLUMN     "politicalParty" TEXT;

-- AddForeignKey
ALTER TABLE "IntelMeeAsset" ADD CONSTRAINT "IntelMeeAsset_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE SET NULL ON UPDATE CASCADE;
