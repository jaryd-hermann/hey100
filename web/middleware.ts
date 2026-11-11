import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/** Serve the static marketing and legal pages. Listing/invite/group routes stay in the App Router. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/' || pathname.startsWith('/w/')) {
    return NextResponse.rewrite(new URL('/landing.html', req.url));
  }
  // Static legal pages. These must be rewritten here: app/[slug] would otherwise
  // match /privacy and /terms and try to resolve them as listings.
  if (pathname === '/privacy' || pathname === '/terms') {
    return NextResponse.rewrite(new URL(`${pathname}.html`, req.url));
  }
  const res = await updateSession(req);
  res.headers.set('x-pathname', pathname);
  return res;
}

export const config = {
  matcher: [
    '/',
    '/w/:code*',
    '/privacy',
    '/terms',
    '/login',
    '/auth/:path*',
    '/discover',
    '/heys',
    '/chat',
    '/chat/:path*',
    '/community',
    '/community/:path*',
    '/feedback',
    '/assistant',
    '/apps',
    '/pro',
    '/profile',
    '/settings',
    '/tools',
  ],
};
