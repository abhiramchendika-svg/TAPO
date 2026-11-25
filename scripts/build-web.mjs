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
// The app is a single-page export (one index.html). Give every static route its own copy so a
// direct visit or refresh of e.g. /app/insights/ is served without depending on a rewrite.
// Dynamic routes (/app/card/<id>/ etc.) fall back to the app via the rewrite in vercel.json.
const appShell = fs.readFileSync('dist/app/index.html');
const walk = (dir, rel = '') =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name.includes('[') ? [] : walk(`${dir}/${e.name}`, e.name.startsWith('(') ? rel : `${rel}/${e.name}`);
    const name = e.name.replace(/\.tsx$/, '');
    if (name === e.name || name.startsWith('_') || name.includes('[')) return [];
    return [name === 'index' ? rel : `${rel}/${name}`];
  });
const routes = [...new Set(walk('src/app'))].filter(Boolean);
for (const r of routes) {
  fs.mkdirSync(`dist/app${r}`, { recursive: true });
  fs.writeFileSync(`dist/app${r}/index.html`, appShell);
}
console.log(`app shell copied to ${routes.length} routes: ${routes.join(' ')}`);
run('node site/build.mjs', { SITE_URL: process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') });
console.log('web build ready in dist/');
