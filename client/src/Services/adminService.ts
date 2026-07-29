import { api } from './api';

export interface AdminStats {
  users: {
    total: number;
    pendingApprovals: number;
    approvedResponders: number;
  };
  surveys: {
    total: number;
    totalResponses: number;
  };
  points: {
    totalAwarded: number;
  };
}

export interface PendingResponder {
  id: string;
  phone: string;
  name: string | null;
  hasIdDocument: boolean;
  submittedAt: string | null;
  demographics: {
    dateOfBirth: string | null;
    gender: string | null;
    city: string | null;
    employmentStatus: string | null;
    education: string | null;
  };
  updatedAt: string;
  createdAt: string;
}

export interface ResponderDetails {
  user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: string;
    status: string;
    idVerified: boolean;
    hasIdDocument: boolean;
    referralCode: string | null;
    demographics: any;
    createdAt: string;
    updatedAt: string;
  };
  activity: {
    totalCompletedSurveys: number;
    pointsBalance: number;
    recentSurveys: Array<{
      surveyId: string;
      surveyTitle: string;
      isRewarded: boolean;
      rewardPoints: number;
      completedAt: string | null;
    }>;
    recentTransactions: Array<{
      amount: number;
      type: string;
      note: string | null;
      createdAt: string;
    }>;
  };
}

export interface IdDocumentPreview {
  dataUrl: string;
  userName: string | null;
}

export interface GiftOptionAdmin {
  id: string;
  storeName: string;
  title: string;
  description: string | null;
  pointsCost: number;
  isActive: boolean;
  availableCoupons: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceTag {
  id: string;
  name: string;
  createdAt?: string;
  usersCount?: number;
  surveysCount?: number;
}

export interface UserListItem {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: string;
  status: string;
  idVerified: boolean;
  createdAt: string;
  demographics: any;
  tags?: Array<{ id: string; name: string }>;
}

export interface AdminRedemptionRequest {
  id: string;
  email: string | null;
  pointsSpent: number;
  status: string;
  adminNote: string | null;
  idDocumentKey: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string };
}

export interface GlobalSettings {
  id: number;
  redemptionGoal: number;
  signupBonus: number;
  referralBonus: number;
  youthReferralBonus: number;
  youthMaxAge: number;
  defaultTimeLimitMinutes: number;
  defaultMaxResponses: number | null;
}

/**
 * התחברות אדמין עם סיסמה
 */
export async function loginAdmin(password: string) {
  const response = await api.post('/auth/admin/login', { password });
  return response.data;
}

/**
 * קבלת סטטיסטיקות כלליות
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get('/admin/stats');
  return response.data.stats;
}

/**
 * קבלת כל המשתמשים
 */
export async function getAllUsers(options?: {
  status?: string;
  role?: string;
  search?: string;
  skip?: number;
  take?: number;
  page?: number;
}): Promise<{ users: UserListItem[]; total: number; skip: number; take: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.role) params.append('role', options.role);
  if (options?.search) params.append('search', options.search);
  if (options?.page !== undefined) params.append('page', options.page.toString());
  if (options?.skip !== undefined) params.append('skip', options.skip.toString());
  if (options?.take !== undefined) params.append('take', options.take.toString());
  
  const response = await api.get(`/admin/users?${params.toString()}`);
  return {
    users: response.data.users,
    total: response.data.total,
    skip: response.data.skip,
    take: response.data.take,
  };
}

/**
 * קבלת עונים ממתינים לאישור
 */
export async function getPendingResponders(): Promise<PendingResponder[]> {
  const response = await api.get('/admin/responders/pending');
  return response.data.responders;
}

/**
 * קבלת פרטי עונה מסוים
 */
export async function getResponderDetails(userId: string): Promise<ResponderDetails> {
  const response = await api.get(`/admin/responders/${userId}`);
  return response.data;
}

/**
 * צפייה בתמונת תעודת זהות
 */
export async function getIdDocumentPreview(userId: string): Promise<IdDocumentPreview> {
  const response = await api.get(`/admin/responders/${userId}/id-document`);
  return response.data.document;
}

