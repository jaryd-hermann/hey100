import React from 'react';
import { View } from 'react-native';

import { Txt } from '@/components/ui/Txt';
import { openLegal, type LegalPage } from '@/lib/legal';
import { useTheme } from '@/theme/ThemeProvider';

export function LegalLink({
  page,
  size = 13,
}: {
  page: LegalPage;
  size?: number;
}) {
  const { c } = useTheme();
  return (
    <Txt
      size={size}
      weight={600}
      color={c.ink}
      accessibilityRole="link"
      onPress={() => openLegal(page)}
    >
      {page === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
    </Txt>
  );
}

/** Compact "Terms · Privacy · Restore" row for the subscribe screen. */
export function LegalRow({
  size = 12.5,
  restoreLabel,
  onRestore,
}: {
  size?: number;
  restoreLabel?: string;
  onRestore?: () => void;
}) {
  const { c } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: 8,
        rowGap: 4,
      }}
    >
      <LegalLink page="terms" size={size} />
      <Txt size={size} color={c.muted}>
        ·
      </Txt>
      <LegalLink page="privacy" size={size} />
      {onRestore ? (
        <>
          <Txt size={size} color={c.muted}>
            ·
          </Txt>
          <Txt
            size={size}
            weight={600}
            color={c.ink}
            accessibilityRole="button"
            onPress={onRestore}
          >
            {restoreLabel ?? 'Restore'}
          </Txt>
        </>
      ) : null}
    </View>
  );
}
