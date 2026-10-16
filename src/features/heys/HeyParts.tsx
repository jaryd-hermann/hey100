import React from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/AppIcon';
import { Chip } from '@/components/ui/Chip';
import { Label, Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export type NoteBlockProps = {
  /** Small icon shown before the label, usually the via-app icon. */
  icon?: React.ReactNode;
  label: string;
  note: string;
  /** The second note, shown beneath the first with a Very interested badge. */
  followUp?: { note: string; when: string };
};

/** The inset "what they said hey about" block, with its note underneath. */
export function NoteBlock({ icon, label, note, followUp }: NoteBlockProps) {
  const { c } = useTheme();

  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderRadius: radii.card,
        padding: 13,
        gap: 8,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        <Label size={10} style={{ flex: 1 }}>
          {label}
        </Label>
      </View>

      <Txt size={15} lh={1.45}>
        {note}
      </Txt>

      {followUp ? (
        <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 10, gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Chip label="Very interested" tone="accent" size="sm" />
            <Txt size={11.5} muted>
              {followUp.when}
            </Txt>
          </View>
          <Txt size={15} lh={1.45}>
            {followUp.note}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Avatar plus name of the builder behind a listing, shown under their note. */
export function BuilderLine({ name, role }: { name: string; role?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Avatar name={name} size={26} />
      <Txt size={13.5} weight={500}>
        {name}
      </Txt>
      {role ? (
        <Txt size={12.5} muted numberOfLines={1} style={{ flex: 1 }}>
          {role}
        </Txt>
      ) : null}
    </View>
  );
}
