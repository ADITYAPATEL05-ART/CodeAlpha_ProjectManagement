import { store } from '../state.js';
import { ICONS } from '../icons.js';
import { openAuthModal } from '../components/authModal.js';
import { renderListView } from './listView.js';

export function renderLandingView(container) {
  container.innerHTML = `
    <div class="asana-landing-page">
      <header class="landing-nav">
        <div class="landing-nav-left">
          <div class="landing-brand" id="landing-brand-logo">
            <div class="landing-brand-logo">
              <div class="logo-circle"></div>
              <div class="logo-circle"></div>
              <div class="logo-circle"></div>
            </div>
            <span class="landing-brand-title">INCREDIBLE_x_TECH</span>
          </div>

          <nav class="landing-nav-links">
            <button class="landing-nav-link" id="nav-features-link">Features</button>
            <button class="landing-nav-link" id="nav-demo-link">Live Product</button>
            <button class="landing-nav-link" id="nav-roadmap-link">Roadmap</button>
            <button class="landing-nav-link" id="nav-security-link">Security</button>
            <button class="landing-nav-link" id="nav-tos-link">Terms</button>
            <button class="landing-nav-link" id="nav-privacy-link">Privacy</button>
          </nav>
        </div>

        <div class="landing-nav-right">
          <button class="btn-secondary" id="btn-landing-login" style="font-size: 13px; padding: 6px 12px;">Sign In / Switch</button>
          <button class="btn-primary" id="btn-landing-launch-workspace" style="font-size: 13px; padding: 7px 16px;">Launch Workspace</button>
          <button class="btn-landing-hamburger" id="btn-landing-mobile-hamburger" aria-label="Toggle navigation">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"/>
            </svg>
          </button>
        </div>
      </header>

      <div class="landing-mobile-menu" id="landing-mobile-menu-drawer">
        <button class="mobile-menu-link" id="mob-nav-features">Features</button>
        <button class="mobile-menu-link" id="mob-nav-demo">Live Product Demo</button>
        <button class="mobile-menu-link" id="mob-nav-security">Security & Architecture</button>
        <button class="mobile-menu-link" id="mob-nav-tos">Terms of Service</button>
        <button class="mobile-menu-link" id="mob-nav-privacy">Privacy Policy</button>
        <div class="mobile-menu-actions">
          <button class="btn-secondary" id="mob-btn-login">Sign In / Switch Account</button>
          <button class="btn-primary" id="mob-btn-launch">Launch Workspace</button>
        </div>
      </div>

      <section class="landing-hero">
        <div class="hero-pill-badge">
          <span class="dot"></span>
          <span>Enterprise Collaborative Platform 2026</span>
        </div>

        <h1 class="hero-heading">
          Manage your team projects from start to finish
        </h1>

        <p class="hero-subtext">
          INCREDIBLE_x_TECH unites cross-functional engineering, design, and operations teams in one collaborative platform. Organize tasks, track real-time progress, and accelerate project delivery with zero friction.
        </p>

        <div class="hero-cta-group">
          <button class="btn-hero-primary" id="btn-hero-cta-launch">Get Started Free</button>
          <button class="btn-hero-secondary" id="btn-hero-cta-demo">Explore Interactive Demo</button>
        </div>
      </section>

      <section class="landing-demo-frame" id="interactive-demo-section">
        <div class="demo-frame-bar">
          <div class="demo-frame-dots">
            <div class="demo-dot"></div>
            <div class="demo-dot"></div>
            <div class="demo-dot"></div>
          </div>
          <span class="demo-frame-title">INCREDIBLE_x_TECH - Interactive Workspace Preview</span>
          <button class="btn-secondary" id="btn-demo-fullscreen" style="font-size: 11px; padding: 3px 8px;">Open Fullscreen App</button>
        </div>
        <div class="demo-interactive-content" id="demo-embedded-viewport"></div>
      </section>

      <section class="landing-trust-section">
        <div class="trust-title">Built for high-velocity teams and production operations</div>
        <div class="trust-badges-row">
          <div class="trust-badge-item">Distributed Engineering</div>
          <div class="trust-badge-item">Mission Critical Systems</div>
          <div class="trust-badge-item">Enterprise Product Orgs</div>
          <div class="trust-badge-item">Site Reliability Clusters</div>
          <div class="trust-badge-item">Asynchronous Operations</div>
        </div>
      </section>

      <section class="landing-feature-row" id="section-features">
        <div class="feature-text-block">
          <span class="feature-tagline">Versatile Project Views</span>
          <h2 class="feature-title">Deliver clarity across every stage of the lifecycle</h2>
          <p class="feature-description">
            Organize complex work with versatile visual structures. Switch seamlessly between Asana-style hierarchical list views, Trello-style Kanban drag-and-drop boards, and strategic milestone roadmaps.
          </p>
          <div class="feature-checklist">
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Expandable section groupings with real-time subtask progress bars</span>
            </div>
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Smooth HTML5 drag-and-drop board with optimistic local state updates</span>
            </div>
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Granular task assignment, due dates, priority tiers, and attachment support</span>
            </div>
          </div>
        </div>
        <div class="feature-visual-card">
          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop&q=80" alt="Views" />
          <div class="feature-visual-caption">
            <span>Dynamic task execution across multi-functional engineering teams</span>
            <span class="badge badge-medium">Active Sync</span>
          </div>
        </div>
      </section>

      <section class="landing-feature-row reverse">
        <div class="feature-text-block">
          <span class="feature-tagline">Real-Time Synchronization</span>
          <h2 class="feature-title">Work together instantaneously without page reloads</h2>
          <p class="feature-description">
            Experience true live multi-collaborator synchronization. RFC 6455 WebSockets broadcast task moves, checklist completions, member assignments, and discussion comments the millisecond they occur.
          </p>
          <div class="feature-checklist">
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Bidirectional WebSocket hub with automatic client reconnection</span>
            </div>
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Granular targeted in-app notifications for task assignments and mentions</span>
            </div>
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Live workspace presence indicator tracking connected teammates</span>
            </div>
          </div>
        </div>
        <div class="feature-visual-card">
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&auto=format&fit=crop&q=80" alt="Realtime" />
          <div class="feature-visual-caption">
            <span>Low-latency WebSocket streaming telemetry</span>
            <span class="badge badge-done">Connected</span>
          </div>
        </div>
      </section>

      <section class="landing-feature-row" id="section-security">
        <div class="feature-text-block">
          <span class="feature-tagline">Enterprise Security & Storage</span>
          <h2 class="feature-title">Robust architectural foundation backed by ACID guarantees</h2>
          <p class="feature-description">
            Built with zero external driver bloat using native Node.js runtimes. Persistent relational data is guarded with foreign key cascades, atomic transactions, and cryptographic authentication.
          </p>
          <div class="feature-checklist">
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Durable local relational database using node:sqlite with WAL journaling</span>
            </div>
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Cryptographic password hashing via salted scrypt key derivation</span>
            </div>
            <div class="feature-check-item">
              <span class="feature-check-bullet">${ICONS.check}</span>
              <span>Constant-time HMAC-SHA256 session token verification</span>
            </div>
          </div>
        </div>
        <div class="feature-visual-card">
          <img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80" alt="Security" />
          <div class="feature-visual-caption">
            <span>Perimeter cryptographic security and data governance</span>
            <span class="badge badge-urgent">Hardened</span>
          </div>
        </div>
      </section>

      <section class="landing-metrics-section">
        <div class="landing-metrics-wrap">
          <div class="landing-metric-item">
            <span class="metric-big-num">100%</span>
            <span class="metric-subtitle">ACID Relational Compliance</span>
          </div>
          <div class="landing-metric-item">
            <span class="metric-big-num">&lt; 5ms</span>
            <span class="metric-subtitle">WebSocket Broadcast Latency</span>
          </div>
          <div class="landing-metric-item">
            <span class="metric-big-num">0</span>
            <span class="metric-subtitle">External Runtime Dependencies</span>
          </div>
          <div class="landing-metric-item">
            <span class="metric-big-num">100%</span>
            <span class="metric-subtitle">Automated Test Assertions Passed</span>
          </div>
        </div>
      </section>

      <section class="landing-cta-banner">
        <h2 class="cta-banner-heading">Ready to transform your project management workflow?</h2>
        <p class="cta-banner-sub">Experience the power of real-time collaborative issue tracking and project execution built to the exacting standards of Asana and Trello.</p>
        <button class="btn-hero-primary" id="btn-cta-bottom-launch" style="padding: 14px 32px; font-size: 16px;">Launch Workspace Now</button>
      </section>

      <section style="max-width: 1100px; margin: 0 auto; padding: 40px 20px;" id="landing-tos-section">
        <div style="background-color: #ffffff; border: 1px solid var(--asana-border); border-radius: var(--radius-sm); padding: 24px 24px;">
          <h2 style="font-size: 17px; font-weight: 700; color: var(--asana-text-primary); margin-bottom: 12px; border-bottom: 1px solid var(--asana-border-subtle); padding-bottom: 8px;">
            Terms of Service
          </h2>
          <div class="legal-document-content">
            <p>1. <strong>Agreement</strong>: By utilizing INCREDIBLE_x_TECH, organizations and individual contributors agree to operate strictly within authorized project boundaries.</p>
            <p>2. <strong>Accountability</strong>: Users maintain complete custody over authentication tokens and project artifacts created within their group workspaces.</p>
            <p>3. <strong>Availability</strong>: The platform provides real-time state synchronization on an as-is basis backed by durable local relational transactions.</p>
          </div>
        </div>
      </section>

      <section style="max-width: 1100px; margin: 0 auto 50px auto; padding: 0 20px;" id="landing-privacy-section">
        <div style="background-color: #ffffff; border: 1px solid var(--asana-border); border-radius: var(--radius-sm); padding: 24px 24px;">
          <h2 style="font-size: 17px; font-weight: 700; color: var(--asana-text-primary); margin-bottom: 12px; border-bottom: 1px solid var(--asana-border-subtle); padding-bottom: 8px;">
            Privacy & Data Protection Policy
          </h2>
          <div class="legal-document-content">
            <p>1. <strong>Zero Monetization</strong>: Customer task descriptions, comments, and member telemetry are never sold, leased, or distributed to advertising syndicates.</p>
            <p>2. <strong>Encryption</strong>: All password hashes use salted scrypt algorithms with constant-time verification.</p>
            <p>3. <strong>Data Subject Rights</strong>: Users maintain full rights to export or erase their profile and task records at any time.</p>
          </div>
        </div>
      </section>

      <footer class="landing-mega-footer">
        <div class="mega-footer-grid">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div class="landing-brand-logo">
                <div class="logo-circle"></div>
                <div class="logo-circle"></div>
                <div class="logo-circle"></div>
              </div>
              <span style="font-size: 16px; font-weight: 800; color: var(--asana-text-primary);">INCREDIBLE_x_TECH</span>
            </div>
            <p style="font-size: 13px; color: var(--asana-text-secondary); line-height: 1.5; max-width: 320px;">
              Enterprise collaborative management software with real-time state broadcast and durable relational workflows.
            </p>
          </div>

          <div>
            <div class="footer-col-title">Views</div>
            <div class="footer-links-col">
              <button id="footer-link-list">Asana List View</button>
              <button id="footer-link-board">Trello Kanban Board</button>
              <button id="footer-link-overview">Project Overview</button>
              <button id="footer-link-activity">Activity Feed</button>
            </div>
          </div>

          <div>
            <div class="footer-col-title">Platform</div>
            <div class="footer-links-col">
              <button id="footer-link-auth">Account Switcher</button>
              <button id="footer-link-ws">WebSocket Hub</button>
              <button id="footer-link-sqlite">Relational Schema</button>
              <button id="footer-link-notifications">Notifications</button>
            </div>
          </div>

          <div>
            <div class="footer-col-title">Compliance</div>
            <div class="footer-links-col">
              <button id="footer-scroll-tos">Terms of Service</button>
              <button id="footer-scroll-privacy">Privacy Policy</button>
              <button id="footer-link-audit">Audit Trails</button>
            </div>
          </div>

          <div>
            <div class="footer-col-title">Workspace</div>
            <div class="footer-links-col">
              <button class="btn-primary" id="footer-btn-launch" style="padding: 6px 12px; font-size: 12px;">Open App</button>
            </div>
          </div>
        </div>

        <div class="mega-footer-bottom">
          <span>2026 INCREDIBLE_x_TECH Inc. All rights reserved.</span>
          <span>Enterprise Edition - Version 2.0</span>
        </div>
      </footer>
    </div>
  `;

  const embeddedRoot = container.querySelector('#demo-embedded-viewport');
  if (embeddedRoot) {
    renderListView(embeddedRoot);
  }

  const mobileMenu = container.querySelector('#landing-mobile-menu-drawer');
  const hamburgerBtn = container.querySelector('#btn-landing-mobile-hamburger');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && e.target !== hamburgerBtn && !hamburgerBtn.contains(e.target)) {
        mobileMenu.classList.remove('open');
      }
    });
  }

  const closeMobileMenu = () => {
    if (mobileMenu) mobileMenu.classList.remove('open');
  };

  const launchApp = () => {
    closeMobileMenu();
    store.setState({ activeMode: 'workspace', activeView: 'list' });
    window.dispatchEvent(new CustomEvent('mode-changed', { detail: 'workspace' }));
  };

  container.querySelector('#btn-landing-launch-workspace').addEventListener('click', launchApp);
  container.querySelector('#btn-hero-cta-launch').addEventListener('click', launchApp);
  container.querySelector('#btn-cta-bottom-launch').addEventListener('click', launchApp);
  container.querySelector('#btn-demo-fullscreen').addEventListener('click', launchApp);
  container.querySelector('#footer-btn-launch').addEventListener('click', launchApp);
  container.querySelector('#mob-btn-launch').addEventListener('click', launchApp);

  const handleOpenAuth = () => {
    closeMobileMenu();
    openAuthModal();
  };

  container.querySelector('#btn-landing-login').addEventListener('click', handleOpenAuth);
  container.querySelector('#mob-btn-login').addEventListener('click', handleOpenAuth);

  const scrollSection = (selector) => {
    closeMobileMenu();
    const el = container.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  container.querySelector('#btn-hero-cta-demo').addEventListener('click', () => scrollSection('#interactive-demo-section'));
  container.querySelector('#nav-features-link').addEventListener('click', () => scrollSection('#section-features'));
  container.querySelector('#nav-demo-link').addEventListener('click', () => scrollSection('#interactive-demo-section'));
  container.querySelector('#nav-security-link').addEventListener('click', () => scrollSection('#section-security'));
  container.querySelector('#nav-tos-link').addEventListener('click', () => scrollSection('#landing-tos-section'));
  container.querySelector('#nav-privacy-link').addEventListener('click', () => scrollSection('#landing-privacy-section'));

  container.querySelector('#mob-nav-features').addEventListener('click', () => scrollSection('#section-features'));
  container.querySelector('#mob-nav-demo').addEventListener('click', () => scrollSection('#interactive-demo-section'));
  container.querySelector('#mob-nav-security').addEventListener('click', () => scrollSection('#section-security'));
  container.querySelector('#mob-nav-tos').addEventListener('click', () => scrollSection('#landing-tos-section'));
  container.querySelector('#mob-nav-privacy').addEventListener('click', () => scrollSection('#landing-privacy-section'));

  container.querySelector('#footer-scroll-tos').addEventListener('click', () => scrollSection('#landing-tos-section'));
  container.querySelector('#footer-scroll-privacy').addEventListener('click', () => scrollSection('#landing-privacy-section'));

  container.querySelector('#footer-link-list').addEventListener('click', launchApp);
  container.querySelector('#footer-link-board').addEventListener('click', () => {
    closeMobileMenu();
    store.setState({ activeMode: 'workspace', activeView: 'board' });
    window.dispatchEvent(new CustomEvent('mode-changed', { detail: 'workspace' }));
  });
  container.querySelector('#footer-link-overview').addEventListener('click', () => {
    closeMobileMenu();
    store.setState({ activeMode: 'workspace', activeView: 'overview' });
    window.dispatchEvent(new CustomEvent('mode-changed', { detail: 'workspace' }));
  });
  container.querySelector('#footer-link-activity').addEventListener('click', () => {
    closeMobileMenu();
    store.setState({ activeMode: 'workspace', activeView: 'activity' });
    window.dispatchEvent(new CustomEvent('mode-changed', { detail: 'workspace' }));
  });
  container.querySelector('#footer-link-auth').addEventListener('click', handleOpenAuth);
}
