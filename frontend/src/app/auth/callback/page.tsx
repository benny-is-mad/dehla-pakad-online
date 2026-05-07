'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokenAndUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    // Fetch user from backend using the token
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(({ user }) => {
        setTokenAndUser(token, user);
        router.replace('/lobby');
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router, searchParams, setTokenAndUser]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--navy)',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="spinner" />
      <div
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--gold)',
          fontSize: '0.85rem',
          letterSpacing: '0.1em',
        }}
      >
        Signing you in...
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--navy)' }} />}>
      <CallbackContent />
    </Suspense>
  );
}
