import crypto from 'crypto';
import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';
import { appConfig } from '../../2-utils/config';
import { normalizeIsraeliPhone } from '../../4-models/auth-schemas';
import { sendSms } from '../auth/sms-service';
import { createSessionForUser } from '../auth/auth-logic';

export type InviteResult = {
  sent: number;
  skipped: number;
  notFound?: number;
  failed: number;
  expiresAt?: string;
  expiresInMinutes?: number;
};

type InviteCandidate = {
  id: string;
  phone: string;
};

type InviteOptions = {
  expiresInMinutes: number;
};

const DEFAULT_INVITE_WINDOW_MINUTES = 60;

export function resolveInviteWindowMinutes(raw?: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return DEFAULT_INVITE_WINDOW_MINUTES;
  }
  return Math.min(10_080, Math.max(5, Math.floor(raw)));
}

async function getActiveSurveyOrThrow(surveyId: string) {
  const survey = await dal.survey.findUnique({
    where: { id: surveyId },
    select: {
      id: true,
      title: true,
      status: true,
      isRewarded: true,
      rewardPoints: true,
    },
  });

  if (!survey) {
    throw new AppError('הסקר לא נמצא', 404);
  }

  if (survey.status !== 'ACTIVE') {
    throw new AppError('ניתן לשלוח הזמנות רק לסקר פעיל', 400);
  }

  if (!appConfig.publicBaseUrl) {
    throw new AppError(
      'כתובת PUBLIC_BASE_URL לא מוגדרת בשרת. לא ניתן לבנות קישורי הזמנה.',
      503
    );
  }

  return survey;
}

function buildInviteMessage(
  survey: {
    id: string;
    title: string;
    isRewarded: boolean;
    rewardPoints: number;
  },
  accessToken: string,
  expiresInMinutes: number
): string {
  const url = `${appConfig.publicBaseUrl}/surveys/${survey.id}?t=${accessToken}`;
  const deadlineLine = `יש לך ${expiresInMinutes} דקות לענות מהרגע שנשלחה ההודעה – אחר כך ההזמנה תיסגר ולא ניתן יהיה לענות.`;

  if (survey.isRewarded && survey.rewardPoints > 0) {
    return `הוזמנת לענות על סקר "${survey.title}" ולהרוויח ${survey.rewardPoints} נקודות.\n${deadlineLine}\n${url}`;
  }
  return `הוזמנת לענות על סקר "${survey.title}".\n${deadlineLine}\n${url}`;
}

function newAccessToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * מסנן מועמדים שכבר יש להם הזמנה פעילה או שכבר השלימו את הסקר.
 * הזמנות שפג תוקפן – ניתנות לשליחה מחדש.
 */
async function filterEligibleCandidates(
  surveyId: string,
  candidates: InviteCandidate[]
): Promise<{
  eligible: InviteCandidate[];
  skipped: number;
  renewIds: Set<string>;
}> {
  if (candidates.length === 0) {
    return { eligible: [], skipped: 0, renewIds: new Set() };
  }

  const userIds = candidates.map((c) => c.id);
  const now = new Date();

  const [existingInvites, completedResponses] = await Promise.all([
    dal.surveyInvitation.findMany({
      where: { surveyId, userId: { in: userIds } },
      select: { userId: true, expiresAt: true },
    }),
    dal.surveyResponse.findMany({
      where: {
        surveyId,
        userId: { in: userIds },
        status: 'COMPLETED',
      },
      select: { userId: true },
    }),
  ]);

  const completedIds = new Set(completedResponses.map((r) => r.userId));
  const activeInviteIds = new Set<string>();
  const renewIds = new Set<string>();

  for (const invite of existingInvites) {
    const stillOpen =
      !invite.expiresAt || invite.expiresAt.getTime() > now.getTime();
    if (stillOpen) {
      activeInviteIds.add(invite.userId);
    } else {
      renewIds.add(invite.userId);
    }
  }

  const skipIds = new Set<string>([...activeInviteIds, ...completedIds]);
  const eligible = candidates.filter((c) => !skipIds.has(c.id));
  return {
    eligible,
    skipped: candidates.length - eligible.length,
    renewIds,
  };
}

const SMS_CONCURRENCY = 5;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    }
  );
  await Promise.all(runners);
}

