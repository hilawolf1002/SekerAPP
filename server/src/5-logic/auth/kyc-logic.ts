import { Prisma } from '@prisma/client';
import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';
import { KycApplicationInput } from '../../4-models/auth-schemas';

/**
 * הגשת בקשת KYC – פרטים אישיים בלבד (ללא ת.ז.).
 * ת.ז. נדרשת רק בשלב פדיון הנקודות.
 * אופציונלי: טלפון חבר מפנה → שמירת referredById אם קיים במאגר.
 */
export async function submitKycApplication(
  userId: string,
  input: KycApplicationInput
) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: { status: true, demographics: true, phone: true },
  });
  if (!user) throw new AppError('המשתמש לא נמצא', 404);

  if (user.status === 'PENDING_APPROVAL') {
    throw new AppError('הבקשה שלך כבר ממתינה לאישור מנהל', 409);
  }
  if (user.status === 'APPROVED') {
    throw new AppError('החשבון שלך כבר מאושר כעונה', 409);
  }
  if (user.status === 'BLOCKED') {
    throw new AppError('החשבון חסום', 403);
  }

  const previousDemographics =
    user.demographics &&
    typeof user.demographics === 'object' &&
    !Array.isArray(user.demographics)
      ? (user.demographics as Prisma.JsonObject)
      : {};

  let referredById: string | null | undefined = undefined;
  if (input.referrerPhone) {
    if (input.referrerPhone === user.phone) {
      throw new AppError('לא ניתן להזין את מספר הטלפון שלך כמפנה', 400);
    }

    const referrer = await dal.user.findUnique({
      where: { phone: input.referrerPhone },
      select: { id: true, status: true },
    });

    if (referrer && referrer.status !== 'BLOCKED') {
      referredById = referrer.id;
    } else {
      // מספר לא נמצא / חסום – ממשיכים בלי קישור (לא חוסמים את ההגשה)
      referredById = null;
    }
  }

  const updated = await dal.user.update({
    where: { id: userId },
    data: {
      name: input.fullName,
      status: 'PENDING_APPROVAL',
      ...(referredById !== undefined ? { referredById } : {}),
      demographics: {
        ...previousDemographics,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        city: input.city,
        employmentStatus: input.employmentStatus,
        education: input.education,
        isAdult: true,
        kycSubmittedAt: new Date().toISOString(),
        ...(input.referrerPhone
          ? { referrerPhoneAttempt: input.referrerPhone }
          : {}),
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      demographics: true,
      referredById: true,
    },
  });

  return updated;
}

export async function getKycStatus(userId: string) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      idVerified: true,
      demographics: true,
    },
  });
  if (!user) throw new AppError('המשתמש לא נמצא', 404);

  const demographics =
    user.demographics &&
    typeof user.demographics === 'object' &&
    !Array.isArray(user.demographics)
      ? (user.demographics as Prisma.JsonObject)
      : null;

  return {
    status: user.status,
    idVerified: user.idVerified,
    submittedAt:
      typeof demographics?.kycSubmittedAt === 'string'
        ? demographics.kycSubmittedAt
        : null,
  };
}
