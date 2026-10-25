import assert from 'node:assert';
import { db } from '../src/db.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../src/auth.js';
import { createHttpHandler } from '../src/app.js';

function mockRequest({ method = 'GET', url = '/', headers = {}, body = null }) {
  const req = {
    method,
    url,
    headers: { host: 'localhost:5050', ...headers },
    body,
    on(event, handler) {
      if (event === 'data' && body) {
        handler(Buffer.from(JSON.stringify(body)));
      }
      if (event === 'end') {
        handler();
      }
      return this;
    },
    destroy() {}
  };

  const res = {
    statusCode: 200,
    headers: {},
    bodyChunks: [],
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    writeHead(code, headers = {}) {
      this.statusCode = code;
      Object.assign(this.headers, headers);
    },
    write(chunk) {
      this.bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    },
    end(chunk) {
      if (chunk) {
        this.bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      this.finished = true;
      if (this.onFinish) this.onFinish();
    }
  };

  return { req, res };
}

async function runHandler(handler, { method = 'GET', url = '/', headers = {}, body = null }) {
  const { req, res } = mockRequest({ method, url, headers, body });
  await new Promise((resolve) => {
    res.onFinish = resolve;
    handler(req, res).catch(resolve);
  });

  const rawBody = Buffer.concat(res.bodyChunks).toString('utf8');
  let json = null;
  try {
    json = JSON.parse(rawBody);
  } catch {}

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: json || rawBody
  };
}

