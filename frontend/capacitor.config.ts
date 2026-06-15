import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.femme.app',
  appName: 'FEMME',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: ['*'],
    cleartext: true
  }
};

export default config;
