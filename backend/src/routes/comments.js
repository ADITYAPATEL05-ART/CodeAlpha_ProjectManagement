import { db } from '../db.js';
import { wsHub } from '../ws.js';

export function handleCommentRoutes(req, res, user) {
  const { pathname } = req.parsedUrl;

  const commentsMatch = pathname.match(/^\/api\/tasks\/(\d+)\/comments$/);
  if (commentsMatch) {
    const taskId = Number(commentsMatch[1]);

    if (req.method === 'GET') {
      const comments = db.prepare(`
        SELECT cm.*, u.full_name as user_name, u.avatar_url as user_avatar, u.role as user_role
        FROM comments cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.task_id = ?
        ORDER BY cm.created_at ASC
      `).all(taskId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ comments }));
      return true;
    }

    if (req.method === 'POST') {
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return true;
      }

      const { content } = req.body || {};
      if (!content || !content.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Comment content cannot be empty' }));
        return true;
      }

      const task = db.prepare('SELECT project_id, title, assignee_id, creator_id FROM tasks WHERE id = ?').get(taskId);
      if (!task) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Task not found' }));
        return true;
      }

      const insert = db.prepare(`
        INSERT INTO comments (task_id, user_id, content)
        VALUES (?, ?, ?)
      `);
      const result = insert.run(taskId, user.id, content.trim());
      const commentId = Number(result.lastInsertRowid);

      const createdComment = db.prepare(`
        SELECT cm.*, u.full_name as user_name, u.avatar_url as user_avatar, u.role as user_role
        FROM comments cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.id = ?
      `).get(commentId);

      db.prepare(`
        INSERT INTO activity_logs (project_id, task_id, user_id, action_type, description)
        VALUES (?, ?, ?, 'COMMENT_ADDED', ?)
      `).run(task.project_id, taskId, user.id, `${user.full_name} commented on "${task.title}"`);

      const notifyUserIds = new Set();
      if (task.assignee_id && task.assignee_id !== user.id) notifyUserIds.add(task.assignee_id);
      if (task.creator_id && task.creator_id !== user.id) notifyUserIds.add(task.creator_id);

      for (const recipientId of notifyUserIds) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, task_id)
          VALUES (?, 'New Comment', ?, ?)
        `).run(recipientId, `${user.full_name} commented on "${task.title}": "${content.slice(0, 45)}"`, taskId);

        wsHub.sendToUser(recipientId, {
          type: 'NOTIFICATION_RECEIVED',
          data: {
            title: 'New Comment',
            message: `${user.full_name} commented on "${task.title}"`,
            taskId
          }
        });
      }

      wsHub.broadcast({
        type: 'COMMENT_ADDED',
        data: {
          taskId,
          comment: createdComment
        }
      });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ comment: createdComment }));
      return true;
    }
  }

  return false;
}

