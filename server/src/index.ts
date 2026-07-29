import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { appConfig } from './2-utils/config';

app.listen(appConfig.port, '0.0.0.0', () => {
  console.log(`SekerApp server running on http://localhost:${appConfig.port}`);
  console.log(`Environment: ${appConfig.nodeEnv}`);
});
