import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { MeProvider } from '@/components/app/MeContext';
import { PostHog } from '@/components/app/PostHog';
import { Shell } from '@/components/app/Shell';
import { loadMe } from '@/lib/me';

import './app.css';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await loadMe();
  const path = (await headers()).get('x-pathname') ?? '/discover';
  if (!me) redirect(`/login?next=${encodeURIComponent(path.startsWith('/') ? path : '/discover')}`);

  return (
    <MeProvider me={me}>
      <PostHog userId={me.id} />
      <Shell>{children}</Shell>
    </MeProvider>
  );
}
