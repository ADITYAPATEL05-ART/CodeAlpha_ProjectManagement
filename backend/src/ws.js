import crypto from 'node:crypto';
import { verifyToken } from './auth.js';

class WebSocketHub {
  constructor() {
    this.clients = new Set();
  }

  handleUpgrade(req, socket) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ];

    socket.write(headers.join('\r\n'));

    const client = {
      socket,
      user: null,
      buffer: Buffer.alloc(0)
    };

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    if (token) {
      const user = verifyToken(token);
      if (user) {
        client.user = user;
      }
    }

    this.clients.add(client);

    this.send(client, {
      type: 'CONNECTED',
      data: {
        timestamp: new Date().toISOString(),
        clientsCount: this.clients.size
      }
    });

    this.broadcast({
      type: 'PRESENCE_UPDATE',
      data: {
        activeCount: this.clients.size
      }
    });

    socket.on('data', (chunk) => {
      client.buffer = Buffer.concat([client.buffer, chunk]);
      this.processBuffer(client);
    });

    const cleanup = () => {
      this.clients.delete(client);
      this.broadcast({
        type: 'PRESENCE_UPDATE',
        data: {
          activeCount: this.clients.size
        }
      });
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  }

  processBuffer(client) {
    while (client.buffer.length >= 2) {
      const byte1 = client.buffer[0];
      const byte2 = client.buffer[1];

      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) !== 0;
      let payloadLen = byte2 & 0x7f;
      let headerLen = 2;

      if (payloadLen === 126) {
        if (client.buffer.length < 4) return;
        payloadLen = client.buffer.readUInt16BE(2);
        headerLen = 4;
      } else if (payloadLen === 127) {
        if (client.buffer.length < 10) return;
        payloadLen = Number(client.buffer.readBigUInt64BE(2));
        headerLen = 10;
      }

      const maskLen = isMasked ? 4 : 0;
      const totalLen = headerLen + maskLen + payloadLen;

      if (client.buffer.length < totalLen) {
        return;
      }

      let maskKey = null;
      if (isMasked) {
        maskKey = client.buffer.subarray(headerLen, headerLen + 4);
      }

      const rawPayload = client.buffer.subarray(headerLen + maskLen, totalLen);
      const unmasked = Buffer.alloc(payloadLen);

      for (let i = 0; i < payloadLen; i++) {
        unmasked[i] = isMasked ? rawPayload[i] ^ maskKey[i % 4] : rawPayload[i];
      }

      client.buffer = client.buffer.subarray(totalLen);

      if (opcode === 0x08) {
        client.socket.end();
        return;
      }

      if (opcode === 0x09) {
        this.sendFrame(client, 0x0a, unmasked);
        continue;
      }

      if (opcode === 0x01) {
        try {
          const parsed = JSON.parse(unmasked.toString('utf8'));
          this.handleClientMessage(client, parsed);
        } catch {}
      }
    }
  }

  handleClientMessage(client, message) {
    if (message.type === 'AUTH' && message.token) {
      const user = verifyToken(message.token);
      if (user) {
        client.user = user;
        this.send(client, {
          type: 'AUTH_SUCCESS',
          data: { userId: user.id }
        });
      }
    } else if (message.type === 'PING') {
      this.send(client, { type: 'PONG', timestamp: Date.now() });
    }
  }

  send(client, payload) {
    if (!client.socket.writable) return;
    const jsonStr = JSON.stringify(payload);
    const dataBuf = Buffer.from(jsonStr, 'utf8');
    this.sendFrame(client, 0x01, dataBuf);
  }

  sendFrame(client, opcode, dataBuf) {
    const len = dataBuf.length;
    let header;

    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x80 | (opcode & 0x0f);
      header[1] = len;
    } else if (len <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | (opcode & 0x0f);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | (opcode & 0x0f);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }

    try {
      client.socket.write(Buffer.concat([header, dataBuf]));
    } catch {}
  }

  broadcast(payload, excludeClient = null) {
    for (const client of this.clients) {
      if (client !== excludeClient && client.socket.writable) {
        this.send(client, payload);
      }
    }
  }

  sendToUser(userId, payload) {
    for (const client of this.clients) {
      if (client.user && client.user.id === Number(userId) && client.socket.writable) {
        this.send(client, payload);
      }
    }
  }
}

export const wsHub = new WebSocketHub();

