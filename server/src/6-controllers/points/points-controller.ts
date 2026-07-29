import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { requireAuth, requireApprovedResponder } from '../../3-middleware/auth-middleware';
import { validateBody } from '../../3-middleware/validate-middleware';
import { getPointsSummary, transactionTypeLabel } from '../../5-logic/points/points-logic';
import {
  getPointsProgress,
  submitRedemptionRequest,
  listUserRedemptions,
} from '../../5-logic/admin/settings-redemption-logic';
import { redemptionRequestSchema } from '../../4-models/admin-schemas';
import { AppError } from '../../2-utils/app-error';
import { parsePagination } from '../../2-utils/pagination';

const router = Router();

const redeemLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'יותר מדי בקשות פדיון. נסי שוב מחר' },
});

/** multer לת.ז. בבקשת פדיון */
const idDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      callback(new AppError('יש להעלות צילום מסוג JPG, PNG או WEBP בלבד', 400));
      return;
    }
    callback(null, true);
  },
});

function uploadIdDoc(req: Request, res: Response, next: NextFunction): void {
  idDocUpload.single('idDocument')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('הצילום גדול מדי. הגודל המרבי הוא 8MB', 400));
      return;
    }
    if (error) {
      next(error instanceof AppError ? error : new AppError('לא ניתן היה להעלות את הקובץ', 400));
      return;
    }
    next();
  });
}

/** GET /api/points/me – יתרה + היסטוריה + התקדמות ליעד פדיון */
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take } = parsePagination(req.query, { defaultTake: 10 });
      const [summary, progress] = await Promise.all([
        getPointsSummary(req.user!.id, { skip, take }),
        getPointsProgress(req.user!.id),
      ]);
      res.json({
        success: true,
        balance: summary.balance,
        transactions: summary.transactions.map((t) => ({
          ...t,
          typeLabel: transactionTypeLabel(t.type),
        })),
        total: summary.total,
        skip: summary.skip,
        take: summary.take,
        progress: {
          redemptionGoal: progress.redemptionGoal,
          redemptionPointsCost: progress.redemptionPointsCost,
          balanceAfterRedemption: progress.balanceAfterRedemption,
          pointsNeeded: progress.pointsNeeded,
          canRedeem: progress.canRedeem,
          progressPercent: progress.progressPercent,
          hasPendingRedemption: progress.hasPendingRedemption,
          pendingRedemptionId: progress.pendingRedemptionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/points/redeem
 * multipart/form-data: email (שדה טקסט) + idDocument (קובץ תמונה)
 * שולח פנייה לאדמין – אין מיידי קוד קופון
 */
router.post(
  '/redeem',
  requireAuth,
  requireApprovedResponder,
  redeemLimiter,
  uploadIdDoc,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('יש להעלות צילום תעודת זהות לצורך אימות', 400);
      }

      const parsed = redemptionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'פרטי הפנייה אינם תקינים',
          400
        );
      }

      const result = await submitRedemptionRequest(
        req.user!.id,
        parsed.data.email,
        { buffer: req.file.buffer, mimetype: req.file.mimetype }
      );
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/** GET /api/points/redemptions – היסטוריית פדיונות של המשתמש */
router.get(
  '/redemptions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redemptions = await listUserRedemptions(req.user!.id);
      res.json({ success: true, redemptions });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
