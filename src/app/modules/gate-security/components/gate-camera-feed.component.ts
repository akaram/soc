import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { GateCameraService } from '../services/gate-camera.service';
import {
  GateCamera,
  CameraFeed,
  CameraStatus,
  CameraType,
  GateCameraStatistics,
  CameraFilter
} from '../models/gate-camera.model';
import { Subscription } from 'rxjs';
import { GateCameraPlayerComponent } from './gate-camera-player.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gate-camera-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GateCameraPlayerComponent],
  template: `
    <div class="camera-feed-container">
      <div class="page-header">
        <button type="button" class="btn-back" routerLink="/admin/gate-security">
          <i class="material-icons">arrow_back</i>
        </button>
        <div>
          <h1><i class="material-icons">videocam</i> Live Gate Camera Feed</h1>
          <p>Monitor gate cameras in real time</p>
        </div>
      </div>

      <div class="demo-notice" *ngIf="!hasRealCameras">
        <i class="material-icons">info</i>
        <span>
          Demo cameras use placeholder images. To test your physical CCTV, add URLs in
          <code>environment.prod.ts</code> → <code>gateCameras</code> and redeploy.
          See <code>deploy/CAMERA-TESTING.md</code>.
        </span>
      </div>

      <div class="demo-notice real" *ngIf="hasRealCameras">
        <i class="material-icons">videocam</i>
        <span>{{ realCameraCount }} real camera(s) configured — live playback below.</span>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">videocam</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalCameras }}</div>
            <div class="stat-label">Total Cameras</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onlineCameras }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card recording">
          <div class="stat-icon">
            <i class="material-icons">fiber_manual_record</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.recordingCameras }}</div>
            <div class="stat-label">Recording</div>
          </div>
        </div>
        <div class="stat-card storage">
          <div class="stat-icon">
            <i class="material-icons">storage</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalStorageUsed.toFixed(1) }}GB</div>
            <div class="stat-label">Storage Used</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <select [(ngModel)]="filter.gateId" (change)="applyFilters()" class="filter-select">
          <option value="">All Gates</option>
          <option value="MAIN_GATE">Main Gate</option>
          <option value="SIDE_GATE">Side Gate</option>
          <option value="PARKING_GATE">Parking Gate</option>
          <option value="EMERGENCY_GATE">Emergency Gate</option>
        </select>
        <select [(ngModel)]="filter.cameraType" (change)="applyFilters()" class="filter-select">
          <option value="">All Types</option>
          <option [value]="CameraType.ENTRY">Entry</option>
          <option [value]="CameraType.EXIT">Exit</option>
          <option [value]="CameraType.OVERHEAD">Overhead</option>
          <option [value]="CameraType.PARKING">Parking</option>
          <option [value]="CameraType.PERIMETER">Perimeter</option>
        </select>
        <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
          <option value="">All Status</option>
          <option [value]="CameraStatus.ONLINE">Online</option>
          <option [value]="CameraStatus.OFFLINE">Offline</option>
          <option [value]="CameraStatus.RECORDING">Recording</option>
        </select>
        <input 
          type="text" 
          placeholder="Search cameras..." 
          [(ngModel)]="filter.searchTerm"
          (input)="applyFilters()"
          class="search-input">
      </div>

      <!-- Camera Grid -->
      <div class="cameras-grid" *ngIf="!isLoading && cameras.length > 0">
        <div *ngFor="let camera of cameras" class="camera-card" [ngClass]="getStatusClass(camera.status)">
          <div class="camera-header">
            <div class="camera-info">
              <div class="camera-name">{{ camera.cameraName }}</div>
              <div class="camera-meta">
                <span class="gate-name">{{ camera.gateName }}</span>
                <span class="camera-type">{{ camera.cameraType }}</span>
              </div>
            </div>
            <div class="status-indicator" [ngClass]="getStatusClass(camera.status)">
              <div class="status-dot"></div>
              <span>{{ camera.status }}</span>
            </div>
          </div>

          <div class="camera-feed">
            <div class="feed-placeholder" *ngIf="!feeds[camera.id] || !feeds[camera.id].isLive">
              <i class="material-icons">videocam_off</i>
              <p>{{ camera.status === CameraStatus.OFFLINE ? 'Camera Offline' : 'Loading Feed...' }}</p>
            </div>
            <div class="live-feed" *ngIf="feeds[camera.id] && feeds[camera.id].isLive">
              <app-gate-camera-player
                *ngIf="feeds[camera.id].playbackUrl"
                [playbackUrl]="feeds[camera.id].playbackUrl!"
                [playbackType]="feeds[camera.id].playbackType || 'snapshot'"
                [label]="camera.cameraName"
              ></app-gate-camera-player>
              <img
                *ngIf="!feeds[camera.id].playbackUrl && feeds[camera.id].thumbnailUrl"
                [src]="feeds[camera.id].thumbnailUrl"
                [alt]="camera.cameraName"
                class="feed-image"
              >
              <div class="live-badge">
                <span class="live-dot"></span>
                LIVE
              </div>
              <div class="viewers-count" *ngIf="feeds[camera.id]">
                <i class="material-icons">people</i>
                {{ feeds[camera.id].viewers }}
              </div>
            </div>
          </div>

          <div class="camera-details">
            <div class="detail-row">
              <span class="detail-label">Resolution:</span>
              <span class="detail-value">{{ camera.resolution }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">FPS:</span>
              <span class="detail-value">{{ camera.fps }}</span>
            </div>
            <div class="detail-row" *ngIf="camera.location">
              <span class="detail-label">Location:</span>
              <span class="detail-value">{{ camera.location }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Uptime:</span>
              <span class="detail-value">{{ camera.uptime.toFixed(1) }}%</span>
            </div>
          </div>

          <div class="camera-actions">
            <button class="btn-action btn-view" (click)="viewFullScreen(camera)">
              <i class="material-icons">fullscreen</i>
              Full Screen
            </button>
            <button class="btn-action btn-settings" (click)="viewSettings(camera)">
              <i class="material-icons">settings</i>
              Settings
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!isLoading && cameras.length === 0">
        <i class="material-icons">videocam_off</i>
        <h3>No Cameras Found</h3>
        <p>No cameras match your filters</p>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading cameras...</p>
      </div>
    </div>
  `,
  styles: [`
    .camera-feed-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .btn-back {
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    .demo-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;
      line-height: 1.5;
    }

    .demo-notice .material-icons {
      font-size: 20px;
      flex-shrink: 0;
    }

    .demo-notice.real {
      background: #ecfdf5;
      border-color: #6ee7b7;
      color: #065f46;
    }

    .demo-notice code {
      font-size: 12px;
      background: rgba(0, 0, 0, 0.06);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .live-feed app-gate-camera-player {
      display: block;
      width: 100%;
      height: 100%;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.online .stat-icon {
      background: #28a745;
    }

    .stat-card.recording .stat-icon {
      background: #dc3545;
    }

    .stat-card.storage .stat-icon {
      background: #17a2b8;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .filters-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filter-select,
    .search-input {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
    }

    .cameras-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .camera-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .camera-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .camera-card.online {
      border-color: #28a745;
    }

    .camera-card.offline {
      border-color: #dc3545;
    }

    .camera-card.recording {
      border-color: #ffc107;
    }

    .camera-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .camera-name {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .camera-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .gate-name {
      font-weight: 600;
    }

    .camera-type {
      text-transform: uppercase;
      font-size: 11px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-indicator.online .status-dot {
      background: #28a745;
      box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
    }

    .status-indicator.offline .status-dot {
      background: #dc3545;
    }

    .status-indicator.recording .status-dot {
      background: #ffc107;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .camera-feed {
      position: relative;
      width: 100%;
      height: 240px;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .feed-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #999;
    }

    .feed-placeholder .material-icons {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .feed-placeholder p {
      margin: 0;
      font-size: 14px;
    }

    .live-feed {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .feed-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .live-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    .viewers-count {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .camera-details {
      margin-bottom: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .detail-label {
      color: #7f8c8d;
      font-weight: 600;
    }

    .detail-value {
      color: #2c3e50;
      font-weight: 500;
    }

    .camera-actions {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-view {
      background: #667eea;
      color: white;
    }

    .btn-settings {
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
    }

    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .cameras-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GateCameraFeedComponent implements OnInit, OnDestroy {
  cameras: GateCamera[] = [];
  feeds: { [key: string]: CameraFeed } = {};
  statistics: GateCameraStatistics | null = null;
  isLoading = false;
  filter: CameraFilter = {};
  private feedSubscriptions: Subscription[] = [];

  CameraStatus = CameraStatus;
  CameraType = CameraType;
  hasRealCameras = (environment.gateCameras?.length ?? 0) > 0;
  realCameraCount = environment.gateCameras?.length ?? 0;

  constructor(
    private cameraService: GateCameraService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.feedSubscriptions.forEach(sub => sub.unsubscribe());
  }

  loadData(): void {
    this.isLoading = true;
    this.cameraService.getAllCameras(this.filter).subscribe({
      next: (cameras) => {
        this.cameras = cameras;
        this.isLoading = false;
        this.loadFeeds();
      },
      error: (error) => {
        console.error('Error loading cameras:', error);
        this.isLoading = false;
      }
    });

    this.cameraService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadFeeds(): void {
    // Unsubscribe from previous feeds
    this.feedSubscriptions.forEach(sub => sub.unsubscribe());
    this.feedSubscriptions = [];

    // Load feeds for each camera
    this.cameras.forEach(camera => {
      const sub = this.cameraService.getCameraFeed(camera.id).subscribe({
        next: (feed) => {
          if (feed) {
            this.feeds[camera.id] = feed;
          }
        }
      });
      this.feedSubscriptions.push(sub);
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  getStatusClass(status: CameraStatus): string {
    return status.toLowerCase();
  }

  viewFullScreen(camera: GateCamera): void {
    this.router.navigate(['/admin/gate-security/camera-feed', camera.id, 'fullscreen']);
  }

  viewSettings(camera: GateCamera): void {
    this.router.navigate(['/admin/gate-security/camera-feed', camera.id, 'settings']);
  }
}

