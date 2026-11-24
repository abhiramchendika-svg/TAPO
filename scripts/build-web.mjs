/**
 * Production web build:
 *   dist/app/   the TAPO Expo app exported for the web, served under /app (sign-in required)
 *   dist/       the pre-rendered public marketing site
 * Deployed as static files (see vercel.json).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

fs.rmSync('dist', { recursive: true, force: true });
run('npx expo export --platform web --output-dir dist/app', { EXPO_BASE_URL: '/app' });
run('node site/build.mjs', { SITE_URL: process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') });
console.log('web build ready in dist/');
