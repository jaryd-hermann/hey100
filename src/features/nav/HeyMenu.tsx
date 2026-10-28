import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, Switch, View } from 'react-native';

import { Wordmark } from '@/components/brand/Logo';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDailyHeyLimit } from '@/features/billing/DailyHeyLimit';
import { useDevMode } from '@/lib/devMode';
import { useStore } from '@/store/AppStore';
import { useTheme } from '@/theme/ThemeProvider';

import { HeyMenuContext } from './heyMenuContext';

export { useHeyMenu } from './heyMenuContext';

export function HeyMenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <HeyMenuContext.Provider value={value}>
      {children}
      <HeyMenuSheet visible={visible} onClose={() => setVisible(false)} />
    </HeyMenuContext.Provider>
  );
}

function HeyMenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { c, isDark, setPref } = useTheme();
  const store = useStore();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { devMode } = useDevMode();
  const heyLimit = useDailyHeyLimit();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <View style={{ paddingBottom: 4 }}>
          <Wordmark size={26} />
        </View>

        {!store.isPro ? (
          <MenuRow
            icon="diamond-outline"
            label="Get Builder Pro"
            onPress={() => {
              onClose();
              router.push('/paywall?from=menu');
            }}
          />
        ) : null}

        <MenuRow
          icon="eye-outline"
          label="Preview my app"
          onPress={() => {
            if (!store.primaryApp) {
              toast('Add an app first');
              return;
            }
            onClose();
            store.setPreviewApp(store.primaryApp.id);
            router.push('/(tabs)/discover');
          }}
        />

        {isAdmin && devMode ? (
          <MenuRow
            icon="flash-outline"
            label="Preview 8 heys"
            onPress={() => {
              onClose();
              setTimeout(() => heyLimit.open(), 240);
            }}
          />
        ) : null}

        <MenuRow
          icon="share-outline"
          label="Share Hey100"
          onPress={() => {
            Share.share({
              message: 'Find your first 100 users on Hey100: https://hey100.com',
            }).catch(() => {});
          }}
        />

        <MenuRow
          icon="construct-outline"
          label="Pro builder tools"
          onPress={() => {
            onClose();
            router.push('/tools');
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 54,
            borderRadius: 16,
            backgroundColor: c.raised,
          }}
        >
          <Txt size={16} weight={600} style={{ flex: 1 }}>
            Dark mode
          </Txt>
          <View style={{ height: 32, justifyContent: 'center' }}>
            <Switch
              value={isDark}
              onValueChange={(on) => setPref(on ? 'dark' : 'light')}
              trackColor={{ false: c.line, true: c.accent }}
              style={{ alignSelf: 'center' }}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const { c } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        minHeight: 54,
        borderRadius: 16,
        backgroundColor: c.raised,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Txt size={16} weight={600} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Ionicons name={icon} size={20} color={c.ink} />
    </Pressable>
  );
}
