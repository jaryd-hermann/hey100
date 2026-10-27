import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import { ONBOARDED_KEY } from '@/lib/authStorage';
import { logoutOneSignal } from '@/lib/onesignal';
import { logoutPurchases } from '@/lib/purchases';
import { getSupabase } from '@/lib/supabase';

export type AuthProviderId = 'Apple' | 'Google' | 'GitHub';

/**
 * Literal rather than built with `Linking.createURL`, which returns a
 * triple-slash form in a dev client. This exact string is what has to be on the
 * Supabase redirect allow list.
 */
const REDIRECT_URL = 'hey100://auth/callback';

export type SignInOutcome =
  | { status: 'signed-in'; userId: string; fullName?: string; photo?: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

/**
 * Google and GitHub both hand over an avatar, under different keys. Taking it
 * here means most accounts have a photo before anyone is asked for one.
 */
function photoFrom(metadata: Record<string, unknown> | undefined): string | undefined {
  const url = metadata?.avatar_url ?? metadata?.picture;
  return typeof url === 'string' && url ? url : undefined;
}

/** Thrown for failures worth showing the user; cancellation is not one. */
export class SignInError extends Error {}

export async function signIn(provider: AuthProviderId): Promise<SignInOutcome> {
  const db = getSupabase();
  if (!db) return { status: 'unavailable' };

  return provider === 'Apple' ? signInWithApple() : signInWithBrowser(provider);
}

const MIN_PASSWORD = 6;

export function emailLooksOk(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function passwordLooksOk(value: string): boolean {
  return value.length >= MIN_PASSWORD;
}

/** Email + password. Secondary to Apple / Google / GitHub. */
export async function signUpWithPassword(email: string, password: string): Promise<SignInOutcome> {
  const db = getSupabase();
  if (!db) return { status: 'unavailable' };

  const { data, error } = await db.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new SignInError(friendlyAuthError(error.message));
  if (!data.user) throw new SignInError('Sign up did not return a user');
  if (!data.session) {
    throw new SignInError('Check your email to confirm your account, then log in.');
  }

  return { status: 'signed-in', userId: data.user.id };
}

export async function signInWithPassword(email: string, password: string): Promise<SignInOutcome> {
  const db = getSupabase();
  if (!db) return { status: 'unavailable' };

  const { data, error } = await db.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new SignInError(friendlyAuthError(error.message));
  if (!data.user) throw new SignInError('Log in did not return a user');

  return {
    status: 'signed-in',
    userId: data.user.id,
    fullName:
      typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : undefined,
    photo: photoFrom(data.user.user_metadata),
  };
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'That email already has an account. Log in instead.';
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Email or password is wrong.';
  }
  return message;
}

async function signInWithApple(): Promise<SignInOutcome> {
  const db = getSupabase()!;

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return { status: 'cancelled' };
    }
    throw error;
  }

  if (!credential.identityToken) throw new SignInError('Apple did not return a token');

  const { data, error } = await db.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw new SignInError(error.message);
  if (!data.user) throw new SignInError('Sign in did not return a user');

  // Apple hands over the name only on the very first authorization, so if it is
  // here it has to be kept now or it is gone for good.
  const { givenName, familyName } = credential.fullName ?? {};
  const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();

  return {
    status: 'signed-in',
    userId: data.user.id,
    fullName: fullName || undefined,
    photo: photoFrom(data.user.user_metadata),
  };
}

async function signInWithBrowser(provider: 'Google' | 'GitHub'): Promise<SignInOutcome> {
  const db = getSupabase()!;

  const { data, error } = await db.auth.signInWithOAuth({
    provider: provider === 'Google' ? 'google' : 'github',
    options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error) throw new SignInError(error.message);
  if (!data.url) throw new SignInError('No authorization URL to open');

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
  if (result.type !== 'success') return { status: 'cancelled' };

  return sessionFromRedirect(result.url);
}

/**
 * The client uses the implicit flow, so the provider sends the tokens back in
 * the URL fragment and the session has to be installed by hand.
 */
async function sessionFromRedirect(url: string): Promise<SignInOutcome> {
  const db = getSupabase()!;

  const [, fragment = ''] = url.split('#');
  const params = new URLSearchParams(fragment);

  const errorDescription = params.get('error_description') ?? params.get('error');
  if (errorDescription) throw new SignInError(errorDescription);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) throw new SignInError('No session in the callback');

  const { data, error } = await db.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new SignInError(error.message);
  if (!data.user) throw new SignInError('Sign in did not return a user');

  const name = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name;

  return {
    status: 'signed-in',
    userId: data.user.id,
    fullName: typeof name === 'string' && name ? name : undefined,
    photo: photoFrom(data.user.user_metadata),
  };
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDED_KEY).catch(() => {});
  logoutOneSignal();
  void logoutPurchases();
  const db = getSupabase();
  if (db) await db.auth.signOut();
}
