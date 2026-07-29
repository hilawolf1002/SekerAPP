import type { AuthUser } from '../Models/UserModel';
import { api, getErrorMessage } from './api';

export { getErrorMessage };

export type RequestOtpResponse = {
  success: boolean;
  message: string;
  expiresInMinutes?: number;
  /** מופיע רק בפיתוח (console) */
  devCode?: string;
  /** מעקף פיתוח – כניסה בלי קוד */
  bypassLogin?: boolean;
  user?: AuthUser;
};

export type VerifyOtpResponse = {
  success: boolean;
  message: string;
  user: AuthUser;
};

export type MeResponse = {
  success: boolean;
  user: AuthUser;
};

export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  const { data } = await api.post<RequestOtpResponse>('/auth/otp/request', { phone });
  return data;
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/otp/verify', { phone, code });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

