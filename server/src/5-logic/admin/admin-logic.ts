import { Prisma } from '@prisma/client';
import path from 'path';
import { readFile, unlink } from 'fs/promises';
import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';
import { sendSms } from '../auth/sms-service';
import { syncUserDemographicTags } from './auto-tag-logic';
import { getOrCreateSettings } from './settings-redemption-logic';

const uploadRoot = path.resolve(__dirname, '../../../private-uploads/kyc');

function absolutePathForKey(storageKey: string): string | null {
  const absolutePath = path.resolve(uploadRoot, storageKey);
  const relative = path.relative(uploadRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return absolutePath;
}

/**
 * קבלת כל המשתמשים במערכת עם סינון
 */
export async function getAllUsers(options: {
  status?: string;
  role?: string;
  search?: string;
  skip?: number;
  take?: number;
}) {
  const { status, role, search, skip = 0, take = 20 } = options;

  const where: Prisma.UserWhereInput = {};

  if (status) {
    where.status = status as any;
  }
  if (role) {
    where.role = role as any;
  }
  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    dal.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
        idVerified: true,
        createdAt: true,
        demographics: true,
        tags: {
          include: {
            tag: { select: { id: true, name: true } },
          },
        },
      },
    }),
    dal.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      phone: u.phone,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      idVerified: u.idVerified,
      createdAt: u.createdAt,
      demographics: u.demographics,
      tags: u.tags.map((t) => t.tag),
    })),
    total,
    skip,
    take,
  };
}

/**
 * קבלת עונים הממתינים לאישור
 */
export async function getPendingResponders() {
  const users = await dal.user.findMany({
    where: { status: 'PENDING_APPROVAL' },
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true,
      phone: true,
      name: true,
      demographics: true,
      idDocumentUrl: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return users.map((user) => {
    const demographics =
      user.demographics &&
      typeof user.demographics === 'object' &&
      !Array.isArray(user.demographics)
        ? (user.demographics as Prisma.JsonObject)
        : null;

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      hasIdDocument: Boolean(user.idDocumentUrl),
      submittedAt:
        typeof demographics?.kycSubmittedAt === 'string'
          ? demographics.kycSubmittedAt
          : null,
      demographics: {
        dateOfBirth: demographics?.dateOfBirth || null,
        gender: demographics?.gender || null,
        city: demographics?.city || null,
        employmentStatus: demographics?.employmentStatus || null,
        education: demographics?.education || null,
      },
      updatedAt: user.updatedAt,
      createdAt: user.createdAt,
    };
  });
}

/**
 * קבלת פרטי עונה מסוים כולל פעילות
 */
export async function getResponderDetails(userId: string) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      role: true,
      status: true,
      idVerified: true,
      idDocumentUrl: true,
      referralCode: true,
      demographics: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  // ספירת סקרים שענה עליהם
  const [completedResponses, pointTransactions] = await Promise.all([
    dal.surveyResponse.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        survey: {
          select: {
            id: true,
            title: true,
            isRewarded: true,
            rewardPoints: true,
            createdAt: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    }),
    dal.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  // חישוב יתרת נקודות
  const balance = pointTransactions.reduce((sum, t) => sum + t.amount, 0);

  const demographics =
    user.demographics &&
    typeof user.demographics === 'object' &&
    !Array.isArray(user.demographics)
      ? (user.demographics as Prisma.JsonObject)
      : null;

  return {
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      idVerified: user.idVerified,
      hasIdDocument: Boolean(user.idDocumentUrl),
      referralCode: user.referralCode,
      demographics: {
        dateOfBirth: demographics?.dateOfBirth || null,
        gender: demographics?.gender || null,
        city: demographics?.city || null,
        employmentStatus: demographics?.employmentStatus || null,
        education: demographics?.education || null,
        kycSubmittedAt: demographics?.kycSubmittedAt || null,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    activity: {
      totalCompletedSurveys: completedResponses.length,
      pointsBalance: balance,
      recentSurveys: completedResponses.map((r) => ({
        surveyId: r.survey.id,
        surveyTitle: r.survey.title,
        isRewarded: r.survey.isRewarded,
        rewardPoints: r.survey.rewardPoints,
        completedAt: r.completedAt,
      })),
      recentTransactions: pointTransactions.slice(0, 10).map((t) => ({
        amount: t.amount,
        type: t.type,
        note: t.note,
        createdAt: t.createdAt,
      })),
    },
  };
}

/**
 * צפייה בתמונת תעודת הזהות (מחזיר base64 data URL זמני)
 */
export async function getIdDocumentPreview(userId: string) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: { idDocumentUrl: true, name: true },
  });

  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  if (!user.idDocumentUrl) {
    throw new AppError('לא קיים מסמך זהות למשתמש זה', 404);
  }

  const absolutePath = absolutePathForKey(user.idDocumentUrl);
  if (!absolutePath) {
    throw new AppError('נתיב המסמך אינו תקין', 500);
  }

  try {
    const buffer = await readFile(absolutePath);
    const ext = path.extname(user.idDocumentUrl).toLowerCase();
    const mimeType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : 'application/octet-stream';

    return {
      dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
      userName: user.name,
    };
  } catch (error) {
    throw new AppError('לא ניתן לקרוא את מסמך הזהות', 500);
  }
}

