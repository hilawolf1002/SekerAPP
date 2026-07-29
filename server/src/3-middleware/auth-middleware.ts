import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, ResponderStatus } from '@prisma/client';
import { appConfig } from '../2-utils/config';
import { AppError } from '../2-utils/app-error';
import { dal } from '../2-utils/dal';

export type JwtPayload = {
  userId: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        email: string | null;
        name: string | null;
        role: UserRole;
        status: ResponderStatus;
      };
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[appConfig.cookieName];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

/** דורש משתמש מחובר (JWT תקין) */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('יש להתחבר למערכת', 401);
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, appConfig.jwtSecret) as JwtPayload;
    } catch {
      throw new AppError('ההתחברות פגה או אינה תקינה', 401);
    }

    // במקרה של אדמין, לא נחפש בDB
    if (payload.userId === 'admin' && payload.role === 'ADMIN') {
      req.user = {
        id: 'admin',
        phone: '',
        email: null,
        name: 'מנהל מערכת',
        role: 'ADMIN',
        status: 'APPROVED' as ResponderStatus,
      };
      next();
      return;
    }

    const user = await dal.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError('המשתמש לא נמצא', 401);
    }

    if (user.status === 'BLOCKED') {
      throw new AppError('החשבון חסום', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** מנסה לזהות משתמש מחובר – לא נכשל אם אין התחברות */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, appConfig.jwtSecret) as JwtPayload;
    } catch {
      next();
      return;
    }

    // אדמין סינתטי (כמו ב-requireAuth) – בלי חיפוש ב-DB
    if (payload.userId === 'admin' && payload.role === 'ADMIN') {
      req.user = {
        id: 'admin',
        phone: '',
        email: null,
        name: 'מנהל מערכת',
        role: 'ADMIN',
        status: 'APPROVED' as ResponderStatus,
      };
      next();
      return;
    }

    const user = await dal.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (user && user.status !== 'BLOCKED') {
      req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** דורש עונה מאושר (פעולות פאנל – לא אדמין סינתטי) */
export function requireApprovedResponder(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AppError('יש להתחבר למערכת', 401));
    return;
  }

  // אדמין סינתטי אינו רשומת User – לא יכול לפדות / לענות כעונה
  if (req.user.id === 'admin') {
    next(
      new AppError(
        'פעולה זו מיועדת למשתמשי פאנל. התחבר עם מספר טלפון.',
        403
      )
    );
    return;
  }

  if (req.user.role === 'ADMIN' || req.user.status === 'APPROVED') {
    next();
    return;
  }

  next(new AppError('נדרש אישור כעונה במערכת', 403));
}

/** דורש אדמין */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AppError('יש להתחבר למערכת', 401));
    return;
  }

  if (req.user.role !== 'ADMIN') {
    next(new AppError('אין הרשאת מנהל', 403));
    return;
  }

  next();
}
