import type { AuthUser } from '../Models/UserModel';
import { api } from './api';

export type KycFormData = {
  fullName: string;
  dateOfBirth: string;
  gender: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  city: string;
  employmentStatus:
    | 'employee'
    | 'self_employed'
    | 'student'
    | 'not_working'
    | 'retired'
    | 'other';
  education: 'high_school' | 'professional' | 'academic' | 'student' | 'other';
  consent: boolean;
  /** האם הגיע דרך חבר */
  arrivedViaFriend: boolean;
  /** מספר טלפון של החבר המפנה */
  referrerPhone: string;
};

type ApplyKycResponse = {
  success: boolean;
  user: AuthUser;
  message: string;
};

/** הגשת בקשת KYC – JSON בלבד (ת.ז. נדרשת רק בפדיון) */
export async function applyForKyc(
  input: KycFormData
): Promise<ApplyKycResponse> {
  const payload: Record<string, unknown> = {
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    city: input.city,
    employmentStatus: input.employmentStatus,
    education: input.education,
    consent: true,
  };

  if (input.arrivedViaFriend && input.referrerPhone.trim()) {
    payload.referrerPhone = input.referrerPhone.trim();
  }

  const { data } = await api.post<ApplyKycResponse>('/auth/kyc/apply', payload);
  return data;
}
