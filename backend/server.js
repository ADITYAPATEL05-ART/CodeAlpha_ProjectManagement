import http from 'node:http';
import { PORT, HOST } from './src/config.js';
import { createHttpHandler } from './src/app.js';
import { wsHub } from './src/ws.js';
import { runSeed } from './src/seed.js';

runSeed(false);

const requestHandler = createHttpHandler();
const server = http.createServer(requestHandler);

server.on('upgrade', (req, socket, head) => {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  if (url.pathname === '/ws') {
    wsHub.handleUpgrade(req, socket);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`INCREDIBLE_x_TECH backend running on http://${HOST}:${PORT}`);
  console.log(`WebSocket server active on ws://${HOST}:${PORT}/ws`);
});

