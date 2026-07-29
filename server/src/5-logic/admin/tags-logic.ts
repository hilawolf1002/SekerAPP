import { Prisma } from '@prisma/client';
import { dal } from '../../2-utils/dal';
import { AppError } from '../../2-utils/app-error';

const approvedAudienceFilter = {
  user: {
    status: 'APPROVED' as const,
    role: 'USER' as const,
  },
};

export async function listTags() {
  const tags = await dal.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: { where: approvedAudienceFilter },
          surveys: true,
        },
      },
    },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    /** עונים מאושרים עם התגית – רלוונטי להפצת SMS */
    usersCount: tag._count.users,
    surveysCount: tag._count.surveys,
  }));
}

/**
 * ספירת קהל ייחודי (OR בין תגיות) – עונים מאושרים בלבד.
 * אם מועבר surveyId – מנכים מי שכבר הוזמן בהזמנה פעילה או שכבר השלים.
 */
export async function countAudienceByTags(
  tagIds: string[],
  options?: { surveyId?: string }
): Promise<{
  total: number;
  perTag: { tagId: string; name: string; usersCount: number }[];
}> {
  const uniqueIds = [...new Set(tagIds)];
  if (uniqueIds.length === 0) {
    return { total: 0, perTag: [] };
  }

  const tags = await dal.tag.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      _count: {
        select: {
          users: { where: approvedAudienceFilter },
        },
      },
    },
  });

  const now = new Date();
  const excludeForSurvey = options?.surveyId
    ? {
        OR: [
          {
            invitations: {
              some: {
                surveyId: options.surveyId,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
          {
            responses: {
              some: {
                surveyId: options.surveyId,
                status: 'COMPLETED' as const,
              },
            },
          },
        ],
      }
    : undefined;

  const total = await dal.user.count({
    where: {
      status: 'APPROVED',
      role: 'USER',
      tags: {
        some: { tagId: { in: tags.map((t) => t.id) } },
      },
      ...(excludeForSurvey ? { NOT: excludeForSurvey } : {}),
    },
  });

  return {
    total,
    perTag: tags.map((t) => ({
      tagId: t.id,
      name: t.name,
      usersCount: t._count.users,
    })),
  };
}

export async function createTag(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new AppError('שם התגית קצר מדי', 400);
  }
  if (trimmed.length > 60) {
    throw new AppError('שם התגית ארוך מדי', 400);
  }

  try {
    return await dal.tag.create({
      data: { name: trimmed },
      select: { id: true, name: true, createdAt: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('תגית בשם זה כבר קיימת', 409);
    }
    throw error;
  }
}

export async function deleteTag(tagId: string) {
  try {
    await dal.tag.delete({ where: { id: tagId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new AppError('התגית לא נמצאה', 404);
    }
    throw error;
  }
  return { ok: true };
}

/**
 * מחליף את כל שיוכי התגיות של משתמש (replace-all)
 */
export async function setUserTags(userId: string, tagIds: string[]) {
  const user = await dal.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new AppError('המשתמש לא נמצא', 404);

  const uniqueIds = [...new Set(tagIds)];
  if (uniqueIds.length > 0) {
    const found = await dal.tag.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (found.length !== uniqueIds.length) {
      throw new AppError('אחת או יותר מהתגיות לא נמצאו', 400);
    }
  }

  await dal.$transaction(async (tx) => {
    await tx.userTag.deleteMany({ where: { userId } });
    if (uniqueIds.length > 0) {
      await tx.userTag.createMany({
        data: uniqueIds.map((tagId) => ({ userId, tagId })),
        skipDuplicates: true,
      });
    }
  });

  const tags = await dal.userTag.findMany({
    where: { userId },
    include: { tag: { select: { id: true, name: true } } },
  });

  return tags.map((t) => t.tag);
}
