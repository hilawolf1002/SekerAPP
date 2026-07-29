import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  requestOtp,
  verifyOtp,
  loginAdmin,
  getCurrentUser,
  setAuthCookie,
  clearAuthCookie,
} from '../../5-logic/auth/auth-logic';
import {
  requestOtpSchema,
  verifyOtpSchema,
  adminLoginSchema,
  kycApplicationSchema,
} from '../../4-models/auth-schemas';
import { validateBody } from '../../3-middleware/validate-middleware';
import { requireAuth } from '../../3-middleware/auth-middleware';
import { AppError } from '../../2-utils/app-error';
import {
  getKycStatus,
  submitKycApplication,
} from '../../5-logic/auth/kyc-logic';

const router = Router();


/** הגבלת בקשות OTP – מונע הצפת SMS / ניצול לרעה */
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'יותר מדי בקשות לקוד אימות. נסי שוב בעוד כמה דקות',
  },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'יותר מדי ניסיונות אימות. נסי שוב בעוד כמה דקות',
  },
});

/**
 * POST /api/auth/otp/request
 * גוף: { phone: "0501234567" }
 */
router.post(
  '/otp/request',
  otpRequestLimiter,
  validateBody(requestOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await requestOtp(req.body);

      // מעקף פיתוח: כניסה מיידית עם Cookie
      if (result.bypassLogin && result.token) {
        setAuthCookie(res, result.token);
        res.json({
          success: true,
          bypassLogin: true,
          message: result.message,
          user: result.user,
        });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
/**
 * POST /api/auth/otp/verify
 * גוף: { phone, code }
 * מחזיר Cookie HttpOnly + פרטי משתמש
 */
router.post(
  '/otp/verify',
  otpVerifyLimiter,
  validateBody(verifyOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await verifyOtp(req.body);
      setAuthCookie(res, result.token);
      res.json({
        success: true,
        message: 'התחברת בהצלחה',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/admin/login
 * גוף: { password }
 * התחברות אדמין עם סיסמה
 */
router.post(
  '/admin/login',
  validateBody(adminLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await loginAdmin(req.body);
      setAuthCookie(res, result.token);
      res.json({
        success: true,
        message: 'התחברת בהצלחה כמנהל מערכת',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * דורש Cookie / Bearer token
 */
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getCurrentUser(req.user!.id);
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/kyc/apply
 * JSON: פרטי פרופיל בלבד (ללא ת.ז. – ת.ז. נדרשת רק בשלב פדיון).
 */
router.post(
  '/kyc/apply',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = kycApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'פרטי ההצטרפות אינם תקינים',
          400
        );
      }
      const user = await submitKycApplication(req.user!.id, parsed.data);
      res.status(201).json({
        success: true,
        user,
        message:
          'הבקשה התקבלה וממתינה לאישור ידני. לאחר האישור תישלח אליך הודעת SMS.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/auth/kyc/status – מצב בקשת ההצטרפות הנוכחית */
router.get(
  '/kyc/status',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kyc = await getKycStatus(req.user!.id);
      res.json({ success: true, kyc });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'התנתקת בהצלחה' });
});

export default router;
