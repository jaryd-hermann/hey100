import { redirect } from 'next/navigation';

import { LoginForm } from '@/app/login/LoginForm';
import { createClient } from '@/lib/supabase/server';

import './login.css';

export const dynamic = 'force-dynamic';

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/discover';
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  const next = safeNext(params.next);
  if (user) redirect(next);
  return <LoginForm next={next} error={params.error ?? null} />;
}
