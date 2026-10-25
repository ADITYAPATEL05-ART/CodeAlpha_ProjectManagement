import { db } from '../db.js';
import { hashPassword, verifyPassword, createToken } from '../auth.js';

export function handleAuthRoutes(req, res, user) {
  const { pathname } = req.parsedUrl;

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const { email, password, full_name, role, avatar_url } = req.body || {};
    if (!email || !password || !full_name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email, password, and full name are required' }));
      return true;
    }

    try {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User with this email already exists' }));
        return true;
      }

      const password_hash = hashPassword(password);
      const avatar = avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
      const userRole = role || 'Member';

      const insert = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, role, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = insert.run(email, password_hash, full_name, userRole, avatar);
      const userId = Number(result.lastInsertRowid);

      const defaultProject = db.prepare('SELECT id FROM projects ORDER BY id ASC LIMIT 1').get();
      if (defaultProject) {
        db.prepare(`
          INSERT OR IGNORE INTO project_members (project_id, user_id, role)
          VALUES (?, ?, 'Contributor')
        `).run(defaultProject.id, userId);
      }

      const token = createToken({ id: userId, email, full_name, role: userRole });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        token,
        user: { id: userId, email, full_name, role: userRole, avatar_url: avatar }
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email and password are required' }));
      return true;
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid email or password' }));
      return true;
    }

    const token = createToken({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      token,
      user: {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        avatar_url: row.avatar_url
      }
    }));
    return true;
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    const row = db.prepare('SELECT id, email, full_name, role, avatar_url, created_at FROM users WHERE id = ?').get(user.id);
    if (!row) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return true;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: row }));
    return true;
  }

  if (pathname === '/api/auth/users' && req.method === 'GET') {
    const rows = db.prepare('SELECT id, email, full_name, role, avatar_url FROM users ORDER BY full_name ASC').all();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: rows }));
    return true;
  }

  return false;
}

