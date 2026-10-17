import { getSupabase } from '@/lib/supabase';

import { INVITERS, VALID_INVITE_CODES } from '@/features/onboarding/steps';

export type InviteStatus = { valid: boolean; inviter: string | null };

function mockStatus(code: string): InviteStatus {
  const normalized = code.trim().toUpperCase();
  const valid = VALID_INVITE_CODES.includes(normalized);
  return { valid, inviter: valid ? (INVITERS[normalized] ?? 'a builder') : null };
}

/**
 * Runs before the user has an account, so it only ever answers "can this code
 * still be used, and who gets the credit". The code list is never readable.
 */
export async function checkInviteCode(code: string): Promise<InviteStatus> {
  const db = getSupabase();
  if (!db) return mockStatus(code);

  const { data, error } = await db.rpc('invite_code_status', { p_code: code });
  if (error) throw error;

  const result = (data ?? {}) as Partial<InviteStatus>;
  return { valid: result.valid === true, inviter: result.inviter ?? null };
}

export type RedeemResult = { redeemed: boolean; reason?: string };

/**
 * Claimed after sign-in rather than at step 1, because an account has to exist
 * before a redemption can be attributed to it. Safe to call twice: the server
 * reports `already_redeemed` instead of double-counting.
 */
export async function redeemInvite(code: string): Promise<RedeemResult> {
  const db = getSupabase();
  if (!db) return { redeemed: true };

  const { data, error } = await db.rpc('redeem_invite', { p_code: code });
  if (error) throw error;

  return (data ?? { redeemed: false }) as RedeemResult;
}
