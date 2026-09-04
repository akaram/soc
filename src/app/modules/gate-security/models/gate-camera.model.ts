/**
 * Gate Camera Feed Models
 * For live camera feed monitoring at gates
 */

import type { GateCameraPlaybackType } from '../../../core/models/gate-camera-stream.config';

export enum CameraStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  RECORDING = 'RECORDING',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR'
}

export enum CameraType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  OVERHEAD = 'OVERHEAD',
  PARKING = 'PARKING',
  PERIMETER = 'PERIMETER'
}

export interface GateCamera {
  id: string;
  gateId: string;
  gateName: string;
  cameraName: string;
  cameraType: CameraType;
  status: CameraStatus;
  
  // Camera Configuration
  streamUrl?: string; // RTSP/HTTP stream URL (documentation / NVR)
  /** Browser-playable URL from environment.gateCameras (HLS, MJPEG, snapshot, MP4). */
  playbackUrl?: string;
  playbackType?: GateCameraPlaybackType;
  /** True when wired from environment.gateCameras for real CCTV testing. */
  isRealStream?: boolean;
  ipAddress?: string;
  port?: number;
  resolution: string; // e.g., '1920x1080'
  fps: number; // Frames per second
  
  // Location
  location?: string; // Physical location description
  angle?: string; // Camera angle/view
  
  // Metadata
  lastSeen?: Date;
  lastRecording?: Date;
  recordingEnabled: boolean;
  motionDetectionEnabled: boolean;
  nightVisionEnabled: boolean;
  
  // Statistics
  uptime: number; // Percentage
  totalRecordings: number;
  storageUsed: number; // GB
  storageLimit: number; // GB
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CameraFeed {
  cameraId: string;
  camera?: GateCamera;
  streamUrl: string;
  /** Browser URL for live playback (see GateCameraPlayerComponent). */
  playbackUrl?: string;
  playbackType?: GateCameraPlaybackType;
  thumbnailUrl?: string;
  isLive: boolean;
  viewers: number;
  lastFrame?: string; // Base64 image
  timestamp: Date;
}

export interface GateCameraStatistics {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  recordingCameras: number;
  totalRecordings: number;
  totalStorageUsed: number; // GB
  totalStorageLimit: number; // GB
  byGate: {
    [gateId: string]: {
      cameras: number;
      online: number;
      recording: number;
    };
  };
  byType: {
    entry: number;
    exit: number;
    overhead: number;
    parking: number;
    perimeter: number;
  };
}

export interface CameraFilter {
  gateId?: string;
  cameraType?: CameraType;
  status?: CameraStatus;
  searchTerm?: string;
}

