'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

interface Player {
  userId?: string;
  username: string;
  avatar?: string | null;
  position: number;
  isBot?: boolean;
  botDifficulty?: string;
  isReady?: boolean;
  isConnected?: boolean;
}

interface Room {
  code: string;
  host: string;
  mode: string;
  trumpMode: string;
  status: string;
  players: Player[];
}

const POSITION_NAMES = ['South', 'West', 'North', 'East'];
const TEAM_LABEL = ['Team A', 'Team B'];
const BOT_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [toast, setToast] = useState('');
  const [starting, setStarting] = useState(false);
  const joined = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Join room via socket
  useEffect(() => {
    if (!socket || !user || joined.current) return;
    joined.current = true;

    socket.emit('join-room', {
      code: code.toUpperCase(),
      user: { id: user._id, username: user.username, avatar: user.avatar },
    });

    socket.on('room-joined', ({ room: r }) => setRoom(r));
    socket.on('room-updated', ({ room: r }) => setRoom(r));
    socket.on('error', ({ message }: { message: string }) => showToast(`⚠ ${message}`));
    socket.on('game-started', () => {
      router.push(`/game/${code}`);
    });

    return () => {
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('error');
      socket.off('game-started');
    };
  }, [socket, user, code, router]);

  const isHost = room && user && room.host === user._id;
  const myPlayer = room?.players.find((p) => p.userId === user?._id);
  const humanCount = room?.players.filter((p) => !p.isBot).length ?? 0;
  const botCount = room?.players.filter((p) => p.isBot).length ?? 0;

  const handleReady = useCallback(() => {
    if (!socket || !user || !room) return;
    socket.emit('player-ready', {
      code: room.code,
      userId: user._id,
      isReady: !myPlayer?.isReady,
    });
  }, [socket, user, room, myPlayer]);

  const handleAddBot = useCallback(
    (difficulty: string) => {
      if (!socket || !room) return;
      socket.emit('add-bot', { code: room.code, difficulty });
    },
    [socket, room]
  );

  const handleRemoveBot = useCallback(
    (position: number) => {
      if (!socket || !room) return;
      socket.emit('remove-bot', { code: room.code, position });
    },
    [socket, room]
  );

  const handleStart = useCallback(() => {
    if (!socket || !room) return;
    setStarting(true);
    socket.emit('start-game', { code: room.code });
    setTimeout(() => setStarting(false), 3000);
  }, [socket, room]);

  const handleLeave = useCallback(() => {
    if (!socket || !user || !room) return;
    socket.emit('leave-room', { code: room.code, userId: user._id });
    router.push('/lobby');
  }, [socket, user, room, router]);

  if (!room) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--navy)',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  const canStart =
    isHost &&
    room.players.length === 4 &&
    room.players.filter((p) => !p.isBot && !p.isReady).length === 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(212,175,55,0.15)',
        }}
      >
        <div
          style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1rem', letterSpacing: '0.08em', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          ♠ DEHLA PAKAD
        </div>
        <button className="btn-ghost" onClick={handleLeave} style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}>
          ← Leave Room
        </button>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
        {/* Room Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '2rem',
                letterSpacing: '0.2em',
              }}
            >
              {room.code}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: 'var(--gold)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {room.mode.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(245,240,232,0.6)',
                }}
              >
                {room.trumpMode} trump
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'rgba(245,240,232,0.4)', letterSpacing: '0.1em' }}>
              PLAYERS
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: room.players.length === 4 ? '#2ecc71' : 'var(--gold)' }}>
              {room.players.length}/4
            </div>
          </div>
        </div>

        <hr className="gold-divider" style={{ marginBottom: '1.5rem' }} />

        {/* Player Seats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          {[0, 1, 2, 3].map((pos) => {
            const player = room.players.find((p) => p.position === pos);
            const isMe = player?.userId === user?._id;
            const team = pos % 2;
            return (
              <div
                key={pos}
                className="panel"
                style={{
                  padding: '1rem',
                  border: `1px solid ${isMe ? 'rgba(212,175,55,0.5)' : player ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  opacity: player ? 1 : 0.5,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: `2px solid ${team === 0 ? 'rgba(212,175,55,0.5)' : 'rgba(192,57,43,0.5)'}`,
                    background: player ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    color: team === 0 ? 'var(--gold)' : 'var(--crimson-light)',
                    flexShrink: 0,
                  }}
                >
                  {player?.isBot ? '🤖' : player ? player.username.slice(0, 2).toUpperCase() : '?'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.85rem',
                        color: player ? 'var(--ivory)' : 'rgba(245,240,232,0.25)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {player ? player.username : 'Waiting...'}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 8, background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.4)' }}>
                        YOU
                      </span>
                    )}
                    {player?.isBot && (
                      <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'rgba(245,240,232,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        {player.botDifficulty}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: team === 0 ? 'rgba(212,175,55,0.6)' : 'rgba(192,57,43,0.6)', letterSpacing: '0.06em' }}>
                    {TEAM_LABEL[team]} · {POSITION_NAMES[pos]}
                  </div>
                  {player && !player.isBot && (
                    <div style={{ fontSize: '0.65rem', marginTop: 2, color: player.isReady ? '#2ecc71' : 'rgba(245,240,232,0.4)' }}>
                      {player.isReady ? '✔ Ready' : '⏳ Not ready'}
                    </div>
                  )}
                </div>

                {/* Remove bot button */}
                {isHost && player?.isBot && (
                  <button
                    onClick={() => handleRemoveBot(pos)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(192,57,43,0.7)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: 4,
                    }}
                    title="Remove bot"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Ready toggle */}
          {myPlayer && !myPlayer.isBot && (
            <button
              id="ready-btn"
              className={myPlayer.isReady ? 'btn-ghost' : 'btn-royal'}
              onClick={handleReady}
            >
              {myPlayer.isReady ? '⏎ Unready' : '✔ Ready Up'}
            </button>
          )}

          {/* Add Bot (host only, if there's space) */}
          {isHost && room.players.length < 4 && room.mode !== 'ranked' && (
            <div style={{ display: 'flex', gap: 4 }}>
              {BOT_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  id={`add-bot-${d}`}
                  className="btn-ghost"
                  onClick={() => handleAddBot(d)}
                  style={{ fontSize: '0.72rem', padding: '0.4rem 0.65rem' }}
                >
                  + {d} bot
                </button>
              ))}
            </div>
          )}

          {/* Start Game (host only, all ready, 4 players) */}
          {isHost && (
            <button
              id="start-game-btn"
              className="btn-royal"
              onClick={handleStart}
              disabled={!canStart || starting}
              style={{
                marginLeft: 'auto',
                padding: '0.65rem 1.75rem',
                fontSize: '0.9rem',
                opacity: canStart ? 1 : 0.45,
              }}
            >
              {starting ? 'Starting...' : '⚔ Start Game'}
            </button>
          )}
        </div>

        {/* Requirements info */}
        <div
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: 'rgba(245,240,232,0.4)',
            textAlign: 'center',
          }}
        >
          {room.players.length < 4
            ? `Need ${4 - room.players.length} more player${4 - room.players.length > 1 ? 's' : ''} to start`
            : !canStart && isHost
            ? 'All human players must be ready before starting'
            : isHost
            ? 'You can start the game!'
            : 'Waiting for host to start...'}
        </div>

        {/* Share Code */}
        <div
          className="panel"
          style={{ marginTop: '1.5rem', padding: '0.75rem 1.25rem', textAlign: 'center' }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: 6 }}>
            SHARE ROOM CODE
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              letterSpacing: '0.3em',
              color: 'var(--ivory)',
              cursor: 'pointer',
            }}
            onClick={() => {
              navigator.clipboard.writeText(room.code);
              showToast('✔ Code copied to clipboard!');
            }}
            title="Click to copy"
          >
            {room.code}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(245,240,232,0.35)', marginTop: 4 }}>
            Click to copy
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
