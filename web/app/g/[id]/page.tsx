import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenApp, storeUrl } from '@/components/OpenApp';
import { groupById } from '@/lib/supabase';
import { publicMediaUrl, SITE } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };

export const revalidate = 60;

const JOIN: Record<string, string> = {
  open: 'Anyone can join',
  request: 'Request to join',
  criteria: 'Match criteria',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await groupById(id);
  if (!data) return { title: 'Nothing here' };
  const image = publicMediaUrl(data.cover_path);
  return {
    title: data.name,
    description: data.bio ?? 'A hey100 group',
    openGraph: {
      title: data.name,
      description: data.bio ?? undefined,
      url: `${SITE}/g/${id}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params;
  const data = await groupById(id);
  if (!data) notFound();
  const store = storeUrl();
  const cover = publicMediaUrl(data.cover_path);
  const members = `${data.member_count.toLocaleString()} member${data.member_count === 1 ? '' : 's'}`;

  return (
    <>
      <a className="install-bar" href={store}>
        <span className="install-mark">✋</span>
        <span className="install-copy">
          <strong>Hey100</strong>
          <em>Find your first 100 users</em>
        </span>
        <span className="install-get">Get</span>
      </a>

      <a className="listing-head" href={store}>
        {cover ? (
          <img className="group-cover" src={cover} alt="" />
        ) : (
          <div className="group-cover fallback">{data.name.slice(0, 1).toUpperCase()}</div>
        )}
        <div className="group-copy">
          <h1 className="mono">{data.name}</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {data.audience || data.bio}
          </p>
        </div>
      </a>

      <div className="chips">
        <span className="chip">{JOIN[data.join_mode] ?? data.join_mode}</span>
        <span className="chip">{members}</span>
      </div>

      {data.bio ? <p className="lede">{data.bio}</p> : null}

      <OpenApp path={`group/${data.id}`} label="Join group" />
    </>
  );
}
