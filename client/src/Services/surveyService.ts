import { api, getErrorMessage } from './api';
import type {
  CompleteSurveyResult,
  CreateSurveyPayload,
  StartSurveyResult,
  Survey,
  SurveyListItem,
  SurveyStats,
  SurveyStatus,
} from '../Models/SurveyModel';

export { getErrorMessage };

type MySurveysResponse = {
  success: boolean;
  surveys: (SurveyListItem & { _count?: { responses: number } })[];
  total: number;
  skip: number;
  take: number;
};

type SurveyResponse = {
  success: boolean;
  survey: Survey & { _count?: { responses: number } };
};

type StatsResponse = {
  success: boolean;
  stats: SurveyStats;
};

export type PaginatedList<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
  page: number;
  pageSize: number;
};

function mapListItem(
  s: SurveyListItem & { _count?: { responses: number } }
): SurveyListItem {
  return {
    ...s,
    completedResponses: s._count?.responses ?? s.completedResponses,
  };
}

const DEFAULT_PAGE_SIZE = 10;

export async function listMySurveys(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<PaginatedList<SurveyListItem>> {
  const { data } = await api.get<MySurveysResponse>('/surveys/my', {
    params: { page, take: pageSize },
  });
  return {
    items: data.surveys.map(mapListItem),
    total: data.total,
    skip: data.skip,
    take: data.take,
    page,
    pageSize: data.take,
  };
}

export async function getSurvey(id: string): Promise<Survey> {
  const { data } = await api.get<SurveyResponse>(`/surveys/${id}`);
  const survey = data.survey;
  return {
    ...survey,
    completedResponses: survey._count?.responses ?? survey.completedResponses,
  };
}

export async function createSurvey(payload: CreateSurveyPayload): Promise<Survey> {
  const { data } = await api.post<SurveyResponse>('/surveys', payload);
  return data.survey;
}

/** העלאת תמונה לסקר – נשמרת מקומית בשרת ומחזירה URL יחסי */
export async function uploadSurveyImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post<{ success: boolean; imageUrl: string }>(
    '/surveys/upload-image',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data.imageUrl;
}

export async function updateSurveyStatus(
  id: string,
  status: SurveyStatus
): Promise<Survey> {
  const { data } = await api.patch<SurveyResponse>(`/surveys/${id}/status`, { status });
  return data.survey;
}

export async function getSurveyStats(id: string): Promise<SurveyStats> {
  const { data } = await api.get<StatsResponse>(`/surveys/${id}/stats`);
  return data.stats;
}

export async function startSurvey(id: string): Promise<StartSurveyResult> {
  const { data } = await api.post<StartSurveyResult>(`/surveys/${id}/start`);
  return data;
}

export async function completeSurvey(
  id: string,
  answers: (string | string[])[]
): Promise<CompleteSurveyResult> {
  const { data } = await api.post<CompleteSurveyResult>(`/surveys/${id}/complete`, {
    answers,
  });
  return data;
}

export type SurveyInvitationItem = {
  invitationId: string;
  status: string;
  sentAt: string;
  expiresAt?: string | null;
  survey: {
    id: string;
    title: string;
    description: string | null;
    isRewarded: boolean;
    rewardPoints: number;
    timeLimitMinutes: number;
    imageUrl: string | null;
  };
};

export type InviteResult = {
  success: boolean;
  sent: number;
  skipped: number;
  notFound?: number;
  failed: number;
  expiresAt?: string;
  expiresInMinutes?: number;
};

/** הזמנות פעילות לעונה מאושר */
export async function getMyInvitations(
  page = 1,
  pageSize = 10
): Promise<PaginatedList<SurveyInvitationItem>> {
  const { data } = await api.get<{
    success: boolean;
    invitations: SurveyInvitationItem[];
    total: number;
    skip: number;
    take: number;
  }>('/surveys/invited', { params: { page, take: pageSize } });
  return {
    items: data.invitations,
    total: data.total,
    skip: data.skip,
    take: data.take,
    page,
    pageSize: data.take,
  };
}

export type MyCompletedResponse = {
  responseId: string;
  surveyId: string;
  title: string;
  isRewarded: boolean;
  rewardPoints: number | null;
  pointsEarned: number;
  completedAt: string | null;
};

/** סקרים שהמשתמש השלים */
export async function getMyCompletedResponses(
  page = 1,
  pageSize = 10
): Promise<PaginatedList<MyCompletedResponse>> {
  const { data } = await api.get<{
    success: boolean;
    responses: MyCompletedResponse[];
    total: number;
    skip: number;
    take: number;
  }>('/surveys/my-responses', { params: { page, take: pageSize } });
  return {
    items: data.responses,
    total: data.total,
    skip: data.skip,
    take: data.take,
    page,
    pageSize: data.take,
  };
}

/** שליחת הזמנות (אדמין) – לפי תגיות או רשימת טלפונים */
export async function sendInvitations(
  surveyId: string,
  payload:
    | { mode: 'phones'; phones: string[]; expiresInMinutes?: number }
    | { mode: 'tags'; tagIds: string[]; expiresInMinutes?: number }
): Promise<InviteResult> {
  const { data } = await api.post<InviteResult>(
    `/surveys/${surveyId}/invite`,
    payload
  );
  return data;
}

/** כניסה מקישור הזמנה ב-SMS (בלי OTP) */
export async function claimInviteToken(token: string): Promise<{
  user: import('../Models/UserModel').AuthUser;
  surveyId: string;
  inviteExpiresAt: string | null;
}> {
  const { data } = await api.post<{
    success: boolean;
    user: import('../Models/UserModel').AuthUser;
    surveyId: string;
    inviteExpiresAt: string | null;
  }>('/surveys/invite/claim', { token });
  return {
    user: data.user,
    surveyId: data.surveyId,
    inviteExpiresAt: data.inviteExpiresAt,
  };
}
