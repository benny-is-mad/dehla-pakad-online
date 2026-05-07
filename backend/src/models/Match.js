const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true },
    mode: { type: String, enum: ['casual', 'ranked', 'private'] },
    trumpMode: { type: String, enum: ['dynamic', 'manual'] },
    players: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        position: Number,
        team: { type: Number, enum: [0, 1] }, // Team 0: positions 0+2, Team 1: positions 1+3
        eloBefore: Number,
        eloAfter: Number,
        eloChange: Number,
      },
    ],
    teams: [
      {
        teamIndex: Number,
        tensCollected: [Number], // card values of 10s collected
        kotsWon: Number,
        handsWon: Number,
        score: Number,
      },
    ],
    winner: { type: Number, enum: [0, 1, null], default: null }, // winning team index
    hands: [
      {
        handNumber: Number,
        trumpSuit: String,
        tricks: [
          {
            trickNumber: Number,
            leadSuit: String,
            cards: [
              {
                playerId: mongoose.Schema.Types.ObjectId,
                position: Number,
                card: { suit: String, rank: String },
              },
            ],
            winner: Number, // position of trick winner
          },
        ],
        teamScores: [Number],
        tensWon: [[Number]], // tens won per team this hand
      },
    ],
    duration: Number, // seconds
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', matchSchema);
