import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenApp, storeUrl } from '@/components/OpenApp';
import { builderByUsername, listingBySlug, type PublicApp, type PublicBuilder } from '@/lib/supabase';
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
  if (!data) {
    const profile = await builderByUsername(slug);
    if (!profile) return { title: 'Nothing here' };
    const name = profile.builder.username ? `@${profile.builder.username}` : 'Builder';
    return {
      title: name,
      description: 'Builder on Hey100',
      openGraph: { title: name, url: `${SITE}/${slug}` },
    };
  }
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
  if (!data) {
    const profile = await builderByUsername(slug);
    if (!profile) notFound();
    return <BuilderProfilePage slug={slug} profile={profile} />;
  }

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

      {data.app.description ? (
        <p className="muted" style={{ margin: '0 0 4px', fontSize: 15, lineHeight: 1.45 }}>
          {data.app.description}
        </p>
      ) : null}

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

function BuilderProfilePage({
  slug,
  profile,
}: {
  slug: string;
  profile: { builder: PublicBuilder; apps: PublicApp[] };
}) {
  const store = storeUrl();
  const handle = profile.builder.username ? `@${profile.builder.username}` : 'Builder';
  const role = [profile.builder.job, profile.builder.workplace].filter(Boolean).join(' · ');
  const bio = profile.builder.own_words?.bio;
  const interests = profile.builder.app_interests ?? [];

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

      <div className="builder-card" style={{ marginTop: 0 }}>
        {profile.builder.photo_url ? (
          <img className="avatar" src={profile.builder.photo_url} alt="" />
        ) : (
          <div className="avatar" style={{ background: hue(200) }}>
            {handle.replace(/^@/, '').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="mono" style={{ margin: 0, fontSize: 22 }}>
            {handle}
          </h1>
          {role ? (
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              {role}
            </p>
          ) : null}
        </div>
      </div>

      {bio ? (
        <section className="block">
          <p>{bio}</p>
        </section>
      ) : null}

      {interests.length ? (
        <section className="block">
          <p className="label">Apps I&apos;d try</p>
          <div className="chips">
            {interests.slice(0, 8).map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {profile.apps.length ? (
        <section className="block">
          <p className="label">Shipped apps</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {profile.apps.map((app) => {
              const icon = publicMediaUrl(app.icon_path);
              const href = app.slug ? `/${app.slug}` : store;
              return (
                <a
                  key={app.slug ?? app.name}
                  href={href}
                  className="builder-card"
                  style={{ margin: 0 }}
                >
                  {icon ? (
                    <img className="icon" src={icon} alt="" />
                  ) : (
                    <div className="icon" style={{ background: hue(app.hue) }}>
                      {app.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p style={{ margin: 0 }}>{app.name}</p>
                    {app.subtitle ? (
                      <p className="muted small" style={{ margin: '4px 0 0' }}>
                        {app.subtitle}
                      </p>
                    ) : null}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      <OpenApp path={slug} label="Open in Hey100" />
    </>
  );
}
