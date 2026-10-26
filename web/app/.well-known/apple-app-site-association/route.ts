import { APPLE_TEAM_ID, BUNDLE_ID } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const appID = APPLE_TEAM_ID ? `${APPLE_TEAM_ID}.${BUNDLE_ID}` : BUNDLE_ID;
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [appID],
          components: [
            { '/': '/.well-known/*', exclude: true },
            { '/': '/badge/*', exclude: true },
            { '/': '/', exclude: true },
            { '/': '/i/*', comment: 'invites' },
            { '/': '/g/*', comment: 'groups' },
            { '/': '/l/*', comment: 'listings via app path' },
            { '/': '/*', comment: 'public listings' },
          ],
        },
      ],
    },
    ...(APPLE_TEAM_ID ? { webcredentials: { apps: [`${APPLE_TEAM_ID}.${BUNDLE_ID}`] } } : {}),
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
