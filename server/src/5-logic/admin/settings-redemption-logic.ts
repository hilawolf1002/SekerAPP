import crypto from 'crypto';
import path from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';
import {
  AddGiftCouponsInput,
  CreateGiftOptionInput,
  UpdateGiftOptionInput,
  UpdateSettingsInput,
} from '../../4-models/admin-schemas';
import { sendSms } from '../auth/sms-service';
import { notifyAdminRedemption } from '../auth/email-service';

// תיקיית אחסון פרטי לת.ז. של פדיון (נפרד מ-KYC)
const redemptionUploadsRoot = path.resolve(
  __dirname,
  '../../../private-uploads/redemptions'
);

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function hasValidImageSignature(buffer: Buffer, mimetype: string): boolean {
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (mimetype === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

async function removeRedemptionDoc(key: string | null): Promise<void> {
  if (!key) return;
  const absolutePath = path.resolve(redemptionUploadsRoot, key);
  const relative = path.relative(redemptionUploadsRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return;
  await unlink(absolutePath).catch(() => undefined);
}

// ==================== הגדרות ====================

const DEFAULT_SETTINGS = {
  id: 1,
  redemptionGoal: 100,
  signupBonus: 0,
  referralBonus: 0,
  youthReferralBonus: 0,
  youthMaxAge: 22,
  defaultTimeLimitMinutes: 10,
  defaultMaxResponses: null as number | null,
};

export async function getOrCreateSettings() {
  const existing = await dal.globalSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return dal.globalSettings.create({ data: DEFAULT_SETTINGS });
}

export async function updateSettings(input: UpdateSettingsInput) {
  await getOrCreateSettings();
  return dal.globalSettings.update({
    where: { id: 1 },
    data: {
      ...(input.redemptionGoal !== undefined ? { redemptionGoal: input.redemptionGoal } : {}),
      ...(input.signupBonus !== undefined ? { signupBonus: input.signupBonus } : {}),
      ...(input.referralBonus !== undefined ? { referralBonus: input.referralBonus } : {}),
      ...(input.youthReferralBonus !== undefined
        ? { youthReferralBonus: input.youthReferralBonus }
        : {}),
      ...(input.youthMaxAge !== undefined ? { youthMaxAge: input.youthMaxAge } : {}),
      ...(input.defaultTimeLimitMinutes !== undefined
        ? { defaultTimeLimitMinutes: input.defaultTimeLimitMinutes }
        : {}),
      ...(input.defaultMaxResponses !== undefined
        ? { defaultMaxResponses: input.defaultMaxResponses }
        : {}),
    },
  });
}

// ==================== מתנות (אדמין) ====================

export async function listGiftOptions(options?: { includeInactive?: boolean }) {
  const where = options?.includeInactive ? {} : { isActive: true };
  const gifts = await dal.giftOption.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { coupons: { where: { isUsed: false } } } } },
  });

  return gifts.map((gift) => ({
    id: gift.id,
    storeName: gift.storeName,
    title: gift.title,
    description: gift.description,
    pointsCost: gift.pointsCost,
    isActive: gift.isActive,
    availableCoupons: gift._count.coupons,
    createdAt: gift.createdAt,
    updatedAt: gift.updatedAt,
  }));
}

