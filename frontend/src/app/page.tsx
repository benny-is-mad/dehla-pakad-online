'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const SUIT_GRID = ['♠', '♥', '♦', '♣', '♥', '♠', '♦', '♣', '♠', '♦', '♥', '♣'];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const handlePlay = () => {
    if (user) {
      router.push('/lobby');
    } else {
      router.push('/login');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 60% 40%, #1B2A4A 0%, var(--navy) 70%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Suit Pattern */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '3rem',
          padding: '4rem',
          opacity: 0.04,
          pointerEvents: 'none',
          userSelect: 'none',
          fontSize: '4rem',
          color: 'var(--gold)',
        }}
      >
        {SUIT_GRID.map((s, i) => <span key={i}>{s}</span>)}
      </div>

      {/* Gold top border */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 2.5rem',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          ♠ DEHLA PAKAD ♥
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {user ? (
            <>
              <span style={{ color: 'var(--ivory)', fontSize: '0.85rem', alignSelf: 'center' }}>
                👤 {user.username}
              </span>
              <Link href="/lobby">
                <button className="btn-royal">Play Now</button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="btn-ghost">Sign In</button>
              </Link>
              <Link href="/login?tab=register">
                <button className="btn-royal">Register</button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        {/* Crown icon */}
        <div className="animate-fadeInUp" style={{ fontSize: '4rem', marginBottom: '1rem', animationDelay: '0s' }}>
          👑
        </div>

        {/* Title */}
        <h1
          className="animate-fadeInUp"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 900,
            color: 'var(--gold)',
            letterSpacing: '0.06em',
            lineHeight: 1.1,
            marginBottom: '0.5rem',
            animationDelay: '0.1s',
            textShadow: '0 0 40px rgba(212,175,55,0.3)',
          }}
        >
          DEHLA PAKAD
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fadeInUp"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
            color: 'rgba(245,240,232,0.6)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '2rem',
            animationDelay: '0.2s',
          }}
        >
          The Royal Indian Card Game · Online Multiplayer
        </p>

        <hr
          className="gold-divider animate-fadeIn"
          style={{ width: 200, marginBottom: '2rem', animationDelay: '0.3s' }}
        />

        {/* Description */}
        <p
          className="animate-fadeInUp"
          style={{
            maxWidth: 520,
            color: 'rgba(245,240,232,0.7)',
            lineHeight: 1.7,
            fontSize: '1rem',
            marginBottom: '2.5rem',
            animationDelay: '0.35s',
          }}
        >
          Challenge players from around the world in this classic 2v2 trick-taking game.
          Collect tens, win hands, and earn <strong style={{ color: 'var(--gold)' }}>Kots</strong> to
          claim victory. Dynamic or manual trump — your strategy, your glory.
        </p>

        {/* CTA */}
        <div className="animate-fadeInUp" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.45s' }}>
          <button
            className="btn-royal"
            onClick={handlePlay}
            id="play-now-btn"
            style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', letterSpacing: '0.1em' }}
          >
            ⚔ Play Now
          </button>
          <a href="#how-to-play">
            <button className="btn-ghost" style={{ padding: '0.8rem 2rem', fontSize: '0.9rem' }}>
              How to Play
            </button>
          </a>
        </div>

        {/* Feature tiles */}
        <div
          className="animate-fadeInUp"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginTop: '4rem',
            maxWidth: 700,
            width: '100%',
            animationDelay: '0.55s',
          }}
        >
          {[
            { icon: '🌐', title: 'Real-Time', desc: 'Live multiplayer via WebSockets' },
            { icon: '🤖', title: 'AI Bots', desc: 'Easy, Medium or Hard difficulty' },
            { icon: '🏆', title: 'Ranked', desc: 'ELO rating system' },
            { icon: '💬', title: 'Chat', desc: 'In-game chat & emoji reactions' },
          ].map((f) => (
            <div
              key={f.title}
              className="panel"
              style={{ padding: '1.25rem 1rem', textAlign: 'center' }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{f.icon}</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  color: 'var(--gold)',
                  letterSpacing: '0.08em',
                  marginBottom: '0.25rem',
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(245,240,232,0.5)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* How to Play section */}
      <section
        id="how-to-play"
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '3rem 2rem 5rem',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--gold)',
            fontSize: '1.5rem',
            textAlign: 'center',
            letterSpacing: '0.08em',
            marginBottom: '2rem',
          }}
        >
          How to Play
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { n: '1', title: 'Teams', text: 'Two teams of 2. Players sit across from each other (South+North vs East+West).' },
            { n: '2', title: 'The Goal', text: 'Collect the 10-value cards. The team with more tens wins the hand.' },
            { n: '3', title: 'Consecutive Wins', text: 'Win two tricks in a row to collect the center pile. That\'s how you get the 10s!' },
            { n: '4', title: 'Kots', text: 'Win all 4 tens, or win 7 hands in a row to earn a Kot. First to 3 Kots wins!' },
          ].map((s) => (
            <div key={s.n} className="panel" style={{ padding: '1.25rem' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: 'var(--gold)',
                  opacity: 0.4,
                  marginBottom: '0.5rem',
                }}
              >
                {s.n}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--gold)',
                  fontSize: '0.9rem',
                  letterSpacing: '0.06em',
                  marginBottom: '0.5rem',
                }}
              >
                {s.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'rgba(245,240,232,0.65)', lineHeight: 1.6 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          borderTop: '1px solid rgba(212,175,55,0.1)',
          color: 'rgba(245,240,232,0.3)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.08em',
        }}
      >
        ♠ ♥ DEHLA PAKAD ONLINE ♦ ♣ &nbsp;·&nbsp; Play Responsibly
      </footer>
    </div>
  );
}
