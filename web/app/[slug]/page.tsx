import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenApp } from '@/components/OpenApp';
import { listingBySlug } from '@/lib/supabase';
import { publicMediaUrl, RESERVED, SITE } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

function hue(n: number) {
  return `hsl(${n} 42% 28%)`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED.has(slug.toLowerCase())) return {};
  const data = await listingBySlug(slug);
  if (!data) return { title: 'Nothing here' };
  const title = data.app.name;
  const description = data.app.subtitle || 'Listed on hey100';
  const image = publicMediaUrl(data.app.cover_path ?? data.app.icon_path);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/${slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED.has(slug.toLowerCase())) notFound();
  const data = await listingBySlug(slug);
  if (!data) notFound();

  const icon = publicMediaUrl(data.app.icon_path);
  const cover = publicMediaUrl(data.app.cover_path);
  const initial = data.app.name.slice(0, 1).toUpperCase();

  return (
    <>
      {cover ? (
        <img
          src={cover}
          alt=""
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 16, marginBottom: 18 }}
        />
      ) : null}

      <div className="card">
        <div className="row">
          {icon ? (
            <img className="icon" src={icon} alt="" />
          ) : (
            <div className="icon" style={{ background: hue(data.app.hue) }}>
              {initial}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>{data.app.name}</h1>
            <p className="muted small" style={{ margin: 0 }}>
              {data.app.subtitle}
            </p>
            {data.builder?.real_name ? (
              <p className="muted small" style={{ margin: '6px 0 0' }}>
                by {data.builder.real_name}
                {data.builder.username ? ` · @${data.builder.username}` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <div className="chips">
          {data.app.stage ? <span className="chip">{data.app.stage}</span> : null}
          {data.app.category ? <span className="chip">{data.app.category}</span> : null}
          {data.app.problem_for ? <span className="chip">{data.app.problem_for}</span> : null}
        </div>
      </div>

      {data.prompts.length ? (
        <div className="prompts">
          {data.prompts.map((p) => (
            <div className="prompt" key={p.slot}>
              <q>{p.label}</q>
              <p>{p.answer}</p>
            </div>
          ))}
        </div>
      ) : null}

      <OpenApp path={`l/${data.app.slug}`} label="Open listing" />
    </>
  );
}
