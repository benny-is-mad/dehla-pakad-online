/**
 * DehlaEngine.js — Core Game Logic for Dehla Pakad
 *
 * Pure logic module — no I/O, no DB, no socket.
 * All state is a plain JS object that can be serialized to JSON.
 *
 * Positions: 0=South(bottom), 1=West(left), 2=North(top), 3=East(right)
 * Teams:     Team 0 = positions 0 + 2 | Team 1 = positions 1 + 3
 * Direction: Anti-clockwise (0→3→2→1→0)
 */

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
// Rank value for comparison (higher = stronger)
const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

// Anti-clockwise order from a given position
const ANTI_CLOCKWISE = [0, 3, 2, 1];

function acwNext(pos) {
  const idx = ANTI_CLOCKWISE.indexOf(pos);
  return ANTI_CLOCKWISE[(idx + 1) % 4];
}

function getTeam(position) {
  return position % 2; // 0 and 2 → team 0 | 1 and 3 → team 1
}

// ─── Deck ────────────────────────────────────────────────────────────────────

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardKey(card) {
  return `${card.rank}_${card.suit}`;
}

function isTen(card) {
  return card.rank === '10';
}

// ─── State Factory ────────────────────────────────────────────────────────────

function createHandState(dealer, trumpMode, collectionMode = 'pakad', prevState = null) {
  const deck = shuffleDeck(createDeck());

  // Deal 5 cards anti-clockwise starting from player to RIGHT of dealer
  // Right of dealer in anti-clockwise = acwNext(dealer)
  const firstPlayer = acwNext(dealer);
  const hands = { 0: [], 1: [], 2: [], 3: [] };

  // Deal 5 cards each (anti-clockwise)
  let dealPos = firstPlayer;
  for (let card = 0; card < 5; card++) {
    for (let p = 0; p < 4; p++) {
      hands[dealPos].push(deck.shift());
      dealPos = acwNext(dealPos);
    }
  }

  return {
    phase: trumpMode === 'manual' ? 'trump_selection' : 'playing_phase1',
    // phase values:
    //   'trump_selection'  — manual mode: right-of-dealer picks trump
    //   'playing_phase1'   — first 5 tricks (dynamic: trump not set yet)
    //   'playing_phase2'   — remaining 8 tricks (after trump determined & more cards dealt)
    //   'hand_complete'    — hand finished, calculate scores

    trumpMode,
    collectionMode,
    trumpSuit: null, // set when determined
    trumpDeclaredByPosition: null,

    dealer,
    firstPlayer, // who plays first (right of dealer)
    currentTrick: {
      number: 0,         // 0-indexed, up to 12
      leadPosition: firstPlayer,
      leadSuit: null,
      cards: [],         // [{position, card}] in play order
    },
    trickReadyToClear: false, // Flag for delayed trick clearing

    hands,               // cards in each player's hand (server only)
    remainingDeck: deck, // cards not yet dealt (deal 8 more per player after trump)

    centerPile: [],      // all un-collected trick cards (face down)
    centerPileTrickCount: 0, // number of tricks in center pile

    lastTrickWinner: null,    // position of last trick winner
    consecutiveWinner: null,  // position that won consecutive tricks (for pile collect)
    consecutiveTrickCount: 0, // how many consecutive tricks this person has won

    teamPiles: { 0: [], 1: [] }, // collected cards by team

    tricks: [],   // completed trick records [{number, winner, cards, leadSuit}]
    phase1Tricks: [], // first 5 tricks (for dynamic trump resolution)

    // Kot tracking carried over
    consecutiveHandWins: prevState
      ? prevState.consecutiveHandWins
      : { 0: 0, 1: 0 },
    totalKots: prevState
      ? { ...prevState.totalKots }
      : { 0: 0, 1: 0 },

    handNumber: prevState ? prevState.handNumber + 1 : 1,
    
    // Track who called trump for each team to alternate
    lastCallerByTeam: prevState 
      ? { ...prevState.lastCallerByTeam } 
      : { 0: null, 1: null },
    lastHandWinner: prevState ? prevState.handWinner : null,

    // Per-hand scores
    tensWon: { 0: [], 1: [] }, // ten cards collected per team
    kotsThisHand: { 0: 0, 1: 0 },

    winner: null, // null | 0 | 1  (game winner team)
  };
}

