-- Component Command is now one component per account (Air or Naval), not
-- one combined report per submission — clear the handful of demo rows
-- from the old shape (they mix both components on one report and don't
-- fit the new one-component-per-report model) before restructuring.
DELETE FROM "ComponentSitRep";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "component" "ComponentType";

-- AlterTable
ALTER TABLE "ComponentSitRep" ADD COLUMN     "component" "ComponentType" NOT NULL;

-- AlterTable
ALTER TABLE "ComponentSitRepUnit" DROP COLUMN "component";

-- AlterTable
ALTER TABLE "ComponentSitRepAsset" DROP COLUMN "component";
