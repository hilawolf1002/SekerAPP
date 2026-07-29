-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'FULFILLED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "redemptionGoal" INTEGER NOT NULL DEFAULT 100,
    "signupBonus" INTEGER NOT NULL DEFAULT 0,
    "referralBonus" INTEGER NOT NULL DEFAULT 0,
    "defaultTimeLimitMinutes" INTEGER NOT NULL DEFAULT 10,
    "defaultMaxResponses" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftOption" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCoupon" (
    "id" TEXT NOT NULL,
    "giftOptionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedByUserId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giftOptionId" TEXT NOT NULL,
    "couponId" TEXT,
    "pointsSpent" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'FULFILLED',
    "couponCode" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftOption_isActive_idx" ON "GiftOption"("isActive");

-- CreateIndex
CREATE INDEX "GiftCoupon_giftOptionId_isUsed_idx" ON "GiftCoupon"("giftOptionId", "isUsed");

-- CreateIndex
CREATE INDEX "GiftCoupon_usedByUserId_idx" ON "GiftCoupon"("usedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCoupon_giftOptionId_code_key" ON "GiftCoupon"("giftOptionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionRequest_couponId_key" ON "RedemptionRequest"("couponId");

-- CreateIndex
CREATE INDEX "RedemptionRequest_userId_createdAt_idx" ON "RedemptionRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RedemptionRequest_status_idx" ON "RedemptionRequest"("status");

-- CreateIndex
CREATE INDEX "RedemptionRequest_giftOptionId_idx" ON "RedemptionRequest"("giftOptionId");

-- AddForeignKey
ALTER TABLE "GiftCoupon" ADD CONSTRAINT "GiftCoupon_giftOptionId_fkey" FOREIGN KEY ("giftOptionId") REFERENCES "GiftOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCoupon" ADD CONSTRAINT "GiftCoupon_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionRequest" ADD CONSTRAINT "RedemptionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionRequest" ADD CONSTRAINT "RedemptionRequest_giftOptionId_fkey" FOREIGN KEY ("giftOptionId") REFERENCES "GiftOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionRequest" ADD CONSTRAINT "RedemptionRequest_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "GiftCoupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
