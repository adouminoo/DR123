import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexPath = join('dist', 'index.html');
const html = readFileSync(indexPath, 'utf8');

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
];

const failed = checks.filter((check) => !check.ok);

if (failed.length) {
  for (const failure of failed) {
    console.error(`Pages build verification failed: ${failure.message}`);
  }
  process.exit(1);
}

console.log('Pages build verification passed.');
