import React, { useRef } from 'react';
import { findNodeHandle, ScrollView, View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';

const HOUR = 60 * 60 * 1000;

export function stampMs(value?: string | null): number | null {
  if (!value) return null;
  const at = new Date(value).getTime();
  return Number.isNaN(at) ? null : at;
}

export function shouldStamp(prev?: string | null, next?: string | null): boolean {
  const current = stampMs(next);
  if (current == null) return false;
  const before = stampMs(prev);
  if (before == null) return true;
  if (dayKey(before) !== dayKey(current)) return true;
  return current - before >= HOUR;
}

export function stampLabel(value: string): string {
  const at = new Date(value);
  const time = at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const now = new Date();
  if (sameDay(at, now)) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return `Yesterday at ${time}`;
  if (now.getTime() - at.getTime() < 6 * 24 * HOUR) {
    return `${at.toLocaleDateString(undefined, { weekday: 'long' })} ${time}`;
  }
  return `${at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${time}`;
}

function dayKey(at: number): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ChatStamp({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Txt font="mono" size={11} muted>
        {label}
      </Txt>
    </View>
  );
}

export function UnreadDivider({ onReady }: { onReady?: (node: View) => void }) {
  const { c } = useTheme();

  return (
    <View
      ref={(node) => {
        if (node) onReady?.(node);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 2,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: c.accent, opacity: 0.6 }} />
      <Txt font="mono" size={10.5} weight={500} upper tracking={0.9} color={c.accentText}>
        new
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: c.accent, opacity: 0.6 }} />
    </View>
  );
}

/** First paint lands on the new line; later growth sticks to the bottom. */
export function useChatAnchor(hasUnread: boolean) {
  const scrollRef = useRef<ScrollView>(null);
  const unreadNode = useRef<View | null>(null);
  const primed = useRef(false);

  const scrollToUnread = () => {
    const node = unreadNode.current;
    const handle = findNodeHandle(scrollRef.current);
    if (!node || !handle || primed.current) return;
    node.measureLayout(
      handle,
      (_x, y) => {
        if (primed.current) return;
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: false });
        primed.current = true;
      },
      () => {},
    );
  };

  const onUnreadLayout = (node: View) => {
    unreadNode.current = node;
    scrollToUnread();
  };

  const onContentSizeChange = () => {
    if (!primed.current) {
      if (hasUnread) {
        scrollToUnread();
        return;
      }
      scrollRef.current?.scrollToEnd({ animated: false });
      primed.current = true;
      return;
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return { scrollRef, onUnreadLayout, onContentSizeChange };
}

export function firstUnreadIndex(times: (string | undefined)[], lastReadAt?: string | null): number {
  if (!lastReadAt) return -1;
  return times.findIndex((at) => !!at && at > lastReadAt);
}
