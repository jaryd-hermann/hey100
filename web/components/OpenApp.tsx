import { APP_STORE_URL, appLink } from '@/lib/site';

export function storeUrl() {
  return APP_STORE_URL || 'https://apps.apple.com/search?term=hey100';
}

export function OpenApp({
  path,
  label = 'Get Hey100 on the App Store',
}: {
  path: string;
  label?: string;
}) {
  const store = storeUrl();
  return (
    <div className="cta">
      <a className="btn accent" href={store}>
        {label}
      </a>
      <a className="btn ghost" href={appLink(path)}>
        I already have the app
      </a>
    </div>
  );
}