async function sendInvitationsToUsers(
  survey: {
    id: string;
    title: string;
    isRewarded: boolean;
    rewardPoints: number;
  },
  users: InviteCandidate[],
  options: InviteOptions,
  renewIds: Set<string>
): Promise<{ sent: number; failed: number; expiresAt: Date }> {
  const expiresAt = new Date(
    Date.now() + options.expiresInMinutes * 60 * 1000
  );
  let sent = 0;
  let failed = 0;

  await runWithConcurrency(users, SMS_CONCURRENCY, async (user) => {
    const accessToken = newAccessToken();
    const message = buildInviteMessage(
      survey,
      accessToken,
      options.expiresInMinutes
    );

    try {
      // קודם שומרים הזמנה (או מחדשים תוקף) – אחר כך SMS
      if (renewIds.has(user.id)) {
        await dal.surveyInvitation.update({
          where: {
            surveyId_userId: { surveyId: survey.id, userId: user.id },
          },
          data: {
            status: 'SENT',
            accessToken,
            expiresAt,
            sentAt: new Date(),
            openedAt: null,
          },
        });
      } else {
        await dal.surveyInvitation.create({
          data: {
            surveyId: survey.id,
            userId: user.id,
            status: 'SENT',
            accessToken,
            expiresAt,
          },
        });
      }

      try {
        await sendSms(user.phone, message);
        sent += 1;
      } catch (smsError) {
        // SMS נכשל – מוחקים/מבטלים כדי לאפשר ניסיון חוזר ולא להשאיר קישור יתום
        await dal.surveyInvitation.delete({
          where: {
            surveyId_userId: { surveyId: survey.id, userId: user.id },
          },
        });
        throw smsError;
      }
    } catch (error) {
      failed += 1;
      console.error(
        `[invite] failed for user=${user.id} phone=${user.phone}:`,
        error instanceof Error ? error.message : error
      );
    }
  });

  return { sent, failed, expiresAt };
}

/**
 * הזמנת עונים מאושרים לפי תגיות (OR – לפחות תגית אחת מהרשימה).
 */
export async function inviteByTags(
  surveyId: string,
  tagIds: string[],
  options?: { expiresInMinutes?: number }
): Promise<InviteResult> {
  const survey = await getActiveSurveyOrThrow(surveyId);
  const expiresInMinutes = resolveInviteWindowMinutes(options?.expiresInMinutes);
  const uniqueTagIds = [...new Set(tagIds)];

  const tags = await dal.tag.findMany({
    where: { id: { in: uniqueTagIds } },
    select: { id: true },
  });

  if (tags.length === 0) {
    throw new AppError('לא נמצאו תגיות תואמות', 400);
  }

  const users = await dal.user.findMany({
    where: {
      status: 'APPROVED',
      role: 'USER',
      tags: {
        some: {
          tagId: { in: tags.map((t) => t.id) },
        },
      },
    },
    select: { id: true, phone: true },
  });

  const { eligible, skipped, renewIds } = await filterEligibleCandidates(
    surveyId,
    users
  );
  const { sent, failed, expiresAt } = await sendInvitationsToUsers(
    survey,
    eligible,
    { expiresInMinutes },
    renewIds
  );

  return {
    sent,
    skipped,
    failed,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes,
  };
}

/**
 * הזמנה לפי רשימת טלפונים.
 * משתמשים קיימים במערכת מקבלים גם רשומת SurveyInvitation.
 * מספרים שלא במערכת מקבלים SMS בלבד (אם תקין) – בלי כניסה אוטומטית.
 */
