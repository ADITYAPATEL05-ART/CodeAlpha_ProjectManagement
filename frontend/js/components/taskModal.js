import { api } from '../api.js';
import { store } from '../state.js';
import { ICONS } from '../icons.js';

let activeTaskId = null;

export async function openTaskModal(taskId) {
  activeTaskId = taskId;
  const pane = document.getElementById('asana-detail-pane');
  if (!pane) return;

  pane.classList.remove('closed');
  pane.innerHTML = `
    <div class="pane-top-toolbar">
      <button class="btn-mark-complete" id="btn-pane-complete">${ICONS.check} Mark Complete</button>
      <div class="pane-top-actions">
        <button class="btn-icon" title="Attachment">${ICONS.attachment}</button>
        <button class="btn-icon" title="Appreciation">${ICONS.like}</button>
        <button class="btn-icon" id="btn-pane-close" title="Close details">${ICONS.close}</button>
      </div>
    </div>
    <div class="pane-scrollable-body" id="pane-body">
      <div style="padding: 30px; text-align: center; color: var(--asana-text-muted);">Loading task...</div>
    </div>
  `;

  pane.querySelector('#btn-pane-close').addEventListener('click', closeTaskModal);

  try {
    const data = await api.getTask(taskId);
    renderPaneContent(data);
  } catch (err) {
    const body = pane.querySelector('#pane-body');
    if (body) {
      body.innerHTML = `<div style="color: var(--asana-red); text-align: center; padding: 20px;">Error loading task: ${escapeHtml(err.message)}</div>`;
    }
  }
}

export function closeTaskModal() {
  activeTaskId = null;
  const pane = document.getElementById('asana-detail-pane');
  if (pane) {
    pane.classList.add('closed');
  }
  document.querySelectorAll('.asana-task-row').forEach(r => r.classList.remove('active'));
}

export function getActiveModalTaskId() {
  return activeTaskId;
}

