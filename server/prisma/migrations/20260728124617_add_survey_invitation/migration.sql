-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('SENT', 'OPENED', 'RESPONDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SurveyInvitation" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyInvitation_userId_status_idx" ON "SurveyInvitation"("userId", "status");

-- CreateIndex
CREATE INDEX "SurveyInvitation_surveyId_idx" ON "SurveyInvitation"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyInvitation_sentAt_idx" ON "SurveyInvitation"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyInvitation_surveyId_userId_key" ON "SurveyInvitation"("surveyId", "userId");

-- AddForeignKey
ALTER TABLE "SurveyInvitation" ADD CONSTRAINT "SurveyInvitation_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyInvitation" ADD CONSTRAINT "SurveyInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
