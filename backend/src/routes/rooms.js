const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

// Generate a 6-char room code
function generateCode() {
  return uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
}

// ─── Create Room ──────────────────────────────────────────────────────────────
router.post('/create', protect, async (req, res) => {
  try {
    const { mode = 'casual', trumpMode = 'dynamic' } = req.body;

    let code;
    let existing;
    do {
      code = generateCode();
      existing = await Room.findOne({ code });
    } while (existing);

    const room = await Room.create({
      code,
      host: req.user._id,
      mode,
      trumpMode,
      players: [
        {
          userId: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar,
          position: 0,
          isReady: false,
          isConnected: true,
        },
      ],
    });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Room ─────────────────────────────────────────────────────────────────
router.get('/:code', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── List Open Rooms (public casual/ranked) ───────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({
      status: 'waiting',
      mode: { $in: ['casual', 'ranked'] },
    })
      .select('-gameState -chatMessages')
      .limit(20)
      .sort({ createdAt: -1 });

    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
