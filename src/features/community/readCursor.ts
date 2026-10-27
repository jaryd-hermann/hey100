const cursor = new Map<string, string>();

/** Remember where unread started before this visit marks the group read. */
export function captureReadCursor(groupId: string, lastReadAt?: string | null) {
  if (cursor.has(groupId)) return;
  cursor.set(groupId, lastReadAt ?? '');
}

export function readCursor(groupId: string): string | undefined {
  const value = cursor.get(groupId);
  return value || undefined;
}
