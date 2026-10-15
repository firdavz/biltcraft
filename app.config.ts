import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  return {
    ...config,
    name: 'Habbit',
    slug: 'biltcraft',
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    scheme: 'biltcraft',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      deploymentTarget: '16.4',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'me.bilt.biltcraft',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'me.bilt.biltcraft',
    },
    web: {
      bundler: 'metro',
      // 'single' = SPA export: one index.html + client routing, so edge serving
      // needs only a single 404→index.html fallback rule.
      output: 'single',
      favicon: './public/icons/icon-192.png',
    },
    extra: {
      ...config.extra,
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-splash-screen',
      [
        'expo-camera',
        {
          cameraPermission: 'Let Habbit capture your daily proof.',
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      'expo-notifications',
      '@react-native-community/datetimepicker',
      ...nativePlugins,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
