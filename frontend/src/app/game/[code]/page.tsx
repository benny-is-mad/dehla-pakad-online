'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import Hand from '@/components/Hand';
import PlayerSeat from '@/components/PlayerSeat';
import TrumpBadge from '@/components/TrumpBadge';
import ScoreBoard from '@/components/ScoreBoard';
import ChatBox from '@/components/ChatBox';
import GameOverModal from '@/components/GameOverModal';
import TrumpSelect from '@/components/TrumpSelect';
import Card from '@/components/Card';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CardData { suit: string; rank: string; hidden?: boolean; }
interface TrickEntry { position: number; card: CardData; }
interface ChatMessage { sender: string; message: string; type: 'text' | 'emoji' | 'system'; timestamp: string | Date; }
interface Player { userId?: string; username: string; avatar?: string | null; position: number; isBot?: boolean; isConnected?: boolean; socketId?: string; }

interface GameState {
  phase: string;
  trumpMode: string;
  trumpSuit: string | null;
  dealer: number;
  firstPlayer: number;
  currentTrick: {
    number: number;
    leadPosition: number;
    leadSuit: string | null;
    cards: TrickEntry[];
  };
  hands: Record<string, CardData[]>;
  tensWon: { 0: CardData[]; 1: CardData[] };
  totalKots: { 0: number; 1: number };
  consecutiveHandWins?: { 0: number; 1: number };
  handNumber: number;
  centerPileTrickCount: number;
}

// Anti-clockwise: 0→3→2→1→0
function acwNext(pos: number) {
  return [0, 3, 2, 1, 0, 3, 2, 1][pos + 1]; // simplified
}

function getCurrentPlayer(state: GameState): number {
  const trick = state.currentTrick;
  const played = trick.cards.length;
  if (played === 0) return trick.leadPosition;
  let pos = trick.leadPosition;
  const ACW = [0, 3, 2, 1];
  for (let i = 0; i < played; i++) {
    const idx = ACW.indexOf(pos);
    pos = ACW[(idx + 1) % 4];
  }
  return pos;
}

const SUIT_SYMBOLS: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const POSITION_LABELS: Record<number, string> = { 0: 'South', 1: 'West', 2: 'North', 3: 'East' };

