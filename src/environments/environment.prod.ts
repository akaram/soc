/**
 * Environment configuration for production
 */
import type { GateCameraStreamConfig } from '../app/core/models/gate-camera-stream.config';

export const environment = {
  production: true,
  // Empty = same-origin relative URLs (/auth/login via nginx :8080). Avoids CORS and wrong host:port.
  apiUrl: '',
  apiTimeout: 30000, // 30 seconds
  features: {
    /** Set false when real hardware APIs are deployed; hides demo-data banners. */
    gateHardwareDemoMode: false
  },
  /**
   * Real CCTV for Gate Security → Live Camera Feed.
   * Browsers cannot play RTSP directly — use MediaMTX/FFmpeg to expose HLS or MJPEG (see deploy/CAMERA-TESTING.md).
   *
   * Example after MediaMTX on the VM:
   * gateCameras: [{
   *   id: 'CAM-LIVE-1',
   *   gateName: 'Main Gate',
   *   cameraName: 'My CCTV',
   *   playbackUrl: 'http://110.225.250.13:8888/cam1/index.m3u8',
   *   playbackType: 'hls',
   *   rtspUrl: 'rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101'
   * }]
   */
  gateCameras: [] as GateCameraStreamConfig[]
};

