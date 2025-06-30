const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'Call Me Maybe (Dev)' : 'Call Me Maybe',
    slug: 'kontaktliste-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: IS_DEV ? 'kontaktlisteapp-dev' : 'kontaktlisteapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV 
        ? 'com.schly21.kontaktlisteapp.dev' 
        : 'com.schly21.kontaktlisteapp',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSContactsUsageDescription: 'Diese App benötigt Zugriff auf deine Kontakte, um dir anzuzeigen, wer bereits registriert ist.',
        NSUserTrackingUsageDescription: 'Diese App verwendet Benachrichtigungen, um dich über den Status deiner Kontakte zu informieren.',
        NSPhotoLibraryUsageDescription: 'Diese App benötigt Zugriff auf deine Bilder, um ein Profilbild auszuwählen.',
        NSCameraUsageDescription: 'Diese App benötigt Zugriff auf die Kamera für Videoanrufe.',
        NSMicrophoneUsageDescription: 'Diese App benötigt Zugriff auf das Mikrofon für Anrufe.',
        UIBackgroundModes: [
          'remote-notification',
          'voip',
          'audio',
          'background-processing'
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
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
          backgroundColor: '#ffffff'
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