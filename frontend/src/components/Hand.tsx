'use client';

import React, { useState } from 'react';
import Card from './Card';

interface CardData {
  suit: string;
  rank: string;
  hidden?: boolean;
}

interface HandProps {
  cards: CardData[];
  isMyHand?: boolean;
  currentTurn?: boolean;
  onPlayCard?: (card: CardData) => void;
  trumpSuit?: string | null;
  leadSuit?: string | null;
  phase?: string;
}

function isPlayable(
  card: CardData,
  hand: CardData[],
  leadSuit: string | null,
  phase: string,
): boolean {
  if (phase !== 'playing_phase1' && phase !== 'playing_phase2') return false;
  if (!leadSuit) return true; // leading the trick
  const hasSuit = hand.some(c => c.suit === leadSuit);
  if (hasSuit) return card.suit === leadSuit;
  return true; // can play anything if no suit
}

export default function Hand({
  cards,
  isMyHand = false,
  currentTurn = false,
  onPlayCard,
  leadSuit = null,
  phase = '',
}: HandProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleClick = (card: CardData) => {
    if (!isMyHand || !currentTurn) return;
    const key = `${card.rank}_${card.suit}`;
    if (selectedCard === key) {
      // Second click = play
      onPlayCard?.(card);
      setSelectedCard(null);
    } else {
      setSelectedCard(key);
    }
  };

  return (
    <div className="hand-container" style={{ flexWrap: 'nowrap', overflow: 'visible' }}>
      {cards.map((card, i) => {
        const key = card.hidden ? `hidden_${i}` : `${card.rank}_${card.suit}`;
        const canPlay =
          isMyHand &&
          currentTurn &&
          !card.hidden &&
          isPlayable(card, cards, leadSuit, phase);

        return (
          <Card
            key={key}
            card={card}
            playable={canPlay}
            selected={selectedCard === key}
            onClick={() => handleClick(card)}
            dealDelay={i * 60}
            style={{
              zIndex: i,
              position: 'relative',
            }}
          />
        );
      })}
    </div>
  );
}
