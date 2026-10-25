import { api } from '../api.js';
import { store } from '../state.js';
import { ICONS } from '../icons.js';

export function openProjectModal() {
  closeProjectModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'project-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog modal-sm';

  dialog.innerHTML = `
    <div class="modal-header">
      <span class="modal-title">Create New Group Project</span>
      <button class="btn-icon" id="proj-modal-close">${ICONS.close}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Project Name</label>
        <input type="text" id="new-proj-name" placeholder="e.g. Distributed Core Service" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="new-proj-desc" rows="3" placeholder="Brief technical summary and scope of project..."></textarea>
      </div>
      <div class="form-group">
        <label>Cover Image URL (Optional)</label>
        <input type="text" id="new-proj-cover" value="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="proj-modal-cancel">Cancel</button>
      <button class="btn-primary" id="proj-modal-submit">Create Project</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProjectModal();
  });

  dialog.querySelector('#proj-modal-close').addEventListener('click', closeProjectModal);
  dialog.querySelector('#proj-modal-cancel').addEventListener('click', closeProjectModal);

  const submitBtn = dialog.querySelector('#proj-modal-submit');
  submitBtn.addEventListener('click', async () => {
    const name = dialog.querySelector('#new-proj-name').value.trim();
    const desc = dialog.querySelector('#new-proj-desc').value.trim();
    const cover = dialog.querySelector('#new-proj-cover').value.trim();

    if (!name) {
      alert('Project name is required');
      return;
    }

    try {
      const res = await api.createProject(name, desc, cover);
      closeProjectModal();
      const projData = await api.getProjects();
      store.setState({
        projects: projData.projects,
        currentProject: res.project
      });
      window.dispatchEvent(new CustomEvent('project-switched', { detail: res.project.id }));
    } catch (err) {
      alert(err.message);
    }
  });
}

export function closeProjectModal() {
  const existing = document.getElementById('project-modal-overlay');
  if (existing) {
    existing.remove();
  }
}

