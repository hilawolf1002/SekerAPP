import { z } from 'zod';

/** נרמול טלפון ישראלי בסיסי לפורמט 05XXXXXXXX */
export function normalizeIsraeliPhone(raw: string): string {
  let phone = raw.replace(/[\s\-()]/g, '');
  if (phone.startsWith('+972')) {
    phone = '0' + phone.slice(4);
  } else if (phone.startsWith('972')) {
    phone = '0' + phone.slice(3);
  }
  return phone;
}

const phoneSchema = z
  .string({
    required_error: 'חסר שדה phone בבקשה',
    invalid_type_error: 'שדה phone חייב להיות טקסט (ודאי ששולחים JSON עם Content-Type: application/json)',
  })
  .min(9, 'מספר טלפון לא תקין')
  .max(15, 'מספר טלפון לא תקין')
  .transform(normalizeIsraeliPhone)
  .refine((p) => /^05\d{8}$/.test(p), {
    message: 'יש להזין מספר נייד ישראלי תקין (למשל 0501234567)',
  });

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string({
      required_error: 'חסר שדה code בבקשה',
      invalid_type_error: 'שדה code חייב להיות טקסט של 6 ספרות',
    })
    .regex(/^\d{6}$/, 'קוד האימות חייב להכיל 6 ספרות'),
});

function isAdult(dateText: string): boolean {
  const birthDate = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  const eighteenthBirthday = new Date(
    Date.UTC(
      birthDate.getUTCFullYear() + 18,
      birthDate.getUTCMonth(),
      birthDate.getUTCDate()
    )
  );
  return eighteenthBirthday.getTime() <= today.getTime();
}

function isReasonableBirthDate(dateText: string): boolean {
  const birthDate = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return false;
  if (birthDate.toISOString().slice(0, 10) !== dateText) return false;
  const oldestAllowed = new Date();
  oldestAllowed.setFullYear(oldestAllowed.getFullYear() - 120);
  return birthDate >= oldestAllowed;
}

/** שדות טופס KYC נשלחים כ-multipart/form-data ולכן כולם טקסט. */
export const kycApplicationSchema = z.object({
  fullName: z
    .string({ required_error: 'יש להזין שם מלא' })
    .trim()
    .min(2, 'השם קצר מדי')
    .max(100, 'השם ארוך מדי'),
  dateOfBirth: z
    .string({ required_error: 'יש להזין תאריך לידה' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך הלידה אינו תקין')
    .refine(isReasonableBirthDate, 'תאריך הלידה אינו תקין')
    .refine(isAdult, 'ההצטרפות לפאנל מיועדת לבני ובנות 18 ומעלה'),
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say'], {
    required_error: 'יש לבחור מגדר',
    invalid_type_error: 'המגדר שנבחר אינו תקין',
  }),
  city: z
    .string({ required_error: 'יש להזין עיר מגורים' })
    .trim()
    .min(2, 'יש להזין עיר מגורים')
    .max(80, 'שם העיר ארוך מדי'),
  employmentStatus: z.enum(
    ['employee', 'self_employed', 'student', 'not_working', 'retired', 'other'],
    {
      required_error: 'יש לבחור מצב תעסוקתי',
      invalid_type_error: 'המצב התעסוקתי שנבחר אינו תקין',
    }
  ),
  education: z.enum(
    ['high_school', 'professional', 'academic', 'student', 'other'],
    {
      required_error: 'יש לבחור רמת השכלה',
      invalid_type_error: 'רמת ההשכלה שנבחרה אינה תקינה',
    }
  ),
  consent: z.preprocess(
    (value) => value === true || value === 'true',
    z.literal(true, {
      errorMap: () => ({ message: 'יש לאשר את הצהרת נכונות הפרטים' }),
    })
  ),
  /** טלפון של חבר שהזמין – אופציונלי; אם תקין וקיים במערכת → referredById */
  referrerPhone: z
    .string()
    .optional()
    .transform((raw) => {
      if (raw === undefined || raw === null) return undefined;
      const trimmed = String(raw).trim();
      if (!trimmed) return undefined;
      return normalizeIsraeliPhone(trimmed);
    })
    .refine((p) => p === undefined || /^05\d{8}$/.test(p), {
      message: 'מספר הטלפון של החבר אינו תקין (למשל 0501234567)',
    }),
});

export const adminLoginSchema = z.object({
  password: z
    .string({ required_error: 'חסרה סיסמה' })
    .min(1, 'חסרה סיסמה'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type KycApplicationInput = z.infer<typeof kycApplicationSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