// ─── Dealing Phase 2 ──────────────────────────────────────────────────────────

/**
 * Deal remaining 8 cards to each player after trump is established.
 * Mutates state in place.
 */
function dealRemainingCards(state) {
  const firstPlayer = state.firstPlayer;
  let dealPos = firstPlayer;
  for (let card = 0; card < 8; card++) {
    for (let p = 0; p < 4; p++) {
      if (state.remainingDeck.length > 0) {
        state.hands[dealPos].push(state.remainingDeck.shift());
      }
      dealPos = acwNext(dealPos);
    }
  }
}

// ─── Trump Selection (Manual Mode) ───────────────────────────────────────────

/**
 * Player right of dealer declares trump suit.
 * In manual mode, the trump maker also leads the first trick.
 */
function declareTrump(state, position, suit) {
  if (state.phase !== 'trump_selection') {
    return { error: 'Not in trump selection phase' };
  }
  const expected = acwNext(state.dealer); // right of dealer
  if (position !== expected) {
    return { error: 'Only the player right of dealer can declare trump' };
  }
  if (!SUITS.includes(suit)) {
    return { error: 'Invalid suit' };
  }

  state.trumpSuit = suit;
  state.trumpDeclaredByPosition = position;
  const team = getTeam(position);
  state.lastCallerByTeam[team] = position; // Track caller
  
  state.phase = 'playing_phase2';
  state.currentTrick.leadPosition = position; // trump maker leads
  dealRemainingCards(state);

  return { success: true };
}

// ─── Card Validation ──────────────────────────────────────────────────────────

/**
 * Returns whether a player can legally play a card.
 */
function isLegalPlay(state, position, card) {
  if (state.currentTrick.leadPosition !== position &&
      state.currentTrick.cards.length !== (position - state.currentTrick.leadPosition + 4) % 4) {
    // Not their turn
  }

  const hand = state.hands[position];
  const cardInHand = hand.some(c => c.suit === card.suit && c.rank === card.rank);
  if (!cardInHand) return { legal: false, reason: 'Card not in hand' };

  const leadSuit = state.currentTrick.leadSuit;
  if (!leadSuit) return { legal: true }; // leading the trick

  const hasSuit = hand.some(c => c.suit === leadSuit);
  if (hasSuit && card.suit !== leadSuit) {
    return { legal: false, reason: `Must follow suit: ${leadSuit}` };
  }

  return { legal: true };
}

/**
 * Returns whose turn it is.
 */
function getCurrentPlayer(state) {
  const trick = state.currentTrick;
  const cardsPlayed = trick.cards.length;
  if (cardsPlayed === 0) return trick.leadPosition;
  // Anti-clockwise from lead
  let pos = trick.leadPosition;
  for (let i = 0; i < cardsPlayed; i++) {
    pos = acwNext(pos);
  }
  return pos;
}

// ─── Playing a Card ───────────────────────────────────────────────────────────

/**
 * Main action: player plays a card.
 * Returns updated state and events (trump_set, trick_complete, pile_collected, hand_complete)
 */
