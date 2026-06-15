import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const indexPath = join('dist', 'index.html');
const html = readFileSync(indexPath, 'utf8');
const assetsPath = join('dist', 'assets');
const jsBundle = readdirSync(assetsPath)
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(join(assetsPath, file), 'utf8'))
  .join('\n');

const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const checks = [
  {
    ok: !html.includes('/src/main.tsx'),
    message: 'dist/index.html must not reference the Vite dev entry /src/main.tsx.',
  },
  {
    ok: html.includes('/DR123/assets/'),
    message: 'dist/index.html must reference compiled assets under /DR123/assets/.',
  },
  {
    ok: !html.includes('%BASE_URL%'),
    message: 'dist/index.html must not contain unresolved %BASE_URL% placeholders.',
  },
  {
    ok: existsSync(join('dist', 'toplinkyou-logo.png')),
    message: 'dist/toplinkyou-logo.png must exist.',
  },
  {
    ok: !jsBundle.includes('replace-me'),
    message: 'compiled JavaScript must not contain Firebase fallback value "replace-me".',
  },
  {
    ok: !jsBundle.includes('dr123-efedd.appspot.com'),
    message: 'compiled JavaScript must not contain the old Firebase storage bucket fallback.',
  },
  ...requiredFirebaseEnv.map((name) => ({
    ok: Boolean(process.env[name]),
    message: `${name} must be set for the production Pages build.`,
  })),
  ...requiredFirebaseEnv.map((name) => ({
    ok: Boolean(process.env[name]) && jsBundle.includes(process.env[name]),
    message: `compiled JavaScript must contain the build-time value for ${name}.`,
  })),
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  for (const failure of failed) {
    console.error(`Pages build verification failed: ${failure.message}`);
  }
  process.exit(1);
}

console.log('Pages build verification passed.');