/**
 * אישור עונה
 */
export async function approveResponder(userId: string) {
  const response = await api.post(`/admin/responders/${userId}/approve`);
  return response.data;
}

/**
 * דחיית עונה
 */
export async function rejectResponder(
  userId: string,
  options?: { sendSms?: boolean; reason?: string }
) {
  const response = await api.post(`/admin/responders/${userId}/reject`, options);
  return response.data;
}

/**
 * חסימת משתמש
 */
export async function blockUser(userId: string, reason?: string) {
  const response = await api.post(`/admin/users/${userId}/block`, { reason });
  return response.data;
}

/**
 * קבלת כל בקשות הפדיון (PENDING + היסטוריה)
 */
export async function getAdminRedemptions(
  page = 1,
  pageSize = 20
): Promise<{
  redemptions: AdminRedemptionRequest[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const response = await api.get('/admin/redemptions', {
    params: { page, take: pageSize },
  });
  return {
    redemptions: response.data.redemptions as AdminRedemptionRequest[],
    total: response.data.total as number,
    page,
    pageSize: response.data.take as number,
  };
}

/** תצוגת ת.ז. של בקשת פדיון */
export async function getRedemptionIdDocument(redemptionId: string) {
  const response = await api.get(`/admin/redemptions/${redemptionId}/id-document`);
  return response.data.document as {
    hasDocument: boolean;
    imageData: string | null;
  };
}

/** סימון בקשה כמטופלת (שולח קופון ידנית) */
export async function fulfillRedemption(redemptionId: string, note?: string) {
  const response = await api.post(`/admin/redemptions/${redemptionId}/fulfill`, {
    note,
  });
  return response.data;
}

/** דחיית בקשת פדיון */
export async function rejectRedemption(redemptionId: string, note?: string) {
  const response = await api.post(`/admin/redemptions/${redemptionId}/reject`, {
    note,
  });
  return response.data;
}

export async function getAdminSettings(): Promise<GlobalSettings> {
  const response = await api.get('/admin/settings');
  return response.data.settings;
}

export async function updateAdminSettings(
  patch: Partial<GlobalSettings>
): Promise<GlobalSettings> {
  const response = await api.patch('/admin/settings', patch);
  return response.data.settings;
}

export async function getAdminGifts(): Promise<GiftOptionAdmin[]> {
  const response = await api.get('/admin/gifts');
  return response.data.gifts;
}

export async function createAdminGift(payload: {
  storeName: string;
  title: string;
  description?: string | null;
  pointsCost: number;
  isActive?: boolean;
}) {
  const response = await api.post('/admin/gifts', payload);
  return response.data.gift;
}

export async function updateAdminGift(
  id: string,
  payload: Partial<{
    storeName: string;
    title: string;
    description: string | null;
    pointsCost: number;
    isActive: boolean;
  }>
) {
  const response = await api.patch(`/admin/gifts/${id}`, payload);
  return response.data.gift;
}

export async function addAdminGiftCoupons(id: string, codes: string[]) {
  const response = await api.post(`/admin/gifts/${id}/coupons`, { codes });
  return response.data as { created: number; skipped: number };
}

export async function setUserStatus(
  userId: string,
  status: string,
  reason?: string
) {
  const response = await api.post(`/admin/users/${userId}/status`, {
    status,
    reason,
  });
  return response.data;
}

export async function getAdminTags(): Promise<AudienceTag[]> {
  const response = await api.get('/admin/tags');
  return response.data.tags;
}

export async function createAdminTag(name: string): Promise<AudienceTag> {
  const response = await api.post('/admin/tags', { name });
  return response.data.tag;
}

export async function deleteAdminTag(tagId: string) {
  const response = await api.delete(`/admin/tags/${tagId}`);
  return response.data;
}

export async function setUserTags(userId: string, tagIds: string[]) {
  const response = await api.post(`/admin/users/${userId}/tags`, { tagIds });
  return response.data.tags as Array<{ id: string; name: string }>;
}

