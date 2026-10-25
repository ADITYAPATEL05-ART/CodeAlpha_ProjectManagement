import { store } from '../state.js';
import { ICONS } from '../icons.js';

export function renderOverviewView(container) {
  const state = store.getState();
  const { currentProject, tasks, users } = state;

  if (!currentProject) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Select or create a project to view the overview.</div>`;
    return;
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => {
    const col = state.columns.find((c) => c.id === t.column_id);
    return col && col.name.toLowerCase() === 'done';
  }).length;

  const inProgressTasks = tasks.filter((t) => {
    const col = state.columns.find((c) => c.id === t.column_id);
    return col && col.name.toLowerCase() === 'in progress';
  }).length;

  const urgentTasks = tasks.filter((t) => t.priority === 'Urgent').length;

  const bannerImg = currentProject.cover_url || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80';

  const overviewWrap = document.createElement('div');
  overviewWrap.className = 'overview-container';

  overviewWrap.innerHTML = `
    <div class="overview-hero">
      <img src="${bannerImg}" alt="${escapeHtml(currentProject.name)}" class="overview-banner-img" />
      <div class="overview-hero-content">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h1 class="overview-title">${escapeHtml(currentProject.name)}</h1>
          <span class="badge badge-medium">Active Workspace</span>
        </div>
        <p class="overview-description">${escapeHtml(currentProject.description || 'Enterprise project management workspace with real-time synchronization.')}</p>
        <div style="display: flex; align-items: center; gap: 20px; font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
          <span><strong>Owner:</strong> ${escapeHtml(currentProject.owner_name || 'Sarah Chen')}</span>
          <span><strong>Created:</strong> ${new Date(currentProject.created_at || Date.now()).toLocaleDateString()}</span>
          <span><strong>System ID:</strong> PRJ-${currentProject.id}</span>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Total Tasks</span>
        <span class="stat-value">${totalTasks}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">In Progress</span>
        <span class="stat-value" style="color: var(--color-primary);">${inProgressTasks}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Completed</span>
        <span class="stat-value" style="color: var(--color-success);">${doneTasks}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Urgent Items</span>
        <span class="stat-value" style="color: var(--color-urgent);">${urgentTasks}</span>
      </div>
    </div>

    <div class="overview-section">
      <div class="overview-section-header">
        <h2 class="overview-section-title">Executive Project Brief & Technical Objectives</h2>
      </div>
      <p style="color: var(--text-secondary); line-height: 1.6; font-size: 13px;">
        INCREDIBLE_x_TECH provides enterprise organizations with an integrated project tracking, cross-functional collaboration, and asynchronous task delivery engine. All tasks, comments, and milestones are durably backed by ACID-compliant relational schemas and broadcast instantaneously across clients via low-latency WebSockets.
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px;">
        <div style="border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm); background-color: #fafbfc;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Core Architectural Goals</h4>
          <ul style="padding-left: 18px; font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
            <li>Zero-dependency backend architecture utilizing native Node.js runtimes</li>
            <li>Bidirectional WebSocket event broadcasting with automatic client reconnection</li>
            <li>Granular role-based access control with constant-time token verification</li>
            <li>Optimistic client-side cache updates with rollback resilience</li>
          </ul>
        </div>
        <div style="border: 1px solid var(--border-subtle); padding: 14px; border-radius: var(--radius-sm); background-color: #fafbfc;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Quality & Delivery Standards</h4>
          <ul style="padding-left: 18px; font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
            <li>Strict adherence to WCAG AAA contrast and high-density accessibility guidelines</li>
            <li>Sub-second query response times under high-concurrency loads</li>
            <li>Zero layout shift on dynamic drag-and-drop column transitions</li>
            <li>Comprehensive audit logging of all task state transitions</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="overview-section">
      <div class="overview-section-header">
        <h2 class="overview-section-title">Team Directory & Project Contributors</h2>
        <span style="font-size: 12px; color: var(--text-secondary);">${users.length} Active Members</span>
      </div>
      <div class="team-grid">
        ${users.map((u) => `
          <div class="team-card">
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}" alt="${escapeHtml(u.full_name)}" class="team-card-avatar" />
            <div class="team-card-info">
              <span class="team-card-name">${escapeHtml(u.full_name)}</span>
              <span class="team-card-role">${escapeHtml(u.role)}</span>
              <span class="team-card-email">${escapeHtml(u.email)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="overview-section">
      <div class="overview-section-header">
        <h2 class="overview-section-title">Milestone Roadmap & Phase Status</h2>
      </div>
      <div class="milestones-list">
        <div class="milestone-item">
          <div class="milestone-left">
            <span class="milestone-title">Phase 1: Foundation & Relational Schema Scaffolding</span>
            <span class="milestone-date">Target: October 2026</span>
          </div>
          <span class="badge badge-done">Completed</span>
        </div>
        <div class="milestone-item">
          <div class="milestone-left">
            <span class="milestone-title">Phase 2: Realtime Synchronization & Event Hub Integration</span>
            <span class="milestone-date">Target: November 2026</span>
          </div>
          <span class="badge badge-medium">In Progress</span>
        </div>
        <div class="milestone-item">
          <div class="milestone-left">
            <span class="milestone-title">Phase 3: High-Density Table Layouts & Asana Hierarchical Views</span>
            <span class="milestone-date">Target: November 2026</span>
          </div>
          <span class="badge badge-medium">In Progress</span>
        </div>
        <div class="milestone-item">
          <div class="milestone-left">
            <span class="milestone-title">Phase 4: SOC2 Type II Audit & Production Hardening</span>
            <span class="milestone-date">Target: December 2026</span>
          </div>
          <span class="badge badge-low">Scheduled</span>
        </div>
      </div>
    </div>

    <div class="overview-section">
      <div class="overview-section-header">
        <h2 class="overview-section-title">Project Attachments & Reference Architecture</h2>
      </div>
      <div class="attachments-grid">
        <div class="attachment-card">
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80" alt="Telemetry" />
          <div class="attachment-meta">
            <span class="attachment-title">Telemetry Pipeline Schema</span>
            <span class="attachment-size">PNG Image - 2.4 MB</span>
          </div>
        </div>
        <div class="attachment-card">
          <img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80" alt="Security" />
          <div class="attachment-meta">
            <span class="attachment-title">Perimeter Security Controls</span>
            <span class="attachment-size">PDF Document - 4.1 MB</span>
          </div>
        </div>
        <div class="attachment-card">
          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80" alt="Metrics" />
          <div class="attachment-meta">
            <span class="attachment-title">Sprint Velocity Projections</span>
            <span class="attachment-size">Spreadsheet - 890 KB</span>
          </div>
        </div>
        <div class="attachment-card">
          <img src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80" alt="Design" />
          <div class="attachment-meta">
            <span class="attachment-title">UI Component Specifications</span>
            <span class="attachment-size">Figma Archive - 12.8 MB</span>
          </div>
        </div>
      </div>
    </div>

    <div class="overview-section" id="terms-of-service-section">
      <div class="overview-section-header">
        <h2 class="overview-section-title">Enterprise Terms of Service</h2>
        <span style="font-size: 11px; color: var(--text-secondary);">Last Updated: October 2026</span>
      </div>
      <div class="legal-document-content">
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing or using the INCREDIBLE_x_TECH platform, all registered users, guest contributors, and enterprise accounts agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you must discontinue platform access immediately.</p>

        <h3>2. Workspace Administration and User Roles</h3>
        <p>Workspace owners maintain full operational jurisdiction over project permissions, member invitations, and data retention schedules. Each contributor is responsible for maintaining the confidentiality of their authentication credentials and for all activities originating from their account.</p>

        <h3>3. Acceptable Use and Platform Integrity</h3>
        <p>Users must not conduct automated security probes, unauthorized load testing, or introduce malicious payloads into task descriptions, attachments, or comment threads. Any breach of platform integrity will result in immediate session revocation.</p>

        <h3>4. Limitation of Liability</h3>
        <p>The INCREDIBLE_x_TECH platform and its associated APIs and WebSocket services are provided on an as-is and as-available basis without warranty of any kind, whether express or implied.</p>
      </div>
    </div>

    <div class="overview-section" id="privacy-policy-section">
      <div class="overview-section-header">
        <h2 class="overview-section-title">Enterprise Privacy and Data Protection Policy</h2>
        <span style="font-size: 11px; color: var(--text-secondary);">Compliance: GDPR / CCPA Ready</span>
      </div>
      <div class="legal-document-content">
        <h3>1. Information Collected</h3>
        <p>INCREDIBLE_x_TECH collects user identification data (full name, email address, role, profile avatar), transactional task updates, audit log entries, and real-time WebSocket connection state strictly to facilitate multi-tenant workspace collaboration.</p>

        <h3>2. Data Encryption and Storage Security</h3>
        <p>All passwords are encrypted using salted scrypt cryptographic key derivation with constant-time verification. Session tokens are signed using HMAC-SHA256 protocols. Project data is persisted locally in durable relational storage with foreign key constraints enabled.</p>

        <h3>3. Third-Party Disclosures</h3>
        <p>INCREDIBLE_x_TECH does not sell, lease, or monetize customer data. Data is never shared with third-party advertising or analytics brokers. Telemetry is utilized solely for maintaining real-time server health and synchronization reliability.</p>

        <h3>4. User Data Rights and Erasure</h3>
        <p>In accordance with international privacy frameworks, users may request full data export or permanent deletion of their account and associated task comments by contacting their workspace administrator.</p>
      </div>
    </div>
  `;

  container.innerHTML = '';
  container.appendChild(overviewWrap);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

