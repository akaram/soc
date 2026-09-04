import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell for the Society Angular app (Android APK / later iOS IPA).
 *
 * Testing mode uses server.url so the WebView loads the live site. Relative
 * API calls (/auth/login) stay same-origin and work without extra CORS rules.
 *
 * To ship a fully bundled APK instead: comment out `server.url`, run
 * `ng build --configuration production` (or native), then `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.sgctechnologies.societyapp',
  appName: 'The Supper Society App',
  webDir: 'dist/society-management-app/browser',
  server: {
    // Live HTTPS app + API (nginx society-domain). Opens the mobile login screen.
    url: 'https://app.sgctechnologies.com/mobile/auth/login',
    cleartext: false,
    allowNavigation: ['app.sgctechnologies.com'],
  },
  android: {
    allowMixedContent: false,
    // USB debugging: chrome://inspect → inspect the WebView while testing.
    webContentsDebuggingEnabled: true,
  },
  ios: {
    // Safari on Mac: Develop → [your iPhone] → inspect the WebView.
    webContentsDebuggingEnabled: true,
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
};

export default config;