function playCard(state, position, card) {
  // Validate turn
  const expected = getCurrentPlayer(state);
  if (position !== expected) {
    return { error: `Not your turn. Expected position ${expected}`, state };
  }

  // Validate legal play
  const legality = isLegalPlay(state, position, card);
  if (!legality.legal) {
    return { error: legality.reason, state };
  }

  // Remove card from hand
  const hand = state.hands[position];
  const cardIdx = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
  hand.splice(cardIdx, 1);

  // Set lead suit on first card of trick
  if (state.currentTrick.cards.length === 0) {
    state.currentTrick.leadSuit = card.suit;
  }

  // Add to trick
  state.currentTrick.cards.push({ position, card });

  const events = [];

  // Dynamic trump: if player can't follow suit and plays a different suit → trump established
  if (
    state.phase === 'playing_phase1' &&
    state.trumpSuit === null &&
    state.currentTrick.leadSuit &&
    card.suit !== state.currentTrick.leadSuit
  ) {
    state.trumpSuit = card.suit;
    state.trumpDeclaredByPosition = position;
    events.push({ type: 'trump_set', suit: card.suit, byPosition: position });
  }

  // Check if trick is complete (all 4 played)
  if (state.currentTrick.cards.length === 4) {
    const trickResult = resolveTrick(state);
    events.push({ type: 'trick_complete', ...trickResult });

    const pileEvent = updateCenterPile(state, trickResult.winner);
    if (pileEvent) events.push(pileEvent);

    // Flag that trick is ready to clear, actual clearing is delayed
    state.trickReadyToClear = true;
    state.lastTrickResult = trickResult;
  }

  return { success: true, state, events };
}

// ─── Trick Clearing (Delayed) ──────────────────────────────────────────────────

/**
 * Called by handler after a delay to clear the table and start next trick/hand.
 */
function clearTrick(state) {
  if (!state.trickReadyToClear) return { events: [] };
  state.trickReadyToClear = false;

  const events = [];
  const trickResult = state.lastTrickResult;

  // After phase 1 (5 tricks), deal remaining cards
  if (state.phase === 'playing_phase1' && state.tricks.length === 5) {
    if (state.trumpSuit === null) {
      const allPhase1Cards = state.phase1Tricks.flatMap(t => t.cards.map(c => c.card));
      const randomCard = allPhase1Cards[Math.floor(Math.random() * allPhase1Cards.length)];
      state.trumpSuit = randomCard.suit;
      const team = getTeam(trickResult.winner);
      state.lastCallerByTeam[team] = trickResult.winner;
      events.push({ type: 'trump_set_random', suit: state.trumpSuit });
    }
    state.phase = 'playing_phase2';
    dealRemainingCards(state);
    events.push({ type: 'phase2_started', remainingCards: 8 });
  }

  // Check hand complete (13 tricks)
  if (state.tricks.length === 13) {
    if (state.centerPile.length > 0) {
      const lastWinner = trickResult.winner;
      const team = getTeam(lastWinner);
      
      const tens = state.centerPile.filter(isTen);
      tens.forEach(ten => {
        if (!state.tensWon[team].some(t => t.suit === ten.suit)) {
          state.tensWon[team].push(ten);
        }
      });
      
      state.teamPiles[team].push(...state.centerPile);
      state.centerPile = [];
      state.centerPileTrickCount = 0;
      events.push({ type: 'last_trick_collect', team, winner: lastWinner, tens });
    }

    const handResult = resolveHand(state);
    events.push({ type: 'hand_complete', ...handResult });
    state.phase = 'hand_complete';
  } else {
    state.currentTrick = {
      number: state.currentTrick.number + 1,
      leadPosition: trickResult.winner,
      leadSuit: null,
      cards: [],
    };
  }

  return { events };
}

// ─── Trick Resolution ─────────────────────────────────────────────────────────

