import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { verifyToken } from './auth.js';
import { FRONTEND_DIR } from './config.js';
import { handleAuthRoutes } from './routes/auth.js';
import { handleProjectRoutes } from './routes/projects.js';
import { handleTaskRoutes } from './routes/tasks.js';
import { handleCommentRoutes } from './routes/comments.js';
import { handleNotificationRoutes } from './routes/notifications.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
      if (bodyStr.length > 5 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!bodyStr) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(bodyStr));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function extractUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return verifyToken(parts[1]);
  }
  return null;
}

export function createHttpHandler() {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host || 'localhost';
    req.parsedUrl = new URL(req.url, `http://${host}`);
    const pathname = req.parsedUrl.pathname;

    if (pathname.startsWith('/api/')) {
      req.body = await parseRequestBody(req);
      const user = extractUser(req);

      if (handleAuthRoutes(req, res, user)) return;
      if (handleProjectRoutes(req, res, user)) return;
      if (handleTaskRoutes(req, res, user)) return;
      if (handleCommentRoutes(req, res, user)) return;
      if (handleNotificationRoutes(req, res, user)) return;

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    }

    let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(FRONTEND_DIR)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }

    fs.stat(normalized, (err, stats) => {
      if (err || !stats.isFile()) {
        const fallback = path.join(FRONTEND_DIR, 'index.html');
        fs.readFile(fallback, (fallbackErr, data) => {
          if (fallbackErr) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data);
        });
        return;
      }

      const ext = path.extname(normalized).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(normalized).pipe(res);
    });
  };
}

