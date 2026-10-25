import { store } from '../state.js';
import { api } from '../api.js';

export async function renderActivityView(container) {
  const state = store.getState();
  const { currentProject } = state;

  if (!currentProject) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Select or create a project to view the activity stream.</div>`;
    return;
  }

  container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Loading activity logs...</div>`;

  try {
    const data = await api.getActivity(currentProject.id);
    const logs = data.activity || [];

    const wrap = document.createElement('div');
    wrap.style.maxWidth = '900px';
    wrap.style.margin = '0 auto';
    wrap.style.backgroundColor = '#ffffff';
    wrap.style.border = '1px solid var(--border-subtle)';
    wrap.style.borderRadius = 'var(--radius-sm)';
    wrap.style.padding = '20px 24px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.borderBottom = '1px solid var(--border-subtle)';
    header.style.paddingBottom = '12px';
    header.style.marginBottom = '16px';
    header.innerHTML = `
      <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Realtime Audit Trail & Event Stream</h2>
      <span style="font-size: 12px; color: var(--text-secondary);">${logs.length} Logged Events</span>
    `;
    wrap.appendChild(header);

    if (logs.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '30px';
      empty.style.textAlign = 'center';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = 'No recorded actions yet for this project.';
      wrap.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '12px';

      for (const item of logs) {
        const itemEl = document.createElement('div');
        itemEl.style.display = 'flex';
        itemEl.style.alignItems = 'flex-start';
        itemEl.style.gap = '12px';
        itemEl.style.paddingBottom = '12px';
        itemEl.style.borderBottom = '1px solid #f1f2f4';

        const avatar = item.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        const formattedDate = new Date(item.created_at).toLocaleString();

        itemEl.innerHTML = `
          <img src="${avatar}" alt="${escapeHtml(item.user_name || '')}" style="width: 32px; height: 32px; border-radius: var(--radius-xs); object-fit: cover; border: 1px solid var(--border-subtle); flex-shrink: 0;" />
          <div style="flex: 1; display: flex; flex-direction: column; gap: 3px;">
            <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">
              <strong>${escapeHtml(item.user_name || 'System')}</strong> ${escapeHtml(item.description)}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${escapeHtml(item.action_type)} - ${formattedDate}
            </div>
          </div>
        `;
        list.appendChild(itemEl);
      }
      wrap.appendChild(list);
    }

    container.innerHTML = '';
    container.appendChild(wrap);
  } catch (err) {
    container.innerHTML = `<div style="padding: 20px; color: var(--color-danger); text-align: center;">Error loading activity: ${escapeHtml(err.message)}</div>`;
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

