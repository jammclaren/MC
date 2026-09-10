-- CreateEnum
CREATE TYPE "SocialPostTopic" AS ENUM ('VOTE_BUYING', 'ELECTION_FRAUD', 'CANDIDATE_PARTY_ATTACK', 'VOTER_EDUCATION', 'ELECTION_VIOLENCE', 'TERRORISM', 'RIDO_CLAN_CONFLICT', 'CRIMINALITY', 'PEACE_AND_ORDER', 'MISINFORMATION');

-- AlterTable
ALTER TABLE "SocialMediaPost" ADD COLUMN     "topic" "SocialPostTopic";

-- CreateIndex
CREATE INDEX "SocialMediaPost_topic_idx" ON "SocialMediaPost"("topic");
