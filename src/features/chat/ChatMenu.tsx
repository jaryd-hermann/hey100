import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { firstName } from './chatMeta';

export type ChatMenuProps = {
  visible: boolean;
  onClose: () => void;
  /** Short app name, or the thread name for the Team thread. */
  appName: string;
  /** Their real name, since chat is always post-match. */
  builder: string;
  isTeam: boolean;
  /** The app's own link, opened in the in-app browser. */
  link?: [kind: string, value: string];
  onViewApp: () => void;
  onViewProfile: () => void;
  onOpenLink: () => void;
  onDelete: () => void;
  onReport: () => void;
};

/** The ··· menu in the thread header. */
export function ChatMenu({
  visible,
  onClose,
  appName,
  builder,
  isTeam,
  link,
  onViewApp,
  onViewProfile,
  onOpenLink,
  onDelete,
  onReport,
}: ChatMenuProps) {
  const name = firstName(builder);

  const confirmDelete = () =>
    Alert.alert(
      'Delete chat?',
      `This clears the thread with ${name}. The trade itself stays open, and unmatching is still being built.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );

  const confirmReport = () =>
    Alert.alert(
      `Report ${name}?`,
      'The Hey100 team reviews every report and follows up by email. Blocking and unmatching land with the full safety tools.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: onReport },
      ],
    );

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 8 }}>
        {isTeam ? null : (
          <MenuRow icon="apps-outline" label={`View ${appName}`} onPress={onViewApp} />
        )}

        {isTeam ? null : (
          <MenuRow
            icon="person-circle-outline"
            label={`${name}'s profile`}
            onPress={onViewProfile}
          />
        )}

        {link ? (
          <MenuRow
            icon="open-outline"
            label={isTeam ? 'Hey100 on the web' : `Open ${appName}'s link`}
            detail={link[1]}
            onPress={onOpenLink}
          />
        ) : null}

        {isTeam ? (
          <Txt size={13} lh={1.45} muted style={{ paddingHorizontal: 4, paddingTop: 6 }}>
            This thread goes straight to Jaryd. Announcements come from the same place.
          </Txt>
        ) : (
          <>
            <MenuRow icon="trash-outline" label="Delete chat" danger onPress={confirmDelete} />
            <MenuRow icon="flag-outline" label={`Report ${name}`} danger onPress={confirmReport} />
            <Txt size={12.5} lh={1.45} muted style={{ paddingHorizontal: 4, paddingTop: 2 }}>
              Reports go to the Hey100 team. Blocking and unmatching are still being built.
            </Txt>
          </>
        )}
      </View>
    </Sheet>
  );
}

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  detail?: string;
  danger?: boolean;
  onPress: () => void;
};

function MenuRow({ icon, label, detail, danger, onPress }: MenuRowProps) {
  const { c } = useTheme();
  const fg = danger ? c.danger : c.ink;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 15,
        height: 52,
        borderRadius: radii.option,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={fg} />
      <Txt size={14.5} weight={500} color={fg} style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Txt>
      {detail ? (
        <Txt size={13} muted numberOfLines={1} style={{ maxWidth: 140 }}>
          {detail}
        </Txt>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={c.muted} />
    </Pressable>
  );
}
