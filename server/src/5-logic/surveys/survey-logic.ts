import { Prisma } from '@prisma/client';
import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';
import {
  CompleteSurveyInput,
  CreateSurveyInput,
  UpdateSurveyStatusInput,
} from '../../4-models/survey-schemas';

type QuestionStored = {
  id: number;
  questionText: string;
  type: 'choice' | 'open_text';
  allowMultiple?: boolean;
  answers?: { id: number; text: string }[];
  maxLength?: number;
};

function normalizeQuestions(input: CreateSurveyInput['questions']): QuestionStored[] {
  return input.map((q, qIndex) => {
    const type = q.type ?? 'choice';
    const base = {
      id: qIndex + 1,
      questionText: q.questionText.trim(),
      type,
    };

    if (type === 'open_text') {
      return {
        ...base,
        maxLength: q.maxLength ?? 500,
      };
    }

    return {
      ...base,
      allowMultiple: Boolean(q.allowMultiple),
      answers: (q.answers ?? []).map((a, aIndex) => ({
        id: aIndex + 1,
        text: typeof a === 'string' ? a.trim() : a.text.trim(),
      })),
    };
  });
}

function getQuestionType(q: QuestionStored): 'choice' | 'open_text' {
  return q.type ?? 'choice';
}

function getStoredQuestions(survey: { questions: Prisma.JsonValue }): QuestionStored[] {
  const raw = survey.questions as unknown;
  if (!Array.isArray(raw)) {
    throw new AppError('מבנה השאלות בסקר אינו תקין', 500);
  }
  return raw as QuestionStored[];
}

/** אדמין סינתטי (JWT id=admin) או יוצר הסקר עצמו */
function canManageSurvey(
  survey: { creatorId: string | null },
  actor: { id: string; role?: string }
): boolean {
  if (actor.role === 'ADMIN') return true;
  return survey.creatorId !== null && survey.creatorId === actor.id;
}

function assertNotSyntheticAdmin(userId: string): void {
  if (userId === 'admin') {
    throw new AppError(
      'מנהל המערכת לא יכול לבצע פעולה זו כמשתמש. יש להתחבר עם מספר טלפון.',
      403
    );
  }
}

