import { z } from 'zod';

const answerOptionSchema = z.union([
  z.string().min(1),
  z.object({
    id: z.union([z.string(), z.number()]).optional(),
    text: z.string().min(1),
  }),
]);

const questionSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    questionText: z.string().min(1, 'חסר טקסט שאלה'),
    /** choice = בחירה מתוך אפשרויות | open_text = שדה טקסט חופשי */
    type: z.enum(['choice', 'open_text']).optional().default('choice'),
    allowMultiple: z.boolean().optional().default(false),
    answers: z.array(answerOptionSchema).optional(),
    /** מקסימום תווים לשאלה פתוחה */
    maxLength: z.number().int().min(10).max(2000).optional().default(500),
  })
  .superRefine((q, ctx) => {
    const type = q.type ?? 'choice';
    if (type === 'choice') {
      const answers = q.answers ?? [];
      if (answers.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'לשאלת בחירה נדרשות לפחות 2 תשובות',
          path: ['answers'],
        });
      }
    }
  });

export const createSurveySchema = z.object({
  title: z.string().min(2, 'כותרת קצרה מדי').max(200),
  description: z.string().max(2000).optional().nullable(),
  questions: z.array(questionSchema).min(1, 'נדרשת לפחות שאלה אחת'),
  isRewarded: z.boolean().optional().default(false),
  rewardPoints: z.number().int().min(0).max(100000).optional().default(0),
  timeLimitMinutes: z.number().int().min(1).max(120).optional().default(10),
  maxResponses: z.number().int().min(1).max(1_000_000).optional().nullable(),
  imageUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (value) =>
        !value ||
        value.startsWith('/uploads/') ||
        /^https?:\/\//i.test(value),
      'כתובת התמונה אינה תקינה'
    ),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'צבע רקע חייב להיות בפורמט #RRGGBB')
    .optional()
    .nullable()
    .or(z.literal('')),
  thankYouMessage: z.string().max(500).optional().nullable(),
  publish: z.boolean().optional().default(true),
});

export const updateSurveyStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']),
});

export const completeSurveySchema = z.object({
  /** מערך תשובות לפי סדר השאלות. בחירה: מחרוזת/מערך | פתוח: טקסט חופשי */
  answers: z.array(z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])).min(1),
});

/** הזמנת עונים לסקר – לפי תגיות או רשימת טלפונים */
export const inviteSurveySchema = z
  .object({
    mode: z.enum(['tags', 'phones'], {
      required_error: 'יש לבחור מצב הפצה: tags או phones',
    }),
    tagIds: z.array(z.string().uuid('מזהה תגית אינו תקין')).optional(),
    phones: z.array(z.string().min(9).max(20)).optional(),
    /** דקות עד סגירת ההזמנה מרגע השליחה (ברירת מחדל 60) */
    expiresInMinutes: z.number().int().min(5).max(10_080).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'tags') {
      if (!data.tagIds || data.tagIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'יש לבחור לפחות תגית אחת להפצה',
          path: ['tagIds'],
        });
      }
    }
    if (data.mode === 'phones') {
      if (!data.phones || data.phones.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'יש להזין לפחות מספר טלפון אחד',
          path: ['phones'],
        });
      }
    }
  });

export const claimInviteSchema = z.object({
  token: z
    .string({ required_error: 'חסר טוקן הזמנה' })
    .min(16, 'קישור ההזמנה אינו תקין')
    .max(128, 'קישור ההזמנה אינו תקין'),
});
export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyStatusInput = z.infer<typeof updateSurveyStatusSchema>;
export type CompleteSurveyInput = z.infer<typeof completeSurveySchema>;
export type InviteSurveyInput = z.infer<typeof inviteSurveySchema>;
export type ClaimInviteInput = z.infer<typeof claimInviteSchema>;

