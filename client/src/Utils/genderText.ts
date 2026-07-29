export type Gender = 'female' | 'male' | 'unknown';

/**
 * מחלץ מין מתוך demographics של המשתמש.
 * ערכים נתמכים: female/male, אישה/גבר, בת/בן, f/m וכו'.
 */
export function resolveGender(demographics?: unknown): Gender {
  if (!demographics || typeof demographics !== 'object') return 'unknown';
  const raw = (demographics as Record<string, unknown>).gender
    ?? (demographics as Record<string, unknown>).sex
    ?? (demographics as Record<string, unknown>).מין;

  if (typeof raw !== 'string') return 'unknown';
  const value = raw.trim().toLowerCase();

  if (
    ['female', 'f', 'woman', 'girl', 'אישה', 'בת', 'נקבה', 'נק׳', "נק'"].includes(value)
  ) {
    return 'female';
  }
  if (
    ['male', 'm', 'man', 'boy', 'גבר', 'בן', 'זכר', 'זכ׳', "זכ'"].includes(value)
  ) {
    return 'male';
  }
  return 'unknown';
}

/**
 * בוחר ניסוח לפי מין.
 * femaleText = לבת, maleText = לבן.
 * אם המין לא ידוע – משתמשים בניסוח לבן (ברירת מחדל).
 */
export function genderText(
  gender: Gender | undefined,
  femaleText: string,
  maleText: string
): string {
  return gender === 'female' ? femaleText : maleText;
}
