import { z } from 'zod';

export const updateSettingsSchema = z.object({
  redemptionGoal: z.number().int().min(1).max(1_000_000).optional(),
  signupBonus: z.number().int().min(0).max(1_000_000).optional(),
  referralBonus: z.number().int().min(0).max(1_000_000).optional(),
  youthReferralBonus: z.number().int().min(0).max(1_000_000).optional(),
  youthMaxAge: z.number().int().min(18).max(35).optional(),
  defaultTimeLimitMinutes: z.number().int().min(1).max(120).optional(),
  defaultMaxResponses: z.number().int().min(1).max(1_000_000).nullable().optional(),
});

export const createGiftOptionSchema = z.object({
  storeName: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  pointsCost: z.number().int().min(1).max(1_000_000),
  isActive: z.boolean().optional().default(true),
});

export const updateGiftOptionSchema = createGiftOptionSchema.partial();

export const addGiftCouponsSchema = z.object({
  codes: z
    .array(z.string().trim().min(2).max(80))
    .min(1, 'יש להזין לפחות קוד אחד')
    .max(500),
});

/** לא בשימוש יותר (שמור לתאימות) */
export const redeemGiftSchema = z.object({
  giftOptionId: z.string().uuid('מזהה מתנה לא תקין').optional(),
});

/** סכמה לבקשת פדיון – רק מייל (ת.ז. מגיעה כקובץ multipart) */
export const redemptionRequestSchema = z.object({
  email: z
    .string({ required_error: 'יש להזין כתובת מייל לקבלת הקופון' })
    .email('כתובת מייל אינה תקינה')
    .max(200),
});

export const fulfillRedemptionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const setUserStatusSchema = z.object({
  status: z.enum(['NEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'BLOCKED']),
  reason: z.string().trim().max(300).optional(),
});

export const createTagSchema = z.object({
  name: z
    .string({ required_error: 'יש להזין שם תגית' })
    .trim()
    .min(2, 'שם התגית קצר מדי')
    .max(60, 'שם התגית ארוך מדי'),
});

export const setUserTagsSchema = z.object({
  tagIds: z.array(z.string().uuid('מזהה תגית אינו תקין')).max(50),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateGiftOptionInput = z.infer<typeof createGiftOptionSchema>;
export type UpdateGiftOptionInput = z.infer<typeof updateGiftOptionSchema>;
export type AddGiftCouponsInput = z.infer<typeof addGiftCouponsSchema>;
export type RedeemGiftInput = z.infer<typeof redeemGiftSchema>;
export type RedemptionRequestInput = z.infer<typeof redemptionRequestSchema>;
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type SetUserTagsInput = z.infer<typeof setUserTagsSchema>;
