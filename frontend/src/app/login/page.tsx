'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'login'
  );
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/lobby');
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      router.push('/lobby');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 40%, #1B2A4A 0%, var(--navy) 70%)',
        padding: '2rem',
      }}
    >
      {/* Background pattern */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.03,
          fontSize: '6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          color: 'var(--gold)',
        }}
      >
        ♠ ♥ ♦ ♣
      </div>

      <div
        className="ornament-border animate-fadeInUp"
        style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>♠</div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--gold)',
              fontSize: '1.4rem',
              letterSpacing: '0.1em',
            }}
          >
            DEHLA PAKAD
          </h1>
          <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            ONLINE MULTIPLAYER
          </p>
        </div>

        <hr className="gold-divider" style={{ marginBottom: '1.5rem' }} />

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: '1.5rem',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid rgba(212,175,55,0.2)',
          }}
        >
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              style={{
                flex: 1,
                padding: '0.65rem',
                background: tab === t ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                color: tab === t ? 'var(--gold)' : 'rgba(245,240,232,0.4)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {t === 'login' ? '🔑 Sign In' : '📝 Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {tab === 'register' && (
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--gold)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
                USERNAME
              </label>
              <input
                id="username-input"
                className="input-royal"
                name="username"
                type="text"
                placeholder="Choose a username"
                value={form.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--gold)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
              EMAIL
            </label>
            <input
              id="email-input"
              className="input-royal"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--gold)', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
              PASSWORD
            </label>
            <input
              id="password-input"
              className="input-royal"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '0.6rem 0.9rem',
                background: 'rgba(139,0,0,0.2)',
                border: '1px solid rgba(192,57,43,0.5)',
                borderRadius: 6,
                color: '#e74c3c',
                fontSize: '0.82rem',
              }}
            >
              ⚠ {error}
            </div>
          )}

          <button
            id="auth-submit-btn"
            className="btn-royal"
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.25rem', padding: '0.75rem', fontSize: '0.9rem' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                {tab === 'login' ? 'Signing in...' : 'Registering...'}
              </span>
            ) : tab === 'login' ? (
              '⚔ Sign In'
            ) : (
              '👑 Create Account'
            )}
          </button>
        </form>

        {/* Google OAuth */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'rgba(245,240,232,0.3)',
              marginBottom: '0.75rem',
              letterSpacing: '0.1em',
            }}
          >
            — OR —
          </div>
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`}>
            <button
              className="btn-ghost"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <a href="/" style={{ color: 'rgba(245,240,232,0.4)', fontSize: '0.75rem', textDecoration: 'none' }}>
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
