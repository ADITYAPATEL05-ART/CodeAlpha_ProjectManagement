import { api } from './api.js';
import { store } from './state.js';
import { realtime } from './ws.js';
import { ICONS } from './icons.js';
import { renderLandingView } from './views/landingView.js';
import { renderBoardView } from './views/boardView.js';
import { renderListView } from './views/listView.js';
import { renderOverviewView } from './views/overviewView.js';
import { renderActivityView } from './views/activityView.js';
import { renderLegalView } from './views/legalView.js';
import { openTaskModal, getActiveModalTaskId } from './components/taskModal.js';
import { openProjectModal } from './components/projectModal.js';
import { openAuthModal } from './components/authModal.js';

async function initApp() {
  setupDomEvents();
  setupRealtime();

  try {
    let currentUser = null;
    try {
      const meRes = await api.getMe();
      currentUser = meRes.user;
    } catch {
      const loginRes = await api.login('sarah.chen@incredible.tech', 'password123');
      currentUser = loginRes.user;
    }
    store.setState({ currentUser });
    updateUserDisplay(currentUser);

    const usersData = await api.getUsers();
    store.setState({ users: usersData.users || [] });

    realtime.connect(api.token);

    await loadProjects();
    await loadNotifications();

    renderAppMode();
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

async function loadProjects() {
  const data = await api.getProjects();
  const projects = data.projects || [];
  store.setState({ projects });
  renderSidebarProjects(projects);

  let currentProject = store.getState().currentProject;
  if (!currentProject && projects.length > 0) {
    currentProject = projects[0];
  }

  if (currentProject) {
    await switchProject(currentProject.id);
  }
}

async function switchProject(projectId) {
  try {
    const data = await api.getProject(projectId);
    store.setState({
      currentProject: data.project,
      columns: data.columns || []
    });

    const tasksData = await api.getTasks(projectId);
    store.setState({ tasks: tasksData.tasks || [] });

    updateProjectHeader(data.project, data.members || []);
    renderSidebarProjects(store.getState().projects);
    if (store.getState().activeMode === 'workspace') {
      renderCurrentView();
    }
  } catch (err) {
    console.error('Failed to switch project:', err);
  }
}

async function loadNotifications() {
  try {
    const data = await api.getNotifications();
    store.setState({
      notifications: data.notifications || [],
      unreadCount: data.unreadCount || 0
    });
    updateNotifBadges();
  } catch {}
}

function setupRealtime() {
  realtime.on('status', ({ connected }) => {
    store.setState({ wsConnected: connected });
    const dot = document.getElementById('ws-sync-dot');
    const label = document.getElementById('ws-sync-label');
    if (dot && label) {
      if (connected) {
        dot.classList.add('connected');
        label.textContent = 'Live Sync';
      } else {
        dot.classList.remove('connected');
        label.textContent = 'Reconnecting';
      }
    }
  });

  realtime.on('PRESENCE_UPDATE', (data) => {
    store.setState({ activeClientsCount: data.activeCount || 1 });
  });

  realtime.on('TASK_CREATED', (data) => {
    const { task } = data;
    const currentProject = store.getState().currentProject;
    if (currentProject && task.project_id === currentProject.id) {
      store.addTaskLocally(task);
      if (store.getState().activeMode === 'workspace') {
        renderCurrentView();
      }
    }
  });

  realtime.on('TASK_UPDATED', (data) => {
    const { task } = data;
    const currentProject = store.getState().currentProject;
    if (currentProject && task.project_id === currentProject.id) {
      store.updateTaskLocally(task);
      if (store.getState().activeMode === 'workspace') {
        renderCurrentView();
        if (getActiveModalTaskId() === task.id) {
          openTaskModal(task.id);
        }
      }
    }
  });

  realtime.on('TASK_MOVED', (data) => {
    const { task } = data;
    const currentProject = store.getState().currentProject;
    if (currentProject && task.project_id === currentProject.id) {
      store.updateTaskLocally(task);
      if (store.getState().activeMode === 'workspace') {
        renderCurrentView();
      }
    }
  });

  realtime.on('TASK_DELETED', (data) => {
    const { taskId } = data;
    store.removeTaskLocally(taskId);
    if (store.getState().activeMode === 'workspace') {
      renderCurrentView();
    }
  });

  realtime.on('COMMENT_ADDED', (data) => {
    const { taskId } = data;
    const task = store.getState().tasks.find((t) => t.id === taskId);
    if (task) {
      store.updateTaskLocally({ ...task, comment_count: (task.comment_count || 0) + 1 });
      if (store.getState().activeMode === 'workspace') {
        renderCurrentView();
      }
    }
    if (getActiveModalTaskId() === taskId) {
      openTaskModal(taskId);
    }
  });

  realtime.on('NOTIFICATION_RECEIVED', () => {
    const currentCount = store.getState().unreadCount;
    store.setState({ unreadCount: currentCount + 1 });
    updateNotifBadges();
    loadNotifications();
  });

  realtime.on('PROJECT_CREATED', async () => {
    const data = await api.getProjects();
    store.setState({ projects: data.projects || [] });
    renderSidebarProjects(data.projects || []);
  });
}

function setupDomEvents() {
  const tabs = document.querySelectorAll('.asana-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.tab;
      store.setState({ activeView: view });
      renderCurrentView();
    });
  });

  const searchInput = document.getElementById('asana-global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.setState({ filterText: e.target.value.trim() });
      renderCurrentView();
    });
  }

  const prioritySelect = document.getElementById('asana-priority-filter');
  if (prioritySelect) {
    prioritySelect.addEventListener('change', (e) => {
      store.setState({ filterPriority: e.target.value });
      renderCurrentView();
    });
  }

  const btnCreateSidebar = document.getElementById('btn-sidebar-create');
  if (btnCreateSidebar) {
    btnCreateSidebar.addEventListener('click', () => {
      closeMobileSidebar();
      handleCreateTaskQuick();
    });
  }

  const btnAddTaskBar = document.getElementById('btn-asana-add-task-bar');
  if (btnAddTaskBar) {
    btnAddTaskBar.addEventListener('click', () => {
      handleCreateTaskQuick();
    });
  }

  const btnAddProj = document.getElementById('btn-sidebar-add-proj');
  if (btnAddProj) {
    btnAddProj.addEventListener('click', () => {
      closeMobileSidebar();
      openProjectModal();
    });
  }

  const btnInvite = document.getElementById('btn-invite-collaborator');
  if (btnInvite) {
    btnInvite.addEventListener('click', async () => {
      const state = store.getState();
      const email = prompt('Enter team member email to invite:');
      if (!email || !email.trim()) return;
      const user = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        alert('User email not found in directory. Use quick-switch to view existing users.');
        return;
      }
      try {
        await api.request(`/api/projects/${state.currentProject.id}/members`, {
          method: 'POST',
          body: JSON.stringify({ user_id: user.id, role: 'Contributor' })
        });
        alert(`Invited ${user.full_name} to the project!`);
        switchProject(state.currentProject.id);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const btnSwitchAcc = document.getElementById('btn-top-switch-account');
  if (btnSwitchAcc) {
    btnSwitchAcc.addEventListener('click', () => {
      openAuthModal();
    });
  }

  const sidebarUser = document.getElementById('sidebar-user-btn');
  if (sidebarUser) {
    sidebarUser.addEventListener('click', () => {
      closeMobileSidebar();
      openAuthModal();
    });
  }

  const notifBtn = document.getElementById('top-notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', toggleNotificationsDropdown);
  }

  const inboxItem = document.getElementById('sidebar-inbox-item');
  if (inboxItem) {
    inboxItem.addEventListener('click', () => {
      closeMobileSidebar();
      toggleNotificationsDropdown();
    });
  }

  const btnTos = document.getElementById('btn-open-tos');
  if (btnTos) {
    btnTos.addEventListener('click', () => {
      store.setState({ activeView: 'legal-tos' });
      document.querySelectorAll('.asana-tab').forEach((t) => t.classList.remove('active'));
      renderCurrentView();
    });
  }

  const btnPrivacy = document.getElementById('btn-open-privacy');
  if (btnPrivacy) {
    btnPrivacy.addEventListener('click', () => {
      store.setState({ activeView: 'legal-privacy' });
      document.querySelectorAll('.asana-tab').forEach((t) => t.classList.remove('active'));
      renderCurrentView();
    });
  }

  const btnReturnLanding = document.getElementById('btn-return-landing');
  if (btnReturnLanding) {
    btnReturnLanding.addEventListener('click', () => {
      closeMobileSidebar();
      store.setState({ activeMode: 'landing' });
      renderAppMode();
    });
  }

  const sidebarNavLanding = document.getElementById('sidebar-nav-landing');
  if (sidebarNavLanding) {
    sidebarNavLanding.addEventListener('click', () => {
      closeMobileSidebar();
      store.setState({ activeMode: 'landing' });
      renderAppMode();
    });
  }

  const sidebarLogoHome = document.getElementById('sidebar-logo-home');
  if (sidebarLogoHome) {
    sidebarLogoHome.addEventListener('click', () => {
      closeMobileSidebar();
      store.setState({ activeMode: 'landing' });
      renderAppMode();
    });
  }

  const mobileToggle = document.getElementById('btn-mobile-sidebar-toggle');
  const sidebarEl = document.getElementById('asana-sidebar-el');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (mobileToggle && sidebarEl) {
    mobileToggle.addEventListener('click', () => {
      sidebarEl.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebarEl) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }

  window.addEventListener('project-switched', (e) => {
    switchProject(e.detail);
  });

  window.addEventListener('auth-changed', (e) => {
    updateUserDisplay(e.detail);
    loadProjects();
    loadNotifications();
  });

  window.addEventListener('mode-changed', () => {
    renderAppMode();
  });
}

function closeMobileSidebar() {
  const sidebarEl = document.getElementById('asana-sidebar-el');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebarEl) sidebarEl.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('active');
}

function renderAppMode() {
  const mode = store.getState().activeMode;
  const landingRoot = document.getElementById('landing-mode-root');
  const workspaceRoot = document.getElementById('workspace-mode-root');

  if (mode === 'landing') {
    if (workspaceRoot) workspaceRoot.classList.add('hidden');
    if (landingRoot) {
      landingRoot.classList.remove('hidden');
      renderLandingView(landingRoot);
    }
  } else {
    if (landingRoot) landingRoot.classList.add('hidden');
    if (workspaceRoot) {
      workspaceRoot.classList.remove('hidden');
      renderCurrentView();
    }
  }
}

async function handleCreateTaskQuick() {
  const state = store.getState();
  if (!state.currentProject || state.columns.length === 0) {
    alert('Please select or create a project first.');
    return;
  }
  const title = prompt('Enter task name:');
  if (!title || !title.trim()) return;
  try {
    const res = await api.createTask({
      project_id: state.currentProject.id,
      column_id: state.columns[0].id,
      title: title.trim(),
      priority: 'Medium'
    });
    store.addTaskLocally(res.task);
    renderCurrentView();
    openTaskModal(res.task.id);
  } catch (err) {
    alert(err.message);
  }
}

function renderSidebarProjects(projects) {
  const container = document.getElementById('sidebar-projects-container');
  if (!container) return;
  const current = store.getState().currentProject;

  const dots = ['blue', 'green', 'amber', ''];
  container.innerHTML = projects
    .map((p, idx) => {
      const isActive = current && current.id === p.id;
      const dotColor = dots[idx % dots.length];
      return `
        <div class="sidebar-project-item ${isActive ? 'active' : ''}" data-project-id="${p.id}">
          <span class="project-dot ${dotColor}"></span>
          <span>${escapeHtml(p.name)}</span>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.sidebar-project-item').forEach((item) => {
    item.addEventListener('click', () => {
      closeMobileSidebar();
      const id = Number(item.dataset.projectId);
      switchProject(id);
    });
  });
}

function updateProjectHeader(project, members) {
  const initial = document.getElementById('project-tile-initial');
  if (initial) {
    initial.textContent = (project.name || 'P').charAt(0).toUpperCase();
  }

  const titleEl = document.getElementById('project-title-display');
  if (titleEl) {
    titleEl.textContent = project.name;
  }

  const stack = document.getElementById('project-header-member-stack');
  if (stack) {
    stack.innerHTML = members
      .map(
        (m) =>
          `<img src="${m.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}" alt="${escapeHtml(
            m.full_name
          )}" title="${escapeHtml(m.full_name)} (${m.project_role})" />`
      )
      .join('');
  }
}