// ─── Component ───────────────────────────────────────────────────────────────
export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPosition, setMyPosition] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [toast, setToast] = useState('');
  const [gameOver, setGameOver] = useState<{ winnerTeam: number; totalKots: { 0: number; 1: number } } | null>(null);
  const [selectTrump, setSelectTrump] = useState(false);
  const [handComplete, setHandComplete] = useState<string | null>(null);
  const [emojiReaction, setEmojiReaction] = useState<{ sender: string; emoji: string } | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const joined = useRef(false);

  const showToast = (msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(''), duration);
  };

  // ─── Socket Setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user || joined.current) return;
    joined.current = true;

    // Rejoin room socket room
    socket.emit('join-room', {
      code: code.toUpperCase(),
      user: { id: user._id, username: user.username, avatar: user.avatar },
    });

    socket.on('room-joined', ({ room }: { room: { players: Player[] } }) => {
      setPlayers(room.players);
      const me = room.players.find((p) => p.userId === user._id);
      if (me) setMyPosition(me.position);
      // Request current game state
      socket.emit('request-game-state', { code: code.toUpperCase() });
    });

    socket.on('room-updated', ({ room }: { room: { players: Player[] } }) => {
      setPlayers(room.players);
    });

    socket.on('game-state', ({ state }: { state: GameState }) => {
      setGameState(state);
    });

    socket.on('game-started', () => {
      socket.emit('request-game-state', { code: code.toUpperCase() });
      setChatMessages((m) => [
        ...m,
        { sender: 'System', message: '🃏 The game has started!', type: 'system', timestamp: new Date() },
      ]);
    });

    socket.on('card-played', ({ position, card, events }: { position: number; card: CardData; events: { type: string; suit?: string; byPosition?: number; team?: number; tens?: CardData[] }[] }) => {
      const playerName = players.find((p) => p.position === position)?.username || `P${position}`;
      // Handle events
      for (const ev of events) {
        if (ev.type === 'trump_set' || ev.type === 'trump_set_random') {
          showToast(`🎴 Trump set: ${ev.suit} ${SUIT_SYMBOLS[ev.suit || '']}`, 4000);
          setChatMessages((m) => [
            ...m,
            { sender: 'System', message: `Trump is now ${ev.suit}!`, type: 'system', timestamp: new Date() },
          ]);
        }
        if (ev.type === 'pile_collected') {
          const team = ev.team === 0 ? 'A' : 'B';
          const tens = ev.tens?.map((t) => `10${SUIT_SYMBOLS[t.suit]}`).join(' ');
          const msg = tens
            ? `🃏 Team ${team} collected the pile! Got: ${tens}`
            : `🃏 Team ${team} collected the pile!`;
          showToast(msg, 3500);
        }
        if (ev.type === 'phase2_started') {
          showToast('🂠 Phase 2 begins — 8 more cards dealt!', 3500);
        }
      }
    });

    socket.on('trump-declared', ({ suit, byPosition }: { suit: string; byPosition: number }) => {
      const pName = players.find((p) => p.position === byPosition)?.username || `P${byPosition}`;
      showToast(`${pName} declared trump: ${suit} ${SUIT_SYMBOLS[suit]}`, 4000);
      setSelectTrump(false);
    });

    socket.on('select-trump', () => {
      setSelectTrump(true);
    });

    socket.on('hand-complete', (result: { handWinner: number; reason: string; team0Tens: number; team1Tens: number; gameWinner: number | null }) => {
      const teamLabel = result.handWinner === 0 ? 'A (South+North)' : 'B (East+West)';
      const msg = `Hand over! Team ${teamLabel} wins (${result.team0Tens}v${result.team1Tens} tens)`;
      setHandComplete(msg);
      setTimeout(() => setHandComplete(null), 5000);
    });

    socket.on('new-hand', ({ dealer, handNumber }: { dealer: number; handNumber: number }) => {
      setChatMessages((m) => [
        ...m,
        {
          sender: 'System',
          message: `🂠 Hand #${handNumber} starting. Dealer: ${POSITION_LABELS[dealer]}`,
          type: 'system',
          timestamp: new Date(),
        },
      ]);
    });

    socket.on('game-over', ({ winnerTeam, totalKots }: { winnerTeam: number; totalKots: { 0: number; 1: number } }) => {
      setGameOver({ winnerTeam, totalKots });
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setChatMessages((m) => [...m, msg]);
    });

    socket.on('emoji-reaction', ({ sender, emoji }: { sender: string; emoji: string }) => {
      setEmojiReaction({ sender, emoji });
      setTimeout(() => setEmojiReaction(null), 2500);
    });

    socket.on('error', ({ message }: { message: string }) => showToast(`⚠ ${message}`));

    return () => {
      ['room-joined','room-updated','game-state','game-started','card-played',
       'trump-declared','select-trump','hand-complete','new-hand',
       'game-over','chat-message','emoji-reaction','error'].forEach((ev) => socket.off(ev));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user, code]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handlePlayCard = useCallback(
    (card: CardData) => {
      if (!socket) return;
      socket.emit('play-card', { code: code.toUpperCase(), card });
    },
    [socket, code]
  );

  const handleDeclareTrump = useCallback(
    (suit: string) => {
      if (!socket) return;
      socket.emit('declare-trump', { code: code.toUpperCase(), suit });
      setSelectTrump(false);
    },
    [socket, code]
  );

  const handleSendChat = useCallback(
    (message: string) => {
      if (!socket || !user) return;
      socket.emit('chat-message', { code: code.toUpperCase(), sender: user.username, message });
    },
    [socket, user, code]
  );

  const handleEmoji = useCallback(
    (emoji: string) => {
      if (!socket || !user) return;
      socket.emit('emoji-reaction', { code: code.toUpperCase(), sender: user.username, emoji });
    },
    [socket, user, code]
  );

  // ─── Derived ─────────────────────────────────────────────────────────────
  const isMyTurn = gameState ? getCurrentPlayer(gameState) === myPosition : false;
  const myHand = gameState?.hands?.[myPosition] ?? [];
  const getPlayer = (pos: number) => players.find((p) => p.position === pos) ?? null;

  // Reorder: local player always bottom (South=0), displayed as [West=1, North=2, East=3, South=0]
  const otherPositions = [1, 2, 3].filter((p) => p !== myPosition);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" />
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', letterSpacing: '0.1em', fontSize: '0.85rem' }}>
          Loading game...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #0D1B2A 0%, #060E18 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid rgba(212,175,55,0.15)',
          zIndex: 10,
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
          ♠ {code} · Hand #{gameState.handNumber}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TrumpBadge suit={gameState.trumpSuit} mode={gameState.trumpMode} />

          {/* Pile indicator */}
          {gameState.centerPileTrickCount > 0 && (
            <div
              style={{
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 16,
                padding: '3px 10px',
                fontSize: '0.72rem',
                color: 'var(--gold)',
                fontFamily: 'var(--font-display)',
              }}
            >
              🃏 Pile: {gameState.centerPileTrickCount} trick{gameState.centerPileTrickCount > 1 ? 's' : ''}
            </div>
          )}

          {isMyTurn && (
            <div className="animate-goldPulse" style={{
              padding: '3px 12px',
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid var(--gold)',
              borderRadius: 16,
              fontSize: '0.72rem',
              color: 'var(--gold)',
              fontFamily: 'var(--font-display)',
            }}>
              ● Your Turn
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn-ghost"
            onClick={() => setShowScore((s) => !s)}
            style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem' }}
          >
            📊 Score
          </button>
          <button
            className="btn-ghost"
            onClick={() => setShowChat((s) => !s)}
            style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem' }}
          >
            💬 Chat
          </button>
          <button
            className="btn-ghost"
            onClick={() => router.push('/lobby')}
            style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem' }}
          >
            ← Lobby
          </button>
        </div>
      </header>

      {/* Main game area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Game Table */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            gridTemplateColumns: 'auto 1fr auto',
            gap: '0.5rem',
            padding: '0.75rem',
            alignItems: 'center',
            justifyItems: 'center',
          }}
        >
          {/* Top: North player (pos 2) */}
          <div style={{ gridColumn: '1/4', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <PlayerSeat
              position={2}
              player={getPlayer(2)}
              cardCount={(gameState.hands[2] || []).length}
              isCurrentTurn={getCurrentPlayer(gameState) === 2}
              isMe={myPosition === 2}
              lastPlayedCard={gameState.currentTrick.cards.find((c) => c.position === 2)?.card || null}
              team={2 % 2}
            />
            {/* North's hand (face down) */}
            <div style={{ display: 'flex', gap: -4 }}>
              {(gameState.hands[2] || []).slice(0, 8).map((card, i) => (
                <Card key={i} card={{ hidden: true, suit: '', rank: '' }} style={{ width: 28, height: 40, margin: '0 -6px', borderRadius: 4 }} />
              ))}
            </div>
          </div>

          {/* Left: West player (pos 1) */}
          <div style={{ gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlayerSeat
              position={1}
              player={getPlayer(1)}
              cardCount={(gameState.hands[1] || []).length}
              isCurrentTurn={getCurrentPlayer(gameState) === 1}
              isMe={myPosition === 1}
              lastPlayedCard={gameState.currentTrick.cards.find((c) => c.position === 1)?.card || null}
              team={1 % 2}
            />
          </div>

          {/* Center: Felt Table + Trick cards */}
          <div
            className="game-table"
            style={{
              width: 280,
              height: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Current trick cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateAreas: '"north north" "west east" "south south"',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: 'auto auto auto',
                gap: 6,
                padding: 12,
              }}
            >
              {/* North card */}
              <div style={{ gridArea: 'north', display: 'flex', justifyContent: 'center' }}>
                {gameState.currentTrick.cards.find((c) => c.position === 2) ? (
                  <Card card={gameState.currentTrick.cards.find((c) => c.position === 2)!.card} small />
                ) : (
                  <div style={{ width: 52, height: 76, borderRadius: 6, border: '1px dashed rgba(212,175,55,0.15)' }} />
                )}
              </div>
              {/* West card */}
              <div style={{ gridArea: 'west', display: 'flex', justifyContent: 'flex-end' }}>
                {gameState.currentTrick.cards.find((c) => c.position === 1) ? (
                  <Card card={gameState.currentTrick.cards.find((c) => c.position === 1)!.card} small />
                ) : (
                  <div style={{ width: 52, height: 76, borderRadius: 6, border: '1px dashed rgba(212,175,55,0.15)' }} />
                )}
              </div>
              {/* East card */}
              <div style={{ gridArea: 'east', display: 'flex', justifyContent: 'flex-start' }}>
                {gameState.currentTrick.cards.find((c) => c.position === 3) ? (
                  <Card card={gameState.currentTrick.cards.find((c) => c.position === 3)!.card} small />
                ) : (
                  <div style={{ width: 52, height: 76, borderRadius: 6, border: '1px dashed rgba(212,175,55,0.15)' }} />
                )}
              </div>
              {/* South card */}
              <div style={{ gridArea: 'south', display: 'flex', justifyContent: 'center' }}>
                {gameState.currentTrick.cards.find((c) => c.position === 0) ? (
                  <Card card={gameState.currentTrick.cards.find((c) => c.position === 0)!.card} small />
                ) : (
                  <div style={{ width: 52, height: 76, borderRadius: 6, border: '1px dashed rgba(212,175,55,0.15)' }} />
                )}
              </div>
            </div>

            {/* Trick number badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 12,
                fontSize: '0.65rem',
                color: 'rgba(212,175,55,0.5)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Trick {gameState.currentTrick.number + 1}/13
            </div>
          </div>

          {/* Right: East player (pos 3) */}
          <div style={{ gridRow: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlayerSeat
              position={3}
              player={getPlayer(3)}
              cardCount={(gameState.hands[3] || []).length}
              isCurrentTurn={getCurrentPlayer(gameState) === 3}
              isMe={myPosition === 3}
              lastPlayedCard={gameState.currentTrick.cards.find((c) => c.position === 3)?.card || null}
              team={3 % 2}
            />
          </div>

          {/* Bottom: South player (pos 0) = ME */}
          <div style={{ gridColumn: '1/4', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <PlayerSeat
              position={0}
              player={getPlayer(0)}
              cardCount={myHand.length}
              isCurrentTurn={isMyTurn}
              isMe={myPosition === 0}
              lastPlayedCard={gameState.currentTrick.cards.find((c) => c.position === 0)?.card || null}
              team={0 % 2}
            />

            {/* My hand */}
            <Hand
              cards={myHand}
              isMyHand={myPosition === 0}
              currentTurn={isMyTurn && myPosition === 0}
              onPlayCard={handlePlayCard}
              leadSuit={gameState.currentTrick.leadSuit}
              phase={gameState.phase}
            />
          </div>
        </div>

        {/* My hand if not position 0 */}
        {myPosition !== 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '0.75rem',
              background: 'linear-gradient(to top, rgba(6,14,24,0.95) 60%, transparent)',
              zIndex: 10,
            }}
          >
            <PlayerSeat
              position={myPosition}
              player={getPlayer(myPosition)}
              cardCount={myHand.length}
              isCurrentTurn={isMyTurn}
              isMe
              lastPlayedCard={gameState.currentTrick.cards.find((c) => c.position === myPosition)?.card || null}
              team={myPosition % 2}
            />
            <Hand
              cards={myHand}
              isMyHand
              currentTurn={isMyTurn}
              onPlayCard={handlePlayCard}
              leadSuit={gameState.currentTrick.leadSuit}
              phase={gameState.phase}
            />
          </div>
        )}

        {/* Sidebar panels */}
        {showScore && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 20,
              width: 220,
              animation: 'slideInLeft 0.2s ease',
            }}
          >
            <ScoreBoard
              tensWon={gameState.tensWon}
              totalKots={gameState.totalKots}
              consecutiveHandWins={gameState.consecutiveHandWins}
              handNumber={gameState.handNumber}
            />
          </div>
        )}

        {showChat && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              zIndex: 20,
              width: 280,
              height: 320,
            }}
          >
            <ChatBox
              messages={chatMessages}
              onSend={handleSendChat}
              onEmoji={handleEmoji}
              myUsername={user?.username || ''}
            />
          </div>
        )}
      </div>

      {/* Phase indicator */}
      <div
        style={{
          position: 'fixed',
          top: 52,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.7rem',
          color: 'rgba(212,175,55,0.5)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.12em',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {gameState.phase === 'playing_phase1' && 'PHASE 1 — First 5 Tricks (Dynamic Trump)'}
        {gameState.phase === 'playing_phase2' && 'PHASE 2 — Final 8 Tricks'}
        {gameState.phase === 'trump_selection' && '⏳ Waiting for trump declaration...'}
      </div>

      {/* Emoji Reaction */}
      {emojiReaction && (
        <div
          className="animate-bounceIn"
          style={{
            position: 'fixed',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '4rem',
            zIndex: 30,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {emojiReaction.emoji}
          <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
            {emojiReaction.sender}
          </div>
        </div>
      )}

      {/* Hand Complete Banner */}
      {handComplete && (
        <div
          className="animate-bounceIn"
          style={{
            position: 'fixed',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(13,27,42,0.97)',
            border: '2px solid var(--gold)',
            borderRadius: 12,
            padding: '1rem 2rem',
            zIndex: 40,
            fontFamily: 'var(--font-display)',
            color: 'var(--gold)',
            fontSize: '0.9rem',
            textAlign: 'center',
            letterSpacing: '0.05em',
            maxWidth: '80vw',
          }}
        >
          {handComplete}
        </div>
      )}

      {/* Trump select modal */}
      {selectTrump && <TrumpSelect onSelect={handleDeclareTrump} />}

      {/* Game over modal */}
      {gameOver && (
        <GameOverModal
          winnerTeam={gameOver.winnerTeam}
          totalKots={gameOver.totalKots}
          myPosition={myPosition}
          onLobby={() => router.push('/lobby')}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
