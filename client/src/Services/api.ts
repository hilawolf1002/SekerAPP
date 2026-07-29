import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.error;
    if (typeof msg === 'string') return msg;
  }
  if (error instanceof Error) return error.message;
  return 'אירעה שגיאה. נסי שוב.';
}
