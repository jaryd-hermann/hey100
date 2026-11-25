import { NextResponse, type NextRequest } from 'next/server';

/** Serve the static marketing and legal pages. Invite routes stay in the App Router. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/' || pathname.startsWith('/w/')) {
    return NextResponse.rewrite(new URL('/landing.html', req.url));
  }
  if (pathname === '/privacy' || pathname === '/terms') {
    return NextResponse.rewrite(new URL(`${pathname}.html`, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/w/:code*', '/privacy', '/terms'],
};
