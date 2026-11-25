import { router } from 'expo-router';
import { ActionSheetIOS, Alert, Linking } from 'react-native';

import { signOut } from '@/features/auth/signIn';
import { getSupabase } from '@/lib/supabase';

/**
 * Removes the account and everything it owns: profile, product, revenue
 * secrets, memberships and media. Message rows are emptied rather than
 * removed so other people's replies keep their thread.
 */
export async function deleteAccount(): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('Not configured');

  const { error } = await db.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;

  await signOut();
}

export async function logOut(): Promise<void> {
  await signOut();
  router.replace('/welcome');
}

const MANAGE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';

/** Apple 5.1.1(v): deletion must be reachable without a purchase. */
export function confirmDeleteAccount(): void {
  Alert.alert(
    'Delete your account?',
    'This removes your profile, product, revenue connection, group memberships, and everything you posted, including answers, messages and media. This cannot be undone.\n\nAn App Store subscription is not cancelled automatically. Cancel it in Manage subscriptions.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Manage subscriptions', onPress: () => void Linking.openURL(MANAGE_SUBSCRIPTIONS) },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: () => {
          deleteAccount()
            .then(() => router.replace('/welcome'))
            .catch(() => Alert.alert('Could not delete your account', 'Check your connection and try again.'));
        },
      },
    ],
  );
}

/** The `···` menu on onboarding and the paywall. */
export function openAccountMenu(): void {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: ['Log out', 'Delete account', 'Cancel'],
      destructiveButtonIndex: 1,
      cancelButtonIndex: 2,
    },
    (index) => {
      if (index === 0) void logOut();
      if (index === 1) confirmDeleteAccount();
    },
  );
}