function updateUserDisplay(user) {
  if (!user) return;
  const img = document.getElementById('sidebar-avatar-img');
  if (img) img.src = user.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';

  const name = document.getElementById('sidebar-user-display-name');
  if (name) name.textContent = user.full_name;

  const role = document.getElementById('sidebar-user-display-role');
  if (role) role.textContent = user.role;
}

function updateNotifBadges() {
  const count = store.getState().unreadCount;
  const topBadge = document.getElementById('top-notif-badge');
  const sideBadge = document.getElementById('sidebar-notif-count');

  if (count > 0) {
    const text = count > 9 ? '9+' : String(count);
    if (topBadge) {
      topBadge.textContent = text;
      topBadge.classList.remove('hidden');
    }
    if (sideBadge) {
      sideBadge.textContent = text;
      sideBadge.classList.remove('hidden');
    }
  } else {
    if (topBadge) topBadge.classList.add('hidden');
    if (sideBadge) sideBadge.classList.add('hidden');
  }
}

function toggleNotificationsDropdown() {
  const existing = document.getElementById('notif-dropdown-panel');
  if (existing) {
    existing.remove();
    return;
  }

  const { notifications } = store.getState();
  const dropdown = document.createElement('div');
  dropdown.className = 'notif-dropdown';
  dropdown.id = 'notif-dropdown-panel';

  dropdown.innerHTML = `
    <div class="notif-header">
      <span>Notifications</span>
      <button class="btn-icon" id="btn-mark-all-read" title="Mark all read">${ICONS.check}</button>
    </div>
    <div class="notif-list">
      ${
        notifications.length === 0
          ? `<div style="padding: 20px; text-align: center; color: var(--asana-text-muted); font-size: 12px;">No notifications</div>`
          : notifications
              .map(
                (n) => `
          <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}" data-task-id="${n.task_id || ''}">
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-message">${escapeHtml(n.message)}</div>
            <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `
              )
              .join('')
      }
    </div>
  `;

  document.body.appendChild(dropdown);

  const cleanup = (e) => {
    if (
      !dropdown.contains(e.target) &&
      e.target.id !== 'top-notif-btn' &&
      !e.target.closest('#top-notif-btn') &&
      e.target.id !== 'sidebar-inbox-item' &&
      !e.target.closest('#sidebar-inbox-item')
    ) {
      dropdown.remove();
      document.removeEventListener('click', cleanup);
    }
  };
  setTimeout(() => document.addEventListener('click', cleanup), 10);

  const markAllBtn = dropdown.querySelector('#btn-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      await api.markAllNotificationsRead();
      store.setState({ unreadCount: 0 });
      updateNotifBadges();
      dropdown.remove();
    });
  }

  const items = dropdown.querySelectorAll('.notif-item');
  items.forEach((item) => {
    item.addEventListener('click', async () => {
      const notifId = Number(item.dataset.notifId);
      const taskId = item.dataset.taskId ? Number(item.dataset.taskId) : null;
      await api.markNotificationRead(notifId);
      dropdown.remove();
      loadNotifications();
      if (taskId) {
        openTaskModal(taskId);
      }
    });
  });
}

function renderCurrentView() {
  const container = document.getElementById('asana-viewport-root');
  if (!container) return;

  const view = store.getState().activeView;
  const filteredTasks = store.getFilteredTasks();

  const countLabel = document.getElementById('task-filter-count-label');
  if (countLabel) {
    countLabel.textContent = `${filteredTasks.length} tasks`;
  }

  if (view === 'list') {
    container.className = 'asana-viewport';
    renderListView(container);
  } else if (view === 'board') {
    container.className = 'asana-viewport board-mode';
    renderBoardView(container);
  } else if (view === 'overview') {
    container.className = 'asana-viewport';
    renderOverviewView(container);
  } else if (view === 'activity') {
    container.className = 'asana-viewport';
    renderActivityView(container);
  } else if (view === 'legal-tos') {
    container.className = 'asana-viewport';
    renderLegalView(container, 'tos');
  } else if (view === 'legal-privacy') {
    container.className = 'asana-viewport';
    renderLegalView(container, 'privacy');
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

document.addEventListener('DOMContentLoaded', initApp);
