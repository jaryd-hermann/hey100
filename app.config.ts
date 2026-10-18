import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

const BUNDLE_ID = 'com.hey100.app';
const DOMAIN = 'hey100.com';
const EAS_PROJECT_ID = '3eb6e463-d0f8-4949-93c1-f7b93dbb10b7';

const FONTS = [
  './assets/fonts/TitanOne_400Regular.ttf',
  './assets/fonts/Inter_400Regular.ttf',
  './assets/fonts/Inter_500Medium.ttf',
  './assets/fonts/Inter_600SemiBold.ttf',
  './assets/fonts/Inter_700Bold.ttf',
  './assets/fonts/JetBrainsMono_400Regular.ttf',
  './assets/fonts/JetBrainsMono_500Medium.ttf',
  './assets/fonts/JetBrainsMono_600SemiBold.ttf',
  './assets/fonts/JetBrainsMono_700Bold.ttf',
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hey100',
  slug: 'hey100',
  owner: 'jarydhermann',
  version,
  scheme: 'hey100',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,
  icon: './assets/images/icon.png',
  assetBundlePatterns: ['assets/**/*'],

  ios: {
    supportsTablet: false,
    bundleIdentifier: BUNDLE_ID,
    usesAppleSignIn: true,
    associatedDomains: [`applinks:${DOMAIN}`],
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
      ],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyTracking: false,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'Hey100 needs photo access so you can add screenshots to your app listing and attach them to bug reports.',
      NSCameraUsageDescription:
        'Hey100 needs camera access so you can take a profile photo.',
    },
  },

  android: {
    package: BUNDLE_ID,
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#B2EA5C',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: DOMAIN }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },

  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-apple-authentication',
    'expo-secure-store',
    'expo-notifications',
    'expo-web-browser',
    'expo-video',
    ['expo-font', { fonts: FONTS }],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-logo.png',
        imageWidth: 240,
        backgroundColor: '#F0D7FF',
        dark: { backgroundColor: '#0E100F' },
        resizeMode: 'contain',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
          ccacheEnabled: true,
        },
      },
    ],
    './plugins/withIosBuildFixes',
  ],

  experiments: {
    typedRoutes: true,
  },

  runtimeVersion: { policy: 'appVersion' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },

  extra: {
    router: { origin: false },
    // Written by hand because `eas init` cannot edit a dynamic config.
    eas: { projectId: EAS_PROJECT_ID },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
});
