'use client';

import { useState } from 'react';

import { captureEvent } from '@/lib/analytics';
import { AUTH_NEXT_COOKIE } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';

function rememberNext(next: string) {
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax`;
}

export function LoginForm({ next, error }: { next: string; error: string | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState(error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);

  async function oauth(provider: 'google' | 'github') {
    setBusy(provider);
    setMessage(null);
    rememberNext(next);
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setBusy(null);
      setMessage(err.message);
    }
  }

  async function withEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy('email');
    setMessage(null);
    const { error: err } = await createClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) {
      setBusy(null);
      setMessage(err.message);
      return;
    }
    captureEvent('logged_in', { provider: 'email' });
    window.location.href = next;
  }

  return (
    <div className="login">
      <section className="login-story">
        <span className="wordmark-mark">100</span>
        <div>
          <h1>
            Building is now the easy part.
            <br />
            <em>Finding users is what&apos;s hard.</em>
          </h1>
          <p>Find your first 100 users. It&apos;s a match-making app with other developers.</p>
        </div>
        <div className="login-faces">
          <span style={{ background: 'oklch(0.55 0.1 300)' }} />
          <span style={{ background: 'oklch(0.6 0.12 230)' }} />
          <span style={{ background: 'oklch(0.58 0.12 150)' }} />
          <small>Builders trading feedback this week</small>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Log in with the account you used on iOS.</p>

          {message ? <p className="login-error">{message}</p> : null}

          <div className="login-stack">
            <button
              className="btn-ink"
              type="button"
              onClick={() =>
                setMessage('Apple sign-in is on iOS for now. Use Google, GitHub, or email here.')
              }
            >
              Continue with Apple
            </button>
            <button className="btn-line" type="button" disabled={!!busy} onClick={() => oauth('google')}>
              {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
            </button>
            <button className="btn-line" type="button" disabled={!!busy} onClick={() => oauth('github')}>
              {busy === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}
            </button>
          </div>

          <div className="login-or">
            <span />
            {emailOpen ? 'Email' : 'New here'}
            <span />
          </div>

          {emailOpen ? (
            <form className="login-stack" onSubmit={withEmail}>
              <input
                className="login-input"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="login-input"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
              <button className="btn-line" type="submit" disabled={!!busy}>
                {busy === 'email' ? 'Signing in…' : 'Log in with email'}
              </button>
            </form>
          ) : (
            <div className="invite-card">
              <div>
                <strong>Have an invite code?</strong>
                <span>Hey100 is invite-only right now</span>
              </div>
              <button className="invite-go" type="button" onClick={() => setEmailOpen(true)}>
                Email
              </button>
            </div>
          )}

          <p className="login-legal">
            By continuing you agree to the <a href="/terms">Terms</a> and{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