function resolveTrick(state) {
  const trick = state.currentTrick;
  const trumpSuit = state.trumpSuit;
  const leadSuit = trick.leadSuit;

  let winner = trick.cards[0]; // start with lead card

  for (const played of trick.cards.slice(1)) {
    const { card } = played;
    const { card: winCard } = winner;

    const cardIsTrump = trumpSuit && card.suit === trumpSuit;
    const winnerIsTrump = trumpSuit && winCard.suit === trumpSuit;

    if (cardIsTrump && !winnerIsTrump) {
      // Trump beats non-trump
      winner = played;
    } else if (cardIsTrump && winnerIsTrump) {
      // Both trump: higher rank wins
      if (RANK_VALUE[card.rank] > RANK_VALUE[winCard.rank]) winner = played;
    } else if (!cardIsTrump && !winnerIsTrump) {
      // Both non-trump
      if (card.suit === leadSuit && winCard.suit !== leadSuit) {
        // Lead suit beats off-suit
        winner = played;
      } else if (card.suit === leadSuit && winCard.suit === leadSuit) {
        // Both lead suit: higher rank wins
        if (RANK_VALUE[card.rank] > RANK_VALUE[winCard.rank]) winner = played;
      }
      // Off-suit vs off-suit (neither trump nor lead): no change
    }
  }

  const trickRecord = {
    number: trick.number,
    leadSuit,
    cards: [...trick.cards],
    winner: winner.position,
  };

  // Check for tens in this trick
  const tens = trick.cards.filter(c => isTen(c.card));

  state.tricks.push(trickRecord);
  if (state.tricks.length <= 5) state.phase1Tricks.push(trickRecord);

  return {
    winner: winner.position,
    winnerTeam: getTeam(winner.position),
    trickNumber: trick.number,
    cards: trick.cards,
    tens,
  };
}

// ─── Center Pile Mechanic ─────────────────────────────────────────────────────

/**
 * The CRITICAL Dehla Pakad rule:
 * - Tricks go face-down to center pile
 * - ONLY if the SAME INDIVIDUAL player wins two consecutive tricks do they collect the pile
 * - Partner winning does NOT trigger collection
 */
function updateCenterPile(state, winnerPosition) {
  // Add this trick's cards to center pile
  const trickCards = state.currentTrick.cards.map(c => c.card);
  state.centerPile.push(...trickCards);
  state.centerPileTrickCount++;

  let event = null;

  const isInstant = state.collectionMode === 'instant';
  const isTeamConsecutive = !isInstant && state.lastTrickWinner !== null && getTeam(state.lastTrickWinner) === getTeam(winnerPosition);

  if (isInstant || isTeamConsecutive) {
    // Instant mode: winner collects immediately.
    // Pakad mode: Team won consecutively → collect!
    const team = getTeam(winnerPosition);
    const collected = [...state.centerPile];

    // Check for tens in collected pile
    const tens = collected.filter(isTen);
    tens.forEach(ten => {
      if (!state.tensWon[team].some(t => t.suit === ten.suit)) {
        state.tensWon[team].push(ten);
      }
    });

    state.teamPiles[team].push(...collected);
    state.centerPile = [];
    state.centerPileTrickCount = 0;
    state.consecutiveTrickCount = (state.consecutiveTrickCount || 0) + 1;

    event = {
      type: 'pile_collected',
      byPosition: winnerPosition,
      team,
      cardCount: collected.length,
      tens,
    };
  }

  state.lastTrickWinner = winnerPosition;
  state.consecutiveWinner = winnerPosition;

  return event;
}

// ─── Hand Resolution ──────────────────────────────────────────────────────────

