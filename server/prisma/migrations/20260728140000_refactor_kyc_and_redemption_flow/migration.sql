-- ============================================================
-- Migration: refactor_kyc_and_redemption_flow
-- שינויים:
-- 1. הסרת idDocument מ-KYC (ת.ז. נדרשת רק בפדיון)
-- 2. שינוי RedemptionRequest לזרימת פנייה ידנית
--    (email + idDocumentKey + PENDING by default)
-- 3. הסרת הקשר GiftCoupon↔RedemptionRequest
-- ============================================================

-- RedemptionRequest: הסרת עמודות ישנות + הוספת חדשות
ALTER TABLE "RedemptionRequest" DROP COLUMN IF EXISTS "couponCode";
ALTER TABLE "RedemptionRequest" DROP COLUMN IF EXISTS "couponId";
ALTER TABLE "RedemptionRequest" DROP COLUMN IF EXISTS "giftOptionId";

ALTER TABLE "RedemptionRequest" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "RedemptionRequest" ADD COLUMN IF NOT EXISTS "idDocumentKey" TEXT;

-- שינוי ברירת מחדל של status ל-PENDING
ALTER TABLE "RedemptionRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- GiftCoupon: הסרת usedByUserId
ALTER TABLE "GiftCoupon" DROP COLUMN IF EXISTS "usedByUserId";
ALTER TABLE "GiftCoupon" DROP COLUMN IF EXISTS "usedAt" CASCADE;
ALTER TABLE "GiftCoupon" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
