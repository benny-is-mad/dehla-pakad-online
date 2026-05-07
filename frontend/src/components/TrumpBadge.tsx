'use client';

import React from 'react';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};
const SUIT_COLORS: Record<string, string> = {
  spades: '#1A1A1A',
  hearts: '#C0392B',
  diamonds: '#C0392B',
  clubs: '#1A1A1A',
};
const SUIT_NAMES: Record<string, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

interface TrumpBadgeProps {
  suit: string | null;
  mode: string;
}

export default function TrumpBadge({ suit, mode }: TrumpBadgeProps) {
  if (!suit) {
    return (
      <div className="trump-badge" style={{ opacity: 0.5 }}>
        <span>Trump: {mode === 'manual' ? 'Selecting...' : 'Dynamic'}</span>
      </div>
    );
  }

  return (
    <div className="trump-badge">
      <span style={{ color: SUIT_COLORS[suit], fontSize: '1rem' }}>
        {SUIT_SYMBOLS[suit]}
      </span>
      <span>Trump: {SUIT_NAMES[suit]}</span>
    </div>
  );
}
