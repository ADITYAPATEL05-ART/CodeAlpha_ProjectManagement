import { db } from '../db.js';
import { wsHub } from '../ws.js';

export function handleProjectRoutes(req, res, user) {
  const { pathname } = req.parsedUrl;

  if (pathname === '/api/projects' && req.method === 'GET') {
    const projects = db.prepare(`
      SELECT p.*, u.full_name as owner_name, u.avatar_url as owner_avatar,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ORDER BY p.id DESC
    `).all();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects }));
    return true;
  }

  if (pathname === '/api/projects' && req.method === 'POST') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const { name, description, cover_url } = req.body || {};
    if (!name || !name.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project name is required' }));
      return true;
    }

    const cover = cover_url || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80';
    const insertProj = db.prepare(`
      INSERT INTO projects (name, description, cover_url, owner_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = insertProj.run(name.trim(), (description || '').trim(), cover, user.id);
    const projectId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (?, ?, 'Owner')
    `).run(projectId, user.id);

    const defaultColumns = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
    const insertCol = db.prepare(`
      INSERT INTO task_columns (project_id, name, position)
      VALUES (?, ?, ?)
    `);
    defaultColumns.forEach((colName, index) => {
      insertCol.run(projectId, colName, index);
    });

    const logActivity = db.prepare(`
      INSERT INTO activity_logs (project_id, user_id, action_type, description)
      VALUES (?, ?, 'PROJECT_CREATED', ?)
    `);
    logActivity.run(projectId, user.id, `${user.full_name} created project "${name.trim()}"`);

    const createdProject = db.prepare(`
      SELECT p.*, u.full_name as owner_name, u.avatar_url as owner_avatar,
      0 as task_count, 1 as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `).get(projectId);

    wsHub.broadcast({
      type: 'PROJECT_CREATED',
      data: { project: createdProject }
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ project: createdProject }));
    return true;
  }

  const projectMatch = pathname.match(/^\/api\/projects\/(\d+)$/);
  if (projectMatch) {
    const projectId = Number(projectMatch[1]);

    if (req.method === 'GET') {
      const project = db.prepare(`
        SELECT p.*, u.full_name as owner_name, u.avatar_url as owner_avatar
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
      `).get(projectId);

      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Project not found' }));
        return true;
      }

      const columns = db.prepare(`
        SELECT * FROM task_columns
        WHERE project_id = ?
        ORDER BY position ASC, id ASC
      `).all(projectId);

      const members = db.prepare(`
        SELECT pm.role as project_role, pm.joined_at, u.id, u.email, u.full_name, u.role as system_role, u.avatar_url
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        ORDER BY pm.id ASC
      `).all(projectId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ project, columns, members }));
      return true;
    }

    if (req.method === 'PUT') {
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return true;
      }

      const { name, description, cover_url } = req.body || {};
      db.prepare(`
        UPDATE projects
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            cover_url = COALESCE(?, cover_url)
        WHERE id = ?
      `).run(name ? name.trim() : null, description ? description.trim() : null, cover_url || null, projectId);

      const updated = db.prepare(`
        SELECT p.*, u.full_name as owner_name, u.avatar_url as owner_avatar
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
      `).get(projectId);

      wsHub.broadcast({
        type: 'PROJECT_UPDATED',
        data: { project: updated }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ project: updated }));
      return true;
    }

    if (req.method === 'DELETE') {
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return true;
      }

      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      wsHub.broadcast({
        type: 'PROJECT_DELETED',
        data: { projectId }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, projectId }));
      return true;
    }
  }

  const memberMatch = pathname.match(/^\/api\/projects\/(\d+)\/members$/);
  if (memberMatch && req.method === 'POST') {
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return true;
    }

    const projectId = Number(memberMatch[1]);
    const { user_id, role } = req.body || {};
    if (!user_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User ID is required' }));
      return true;
    }

    db.prepare(`
      INSERT OR REPLACE INTO project_members (project_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(projectId, Number(user_id), role || 'Contributor');

    const addedMember = db.prepare(`
      SELECT pm.role as project_role, pm.joined_at, u.id, u.email, u.full_name, u.role as system_role, u.avatar_url
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `).get(projectId, Number(user_id));

    db.prepare(`
      INSERT INTO activity_logs (project_id, user_id, action_type, description)
      VALUES (?, ?, 'MEMBER_ADDED', ?)
    `).run(projectId, user.id, `${user.full_name} added ${addedMember.full_name} to the project`);

    wsHub.broadcast({
      type: 'MEMBER_ADDED',
      data: { projectId, member: addedMember }
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ member: addedMember }));
    return true;
  }

  return false;
}

