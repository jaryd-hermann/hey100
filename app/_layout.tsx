import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { useListingsSync } from '@/features/apps/useListingsSync';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useLoopSync } from '@/features/loop/useLoopSync';
import { useLoopRealtime } from '@/features/loop/useRealtime';
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

const sharedPostHog = getPostHog();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    TitanOne_400Regular: require('../assets/fonts/TitanOne_400Regular.ttf'),
    Inter_400Regular: require('../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/Inter_700Bold.ttf'),
    JetBrainsMono_400Regular: require('../assets/fonts/JetBrainsMono_400Regular.ttf'),
    JetBrainsMono_500Medium: require('../assets/fonts/JetBrainsMono_500Medium.ttf'),
    JetBrainsMono_600SemiBold: require('../assets/fonts/JetBrainsMono_600SemiBold.ttf'),
    JetBrainsMono_700Bold: require('../assets/fonts/JetBrainsMono_700Bold.ttf'),
  });

  // Never hang on a white screen waiting for fonts; fall back to system faces.
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontsTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    warnOnMissingConfig();
  }, []);

  const ready = fontsLoaded || !!fontError || fontsTimedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <PostHogProvider
        client={sharedPostHog ?? undefined}
        apiKey={sharedPostHog ? undefined : 'phc_unconfigured'}
        autocapture={{
          captureScreens: isPostHogConfigured,
          captureTouches: isPostHogConfigured,
        }}
      >
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              {/* Inside the query client, so signing out can drop the cache. */}
              <AuthProvider>
                <AppStoreProvider>
                  <ToastProvider>
                    <Shell />
                  </ToastProvider>
                </AppStoreProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </PostHogProvider>
    </ErrorBoundary>
  );
}

function Shell() {
  const { c, isDark } = useTheme();

  // Hydrates the store from the signed-in user's rows; no-ops when signed out.
  useProfileSync();
  useListingsSync();
  useLoopSync();
  useLoopRealtime();

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
