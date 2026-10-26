import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenApp } from '@/components/OpenApp';
import { groupById } from '@/lib/supabase';
import { publicMediaUrl, SITE } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };

export const revalidate = 60;

const JOIN: Record<string, string> = {
  open: 'Open to join',
  request: 'Request to join',
  criteria: 'Criteria to join',
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
  const cover = publicMediaUrl(data.cover_path);

  return (
    <>
      {cover ? (
        <img
          src={cover}
          alt=""
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 16, marginBottom: 18 }}
        />
      ) : null}
      <h1>{data.name}</h1>
      <p className="lede">{data.bio ?? data.audience ?? 'A group on hey100.'}</p>
      <div className="chips">
        <span className="chip">{JOIN[data.join_mode] ?? data.join_mode}</span>
        <span className="chip">
          {data.member_count} member{data.member_count === 1 ? '' : 's'}
        </span>
      </div>
      <OpenApp path={`group/${data.id}`} label="Open group" />
    </>
  );
}
