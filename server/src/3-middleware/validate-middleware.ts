import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../2-utils/app-error';

/** ולידציה של body לפי Zod – מונע הזנת נתונים לא תקינים */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // אם body ריק – בדרך כלל Content-Type לא application/json ב-Postman
    if (req.body == null || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
      return next(
        new AppError(
          'גוף הבקשה ריק. ב-Postman: Body → raw → JSON, ו-Header Content-Type: application/json',
          400
        )
      );
    }

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const field = first?.path?.join('.') || '';
      const message = field
        ? `${field}: ${first.message}`
        : first?.message || 'נתונים לא תקינים';
      return next(new AppError(message, 400));
    }
    req.body = parsed.data;
    next();
  };
}
