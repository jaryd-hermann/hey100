'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { IconPhone } from '@/components/app/Icons';
import { useIos } from '@/components/app/IosModal';
import { VerifiedBadge } from '@/components/app/Marks';
import { useMe } from '@/components/app/MeContext';
import { NavKeys } from '@/components/app/Shortcuts';
import {
  AppsIcon,
  AssistantIcon,
  ChatIcon,
  CommunityIcon,
  DiscoverIcon,
  FeedbackIcon,
  HeysIcon,
  ToolsIcon,
} from '@/components/app/TabIcons';
import { Wordmark } from '@/components/app/Wordmark';
import { createClient } from '@/lib/supabase/client';

const ITEMS = [
  { href: '/discover', label: 'Discover', Icon: DiscoverIcon },
  { href: '/heys', label: 'Heys', Icon: HeysIcon },
  { href: '/chat', label: 'Chat', Icon: ChatIcon },
  { href: '/community', label: 'Community', Icon: CommunityIcon },
  { href: '/feedback', label: 'Feedback', Icon: FeedbackIcon },
  { href: '/assistant', label: 'Assistant', Icon: AssistantIcon },
  { href: '/apps', label: 'My apps', Icon: AppsIcon },
] as const;

export function Nav({ onOpenKeys }: { onOpenKeys: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const me = useMe();
  const { openIos } = useIos();
  const counters = me.counters;
  const used = counters?.heys_today ?? 0;
  const cap = counters?.plan === 'pro' ? used : used + (counters?.heys_left ?? 0);
  const slots = counters?.plan === 'pro' ? 8 : Math.max(cap, 8);
  const handle = me.username ? `@${me.username}` : me.realName || me.email || 'You';

  return (
    <aside className="nav-rail">
      <div className="nav-brand">
        <Wordmark />
        <button className="ios-cta" type="button" onClick={openIos}>
          <span className="ios-glyph">
            <IconPhone size={16} />
          </span>
          <span>
            <strong>Get the iOS app</strong>
            <em>Scan to download</em>
          </span>
        </button>
      </div>
      <nav className="nav-list">
        {ITEMS.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              className={`nav-item${active ? ' is-active' : ''}`}
              href={item.href}
              title={item.label}
            >
              <item.Icon size={22} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <span className="nav-kicker">Builder Profiler</span>
        <button
          className={`nav-profile${path.startsWith('/profile') ? ' is-active' : ''}`}
          type="button"
          onClick={() => router.push('/profile')}
        >
          {me.photoUrl ? (
            <img src={me.photoUrl} alt="" />
          ) : (
            <span className="nav-user-fallback">
              {(me.username || me.realName || 'Y').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <strong>
              {handle}
              {me.verified ? <VerifiedBadge /> : null}
            </strong>
            <em>
              {me.karma} Block Points
              {me.verified ? ' · Verified' : ''}
            </em>
          </div>
        </button>

        <Link className={`nav-item${path.startsWith('/settings') ? ' is-active' : ''}`} href="/settings" title="Settings">
          <span className="nav-gear">⚙</span>
          <span>Settings</span>
        </Link>
        <Link className={`nav-item${path.startsWith('/tools') ? ' is-active' : ''}`} href="/tools" title="Builder Tools">
          <ToolsIcon size={22} active={path.startsWith('/tools')} />
          <span>Builder Tools</span>
        </Link>
      </nav>

      <div className="nav-foot">
        <NavKeys onOpen={onOpenKeys} />

        <div className="quota">
          <div className="quota-row">
            <span>
              Heys today{' '}
              <b>
                {used}/{counters?.plan === 'pro' ? '∞' : cap}
              </b>
            </span>
            {me.plan !== 'pro' ? (
              <Link className="quota-pro" href="/pro">
                Go Pro
              </Link>
            ) : (
              <span>Pro</span>
            )}
          </div>
          <div className="quota-pips" style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
            {Array.from({ length: slots }, (_, i) => (
              <span key={i} className={i < used ? 'is-on' : undefined} />
            ))}
          </div>
        </div>

        <button
          className="sign-out"
          type="button"
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = '/login';
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
