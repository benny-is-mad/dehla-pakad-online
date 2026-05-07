'use client';

import React from 'react';

interface CardData {
  suit: string;
  rank: string;
  hidden?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};
const RED_SUITS = new Set(['hearts', 'diamonds']);

interface CardProps {
  card: CardData;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  style?: React.CSSProperties;
  dealDelay?: number;
}

export default function Card({
  card,
  playable = false,
  selected = false,
  onClick,
  small = false,
  style,
  dealDelay,
}: CardProps) {
  if (card.hidden) {
    return (
      <div
        className="playing-card face-down animate-cardDeal"
        style={{ ...style, ...(dealDelay !== undefined ? { animationDelay: `${dealDelay}ms` } : {}) }}
      >
        <div className="card-back-pattern">🂠</div>
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit] || card.suit;
  const isRed = RED_SUITS.has(card.suit);
  const colorClass = isRed ? 'suit-red' : 'suit-black';

  const classes = [
    'playing-card',
    'animate-cardDeal',
    playable ? 'playable' : 'not-playable',
    selected ? 'selected' : '',
    small ? 'small' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={{
        ...style,
        ...(small ? { width: 52, height: 76 } : {}),
        ...(dealDelay !== undefined ? { animationDelay: `${dealDelay}ms` } : {}),
      }}
      onClick={playable && onClick ? onClick : undefined}
      title={playable ? `Play ${card.rank} of ${card.suit}` : undefined}
    >
      <div className={`card-corner card-corner-tl ${colorClass}`}>
        <div>{card.rank}</div>
        <div style={{ fontSize: 10 }}>{symbol}</div>
      </div>
      <div className={`card-center-suit ${colorClass}`}>{symbol}</div>
      <div className={`card-corner card-corner-br ${colorClass}`}>
        <div>{card.rank}</div>
        <div style={{ fontSize: 10 }}>{symbol}</div>
      </div>
    </div>
  );
}
