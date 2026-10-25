import { db } from '../db.js';
import { wsHub } from '../ws.js';

export function handleTaskRoutes(req, res, user) {
  const { pathname, searchParams } = req.parsedUrl;

  if (pathname === '/api/tasks' && req.method === 'GET') {
    const projectId = searchParams.get('project_id');
    if (!projectId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'project_id query parameter is required' }));
      return true;
    }

    const tasks = db.prepare(`
      SELECT t.*,
        u.full_name as assignee_name, u.avatar_url as assignee_avatar,
        c.name as column_name,
        (SELECT COUNT(*) FROM comments cm WHERE cm.task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.completed = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN task_columns c ON t.column_id = c.id
      WHERE t.project_id = ?
      ORDER BY t.position ASC, t.id ASC
    `).all(Number(projectId));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tasks }));
    return true;
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const { project_id, column_id, title, description, cover_url, priority, due_date, assignee_id } = req.body || {};
    if (!project_id || !title || !title.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'project_id and title are required' }));
      return true;
    }

    let targetColId = column_id;
    if (!targetColId) {
      const firstCol = db.prepare('SELECT id FROM task_columns WHERE project_id = ? ORDER BY position ASC LIMIT 1').get(Number(project_id));
      if (!firstCol) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Project has no columns defined' }));
        return true;
      }
      targetColId = firstCol.id;
    }

    const maxPosRow = db.prepare('SELECT MAX(position) as max_pos FROM tasks WHERE column_id = ?').get(targetColId);
    const nextPos = (maxPosRow && maxPosRow.max_pos !== null) ? maxPosRow.max_pos + 1 : 0;

    const insertTask = db.prepare(`
      INSERT INTO tasks (project_id, column_id, title, description, cover_url, priority, due_date, assignee_id, creator_id, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertTask.run(
      Number(project_id),
      Number(targetColId),
      title.trim(),
      (description || '').trim(),
      cover_url || null,
      priority || 'Medium',
      due_date || null,
      assignee_id ? Number(assignee_id) : null,
      user.id,
      nextPos
    );

    const taskId = Number(result.lastInsertRowid);

    const createdTask = db.prepare(`
      SELECT t.*,
        u.full_name as assignee_name, u.avatar_url as assignee_avatar,
        c.name as column_name,
        0 as comment_count,
        0 as subtask_count,
        0 as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN task_columns c ON t.column_id = c.id
      WHERE t.id = ?
    `).get(taskId);

    db.prepare(`
      INSERT INTO activity_logs (project_id, task_id, user_id, action_type, description)
      VALUES (?, ?, ?, 'TASK_CREATED', ?)
    `).run(Number(project_id), taskId, user.id, `${user.full_name} created task "${title.trim()}"`);

    if (assignee_id && Number(assignee_id) !== user.id) {
      const notif = db.prepare(`
        INSERT INTO notifications (user_id, title, message, task_id)
        VALUES (?, 'Task Assigned', ?, ?)
      `);
      notif.run(Number(assignee_id), `${user.full_name} assigned you to "${title.trim()}"`, taskId);

      wsHub.sendToUser(Number(assignee_id), {
        type: 'NOTIFICATION_RECEIVED',
        data: {
          title: 'Task Assigned',
          message: `${user.full_name} assigned you to "${title.trim()}"`,
          taskId
        }
      });
    }

    wsHub.broadcast({
      type: 'TASK_CREATED',
      data: { task: createdTask }
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ task: createdTask }));
    return true;
  }

  const moveMatch = pathname.match(/^\/api\/tasks\/(\d+)\/move$/);
  if (moveMatch && req.method === 'PUT') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const taskId = Number(moveMatch[1]);
    const { column_id, position } = req.body || {};

    if (!column_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'column_id is required' }));
      return true;
    }

    const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!currentTask) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Task not found' }));
      return true;
    }

    const newCol = db.prepare('SELECT name FROM task_columns WHERE id = ?').get(Number(column_id));
    const targetPos = (typeof position === 'number') ? position : currentTask.position;

    db.prepare(`
      UPDATE tasks
      SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(Number(column_id), targetPos, taskId);

    db.prepare(`
      INSERT INTO activity_logs (project_id, task_id, user_id, action_type, description)
      VALUES (?, ?, ?, 'TASK_MOVED', ?)
    `).run(
      currentTask.project_id,
      taskId,
      user.id,
      `${user.full_name} moved "${currentTask.title}" to ${newCol ? newCol.name : 'new column'}`
    );

    const updatedTask = db.prepare(`
      SELECT t.*,
        u.full_name as assignee_name, u.avatar_url as assignee_avatar,
        c.name as column_name,
        (SELECT COUNT(*) FROM comments cm WHERE cm.task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.completed = 1) as subtask_completed_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      JOIN task_columns c ON t.column_id = c.id
      WHERE t.id = ?
    `).get(taskId);

    wsHub.broadcast({
      type: 'TASK_MOVED',
      data: {
        taskId,
        column_id: Number(column_id),
        position: targetPos,
        task: updatedTask
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ task: updatedTask }));
    return true;
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (taskMatch) {
    const taskId = Number(taskMatch[1]);

    if (req.method === 'GET') {
      const task = db.prepare(`
        SELECT t.*,
          u.full_name as assignee_name, u.avatar_url as assignee_avatar,
          c.name as column_name,
          creator.full_name as creator_name
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN users creator ON t.creator_id = creator.id
        JOIN task_columns c ON t.column_id = c.id
        WHERE t.id = ?
      `).get(taskId);

      if (!task) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Task not found' }));
        return true;
      }

      const subtasks = db.prepare(`
        SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC, id ASC
      `).all(taskId);

      const comments = db.prepare(`
        SELECT cm.*, u.full_name as user_name, u.avatar_url as user_avatar, u.role as user_role
        FROM comments cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.task_id = ?
        ORDER BY cm.created_at ASC
      `).all(taskId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ task, subtasks, comments }));
      return true;
    }

    if (req.method === 'PUT') {
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return true;
      }

      const prevTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (!prevTask) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Task not found' }));
        return true;
      }

      const { title, description, priority, due_date, assignee_id, cover_url, column_id } = req.body || {};

      db.prepare(`
        UPDATE tasks
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            priority = COALESCE(?, priority),
            due_date = ?,
            assignee_id = ?,
            cover_url = ?,
            column_id = COALESCE(?, column_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        title ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        priority || null,
        due_date !== undefined ? due_date : prevTask.due_date,
        assignee_id !== undefined ? (assignee_id ? Number(assignee_id) : null) : prevTask.assignee_id,
        cover_url !== undefined ? cover_url : prevTask.cover_url,
        column_id ? Number(column_id) : null,
        taskId
      );

      if (assignee_id && Number(assignee_id) !== prevTask.assignee_id && Number(assignee_id) !== user.id) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, task_id)
          VALUES (?, 'Task Reassigned', ?, ?)
        `).run(Number(assignee_id), `${user.full_name} assigned you to "${prevTask.title}"`, taskId);

        wsHub.sendToUser(Number(assignee_id), {
          type: 'NOTIFICATION_RECEIVED',
          data: {
            title: 'Task Reassigned',
            message: `${user.full_name} assigned you to "${prevTask.title}"`,
            taskId
          }
        });
      }

      const updated = db.prepare(`
        SELECT t.*,
          u.full_name as assignee_name, u.avatar_url as assignee_avatar,
          c.name as column_name,
          (SELECT COUNT(*) FROM comments cm WHERE cm.task_id = t.id) as comment_count,
          (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
          (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.completed = 1) as subtask_completed_count
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        JOIN task_columns c ON t.column_id = c.id
        WHERE t.id = ?
      `).get(taskId);

      wsHub.broadcast({
        type: 'TASK_UPDATED',
        data: { task: updated }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ task: updated }));
      return true;
    }

    if (req.method === 'DELETE') {
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return true;
      }

      const existing = db.prepare('SELECT project_id, title FROM tasks WHERE id = ?').get(taskId);
      if (existing) {
        db.prepare(`
          INSERT INTO activity_logs (project_id, user_id, action_type, description)
          VALUES (?, ?, 'TASK_DELETED', ?)
        `).run(existing.project_id, user.id, `${user.full_name} deleted task "${existing.title}"`);
      }

      db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

      wsHub.broadcast({
        type: 'TASK_DELETED',
        data: { taskId }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, taskId }));
      return true;
    }
  }

  const subtaskAddMatch = pathname.match(/^\/api\/tasks\/(\d+)\/subtasks$/);
  if (subtaskAddMatch && req.method === 'POST') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const taskId = Number(subtaskAddMatch[1]);
    const { title } = req.body || {};
    if (!title || !title.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Subtask title is required' }));
      return true;
    }

    const maxPosRow = db.prepare('SELECT MAX(position) as max_pos FROM subtasks WHERE task_id = ?').get(taskId);
    const nextPos = (maxPosRow && maxPosRow.max_pos !== null) ? maxPosRow.max_pos + 1 : 0;

    const insertSub = db.prepare(`
      INSERT INTO subtasks (task_id, title, completed, position)
      VALUES (?, ?, 0, ?)
    `);
    const resSub = insertSub.run(taskId, title.trim(), nextPos);
    const subtaskId = Number(resSub.lastInsertRowid);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);

    wsHub.broadcast({
      type: 'SUBTASK_ADDED',
      data: { taskId, subtask }
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ subtask }));
    return true;
  }

  const subtaskItemMatch = pathname.match(/^\/api\/subtasks\/(\d+)$/);
  if (subtaskItemMatch) {
    const subtaskId = Number(subtaskItemMatch[1]);

    if (req.method === 'PUT') {
      const { completed, title } = req.body || {};
      const sub = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);
      if (!sub) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Subtask not found' }));
        return true;
      }

      db.prepare(`
        UPDATE subtasks
        SET completed = COALESCE(?, completed),
            title = COALESCE(?, title)
        WHERE id = ?
      `).run(
        completed !== undefined ? (completed ? 1 : 0) : null,
        title ? title.trim() : null,
        subtaskId
      );

      const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);

      wsHub.broadcast({
        type: 'SUBTASK_UPDATED',
        data: { taskId: sub.task_id, subtask: updated }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ subtask: updated }));
      return true;
    }

    if (req.method === 'DELETE') {
      const sub = db.prepare('SELECT task_id FROM subtasks WHERE id = ?').get(subtaskId);
      if (sub) {
        db.prepare('DELETE FROM subtasks WHERE id = ?').run(subtaskId);
        wsHub.broadcast({
          type: 'SUBTASK_DELETED',
          data: { taskId: sub.task_id, subtaskId }
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, subtaskId }));
      return true;
    }
  }

  return false;
}

