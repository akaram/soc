/** How the browser plays a gate camera URL (RTSP must be converted — see deploy/CAMERA-TESTING.md). */
export type GateCameraPlaybackType = 'mjpeg' | 'hls' | 'snapshot' | 'mp4';

/** One real camera wired from environment (production / local test). */
export interface GateCameraStreamConfig {
  id: string;
  gateId?: string;
  gateName: string;
  cameraName: string;
  /** Browser URL: HLS .m3u8, MJPEG, MP4, or snapshot JPEG (see playbackType). */
  playbackUrl: string;
  playbackType: GateCameraPlaybackType;
  /** Optional RTSP source (documentation only; not used in browser). */
  rtspUrl?: string;
}