function renderPaneContent(data) {
  const { task, subtasks = [], comments = [] } = data;
  const state = store.getState();
  const { columns, users } = state;
  const pane = document.getElementById('asana-detail-pane');
  if (!pane) return;

  const currentColumn = columns.find(c => c.id === task.column_id);
  const isDone = currentColumn && currentColumn.name.toLowerCase() === 'done';

  const completeBtn = pane.querySelector('#btn-pane-complete');
  if (completeBtn) {
    if (isDone) {
      completeBtn.classList.add('completed');
      completeBtn.innerHTML = `${ICONS.check} Completed`;
    } else {
      completeBtn.classList.remove('completed');
      completeBtn.innerHTML = `${ICONS.check} Mark Complete`;
    }

    completeBtn.onclick = async () => {
      let targetCol;
      if (isDone) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'in progress') || columns[0];
      } else {
        targetCol = columns.find(c => c.name.toLowerCase() === 'done') || columns[columns.length - 1];
      }
      if (targetCol) {
        try {
          const res = await api.moveTask(task.id, targetCol.id, 0);
          store.updateTaskLocally(res.task);
          openTaskModal(task.id);
        } catch (err) {
          alert(err.message);
        }
      }
    };
  }

  const body = pane.querySelector('#pane-body');
  if (!body) return;

  let coverHtml = '';
  if (task.cover_url) {
    coverHtml = `
      <div class="pane-cover-wrap">
        <img src="${task.cover_url}" alt="Cover" />
      </div>
    `;
  }

  body.innerHTML = `
    ${coverHtml}

    <input type="text" id="pane-input-title" class="pane-task-title-input" value="${escapeHtml(task.title)}" placeholder="Task title" />

    <div class="pane-meta-table">
      <span class="meta-label">Assignee</span>
      <div class="meta-value-field">
        <select id="pane-select-assignee" style="width: 100%;">
          <option value="">Unassigned</option>
          ${users.map(u => `
            <option value="${u.id}" ${u.id === task.assignee_id ? 'selected' : ''}>${escapeHtml(u.full_name)}</option>
          `).join('')}
        </select>
      </div>

      <span class="meta-label">Due date</span>
      <div class="meta-value-field">
        <input type="date" id="pane-input-duedate" value="${task.due_date || ''}" style="width: 100%;" />
      </div>

      <span class="meta-label">Stage / Section</span>
      <div class="meta-value-field">
        <select id="pane-select-column" style="width: 100%;">
          ${columns.map(c => `
            <option value="${c.id}" ${c.id === task.column_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>
          `).join('')}
        </select>
      </div>

      <span class="meta-label">Priority</span>
      <div class="meta-value-field">
        <select id="pane-select-priority" style="width: 100%;">
          <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
          <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
          <option value="Urgent" ${task.priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
        </select>
      </div>
    </div>

    <div>
      <div class="pane-section-label">Description</div>
      <textarea id="pane-input-desc" class="pane-description-box" placeholder="What is this task about?">${escapeHtml(task.description || '')}</textarea>
      <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
        <button class="btn-secondary" id="btn-pane-save-meta" style="font-size: 12px; padding: 4px 10px;">Save Changes</button>
      </div>
    </div>

    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span class="pane-section-label">Subtasks (${subtasks.filter(s => s.completed).length}/${subtasks.length})</span>
      </div>
      <div class="pane-subtasks-list" id="pane-subtasks-list">
        ${subtasks.map(s => `
          <div class="pane-subtask-row ${s.completed ? 'completed' : ''}" data-subtask-id="${s.id}">
            <div class="pane-subtask-left">
              <div class="task-complete-circle ${s.completed ? 'completed' : ''} subtask-toggle-btn" data-subtask-id="${s.id}">
                ${s.completed ? ICONS.check : ''}
              </div>
              <span style="font-size: 13px;">${escapeHtml(s.title)}</span>
            </div>
            <button class="btn-icon btn-pane-del-subtask" data-subtask-id="${s.id}">${ICONS.trash}</button>
          </div>
        `).join('')}
      </div>
      <div style="display: flex; gap: 6px; margin-top: 8px;">
        <input type="text" id="pane-new-subtask-input" placeholder="Add subtask..." style="flex: 1; font-size: 12px; padding: 5px 8px;" />
        <button class="btn-secondary" id="btn-pane-add-subtask" style="font-size: 12px; padding: 5px 10px;">Add</button>
      </div>
    </div>

    <div class="pane-activity-feed">
      <div class="pane-section-label">Comments & Communication (${comments.length})</div>
      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 250px; overflow-y: auto;">
        ${comments.map(c => `
          <div style="display: flex; gap: 10px;">
            <img src="${c.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}" alt="${escapeHtml(c.user_name)}" style="width: 28px; height: 28px; border-radius: var(--radius-xs); object-fit: cover; border: 1px solid var(--asana-border); flex-shrink: 0;" />
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                <strong style="color: var(--asana-text-primary);">${escapeHtml(c.user_name)}</strong>
                <span style="color: var(--asana-text-muted);">${new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style="font-size: 13px; color: var(--asana-text-primary); line-height: 1.4;">${escapeHtml(c.content)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="pane-comment-composer">
        <textarea id="pane-comment-input" rows="2" placeholder="Ask a question or post an update..."></textarea>
        <button class="btn-primary" id="btn-pane-submit-comment" style="align-self: flex-end; font-size: 12px; padding: 6px 12px;">Comment</button>
      </div>
    </div>

    <div style="border-top: 1px solid var(--asana-border); padding-top: 14px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 11px; color: var(--asana-text-muted);">Created: ${new Date(task.created_at).toLocaleDateString()}</span>
      <button class="btn-icon" id="btn-pane-delete-task" style="color: var(--asana-red); font-size: 12px;" title="Delete task">${ICONS.trash} Delete task</button>
    </div>
  `;

  const btnSave = body.querySelector('#btn-pane-save-meta');
  btnSave.addEventListener('click', async () => {
    const title = body.querySelector('#pane-input-title').value.trim();
    const description = body.querySelector('#pane-input-desc').value.trim();
    const column_id = Number(body.querySelector('#pane-select-column').value);
    const priority = body.querySelector('#pane-select-priority').value;
    const assigneeVal = body.querySelector('#pane-select-assignee').value;
    const assignee_id = assigneeVal ? Number(assigneeVal) : null;
    const due_date = body.querySelector('#pane-input-duedate').value || null;

    if (!title) {
      alert('Task title is required');
      return;
    }

    try {
      const res = await api.updateTask(task.id, {
        title,
        description,
        column_id,
        priority,
        assignee_id,
        due_date
      });
      store.updateTaskLocally(res.task);
      openTaskModal(task.id);
    } catch (err) {
      alert(err.message);
    }
  });

  const subToggles = body.querySelectorAll('.subtask-toggle-btn');
  subToggles.forEach(btn => {
    btn.addEventListener('click', async () => {
      const subtaskId = Number(btn.dataset.subtaskId);
      const isCompleted = btn.classList.contains('completed');
      try {
        await api.updateSubtask(subtaskId, { completed: !isCompleted });
        const refreshed = await api.getTask(task.id);
        renderPaneContent(refreshed);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  const delSubBtns = body.querySelectorAll('.btn-pane-del-subtask');
  delSubBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const subtaskId = Number(btn.dataset.subtaskId);
      try {
        await api.deleteSubtask(subtaskId);
        const refreshed = await api.getTask(task.id);
        renderPaneContent(refreshed);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  const btnAddSub = body.querySelector('#btn-pane-add-subtask');
  const inputNewSub = body.querySelector('#pane-new-subtask-input');
  const handleAddSubtask = async () => {
    const title = inputNewSub.value.trim();
    if (!title) return;
    try {
      await api.addSubtask(task.id, title);
      inputNewSub.value = '';
      const refreshed = await api.getTask(task.id);
      renderPaneContent(refreshed);
    } catch (err) {
      alert(err.message);
    }
  };
  btnAddSub.addEventListener('click', handleAddSubtask);
  inputNewSub.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddSubtask();
  });

  const btnSubmitComment = body.querySelector('#btn-pane-submit-comment');
  const inputComment = body.querySelector('#pane-comment-input');
  btnSubmitComment.addEventListener('click', async () => {
    const content = inputComment.value.trim();
    if (!content) return;
    try {
      await api.addComment(task.id, content);
      inputComment.value = '';
      const refreshed = await api.getTask(task.id);
      renderPaneContent(refreshed);
    } catch (err) {
      alert(err.message);
    }
  });

  const btnDelete = body.querySelector('#btn-pane-delete-task');
  btnDelete.addEventListener('click', async () => {
    if (confirm('Delete this task permanently?')) {
      try {
        await api.deleteTask(task.id);
        store.removeTaskLocally(task.id);
        closeTaskModal();
      } catch (err) {
        alert(err.message);
      }
    }
  });
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
