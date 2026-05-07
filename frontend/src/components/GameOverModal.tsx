'use client';

import React from 'react';

interface GameOverModalProps {
  winnerTeam: number;
  totalKots: { 0: number; 1: number };
  tensWon?: { 0: unknown[]; 1: unknown[] };
  myPosition?: number;
  onPlayAgain?: () => void;
  onLobby?: () => void;
}

export default function GameOverModal({
  winnerTeam,
  totalKots,
  myPosition = 0,
  onPlayAgain,
  onLobby,
}: GameOverModalProps) {
  const myTeam = myPosition % 2;
  const didWin = myTeam === winnerTeam;

  return (
    <div className="modal-overlay">
      <div
        className="ornament-border animate-bounceIn"
        style={{
          padding: '2.5rem 3rem',
          textAlign: 'center',
          maxWidth: 440,
          width: '90vw',
        }}
      >
        {/* Emoji */}
        <div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>
          {didWin ? '👑' : '💀'}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            color: didWin ? 'var(--gold)' : 'var(--crimson-light)',
            marginBottom: '0.25rem',
            letterSpacing: '0.06em',
          }}
        >
          {didWin ? 'Victory!' : 'Defeated!'}
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-display)',
            color: 'rgba(245,240,232,0.6)',
            fontSize: '0.85rem',
            letterSpacing: '0.05em',
            marginBottom: '1.5rem',
          }}
        >
          Team {winnerTeam === 0 ? 'A (South & North)' : 'B (East & West)'} wins the game!
        </p>

        <hr className="gold-divider" style={{ marginBottom: '1rem' }} />

        {/* Final Kots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
          {[0, 1].map((t) => (
            <div key={t} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.7rem',
                  color: t === 0 ? 'var(--gold)' : 'var(--crimson-light)',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                TEAM {t === 0 ? 'A' : 'B'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.5rem',
                  color: t === winnerTeam ? (t === 0 ? 'var(--gold)' : 'var(--crimson-light)') : 'rgba(245,240,232,0.3)',
                  lineHeight: 1,
                }}
              >
                {totalKots[t as 0 | 1]}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(245,240,232,0.4)', letterSpacing: '0.1em' }}>
                KOTS
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {onPlayAgain && (
            <button className="btn-royal" onClick={onPlayAgain}>
              Play Again
            </button>
          )}
          <button className="btn-ghost" onClick={onLobby}>
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
