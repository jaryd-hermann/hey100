import { NextResponse } from 'next/server';

import { AUTH_NEXT_COOKIE, nextFromCookie, safeNext } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next') ?? nextFromCookie(request.headers.get('cookie')));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const fail = new URL('/login', url.origin);
      fail.searchParams.set('error', 'Could not finish sign in. Try again.');
      const response = NextResponse.redirect(fail);
      response.cookies.delete(AUTH_NEXT_COOKIE);
      return response;
    }
  }

  const dest = new URL(next, url.origin);
  dest.searchParams.set('welcome', '1');
  const response = NextResponse.redirect(dest);
  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