export async function inviteByPhones(
  surveyId: string,
  phones: string[],
  options?: { expiresInMinutes?: number }
): Promise<InviteResult> {
  const survey = await getActiveSurveyOrThrow(surveyId);
  const expiresInMinutes = resolveInviteWindowMinutes(options?.expiresInMinutes);

  const normalized = [
    ...new Set(
      phones
        .map((p) => {
          try {
            return normalizeIsraeliPhone(p);
          } catch {
            return '';
          }
        })
        .filter((p) => /^05\d{8}$/.test(p))
    ),
  ];

  if (normalized.length === 0) {
    throw new AppError('לא נמצאו מספרי טלפון תקינים ברשימה', 400);
  }

  const existingUsers = await dal.user.findMany({
    where: {
      phone: { in: normalized },
      status: { not: 'BLOCKED' },
    },
    select: { id: true, phone: true, status: true },
  });

  const foundPhones = new Set(existingUsers.map((u) => u.phone));
  const notInSystem = normalized.filter((p) => !foundPhones.has(p));

  const inviteCandidates: InviteCandidate[] = existingUsers
    .filter((u) => u.status === 'APPROVED')
    .map((u) => ({ id: u.id, phone: u.phone }));

  const skippedNonApproved = existingUsers.filter(
    (u) => u.status !== 'APPROVED'
  ).length;

  const { eligible, skipped: skippedAlready, renewIds } =
    await filterEligibleCandidates(surveyId, inviteCandidates);

  const { sent: sentToUsers, failed: failedUsers, expiresAt } =
    await sendInvitationsToUsers(survey, eligible, { expiresInMinutes }, renewIds);

  // SMS בלבד למספרים שלא במערכת – קישור רגיל בלי טוקן כניסה
  const plainUrl = `${appConfig.publicBaseUrl}/surveys/${survey.id}`;
  const deadlineLine = `יש לך ${expiresInMinutes} דקות לענות מהרגע שנשלחה ההודעה – אחר כך ההזמנה תיסגר ולא ניתן יהיה לענות.`;
  const externalMessage =
    survey.isRewarded && survey.rewardPoints > 0
      ? `הוזמנת לענות על סקר "${survey.title}" ולהרוויח ${survey.rewardPoints} נקודות.\n${deadlineLine}\n${plainUrl}`
      : `הוזמנת לענות על סקר "${survey.title}".\n${deadlineLine}\n${plainUrl}`;

  let sentExternal = 0;
  let failedExternal = 0;

  for (const phone of notInSystem) {
    try {
      await sendSms(phone, externalMessage);
      sentExternal += 1;
    } catch (error) {
      failedExternal += 1;
      console.error(
        `[invite] external SMS failed phone=${phone}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return {
    sent: sentToUsers + sentExternal,
    skipped: skippedAlready + skippedNonApproved,
    notFound: notInSystem.length,
    failed: failedUsers + failedExternal,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes,
  };
}

/**
 * כניסה דרך קישור הזמנה מה-SMS – מגדיר סשן בלי OTP.
 */
export async function claimInviteAccess(accessToken: string) {
  const token = accessToken.trim();
  if (!token || token.length < 16) {
    throw new AppError('קישור ההזמנה אינו תקין', 400);
  }

  const invitation = await dal.surveyInvitation.findUnique({
    where: { accessToken: token },
    include: {
      survey: {
        select: { id: true, status: true, title: true },
      },
      user: {
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          status: true,
          referralCode: true,
          demographics: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError('קישור ההזמנה אינו תקין או שפג תוקפו', 404);
  }

  if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      'פג הזמן לענות על הסקר דרך ההזמנה. לא ניתן להתחיל מענה.',
      410
    );
  }

  if (invitation.survey.status !== 'ACTIVE') {
    throw new AppError('הסקר אינו פתוח למענה', 403);
  }

  if (invitation.user.status === 'BLOCKED') {
    throw new AppError('החשבון חסום', 403);
  }

  if (!invitation.openedAt || invitation.status === 'SENT') {
    await dal.surveyInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'OPENED',
        openedAt: invitation.openedAt ?? new Date(),
      },
    });
  }

  const session = await createSessionForUser(invitation.user.id);

  return {
    ...session,
    surveyId: invitation.surveyId,
    inviteExpiresAt: invitation.expiresAt?.toISOString() ?? null,
  };
}

/**
 * אם למשתמש יש הזמנה עם מועד סגירה שעבר – חוסם התחלת מענה.
 */
export async function assertInviteStillOpen(
  surveyId: string,
  userId: string
): Promise<void> {
  const invitation = await dal.surveyInvitation.findUnique({
    where: {
      surveyId_userId: { surveyId, userId },
    },
    select: { expiresAt: true },
  });

  if (
    invitation?.expiresAt &&
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError(
      'פג הזמן לענות על הסקר דרך ההזמנה. ניתן לקבל הזמנה חדשה מהמערכת.',
      410
    );
  }
}

/**
 * סקרים פעילים שהמשתמש הוזמן אליהם ועדיין לא השלים (ועדיין בתוך חלון ההזמנה).
 */
export async function getInvitedSurveys(
  userId: string,
  options?: { skip?: number; take?: number }
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 10;
  const now = new Date();

  const where = {
    userId,
    status: { in: ['SENT' as const, 'OPENED' as const] },
    survey: { status: 'ACTIVE' as const },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    NOT: {
      survey: {
        responses: {
          some: { userId, status: 'COMPLETED' as const },
        },
      },
    },
  };

  const [invitations, total] = await Promise.all([
    dal.surveyInvitation.findMany({
      where,
      include: {
        survey: {
          select: {
            id: true,
            title: true,
            description: true,
            isRewarded: true,
            rewardPoints: true,
            timeLimitMinutes: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      skip,
      take,
    }),
    dal.surveyInvitation.count({ where }),
  ]);

  return {
    invitations: invitations.map((i) => ({
      invitationId: i.id,
      status: i.status,
      sentAt: i.sentAt,
      expiresAt: i.expiresAt,
      survey: i.survey,
    })),
    total,
    skip,
    take,
  };
}