async function lockSurvey(
  tx: Prisma.TransactionClient,
  surveyId: string
): Promise<void> {
  // PostgreSQL transaction-level advisory lock: כל פעולות המכסה של אותו סקר
  // רצות בטור, גם כאשר השרת עובד בכמה processes/instances.
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${surveyId}, 0))
  `;
}

export async function createSurvey(
  creatorId: string,
  input: CreateSurveyInput,
  options?: { role?: string }
) {
  if (input.isRewarded && options?.role !== 'ADMIN') {
    throw new AppError(
      'יצירת סקר מתוגמל שמורה למנהלי המערכת. אפשר ליצור סקר רגיל בלי נקודות.',
      403
    );
  }

  const questions = normalizeQuestions(input.questions);
  const rewardPoints = input.isRewarded ? input.rewardPoints ?? 0 : 0;
  // אדמין סינתטי (login בסיסמה) אינו רשומה ב-DB – לא נקשר כ-creator
  const resolvedCreatorId = creatorId === 'admin' ? null : creatorId;

  const survey = await dal.survey.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      questions: questions as unknown as Prisma.InputJsonValue,
      isRewarded: Boolean(input.isRewarded),
      rewardPoints,
      timeLimitMinutes: input.timeLimitMinutes ?? 10,
      maxResponses: input.maxResponses ?? null,
      imageUrl: input.imageUrl?.trim() || null,
      backgroundColor: input.backgroundColor?.trim() || null,
      thankYouMessage: input.thankYouMessage || null,
      status: input.publish === false ? 'DRAFT' : 'ACTIVE',
      creatorId: resolvedCreatorId,
    },
  });

  return survey;
}

export async function getSurveyById(
  surveyId: string,
  options?: { viewerUserId?: string; viewerRole?: string }
) {
  const survey = await dal.survey.findUnique({
    where: { id: surveyId },
    include: {
      _count: {
        select: {
          responses: { where: { status: 'COMPLETED' } },
        },
      },
    },
  });

  if (!survey) {
    throw new AppError('הסקר לא נמצא', 404);
  }

  const isOwner =
    Boolean(options?.viewerUserId) &&
    canManageSurvey(survey, {
      id: options!.viewerUserId!,
      role: options?.viewerRole,
    });

  if (!isOwner && survey.status !== 'ACTIVE') {
    throw new AppError('הסקר אינו פתוח למענה כרגע', 403);
  }

  return {
    ...survey,
    completedResponses: survey._count.responses,
  };
}

export async function listMySurveys(
  creatorId: string,
  options?: { role?: string; skip?: number; take?: number }
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 10;
  // אדמין רואה את כל הסקרים לניהול (כולל כאלה שנוצרו עם creatorId=null)
  const where =
    options?.role === 'ADMIN'
      ? {}
      : { creatorId };

  const [surveys, total] = await Promise.all([
    dal.survey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        _count: {
          select: {
            responses: { where: { status: 'COMPLETED' } },
          },
        },
      },
    }),
    dal.survey.count({ where }),
  ]);

  return { surveys, total, skip, take };
}

export async function updateSurveyStatus(
  surveyId: string,
  userId: string,
  input: UpdateSurveyStatusInput,
  options?: { role?: string }
) {
  const survey = await dal.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError('הסקר לא נמצא', 404);
  if (!canManageSurvey(survey, { id: userId, role: options?.role })) {
    throw new AppError('אין הרשאה לעדכן סקר זה', 403);
  }

  return dal.survey.update({
    where: { id: surveyId },
    data: { status: input.status },
  });
}

/**
 * בודק שהמשתמש זכאי לענות על סקר מתוגמל (עונה מאושר או אדמין).
 */
async function assertRewardEligibility(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  assertNotSyntheticAdmin(userId);

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user) {
    throw new AppError('משתמש לא נמצא', 404);
  }

  if (user.role === 'ADMIN') {
    return;
  }

  if (user.status !== 'APPROVED') {
    throw new AppError(
      'רק עונים מאושרים יכולים לענות על סקרים מתוגמלים. יש להצטרף לפאנל העונים תחילה.',
      403
    );
  }
}

/**
 * מתחיל מענה: תופס מקום + מפעיל שעון (STARTED).
 */
export async function startSurveyResponse(surveyId: string, userId: string) {
  assertNotSyntheticAdmin(userId);

  return dal.$transaction(async (tx) => {
    await lockSurvey(tx, surveyId);

    const survey = await tx.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new AppError('הסקר לא נמצא', 404);
    if (survey.status !== 'ACTIVE') {
      throw new AppError('הסקר אינו פתוח למענה', 403);
    }

    if (survey.isRewarded) {
      await assertRewardEligibility(tx, userId);
    }

    const now = new Date();
    const expiryThreshold = new Date(
      now.getTime() - survey.timeLimitMinutes * 60 * 1000
    );

    // משחרר מקומות שפג זמנם לפני בדיקת המכסה.
    await tx.surveyResponse.updateMany({
      where: {
        surveyId,
        status: 'STARTED',
        startedAt: { lt: expiryThreshold },
      },
      data: { status: 'EXPIRED_TIME' },
    });

    const existing = await tx.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    });

    if (existing?.status === 'COMPLETED') {
      throw new AppError('כבר ענית על סקר זה', 409);
    }

    // מענה פעיל כבר מחזיק מקום, ולכן אפשר לחדש אותו גם כשהמכסה מלאה.
    if (existing?.status === 'STARTED') {
      const deadline =
        existing.startedAt.getTime() + survey.timeLimitMinutes * 60 * 1000;
      return {
        response: existing,
        survey,
        expiresAt: new Date(deadline),
        resumed: true,
      };
    }

    if (survey.maxResponses != null) {
      const reservedOrCompleted = await tx.surveyResponse.count({
        where: {
          surveyId,
          status: { in: ['STARTED', 'COMPLETED'] },
        },
      });
      if (reservedOrCompleted >= survey.maxResponses) {
        throw new AppError('המכסה לסקר זה התמלאה', 409);
      }
    }

    if (existing) {
      const restarted = await tx.surveyResponse.update({
        where: { id: existing.id },
        data: {
          status: 'STARTED',
          startedAt: now,
          answers: Prisma.DbNull,
          completedAt: null,
        },
      });
      return {
        response: restarted,
        survey,
        expiresAt: new Date(
          now.getTime() + survey.timeLimitMinutes * 60 * 1000
        ),
        resumed: false,
      };
    }

    const created = await tx.surveyResponse.create({
      data: { surveyId, userId, status: 'STARTED', startedAt: now },
    });
    return {
      response: created,
      survey,
      expiresAt: new Date(
        now.getTime() + survey.timeLimitMinutes * 60 * 1000
      ),
      resumed: false,
    };
  });
}

function answerTextList(answer: string | string[]): string[] {
  return Array.isArray(answer) ? answer : [answer];
}

function validateAnswersAgainstQuestions(
  questions: QuestionStored[],
  answers: CompleteSurveyInput['answers']
) {
  if (answers.length !== questions.length) {
    throw new AppError('יש לענות על כל השאלות בסקר', 400);
  }

  const normalized: { questionId: number; selected: string[] }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qType = getQuestionType(q);
    const selected = answerTextList(answers[i]).map((s) => s.trim()).filter(Boolean);

    if (selected.length === 0) {
      throw new AppError(`יש לענות על שאלה ${i + 1}`, 400);
    }

    if (qType === 'open_text') {
      const text = selected[0];
      const maxLen = q.maxLength ?? 500;
      if (text.length > maxLen) {
        throw new AppError(
          `תשובה לשאלה ${i + 1} ארוכה מדי (מקסימום ${maxLen} תווים)`,
          400
        );
      }
      normalized.push({ questionId: q.id, selected: [text] });
      continue;
    }

    const allowed = new Set((q.answers ?? []).map((a) => a.text));

    if (!q.allowMultiple && selected.length > 1) {
      throw new AppError(`שאלה ${i + 1} אינה מאפשרת בחירה מרובה`, 400);
    }

    for (const s of selected) {
      if (!allowed.has(s)) {
        throw new AppError(`תשובה לא תקינה בשאלה ${i + 1}: ${s}`, 400);
      }
    }

    normalized.push({ questionId: q.id, selected });
  }

  return normalized;
}

/**
 * משלים מענה: בודק זמן + תשובות, מעניק נקודות אם הסקר מתוגמל.
 */
export async function completeSurveyResponse(
  surveyId: string,
  userId: string,
  input: CompleteSurveyInput
) {
  assertNotSyntheticAdmin(userId);

  return dal.$transaction(async (tx) => {
    await lockSurvey(tx, surveyId);

    const survey = await tx.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new AppError('הסקר לא נמצא', 404);
    if (survey.status !== 'ACTIVE') {
      throw new AppError('הסקר אינו פתוח למענה', 403);
    }
    const response = await tx.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    });

    if (!response) {
      throw new AppError('יש להתחיל את הסקר לפני שליחת תשובות', 400);
    }
    if (response.status === 'COMPLETED') {
      throw new AppError('כבר ענית על סקר זה', 409);
    }
    if (response.status !== 'STARTED') {
      throw new AppError('יש להתחיל את הסקר מחדש לפני שליחת תשובות', 409);
    }

    const deadline =
      response.startedAt.getTime() + survey.timeLimitMinutes * 60 * 1000;
    if (Date.now() > deadline) {
      await tx.surveyResponse.update({
        where: { id: response.id },
        data: { status: 'EXPIRED_TIME' },
      });
      throw new AppError('פג הזמן למענה על הסקר. יש להתחיל מחדש אם עדיין פתוח', 408);
    }

    const questions = getStoredQuestions(survey);
    const normalizedAnswers = validateAnswersAgainstQuestions(
      questions,
      input.answers
    );

    const updated = await tx.surveyResponse.update({
      where: { id: response.id },
      data: {
        status: 'COMPLETED',
        answers: normalizedAnswers as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    let pointsAwarded = 0;
    if (survey.isRewarded && survey.rewardPoints > 0) {
      // מונע כפל נקודות לאותו סקר
      const alreadyPaid = await tx.pointTransaction.findFirst({
        where: {
          userId,
          type: 'SURVEY_COMPLETION',
          referenceId: surveyId,
        },
      });

      if (!alreadyPaid) {
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: survey.rewardPoints,
            type: 'SURVEY_COMPLETION',
            referenceId: surveyId,
            note: `מענה לסקר: ${survey.title}`,
          },
        });
        pointsAwarded = survey.rewardPoints;
      }
    }

    return {
      response: updated,
      pointsAwarded,
      thankYouMessage: survey.thankYouMessage,
    };
  });
}

export async function getSurveyStats(
  surveyId: string,
  userId: string,
  options?: { role?: string }
) {
  const survey = await dal.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError('הסקר לא נמצא', 404);
  if (!canManageSurvey(survey, { id: userId, role: options?.role })) {
    throw new AppError('אין הרשאה לצפות בסטטיסטיקות', 403);
  }

  const [completed, started, expired] = await Promise.all([
    dal.surveyResponse.count({ where: { surveyId, status: 'COMPLETED' } }),
    dal.surveyResponse.count({ where: { surveyId, status: 'STARTED' } }),
    dal.surveyResponse.count({ where: { surveyId, status: 'EXPIRED_TIME' } }),
  ]);

  return {
    surveyId,
    title: survey.title,
    status: survey.status,
    maxResponses: survey.maxResponses,
    completed,
    started,
    expired,
  };
}

/**
 * סקרים שהמשתמש השלים – לדשבורד עונה ("סקרים שעניתי")
 */
export async function listMyCompletedResponses(
  userId: string,
  options?: { skip?: number; take?: number }
) {
  if (userId === 'admin') {
    throw new AppError(
      'פעולה זו מיועדת למשתמשי פאנל. התחבר עם מספר טלפון.',
      403
    );
  }

  const skip = options?.skip ?? 0;
  const take = options?.take ?? 10;
  const where = { userId, status: 'COMPLETED' as const };

  const [responses, total] = await Promise.all([
    dal.surveyResponse.findMany({
      where,
      include: {
        survey: {
          select: {
            id: true,
            title: true,
            isRewarded: true,
            rewardPoints: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      skip,
      take,
    }),
    dal.surveyResponse.count({ where }),
  ]);

  // נקודות שזוכו בפועל על כל סקר (אם יש)
  const surveyIds = responses.map((r) => r.surveyId);
  const pointRows =
    surveyIds.length === 0
      ? []
      : await dal.pointTransaction.findMany({
          where: {
            userId,
            type: 'SURVEY_COMPLETION',
            referenceId: { in: surveyIds },
          },
          select: { referenceId: true, amount: true },
        });

  const pointsBySurvey = new Map<string, number>();
  for (const row of pointRows) {
    if (!row.referenceId) continue;
    pointsBySurvey.set(
      row.referenceId,
      (pointsBySurvey.get(row.referenceId) ?? 0) + row.amount
    );
  }

  return {
    responses: responses.map((r) => ({
      responseId: r.id,
      surveyId: r.surveyId,
      title: r.survey.title,
      isRewarded: r.survey.isRewarded,
      rewardPoints: r.survey.isRewarded ? r.survey.rewardPoints : null,
      pointsEarned:
        pointsBySurvey.get(r.surveyId) ??
        (r.survey.isRewarded ? r.survey.rewardPoints : 0),
      completedAt: r.completedAt,
    })),
    total,
    skip,
    take,
  };
}
