import { db } from '../db.js';

export function handleNotificationRoutes(req, res, user) {
  const { pathname, searchParams } = req.parsedUrl;

  if (pathname === '/api/notifications' && req.method === 'GET') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const notifications = db.prepare(`
      SELECT n.*, t.title as task_title
      FROM notifications n
      LEFT JOIN tasks t ON n.task_id = t.id
      WHERE n.user_id = ?
      ORDER BY n.id DESC
      LIMIT 50
    `).all(user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
    `).get(user.id);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      notifications,
      unreadCount: unreadCount ? unreadCount.count : 0
    }));
    return true;
  }

  const notifReadMatch = pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
  if (notifReadMatch && req.method === 'PUT') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const notifId = Number(notifReadMatch[1]);
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(notifId, user.id);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, notifId }));
    return true;
  }

  if (pathname === '/api/notifications/read-all' && req.method === 'PUT') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(user.id);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (pathname === '/api/activity' && req.method === 'GET') {
    const projectId = searchParams.get('project_id');
    let logs;

    if (projectId) {
      logs = db.prepare(`
        SELECT a.*, u.full_name as user_name, u.avatar_url as user_avatar
        FROM activity_logs a
        JOIN users u ON a.user_id = u.id
        WHERE a.project_id = ?
        ORDER BY a.id DESC
        LIMIT 100
      `).all(Number(projectId));
    } else {
      logs = db.prepare(`
        SELECT a.*, u.full_name as user_name, u.avatar_url as user_avatar, p.name as project_name
        FROM activity_logs a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN projects p ON a.project_id = p.id
        ORDER BY a.id DESC
        LIMIT 100
      `).all();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ activity: logs }));
    return true;
  }

  return false;
}

