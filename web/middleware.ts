import { NextResponse, type NextRequest } from 'next/server';

/** Serve the original marketing page at / and /w/:code. Listing/invite/group routes stay in the App Router. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/' || pathname.startsWith('/w/')) {
    return NextResponse.rewrite(new URL('/landing.html', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/w/:code'],
};
