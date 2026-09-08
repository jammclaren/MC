-- CreateTable
CREATE TABLE "IntelMeeAsset" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelMeeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntelMeeAsset_jtfId_idx" ON "IntelMeeAsset"("jtfId");

-- AddForeignKey
ALTER TABLE "IntelMeeAsset" ADD CONSTRAINT "IntelMeeAsset_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelMeeAsset" ADD CONSTRAINT "IntelMeeAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
