/**
 * RevenueCat → profiles.plan. The client cannot write plan; this is what
 * actually lifts hey / match / listing limits after a purchase.
 *
 * Auth is REVENUECAT_WEBHOOK_SECRET in the Authorization header.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GRANT = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

const REVOKE = new Set(['EXPIRATION', 'REFUND']);

type Event = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  transferred_from?: string[];
  transferred_to?: string[];
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

function admin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function authorized(req: Request): boolean {
  const secret = env('REVENUECAT_WEBHOOK_SECRET');
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  return token === secret;
}

function asUserId(value: string | undefined): string | null {
  return value && UUID.test(value) ? value : null;
}

function expiresAt(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;
  return new Date(ms).toISOString();
}

function hasPro(event: Event): boolean {
  const ids = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
  return ids.includes('pro');
}

async function setPlan(userId: string, plan: 'free' | 'pro', expires: string | null) {
  const { error } = await admin()
    .from('profiles')
    .update({ plan, plan_expires_at: expires })
    .eq('id', userId);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!authorized(req)) return json({ error: 'unauthorized' }, 401);

  let event: Event;
  try {
    const body = (await req.json()) as { event?: Event };
    event = body.event ?? {};
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const type = event.type ?? '';
  const userId = asUserId(event.app_user_id) ?? asUserId(event.original_app_user_id);
  const expires = expiresAt(event.expiration_at_ms);

  try {
    if (type === 'TRANSFER') {
      for (const id of event.transferred_from ?? []) {
        const from = asUserId(id);
        if (from) await setPlan(from, 'free', null);
      }
      for (const id of event.transferred_to ?? []) {
        const to = asUserId(id);
        if (to) await setPlan(to, 'pro', expires);
      }
      return json({ ok: true, type });
    }

    if (!userId) return json({ ok: true, skipped: 'anonymous' });

    if (REVOKE.has(type)) {
      await setPlan(userId, 'free', expires);
      return json({ ok: true, type, plan: 'free' });
    }

    if (GRANT.has(type) && hasPro(event)) {
      await setPlan(userId, 'pro', expires);
      return json({ ok: true, type, plan: 'pro' });
    }

    return json({ ok: true, ignored: type });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'update_failed';
    return json({ error: message }, 500);
  }
});
