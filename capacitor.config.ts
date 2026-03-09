import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.peetrix.fitwayhub',
  appName: 'FitWayHub',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    // Allow mixed content for dev; remove in production
    allowMixedContent: true,
  },
  server: {
    // For development: point to your dev server
    // Uncomment the line below and set your machine's LAN IP for live reload:
    // url: 'http://192.168.1.X:3000',
    cleartext: true, // allow HTTP during dev
    androidScheme: 'https',
    // Allow OAuth flow to navigate within the WebView (not Chrome Custom Tab)
    allowNavigation: [
      'peter-adel.taila6a2b4.ts.net',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      '*.facebook.com',
      '*.fbcdn.net',
    ],
  },
  plugins: {
    // Geolocation permissions are declared in AndroidManifest.xml
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0A0A0B',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
