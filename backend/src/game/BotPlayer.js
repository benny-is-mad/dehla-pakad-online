/**
 * BotPlayer.js — AI Decision Engine for Dehla Pakad
 * Three difficulty levels: easy, medium, hard
 */

const { RANK_VALUE, getTeam, getCurrentPlayer } = require('./DehlaEngine');

// ─── Utility ──────────────────────────────────────────────────────────────────

function getLegalCards(hand, leadSuit) {
  if (!leadSuit) return hand; // leading: any card
  const suited = hand.filter(c => c.suit === leadSuit);
  return suited.length > 0 ? suited : hand; // must follow suit
}

function getCardStrength(card, trumpSuit) {
  let value = RANK_VALUE[card.rank];
  if (card.suit === trumpSuit) value += 100; // trump is always stronger
  return value;
}

function hasTen(cards) {
  return cards.some(c => c.rank === '10');
}

// ─── Easy Bot ─────────────────────────────────────────────────────────────────

function easyBot(hand, state, position) {
  const leadSuit = state.currentTrick.leadSuit;
  const legal = getLegalCards(hand, leadSuit);
  // Just play a random legal card
  return legal[Math.floor(Math.random() * legal.length)];
}

// ─── Medium Bot ───────────────────────────────────────────────────────────────

function mediumBot(hand, state, position) {
  const leadSuit = state.currentTrick.leadSuit;
  const trumpSuit = state.trumpSuit;
  const legal = getLegalCards(hand, leadSuit);
  const team = getTeam(position);

  const isLeading = state.currentTrick.cards.length === 0;

  if (isLeading) {
    // Leading: play lowest non-ten card to avoid giving tens away
    const nonTens = legal.filter(c => c.rank !== '10');
    const pool = nonTens.length > 0 ? nonTens : legal;
    return pool.reduce((lowest, c) =>
      getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
    );
  }

  // Following: try to win if partner isn't already winning
  const currentWinner = getTrickCurrentWinner(state);
  const partnerWinning = currentWinner !== null && getTeam(currentWinner) === team;

  if (partnerWinning) {
    // Discard lowest non-ten
    const nonTens = legal.filter(c => c.rank !== '10');
    const pool = nonTens.length > 0 ? nonTens : legal;
    return pool.reduce((lowest, c) =>
      getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
    );
  }

  // Try to beat current winner
  const winnerCard = state.currentTrick.cards.find(p => p.position === currentWinner)?.card;
  if (winnerCard) {
    const beaters = legal.filter(c =>
      getCardStrength(c, trumpSuit) > getCardStrength(winnerCard, trumpSuit)
    );
    if (beaters.length > 0) {
      // Play lowest beater (conserve strong cards)
      return beaters.reduce((lowest, c) =>
        getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
      );
    }
  }

  // Can't win: discard lowest non-ten
  const nonTens = legal.filter(c => c.rank !== '10');
  const pool = nonTens.length > 0 ? nonTens : legal;
  return pool.reduce((lowest, c) =>
    getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
  );
}

// ─── Hard Bot ─────────────────────────────────────────────────────────────────

