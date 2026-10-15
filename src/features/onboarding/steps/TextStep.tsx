import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Label, Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export type TextCard = {
  key: string;
  label: string;
  hint: string;
  value: string;
  visible: boolean;
};

export type TextStepProps = {
  cards: TextCard[];
  onChange: (key: string, value: string) => void;
  onToggleVisible: (key: string) => void;
};

/** Two cards, each with its own "Visible on profile" toggle. */
export function TextStep({ cards, onChange, onToggleVisible }: TextStepProps) {
  const { c } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {cards.map((card) => (
        <Card key={card.key} padding={16} style={{ gap: 10 }}>
          <Label>{card.label}</Label>

          <TextInput
            value={card.value}
            onChangeText={(value) => onChange(card.key, value)}
            placeholder={card.hint}
            placeholderTextColor={c.muted}
            style={{
              minHeight: 44,
              color: c.ink,
              fontFamily: fonts.body,
              fontSize: 17,
            }}
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: card.visible }}
            onPress={() => onToggleVisible(card.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderTopWidth: 1,
              borderColor: c.line,
              paddingTop: 12,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: card.visible ? c.ink : c.muted,
                backgroundColor: card.visible ? c.ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.visible ? (
                <Txt size={12} weight={700} color={c.bg}>
                  ✓
                </Txt>
              ) : null}
            </View>
            <Txt size={13.5} weight={500} muted>
              Visible on profile
            </Txt>
          </Pressable>
        </Card>
      ))}
    </View>
  );
}
