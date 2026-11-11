'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useIos } from '@/components/app/IosModal';
import { useMe } from '@/components/app/MeContext';
import { useDevMode } from '@/lib/devMode';
import { createClient } from '@/lib/supabase/client';

const THEMES = [
  { id: 'system', label: 'System', bg: '#1a1c1a', ink: '#8e968f', card: '#232825' },
  { id: 'light', label: 'Light', bg: '#f4f5f2', ink: '#121412', card: '#fff' },
  { id: 'dark', label: 'Dark', bg: '#0e100f', ink: '#e8ece7', card: '#171a18' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

export function Settings() {
  const me = useMe();
  const { openIos } = useIos();
  const { devMode, setDevMode } = useDevMode();
  const [theme, setTheme] = useState<ThemeId>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem('hey100.theme') as ThemeId | null;
    if (stored) setTheme(stored);
  }, []);

  const pick = (id: ThemeId) => {
    setTheme(id);
    window.localStorage.setItem('hey100.theme', id);
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <div>
        <span className="eyebrow">Appearance</span>
        <div className="theme-tiles">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`theme-tile${theme === item.id ? ' is-on' : ''}`}
              onClick={() => pick(item.id)}
            >
              <div className="theme-preview" style={{ background: item.bg }}>
                <span style={{ width: '70%', background: item.card }} />
                <span style={{ width: '40%', background: item.ink }} />
              </div>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Link className="settings-row" href="/pro">
        <div>
          Subscription
          <span>{me.plan === 'pro' ? 'Pro' : 'Free · $18/mo on iOS'}</span>
        </div>
      </Link>
      <button className="settings-row" type="button" onClick={openIos}>
        <div>
          Notifications
          <span>Manage push on iOS</span>
        </div>
      </button>
      <button className="settings-row" type="button" onClick={openIos}>
        <div>
          Connected accounts
          <span>GitHub, Google, Apple</span>
        </div>
      </button>
      <Link className="settings-row" href="/profile">
        <div>
          Account
          <span>{me.username ? `@${me.username}` : me.email}</span>
        </div>
      </Link>
      <a className="settings-row" href="mailto:hello@hey100.com">
        <div>
          Support
          <span>hello@hey100.com</span>
        </div>
      </a>
      <button className="settings-row" type="button" onClick={openIos}>
        <div>
          Get the iOS app
          <span>Scan a QR and pick up where you left off</span>
        </div>
      </button>
      {me.isAdmin ? (
        <button className="settings-row" type="button" onClick={() => setDevMode(!devMode)}>
          <div>
            Dev mode
            <span>Fill Community and Feedback with sample content for QA.</span>
          </div>
          <b>{devMode ? 'On' : 'Off'}</b>
        </button>
      ) : null}
      <a className="settings-row" href="/privacy">
        Privacy
      </a>
      <a className="settings-row" href="/terms">
        Terms
      </a>
      <button
        className="btn-line"
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          window.location.href = '/login';
        }}
      >
        Sign out
      </button>
    </div>
  );
}
