import { store } from '../state.js';
import { api } from '../api.js';
import { ICONS } from '../icons.js';
import { openTaskModal } from '../components/taskModal.js';

export function renderBoardView(container) {
  const state = store.getState();
  const { columns, currentProject } = state;
  const filteredTasks = store.getFilteredTasks();

  if (!currentProject) {
    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--asana-text-muted);">Select or create a project to view the board.</div>`;
    return;
  }

  container.innerHTML = '';
  const boardWrap = document.createElement('div');
  boardWrap.className = 'asana-board-container';

  for (const col of columns) {
    const colTasks = filteredTasks.filter((t) => t.column_id === col.id);
    const colEl = createAsanaBoardCol(col, colTasks);
    boardWrap.appendChild(colEl);
  }

  container.appendChild(boardWrap);
}

function createAsanaBoardCol(column, tasks) {
  const colEl = document.createElement('div');
  colEl.className = 'asana-board-col';
  colEl.dataset.columnId = column.id;

  const header = document.createElement('div');
  header.className = 'asana-col-header';
  header.innerHTML = `
    <div class="asana-col-title-wrap">
      <span class="asana-col-title">${escapeHtml(column.name)}</span>
      <span class="asana-col-count">${tasks.length}</span>
    </div>
  `;
  colEl.appendChild(header);

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'asana-col-cards';
  cardsContainer.dataset.columnId = column.id;

  for (const task of tasks) {
    const cardEl = createAsanaCard(task, column);
    cardsContainer.appendChild(cardEl);
  }

  cardsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cardsContainer.classList.add('drag-over');
  });

  cardsContainer.addEventListener('dragleave', (e) => {
    if (!cardsContainer.contains(e.relatedTarget)) {
      cardsContainer.classList.remove('drag-over');
    }
  });

  cardsContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    cardsContainer.classList.remove('drag-over');
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;

    const taskId = Number(taskIdStr);
    const targetColId = Number(column.id);

    const task = store.getState().tasks.find((t) => t.id === taskId);
    if (!task || task.column_id === targetColId) return;

    const originalColId = task.column_id;
    store.updateTaskLocally({ ...task, column_id: targetColId });

    try {
      await api.moveTask(taskId, targetColId, 0);
    } catch {
      store.updateTaskLocally({ ...task, column_id: originalColId });
    }
  });

  colEl.appendChild(cardsContainer);

  const addBtn = document.createElement('button');
  addBtn.className = 'asana-col-add-btn';
  addBtn.innerHTML = `${ICONS.plus} Add task`;

  addBtn.onclick = async () => {
    const title = prompt(`Add task to ${column.name}:`);
    if (!title || !title.trim()) return;
    try {
      const res = await api.createTask({
        project_id: column.project_id,
        column_id: column.id,
        title: title.trim(),
        priority: 'Medium'
      });
      store.addTaskLocally(res.task);
      openTaskModal(res.task.id);
    } catch (err) {
      alert(err.message);
    }
  };

  colEl.appendChild(addBtn);

  return colEl;
}

function createAsanaCard(task, column) {
  const card = document.createElement('div');
  card.className = 'asana-card';
  card.draggable = true;
  card.dataset.taskId = task.id;

  const isDone = column.name.toLowerCase() === 'done';
  const priorityClass = `badge-${task.priority.toLowerCase()}`;

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  card.addEventListener('click', () => {
    openTaskModal(task.id);
  });

  let coverHtml = '';
  if (task.cover_url) {
    coverHtml = `<img src="${task.cover_url}" alt="Cover" class="asana-card-cover" loading="lazy" />`;
  }

  let assigneeHtml = '';
  if (task.assignee_avatar) {
    assigneeHtml = `<img src="${task.assignee_avatar}" alt="${task.assignee_name || ''}" class="assignee-avatar-sm" title="${task.assignee_name || ''}" />`;
  } else {
    assigneeHtml = `<span style="color: var(--asana-text-muted); font-size: 11px;">${ICONS.user}</span>`;
  }

  card.innerHTML = `
    ${coverHtml}
    <div class="asana-card-top">
      <div class="task-complete-circle ${isDone ? 'completed' : ''}" title="${isDone ? 'Mark Incomplete' : 'Mark Complete'}">
        ${isDone ? ICONS.check : ''}
      </div>
      <div class="asana-card-title ${isDone ? 'completed' : ''}">${escapeHtml(task.title)}</div>
    </div>
    <div class="asana-card-footer">
      <div class="card-tags">
        <span class="badge ${priorityClass}">${task.priority}</span>
        ${task.due_date ? `<span style="font-size: 11px; color: var(--asana-text-secondary); display: flex; align-items: center; gap: 3px;">${ICONS.calendar} ${task.due_date}</span>` : ''}
      </div>
      <div class="card-meta-icons">
        ${task.comment_count > 0 ? `<span style="display: flex; align-items: center; gap: 2px;">${ICONS.comment} ${task.comment_count}</span>` : ''}
        ${assigneeHtml}
      </div>
    </div>
  `;

  const circle = card.querySelector('.task-complete-circle');
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

  return card;
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
