'use client';

import Link from 'next/link';

import { useIos } from '@/components/app/IosModal';
import { useMe } from '@/components/app/MeContext';
import { Wordmark } from '@/components/app/Wordmark';

const PERKS: [string, string][] = [
  ['Join premium groups', 'Get into groups with the strongest group power.'],
  ['Speed up your matches', 'Unlimited heys, keep chatting past 3/day'],
  ['Extra visibility. More audiences', 'Shown to more builders who fit your ideal users.'],
  ['No daily cooldowns', 'Skip the 6 views per day.'],
  ['List unlimited products', 'Free accounts can list one product.'],
  ['Pro insights & analytics', 'Fit sentiment, scroll depth, and an AI listing coach.'],
  ['AI assistant', 'Tips & advice based on top apps and builders'],
];

export function Paywall() {
  const me = useMe();
  const { openIos } = useIos();

  return (
    <div className="paywall-screen">
      <div className="paywall-brand">
        <Wordmark />
      </div>
      <Link href="/discover" className="paywall-close" aria-label="Close">
        ✕
      </Link>
      <div className="paywall-grid">
        <div className="paywall-copy">
          <div className="paywall-headline">
            <span>Join the Pro Community.</span>
            <span className="accent">Find your users faster</span>
            <span>Meet the top builders</span>
          </div>
          <div className="paywall-price">
            <strong>One plan only. Cancel whenever</strong>
            <div>
              <b>$18</b>
              <em>a month</em>
            </div>
          </div>
          {me.plan === 'pro' ? (
            <p className="muted">You are on Pro. It already applies on web.</p>
          ) : (
            <>
              <button className="btn-accent paywall-cta" type="button" onClick={openIos}>
                Start Pro · $18/mo
              </button>
              <Link href="/discover" className="paywall-free">
                Start free · 8 heys a day, 3 matches
              </Link>
              <div className="paywall-legal">
                <a href="/terms">Terms</a>
                <a href="/privacy">Privacy</a>
                <button type="button" onClick={openIos}>
                  Restore
                </button>
              </div>
            </>
          )}
        </div>
        <div className="paywall-perks">
          {PERKS.map(([title, body], i) => (
            <div key={title} className="paywall-perk">
              <span>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <strong>{title}</strong>
                <em>{body}</em>
              </div>
            </div>
          ))}
          <div className="paywall-invite">
            <p>
              <b>Or invite a builder to keep going.</b> Free · you both get +3 matches when they publish a listing.
            </p>
            <button type="button" onClick={openIos}>
              Share invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
