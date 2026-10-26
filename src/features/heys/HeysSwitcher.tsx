import React from 'react';

import { Segmented } from '@/components/ui/Segmented';

export type HeysTab = 'received' | 'sent';

const TABS: { id: HeysTab; label: string }[] = [
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
];

/** Two-option segmented control for the Heys header. Received is the default. */
export function HeysSwitcher({
  value,
  onChange,
}: {
  value: HeysTab;
  onChange: (next: HeysTab) => void;
}) {
  return <Segmented value={value} onChange={onChange} options={TABS} />;
}
