import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { appConfig } from './2-utils/config';
import { errorMiddleware } from './3-middleware/error-middleware';
import authController from './6-controllers/auth/auth-controller';
import surveyController from './6-controllers/surveys/survey-controller';
import pointsController from './6-controllers/points/points-controller';
import adminController from './6-controllers/admin/admin-controller';

dotenv.config();

const app: Application = express();

// --- אבטחה בסיסית ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: appConfig.corsOrigins,
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'יותר מדי בקשות. נסי שוב מאוחר יותר',
  },
});
app.use(globalLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// תמונות סקר ציבוריות (לא ת.ז. – אלה נשארות ב-private-uploads)
app.use(
  '/uploads/surveys',
  express.static(path.resolve(__dirname, '../public-uploads/surveys'), {
    fallthrough: false,
    maxAge: '7d',
  })
);

// --- Health ---
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    env: appConfig.nodeEnv,
  });
});

// --- API ---
app.use('/api/auth', authController);
app.use('/api/surveys', surveyController);
app.use('/api/points', pointsController);
app.use('/api/admin', adminController);

// --- Frontend (production / Railway) ---
// בבילד: client/dist. בריצה מ-server/dist → ../../client/dist
if (!appConfig.isDev) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// --- שגיאות ---
app.use(errorMiddleware);

export default app;
