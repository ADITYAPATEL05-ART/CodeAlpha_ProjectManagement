import { api } from '../api.js';
import { store } from '../state.js';
import { realtime } from '../ws.js';
import { ICONS } from '../icons.js';

export function openAuthModal() {
  closeAuthModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'auth-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog modal-sm';

  const state = store.getState();
  const users = state.users || [];

  dialog.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">Authentication & User Switcher</span>
      <button class="btn-icon" id="auth-modal-close">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
        Quick Switch Demo Account
      </div>
      <div class="demo-users-grid" id="demo-users-container">
        ${users.map(u => `
          <div class="demo-user-card" data-email="${u.email}">
            <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}" alt="${escapeHtml(u.full_name)}" style="width: 28px; height: 28px; border-radius: var(--radius-xs); object-fit: cover; border: 1px solid var(--border-subtle);" />
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 700; font-size: 12px; color: var(--text-primary);">${escapeHtml(u.full_name)}</span>
              <span style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(u.role)}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
            Sign In with Email
          </span>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="user@incredible.tech" />
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label>Password</label>
          <input type="password" id="auth-password" value="password123" />
        </div>
        <button class="btn-primary" id="btn-do-login" style="width: 100%;">Sign In</button>
      </div>

      <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; text-align: center;">
        <button class="btn-secondary" id="btn-show-register" style="width: 100%;">Register New Account</button>
      </div>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  dialog.querySelector('#auth-modal-close').addEventListener('click', closeAuthModal);

  const demoCards = dialog.querySelectorAll('.demo-user-card');
  demoCards.forEach(card => {
    card.addEventListener('click', async () => {
      const email = card.dataset.email;
      try {
        const res = await api.login(email, 'password123');
        store.setState({ currentUser: res.user });
        realtime.connect(res.token);
        closeAuthModal();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
      } catch (err) {
        alert(err.message);
      }
    });
  });

  const btnLogin = dialog.querySelector('#btn-do-login');
  btnLogin.addEventListener('click', async () => {
    const email = dialog.querySelector('#auth-email').value.trim();
    const password = dialog.querySelector('#auth-password').value;
    if (!email || !password) {
      alert('Email and password are required');
      return;
    }
    try {
      const res = await api.login(email, password);
      store.setState({ currentUser: res.user });
      realtime.connect(res.token);
      closeAuthModal();
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
    } catch (err) {
      alert(err.message);
    }
  });

  const btnShowRegister = dialog.querySelector('#btn-show-register');
  btnShowRegister.addEventListener('click', () => {
    const body = dialog.querySelector('.modal-body');
    body.innerHTML = `
      <div class="form-group" style="margin-bottom: 8px;">
        <label>Full Name</label>
        <input type="text" id="reg-name" placeholder="Aditya Patel" />
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label>Email</label>
        <input type="email" id="reg-email" placeholder="aditya@incredible.tech" />
      </div>
      <div class="form-group" style="margin-bottom: 8px;">
        <label>Password</label>
        <input type="password" id="reg-password" value="password123" />
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label>Role</label>
        <input type="text" id="reg-role" value="Software Engineer" />
      </div>
      <button class="btn-primary" id="btn-do-register" style="width: 100%; margin-bottom: 8px;">Create Account</button>
      <button class="btn-secondary" id="btn-back-login" style="width: 100%;">Back to Sign In</button>
    `;

    body.querySelector('#btn-back-login').addEventListener('click', openAuthModal);
    body.querySelector('#btn-do-register').addEventListener('click', async () => {
      const name = body.querySelector('#reg-name').value.trim();
      const email = body.querySelector('#reg-email').value.trim();
      const password = body.querySelector('#reg-password').value;
      const role = body.querySelector('#reg-role').value.trim();

      if (!name || !email || !password) {
        alert('All fields are required');
        return;
      }

      try {
        const res = await api.register(email, password, name, role);
        store.setState({ currentUser: res.user });
        realtime.connect(res.token);
        closeAuthModal();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

export function closeAuthModal() {
  const existing = document.getElementById('auth-modal-overlay');
  if (existing) {
    existing.remove();
  }
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

