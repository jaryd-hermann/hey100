import { APP_STORE_URL, appLink } from '@/lib/site';

export function OpenApp({
  path,
  label = 'Open in hey100',
}: {
  path: string;
  label?: string;
}) {
  const store = APP_STORE_URL || 'https://apps.apple.com/search?term=hey100';
  return (
    <div className="cta">
      <a className="btn accent" href={appLink(path)}>
        {label}
      </a>
      <a className="btn surface" href={store}>
        Get the app
      </a>
    </div>
  );
}
