import type { Metadata } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'hey100', template: '%s · hey100' },
  description:
    'Hey100 is like a dating app for your product. Match with other devs who are also building things. Try each other\'s apps, chat, share feedback.',
  openGraph: { siteName: 'hey100', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&family=Titan+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="page">
          <a className="brand" href="/">
            <mark>hey100</mark>
            <span>talk to 100 people who want your app</span>
          </a>
          {children}
        </div>
      </body>
    </html>
  );
}
