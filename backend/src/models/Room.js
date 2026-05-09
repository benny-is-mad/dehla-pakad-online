const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    players: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        avatar: String,
        position: { type: Number, min: 0, max: 3 }, // 0=South, 1=West, 2=North, 3=East
        socketId: String,
        isBot: { type: Boolean, default: false },
        botDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: null },
        isReady: { type: Boolean, default: false },
        isConnected: { type: Boolean, default: true },
      },
    ],
    mode: {
      type: String,
      enum: ['casual', 'ranked', 'private'],
      default: 'casual',
    },
    trumpMode: {
      type: String,
      enum: ['dynamic', 'manual'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished'],
      default: 'waiting',
    },
    // Embedded game state (synced with in-memory engine)
    gameState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    maxPlayers: {
      type: Number,
      default: 4,
    },
    chatMessages: [
      {
        sender: String,
        message: String,
        type: { type: String, enum: ['text', 'emoji', 'system'], default: 'text' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
