
-- AlterEnum
BEGIN;
CREATE TYPE "SocialPostTopic_new" AS ENUM ('ELECTION_RELATED', 'PEACE_INCLINED_ARMED_GROUPS', 'ISO_RELATED', 'ESO_RELATED');
ALTER TABLE "SocialMediaPost" ALTER COLUMN "topic" TYPE "SocialPostTopic_new" USING ("topic"::text::"SocialPostTopic_new");
ALTER TYPE "SocialPostTopic" RENAME TO "SocialPostTopic_old";
ALTER TYPE "SocialPostTopic_new" RENAME TO "SocialPostTopic";
DROP TYPE "public"."SocialPostTopic_old";
COMMIT;