/**
 * גיל לפי תאריך לידה (YYYY-MM-DD). מחזיר null אם לא תקין.
 */
function ageFromDateOfBirth(dateOfBirth: unknown): number | null {
  if (typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return null;
  }
  const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age <= 120 ? age : null;
}

function isYouthAge(age: number | null, youthMaxAge: number): boolean {
  return age !== null && age >= 18 && age <= youthMaxAge;
}

/**
 * אישור עונה - שינוי סטטוס ל-APPROVED ושליחת SMS
 */
export async function approveResponder(userId: string) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      name: true,
      status: true,
      idDocumentUrl: true,
      referredById: true,
      demographics: true,
    },
  });

  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  if (user.status === 'APPROVED') {
    throw new AppError('המשתמש כבר מאושר', 409);
  }

  if (user.status !== 'PENDING_APPROVAL') {
    throw new AppError('רק משתמש הממתין לאישור יכול להיות מאושר', 400);
  }

  // מחיקת מסמך הזהות אחרי האישור (נשאר רק idVerified)
  if (user.idDocumentUrl) {
    const absolutePath = absolutePathForKey(user.idDocumentUrl);
    if (absolutePath) {
      await unlink(absolutePath).catch(() => undefined);
    }
  }

  const settings = await getOrCreateSettings();
  const demographics =
    user.demographics &&
    typeof user.demographics === 'object' &&
    !Array.isArray(user.demographics)
      ? (user.demographics as Record<string, unknown>)
      : {};
  const age = ageFromDateOfBirth(demographics.dateOfBirth);
  const isYouth = isYouthAge(age, settings.youthMaxAge);

  const updated = await dal.$transaction(async (tx) => {
    const approved = await tx.user.update({
      where: { id: userId },
      data: {
        status: 'APPROVED',
        idVerified: true,
        idDocumentUrl: null,
      },
    });

    if (settings.signupBonus > 0) {
      const alreadyJoin = await tx.pointTransaction.findFirst({
        where: { userId, type: 'JOIN_BONUS' },
      });
      if (!alreadyJoin) {
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: settings.signupBonus,
            type: 'JOIN_BONUS',
            note: 'בונוס הצטרפות לפאנל העונים',
          },
        });
      }
    }

    if (user.referredById) {
      const youthExtra =
        isYouth && settings.youthReferralBonus > 0
          ? settings.youthReferralBonus
          : 0;
      const referralAmount = settings.referralBonus + youthExtra;

      if (referralAmount > 0) {
        const alreadyReferral = await tx.pointTransaction.findFirst({
          where: {
            userId: user.referredById,
            type: 'REFERRAL_BONUS',
            referenceId: userId,
          },
        });
        if (!alreadyReferral) {
          const friendName = user.name?.trim() || 'חבר חדש';
          const note =
            youthExtra > 0
              ? `הגיע דרכך חבר בשם: ${friendName} (כולל בונוס צעיר)`
              : `הגיע דרכך חבר בשם: ${friendName}`;
          await tx.pointTransaction.create({
            data: {
              userId: user.referredById,
              amount: referralAmount,
              type: 'REFERRAL_BONUS',
              referenceId: userId,
              note,
            },
          });
        }
      }
    }

    return approved;
  });

  try {
    await syncUserDemographicTags(userId, demographics);
  } catch (error) {
    console.error(`[auto-tag] approve failed for user=${userId}:`, error);
  }

  // שליחת SMS למשתמש (בפיתוח עם OTP_DELIVERY=console – נכתב ללוג)
  try {
    const message = `שלום ${user.name || 'עונה'},\nבקשתך להצטרף לפאנל העונים אושרה!\nכעת תוכל לענות על סקרים מתוגמלים ולצבור נקודות.\nצוות SekerApp`;
    await sendSms(user.phone, message);
  } catch (error) {
    console.error(`Failed to send approval SMS to ${user.phone}:`, error);
    // לא זורקים שגיאה - האישור בוצע גם אם ה-SMS נכשל
  }

  return {
    userId: updated.id,
    status: updated.status,
    message: 'העונה אושר בהצלחה, מסמך הזהות נמחק, ונשלחה הודעת SMS',
  };
}

/**
 * דחיית עונה - שינוי סטטוס ל-REJECTED, מחיקת ת.ז. ושליחת SMS אופציונלי
 */
