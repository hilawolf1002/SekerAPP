export type AuthUser = {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: 'USER' | 'ADMIN';
  status: 'NEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  referralCode: string;
  idVerified?: boolean;
  createdAt?: string;
  /** דמוגרפיה – כולל gender (female/male) אחרי הרשמת עונה */
  demographics?: {
    gender?: string;
    [key: string]: unknown;
  } | null;
};
