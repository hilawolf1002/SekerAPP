import { Prisma } from '@prisma/client';
import { dal } from '../../2-utils/dal';

export type DemographicSource = {
  dateOfBirth?: unknown;
  city?: unknown;
  gender?: unknown;
  employmentStatus?: unknown;
  education?: unknown;
};

const EMPLOYMENT_TAGS: Record<string, string> = {
  employee: 'שכיר/ה',
  self_employed: 'עצמאי/ת',
  student: 'סטודנטים',
  not_working: 'לא עובד/ת',
  retired: 'גמלאי/ת',
};

const EDUCATION_TAGS: Record<string, string> = {
  high_school: 'השכלה תיכונית',
  professional: 'השכלה מקצועית',
  academic: 'השכלה אקדמית',
  student: 'בלימודים',
};

const GENDER_TAGS: Record<string, string> = {
  female: 'נשים',
  male: 'גברים',
};

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

function ageBandTag(age: number): string | null {
  if (age < 18) return null;
  if (age <= 24) return 'גיל 18-24';
  if (age <= 34) return 'גיל 25-34';
  if (age <= 44) return 'גיל 35-44';
  if (age <= 54) return 'גיל 45-54';
  return 'גיל 55+';
}

function normalizeCity(city: unknown): string | null {
  if (typeof city !== 'string') return null;
  const trimmed = city.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2 || trimmed.length > 60) return null;
  return trimmed;
}

/** שמות תגיות שנגזרות משדות הרישום */
export function deriveDemographicTagNames(
  demographics: DemographicSource
): string[] {
  const names = new Set<string>();

  const age = ageFromDateOfBirth(demographics.dateOfBirth);
  if (age !== null) {
    const band = ageBandTag(age);
    if (band) names.add(band);
  }

  const city = normalizeCity(demographics.city);
  if (city) names.add(city);

  if (typeof demographics.gender === 'string') {
    const g = GENDER_TAGS[demographics.gender];
    if (g) names.add(g);
  }

  if (typeof demographics.employmentStatus === 'string') {
    const e = EMPLOYMENT_TAGS[demographics.employmentStatus];
    if (e) names.add(e);
  }

  if (typeof demographics.education === 'string') {
    const ed = EDUCATION_TAGS[demographics.education];
    if (ed) names.add(ed);
  }

  return [...names];
}

/**
 * מוודא שתגיות קיימות ומשבץ אותן למשתמש (מוסיף, לא מוחק תגיות ידניות).
 */
export async function syncUserDemographicTags(
  userId: string,
  demographics: DemographicSource
): Promise<string[]> {
  const tagNames = deriveDemographicTagNames(demographics);
  if (tagNames.length === 0) return [];

  const tagIds: string[] = [];

  for (const name of tagNames) {
    const existing = await dal.tag.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    try {
      const created = await dal.tag.create({
        data: { name },
        select: { id: true },
      });
      tagIds.push(created.id);
    } catch {
      const again = await dal.tag.findUnique({
        where: { name },
        select: { id: true },
      });
      if (again) tagIds.push(again.id);
    }
  }

  if (tagIds.length === 0) return tagNames;

  await dal.userTag.createMany({
    data: tagIds.map((tagId) => ({ userId, tagId })),
    skipDuplicates: true,
  });

  return tagNames;
}

/**
 * סנכרון תגיות דמוגרפיות לכל המשתמשים שיש להם פרטי רישום.
 * מחזיר כמה משתמשים עודכנו.
 */
export async function resyncAllDemographicTags(): Promise<{
  processed: number;
  tagged: number;
}> {
  const users = await dal.user.findMany({
    where: {
      role: 'USER',
      status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
      NOT: { demographics: { equals: Prisma.DbNull } },
    },
    select: { id: true, demographics: true },
  });

  let tagged = 0;
  for (const user of users) {
    const demo =
      user.demographics &&
      typeof user.demographics === 'object' &&
      !Array.isArray(user.demographics)
        ? (user.demographics as DemographicSource)
        : null;
    if (!demo) continue;
    const names = await syncUserDemographicTags(user.id, demo);
    if (names.length > 0) tagged += 1;
  }

  return { processed: users.length, tagged };
}
