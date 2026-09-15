import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist/pwa-pocket/browser');
const index = await readFile(path.join(root, 'index.html'), 'utf8');
const base = index.match(/<base href="([^"]+)"/)?.[1] ?? '/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};
http
  .createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname === '/' && base !== '/') {
      res.writeHead(302, { location: base }).end();
      return;
    }
    if (!pathname.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    const file = path.resolve(root, pathname.slice(base.length) || 'index.html');
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  })
  .listen(4173, '0.0.0.0', () => console.log('PWA Pocket: http://localhost:4173' + base));