export async function createGiftOption(input: CreateGiftOptionInput) {
  return dal.giftOption.create({
    data: {
      storeName: input.storeName,
      title: input.title,
      description: input.description || null,
      pointsCost: input.pointsCost,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateGiftOption(id: string, input: UpdateGiftOptionInput) {
  const existing = await dal.giftOption.findUnique({ where: { id } });
  if (!existing) throw new AppError('המתנה לא נמצאה', 404);
  return dal.giftOption.update({
    where: { id },
    data: {
      ...(input.storeName !== undefined ? { storeName: input.storeName } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.pointsCost !== undefined ? { pointsCost: input.pointsCost } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function addGiftCoupons(giftOptionId: string, input: AddGiftCouponsInput) {
  const gift = await dal.giftOption.findUnique({ where: { id: giftOptionId } });
  if (!gift) throw new AppError('המתנה לא נמצאה', 404);

  const uniqueCodes = [...new Set(input.codes.map((c) => c.trim()).filter(Boolean))];
  if (uniqueCodes.length === 0) throw new AppError('לא נמצאו קודי קופון תקינים', 400);

  let created = 0;
  let skipped = 0;

  for (const code of uniqueCodes) {
    try {
      await dal.giftCoupon.create({ data: { giftOptionId, code } });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return { created, skipped, totalRequested: uniqueCodes.length };
}

// ==================== יתרה ====================

export async function getUserBalance(userId: string): Promise<number> {
  const aggregate = await dal.pointTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

// ==================== פדיון – זרימה חדשה ====================

export type RedemptionIdDoc = {
  buffer: Buffer;
  mimetype: string;
};

/**
 * הגשת בקשת פדיון:
 * - בדיקת מספיק נקודות
 * - שמירת צילום ת.ז. זמנית
 * - יצירת RedemptionRequest עם status=PENDING
 * - שליחת מייל לאדמין
 */
export async function submitRedemptionRequest(
  userId: string,
  email: string,
  idDoc: RedemptionIdDoc
) {
  if (userId === 'admin') {
    throw new AppError('פעולה זו מיועדת למשתמשי פאנל. התחבר עם מספר טלפון.', 403);
  }

  const user = await dal.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, phone: true, name: true },
  });
  if (!user) throw new AppError('המשתמש לא נמצא', 404);
  if (user.status !== 'APPROVED') {
    throw new AppError('רק עונים מאושרים יכולים לפדות נקודות', 403);
  }

  // מניעת כפול: לא יכול להיות PENDING פתוח
  const existing = await dal.redemptionRequest.findFirst({
    where: { userId, status: 'PENDING' },
  });
  if (existing) {
    throw new AppError('קיימת בקשת פדיון פתוחה. המתן לטיפול האדמין.', 409);
  }

  const settings = await getOrCreateSettings();
  const balance = await getUserBalance(userId);

  if (balance < settings.redemptionGoal) {
    throw new AppError(
      `נדרשות לפחות ${settings.redemptionGoal} נקודות כדי לפדות (יש לך ${balance})`,
      400
    );
  }

  // שמירת ת.ז.
  const extension = extensionByMimeType[idDoc.mimetype];
  if (!extension) throw new AppError('סוג הקובץ אינו נתמך', 400);
  if (!hasValidImageSignature(idDoc.buffer, idDoc.mimetype)) {
    throw new AppError('תוכן הקובץ אינו צילום תקין', 400);
  }

  const docKey = `${userId}/${crypto.randomUUID()}${extension}`;
  const absolutePath = path.resolve(redemptionUploadsRoot, docKey);
  const relative = path.relative(redemptionUploadsRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError('נתיב האחסון אינו תקין', 500);
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, idDoc.buffer, { flag: 'wx', mode: 0o600 });

  let redemption;
  try {
    redemption = await dal.redemptionRequest.create({
      data: {
        userId,
        email,
        idDocumentKey: docKey,
        pointsSpent: balance,
        status: 'PENDING',
      },
    });
  } catch (err) {
    await removeRedemptionDoc(docKey);
    throw err;
  }

  // התראת מייל לאדמין (לא חוסמת אם נכשל)
  notifyAdminRedemption({
    userName: user.name || 'לא ידוע',
    userPhone: user.phone,
    userEmail: email,
    pointsSpent: balance,
    redemptionId: redemption.id,
  }).catch((err) =>
    console.error('[redemption] admin email notification failed:', err)
  );

  return {
    redemptionId: redemption.id,
    message:
      'הפנייה התקבלה! תוך 48 שעות תקבל קופון לכתובת המייל שסיפקת. ' +
      'לאחר אישור על ידי מנהל המערכת, הצילום יימחק מהארכיון.',
  };
}

/**
 * אדמין מסמן בקשה כ-FULFILLED ומוחק את ת.ז.
 */
export async function fulfillRedemption(redemptionId: string, adminNote?: string) {
  const req = await dal.redemptionRequest.findUnique({
    where: { id: redemptionId },
    select: { id: true, status: true, idDocumentKey: true, userId: true },
  });
  if (!req) throw new AppError('הבקשה לא נמצאה', 404);
  if (req.status !== 'PENDING') {
    throw new AppError('הבקשה כבר טופלה', 409);
  }

  await dal.redemptionRequest.update({
    where: { id: redemptionId },
    data: {
      status: 'FULFILLED',
      idDocumentKey: null,
      ...(adminNote ? { adminNote } : {}),
    },
  });

  // מחיקת ת.ז. לאחר אישור
  await removeRedemptionDoc(req.idDocumentKey);

  return { ok: true, message: 'הפנייה סומנה כמטופלת. הצילום נמחק.' };
}

/**
 * אדמין דוחה בקשה ומוחק את ת.ז.
 */
export async function rejectRedemption(redemptionId: string, adminNote?: string) {
  const req = await dal.redemptionRequest.findUnique({
    where: { id: redemptionId },
    select: { id: true, status: true, idDocumentKey: true },
  });
  if (!req) throw new AppError('הבקשה לא נמצאה', 404);
  if (req.status !== 'PENDING') {
    throw new AppError('הבקשה כבר טופלה', 409);
  }

  await dal.redemptionRequest.update({
    where: { id: redemptionId },
    data: {
      status: 'REJECTED',
      idDocumentKey: null,
      ...(adminNote ? { adminNote } : {}),
    },
  });

  await removeRedemptionDoc(req.idDocumentKey);

  return { ok: true, message: 'הבקשה נדחתה. הצילום נמחק.' };
}

/**
 * אדמין: תצוגת ת.ז. לצורך אימות הפנייה (base64 מאחורי requireAdmin)
 */
export async function getRedemptionIdDocument(redemptionId: string) {
  const req = await dal.redemptionRequest.findUnique({
    where: { id: redemptionId },
    select: { idDocumentKey: true, status: true },
  });
  if (!req) throw new AppError('הבקשה לא נמצאה', 404);
  if (!req.idDocumentKey) return { hasDocument: false, imageData: null };

  const absolutePath = path.resolve(redemptionUploadsRoot, req.idDocumentKey);
  const relative = path.relative(redemptionUploadsRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError('נתיב הצילום אינו תקין', 500);
  }

  const { readFile } = await import('fs/promises');
  const buffer = await readFile(absolutePath).catch(() => null);
  if (!buffer) return { hasDocument: false, imageData: null };

  const ext = path.extname(req.idDocumentKey).toLowerCase();
  const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const mime = mimeMap[ext] || 'image/jpeg';

  return {
    hasDocument: true,
    imageData: `data:${mime};base64,${buffer.toString('base64')}`,
  };
}

export async function listUserRedemptions(userId: string) {
  return dal.redemptionRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      email: true,
      pointsSpent: true,
      status: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listAllRedemptions(options?: {
  skip?: number;
  take?: number;
}) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;

  const [redemptions, total] = await Promise.all([
    dal.redemptionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        email: true,
        pointsSpent: true,
        status: true,
        adminNote: true,
        idDocumentKey: true,
        createdAt: true,
        user: { select: { id: true, name: true, phone: true } },
      },
    }),
    dal.redemptionRequest.count(),
  ]);

  return { redemptions, total, skip, take };
}

export async function getPointsProgress(userId: string) {
  const [settings, balance] = await Promise.all([
    getOrCreateSettings(),
    getUserBalance(userId),
  ]);

  const goal = settings.redemptionGoal;
  const pointsNeeded = Math.max(0, goal - balance);
  const canRedeem = balance >= goal;
  const progressPercent = goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0;

  // בדוק אם יש כבר PENDING פתוח
  const pendingRedemption = canRedeem
    ? await dal.redemptionRequest.findFirst({
        where: { userId, status: 'PENDING' },
        select: { id: true, createdAt: true },
      })
    : null;

  return {
    balance,
    redemptionGoal: goal,
    pointsNeeded,
    canRedeem,
    progressPercent,
    hasPendingRedemption: Boolean(pendingRedemption),
    pendingRedemptionId: pendingRedemption?.id ?? null,
  };
}

export async function setUserStatus(
  userId: string,
  status: 'NEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'BLOCKED',
  reason?: string
) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, name: true, status: true },
  });
  if (!user) throw new AppError('המשתמש לא נמצא', 404);
  if (user.status === status) throw new AppError('סטטוס המשתמש כבר מעודכן', 409);

  const updated = await dal.user.update({
    where: { id: userId },
    data: {
      status,
      ...(status === 'APPROVED' ? { idVerified: true } : {}),
    },
  });

  const statusMessages: Record<string, string> = {
    APPROVED: 'חשבונך אושר כעונה במערכת SekerApp.',
    REJECTED: 'בקשתך להצטרפות נדחתה. ניתן להגיש שוב.',
    BLOCKED: 'חשבונך נחסם במערכת SekerApp.',
    NEW: 'סטטוס החשבון עודכן.',
    PENDING_APPROVAL: 'הבקשה שלך ממתינה לבדיקה.',
  };

  try {
    const base = statusMessages[status] || 'סטטוס החשבון עודכן.';
    const message = reason
      ? `שלום ${user.name || 'משתמש'},\n${base}\nסיבה: ${reason}\nצוות SekerApp`
      : `שלום ${user.name || 'משתמש'},\n${base}\nצוות SekerApp`;
    await sendSms(user.phone, message);
  } catch (error) {
    console.error(`Failed to send status SMS to ${user.phone}:`, error);
  }

  return { userId: updated.id, status: updated.status, message: 'סטטוס המשתמש עודכן' };
}
