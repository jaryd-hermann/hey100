import '@/lib/secureStoreGuard';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { useListingsSync } from '@/features/apps/useListingsSync';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useLoopSync } from '@/features/loop/useLoopSync';
import { useLoopRealtime } from '@/features/loop/useRealtime';
import { useTeamChat } from '@/features/chat/useTeamChat';
import { DailyHeyLimitProvider } from '@/features/billing/DailyHeyLimit';
import { usePurchases } from '@/features/billing/usePurchases';
import { usePush } from '@/features/push/usePush';
import { HeyMenuProvider } from '@/features/nav/HeyMenu';
import { useProfileSync } from '@/features/profile/useProfileSync';
import { getPostHog } from '@/lib/analytics';
import { isPostHogConfigured, warnOnMissingConfig } from '@/lib/config';
import { AppStoreProvider } from '@/store/AppStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    warnOnMissingConfig();
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Fonts are embedded by the expo-font plugin. Calling useFonts here talks to
  // ExpoFontLoader on first paint, and that NSArray→JSI conversion abort()s
  // Hermes on iOS 26 (TestFlight 0.1.0 build 10, 367ms after icon tap).
  return (
    <ErrorBoundary>
      <AnalyticsGate>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              {/* Inside the query client, so signing out can drop the cache. */}
              <AuthProvider>
                <AppStoreProvider>
                  <ToastProvider>
                    <DailyHeyLimitProvider>
                      <HeyMenuProvider>
                        <Shell />
                      </HeyMenuProvider>
                    </DailyHeyLimitProvider>
                  </ToastProvider>
                </AppStoreProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </AnalyticsGate>
    </ErrorBoundary>
  );
}

/** Skip the native client when the key is missing. A dummy `phc_` token still
 *  constructs PostHog, starts session replay, and can abort a store build. */
function AnalyticsGate({ children }: { children: React.ReactNode }) {
  const client = getPostHog();
  if (!client || !isPostHogConfigured) return children;

  return (
    <PostHogProvider
      client={client}
      autocapture={{
        captureScreens: true,
        captureTouches: true,
      }}
    >
      {children}
    </PostHogProvider>
  );
}

function Shell() {
  const { c, isDark } = useTheme();

  // Hydrates the store from the signed-in user's rows; no-ops when signed out.
  useProfileSync();
  useListingsSync();
  useLoopSync();
  useLoopRealtime();
  useTeamChat();
  usePush();
  usePurchases();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="match"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="browser" options={{ presentation: 'modal' }} />
        <Stack.Screen name="feedback-form" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </View>
  );
}
