import { db } from './db.js';
import { hashPassword } from './auth.js';

export function runSeed(force = false) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0 && !force) {
    return;
  }

  if (force) {
    db.exec(`
      DELETE FROM activity_logs;
      DELETE FROM notifications;
      DELETE FROM comments;
      DELETE FROM subtasks;
      DELETE FROM tasks;
      DELETE FROM task_columns;
      DELETE FROM project_members;
      DELETE FROM projects;
      DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);
  }

  const defaultPassword = hashPassword('password123');

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    {
      email: 'sarah.chen@incredible.tech',
      password_hash: defaultPassword,
      full_name: 'Sarah Chen',
      role: 'Staff Architect',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    {
      email: 'alex.rivera@incredible.tech',
      password_hash: defaultPassword,
      full_name: 'Alex Rivera',
      role: 'Senior Full-Stack Engineer',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      email: 'elena.rostova@incredible.tech',
      password_hash: defaultPassword,
      full_name: 'Elena Rostova',
      role: 'Principal UI/UX Designer',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      email: 'marcus.vance@incredible.tech',
      password_hash: defaultPassword,
      full_name: 'Marcus Vance',
      role: 'Lead SRE & DevOps',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    },
    {
      email: 'priya.patel@incredible.tech',
      password_hash: defaultPassword,
      full_name: 'Priya Patel',
      role: 'Technical Program Manager',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const userIds = [];
  for (const u of users) {
    const res = insertUser.run(u.email, u.password_hash, u.full_name, u.role, u.avatar_url);
    userIds.push(Number(res.lastInsertRowid));
  }

  const insertProject = db.prepare(`
    INSERT INTO projects (name, description, cover_url, owner_id)
    VALUES (?, ?, ?, ?)
  `);

  const p1Res = insertProject.run(
    'INCREDIBLE_x_TECH Core Platform 2.0',
    'Next-generation collaborative engineering operating system with real-time state synchronization, multi-tenant RBAC, and telemetry pipelines.',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    userIds[0]
  );
  const p1Id = Number(p1Res.lastInsertRowid);

  const p2Res = insertProject.run(
    'Mobile Client & Realtime Edge Sync',
    'Offline-first mobile client implementation with localized database caches, background reconciliation, and push broadcast channels.',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    userIds[1]
  );
  const p2Id = Number(p2Res.lastInsertRowid);

  const p3Res = insertProject.run(
    'Infrastructure Security & SOC2 Compliance',
    'Hardening perimeter networking, automated cryptographic key lifecycle automation, and continuous audit trail verification.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
    userIds[3]
  );
  const p3Id = Number(p3Res.lastInsertRowid);

  const insertMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
  `);

  for (const pid of [p1Id, p2Id, p3Id]) {
    insertMember.run(pid, userIds[0], 'Owner');
    insertMember.run(pid, userIds[1], 'Lead Engineer');
    insertMember.run(pid, userIds[2], 'Designer');
    insertMember.run(pid, userIds[3], 'DevOps Engineer');
    insertMember.run(pid, userIds[4], 'Manager');
  }

  const columnNames = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
  const insertColumn = db.prepare(`
    INSERT INTO task_columns (project_id, name, position)
    VALUES (?, ?, ?)
  `);

  const p1Cols = {};
  columnNames.forEach((name, idx) => {
    const res = insertColumn.run(p1Id, name, idx);
    p1Cols[name] = Number(res.lastInsertRowid);
  });

  const p2Cols = {};
  columnNames.forEach((name, idx) => {
    const res = insertColumn.run(p2Id, name, idx);
    p2Cols[name] = Number(res.lastInsertRowid);
  });

  const p3Cols = {};
  columnNames.forEach((name, idx) => {
    const res = insertColumn.run(p3Id, name, idx);
    p3Cols[name] = Number(res.lastInsertRowid);
  });

  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, column_id, title, description, cover_url, priority, due_date, assignee_id, creator_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubtask = db.prepare(`
    INSERT INTO subtasks (task_id, title, completed, position)
    VALUES (?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (task_id, user_id, content)
    VALUES (?, ?, ?)
  `);

  const p1Tasks = [
    {
      col: p1Cols['Backlog'],
      title: 'Architect RFC-8739 Distributed Task Locking Protocol',
      desc: 'Formulate formal specification for multi-region transactional locks to prevent task update contention across concurrent engineering teams.',
      cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      priority: 'Medium',
      dueDate: '2026-11-20',
      assignee: userIds[0],
      creator: userIds[4],
      pos: 0,
      subs: [
        { title: 'Draft data schema in OpenAPI v3.1', completed: 1 },
        { title: 'Benchmark distributed SQLite wal replication', completed: 0 },
        { title: 'Review with security and infrastructure committees', completed: 0 }
      ],
      comments: [
        { user: userIds[4], content: 'Make sure we review this before the sprint close on Thursday.' },
        { user: userIds[0], content: 'Initial benchmark shows sub-millisecond lock acquisition.' }
      ]
    },
    {
      col: p1Cols['Backlog'],
      title: 'Design Dark Mode High-Contrast System Palette',
      desc: 'Establish tokenized semantic color system meeting WCAG AAA requirements with zero optical vibration.',
      cover: null,
      priority: 'Low',
      dueDate: '2026-11-28',
      assignee: userIds[2],
      creator: userIds[0],
      pos: 1,
      subs: [
        { title: 'Define semantic CSS custom properties', completed: 0 },
        { title: 'Test contrast ratios across all display profiles', completed: 0 }
      ],
      comments: []
    },
    {
      col: p1Cols['To Do'],
      title: 'Implement RFC 6455 Binary Stream Compression',
      desc: 'Add real-time frame compression using deflate algorithm to minimize bandwidth usage on mobile client connections.',
      cover: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      priority: 'High',
      dueDate: '2026-11-10',
      assignee: userIds[1],
      creator: userIds[0],
      pos: 0,
      subs: [
        { title: 'Implement permessage-deflate handshake negotiation', completed: 1 },
        { title: 'Setup streaming buffer decompression pool', completed: 0 },
        { title: 'Stress test with 10k synthetic concurrent connections', completed: 0 }
      ],
      comments: [
        { user: userIds[0], content: 'Check standard zlib streaming allocations to avoid memory fragmentation.' },
        { user: userIds[1], content: 'Working on pooling fixed-size byte buffers now.' }
      ]
    },
    {
      col: p1Cols['To Do'],
      title: 'Audit User Session Token Invalidation Vectors',
      desc: 'Verify timing safe token verification, cryptographic entropy, and replay attack prevention on all protected routes.',
      cover: null,
      priority: 'Urgent',
      dueDate: '2026-11-04',
      assignee: userIds[3],
      creator: userIds[0],
      pos: 1,
      subs: [
        { title: 'Enforce constant-time buffer comparison', completed: 1 },
        { title: 'Implement sliding session expiration validation', completed: 1 },
        { title: 'Add brute-force rate limiter on login endpoints', completed: 0 }
      ],
      comments: [
        { user: userIds[3], content: 'Constant-time verification is in place. Next step is sliding TTL.' }
      ]
    },
    {
      col: p1Cols['In Progress'],
      title: 'Build Asana-Style Deep Scrollable List & Table Interface',
      desc: 'Implement high-density hierarchical task view supporting expandable subtask rows, inline status editing, and column sorting.',
      cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
      priority: 'High',
      dueDate: '2026-11-08',
      assignee: userIds[1],
      creator: userIds[4],
      pos: 0,
      subs: [
        { title: 'Create grouped section headers for project stages', completed: 1 },
        { title: 'Implement inline assignee selection dropdown', completed: 1 },
        { title: 'Add subtask progress indicators and quick-complete toggles', completed: 1 },
        { title: 'Support keyboard navigation between table rows', completed: 0 }
      ],
      comments: [
        { user: userIds[2], content: 'Ensure the padding adheres to the 4px baseline grid.' },
        { user: userIds[1], content: 'List view is rendering cleanly with zero layout shift.' },
        { user: userIds[4], content: 'Looking very sharp. Great progress.' }
      ]
    },
    {
      col: p1Cols['In Progress'],
      title: 'Establish Enterprise Audit Trail & Real-Time Event Dispatcher',
      desc: 'Broadcast granular workspace mutations over WebSockets to synchronize connected collaborators instantaneously without page reload.',
      cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
      priority: 'Urgent',
      dueDate: '2026-11-06',
      assignee: userIds[0],
      creator: userIds[0],
      pos: 1,
      subs: [
        { title: 'Hook event dispatcher into task mutation routes', completed: 1 },
        { title: 'Broadcast presence status changes', completed: 1 },
        { title: 'Deliver targeted in-app assignment notifications', completed: 1 }
      ],
      comments: [
        { user: userIds[3], content: 'Verified live broadcast with multi-tab test sessions.' }
      ]
    },
    {
      col: p1Cols['In Review'],
      title: 'Implement Interactive Trello-Style Kanban Drag & Drop Engine',
      desc: 'Seamless column-to-column task reordering with optimistic state updates, drop target visual guides, and position persistence.',
      cover: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
      priority: 'High',
      dueDate: '2026-11-02',
      assignee: userIds[2],
      creator: userIds[1],
      pos: 0,
      subs: [
        { title: 'HTML5 Drag and Drop API integration', completed: 1 },
        { title: 'Optimistic local column swap before network roundtrip', completed: 1 },
        { title: 'Persist new column ID and position index to backend', completed: 1 },
        { title: 'Touch event fallback for mobile viewports', completed: 1 }
      ],
      comments: [
        { user: userIds[1], content: 'Pull request ready for final review.' },
        { user: userIds[0], content: 'Code looks clean. Performance is silky smooth.' }
      ]
    },
    {
      col: p1Cols['Done'],
      title: 'Initialize SQLite Relational Schema with Foreign Key Cascades',
      desc: 'Construct durable relational database engine with automated migrations, index optimizations, and atomic ACID operations.',
      cover: null,
      priority: 'Medium',
      dueDate: '2026-10-24',
      assignee: userIds[0],
      creator: userIds[0],
      pos: 0,
      subs: [
        { title: 'Configure node:sqlite DatabaseSync instance', completed: 1 },
        { title: 'Enable PRAGMA foreign_keys = ON', completed: 1 },
        { title: 'Define tables for users, projects, tasks, comments, and activity', completed: 1 }
      ],
      comments: [
        { user: userIds[3], content: 'Schema verified. Zero external driver dependencies required.' }
      ]
    },
    {
      col: p1Cols['Done'],
      title: 'Scaffold Enterprise Terms of Service and Privacy Policy Specs',
      desc: 'Draft comprehensive compliance documentation covering GDPR data ownership, workspace isolation, and retention policies.',
      cover: null,
      priority: 'Low',
      dueDate: '2026-10-25',
      assignee: userIds[4],
      creator: userIds[4],
      pos: 1,
      subs: [
        { title: 'Draft Terms of Service for collaborative workspaces', completed: 1 },
        { title: 'Draft Privacy Policy addressing telemetry and data retention', completed: 1 },
        { title: 'Integrate legal modal views into frontend navigation', completed: 1 }
      ],
      comments: [
        { user: userIds[4], content: 'All legal stipulations finalized and ready for production display.' }
      ]
    }
  ];

  const p1TaskIds = [];
  for (const t of p1Tasks) {
    const tRes = insertTask.run(
      p1Id,
      t.col,
      t.title,
      t.desc,
      t.cover,
      t.priority,
      t.dueDate,
      t.assignee,
      t.creator,
      t.pos
    );
    const tId = Number(tRes.lastInsertRowid);
    p1TaskIds.push(tId);

    for (let si = 0; si < t.subs.length; si++) {
      const sub = t.subs[si];
      insertSubtask.run(tId, sub.title, sub.completed, si);
    }

    for (const c of t.comments) {
      insertComment.run(tId, c.user, c.content);
    }
  }

  const p2Tasks = [
    {
      col: p2Cols['Backlog'],
      title: 'Implement Delta Synchronization Protocol',
      desc: 'Transmit only modified byte fields between mobile client and central servers.',
      cover: null,
      priority: 'High',
      dueDate: '2026-11-22',
      assignee: userIds[1],
      creator: userIds[0],
      pos: 0
    },
    {
      col: p2Cols['To Do'],
      title: 'Local IndexedDB Snapshot Caching',
      desc: 'Store offline task states locally for instant instant cold-start load times.',
      cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
      priority: 'Medium',
      dueDate: '2026-11-15',
      assignee: userIds[1],
      creator: userIds[4],
      pos: 0
    },
    {
      col: p2Cols['In Progress'],
      title: 'Background Service Worker Sync Handler',
      desc: 'Register background synchronization tasks to replay queued offline updates once connectivity returns.',
      cover: null,
      priority: 'Urgent',
      dueDate: '2026-11-09',
      assignee: userIds[3],
      creator: userIds[1],
      pos: 0
    },
    {
      col: p2Cols['Done'],
      title: 'Mobile Viewport CSS Media Query Specifications',
      desc: 'Tune responsive layouts for mobile handheld screens without sacrificing data density.',
      cover: null,
      priority: 'Medium',
      dueDate: '2026-10-26',
      assignee: userIds[2],
      creator: userIds[2],
      pos: 0
    }
  ];

  for (const t of p2Tasks) {
    insertTask.run(p2Id, t.col, t.title, t.desc, t.cover, t.priority, t.dueDate, t.assignee, t.creator, t.pos);
  }

  const p3Tasks = [
    {
      col: p3Cols['Backlog'],
      title: 'Automate KMS Key Rotation Verification',
      desc: 'Scheduled lambda to verify AWS KMS keys are rotated annually and compliant with SOC2 trust services criteria.',
      cover: null,
      priority: 'High',
      dueDate: '2026-11-30',
      assignee: userIds[3],
      creator: userIds[0],
      pos: 0
    },
    {
      col: p3Cols['To Do'],
      title: 'Quarterly External Penetration Test Triage',
      desc: 'Review findings report from third-party auditor and schedule remediations.',
      cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      priority: 'Urgent',
      dueDate: '2026-11-14',
      assignee: userIds[0],
      creator: userIds[4],
      pos: 0
    },
    {
      col: p3Cols['In Progress'],
      title: 'Enforce Hardware Multi-Factor Authentication',
      desc: 'Mandate WebAuthn FIDO2 keys for all engineering administrative access.',
      cover: null,
      priority: 'Medium',
      dueDate: '2026-11-05',
      assignee: userIds[3],
      creator: userIds[3],
      pos: 0
    },
    {
      col: p3Cols['Done'],
      title: 'Draft SOC2 Type II System Description',
      desc: 'Finalize architecture overview, control frameworks, and subservice organization disclosures.',
      cover: null,
      priority: 'Low',
      dueDate: '2026-10-20',
      assignee: userIds[4],
      creator: userIds[4],
      pos: 0
    }
  ];

  for (const t of p3Tasks) {
    insertTask.run(p3Id, t.col, t.title, t.desc, t.cover, t.priority, t.dueDate, t.assignee, t.creator, t.pos);
  }

  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (project_id, task_id, user_id, action_type, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertActivity.run(p1Id, null, userIds[0], 'PROJECT_CREATED', 'Sarah Chen initialized project INCREDIBLE_x_TECH Core Platform 2.0');
  insertActivity.run(p1Id, null, userIds[4], 'MEMBER_ADDED', 'Priya Patel added Alex Rivera to the platform');
  insertActivity.run(p1Id, null, userIds[1], 'TASK_MOVED', 'Alex Rivera moved "Build Asana-Style Deep Scrollable List" to In Progress');
  insertActivity.run(p1Id, null, userIds[2], 'TASK_MOVED', 'Elena Rostova moved "Implement Interactive Trello-Style Kanban" to In Review');
  insertActivity.run(p1Id, null, userIds[0], 'TASK_COMPLETED', 'Sarah Chen completed "Initialize SQLite Relational Schema"');

  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, task_id, read)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNotif.run(userIds[0], 'Welcome to INCREDIBLE_x_TECH', 'Your enterprise workspace is configured and ready.', null, 0);
  insertNotif.run(userIds[0], 'Task Assigned', 'Priya Patel assigned you to "Architect RFC-8739 Distributed Task Locking Protocol".', p1TaskIds[0], 0);
  insertNotif.run(userIds[0], 'Pull Request Review', 'Alex Rivera requested your review on "Implement RFC 6455 Binary Stream Compression".', p1TaskIds[2], 0);
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed(true);
  console.log('Seed completed successfully.');
}
