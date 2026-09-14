// backend/socket.js
const { Server } = require('socket.io');

let io = null;
const userSockets = new Map();

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: 'http://localhost:3000', credentials: true }
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    const role = socket.handshake.query.role;

    if (userId) {
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);
      socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
    }

    socket.on('disconnect', () => {
      if (userId && userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        if (userSockets.get(userId).size === 0) userSockets.delete(userId);
      }
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitToRole(role, event, payload) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
}

function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSocket, emitToUser, emitToRole, broadcast };