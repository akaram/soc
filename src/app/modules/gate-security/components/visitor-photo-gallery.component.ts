import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorPhotoService } from '../services/visitor-photo.service';
import { photoPlaceholderDataUrl, readCachedPhoto } from '../services/visitor-photo-api.mapper';
import {
  VisitorPhoto,
  PhotoCaptureSource,
  PhotoQuality,
  PhotoStatus,
  PhotoFilter,
  PhotoStatistics
} from '../models/visitor-photo.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-visitor-photo-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="photo-gallery-container">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1><i class="material-icons">photo_library</i> Visitor Photo Gallery</h1>
            <p>View and manage captured visitor photos (7-day storage)</p>
            <div class="api-banner">
              <i class="material-icons">cloud_done</i>
              <span>Live photos from <strong>/visitors</strong>, <strong>/recurring-visitors</strong>, and <strong>/monthly-gatepass</strong> — no demo gallery.</span>
            </div>
          </div>
          <button class="btn-capture" (click)="navigateToCapture()">
            <i class="material-icons">camera_alt</i>
            Capture New Photo
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">photo_library</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activePhotos }}</div>
            <div class="stat-label">Active Photos</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.photosToday }}</div>
            <div class="stat-label">Captured Today</div>
          </div>
        </div>
        <div class="stat-card expiring">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.photosExpiringToday }}</div>
            <div class="stat-label">Expiring Today</div>
          </div>
        </div>
        <div class="stat-card storage">
          <div class="stat-icon">
            <i class="material-icons">storage</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatStorage(statistics.totalStorageUsed) }}</div>
            <div class="stat-label">Storage Used</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <input 
            type="text" 
            placeholder="Search by name, phone, flat..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filter.captureSource" (change)="applyFilters()" class="filter-select">
            <option value="">All Sources</option>
            <option [value]="PhotoCaptureSource.GATE_ENTRY">Gate Entry</option>
            <option [value]="PhotoCaptureSource.GATE_EXIT">Gate Exit</option>
            <option [value]="PhotoCaptureSource.MANUAL_CAPTURE">Manual Capture</option>
          </select>
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filter.gateId" (change)="applyFilters()" class="filter-select">
            <option value="">All Gates</option>
            <option value="MAIN_GATE">Main Gate</option>
            <option value="SIDE_GATE">Side Gate</option>
            <option value="PARKING_GATE">Parking Gate</option>
            <option value="EMERGENCY_GATE">Emergency Gate</option>
          </select>
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filter.quality" (change)="applyFilters()" class="filter-select">
            <option value="">All Quality</option>
            <option [value]="PhotoQuality.EXCELLENT">Excellent</option>
            <option [value]="PhotoQuality.HIGH">High</option>
            <option [value]="PhotoQuality.MEDIUM">Medium</option>
            <option [value]="PhotoQuality.LOW">Low</option>
          </select>
        </div>
        <button class="btn-clear-filters" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Photo Grid -->
      <div class="photos-grid" *ngIf="!isLoading && photos.length > 0">
        <div 
          *ngFor="let photo of photos" 
          class="photo-card"
          [ngClass]="{ 'expiring': photo.daysRemaining <= 1 && !photo.isExpired, 'expired': photo.isExpired }">
          <div class="photo-image-container">
            <img 
              [src]="photo.thumbnailUrl || photo.photoUrl" 
              [alt]="photo.visitorName"
              class="photo-image"
              (error)="onPhotoLoadError(photo)"
              (click)="viewPhoto(photo)">
            <div class="photo-overlay">
              <div class="photo-actions">
                <button class="btn-action" (click)="viewPhoto(photo)" title="View Full Size">
                  <i class="material-icons">zoom_in</i>
                </button>
                <button class="btn-action" (click)="downloadPhoto(photo)" title="Download">
                  <i class="material-icons">download</i>
                </button>
                <button 
                  class="btn-action" 
                  (click)="archivePhoto(photo)"
                  *ngIf="photo.status === PhotoStatus.ACTIVE"
                  title="Archive">
                  <i class="material-icons">archive</i>
                </button>
                <button 
                  class="btn-action danger" 
                  (click)="deletePhoto(photo)"
                  *ngIf="photo.status !== PhotoStatus.DELETED"
                  title="Delete">
                  <i class="material-icons">delete</i>
                </button>
              </div>
            </div>
            <div class="photo-badge" *ngIf="photo.quality === PhotoQuality.EXCELLENT">
              <i class="material-icons">star</i>
            </div>
            <div class="expiry-badge" *ngIf="photo.daysRemaining <= 1 && !photo.isExpired">
              Expires in {{ photo.daysRemaining }} day{{ photo.daysRemaining !== 1 ? 's' : '' }}
            </div>
          </div>
          <div class="photo-info">
            <div class="photo-name">{{ photo.visitorName }}</div>
            <div class="photo-meta">
              <span class="meta-item">
                <i class="material-icons">calendar_today</i>
                {{ formatDate(photo.captureDate) }}
              </span>
              <span class="meta-item">
                <i class="material-icons">schedule</i>
                {{ formatTime(photo.captureTime) }}
              </span>
            </div>
            <div class="photo-details">
              <span class="detail-badge" [ngClass]="getQualityClass(photo.quality)">
                {{ photo.quality }}
              </span>
              <span class="detail-badge source">
                {{ getSourceLabel(photo.captureSource) }}
              </span>
              <span class="detail-badge" *ngIf="photo.gateName">
                {{ photo.gateName }}
              </span>
            </div>
            <div class="photo-footer">
              <span class="days-remaining" *ngIf="!photo.isExpired">
                <i class="material-icons">timer</i>
                {{ photo.daysRemaining }} day{{ photo.daysRemaining !== 1 ? 's' : '' }} remaining
              </span>
              <span class="expired-label" *ngIf="photo.isExpired">
                <i class="material-icons">warning</i>
                Expired
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && photos.length === 0">
        <i class="material-icons">photo_library</i>
        <h3>No Visitor Photos Found</h3>
        <p *ngIf="!loadError">No visitor records with photos yet. Capture at the gate or add photos when registering visitors.</p>
        <p class="error-text" *ngIf="loadError">{{ loadError }}</p>
        <button class="btn-capture" (click)="navigateToCapture()">
          <i class="material-icons">camera_alt</i>
          Capture First Photo
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading photos...</p>
      </div>
    </div>

    <!-- Photo Modal -->
    <div class="photo-modal" *ngIf="selectedPhoto" (click)="closePhotoModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <button class="btn-close" (click)="closePhotoModal()">
          <i class="material-icons">close</i>
        </button>
        <img [src]="selectedPhoto.photoUrl" [alt]="selectedPhoto.visitorName" class="modal-image" (error)="onPhotoLoadError(selectedPhoto)">
        <div class="modal-info">
          <h3>{{ selectedPhoto.visitorName }}</h3>
          <div class="modal-details">
            <div class="detail-row">
              <span class="label">Captured:</span>
              <span>{{ formatDateTime(selectedPhoto.captureDate) }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedPhoto.visitorPhone">
              <span class="label">Phone:</span>
              <span>{{ selectedPhoto.visitorPhone }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedPhoto.visitingFlat">
              <span class="label">Visiting:</span>
              <span>{{ selectedPhoto.visitingFlat }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedPhoto.gateName">
              <span class="label">Gate:</span>
              <span>{{ selectedPhoto.gateName }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Quality:</span>
              <span class="quality-badge" [ngClass]="getQualityClass(selectedPhoto.quality)">
                {{ selectedPhoto.quality }}
              </span>
            </div>
            <div class="detail-row" *ngIf="!selectedPhoto.isExpired">
              <span class="label">Expires:</span>
              <span>{{ formatDateTime(selectedPhoto.expiryDate) }} ({{ selectedPhoto.daysRemaining }} days remaining)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .photo-gallery-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
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

    .api-banner {
      margin-top: 12px;
      padding: 10px 14px;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 8px;
      color: #2e7d32;
      font-size: 13px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .api-banner .material-icons {
      font-size: 18px;
      flex-shrink: 0;
    }

    .error-text {
      color: #c0392b;
      font-weight: 500;
    }

    .btn-capture {
      padding: 12px 24px;
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

    .btn-capture:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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

    .stat-card.today .stat-icon {
      background: #17a2b8;
    }

    .stat-card.expiring .stat-icon {
      background: #ffc107;
    }

    .stat-card.storage .stat-icon {
      background: #f5576c;
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

    .filters-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-group {
      flex: 1;
      min-width: 200px;
    }

    .search-input,
    .filter-select {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .btn-clear-filters {
      padding: 10px 20px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-clear-filters:hover {
      background: #e0e0e0;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .photo-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .photo-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .photo-card.expiring {
      border: 2px solid #ffc107;
    }

    .photo-card.expired {
      opacity: 0.7;
      border: 2px solid #dc3545;
    }

    .photo-image-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: #e8ecf1;
      overflow: hidden;
    }

    .photo-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
    }

    .photo-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .photo-card:hover .photo-overlay {
      opacity: 1;
    }

    .photo-actions {
      display: flex;
      gap: 12px;
    }

    .btn-action {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      color: #2c3e50;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-action:hover {
      background: white;
      transform: scale(1.1);
    }

    .btn-action.danger {
      background: rgba(220, 53, 69, 0.9);
      color: white;
    }

    .btn-action.danger:hover {
      background: #dc3545;
    }

    .photo-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 193, 7, 0.9);
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .expiry-badge {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(255, 193, 7, 0.9);
      color: #2c3e50;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .photo-info {
      padding: 16px;
    }

    .photo-name {
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .photo-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-item .material-icons {
      font-size: 14px;
    }

    .photo-details {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .detail-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .detail-badge.excellent {
      background: #d4edda;
      color: #155724;
    }

    .detail-badge.high {
      background: #d1ecf1;
      color: #0c5460;
    }

    .detail-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .detail-badge.low {
      background: #f8d7da;
      color: #721c24;
    }

    .detail-badge.source {
      background: #e7f3ff;
      color: #004085;
    }

    .photo-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #7f8c8d;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
    }

    .days-remaining {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .expired-label {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #dc3545;
      font-weight: 600;
    }

    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .photo-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .btn-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .modal-image {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      background: #000;
    }

    .modal-info {
      padding: 20px;
    }

    .modal-info h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .modal-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-row .label {
      font-weight: 600;
      color: #7f8c8d;
    }

    .quality-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
  `]
})
export class VisitorPhotoGalleryComponent implements OnInit, OnDestroy {
  photos: VisitorPhoto[] = [];
  statistics: PhotoStatistics | null = null;
  selectedPhoto: VisitorPhoto | null = null;
  isLoading = false;
  loadError = '';
  filter: PhotoFilter = {};

  PhotoCaptureSource = PhotoCaptureSource;
  PhotoQuality = PhotoQuality;
  PhotoStatus = PhotoStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private photoService: VisitorPhotoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPhotos();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPhotos(): void {
    this.isLoading = true;
    this.loadError = '';

    const societyId = localStorage.getItem('societyId') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
          return raw ? JSON.parse(raw).societyId : '';
        } catch { return ''; }
      })();

    if (!societyId) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.photos = [];
      return;
    }

    this.photoService.getAllPhotos(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (photos) => {
          this.photos = photos;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading photos:', error);
          this.loadError = 'Failed to load photos from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.photoService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      });
  }

  applyFilters(): void {
    this.loadPhotos();
  }

  clearFilters(): void {
    this.filter = {};
    this.loadPhotos();
  }

  viewPhoto(photo: VisitorPhoto): void {
    this.selectedPhoto = photo;
  }

  closePhotoModal(): void {
    this.selectedPhoto = null;
  }

  /** Fallback when inline JPEG is corrupt — try cache once more */
  onPhotoLoadError(photo: VisitorPhoto): void {
    const societyId =
      localStorage.getItem('societyId') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
          return raw ? JSON.parse(raw).societyId : '';
        } catch {
          return '';
        }
      })();

    const cached = readCachedPhoto(societyId, photo.visitorId);
    const nextUrl = cached ?? photoPlaceholderDataUrl();
    photo.photoUrl = nextUrl;
    photo.thumbnailUrl = nextUrl;
    if (this.selectedPhoto?.id === photo.id) {
      this.selectedPhoto = { ...photo };
    }
    const idx = this.photos.findIndex(p => p.id === photo.id);
    if (idx >= 0) {
      this.photos[idx] = { ...photo };
    }
  }

  downloadPhoto(photo: VisitorPhoto): void {
    const link = document.createElement('a');
    link.href = photo.photoUrl;
    link.download = `visitor-photo-${photo.visitorName}-${photo.id}.jpg`;
    link.click();
  }

  archivePhoto(photo: VisitorPhoto): void {
    if (confirm(`Archive photo of ${photo.visitorName}? This will keep it beyond the 7-day retention period.`)) {
      this.photoService.archivePhoto(photo.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadPhotos();
              this.loadStatistics();
            }
          },
          error: (error) => {
            console.error('Error archiving photo:', error);
          }
        });
    }
  }

  deletePhoto(photo: VisitorPhoto): void {
    if (confirm(`Delete photo of ${photo.visitorName}? This action cannot be undone.`)) {
      this.photoService.deletePhoto(photo.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadPhotos();
              this.loadStatistics();
              if (this.selectedPhoto?.id === photo.id) {
                this.closePhotoModal();
              }
            }
          },
          error: (error) => {
            console.error('Error deleting photo:', error);
          }
        });
    }
  }

  navigateToCapture(): void {
    this.router.navigate(['/admin/gate-security/visitor-photos/capture']);
  }

  getQualityClass(quality: PhotoQuality): string {
    return quality.toLowerCase();
  }

  getSourceLabel(source: PhotoCaptureSource): string {
    switch (source) {
      case PhotoCaptureSource.GATE_ENTRY:
        return 'Entry';
      case PhotoCaptureSource.GATE_EXIT:
        return 'Exit';
      case PhotoCaptureSource.MANUAL_CAPTURE:
        return 'Manual';
      default:
        return source;
    }
  }

  formatStorage(mb: number): string {
    if (mb < 1) {
      return `${(mb * 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}
















































