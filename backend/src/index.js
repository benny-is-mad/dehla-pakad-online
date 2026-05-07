/**
 * index.js — Dehla Pakad Backend Entry Point
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');

// Socket handlers
const registerRoomHandlers = require('./socket/roomHandler');
const registerGameHandlers = require('./socket/gameHandler');

// ─── Connect DB ───────────────────────────────────────────────────────────────
connectDB();

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

// Allow both local dev and production frontend origins
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
// Keep-alive ping for UptimeRobot (prevents Render free tier sleep)
app.get('/ping', (req, res) => res.send('pong'));

// ─── HTTP + Socket.IO ─────────────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Use polling first then upgrade — required for Render.com proxy
  transports: ['polling', 'websocket'],
  pingInterval: 25000,
  pingTimeout: 20000,
});

// In-memory game state store: roomCode → { state, room }
const activeGames = new Map();

// ─── Socket.IO Middleware (auth) ──────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const User = require('./models/User');

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow guest connections with limited access
      socket.data.userId = null;
      socket.data.username = socket.handshake.auth?.username || 'Guest';
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('Authentication failed'));

    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    socket.data.user = user;

    // Update online status
    await User.findByIdAndUpdate(user._id, { isOnline: true });

    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ─── Socket.IO Connection ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} | User: ${socket.data.username}`);

  // Register handlers
  registerRoomHandlers(io, socket, activeGames);
  registerGameHandlers(io, socket, activeGames);

  socket.on('disconnect', async () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    if (socket.data.userId) {
      await User.findByIdAndUpdate(socket.data.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Dehla Pakad server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
