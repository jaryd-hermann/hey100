import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

const BUNDLE_ID = 'com.hey100.app';
const DOMAIN = 'hey100.com';
const EAS_PROJECT_ID = '3eb6e463-d0f8-4949-93c1-f7b93dbb10b7';
const BUILD_PROFILE = process.env.EAS_BUILD_PROFILE;
const IS_DEV_CLIENT = BUILD_PROFILE === 'development' || BUILD_PROFILE === 'device';
const IS_STORE_BUILD = BUILD_PROFILE === 'production';

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
  // Bake the icon face into the binary so the first Ionicons render does not
  // call ExpoFontLoader (same iOS 26 Hermes conversion crash as useFonts).
  './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
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
    appleTeamId: process.env.APPLE_TEAM_ID || '38NFF5BY78',
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
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            'NSPrivacyCollectedDataTypePurposeAnalytics',
          ],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
      NSPrivacyTracking: false,
    },
    entitlements: {
      'aps-environment': IS_STORE_BUILD ? 'production' : 'development',
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'Hey100 uses your photos so you can set a profile picture, add screenshots to your listing, and attach photos in chats.',
      NSCameraUsageDescription:
        'Hey100 uses the camera so you can take a profile photo or record a listing pitch.',
      NSMicrophoneUsageDescription:
        'Hey100 uses the microphone so listing pitch videos can include audio.',
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
    [
      'onesignal-expo-plugin',
      {
        mode: IS_STORE_BUILD ? 'production' : 'development',
        iPhoneDeploymentTarget: '15.1',
        // NSE needs an App Group EAS could not attach last store build.
        // Basic APNs still registers a token without it.
        disableNSE: true,
        disableLocation: true,
      },
    ],
    'expo-router',
    ...(IS_DEV_CLIENT ? (['expo-dev-client'] as const) : []),
    'expo-apple-authentication',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        // Background remote-notification in Info.plist is a known TestFlight
        // launch kill when the app does not implement the fetch handler.
        enableBackgroundRemoteNotifications: false,
        mode: IS_STORE_BUILD ? 'production' : 'development',
      },
    ],
    'expo-web-browser',
    'expo-video',
    [
      'expo-camera',
      {
        cameraPermission:
          'Hey100 uses the camera so you can take a profile photo or record a listing pitch.',
        microphonePermission: 'Hey100 uses the microphone so listing pitch videos can include audio.',
        recordAudioAndroid: true,
      },
    ],
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
  // Store builds ship the embedded bundle only. expo-updates on SDK 54 has
  // aborted TestFlight launches when a leftover or empty update is activated.
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    enabled: !IS_STORE_BUILD,
    checkAutomatically: 'NEVER',
  },

  extra: {
    router: { origin: false },
    // Written by hand because `eas init` cannot edit a dynamic config.
    eas: { projectId: EAS_PROJECT_ID },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    EXPO_PUBLIC_ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    EXPO_PUBLIC_REVENUECAT_APPLE_KEY: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
  },
});