function hardBot(hand, state, position) {
  const leadSuit = state.currentTrick.leadSuit;
  const trumpSuit = state.trumpSuit;
  const legal = getLegalCards(hand, leadSuit);
  const team = getTeam(position);

  const isLeading = state.currentTrick.cards.length === 0;
  const tricksLeft = 13 - state.tricks.length - 1;
  const centerPileCount = state.centerPileTrickCount;
  const lastWinner = state.lastTrickWinner;
  const iConsecutive = lastWinner === position;

  if (isLeading) {
    // Strategy: if I won last trick, try to win again to collect pile
    if (iConsecutive && centerPileCount >= 2) {
      // Play strongest trump or strongest card to try and win
      const trumpCards = legal.filter(c => c.suit === trumpSuit);
      if (trumpCards.length > 0) {
        return trumpCards.reduce((best, c) =>
          RANK_VALUE[c.rank] > RANK_VALUE[best.rank] ? c : best
        );
      }
      return legal.reduce((best, c) =>
        getCardStrength(c, trumpSuit) > getCardStrength(best, trumpSuit) ? c : best
      );
    }

    // Lead a ten if partner likely to win (bait)
    const tens = legal.filter(c => c.rank === '10' && c.suit !== trumpSuit);
    if (tens.length > 0 && tricksLeft < 4) {
      return tens[0]; // risky but aggressive play
    }

    // Default: lead lowest safe card
    const nonTens = legal.filter(c => c.rank !== '10');
    const pool = nonTens.length > 0 ? nonTens : legal;
    return pool.reduce((lowest, c) =>
      getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
    );
  }

  // Following
  const currentWinner = getTrickCurrentWinner(state);
  const partnerWinning = currentWinner !== null && getTeam(currentWinner) === team;
  const partnerWonLast = lastWinner !== null && getTeam(lastWinner) === team && lastWinner !== position;

  // Determine if trick has a ten
  const trickHasTen = state.currentTrick.cards.some(p => p.card.rank === '10');

  if (partnerWinning) {
    if (trickHasTen || hasTen(legal)) {
      // Throw a ten to partner winning trick
      const tens = legal.filter(c => c.rank === '10');
      if (tens.length > 0) return tens[0];
    }
    // Discard lowest card
    return legal.reduce((lowest, c) =>
      getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
    );
  }

  // Try to win with minimum force
  const winnerCard = state.currentTrick.cards.find(p => p.position === currentWinner)?.card;
  if (winnerCard) {
    const beaters = legal.filter(c =>
      getCardStrength(c, trumpSuit) > getCardStrength(winnerCard, trumpSuit)
    );
    if (beaters.length > 0) {
      // If trick has ten or pile is large, use minimum winning card
      if (trickHasTen || centerPileCount >= 3) {
        return beaters.reduce((lowest, c) =>
          getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
        );
      }
      // Otherwise save resources
      return beaters.reduce((lowest, c) =>
        getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
      );
    }
  }

  // Can't win: discard a ten if we must (minimize loss)
  const nonTens = legal.filter(c => c.rank !== '10');
  const pool = nonTens.length > 0 ? nonTens : legal;
  return pool.reduce((lowest, c) =>
    getCardStrength(c, trumpSuit) < getCardStrength(lowest, trumpSuit) ? c : lowest
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTrickCurrentWinner(state) {
  const cards = state.currentTrick.cards;
  if (cards.length === 0) return null;

  const trumpSuit = state.trumpSuit;
  const leadSuit = state.currentTrick.leadSuit;

  let winner = cards[0];
  for (const played of cards.slice(1)) {
    const c = played.card;
    const w = winner.card;
    const cIsTrump = trumpSuit && c.suit === trumpSuit;
    const wIsTrump = trumpSuit && w.suit === trumpSuit;

    if (cIsTrump && !wIsTrump) {
      winner = played;
    } else if (cIsTrump && wIsTrump) {
      if (RANK_VALUE[c.rank] > RANK_VALUE[w.rank]) winner = played;
    } else if (!cIsTrump && !wIsTrump) {
      if (c.suit === leadSuit && w.suit !== leadSuit) winner = played;
      else if (c.suit === leadSuit && w.suit === leadSuit && RANK_VALUE[c.rank] > RANK_VALUE[w.rank]) winner = played;
    }
  }
  return winner.position;
}

// ─── Trump Declaration (Manual Mode) ─────────────────────────────────────────

function botDeclareTrump(hand, difficulty) {
  // Count suits
  const suitCounts = {};
  for (const card of hand) {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }

  if (difficulty === 'easy') {
    // Random suit from hand
    const suits = Object.keys(suitCounts);
    return suits[Math.floor(Math.random() * suits.length)];
  }

  // Medium/Hard: pick suit with most cards (best trump holding)
  return Object.entries(suitCounts).reduce((best, [suit, count]) =>
    count > best[1] ? [suit, count] : best
  , ['', 0])[0];
}

// ─── Main Entry ───────────────────────────────────────────────────────────────

/**
 * Returns the card the bot will play.
 * @param {object} state - full game state (server-side, hands visible)
 * @param {number} position - bot's position
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 */
function getBotMove(state, position, difficulty) {
  const hand = state.hands[position];
  switch (difficulty) {
    case 'easy': return easyBot(hand, state, position);
    case 'medium': return mediumBot(hand, state, position);
    case 'hard': return hardBot(hand, state, position);
    default: return easyBot(hand, state, position);
  }
}

module.exports = { getBotMove, botDeclareTrump };
