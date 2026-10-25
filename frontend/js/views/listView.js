import { store } from '../state.js';
import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { openTaskModal, getActiveModalTaskId } from '../components/taskModal.js';

export function renderListView(container) {
  const state = store.getState();
  const { columns, currentProject } = state;
  const filteredTasks = store.getFilteredTasks();

  if (!currentProject) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--asana-text-muted);">Select or create a project to view the list.</div>`;
    return;
  }

  container.innerHTML = '';
  const listWrap = document.createElement('div');
  listWrap.className = 'asana-list-view';

  for (const col of columns) {
    const colTasks = filteredTasks.filter((t) => t.column_id === col.id);
    const sectionEl = createAsanaSection(col, colTasks);
    listWrap.appendChild(sectionEl);
  }

  container.appendChild(listWrap);
}

function createAsanaSection(column, tasks) {
  const section = document.createElement('div');
  section.className = 'asana-section';
  section.dataset.columnId = column.id;

  const header = document.createElement('div');
  header.className = 'asana-section-header';
  header.innerHTML = `
    <div class="section-header-left">
      <span class="section-toggle-icon">▼</span>
      <span class="section-title">${escapeHtml(column.name)}</span>
      <span class="section-count-badge">${tasks.length}</span>
    </div>
  `;
  section.appendChild(header);

  const tableHeader = document.createElement('div');
  tableHeader.className = 'asana-table-col-header';
  tableHeader.innerHTML = `
    <div>Task Name</div>
    <div>Assignee</div>
    <div>Due Date</div>
    <div>Priority</div>
    <div>Subtasks</div>
    <div>Chat</div>
  `;
  section.appendChild(tableHeader);

  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'section-rows-container';

  for (const task of tasks) {
    const row = createAsanaTaskRow(task, column);
    rowsContainer.appendChild(row);
  }
  section.appendChild(rowsContainer);

  const addRow = document.createElement('div');
  addRow.className = 'section-add-row';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-inline-add-task';
  addBtn.innerHTML = `${ICONS.plus} Add task...`;

  const composer = document.createElement('div');
  composer.className = 'inline-task-composer hidden';
  composer.innerHTML = `
    <input type="text" placeholder="Write a task name..." />
    <button class="btn-primary" style="font-size: 12px; padding: 4px 10px;">Add</button>
    <button class="btn-icon btn-cancel">${ICONS.close}</button>
  `;

  addBtn.onclick = () => {
    addBtn.classList.add('hidden');
    composer.classList.remove('hidden');
    const input = composer.querySelector('input');
    input.focus();
  };

  const cancelBtn = composer.querySelector('.btn-cancel');
  cancelBtn.onclick = () => {
    composer.classList.add('hidden');
    addBtn.classList.remove('hidden');
  };

  const submitBtn = composer.querySelector('.btn-primary');
  const inputEl = composer.querySelector('input');

  const handleInlineAdd = async () => {
    const title = inputEl.value.trim();
    if (!title) return;
    inputEl.value = '';
    composer.classList.add('hidden');
    addBtn.classList.remove('hidden');

    try {
      const res = await api.createTask({
        project_id: column.project_id,
        column_id: column.id,
        title,
        priority: 'Medium'
      });
      store.addTaskLocally(res.task);
      openTaskModal(res.task.id);
    } catch (err) {
      alert(err.message);
    }
  };

  submitBtn.onclick = handleInlineAdd;
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') handleInlineAdd();
    if (e.key === 'Escape') {
      composer.classList.add('hidden');
      addBtn.classList.remove('hidden');
    }
  };

  addRow.appendChild(addBtn);
  addRow.appendChild(composer);
  section.appendChild(addRow);

  const toggleIcon = header.querySelector('.section-toggle-icon');
  header.onclick = (e) => {
    if (e.target.closest('button')) return;
    const isHidden = rowsContainer.style.display === 'none';
    rowsContainer.style.display = isHidden ? 'block' : 'none';
    addRow.style.display = isHidden ? 'flex' : 'none';
    tableHeader.style.display = isHidden ? 'grid' : 'none';
    if (isHidden) {
      toggleIcon.classList.remove('collapsed');
    } else {
      toggleIcon.classList.add('collapsed');
    }
  };

  return section;
}

function createAsanaTaskRow(task, column) {
  const row = document.createElement('div');
  row.className = 'asana-task-row';
  row.dataset.taskId = task.id;

  if (getActiveModalTaskId() === task.id) {
    row.classList.add('active');
  }

  const isDone = column.name.toLowerCase() === 'done';
  const priorityClass = `badge-${task.priority.toLowerCase()}`;

  let assigneeHtml = '<span style="color: var(--asana-text-muted);">Unassigned</span>';
  if (task.assignee_avatar) {
    assigneeHtml = `
      <img src="${task.assignee_avatar}" alt="${task.assignee_name || ''}" class="assignee-avatar-sm" />
      <span>${escapeHtml(task.assignee_name || '')}</span>
    `;
  }

  const subPct = task.subtask_count > 0 ? Math.round((task.subtask_completed_count / task.subtask_count) * 100) : 0;

  row.innerHTML = `
    <div class="task-title-cell">
      <div class="task-complete-circle ${isDone ? 'completed' : ''}" data-task-id="${task.id}" title="${isDone ? 'Mark Incomplete' : 'Mark Complete'}">
        ${isDone ? ICONS.check : ''}
      </div>
      <span class="task-title-text ${isDone ? 'completed' : ''}">${escapeHtml(task.title)}</span>
    </div>
    <div class="assignee-cell">${assigneeHtml}</div>
    <div class="date-cell">${task.due_date || '-'}</div>
    <div><span class="badge ${priorityClass}">${task.priority}</span></div>
    <div class="subtask-cell">
      <div class="subtask-mini-bar">
        <div class="subtask-mini-fill" style="width: ${subPct}%;"></div>
      </div>
      <span>${task.subtask_completed_count}/${task.subtask_count}</span>
    </div>
    <div class="comments-cell">
      ${ICONS.comment} ${task.comment_count}
    </div>
  `;

  const circle = row.querySelector('.task-complete-circle');
  circle.addEventListener('click', async (e) => {
    e.stopPropagation();
    const columns = store.getState().columns;
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
      } catch (err) {
        alert(err.message);
      }
    }
  });

  row.addEventListener('click', () => {
    document.querySelectorAll('.asana-task-row').forEach(r => r.classList.remove('active'));
    row.classList.add('active');
    openTaskModal(task.id);
  });

  return row;
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
