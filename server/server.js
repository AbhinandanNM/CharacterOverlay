import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const SERVER_VERSION = '2.1.0';
const COMPANION_DIR = path.join(__dirname, '..', 'companion');

// ── Logging helpers ───────────────────────────────────────────────────────────
function ts() { return new Date().toISOString(); }
function log(tag, msg, extra = '') {
  console.log(`[${ts()}] [${tag}] ${msg}${extra ? ' | ' + extra : ''}`);
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Health endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: SERVER_VERSION,
      rooms: rooms.size,
      connections: wss ? wss.clients.size : 0,
      time: ts(),
    }));
    return;
  }

  // Debug rooms endpoint (metadata only, no audio data)
  if (req.url === '/debug/rooms') {
    const roomData = {};
    for (const [roomId, clients] of rooms.entries()) {
      roomData[roomId] = {
        count: clients.size,
        users: [...clients].map(c => ({ userId: c.userId, role: c.role })),
      };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: roomData, version: SERVER_VERSION, time: ts() }));
    return;
  }

  // Serve companion client files
  let filePath = path.join(COMPANION_DIR, req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  const contentTypeMap = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  };
  const contentType = contentTypeMap[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(COMPANION_DIR, 'index.html'), (err2, fallback) => {
        if (err2) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(`Reactive Avatars Server v${SERVER_VERSION} running.`);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallback, 'utf-8');
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// ── WebSocket Server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

/**
 * rooms: Map<roomId, Set<{ ws, userId, role }>>
 */
const rooms = new Map();
let connectionCounter = 0;

function broadcastToRoom(roomId, message, senderWs = null) {
  const clients = rooms.get(roomId);
  if (!clients) return 0;
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  let count = 0;
  for (const client of clients) {
    if (client.ws !== senderWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
      count++;
    }
  }
  return count;
}

function getRoomUsers(roomId) {
  const clients = rooms.get(roomId);
  if (!clients) return [];
  return [...clients].filter(c => c.userId).map(c => ({ userId: c.userId, role: c.role }));
}

const CLOSE_CODES = {
  1000: 'Normal Closure', 1001: 'Going Away', 1002: 'Protocol Error',
  1003: 'Unsupported Data', 1006: 'Abnormal Closure', 1008: 'Policy Violation',
  1011: 'Server Error',
};

wss.on('connection', (ws, req) => {
  const connId = ++connectionCounter;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  let roomId = null;
  let userId = null;
  let role = 'companion';
  // BUG FIX: isAlive MUST be a property on the ws object itself so the heartbeat
  // interval (which only has the ws reference) can read and write it.
  ws.isAlive = true;

  log('WS CONNECT', `conn#${connId}`, `ip=${ip}`);

  ws.on('pong', () => {
    ws.isAlive = true;
    log('PONG', `conn#${connId}`, `user=${userId || 'unjoined'} room=${roomId || '-'}`);
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!data || typeof data !== 'object') return;

      log('WS MSG', `conn#${connId} type=${data.type}`, `user=${data.userId || userId || '?'} room=${data.roomId || roomId || '?'}`);

      switch (data.type) {

        case 'join': {
          const newRoomId = String(data.roomId || '').trim().toUpperCase();
          const newUserId = String(data.userId || 'Anonymous').trim();
          const newRole = data.role === 'overlay' ? 'overlay' : 'companion';

          if (!newRoomId) { log('JOIN ERROR', `conn#${connId}`, 'missing roomId'); return; }

          // Leave previous room if re-joining
          if (roomId && rooms.has(roomId)) {
            const prev = rooms.get(roomId);
            for (const c of prev) { if (c.ws === ws) { prev.delete(c); break; } }
          }

          roomId = newRoomId;
          userId = newUserId;
          role = newRole;

          if (!rooms.has(roomId)) rooms.set(roomId, new Set());
          rooms.get(roomId).add({ ws, userId, role });

          log('ROOM JOIN', `conn#${connId}`, `user=${userId} role=${role} room=${roomId} total=${rooms.get(roomId).size}`);

          const users = getRoomUsers(roomId);
          ws.send(JSON.stringify({ type: 'joined', roomId, userId, role, users }));

          const notified = broadcastToRoom(roomId, { type: 'room_users', roomId, users }, ws);
          log('ROOM BROADCAST', `room=${roomId}`, `event=room_users targets=${notified}`);
          break;
        }

        case 'speaking': {
          if (!roomId || !userId) {
            log('VOICE EVENT ERROR', `conn#${connId}`, 'not in a room');
            return;
          }
          const speakingState = Boolean(data.speaking);
          log('VOICE EVENT', `conn#${connId}`, `room=${roomId} user=${userId} speaking=${speakingState}`);

          const payload = { type: 'speaking', roomId, userId, speaking: speakingState };
          const targets = broadcastToRoom(roomId, payload, ws);
          log('ROOM BROADCAST', `room=${roomId}`, `event=speaking user=${userId} speaking=${speakingState} targets=${targets}`);
          break;
        }

        case 'ping': {
          log('PING', `conn#${connId}`, `user=${userId || '-'}`);
          ws.send(JSON.stringify({ type: 'pong', time: ts() }));
          break;
        }

        default:
          log('UNKNOWN MSG', `conn#${connId}`, `type=${data.type}`);
          break;
      }
    } catch (e) {
      log('WS ERROR', `conn#${connId}`, `parse error: ${e.message}`);
    }
  });

  const cleanup = (code, reason) => {
    const codeNum = typeof code === 'number' ? code : (code ? parseInt(code) : 0);
    const codeLabel = CLOSE_CODES[codeNum] || 'Unknown';
    const reasonStr = reason ? reason.toString() : '';
    log('WS DISCONNECT', `conn#${connId}`, `user=${userId || 'unjoined'} room=${roomId || '-'} code=${codeNum}(${codeLabel}) reason="${reasonStr}"`);

    if (roomId && rooms.has(roomId)) {
      const roomClients = rooms.get(roomId);
      for (const c of roomClients) { if (c.ws === ws) { roomClients.delete(c); break; } }

      if (userId) {
        const targets = broadcastToRoom(roomId, { type: 'speaking', roomId, userId, speaking: false });
        log('ROOM BROADCAST', `room=${roomId}`, `event=speaking(leave) user=${userId} speaking=false targets=${targets}`);

        const users = getRoomUsers(roomId);
        broadcastToRoom(roomId, { type: 'room_users', roomId, users });
      }

      if (roomClients.size === 0) rooms.delete(roomId);
    }
  };

  ws.on('close', (code, reason) => cleanup(code, reason));
  ws.on('error', (err) => {
    log('WS ERROR', `conn#${connId}`, `user=${userId || '-'} err=${err.message}`);
    cleanup(0, err.message);
  });
});

// ── Heartbeat interval ────────────────────────────────────────────────────────
// BUG FIX: read/write ws.isAlive on the ws object, NOT a closure variable.
// Previously isAlive was a closure `let isAlive = true` scoped to the connection
// handler. The interval only has the ws reference and cannot access that closure,
// so ws.isAlive was always undefined (falsy) and every socket was terminated after 30s.
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      log('PING TIMEOUT', 'heartbeat', 'terminating unresponsive socket');
      return ws.terminate();
    }
    ws.isAlive = false;   // will be reset to true when pong arrives
    ws.ping();
    log('PING', 'heartbeat', `sent to ${wss.clients.size} client(s)`);
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

server.listen(PORT, '0.0.0.0', () => {
  log('SERVER START', `v${SERVER_VERSION}`, `port=${PORT} pid=${process.pid}`);
  console.log(`🚀 Reactive Avatars Server v${SERVER_VERSION} listening on port ${PORT}`);
  console.log(`📡 WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`🌐 Web Companion: http://0.0.0.0:${PORT}`);
  console.log(`❤️  Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔍 Debug rooms: http://0.0.0.0:${PORT}/debug/rooms`);
});