export async function rejectResponder(
  userId: string,
  options?: { sendSms?: boolean; reason?: string }
) {
  const { sendSms: shouldSendSms = true, reason } = options || {};

  const user = await dal.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      name: true,
      status: true,
      idDocumentUrl: true,
    },
  });

  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  if (user.status !== 'PENDING_APPROVAL') {
    throw new AppError('רק משתמש הממתין לאישור יכול להידחות', 400);
  }

  // מחיקת מסמך הזהות
  if (user.idDocumentUrl) {
    const absolutePath = absolutePathForKey(user.idDocumentUrl);
    if (absolutePath) {
      await unlink(absolutePath).catch(() => undefined);
    }
  }

  // עדכון הסטטוס
  const updated = await dal.user.update({
    where: { id: userId },
    data: {
      status: 'REJECTED',
      idDocumentUrl: null,
      idVerified: false,
    },
  });

  // שליחת SMS למשתמש (אופציונלי)
  if (shouldSendSms) {
    try {
      const message = reason
        ? `שלום ${user.name || 'עונה'},\nבקשתך להצטרף לפאנל העונים נדחתה.\nסיבה: ${reason}\nניתן להגיש בקשה מחדש.\nצוות SekerApp`
        : `שלום ${user.name || 'עונה'},\nבקשתך להצטרף לפאנל העונים נדחתה.\nניתן להגיש בקשה מחדש עם פרטים מעודכנים.\nצוות SekerApp`;
      await sendSms(user.phone, message);
    } catch (error) {
      console.error(`Failed to send rejection SMS to ${user.phone}:`, error);
    }
  }

  return {
    userId: updated.id,
    status: updated.status,
    message: 'העונה נדחה ומסמך הזהות נמחק',
  };
}

/**
 * חסימת משתמש
 */
export async function blockUser(userId: string, reason?: string) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, name: true, status: true },
  });

  if (!user) {
    throw new AppError('המשתמש לא נמצא', 404);
  }

  if (user.status === 'BLOCKED') {
    throw new AppError('המשתמש כבר חסום', 409);
  }

  const updated = await dal.user.update({
    where: { id: userId },
    data: { status: 'BLOCKED' },
  });

  // שליחת SMS למשתמש
  try {
    const message = reason
      ? `שלום ${user.name || 'משתמש'},\nחשבונך נחסם.\nסיבה: ${reason}\nלפרטים נוספים ניתן לפנות לתמיכה.\nצוות SekerApp`
      : `שלום ${user.name || 'משתמש'},\nחשבונך נחסם במערכת.\nלפרטים נוספים ניתן לפנות לתמיכה.\nצוות SekerApp`;
    await sendSms(user.phone, message);
  } catch (error) {
    console.error(`Failed to send block SMS to ${user.phone}:`, error);
  }

  return {
    userId: updated.id,
    status: updated.status,
    message: 'המשתמש נחסם בהצלחה',
  };
}

/**
 * סטטיסטיקות כלליות למערכת
 */
export async function getSystemStats() {
  const [
    totalUsers,
    pendingApprovals,
    approvedResponders,
    totalSurveys,
    totalResponses,
    totalPoints,
  ] = await Promise.all([
    dal.user.count(),
    dal.user.count({ where: { status: 'PENDING_APPROVAL' } }),
    dal.user.count({ where: { status: 'APPROVED' } }),
    dal.survey.count(),
    dal.surveyResponse.count({ where: { status: 'COMPLETED' } }),
    dal.pointTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      pendingApprovals,
      approvedResponders,
    },
    surveys: {
      total: totalSurveys,
      totalResponses,
    },
    points: {
      totalAwarded: totalPoints._sum.amount || 0,
    },
  };
}

/**
 * משתמשים מאושרים שזכאים לפדיון לפי יעד ההגדרות
 */
export async function getPendingRedemptions() {
  let settings = await dal.globalSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await dal.globalSettings.create({
      data: {
        id: 1,
        redemptionGoal: 100,
        signupBonus: 0,
        referralBonus: 0,
        youthReferralBonus: 0,
        youthMaxAge: 22,
        defaultTimeLimitMinutes: 10,
      },
    });
  }
  const goal = settings.redemptionGoal;

  const transactions = await dal.pointTransaction.groupBy({
    by: ['userId'],
    _sum: { amount: true },
    having: {
      amount: {
        _sum: {
          gte: goal,
        },
      },
    },
  });

  const userIds = transactions.map((t) => t.userId);

  if (userIds.length === 0) {
    return [];
  }

  const users = await dal.user.findMany({
    where: {
      id: { in: userIds },
      status: 'APPROVED',
    },
    select: {
      id: true,
      phone: true,
      name: true,
      demographics: true,
    },
  });

  return users.map((user) => {
    const transaction = transactions.find((t) => t.userId === user.id);
    return {
      userId: user.id,
      phone: user.phone,
      name: user.name,
      pointsBalance: transaction?._sum.amount || 0,
      redemptionGoal: goal,
    };
  });
}
