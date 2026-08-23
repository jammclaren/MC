-- CreateEnum
CREATE TYPE "MarkerAnimation" AS ENUM ('NONE', 'BLINK', 'PULSE');

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "markerStyle" "MarkerAnimation" NOT NULL DEFAULT 'NONE';
