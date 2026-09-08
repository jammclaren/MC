/*
  Warnings:

  - You are about to drop the column `lat` on the `IntelMeeAsset` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `IntelMeeAsset` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "IntelMeeAsset" DROP COLUMN "lat",
DROP COLUMN "lng";
