import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
  createSurvey,
  getSurveyById,
  listMySurveys,
  updateSurveyStatus,
  startSurveyResponse,
  completeSurveyResponse,
  getSurveyStats,
  listMyCompletedResponses,
} from '../../5-logic/surveys/survey-logic';
import {
  inviteByTags,
  inviteByPhones,
  getInvitedSurveys,
  claimInviteAccess,
} from '../../5-logic/surveys/invitation-logic';
import { saveSurveyImage } from '../../5-logic/surveys/survey-image-logic';
import {
  createSurveySchema,
  updateSurveyStatusSchema,
  completeSurveySchema,
  inviteSurveySchema,
  claimInviteSchema,
} from '../../4-models/survey-schemas';
import { validateBody } from '../../3-middleware/validate-middleware';
import {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireApprovedResponder,
} from '../../3-middleware/auth-middleware';
import { AppError } from '../../2-utils/app-error';
import { parsePagination } from '../../2-utils/pagination';
import { setAuthCookie } from '../../5-logic/auth/auth-logic';

const router = Router();

const respondLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'יותר מדי ניסיונות מענה. נסי שוב בעוד כמה דקות',
  },
});

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'יותר מדי שליחות הזמנות. נסי שוב בעוד כמה דקות',
  },
});

const surveyImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      callback(new AppError('יש להעלות תמונה מסוג JPG, PNG או WEBP', 400));
      return;
    }
    callback(null, true);
  },
});

function uploadSurveyImage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  surveyImageUpload.single('image')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('התמונה גדולה מדי. הגודל המרבי הוא 5MB', 400));
      return;
    }
    if (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError('לא ניתן היה להעלות את התמונה', 400)
      );
      return;
    }
    next();
  });
}

/** POST /api/surveys/upload-image – העלאת תמונה לסקר (תיקייה מקומית) */
router.post(
  '/upload-image',
  requireAuth,
  uploadSurveyImage,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('יש לבחור תמונה להעלאה', 400);
      }
      const imageUrl = await saveSurveyImage(req.file);
      res.status(201).json({ success: true, imageUrl });
    } catch (error) {
      next(error);
    }
  }
);

/** POST /api/surveys – יצירת סקר (דורש התחברות) */
router.post(
  '/',
  requireAuth,
  validateBody(createSurveySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const survey = await createSurvey(req.user!.id, req.body, {
        role: req.user!.role,
      });
      res.status(201).json({ success: true, survey });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/surveys/my – הסקרים שלי (אדמין: כל הסקרים) */
router.get(
  '/my',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take } = parsePagination(req.query, { defaultTake: 10 });
      const result = await listMySurveys(req.user!.id, {
        role: req.user!.role,
        skip,
        take,
      });
      res.json({
        success: true,
        surveys: result.surveys,
        total: result.total,
        skip: result.skip,
        take: result.take,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/surveys/invited – הזמנות פעילות לעונה מאושר
 * חייב לפני /:id כדי שלא ייבלע כמזהה סקר.
 */
router.get(
  '/invited',
  requireAuth,
  requireApprovedResponder,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take } = parsePagination(req.query, { defaultTake: 10 });
      const result = await getInvitedSurveys(req.user!.id, { skip, take });
      res.json({
        success: true,
        invitations: result.invitations,
        total: result.total,
        skip: result.skip,
        take: result.take,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/surveys/my-responses – סקרים שהמשתמש השלים
 * חייב לפני /:id
 */
router.get(
  '/my-responses',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take } = parsePagination(req.query, { defaultTake: 10 });
      const result = await listMyCompletedResponses(req.user!.id, {
        skip,
        take,
      });
      res.json({
        success: true,
        responses: result.responses,
        total: result.total,
        skip: result.skip,
        take: result.take,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/surveys/invite/claim – כניסה מקישור SMS בלי OTP
 * חייב לפני /:id כדי שלא ייבלע.
 * Body: { token }
 */
router.post(
  '/invite/claim',
  inviteLimiter,
  validateBody(claimInviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await claimInviteAccess(req.body.token);
      setAuthCookie(res, result.token);
      res.json({
        success: true,
        user: result.user,
        surveyId: result.surveyId,
        inviteExpiresAt: result.inviteExpiresAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/surveys/:id – צפייה בסקר (פעיל לכולם; טיוטה/סגור רק ליוצר/אדמין) */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const survey = await getSurveyById(req.params.id, {
      viewerUserId: req.user?.id,
      viewerRole: req.user?.role,
    });
    res.json({ success: true, survey });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/surveys/:id/status – DRAFT / ACTIVE / CLOSED */
router.patch(
  '/:id/status',
  requireAuth,
  validateBody(updateSurveyStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const survey = await updateSurveyStatus(
        req.params.id,
        req.user!.id,
        req.body,
        { role: req.user!.role }
      );
      res.json({ success: true, survey });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/surveys/:id/stats – סטטיסטיקות ליוצר / אדמין */
router.get(
  '/:id/stats',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getSurveyStats(req.params.id, req.user!.id, {
        role: req.user!.role,
      });
      res.json({ success: true, stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/surveys/:id/invite – שליחת הזמנות (אדמין בלבד)
 * Body: { mode: 'tags'|'phones', tagIds?: string[], phones?: string[], expiresInMinutes?: number }
 */
router.post(
  '/:id/invite',
  requireAuth,
  requireAdmin,
  inviteLimiter,
  validateBody(inviteSurveySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mode, tagIds, phones, expiresInMinutes } = req.body;
      const opts = { expiresInMinutes };
      const result =
        mode === 'tags'
          ? await inviteByTags(req.params.id, tagIds ?? [], opts)
          : await inviteByPhones(req.params.id, phones ?? [], opts);

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/** POST /api/surveys/:id/start – התחלת מענה (נעילת זמן) */
router.post(
  '/:id/start',
  requireAuth,
  respondLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await startSurveyResponse(req.params.id, req.user!.id);
      res.status(201).json({
        success: true,
        responseId: result.response.id,
        status: result.response.status,
        expiresAt: result.expiresAt,
        timeLimitMinutes: result.survey.timeLimitMinutes,
        resumed: result.resumed,
      });
    } catch (error) {
      next(error);
    }
  }
);

/** POST /api/surveys/:id/complete – שליחת תשובות */
router.post(
  '/:id/complete',
  requireAuth,
  respondLimiter,
  validateBody(completeSurveySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await completeSurveyResponse(
        req.params.id,
        req.user!.id,
        req.body
      );
      res.json({
        success: true,
        response: result.response,
        pointsAwarded: result.pointsAwarded,
        thankYouMessage: result.thankYouMessage,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
