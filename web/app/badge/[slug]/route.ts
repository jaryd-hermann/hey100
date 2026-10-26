import { listingBySlug } from '@/lib/supabase';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params;
  const slug = raw.replace(/\.svg$/i, '');
  const data = await listingBySlug(slug);
  const name = escapeXml((data?.app.name ?? slug).slice(0, 28));
  const label = 'hey100';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="36" role="img" aria-label="${label}: ${name}">
  <rect width="220" height="36" rx="8" fill="#0e100f"/>
  <rect x="1" y="1" width="218" height="34" rx="7" fill="none" stroke="#b2ea5c" stroke-width="1.5"/>
  <rect x="6" y="6" width="62" height="24" rx="6" fill="#b2ea5c"/>
  <text x="37" y="23" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="700" fill="#0e100f">${label}</text>
  <text x="142" y="23" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="#e8ece7">${name}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
}
