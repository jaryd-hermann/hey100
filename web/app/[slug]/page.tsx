import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenApp, storeUrl } from '@/components/OpenApp';
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

  const store = storeUrl();
  const icon = publicMediaUrl(data.app.icon_path);
  const pitch = publicMediaUrl(data.app.pitch_path);
  const initial = data.app.name.slice(0, 1).toUpperCase();
  const builder = data.builder?.real_name || (data.builder?.username ? `@${data.builder.username}` : null);
  const seconds = data.app.pitch_seconds ?? 0;
  const length = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const shots = [...data.media].sort((a, b) => a.position - b.position);
  const vertical = (data.app.shot_layout ?? 'vertical') === 'vertical';
  const chips = [data.app.category, data.app.platform, data.app.stage].filter(Boolean) as string[];

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

      {pitch ? (
        <a className="pitch-card" href={store} style={{ marginTop: 0 }}>
          <video
            className="pitch-thumb"
            src={pitch}
            muted
            playsInline
            preload="metadata"
          />
          <div>
            <p className="label">Quick pitch</p>
            <p className="pitch-title">
              Watch {builder ? builder.split(' ')[0] : 'this builder'}&apos;s quick pitch
            </p>
            {seconds ? <p className="muted small">{length}</p> : null}
          </div>
        </a>
      ) : null}

      <a className="listing-head" href={store}>
        {icon ? (
          <img className="icon" src={icon} alt="" />
        ) : (
          <div className="icon" style={{ background: hue(data.app.hue) }}>
            {initial}
          </div>
        )}
        <div>
          <h1 className="mono">{data.app.name}</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {data.app.subtitle}
          </p>
        </div>
      </a>

      <div className="chips">
        {chips.map((chip) => (
          <span className="chip" key={chip}>
            {chip}
          </span>
        ))}
        {data.app.store_rating != null ? (
          <span className="chip">★ {data.app.store_rating.toFixed(1)}</span>
        ) : null}
      </div>

      {shots.length ? (
        <section className="block">
          <p className="label">Screenshots</p>
          <div className={`shots ${vertical ? 'vertical' : 'horizontal'}`}>
            {shots.map((shot) => {
              const src = publicMediaUrl(shot.storage_path);
              if (!src) return null;
              return shot.kind === 'video' ? (
                <video key={shot.storage_path} src={src} muted playsInline preload="metadata" />
              ) : (
                <img key={shot.storage_path} src={src} alt={shot.label ?? ''} />
              );
            })}
          </div>
        </section>
      ) : null}

      {data.app.problem_of || data.app.problem_for ? (
        <section className="block">
          <p className="label">The problem</p>
          <p>
            {data.app.problem_of ? <strong>{data.app.problem_of}</strong> : null}
            {data.app.problem_of && data.app.problem_for ? ' for ' : null}
            {data.app.problem_for ?? null}
          </p>
        </section>
      ) : null}

      {data.app.pricing_model ? (
        <section className="block">
          <p className="label">Pricing</p>
          <p>
            {data.app.pricing_model}
            {data.app.price_from ? ` · from ${data.app.price_from}` : ''}
          </p>
        </section>
      ) : null}

      {data.prompts.length ? (
        <div className="prompts">
          {data.prompts.map((p) => (
            <a className="prompt" href={store} key={p.slot}>
              <q>{p.label}</q>
              <p>{p.answer}</p>
            </a>
          ))}
        </div>
      ) : null}

      {builder ? (
        <a className="builder-card" href={store}>
          {data.builder?.photo_url ? (
            <img className="avatar" src={data.builder.photo_url} alt="" />
          ) : (
            <div className="avatar" style={{ background: hue(data.app.hue) }}>
              {builder.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="label">Builder</p>
            <p>{builder}</p>
          </div>
        </a>
      ) : null}

      <OpenApp path={`l/${data.app.slug}`} label="Get the app to Hey this listing" />
    </>
  );
}
