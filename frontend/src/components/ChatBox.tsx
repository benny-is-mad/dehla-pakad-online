'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  sender: string;
  message: string;
  type: 'text' | 'emoji' | 'system';
  timestamp: string | Date;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onEmoji?: (emoji: string) => void;
  myUsername: string;
}

const QUICK_EMOJIS = ['👏', '😄', '😮', '😅', '🃏', '👑', '🔥', '💀'];

export default function ChatBox({ messages, onSend, onEmoji, myUsername }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: 320,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(212,175,55,0.15)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.7rem',
          color: 'var(--gold)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        💬 Table Chat
      </div>

      {/* Quick emojis */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 10px',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          flexWrap: 'wrap',
        }}
      >
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onEmoji?.(e)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '2px 4px',
              borderRadius: 4,
              transition: 'transform 0.1s',
            }}
            onMouseOver={(ev) => (ev.currentTarget.style.transform = 'scale(1.3)')}
            onMouseOut={(ev) => (ev.currentTarget.style.transform = 'scale(1)')}
            title={e}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.3)', fontSize: '0.75rem', marginTop: 16 }}>
            No messages yet
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender === myUsername;
          const isSystem = msg.type === 'system';
          return (
            <div
              key={i}
              className={`chat-bubble ${isSystem ? 'system' : isMine ? 'mine' : 'theirs'}`}
              style={{ alignSelf: isSystem ? 'center' : isMine ? 'flex-end' : 'flex-start' }}
            >
              {!isSystem && !isMine && (
                <div style={{ fontSize: '0.65rem', color: 'var(--gold)', marginBottom: 2 }}>
                  {msg.sender}
                </div>
              )}
              <span>{msg.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 10px',
          borderTop: '1px solid rgba(212,175,55,0.15)',
        }}
      >
        <input
          className="input-royal"
          style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
        />
        <button
          className="btn-royal"
          onClick={handleSend}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
