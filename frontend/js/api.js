class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers
    };

    const response = await fetch(endpoint, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async register(email, password, full_name, role, avatar_url) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role, avatar_url })
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async getUsers() {
    return this.request('/api/auth/users');
  }

  async getProjects() {
    return this.request('/api/projects');
  }

  async getProject(id) {
    return this.request(`/api/projects/${id}`);
  }

  async createProject(name, description, cover_url) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, cover_url })
    });
  }

  async getTasks(projectId) {
    return this.request(`/api/tasks?project_id=${projectId}`);
  }

  async getTask(id) {
    return this.request(`/api/tasks/${id}`);
  }

  async createTask(taskData) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async updateTask(id, taskData) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  async moveTask(id, column_id, position) {
    return this.request(`/api/tasks/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ column_id, position })
    });
  }

  async deleteTask(id) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  async addSubtask(taskId, title) {
    return this.request(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  async updateSubtask(subtaskId, data) {
    return this.request(`/api/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSubtask(subtaskId) {
    return this.request(`/api/subtasks/${subtaskId}`, {
      method: 'DELETE'
    });
  }

  async addComment(taskId, content) {
    return this.request(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async getNotifications() {
    return this.request('/api/notifications');
  }

  async markNotificationRead(id) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', {
      method: 'PUT'
    });
  }

  async getActivity(projectId = null) {
    const url = projectId ? `/api/activity?project_id=${projectId}` : '/api/activity';
    return this.request(url);
  }
}

export const api = new ApiService();

