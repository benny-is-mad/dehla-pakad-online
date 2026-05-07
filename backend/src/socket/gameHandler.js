/**
 * gameHandler.js — Socket.IO Game Events
 *
 * Manages active game sessions in memory (activeGames map).
 * All game logic delegated to DehlaEngine.
 * Bot moves are scheduled with setTimeout after each human play.
 */

const {
  createHandState,
  declareTrump,
  playCard,
  getCurrentPlayer,
  getPublicState,
  nextDealer,
  getTeam,
} = require('../game/DehlaEngine');
const { getBotMove, botDeclareTrump } = require('../game/BotPlayer');
const Room = require('../models/Room');
const Match = require('../models/Match');
const User = require('../models/User');

// ELO calculation
function calculateElo(winnerElo, loserElo, kFactor = 32) {
  const expectedWin = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const winnerChange = Math.round(kFactor * (1 - expectedWin));
  const loserChange = Math.round(kFactor * (0 - (1 - expectedWin)));
  return { winnerChange, loserChange };
}

// Broadcast game state to all players (each sees own hand only)
function broadcastGameState(io, code, state, room) {
  for (const player of room.players) {
    if (player.isBot || !player.socketId) continue;
    const publicState = getPublicState(state, player.position);
    io.to(player.socketId).emit('game-state', { state: publicState });
  }
}

// Schedule bot moves with delay for realism
async function scheduleBotMove(io, code, activeGames, delay = 1200) {
  const game = activeGames.get(code);
  if (!game) return;

  const { state, room } = game;
  const currentPos = getCurrentPlayer(state);
  const currentPlayer = room.players.find(p => p.position === currentPos);

  if (!currentPlayer?.isBot) return;

  setTimeout(async () => {
    const game = activeGames.get(code);
    if (!game) return;
    const { state, room } = game;

    // Trump declaration (manual mode)
    if (state.phase === 'trump_selection') {
      const botPos = acwNext(state.dealer);
      const botPlayer = room.players.find(p => p.position === botPos && p.isBot);
      if (botPlayer) {
        const suit = botDeclareTrump(state.hands[botPos], botPlayer.botDifficulty);
        declareTrump(state, botPos, suit);
        io.to(code).emit('trump-declared', { suit, byPosition: botPos });
        broadcastGameState(io, code, state, room);
        scheduleBotMove(io, code, activeGames);
      }
      return;
    }

    const card = getBotMove(state, currentPos, currentPlayer.botDifficulty);
    const result = playCard(state, currentPos, card);

    if (result.error) {
      console.error(`Bot error at pos ${currentPos}:`, result.error);
      return;
    }

    activeGames.set(code, { state: result.state, room });

    // Emit events
    io.to(code).emit('card-played', {
      position: currentPos,
      card,
      events: result.events,
    });

    broadcastGameState(io, code, result.state, room);

    // Handle hand complete
    const handCompleteEvent = result.events.find(e => e.type === 'hand_complete');
    if (handCompleteEvent) {
      await handleHandComplete(io, code, activeGames, handCompleteEvent);
      return;
    }

    // Next bot move if needed
    scheduleBotMove(io, code, activeGames);
  }, delay);
}

// After a hand completes
async function handleHandComplete(io, code, activeGames, handResult) {
  const game = activeGames.get(code);
  if (!game) return;
  const { state, room } = game;

  io.to(code).emit('hand-complete', handResult);

  if (handResult.gameWinner !== null) {
    // Game over
    await finalizeGame(io, code, activeGames, handResult.gameWinner);
    return;
  }

  // Start next hand after delay
  setTimeout(async () => {
    const game = activeGames.get(code);
    if (!game) return;
    const { state: s, room: r } = game;

    const newDealer = nextDealer(s);
    const newState = createHandState(newDealer, s.trumpMode, s);
    activeGames.set(code, { state: newState, room: r });

    io.to(code).emit('new-hand', { dealer: newDealer, handNumber: newState.handNumber });
    broadcastGameState(io, code, newState, r);

    if (newState.phase === 'trump_selection') {
      const trumpPos = require('../game/DehlaEngine').acwNext(newDealer);
      const player = r.players.find(p => p.position === trumpPos);
      if (player?.isBot) {
        scheduleBotMove(io, code, activeGames);
      } else if (player) {
        io.to(player.socketId).emit('select-trump', { position: trumpPos });
      }
    } else {
      scheduleBotMove(io, code, activeGames);
    }
  }, 4000);
}

