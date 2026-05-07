/**
 * roomHandler.js — Socket.IO Room Management
 *
 * Events handled:
 *   create-room, join-room, leave-room, player-ready,
 *   add-bot, remove-bot, start-game, chat-message, emoji-reaction
 */

const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

function generateCode() {
  return uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function broadcastRoom(io, room) {
  io.to(room.code).emit('room-updated', { room });
}

module.exports = function registerRoomHandlers(io, socket, activeGames) {
  // ─── Join Room ─────────────────────────────────────────────────────────────
  socket.on('join-room', async ({ code, user }) => {
    try {
      const room = await Room.findOne({ code: code.toUpperCase() });
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (room.status !== 'waiting') return socket.emit('error', { message: 'Game already started' });
      if (room.players.length >= 4) return socket.emit('error', { message: 'Room is full' });

      // Check if player is rejoining
      const existingIdx = room.players.findIndex(
        p => p.userId?.toString() === user.id
      );

      if (existingIdx !== -1) {
        // Reconnect
        room.players[existingIdx].socketId = socket.id;
        room.players[existingIdx].isConnected = true;
      } else {
        // Find next available position
        const takenPositions = room.players.map(p => p.position);
        let position = 0;
        while (takenPositions.includes(position)) position++;

        room.players.push({
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          position,
          socketId: socket.id,
          isReady: false,
          isConnected: true,
        });
      }

      await room.save();
      socket.join(room.code);
      socket.data.roomCode = room.code;
      socket.data.userId = user.id;
      socket.data.position = room.players.find(p => p.userId?.toString() === user.id)?.position;

      broadcastRoom(io, room);
      socket.emit('room-joined', { room });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Leave Room ────────────────────────────────────────────────────────────
  socket.on('leave-room', async ({ code, userId }) => {
    try {
      const room = await Room.findOne({ code });
      if (!room) return;

      room.players = room.players.filter(p => p.userId?.toString() !== userId);

      if (room.players.length === 0) {
        await Room.deleteOne({ _id: room._id });
      } else {
        // Transfer host if needed
        if (room.host.toString() === userId && room.players.length > 0) {
          room.host = room.players[0].userId;
        }
        await room.save();
        broadcastRoom(io, room);
      }

      socket.leave(code);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Player Ready ──────────────────────────────────────────────────────────
  socket.on('player-ready', async ({ code, userId, isReady }) => {
    try {
      const room = await Room.findOne({ code });
      if (!room) return;

      const player = room.players.find(p => p.userId?.toString() === userId);
      if (player) player.isReady = isReady;
      await room.save();
      broadcastRoom(io, room);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Add Bot ───────────────────────────────────────────────────────────────
  socket.on('add-bot', async ({ code, difficulty = 'medium' }) => {
    try {
      const room = await Room.findOne({ code });
      if (!room) return;
      if (room.players.length >= 4) return socket.emit('error', { message: 'Room is full' });
      if (room.mode === 'ranked') return socket.emit('error', { message: 'No bots in ranked mode' });

      const takenPositions = room.players.map(p => p.position);
      let position = 0;
      while (takenPositions.includes(position)) position++;

      room.players.push({
        username: `Bot-${difficulty.charAt(0).toUpperCase()}`,
        position,
        isBot: true,
        botDifficulty: difficulty,
        isReady: true,
        isConnected: true,
      });

      await room.save();
      broadcastRoom(io, room);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Remove Bot ────────────────────────────────────────────────────────────
  socket.on('remove-bot', async ({ code, position }) => {
    try {
      const room = await Room.findOne({ code });
      if (!room) return;
      room.players = room.players.filter(p => !(p.isBot && p.position === position));
      await room.save();
      broadcastRoom(io, room);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Chat Message ──────────────────────────────────────────────────────────
  socket.on('chat-message', async ({ code, sender, message, type = 'text' }) => {
    try {
      const room = await Room.findOne({ code });
      if (!room) return;

      const chatEntry = { sender, message, type, timestamp: new Date() };
      room.chatMessages.push(chatEntry);
      if (room.chatMessages.length > 100) room.chatMessages.shift(); // keep last 100
      await room.save();

      io.to(code).emit('chat-message', chatEntry);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Emoji Reaction ────────────────────────────────────────────────────────
  socket.on('emoji-reaction', ({ code, sender, emoji }) => {
    io.to(code).emit('emoji-reaction', { sender, emoji, timestamp: Date.now() });
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    try {
      const { roomCode, userId } = socket.data;
      if (!roomCode || !userId) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      const player = room.players.find(p => p.userId?.toString() === userId);
      if (player) {
        player.isConnected = false;
        player.socketId = null;
      }

      await room.save();
      broadcastRoom(io, room);
    } catch (err) {
      console.error('Disconnect handler error:', err);
    }
  });
};
