import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const COMPANION_DIR = path.join(__dirname, '..', 'companion');

// HTTP server to serve the Friend Companion client webpage
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  let filePath = path.join(COMPANION_DIR, req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);

  const contentTypeMap = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  const contentType = contentTypeMap[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA routes or health check
        fs.readFile(path.join(COMPANION_DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Reactive Avatars WebSocket Server is running.');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallback, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// WebSocket Server attached to HTTP Server
const wss = new WebSocketServer({ server });

/**
 * Room state structure:
 * rooms[roomId] = Set of { ws, userId, role }
 */
const rooms = new Map();

function broadcastToRoom(roomId, message, senderWs = null) {
  const clients = rooms.get(roomId);
  if (!clients) return;

  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!senderWs || client.ws !== senderWs) {
        client.ws.send(payload);
      }
    }
  }
}

function getRoomUsers(roomId) {
  const clients = rooms.get(roomId);
  if (!clients) return [];
  const users = [];
  for (const client of clients) {
    if (client.userId) {
      users.push({ userId: client.userId, role: client.role });
    }
  }
  return users;
}

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentUserId = null;
  let currentRole = 'companion'; // 'overlay' or 'companion'
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'join': {
          const { roomId, userId, role } = data;
          if (!roomId || typeof roomId !== 'string') return;

          currentRoomId = roomId.trim().toUpperCase();
          currentUserId = userId ? String(userId).trim() : 'Anonymous';
          currentRole = role === 'overlay' ? 'overlay' : 'companion';

          if (!rooms.has(currentRoomId)) {
            rooms.set(currentRoomId, new Set());
          }

          const clientEntry = { ws, userId: currentUserId, role: currentRole };
          rooms.get(currentRoomId).add(clientEntry);

          console.log(`[JOIN] Room "${currentRoomId}" - User "${currentUserId}" (${currentRole})`);

          // Confirm join to the client
          ws.send(JSON.stringify({
            type: 'joined',
            roomId: currentRoomId,
            userId: currentUserId,
            role: currentRole,
            users: getRoomUsers(currentRoomId),
          }));

          // Notify everyone in the room about updated user list
          broadcastToRoom(currentRoomId, {
            type: 'room_users',
            roomId: currentRoomId,
            users: getRoomUsers(currentRoomId),
          });
          break;
        }

        case 'speaking': {
          if (!currentRoomId || !currentUserId) return;
          const speakingState = Boolean(data.speaking);

          // Broadcast speaking state change to the room
          broadcastToRoom(currentRoomId, {
            type: 'speaking',
            roomId: currentRoomId,
            userId: currentUserId,
            speaking: speakingState,
          });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error('Invalid message received:', e);
    }
  });

  const cleanup = () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const roomClients = rooms.get(currentRoomId);
      for (const client of roomClients) {
        if (client.ws === ws) {
          roomClients.delete(client);
          break;
        }
      }

      // If user had speaking=true, broadcast speaking=false so avatar returns to idle
      if (currentUserId) {
        broadcastToRoom(currentRoomId, {
          type: 'speaking',
          roomId: currentRoomId,
          userId: currentUserId,
          speaking: false,
        });

        console.log(`[LEAVE] Room "${currentRoomId}" - User "${currentUserId}"`);

        // Broadcast updated room members
        broadcastToRoom(currentRoomId, {
          type: 'room_users',
          roomId: currentRoomId,
          users: getRoomUsers(currentRoomId),
        });
      }

      if (roomClients.size === 0) {
        rooms.delete(currentRoomId);
      }
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

// Ping-pong heartbeat to keep connections alive & detect stale dead sockets
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

server.listen(PORT, () => {
  console.log(`🚀 Reactive Avatars Server listening on port ${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 Web Companion: http://localhost:${PORT}`);
});