async function runAllTests() {
  console.log('Running test suite for INCREDIBLE_x_TECH backend...');

  const pwd = 'testPassword123';
  const hashed = hashPassword(pwd);
  assert.ok(verifyPassword(pwd, hashed), 'Password verification should succeed');
  assert.ok(!verifyPassword('wrongPassword', hashed), 'Wrong password should fail');

  const token = createToken({ id: 99, email: 'test@tech.com', full_name: 'Tester' });
  const verified = verifyToken(token);
  assert.strictEqual(verified.id, 99, 'Token payload ID matches');
  assert.strictEqual(verified.email, 'test@tech.com', 'Token payload email matches');

  const handler = createHttpHandler();

  const regRes = await runHandler(handler, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      email: `user_${Date.now()}@incredible.tech`,
      password: 'password123',
      full_name: 'Unit Test User',
      role: 'Engineer'
    }
  });
  assert.strictEqual(regRes.statusCode, 201, 'User registration returns 201');
  assert.ok(regRes.body.token, 'Registration returns JWT token');
  const userToken = regRes.body.token;
  const userId = regRes.body.user.id;

  const loginRes = await runHandler(handler, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'sarah.chen@incredible.tech',
      password: 'password123'
    }
  });
  assert.strictEqual(loginRes.statusCode, 200, 'Login returns 200');
  assert.ok(loginRes.body.token, 'Login returns token');
  const sarahToken = loginRes.body.token;

  const meRes = await runHandler(handler, {
    method: 'GET',
    url: '/api/auth/me',
    headers: { authorization: `Bearer ${sarahToken}` }
  });
  assert.strictEqual(meRes.statusCode, 200, 'GET /api/auth/me returns 200');
  assert.strictEqual(meRes.body.user.email, 'sarah.chen@incredible.tech');

  const usersRes = await runHandler(handler, {
    method: 'GET',
    url: '/api/auth/users'
  });
  assert.strictEqual(usersRes.statusCode, 200, 'GET /api/auth/users returns 200');
  assert.ok(usersRes.body.users.length >= 5, 'Should list at least 5 users');

  const projectsRes = await runHandler(handler, {
    method: 'GET',
    url: '/api/projects'
  });
  assert.strictEqual(projectsRes.statusCode, 200, 'GET /api/projects returns 200');
  assert.ok(projectsRes.body.projects.length >= 3, 'Should list projects');
  const firstProject = projectsRes.body.projects.find(p => p.task_count > 0) || projectsRes.body.projects[0];

  const projectDetailRes = await runHandler(handler, {
    method: 'GET',
    url: `/api/projects/${firstProject.id}`
  });
  assert.strictEqual(projectDetailRes.statusCode, 200, 'GET /api/projects/:id returns 200');
  assert.ok(projectDetailRes.body.columns.length >= 5, 'Project should have 5 columns');
  assert.ok(projectDetailRes.body.members.length >= 1, 'Project should have members');

  const tasksRes = await runHandler(handler, {
    method: 'GET',
    url: `/api/tasks?project_id=${firstProject.id}`
  });
  assert.strictEqual(tasksRes.statusCode, 200, 'GET /api/tasks returns 200');
  assert.ok(tasksRes.body.tasks.length > 0, 'Project should contain tasks');

  const createProjRes = await runHandler(handler, {
    method: 'POST',
    url: '/api/projects',
    headers: { authorization: `Bearer ${sarahToken}` },
    body: {
      name: 'Automated Pipeline Project',
      description: 'Project created via automated unit test suite'
    }
  });
  assert.strictEqual(createProjRes.statusCode, 201, 'Project creation returns 201');
  const newProjectId = createProjRes.body.project.id;

  const projDetails = await runHandler(handler, {
    method: 'GET',
    url: `/api/projects/${newProjectId}`
  });
  const defaultCol = projDetails.body.columns[0];

  const createTaskRes = await runHandler(handler, {
    method: 'POST',
    url: '/api/tasks',
    headers: { authorization: `Bearer ${sarahToken}` },
    body: {
      project_id: newProjectId,
      column_id: defaultCol.id,
      title: 'Configure CI/CD Artifact Storage',
      description: 'Setup encrypted object storage for release builds',
      priority: 'Urgent',
      due_date: '2026-12-01',
      assignee_id: userId
    }
  });
  assert.strictEqual(createTaskRes.statusCode, 201, 'Task creation returns 201');
  const newTaskId = createTaskRes.body.task.id;

  const targetCol = projDetails.body.columns[1];
  const moveRes = await runHandler(handler, {
    method: 'PUT',
    url: `/api/tasks/${newTaskId}/move`,
    headers: { authorization: `Bearer ${sarahToken}` },
    body: {
      column_id: targetCol.id,
      position: 0
    }
  });
  assert.strictEqual(moveRes.statusCode, 200, 'Moving task returns 200');
  assert.strictEqual(moveRes.body.task.column_id, targetCol.id, 'Task column matches target');

  const subtaskRes = await runHandler(handler, {
    method: 'POST',
    url: `/api/tasks/${newTaskId}/subtasks`,
    headers: { authorization: `Bearer ${sarahToken}` },
    body: { title: 'Generate S3 bucket IAM policy' }
  });
  assert.strictEqual(subtaskRes.statusCode, 201, 'Subtask creation returns 201');
  const subtaskId = subtaskRes.body.subtask.id;

  const toggleSubRes = await runHandler(handler, {
    method: 'PUT',
    url: `/api/subtasks/${subtaskId}`,
    headers: { authorization: `Bearer ${sarahToken}` },
    body: { completed: true }
  });
  assert.strictEqual(toggleSubRes.statusCode, 200, 'Subtask toggle returns 200');
  assert.strictEqual(toggleSubRes.body.subtask.completed, 1, 'Subtask completed flag set');

  const commentRes = await runHandler(handler, {
    method: 'POST',
    url: `/api/tasks/${newTaskId}/comments`,
    headers: { authorization: `Bearer ${userToken}` },
    body: { content: 'Bucket policies have been validated and signed off.' }
  });
  assert.strictEqual(commentRes.statusCode, 201, 'Comment creation returns 201');
  assert.strictEqual(commentRes.body.comment.content, 'Bucket policies have been validated and signed off.');

  const notifsRes = await runHandler(handler, {
    method: 'GET',
    url: '/api/notifications',
    headers: { authorization: `Bearer ${sarahToken}` }
  });
  assert.strictEqual(notifsRes.statusCode, 200, 'Notifications endpoint returns 200');
  assert.ok(Array.isArray(notifsRes.body.notifications), 'Notifications array returned');

  const activityRes = await runHandler(handler, {
    method: 'GET',
    url: `/api/activity?project_id=${newProjectId}`
  });
  assert.strictEqual(activityRes.statusCode, 200, 'Activity logs endpoint returns 200');
  assert.ok(activityRes.body.activity.length >= 2, 'Activity log records creations and moves');

  console.log('All backend tests passed successfully with 100% assertions satisfied!');
}

runAllTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});

