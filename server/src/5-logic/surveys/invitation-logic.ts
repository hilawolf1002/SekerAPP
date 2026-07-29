import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';
import { appConfig } from '../../2-utils/config';
import { normalizeIsraeliPhone } from '../../4-models/auth-schemas';
import { sendSms } from '../auth/sms-service';

export type InviteResult = {
  sent: number;
  skipped: number;
  notFound?: number;
  failed: number;
};

type InviteCandidate = {
  id: string;
  phone: string;
};

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

function buildInviteMessage(survey: {
  id: string;
  title: string;
  isRewarded: boolean;
  rewardPoints: number;
}): string {
  const url = `${appConfig.publicBaseUrl}/surveys/${survey.id}`;
  if (survey.isRewarded && survey.rewardPoints > 0) {
    return `הוזמנת לענות על סקר "${survey.title}" ולהרוויח ${survey.rewardPoints} נקודות: ${url}`;
  }
  return `הוזמנת לענות על סקר "${survey.title}": ${url}`;
}

/**
 * מסנן מועמדים שכבר הוזמנו או כבר השלימו את הסקר.
 */
async function filterEligibleCandidates(
  surveyId: string,
  candidates: InviteCandidate[]
): Promise<{ eligible: InviteCandidate[]; skipped: number }> {
  if (candidates.length === 0) {
    return { eligible: [], skipped: 0 };
  }

  const userIds = candidates.map((c) => c.id);

  const [existingInvites, completedResponses] = await Promise.all([
    dal.surveyInvitation.findMany({
      where: { surveyId, userId: { in: userIds } },
      select: { userId: true },
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

  const skipIds = new Set<string>([
    ...existingInvites.map((i) => i.userId),
    ...completedResponses.map((r) => r.userId),
  ]);

  const eligible = candidates.filter((c) => !skipIds.has(c.id));
  return { eligible, skipped: candidates.length - eligible.length };
}

async function sendInvitationsToUsers(
  survey: {
    id: string;
    title: string;
    isRewarded: boolean;
    rewardPoints: number;
  },
  users: InviteCandidate[]
): Promise<{ sent: number; failed: number }> {
  const message = buildInviteMessage(survey);
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await sendSms(user.phone, message);
      await dal.surveyInvitation.create({
        data: {
          surveyId: survey.id,
          userId: user.id,
          status: 'SENT',
        },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[invite] failed for user=${user.id} phone=${user.phone}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return { sent, failed };
}

/**
 * הזמנת עונים מאושרים לפי תגיות (OR – לפחות תגית אחת מהרשימה).
 */
export async function inviteByTags(
  surveyId: string,
  tagIds: string[]
): Promise<InviteResult> {
  const survey = await getActiveSurveyOrThrow(surveyId);
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

  const { eligible, skipped } = await filterEligibleCandidates(surveyId, users);
  const { sent, failed } = await sendInvitationsToUsers(survey, eligible);

  return { sent, skipped, failed };
}

/**
 * הזמנה לפי רשימת טלפונים.
 * משתמשים קיימים במערכת מקבלים גם רשומת SurveyInvitation.
 * מספרים שלא במערכת מקבלים SMS בלבד (אם תקין).
 */
export async function inviteByPhones(
  surveyId: string,
  phones: string[]
): Promise<InviteResult> {
  const survey = await getActiveSurveyOrThrow(surveyId);

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

  // רק עונים מאושרים (או אדמין) מקבלים הזמנה רשומה במערכת
  const inviteCandidates: InviteCandidate[] = existingUsers
    .filter((u) => u.status === 'APPROVED')
    .map((u) => ({ id: u.id, phone: u.phone }));

  // משתמשים קיימים שאינם APPROVED – דילוג (לא שולחים הזמנת פאנל)
  const skippedNonApproved = existingUsers.filter(
    (u) => u.status !== 'APPROVED'
  ).length;

  const { eligible, skipped: skippedAlready } = await filterEligibleCandidates(
    surveyId,
    inviteCandidates
  );

  const { sent: sentToUsers, failed: failedUsers } =
    await sendInvitationsToUsers(survey, eligible);

  // SMS בלבד למספרים שלא במערכת
  const message = buildInviteMessage(survey);
  let sentExternal = 0;
  let failedExternal = 0;

  for (const phone of notInSystem) {
    try {
      await sendSms(phone, message);
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
  };
}

/**
 * סקרים פעילים שהמשתמש הוזמן אליהם ועדיין לא השלים.
 */
export async function getInvitedSurveys(
  userId: string,
  options?: { skip?: number; take?: number }
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 10;

  const where = {
    userId,
    status: { in: ['SENT' as const, 'OPENED' as const] },
    survey: { status: 'ACTIVE' as const },
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
      survey: i.survey,
    })),
    total,
    skip,
    take,
  };
}
