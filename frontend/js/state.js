class Store {
  constructor() {
    this.state = {
      activeMode: 'landing',
      currentUser: null,
      users: [],
      projects: [],
      currentProject: null,
      columns: [],
      tasks: [],
      filterText: '',
      filterPriority: 'ALL',
      activeView: 'list',
      unreadCount: 0,
      notifications: [],
      wsConnected: false,
      activeClientsCount: 1
    };
    this.subscribers = new Set();
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const sub of this.subscribers) {
      try {
        sub(this.state);
      } catch {}
    }
  }

  getFilteredTasks() {
    const { tasks, filterText, filterPriority } = this.state;
    return tasks.filter((task) => {
      if (filterPriority !== 'ALL' && task.priority !== filterPriority) {
        return false;
      }
      if (filterText) {
        const query = filterText.toLowerCase();
        const matchTitle = task.title && task.title.toLowerCase().includes(query);
        const matchDesc = task.description && task.description.toLowerCase().includes(query);
        const matchAssignee = task.assignee_name && task.assignee_name.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchAssignee) {
          return false;
        }
      }
      return true;
    });
  }

  updateTaskLocally(updatedTask) {
    const tasks = this.state.tasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
    this.setState({ tasks });
  }

  removeTaskLocally(taskId) {
    const tasks = this.state.tasks.filter((t) => t.id !== taskId);
    this.setState({ tasks });
  }

  addTaskLocally(newTask) {
    if (this.state.tasks.some((t) => t.id === newTask.id)) return;
    this.setState({ tasks: [...this.state.tasks, newTask] });
  }
}

export const store = new Store();
