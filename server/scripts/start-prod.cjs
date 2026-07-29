/**
 * Production start for Railway:
 * 1) Validate required env
 * 2) prisma migrate deploy
 * 3) start Express
 */
const { spawnSync } = require('child_process');
const path = require('path');

const serverRoot = path.join(__dirname, '..');

function fail(message) {
  console.error(`[FATAL] ${message}`);
  process.exit(1);
}

const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_PASSWORD'];
for (const key of required) {
  if (!process.env[key] || !String(process.env[key]).trim()) {
    fail(
      `Missing environment variable: ${key}. Add it in Railway → SekerAPP → Variables, then Redeploy.`
    );
  }
}

if (String(process.env.JWT_SECRET).length < 32) {
  fail('JWT_SECRET must be at least 32 characters.');
}

console.log('[start] NODE_ENV=', process.env.NODE_ENV || '(unset)');
console.log('[start] PORT=', process.env.PORT || '(unset)');
console.log('[start] Running prisma migrate deploy...');

const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: serverRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (migrate.status !== 0) {
  fail(`prisma migrate deploy failed with code ${migrate.status}`);
}

console.log('[start] Starting HTTP server...');
require(path.join(serverRoot, 'dist', 'index.js'));
