/**
 * Environment configuration for development
 */
import type { GateCameraStreamConfig } from '../app/core/models/gate-camera-stream.config';

export const environment = {
  production: false,
  // Empty = same-origin via ng serve proxy (proxy.conf.js → localhost:9999). Avoids CORS.
  apiUrl: '',
  apiTimeout: 30000, // 30 seconds
  /** Gate security / hardware list UIs still use in-browser demo data unless a dedicated API is added. */
  features: {
    gateHardwareDemoMode: true
  },
  /** Optional real camera URLs for local testing (see deploy/CAMERA-TESTING.md). */
  gateCameras: [] as GateCameraStreamConfig[]
};

