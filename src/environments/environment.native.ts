/**
 * Bundled native APK/IPA (Capacitor without server.url).
 * Absolute API host is required because the WebView origin is not the society domain.
 */
import type { GateCameraStreamConfig } from '../app/core/models/gate-camera-stream.config';

export const environment = {
  production: true,
  apiUrl: 'https://app.sgctechnologies.com',
  apiTimeout: 30000,
  features: {
    gateHardwareDemoMode: false
  },
  gateCameras: [] as GateCameraStreamConfig[]
};
