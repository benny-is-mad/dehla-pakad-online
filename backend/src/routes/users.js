const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// ─── Get User Profile ─────────────────────────────────────────────────────────
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update Profile ───────────────────────────────────────────────────────────
router.patch('/me', protect, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────
router.get('/leaderboard/top', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ elo: -1 })
      .limit(50)
      .select('username avatar elo stats');
    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
