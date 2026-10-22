import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, Switch, View } from 'react-native';

import { HandMark, Wordmark } from '@/components/brand/Logo';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
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

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
          <HandMark size={28} fill={c.ink} />
          <Wordmark size={22} />
        </View>

        {!store.isPro ? (
          <Pressable
            onPress={() => {
              onClose();
              router.push('/paywall?from=menu');
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              minHeight: 54,
              borderRadius: 16,
              backgroundColor: c.raised,
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Txt size={16} weight={600}>
              Get Builder Pro
            </Txt>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            if (!store.primaryApp) {
              toast('Add an app first');
              return;
            }
            onClose();
            store.setPreviewApp(store.primaryApp.id);
            router.push('/(tabs)/discover');
          }}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            minHeight: 54,
            borderRadius: 16,
            backgroundColor: c.raised,
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Txt size={16} weight={600}>
            Preview my app
          </Txt>
        </Pressable>

        <Pressable
          onPress={() => {
            Share.share({
              message: 'Find your first 100 users on Hey100: https://hey100.com',
            }).catch(() => {});
          }}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            minHeight: 54,
            borderRadius: 16,
            backgroundColor: c.raised,
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Txt size={16} weight={600}>
            Share Hey100
          </Txt>
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            router.push('/tools');
          }}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            minHeight: 54,
            borderRadius: 16,
            backgroundColor: c.raised,
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Txt size={16} weight={600}>
            Pro builder tools
          </Txt>
        </Pressable>

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
