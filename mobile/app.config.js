const appJson = require('./app.json');

/**
 * EAS injects GOOGLE_SERVICES_JSON as a local file path when using
 * a "file" environment variable (secret/sensitive). Keep a local fallback
 * for development when mobile/google-services.json exists.
 */
module.exports = () => {
  const base = appJson.expo;
  const googleServices =
    process.env.GOOGLE_SERVICES_JSON || './google-services.json';

  return {
    ...base,
    android: {
      ...base.android,
      package: 'com.lovli.app',
      googleServicesFile: googleServices,
      adaptiveIcon: {
        backgroundColor: '#e11d48',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#e11d48',
    },
    web: {
      ...base.web,
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#e11d48',
          defaultChannel: 'lovli-default',
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#e11d48',
          image: './assets/splash-icon.png',
          imageWidth: 200,
        },
      ],
    ],
    extra: {
      ...base.extra,
      eas: {
        projectId: '9abcd22f-3a90-4165-bc9c-ed791b7ba139',
      },
      appUrl: process.env.EXPO_PUBLIC_APP_URL || 'https://lovlimatch.vercel.app',
    },
  };
};
