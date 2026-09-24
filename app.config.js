const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'Call Me Maybe (Dev)' : 'Call Me Maybe',
    slug: 'kontaktliste-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: IS_DEV ? 'kontaktlisteapp-dev' : 'kontaktlisteapp',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? 'com.schly21.kontaktlisteapp.dev'
        : 'com.schly21.kontaktlisteapp',
      entitlements: {
        'aps-environment': IS_DEV ? 'development' : 'production',
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSContactsUsageDescription: 'Damit du siehst, wer aus deinem Adressbuch Call Me Maybe nutzt und gerade Zeit hat. Namen verlassen dein Gerät nicht.',
        NSPhotoLibraryUsageDescription: 'Damit du ein Foto als Profilbild auswählen kannst.',
        NSPhotoLibraryAddUsageDescription: 'Damit du Bilder aus deinen Anrufen in deiner Mediathek sichern kannst.',
        NSCameraUsageDescription: 'Für Videoanrufe und zum Aufnehmen deines Profilbilds.',
        NSMicrophoneUsageDescription: 'Damit man dich in Anrufen hören kann.',
        UIBackgroundModes: [
          'remote-notification',
          'voip',
          'audio'
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0B0B12'
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
        'com.google.android.c2dm.permission.RECEIVE',
        'USE_FULL_SCREEN_INTENT',
        'MANAGE_OWN_CALLS',
        'android.permission.USE_FULL_SCREEN_INTENT',
        'android.permission.MANAGE_OWN_CALLS',
        'android.permission.WAKE_LOCK',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.READ_PHONE_STATE'
      ],
      package: IS_DEV 
        ? 'com.schly21.kontaktlisteapp.dev' 
        : 'com.schly21.kontaktlisteapp'
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0B0B12'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: 'b5b430e0-3b17-49fe-bf44-ad9c6a49b8e3'
      },
      // Add environment indicator for runtime use
      isDev: IS_DEV
    },
    owner: 'schly21',
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/b5b430e0-3b17-49fe-bf44-ad9c6a49b8e3'
    }
  }
};