// Finalize game: save to DB, update ELO
async function finalizeGame(io, code, activeGames, winnerTeam) {
  const game = activeGames.get(code);
  if (!game) return;
  const { state, room } = game;

  // Update ELO for ranked games
  if (room.mode === 'ranked') {
    const winners = room.players.filter(p => !p.isBot && getTeam(p.position) === winnerTeam);
    const losers = room.players.filter(p => !p.isBot && getTeam(p.position) !== winnerTeam);

    for (const winner of winners) {
      for (const loser of losers) {
        const wUser = await User.findById(winner.userId);
        const lUser = await User.findById(loser.userId);
        if (!wUser || !lUser) continue;

        const { winnerChange, loserChange } = calculateElo(wUser.elo, lUser.elo);
        await User.findByIdAndUpdate(winner.userId, {
          $inc: { elo: winnerChange, 'stats.gamesWon': 1, 'stats.gamesPlayed': 1 },
        });
        await User.findByIdAndUpdate(loser.userId, {
          $inc: { elo: loserChange, 'stats.gamesLost': 1, 'stats.gamesPlayed': 1 },
        });
      }
    }
  }

  // Save match record
  try {
    await Match.create({
      roomCode: code,
      mode: room.mode,
      trumpMode: room.trumpMode,
      players: room.players.filter(p => !p.isBot).map(p => ({
        userId: p.userId,
        username: p.username,
        position: p.position,
        team: getTeam(p.position),
      })),
      winner: winnerTeam,
      startedAt: state.startedAt,
      finishedAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to save match:', err);
  }

  io.to(code).emit('game-over', {
    winnerTeam,
    totalKots: state.totalKots,
    tensWon: state.tensWon,
  });

  // Update room status
  await Room.findOneAndUpdate({ code }, { status: 'finished' });
  activeGames.delete(code);
}

// Helper (re-use from DehlaEngine without requiring again)
const { acwNext } = require('../game/DehlaEngine');

module.exports = function registerGameHandlers(io, socket, activeGames) {
  // ─── Start Game ───────────────────────────────────────────────────────────
  socket.on('start-game', async ({ code }) => {
    try {
      const room = await Room.findOne({ code });
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (room.players.length < 4) return socket.emit('error', { message: 'Need 4 players to start' });
      if (room.status !== 'waiting') return socket.emit('error', { message: 'Game already started' });

      // Check if requestor is host
      const requestorId = socket.data.userId;
      if (room.host.toString() !== requestorId) {
        return socket.emit('error', { message: 'Only host can start the game' });
      }

      // Initial dealer: position 0 (can randomize)
      const dealer = Math.floor(Math.random() * 4);
      const state = createHandState(dealer, room.trumpMode);
      state.startedAt = new Date();

      room.status = 'playing';
      await room.save();

      activeGames.set(code, { state, room: room.toObject() });

      io.to(code).emit('game-started', { dealer, trumpMode: room.trumpMode });
      broadcastGameState(io, code, state, room);

      // If manual trump, prompt trump selector
      if (room.trumpMode === 'manual') {
        const trumpPos = acwNext(dealer);
        const player = room.players.find(p => p.position === trumpPos);
        if (player?.isBot) {
          scheduleBotMove(io, code, activeGames, 1000);
        } else if (player?.socketId) {
          io.to(player.socketId).emit('select-trump', { position: trumpPos });
        }
      } else {
        // Dynamic: start playing; trigger bots if needed
        scheduleBotMove(io, code, activeGames);
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Play Card ────────────────────────────────────────────────────────────
  socket.on('play-card', async ({ code, card }) => {
    try {
      const game = activeGames.get(code);
      if (!game) return socket.emit('error', { message: 'Game not found' });

      const { state, room } = game;
      const position = socket.data.position;

      if (position === undefined || position === null) {
        return socket.emit('error', { message: 'Player position not set' });
      }

      const result = playCard(state, position, card);
      if (result.error) return socket.emit('error', { message: result.error });

      activeGames.set(code, { state: result.state, room });

      io.to(code).emit('card-played', {
        position,
        card,
        events: result.events,
      });

      broadcastGameState(io, code, result.state, room);

      const handCompleteEvent = result.events.find(e => e.type === 'hand_complete');
      if (handCompleteEvent) {
        await handleHandComplete(io, code, activeGames, handCompleteEvent);
        return;
      }

      scheduleBotMove(io, code, activeGames);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Declare Trump (Manual Mode) ──────────────────────────────────────────
  socket.on('declare-trump', async ({ code, suit }) => {
    try {
      const game = activeGames.get(code);
      if (!game) return socket.emit('error', { message: 'Game not found' });

      const { state, room } = game;
      const position = socket.data.position;

      const result = declareTrump(state, position, suit);
      if (result.error) return socket.emit('error', { message: result.error });

      activeGames.set(code, { state, room });

      io.to(code).emit('trump-declared', { suit, byPosition: position });
      broadcastGameState(io, code, state, room);

      scheduleBotMove(io, code, activeGames);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── Request Game State (reconnect) ──────────────────────────────────────
  socket.on('request-game-state', ({ code }) => {
    const game = activeGames.get(code);
    if (!game) return socket.emit('error', { message: 'Game not found' });

    const position = socket.data.position;
    const publicState = getPublicState(game.state, position);
    socket.emit('game-state', { state: publicState });
  });
};
