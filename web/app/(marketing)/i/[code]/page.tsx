import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenApp } from '@/components/OpenApp';
import { inviteStatus } from '@/lib/supabase';
import { SITE } from '@/lib/site';

type Props = { params: Promise<{ code: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await inviteStatus(code);
  if (!data?.valid) return { title: 'Nothing here' };
  const who = data.inviter ? `${data.inviter} invited you` : 'You have an invite';
  return {
    title: who,
    description: 'Join hey100 with this invite.',
    openGraph: { title: who, url: `${SITE}/i/${code}` },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const data = await inviteStatus(code);
  if (!data?.valid) notFound();

  return (
    <>
      <h1>{data.inviter ? `${data.inviter} invited you` : 'You have an invite'}</h1>
      <p className="lede">
        Open hey100 to claim this code. If you don&apos;t have the app yet, get it first — the invite
        will still be here.
      </p>
      <p className="code">{code.toUpperCase()}</p>
      <OpenApp path={`invite/${code}`} />
    </>
  );
}
