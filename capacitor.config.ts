import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.githubjakob.auth0capacitorcustomcache',
  appName: 'auth0-capacitor-custom-cache',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
