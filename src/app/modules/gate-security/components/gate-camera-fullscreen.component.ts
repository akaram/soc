import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { GateCameraService } from '../services/gate-camera.service';
import { GateCamera, CameraFeed, CameraStatus } from '../models/gate-camera.model';
import { Subscription } from 'rxjs';
import { GateCameraPlayerComponent } from './gate-camera-player.component';

@Component({
  selector: 'app-gate-camera-fullscreen',
  standalone: true,
  imports: [CommonModule, RouterModule, GateCameraPlayerComponent],
  template: `
    <div class="fullscreen-container">
      <div class="fullscreen-header">
        <button class="btn-close" (click)="goBack()">
          <i class="material-icons">close</i>
          Close
        </button>
        <div class="camera-title">
          <h2>{{ camera?.cameraName }}</h2>
          <div class="camera-meta">
            <span>{{ camera?.gateName }}</span>
            <span class="separator">•</span>
            <span>{{ camera?.cameraType }}</span>
            <span class="separator">•</span>
            <span class="status-badge" [ngClass]="getStatusClass(camera?.status || 'OFFLINE')">
              {{ camera?.status }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <div class="viewers-count" *ngIf="feed">
            <i class="material-icons">people</i>
            {{ feed.viewers }} viewers
          </div>
          <button class="btn-settings" (click)="openSettings()">
            <i class="material-icons">settings</i>
            Settings
          </button>
        </div>
      </div>

      <div class="fullscreen-feed" *ngIf="camera">
        <div class="feed-placeholder" *ngIf="!feed || !feed.isLive">
          <i class="material-icons">videocam_off</i>
          <p>{{ camera.status === 'OFFLINE' ? 'Camera Offline' : 'Loading Feed...' }}</p>
        </div>
        <div class="live-feed-container" *ngIf="feed && feed.isLive">
          <app-gate-camera-player
            *ngIf="feed.playbackUrl"
            [playbackUrl]="feed.playbackUrl"
            [playbackType]="feed.playbackType || 'snapshot'"
            [label]="camera.cameraName"
            [fullscreen]="true"
            [refreshKey]="refreshKey"
          ></app-gate-camera-player>
          <img
            *ngIf="!feed.playbackUrl && feed.thumbnailUrl"
            [src]="feed.thumbnailUrl"
            [alt]="camera.cameraName"
            class="fullscreen-image"
          >
          <div class="live-badge">
            <span class="live-dot"></span>
            LIVE
          </div>
          <div class="feed-info-overlay">
            <div class="info-item">
              <label>Resolution:</label>
              <span>{{ camera.resolution }}</span>
            </div>
            <div class="info-item">
              <label>FPS:</label>
              <span>{{ camera.fps }}</span>
            </div>
            <div class="info-item" *ngIf="camera.location">
              <label>Location:</label>
              <span>{{ camera.location }}</span>
            </div>
            <div class="info-item">
              <label>Uptime:</label>
              <span>{{ camera.uptime.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="fullscreen-controls">
        <button class="btn-control" (click)="toggleRecording()" *ngIf="camera?.recordingEnabled">
          <i class="material-icons">{{ camera?.status === 'RECORDING' ? 'stop' : 'fiber_manual_record' }}</i>
          {{ camera?.status === 'RECORDING' ? 'Stop Recording' : 'Start Recording' }}
        </button>
        <button class="btn-control" (click)="takeSnapshot()">
          <i class="material-icons">camera_alt</i>
          Snapshot
        </button>
        <button class="btn-control" (click)="toggleNightVision()" *ngIf="camera?.nightVisionEnabled">
          <i class="material-icons">nightlight</i>
          Night Vision
        </button>
        <button class="btn-control" (click)="refreshFeed()">
          <i class="material-icons">refresh</i>
          Refresh
        </button>
      </div>
    </div>
  `,
  styles: [`
    .fullscreen-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 9999;
      display: flex;
      flex-direction: column;
    }

    .fullscreen-header {
      background: rgba(0, 0, 0, 0.9);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #333;
    }

    .btn-close {
      padding: 10px 20px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-close:hover {
      background: #c82333;
      transform: translateY(-2px);
    }

    .camera-title {
      flex: 1;
      margin: 0 24px;
    }

    .camera-title h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: white;
    }

    .camera-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #ccc;
    }

    .separator {
      color: #666;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.online {
      background: #28a745;
      color: white;
    }

    .status-badge.offline {
      background: #dc3545;
      color: white;
    }

    .status-badge.recording {
      background: #ffc107;
      color: #000;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .viewers-count {
      display: flex;
      align-items: center;
      gap: 6px;
      color: white;
      font-size: 14px;
    }

    .btn-settings {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-settings:hover {
      background: #5568d3;
    }

    .fullscreen-feed {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .feed-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #999;
    }

    .feed-placeholder .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .feed-placeholder p {
      margin: 0;
      font-size: 18px;
    }

    .live-feed-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .live-feed-container app-gate-camera-player {
      display: block;
      width: 100%;
      height: 100%;
    }

    .fullscreen-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .live-badge {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .live-dot {
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .feed-info-overlay {
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: rgba(0, 0, 0, 0.7);
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      gap: 24px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
    }

    .info-item span {
      font-size: 14px;
      color: white;
      font-weight: 600;
    }

    .fullscreen-controls {
      background: rgba(0, 0, 0, 0.9);
      padding: 16px 24px;
      display: flex;
      gap: 12px;
      justify-content: center;
      border-top: 1px solid #333;
    }

    .btn-control {
      padding: 12px 24px;
      background: #333;
      color: white;
      border: 2px solid #555;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-control:hover {
      background: #444;
      border-color: #667eea;
    }
  `]
})
export class GateCameraFullscreenComponent implements OnInit, OnDestroy {
  camera: GateCamera | null = null;
  feed: CameraFeed | null = null;
  refreshKey = 0;
  private feedSubscription?: Subscription;

  constructor(
    private cameraService: GateCameraService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const cameraId = this.route.snapshot.paramMap.get('id');
    if (cameraId) {
      this.loadCamera(cameraId);
    }
  }

  ngOnDestroy(): void {
    if (this.feedSubscription) {
      this.feedSubscription.unsubscribe();
    }
  }

  loadCamera(cameraId: string): void {
    this.cameraService.getCameraById(cameraId).subscribe({
      next: (camera) => {
        this.camera = camera;
        if (camera) {
          this.loadFeed(camera.id);
        }
      },
      error: (error) => {
        console.error('Error loading camera:', error);
        alert('Camera not found');
        this.goBack();
      }
    });
  }

  loadFeed(cameraId: string): void {
    this.feedSubscription = this.cameraService.getCameraFeed(cameraId).subscribe({
      next: (feed) => {
        this.feed = feed;
      }
    });
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  toggleRecording(): void {
    if (this.camera) {
      const newStatus = this.camera.status === CameraStatus.RECORDING 
        ? CameraStatus.ONLINE 
        : CameraStatus.RECORDING;
      this.cameraService.updateCameraStatus(this.camera.id, newStatus).subscribe({
        next: (success) => {
          if (success && this.camera) {
            this.camera.status = newStatus;
          }
        }
      });
    }
  }

  takeSnapshot(): void {
    alert('Snapshot captured!');
  }

  toggleNightVision(): void {
    alert('Night vision toggled!');
  }

  refreshFeed(): void {
    this.refreshKey++;
    if (this.camera) {
      this.loadFeed(this.camera.id);
    }
  }

  openSettings(): void {
    if (this.camera) {
      this.router.navigate(['/admin/gate-security/camera-feed', this.camera.id, 'settings']);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/camera-feed']);
  }
}

