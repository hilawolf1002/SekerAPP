/** נרמול מספר נייד ישראלי לפורמט 05XXXXXXXX */
export function normalizeIsraeliPhone(raw: string): string {
  let phone = raw.replace(/[\s\-()]/g, '');
  if (phone.startsWith('+972')) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith('972')) {
    phone = `0${phone.slice(3)}`;
  }
  return phone;
}

export function isValidIsraeliMobile(raw: string): boolean {
  const phone = normalizeIsraeliPhone(raw);
  return /^05\d{8}$/.test(phone);
}

export function formatPhoneValidationError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'יש להזין מספר נייד';
  if (!isValidIsraeliMobile(trimmed)) {
    return 'יש להזין מספר נייד ישראלי תקין (למשל 0501234567)';
  }
  return null;
}
