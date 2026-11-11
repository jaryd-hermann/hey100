const CLIENT_ID = 'https://hey100.com/oauth/posthog';

/** PostHog fetches this document during sign-in. The client_id is the URL itself. */
export function GET() {
  const body = {
    client_id: CLIENT_ID,
    client_name: 'Hey100',
    logo_uri: 'https://hey100.com/assets/icon-512.png',
    redirect_uris: [
      'https://hzlqxemxbiijzwmnfkfm.supabase.co/functions/v1/listing-connect/posthog/callback',
    ],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    'com.posthog': {
      scopes: ['project:read', 'query:read'],
    },
  };
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