function resolveHand(state) {
  // Count tens per team
  const team0Tens = state.tensWon[0].length;
  const team1Tens = state.tensWon[1].length;

  // Collect any remaining center pile to the winner of 13th trick (already done above)

  // Determine hand winner
  let handWinner = null;
  let reason = '';

  if (team0Tens === 4) {
    handWinner = 0;
    reason = 'all_four_tens';
  } else if (team1Tens === 4) {
    handWinner = 1;
    reason = 'all_four_tens';
  } else if (team0Tens > team1Tens) {
    handWinner = 0;
    reason = 'more_tens';
  } else if (team1Tens > team0Tens) {
    handWinner = 1;
    reason = 'more_tens';
  } else {
    // Tie in tens (2-2)
    if (state.collectionMode === 'instant') {
      // Instant mode tie breaker: Previous hand winner wins. If first hand, dealer's team loses.
      if (state.lastHandWinner !== null) {
        handWinner = state.lastHandWinner;
        reason = 'tens_tie_previous_winner_wins';
      } else {
        handWinner = getTeam(state.dealer) === 0 ? 1 : 0;
        reason = 'tens_tie_dealer_loses';
      }
    } else {
      // Pakad mode tie breaker: Dealer's team loses
      handWinner = getTeam(state.dealer) === 0 ? 1 : 0;
      reason = 'tens_tie_dealer_loses';
    }
  }

  // Kot check: all 4 tens → 1 Kot immediately
  if (reason === 'all_four_tens') {
    state.kotsThisHand[handWinner]++;
    state.totalKots[handWinner]++;
  }

  // Update consecutive hand wins
  if (state.consecutiveHandWins[handWinner] === undefined) {
    state.consecutiveHandWins = { 0: 0, 1: 0 };
  }

  const loser = handWinner === 0 ? 1 : 0;
  state.consecutiveHandWins[handWinner]++;
  state.consecutiveHandWins[loser] = 0;

  // 7 consecutive hands → 1 Kot
  if (state.consecutiveHandWins[handWinner] >= 7) {
    state.kotsThisHand[handWinner]++;
    state.totalKots[handWinner]++;
    state.consecutiveHandWins[handWinner] = 0; // reset after Kot
  }

  state.handWinner = handWinner;

  // Check game winner (first to 3 Kots, or customizable)
  const KOT_WIN_THRESHOLD = 3;
  if (state.totalKots[handWinner] >= KOT_WIN_THRESHOLD) {
    state.winner = handWinner;
  }

  return {
    handWinner,
    reason,
    team0Tens,
    team1Tens,
    kotsThisHand: state.kotsThisHand,
    totalKots: state.totalKots,
    gameWinner: state.winner,
  };
}

// ─── Get Public State (hides opponents' hands) ────────────────────────────────

/**
 * Returns game state safe for a specific player (hides other hands).
 */
function getPublicState(state, forPosition) {
  const pub = { ...state };
  const sanitizedHands = {};

  for (let pos = 0; pos <= 3; pos++) {
    if (pos === forPosition) {
      sanitizedHands[pos] = state.hands[pos]; // own cards visible
    } else {
      sanitizedHands[pos] = state.hands[pos].map(() => ({ hidden: true })); // count only
    }
  }

  pub.hands = sanitizedHands;
  pub.remainingDeck = state.remainingDeck.map(() => ({ hidden: true }));
  return pub;
}

// ─── Dealer Rotation ──────────────────────────────────────────────────────────

/**
 * Returns next dealer and caller based on winning team.
 * The winning team alternates their caller. The opposing team's person to the right of caller becomes dealer.
 */
function nextDealerAndCaller(state) {
  const winningTeam = state.handWinner;
  if (winningTeam === null) return { dealer: acwNext(state.dealer) };

  // Determine who called last for the winning team
  const lastCaller = state.lastCallerByTeam[winningTeam];
  let nextCaller;
  if (lastCaller === null || lastCaller === undefined) {
    nextCaller = winningTeam === 0 ? 0 : 1;
  } else {
    // Alternate partner
    nextCaller = (lastCaller + 2) % 4;
  }

  // Caller is right of dealer -> dealer is (caller + 1) % 4 (clockwise next)
  const nextDealerPos = (nextCaller + 1) % 4;
  return { dealer: nextDealerPos, caller: nextCaller };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createHandState,
  declareTrump,
  playCard,
  clearTrick,
  getCurrentPlayer,
  isLegalPlay,
  getPublicState,
  nextDealerAndCaller,
  getTeam,
  acwNext,
  SUITS,
  RANKS,
  RANK_VALUE,
  cardKey,
};
