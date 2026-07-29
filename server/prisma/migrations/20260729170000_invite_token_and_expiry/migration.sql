-- AlterTable
ALTER TABLE "SurveyInvitation" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE "SurveyInvitation" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyInvitation_accessToken_key" ON "SurveyInvitation"("accessToken");
CREATE INDEX IF NOT EXISTS "SurveyInvitation_expiresAt_idx" ON "SurveyInvitation"("expiresAt");
