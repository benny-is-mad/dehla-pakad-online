'use client';

import React from 'react';
import Card from './Card';

interface PlayerSeatProps {
  position: number; // 0=South, 1=West, 2=North, 3=East
  player: {
    username: string;
    avatar?: string | null;
    isBot?: boolean;
    isConnected?: boolean;
    isReady?: boolean;
    position: number;
  } | null;
  cardCount?: number;
  isCurrentTurn?: boolean;
  isMe?: boolean;
  lastPlayedCard?: { suit: string; rank: string } | null;
  team?: number;
}

const POSITION_LABELS = ['South (You)', 'West', 'North', 'East'];
const TEAM_COLORS = ['rgba(212,175,55,0.2)', 'rgba(139,0,0,0.2)'];
const TEAM_BORDER = ['rgba(212,175,55,0.6)', 'rgba(192,57,43,0.6)'];

export default function PlayerSeat({
  position,
  player,
  cardCount = 0,
  isCurrentTurn = false,
  isMe = false,
  lastPlayedCard = null,
  team,
}: PlayerSeatProps) {
  const seatClass = ['player-seat', isCurrentTurn ? 'active-turn' : ''].filter(Boolean).join(' ');
  const label = isMe ? 'South (You)' : POSITION_LABELS[position];
  const teamIdx = team ?? position % 2;

  const initials = player
    ? player.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className={seatClass} style={{ gap: 6 }}>
      {/* Avatar */}
      <div
        className="player-avatar"
        style={{
          background: player ? TEAM_COLORS[teamIdx] : 'rgba(255,255,255,0.05)',
          border: `2px solid ${player ? TEAM_BORDER[teamIdx] : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isCurrentTurn ? `0 0 14px ${TEAM_BORDER[teamIdx]}` : undefined,
        }}
      >
        {player?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatar}
            alt={player.username}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '1rem' }}>{player ? initials : '?'}</span>
        )}
      </div>

      {/* Name & Status */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            color: player ? 'var(--ivory)' : 'rgba(245,240,232,0.3)',
            letterSpacing: '0.05em',
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {player ? player.username : 'Empty'}
        </div>
        {player?.isBot && (
          <div style={{ fontSize: '0.65rem', color: 'var(--gold)', opacity: 0.7 }}>🤖 Bot</div>
        )}
        {isCurrentTurn && (
          <div style={{ fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 600 }}>
            ● Playing...
          </div>
        )}
        {!isCurrentTurn && player && !player.isBot && (
          <div
            style={{
              fontSize: '0.65rem',
              color: player.isConnected ? '#2ecc71' : '#e74c3c',
            }}
          >
            {player.isConnected ? '● Online' : '○ Offline'}
          </div>
        )}
      </div>

      {/* Card count mini indicators */}
      {!isMe && player && cardCount > 0 && (
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
            <Card
              key={i}
              card={{ hidden: true, suit: '', rank: '' }}
              small
              style={{ width: 18, height: 26, marginLeft: -10, borderRadius: 3 }}
            />
          ))}
          {cardCount > 5 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--gold)', marginLeft: 4, alignSelf: 'center' }}>
              +{cardCount - 5}
            </span>
          )}
        </div>
      )}

      {/* Last played card */}
      {lastPlayedCard && (
        <div style={{ marginTop: 4 }}>
          <Card card={lastPlayedCard} small style={{ opacity: 0.85 }} />
        </div>
      )}

      {/* Position badge */}
      <div
        style={{
          fontSize: '0.6rem',
          color: 'rgba(245,240,232,0.35)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}
