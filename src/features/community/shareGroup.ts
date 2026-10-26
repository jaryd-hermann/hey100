import * as Clipboard from 'expo-clipboard';

import { type CommunityGroup, groupSharePath } from '@/data/repo/community';
import { captureEvent } from '@/lib/analytics';

export function groupShareUrl(group: Pick<CommunityGroup, 'id' | 'name'>): string {
  return `https://hey100.com/${groupSharePath(group)}`;
}

export function copyGroupLink(
  group: Pick<CommunityGroup, 'id' | 'name'>,
  toast: (message: string) => void,
): void {
  Clipboard.setStringAsync(groupShareUrl(group)).catch(() => {});
  toast('Link copied');
  captureEvent('share_opened', { kind: 'group', channel: 'Copy link' });
}
