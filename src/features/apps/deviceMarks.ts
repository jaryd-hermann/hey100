import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const DEVICE_MARKS: Record<string, IconName> = {
  'iPhone (iOS)': 'logo-apple',
  iPhone: 'logo-apple',
  iOS: 'logo-apple',
  iPad: 'logo-apple',
  Mac: 'logo-apple',
  Windows: 'logo-windows',
  Web: 'logo-chrome',
  'Apple Watch': 'watch',
};

export function deviceMark(label: string): IconName | undefined {
  const trimmed = label.trim();
  if (DEVICE_MARKS[trimmed]) return DEVICE_MARKS[trimmed];
  const hit = Object.keys(DEVICE_MARKS).find((key) =>
    trimmed.toLowerCase().includes(key.toLowerCase()),
  );
  return hit ? DEVICE_MARKS[hit] : undefined;
}

/** App Review rejects names of other mobile stores in the iOS app. */
export function isOtherMobilePlatform(label: string): boolean {
  const value = label.toLowerCase();
  return value.includes('android') || value.includes('google play') || value.includes('play store');
}

export function splitList(value?: string): string[] {
  return (value ?? '')
    .split(/[,·|/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
