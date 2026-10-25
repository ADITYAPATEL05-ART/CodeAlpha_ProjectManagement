export function renderLegalView(container, type = 'tos') {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.maxWidth = '900px';
  wrap.style.margin = '0 auto';
  wrap.style.backgroundColor = '#ffffff';
  wrap.style.border = '1px solid var(--border-subtle)';
  wrap.style.borderRadius = 'var(--radius-sm)';
  wrap.style.padding = '28px 32px';

  if (type === 'tos') {
    wrap.innerHTML = `
      <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px;">
        <h1 style="font-size: 20px; font-weight: 700; color: var(--text-primary);">INCREDIBLE_x_TECH Terms of Service</h1>
        <span style="font-size: 12px; color: var(--text-secondary);">Enterprise Service Agreement - Revision 2026.4</span>
      </div>
      <div class="legal-document-content">
        <h3>1. Service Agreement and Scope</h3>
        <p>This Master Services Agreement governs access to and utilization of the INCREDIBLE_x_TECH project management platform, associated real-time WebSocket infrastructure, and RESTful application programming interfaces.</p>

        <h3>2. Workspace Accounts and Credential Custody</h3>
        <p>Subscribers are solely accountable for the safeguarding of session keys, JSON Web Tokens, and individual account access privileges. Multi-factor authentication is recommended across all administrative nodes.</p>

        <h3>3. Data Ownership and Retention</h3>
        <p>Customer retains all title, proprietary rights, and intellectual property in and to all workspace task records, communication logs, technical documents, and stored assets. INCREDIBLE_x_TECH claims zero ownership over customer content.</p>

        <h3>4. Service Level Objectives and Platform Availability</h3>
        <p>The platform targets 99.9% uptime across production clusters. Scheduled maintenance windows are communicated in advance. Transactional database snapshots are preserved with write-ahead logging.</p>

        <h3>5. Limitation of Liability</h3>
        <p>In no event shall INCREDIBLE_x_TECH or its engineering contributors be liable for consequential, incidental, indirect, or punitive damages arising from the use or inability to use the platform.</p>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px;">
        <h1 style="font-size: 20px; font-weight: 700; color: var(--text-primary);">INCREDIBLE_x_TECH Privacy Policy</h1>
        <span style="font-size: 12px; color: var(--text-secondary);">Global Data Governance and Protection - Revision 2026.4</span>
      </div>
      <div class="legal-document-content">
        <h3>1. Scope of Data Processing</h3>
        <p>We process personal and operational data exclusively to operate, maintain, and deliver the collaborative project management functionality of INCREDIBLE_x_TECH. Data includes user profile records, project task cards, comments, timestamps, and notification logs.</p>

        <h3>2. Cryptographic Security Safeguards</h3>
        <p>User credentials are encrypted using salted scrypt cryptographic hashing. In-flight API communications and WebSocket channels are guarded by TLS protocols. Session verification employs timing-safe comparison primitives to prevent side-channel leakage.</p>

        <h3>3. Information Sharing Restrictions</h3>
        <p>No customer data is shared, leased, sold, or distributed to advertising syndicates or data harvesting vendors. All data remains strictly within the designated enterprise workspace boundary.</p>

        <h3>4. Compliance and Data Rights</h3>
        <p>In accordance with GDPR, CCPA, and global privacy benchmarks, data subjects maintain the right to inspect, modify, export, or permanently erase their stored user profiles and collaborative records.</p>
      </div>
    `;
  }

  container.appendChild(wrap);
}

