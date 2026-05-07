'use client';

import React from 'react';

interface ScoreBoardProps {
  tensWon: { 0: { suit: string; rank: string }[]; 1: { suit: string; rank: string }[] };
  totalKots: { 0: number; 1: number };
  consecutiveHandWins?: { 0: number; 1: number };
  handNumber?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
const SUIT_COLORS: Record<string, string> = {
  spades: '#1A1A1A', hearts: '#C0392B', diamonds: '#C0392B', clubs: '#1A1A1A',
};
const KOT_WIN = 3;

export default function ScoreBoard({
  tensWon,
  totalKots,
  consecutiveHandWins = { 0: 0, 1: 0 },
  handNumber = 1,
}: ScoreBoardProps) {
  return (
    <div
      className="panel-gold"
      style={{ padding: '0.75rem 1rem', minWidth: 200 }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          color: 'var(--gold)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}
      >
        Hand #{handNumber} · Scoreboard
      </div>

      <hr className="gold-divider" style={{ marginBottom: '0.5rem' }} />

      {[0, 1].map((team) => (
        <div key={team} style={{ marginBottom: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                color: team === 0 ? 'var(--gold)' : 'var(--crimson-light)',
                letterSpacing: '0.06em',
              }}
            >
              Team {team === 0 ? 'A' : 'B'} (P{team === 0 ? '0+2' : '1+3'})
            </span>
            {/* Kots */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: KOT_WIN }).map((_, i) => (
                <div
                  key={i}
                  className={`kot-dot ${i < totalKots[team as 0 | 1] ? 'filled' : ''}`}
                  style={{
                    borderColor: team === 0 ? 'var(--gold)' : 'var(--crimson-light)',
                    background:
                      i < totalKots[team as 0 | 1]
                        ? team === 0
                          ? 'var(--gold)'
                          : 'var(--crimson-light)'
                        : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tens collected */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tensWon[team as 0 | 1].length === 0 ? (
              <span style={{ fontSize: '0.7rem', color: 'rgba(245,240,232,0.3)' }}>No tens yet</span>
            ) : (
              tensWon[team as 0 | 1].map((c) => (
                <div
                  key={c.suit}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: '0.8rem',
                    color: SUIT_COLORS[c.suit] === '#C0392B' ? '#e74c3c' : 'var(--ivory)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ color: SUIT_COLORS[c.suit] === '#C0392B' ? '#e74c3c' : '#1A1A1A', background: '#fff', borderRadius: 2, padding: '0 2px', fontSize: '0.85rem' }}>
                    10{SUIT_SYMBOLS[c.suit]}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Consecutive hand wins streak */}
          {consecutiveHandWins[team as 0 | 1] > 0 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--gold)', marginTop: 2 }}>
              🔥 {consecutiveHandWins[team as 0 | 1]}/7 hand streak
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
