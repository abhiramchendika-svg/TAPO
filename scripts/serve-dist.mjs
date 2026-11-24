/**
 * Serves dist/ the way vercel.json does: real files first, /product -> /product/index.html,
 * any other /app/* path -> /app/index.html (the Expo app routes it), everything else -> 404.html.
 * Used for local checks and by the Playwright tests.  Usage: node scripts/serve-dist.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.otf': 'font/otf', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml' };

function file(p) {
  const full = path.join(root, p);
  if (!full.startsWith(root)) return null;
  try {
    const st = fs.statSync(full);
    if (st.isFile()) return full;
    if (st.isDirectory() && fs.existsSync(path.join(full, 'index.html'))) return path.join(full, 'index.html');
  } catch {}
  return null;
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let found = file(url);
    let status = 200;
    if (!found && url.startsWith('/app')) found = path.join(root, 'app/index.html');
    if (!found) { found = path.join(root, '404.html'); status = 404; }
    res.writeHead(status, { 'content-type': TYPES[path.extname(found)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(found).pipe(res);
  })
  .listen(port, () => console.log(`dist served on http://localhost:${port}`));
