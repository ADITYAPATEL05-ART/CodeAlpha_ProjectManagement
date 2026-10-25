class RealtimeClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectTimer = null;
  }

  connect(token) {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect(token);
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.dispatch('status', { connected: true });
      if (token) {
        this.send({ type: 'AUTH', token });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type) {
          this.dispatch(payload.type, payload.data || payload);
        }
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.dispatch('status', { connected: false });
      this.scheduleReconnect(token);
    };

    this.ws.onerror = () => {
      this.connected = false;
      this.dispatch('status', { connected: false });
    };
  }

  scheduleReconnect(token) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(token);
    }, 3000);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  dispatch(event, data) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          handler(data);
        } catch {}
      }
    }
  }
}

export const realtime = new RealtimeClient();

