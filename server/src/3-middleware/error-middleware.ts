import { NextFunction, Request, Response } from 'express';
import { AppError } from '../2-utils/app-error';
import { appConfig } from '../2-utils/config';

/**
 * טיפול שגיאות גלובלי – בלי לחשוף stack למשתמש בפרודקשן.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  console.error('[Unhandled Error]', err);

  res.status(500).json({
    success: false,
    error: appConfig.isDev
      ? err instanceof Error
        ? err.message
        : 'שגיאה פנימית בשרת'
      : 'שגיאה פנימית בשרת',
  });
}
