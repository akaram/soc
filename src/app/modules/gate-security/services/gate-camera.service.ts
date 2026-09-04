import { Injectable } from '@angular/core';
import { Observable, of, delay, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type { GateCameraStreamConfig } from '../../../core/models/gate-camera-stream.config';
import {
  GateCamera,
  CameraFeed,
  CameraStatus,
  CameraType,
  GateCameraStatistics,
  CameraFilter
} from '../models/gate-camera.model';

@Injectable({
  providedIn: 'root'
})
export class GateCameraService {
  private cameras: GateCamera[] = this.mergeEnvironmentCameras(this.generateDummyCameras());
  private feeds: Map<string, CameraFeed> = new Map();

  constructor() {
    // Initialize feeds for every camera (real + demo)
    this.cameras.forEach(camera => {
      this.feeds.set(camera.id, this.buildFeedForCamera(camera));
    });
  }

  /** Prefer real cameras from environment; replace dummy entries with same id. */
  private mergeEnvironmentCameras(dummy: GateCamera[]): GateCamera[] {
    const configs = environment.gateCameras ?? [];
    if (!configs.length) {
      return dummy;
    }
    const real = configs.map(cfg => this.cameraFromConfig(cfg));
    const realIds = new Set(real.map(c => c.id));
    return [...real, ...dummy.filter(c => !realIds.has(c.id))];
  }

  /** Map environment config to a GateCamera marked online with playback URL. */
  private cameraFromConfig(cfg: GateCameraStreamConfig): GateCamera {
    const now = new Date();
    return {
      id: cfg.id,
      gateId: cfg.gateId ?? 'MAIN_GATE',
      gateName: cfg.gateName,
      cameraName: cfg.cameraName,
      cameraType: CameraType.ENTRY,
      status: CameraStatus.ONLINE,
      streamUrl: cfg.rtspUrl,
      playbackUrl: cfg.playbackUrl,
      playbackType: cfg.playbackType,
      isRealStream: true,
      resolution: '1920x1080',
      fps: 25,
      location: cfg.rtspUrl ? `RTSP source (relay required): ${cfg.rtspUrl}` : 'Live stream',
      recordingEnabled: true,
      motionDetectionEnabled: true,
      nightVisionEnabled: false,
      uptime: 100,
      totalRecordings: 0,
      storageUsed: 0,
      storageLimit: 500,
      lastSeen: now,
      createdAt: now,
      updatedAt: now
    };
  }

  /** Build feed object; real streams use playbackUrl, demos use SVG placeholder. */
  private buildFeedForCamera(camera: GateCamera): CameraFeed {
    const hasPlayback = !!camera.playbackUrl?.trim();
    return {
      cameraId: camera.id,
      camera,
      streamUrl: camera.playbackUrl || camera.streamUrl || '',
      playbackUrl: camera.playbackUrl,
      playbackType: camera.playbackType ?? 'snapshot',
      thumbnailUrl: hasPlayback ? undefined : this.generateThumbnailUrl(camera.id),
      isLive: hasPlayback || camera.status === CameraStatus.ONLINE,
      viewers: Math.floor(Math.random() * 10) + 1,
      timestamp: new Date()
    };
  }

  /**
   * Get all gate cameras
   */
  getAllCameras(filter?: CameraFilter): Observable<GateCamera[]> {
    return of(null).pipe(
      delay(500),
      map(() => {
        let filtered = [...this.cameras];

        if (filter) {
          if (filter.gateId) {
            filtered = filtered.filter(c => c.gateId === filter.gateId);
          }
          if (filter.cameraType) {
            filtered = filtered.filter(c => c.cameraType === filter.cameraType);
          }
          if (filter.status) {
            filtered = filtered.filter(c => c.status === filter.status);
          }
          if (filter.searchTerm) {
            const search = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
              c.cameraName.toLowerCase().includes(search) ||
              c.gateName.toLowerCase().includes(search) ||
              c.location?.toLowerCase().includes(search)
            );
          }
        }

        return filtered.sort((a, b) => a.gateName.localeCompare(b.gateName));
      })
    );
  }

  /**
   * Get camera by ID
   */
  getCameraById(id: string): Observable<GateCamera | null> {
    return of(null).pipe(
      delay(300),
      map(() => this.cameras.find(c => c.id === id) || null)
    );
  }

  /**
   * Get cameras by gate ID
   */
  getCamerasByGate(gateId: string): Observable<GateCamera[]> {
    return of(null).pipe(
      delay(300),
      map(() => this.cameras.filter(c => c.gateId === gateId))
    );
  }

  /**
   * Get live camera feed
   */
  getCameraFeed(cameraId: string): Observable<CameraFeed | null> {
    const feed = this.feeds.get(cameraId);
    if (!feed) {
      return of(null);
    }

    // Real streams: keep feed stable; only bump timestamp/viewers occasionally
    if (feed.playbackUrl) {
      return interval(5000).pipe(
        startWith(0),
        map(() => ({
          ...feed,
          timestamp: new Date(),
          viewers: Math.floor(Math.random() * 15) + 1,
          isLive: true
        }))
      );
    }

    // Demo feeds: simulate placeholder updates
    return interval(2000).pipe(
      startWith(0),
      map(() => {
        const updatedFeed = { ...feed };
        updatedFeed.timestamp = new Date();
        updatedFeed.viewers = Math.floor(Math.random() * 15) + 1;
        updatedFeed.isLive = feed.camera?.status === CameraStatus.ONLINE;
        return updatedFeed;
      })
    );
  }

  /**
   * Get all live feeds
   */
  getAllFeeds(): Observable<CameraFeed[]> {
    return of(null).pipe(
      delay(300),
      map(() => Array.from(this.feeds.values()))
    );
  }

  /**
   * Get statistics
   */
  getStatistics(): Observable<GateCameraStatistics> {
    return of(null).pipe(
      delay(300),
      map(() => {
        const byGate: { [key: string]: { cameras: number; online: number; recording: number } } = {};
        
        this.cameras.forEach(camera => {
          if (!byGate[camera.gateId]) {
            byGate[camera.gateId] = { cameras: 0, online: 0, recording: 0 };
          }
          byGate[camera.gateId].cameras++;
          if (camera.status === CameraStatus.ONLINE) {
            byGate[camera.gateId].online++;
          }
          if (camera.status === CameraStatus.RECORDING) {
            byGate[camera.gateId].recording++;
          }
        });

        return {
          totalCameras: this.cameras.length,
          onlineCameras: this.cameras.filter(c => c.status === CameraStatus.ONLINE).length,
          offlineCameras: this.cameras.filter(c => c.status === CameraStatus.OFFLINE).length,
          recordingCameras: this.cameras.filter(c => c.status === CameraStatus.RECORDING).length,
          totalRecordings: this.cameras.reduce((sum, c) => sum + c.totalRecordings, 0),
          totalStorageUsed: this.cameras.reduce((sum, c) => sum + c.storageUsed, 0),
          totalStorageLimit: this.cameras.reduce((sum, c) => sum + c.storageLimit, 0),
          byGate: byGate,
          byType: {
            entry: this.cameras.filter(c => c.cameraType === CameraType.ENTRY).length,
            exit: this.cameras.filter(c => c.cameraType === CameraType.EXIT).length,
            overhead: this.cameras.filter(c => c.cameraType === CameraType.OVERHEAD).length,
            parking: this.cameras.filter(c => c.cameraType === CameraType.PARKING).length,
            perimeter: this.cameras.filter(c => c.cameraType === CameraType.PERIMETER).length
          }
        };
      })
    );
  }

  /**
   * Update camera status
   */
  updateCameraStatus(cameraId: string, status: CameraStatus): Observable<boolean> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const camera = this.cameras.find(c => c.id === cameraId);
        if (camera) {
          camera.status = status;
          camera.updatedAt = new Date();
          if (status === CameraStatus.ONLINE) {
            camera.lastSeen = new Date();
          }
          return true;
        }
        return false;
      })
    );
  }

  private generateThumbnailUrl(cameraId: string): string {
    // Offline-safe placeholder (no external HTTP); replace with real snapshot URL when NVR/VMS is integrated.
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect fill="#667eea" width="100%" height="100%"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="14">Camera ${cameraId}</text></svg>`
    );
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }

  private generateDummyCameras(): GateCamera[] {
    return [
      {
        id: 'CAM-001',
        gateId: 'MAIN_GATE',
        gateName: 'Main Gate',
        cameraName: 'Main Gate Entry Camera',
        cameraType: CameraType.ENTRY,
        status: CameraStatus.ONLINE,
        streamUrl: 'rtsp://camera.main-gate.local:554/stream',
        ipAddress: '192.168.1.101',
        port: 554,
        resolution: '1920x1080',
        fps: 30,
        location: 'Main entrance, facing incoming traffic',
        angle: '45 degrees',
        lastSeen: new Date(),
        recordingEnabled: true,
        motionDetectionEnabled: true,
        nightVisionEnabled: true,
        uptime: 99.5,
        totalRecordings: 1250,
        storageUsed: 45.2,
        storageLimit: 500,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: 'CAM-002',
        gateId: 'MAIN_GATE',
        gateName: 'Main Gate',
        cameraName: 'Main Gate Exit Camera',
        cameraType: CameraType.EXIT,
        status: CameraStatus.ONLINE,
        streamUrl: 'rtsp://camera.main-gate-exit.local:554/stream',
        ipAddress: '192.168.1.102',
        port: 554,
        resolution: '1920x1080',
        fps: 30,
        location: 'Main entrance, facing outgoing traffic',
        angle: '45 degrees',
        lastSeen: new Date(),
        recordingEnabled: true,
        motionDetectionEnabled: true,
        nightVisionEnabled: true,
        uptime: 98.8,
        totalRecordings: 1180,
        storageUsed: 42.5,
        storageLimit: 500,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: 'CAM-003',
        gateId: 'MAIN_GATE',
        gateName: 'Main Gate',
        cameraName: 'Main Gate Overhead Camera',
        cameraType: CameraType.OVERHEAD,
        status: CameraStatus.RECORDING,
        streamUrl: 'rtsp://camera.main-gate-overhead.local:554/stream',
        ipAddress: '192.168.1.103',
        port: 554,
        resolution: '2560x1440',
        fps: 30,
        location: 'Main gate overhead, 360-degree view',
        angle: 'Top-down',
        lastSeen: new Date(),
        recordingEnabled: true,
        motionDetectionEnabled: true,
        nightVisionEnabled: true,
        uptime: 99.2,
        totalRecordings: 2100,
        storageUsed: 78.3,
        storageLimit: 500,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: 'CAM-004',
        gateId: 'SIDE_GATE',
        gateName: 'Side Gate',
        cameraName: 'Side Gate Entry Camera',
        cameraType: CameraType.ENTRY,
        status: CameraStatus.ONLINE,
        streamUrl: 'rtsp://camera.side-gate.local:554/stream',
        ipAddress: '192.168.1.104',
        port: 554,
        resolution: '1920x1080',
        fps: 25,
        location: 'Side entrance, facing incoming traffic',
        angle: '30 degrees',
        lastSeen: new Date(),
        recordingEnabled: true,
        motionDetectionEnabled: true,
        nightVisionEnabled: true,
        uptime: 97.5,
        totalRecordings: 890,
        storageUsed: 32.1,
        storageLimit: 500,
        createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: 'CAM-005',
        gateId: 'PARKING_GATE',
        gateName: 'Parking Gate',
        cameraName: 'Parking Gate Camera',
        cameraType: CameraType.PARKING,
        status: CameraStatus.ONLINE,
        streamUrl: 'rtsp://camera.parking-gate.local:554/stream',
        ipAddress: '192.168.1.105',
        port: 554,
        resolution: '1920x1080',
        fps: 30,
        location: 'Parking area entrance',
        angle: '60 degrees',
        lastSeen: new Date(),
        recordingEnabled: true,
        motionDetectionEnabled: false,
        nightVisionEnabled: true,
        uptime: 96.8,
        totalRecordings: 650,
        storageUsed: 28.5,
        storageLimit: 500,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: 'CAM-006',
        gateId: 'MAIN_GATE',
        gateName: 'Main Gate',
        cameraName: 'Main Gate Perimeter Camera',
        cameraType: CameraType.PERIMETER,
        status: CameraStatus.OFFLINE,
        streamUrl: 'rtsp://camera.main-perimeter.local:554/stream',
        ipAddress: '192.168.1.106',
        port: 554,
        resolution: '1920x1080',
        fps: 30,
        location: 'Perimeter fence near main gate',
        angle: '90 degrees',
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
        recordingEnabled: false,
        motionDetectionEnabled: true,
        nightVisionEnabled: true,
        uptime: 85.2,
        totalRecordings: 420,
        storageUsed: 15.8,
        storageLimit: 500,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
    ];
  }
}

