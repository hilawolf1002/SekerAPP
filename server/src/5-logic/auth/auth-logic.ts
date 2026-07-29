import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { dal } from '../../2-utils/dal';
import { appConfig } from '../../2-utils/config';
import { AppError } from '../../2-utils/app-error';
import { RequestOtpInput, VerifyOtpInput, AdminLoginInput } from '../../4-models/auth-schemas';
import { JwtPayload } from '../../3-middleware/auth-middleware';
import { sendOtpSms } from './sms-service';
import { normalizeIsraeliPhone } from '../../4-models/auth-schemas';

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateOtpCode(): string {
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(appConfig.otp.length, '0');
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, appConfig.jwtSecret, {
    expiresIn: appConfig.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(appConfig.cookieName, token, {
    httpOnly: true,
    secure: !appConfig.isDev,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(appConfig.cookieName, {
    httpOnly: true,
    secure: !appConfig.isDev,
    sameSite: 'lax',
    path: '/',
  });
}

function isDevBypassPhone(phone: string): boolean {
  if (!appConfig.isDev) return false;
  const bypass = normalizeIsraeliPhone(appConfig.devAuthBypassPhone);
  return phone === bypass;
}

async function ensureUserAndToken(phone: string) {
  const user = await dal.user.upsert({
    where: { phone },
    create: { phone, status: 'NEW', role: 'USER' },
    update: {},
  });

  if (user.status === 'BLOCKED') {
    throw new AppError('החשבון חסום', 403);
  }

  const token = signToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      referralCode: user.referralCode,
      demographics: user.demographics,
    },
  };
}

/**
 * בקשת קוד OTP לטלפון.
 * כברירת מחדל נשלח SMS אמיתי דרך Micropay.
 * OTP_DELIVERY=console – רק לפיתוח מקומי בלי SMS.
 * DEV bypass: מספר מוגדר נכנס ישר בלי קוד (רק בפיתוח).
 */
export async function requestOtp(input: RequestOtpInput) {
  const { phone } = input;

  // --- מעקף זמני לפיתוח (להסיר לפני פרודקשן) ---
  if (isDevBypassPhone(phone)) {
    console.warn(`[DEV AUTH BYPASS] instant login for phone=${phone}`);
    const session = await ensureUserAndToken(phone);
    return {
      success: true,
      bypassLogin: true as const,
      message: 'התחברות פיתוח – ללא קוד (זמני)',
      ...session,
    };
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(
    Date.now() + appConfig.otp.ttlMinutes * 60 * 1000
  );

  const otpRecord = await dal.$transaction(async (tx) => {
    // נעילה לפי מספר טלפון: מונעת מבקשות מקבילות לעקוף את מגבלת השליחה.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${phone}, 1))
    `;

    const windowStart = new Date(
      Date.now() - appConfig.otp.requestWindowMinutes * 60 * 1000
    );
    const [requestsInWindow, latestRequest] = await Promise.all([
      tx.authOtp.count({
        where: { phone, createdAt: { gte: windowStart } },
      }),
      tx.authOtp.findFirst({
        where: { phone },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    if (requestsInWindow >= appConfig.otp.maxRequestsPerPhone) {
      throw new AppError(
        'נשלחו יותר מדי קודי אימות למספר זה. יש לנסות שוב מאוחר יותר',
        429
      );
    }

    const cooldownMs = appConfig.otp.resendCooldownSeconds * 1000;
    if (
      latestRequest &&
      Date.now() - latestRequest.createdAt.getTime() < cooldownMs
    ) {
      throw new AppError(
        `יש להמתין ${appConfig.otp.resendCooldownSeconds} שניות לפני שליחת קוד נוסף`,
        429
      );
    }

    // מבטל קודים קודמים פעילים לאותו טלפון.
    await tx.authOtp.updateMany({
      where: { phone, consumed: false },
      data: { consumed: true },
    });

    const record = await tx.authOtp.create({
      data: { phone, codeHash, expiresAt },
    });

    // יוצר משתמש אם לא קיים (סטטוס NEW) – בלי לאשר כעונה עדיין.
    await tx.user.upsert({
      where: { phone },
      create: { phone, status: 'NEW', role: 'USER' },
      update: {},
    });

    return record;
  });

  try {
    if (appConfig.otp.delivery === 'sms') {
      await sendOtpSms(phone, code);
    } else {
      console.log(
        `[DEV OTP console] phone=${phone} code=${code} (expires in ${appConfig.otp.ttlMinutes}m)`
      );
    }
  } catch (error) {
    await dal.authOtp.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });
    throw error;
  }

  return {
    success: true,
    bypassLogin: false as const,
    message:
      appConfig.otp.delivery === 'sms'
        ? 'נשלח אליך קוד אימות ב-SMS'
        : 'קוד אימות נוצר (מצב פיתוח – ראי בקונסול השרת)',
    expiresInMinutes: appConfig.otp.ttlMinutes,
    // קוד מוחזר ללקוח רק במצב console – לא ב-SMS אמיתי
    ...(appConfig.otp.delivery === 'console' ? { devCode: code } : {}),
  };
}

/**
 * אימות OTP והנפקת Cookie/JWT.
 */
export async function verifyOtp(input: VerifyOtpInput) {
  const { phone, code } = input;

  const otp = await dal.authOtp.findFirst({
    where: { phone, consumed: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    throw new AppError('לא נמצא קוד אימות פעיל. יש לבקש קוד חדש', 400);
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    await dal.authOtp.update({
      where: { id: otp.id },
      data: { consumed: true },
    });
    throw new AppError('קוד האימות פג תוקף. יש לבקש קוד חדש', 400);
  }

  if (otp.attempts >= appConfig.otp.maxAttempts) {
    await dal.authOtp.update({
      where: { id: otp.id },
      data: { consumed: true },
    });
    throw new AppError('יותר מדי ניסיונות שגויים. יש לבקש קוד חדש', 429);
  }

  const isValid = otp.codeHash === hashOtp(code);
  if (!isValid) {
    await dal.authOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError('קוד אימות שגוי', 400);
  }

  await dal.authOtp.update({
    where: { id: otp.id },
    data: { consumed: true },
  });

  const user = await dal.user.findUnique({ where: { phone } });
  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  if (user.status === 'BLOCKED') {
    throw new AppError('החשבון חסום', 403);
  }

  const token = signToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      referralCode: user.referralCode,
      demographics: user.demographics,
    },
  };
}

/**
 * התחברות אדמין עם סיסמה.
 * בודק את הסיסמה מול הסיסמה המוגדרת בהגדרות.
 */
export async function loginAdmin(input: AdminLoginInput) {
  const { password } = input;

  if (!appConfig.adminPassword) {
    throw new AppError('אימות אדמין אינו מוגדר במערכת', 500);
  }

  if (password !== appConfig.adminPassword) {
    throw new AppError('סיסמה שגויה', 401);
  }

  // יצירת token עם role=ADMIN ו-userId סימבולי לאדמין
  const adminUserId = 'admin';
  const token = signToken({ userId: adminUserId, role: 'ADMIN' });

  return {
    token,
    user: {
      id: adminUserId,
      role: 'ADMIN' as const,
      name: 'מנהל מערכת',
    },
  };
}

export async function getCurrentUser(userId: string) {
  // במקרה של אדמין, נחזיר מידע בסיסי
  if (userId === 'admin') {
    return {
      id: 'admin',
      role: 'ADMIN' as const,
      name: 'מנהל מערכת',
      phone: null,
      email: null,
      status: 'APPROVED' as const,
      referralCode: null,
      idVerified: false,
      createdAt: new Date(),
      demographics: null,
    };
  }

  const user = await dal.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      role: true,
      status: true,
      referralCode: true,
      idVerified: true,
      createdAt: true,
      demographics: true,
    },
  });

  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  return user;
}
