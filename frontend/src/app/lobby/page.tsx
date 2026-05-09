'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Room {
  _id: string;
  code: string;
  host: string;
  mode: 'casual' | 'ranked' | 'private';
  trumpMode: 'dynamic' | 'manual';
  collectionMode: 'pakad' | 'instant';
  status: 'waiting' | 'playing' | 'finished';
  players: Array<{
    username: string;
    isBot?: boolean;
    position: number;
  }>;
}

const MODE_COLORS: Record<string, string> = {
  casual: 'rgba(46,204,113,0.15)',
  ranked: 'rgba(192,57,43,0.15)',
  private: 'rgba(212,175,55,0.15)',
};
const MODE_BORDER: Record<string, string> = {
  casual: 'rgba(46,204,113,0.4)',
  ranked: 'rgba(192,57,43,0.4)',
  private: 'rgba(212,175,55,0.4)',
};
const MODE_LABEL: Record<string, string> = {
  casual: '🎮 Casual',
  ranked: '🏆 Ranked',
  private: '🔒 Private',
};

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create room form
  const [createMode, setCreateMode] = useState<'casual' | 'ranked' | 'private'>('casual');
  const [trumpMode, setTrumpMode] = useState<'dynamic' | 'manual'>('manual');
  const [collectionMode, setCollectionMode] = useState<'pakad' | 'instant'>('pakad');
  const [creating, setCreating] = useState(false);

  // Join by code
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchRooms();
  }, [user, router]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { rooms: r } = await api.get<{ rooms: Room[] }>('/api/rooms');
      setRooms(r);
    } catch {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const { room } = await api.post<{ room: Room }>('/api/rooms/create', {
        mode: createMode,
        trumpMode,
        collectionMode,
      });
      router.push(`/room/${room.code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setJoining(true);
    setError('');
    try {
      await api.get<{ room: Room }>(`/api/rooms/${c}`);
      router.push(`/room/${c}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Room not found');
    } finally {
      setJoining(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {/* Gold top bar */}
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
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: 'var(--gold)',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
          onClick={() => router.push('/')}
        >
          ♠ DEHLA PAKAD
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="panel" style={{ padding: '0.4rem 0.9rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
              {user.username}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(245,240,232,0.4)', marginLeft: 6 }}>
              ELO {user.elo}
            </span>
          </div>
          <button className="btn-ghost" onClick={logout} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--gold)',
            fontSize: '1.5rem',
            letterSpacing: '0.08em',
            marginBottom: '0.25rem',
          }}
        >
          Game Lobby
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Create a room or join an existing game
        </p>

        {error && (
          <div
            style={{
              padding: '0.7rem 1rem',
              background: 'rgba(139,0,0,0.2)',
              border: '1px solid rgba(192,57,43,0.4)',
              borderRadius: 8,
              color: '#e74c3c',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Panel: Create + Join */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Create Room */}
            <div className="panel-gold" style={{ padding: '1.25rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--gold)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.08em',
                  marginBottom: '1rem',
                }}
              >
                ⚔ Create Room
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Mode */}
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                    GAME MODE
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['casual', 'ranked', 'private'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setCreateMode(m)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.3rem',
                          borderRadius: 6,
                          border: `1px solid ${createMode === m ? MODE_BORDER[m] : 'rgba(255,255,255,0.1)'}`,
                          background: createMode === m ? MODE_COLORS[m] : 'transparent',
                          color: createMode === m ? 'var(--ivory)' : 'rgba(245,240,232,0.4)',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-display)',
                          transition: 'all 0.15s',
                          textAlign: 'center',
                        }}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trump Mode */}
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                    TRUMP MODE
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['dynamic', 'manual'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTrumpMode(t)}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          borderRadius: 6,
                          border: `1px solid ${trumpMode === t ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          background: trumpMode === t ? 'rgba(212,175,55,0.15)' : 'transparent',
                          color: trumpMode === t ? 'var(--gold)' : 'rgba(245,240,232,0.4)',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collection Mode */}
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                    COLLECTION MODE
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['pakad', 'instant'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCollectionMode(c)}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          borderRadius: 6,
                          border: `1px solid ${collectionMode === c ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          background: collectionMode === c ? 'rgba(212,175,55,0.15)' : 'transparent',
                          color: collectionMode === c ? 'var(--gold)' : 'rgba(245,240,232,0.4)',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="create-room-btn"
                  className="btn-royal"
                  onClick={handleCreate}
                  disabled={creating}
                  style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem' }}
                >
                  {creating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>

            {/* Join by Code */}
            <div className="panel" style={{ padding: '1.25rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--gold)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.08em',
                  marginBottom: '0.75rem',
                }}
              >
                🚪 Join by Code
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="join-code-input"
                  className="input-royal"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'var(--font-display)', fontSize: '1rem' }}
                />
                <button
                  id="join-room-btn"
                  className="btn-royal"
                  onClick={() => handleJoin(joinCode)}
                  disabled={joining || joinCode.length < 4}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {joining ? '...' : 'Join'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="panel" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                YOUR STATS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Games', value: user.stats.gamesPlayed },
                  { label: 'Wins', value: user.stats.gamesWon },
                  { label: 'Kots Won', value: user.stats.kotsWon },
                  { label: 'ELO', value: user.elo },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)' }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,0.4)', letterSpacing: '0.08em' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Room List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--ivory)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.08em',
                }}
              >
                Open Rooms
              </h2>
              <button
                className="btn-ghost"
                onClick={fetchRooms}
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.8rem' }}
              >
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" />
              </div>
            ) : rooms.length === 0 ? (
              <div
                className="panel"
                style={{ padding: '3rem', textAlign: 'center', color: 'rgba(245,240,232,0.3)' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🃏</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}>
                  No open rooms found
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Create one and invite your friends!
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {rooms.map((room) => (
                  <div
                    key={room._id}
                    className="room-card"
                    id={`room-${room.code}`}
                    onClick={() => handleJoin(room.code)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.95rem',
                            color: 'var(--gold)',
                            letterSpacing: '0.15em',
                          }}
                        >
                          {room.code}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: MODE_COLORS[room.mode],
                            border: `1px solid ${MODE_BORDER[room.mode]}`,
                            color: 'var(--ivory)',
                          }}
                        >
                          {MODE_LABEL[room.mode]}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(245,240,232,0.6)',
                          }}
                        >
                          {room.trumpMode} | {room.collectionMode || 'pakad'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,0.5)' }}>
                        {room.players.map((p) => p.username).join(', ')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.85rem',
                          color: room.players.length < 4 ? '#2ecc71' : '#e74c3c',
                        }}
                      >
                        {room.players.length}/4
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,0.35)' }}>
                        {room.players.length < 4 ? 'Waiting' : 'Full'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
