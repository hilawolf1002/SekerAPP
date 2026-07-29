/**
 * הגדרות סביבה מרכזיות לשרת.
 * סודות נקראים מ-.env בלבד – לא מקוד מקודד.
 */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = nodeEnv !== 'production';

/** sms = שליחה אמיתית | console = הדפסה ללוג (רק לפיתוח מקומי בלי SMS) */
const otpDelivery =
  (process.env.OTP_DELIVERY || 'sms').toLowerCase() === 'console'
    ? 'console'
    : 'sms';

const jwtSecret = required(
  'JWT_SECRET',
  isDev ? 'sekerapp-local-development-secret-do-not-use-in-production' : undefined
);
if (!isDev && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production');
}
if (!isDev && otpDelivery === 'console') {
  throw new Error('OTP_DELIVERY=console is forbidden in production');
}

export const appConfig = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  isDev,
  // בפיתוח מותר fallback מקומי; בפרודקשן השרת לא יעלה בלי סוד שהוגדר במפורש.
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'sekerapp_token',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  otp: {
    length: 6,
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    requestWindowMinutes: Number(process.env.OTP_REQUEST_WINDOW_MINUTES || 15),
    maxRequestsPerPhone: Number(process.env.OTP_MAX_REQUESTS_PER_PHONE || 5),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
    delivery: otpDelivery as 'sms' | 'console',
  },
  sms: {
    username: process.env.MESERGO_USERNAME || '',
    token: process.env.MESERGO_TOKEN || '',
    sender: process.env.MESERGO_SENDER || 'SekerApp',
  },
  /** מייל המנהל לקבלת פניות פדיון */
  adminEmail: process.env.ADMIN_EMAIL || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  /**
   * מעקף זמני לפיתוח בלבד – מספר שמדלג על OTP.
   * מופעל רק כש-NODE_ENV !== production.
   * TODO: להסיר לפני פרודקשן.
   */
  devAuthBypassPhone: isDev
    ? (process.env.DEV_AUTH_BYPASS_PHONE || '').replace(/\D/g, '')
    : '',
  /**
   * סיסמת אדמין להתחברות למערכת הניהול.
   * בפרודקשן חובה להגדיר סיסמה חזקה.
   */
  adminPassword: process.env.ADMIN_PASSWORD || (isDev ? '1234admin' : ''),
  /**
   * כתובת בסיס ציבורית לקישורים ב-SMS (הזמנות, referral וכו').
   * בפרודקשן: https://sekerapp.online (או הדומיין הסופי).
   */
  publicBaseUrl: (
    process.env.PUBLIC_BASE_URL ||
    (isDev ? 'http://localhost:3000' : '')
  ).replace(/\/$/, ''),
};
