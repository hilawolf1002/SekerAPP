import { api, getErrorMessage } from './api';
import type { PointsSummary } from '../Models/SurveyModel';

export { getErrorMessage };

export type PointsProgress = {
  redemptionGoal: number;
  redemptionPointsCost: number;
  balanceAfterRedemption: number | null;
  pointsNeeded: number;
  canRedeem: boolean;
  progressPercent: number;
  hasPendingRedemption: boolean;
  pendingRedemptionId: string | null;
};

export type RedeemResult = {
  redemptionId: string;
  message: string;
};

export type UserRedemption = {
  id: string;
  email: string | null;
  pointsSpent: number;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type PointsResponse = {
  success: boolean;
  balance: number;
  transactions: PointsSummary['transactions'];
  total: number;
  skip: number;
  take: number;
  progress: PointsProgress;
};

export async function getMyPoints(
  page = 1,
  pageSize = 10
): Promise<
  PointsSummary & {
    progress: PointsProgress;
    total: number;
    page: number;
    pageSize: number;
  }
> {
  const { data } = await api.get<PointsResponse>('/points/me', {
    params: { page, take: pageSize },
  });
  return {
    balance: data.balance,
    transactions: data.transactions,
    progress: data.progress,
    total: data.total,
    page,
    pageSize: data.take,
  };
}

/**
 * הגשת בקשת פדיון – מייל + צילום ת.ז.
 * האדמין שולח קופון ידנית במייל תוך 48 שעות.
 */
export async function submitRedemptionRequest(
  email: string,
  idDocument: File
): Promise<RedeemResult> {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('idDocument', idDocument);

  const { data } = await api.post<RedeemResult & { success: boolean }>(
    '/points/redeem',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function getMyRedemptions(): Promise<UserRedemption[]> {
  const { data } = await api.get('/points/redemptions');
  return data.redemptions as UserRedemption[];
}
