'use client';

import React from 'react';
import Card from './Card';

interface TrumpSelectProps {
  onSelect: (suit: string) => void;
}

const SUITS = [
  { key: 'spades', symbol: '♠', name: 'Spades', color: '#1A1A1A' },
  { key: 'hearts', symbol: '♥', name: 'Hearts', color: '#C0392B' },
  { key: 'diamonds', symbol: '♦', name: 'Diamonds', color: '#C0392B' },
  { key: 'clubs', symbol: '♣', name: 'Clubs', color: '#1A1A1A' },
];

export default function TrumpSelect({ onSelect }: TrumpSelectProps) {
  return (
    <div className="modal-overlay">
      <div
        className="ornament-border animate-bounceIn"
        style={{ padding: '2rem 2.5rem', textAlign: 'center', maxWidth: 400, width: '90vw' }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👑</div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--gold)',
            fontSize: '1.4rem',
            letterSpacing: '0.06em',
            marginBottom: '0.25rem',
          }}
        >
          Declare Trump
        </h2>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          You are right of the dealer. Choose the trump suit for this hand.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {SUITS.map((suit) => (
            <button
              key={suit.key}
              onClick={() => onSelect(suit.key)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 10,
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--gold)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '2.5rem', color: suit.color === '#1A1A1A' ? '#e0e0e0' : suit.color }}>
                {suit.symbol}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  color: 'var(--ivory)',
                  letterSpacing: '0.06em',
                }}
              >
                {suit.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
