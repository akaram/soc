import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IncidentReportService } from '../../../modules/guard-patrol/services/incident-report.service';
import { IncidentReport } from '../../../modules/guard-patrol/models/incident-report.model';

/**
 * Mobile read-only view for a single reported incident.
 */
@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="incident-detail-page" *ngIf="incident">
      <div class="page-header">
        <button class="back-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>Incident Details</h1>
          <p>{{ incident.incidentNumber }}</p>
        </div>
      </div>

      <div class="content">
        <div class="hero">
          <span class="severity" [ngClass]="severityClass(incident.severity)">{{ incident.severity }}</span>
          <span class="status" [ngClass]="statusClass(incident.status)">{{ formatStatus(incident.status) }}</span>
          <h2>{{ incident.title }}</h2>
          <p class="description">{{ incident.description }}</p>
        </div>

        <div class="detail-grid">
          <div class="detail-row">
            <span class="label">Location</span>
            <span class="value">{{ incident.location }}</span>
          </div>
          <div class="detail-row" *ngIf="incident.locationDetails">
            <span class="label">Details</span>
            <span class="value">{{ incident.locationDetails }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Type</span>
            <span class="value">{{ formatStatus(incident.type) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Priority</span>
            <span class="value">{{ incident.priority }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Reported By</span>
            <span class="value">{{ incident.reportedByGuardName || 'Guard' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Incident Time</span>
            <span class="value">{{ formatDateTime(incident.incidentDateTime) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Reported At</span>
            <span class="value">{{ formatDateTime(incident.reportedDateTime) }}</span>
          </div>
          <div class="detail-row" *ngIf="incident.latitude && incident.longitude">
            <span class="label">GPS</span>
            <span class="value">{{ incident.latitude.toFixed(6) }}, {{ incident.longitude.toFixed(6) }}</span>
          </div>
          <div class="detail-row" *ngIf="incident.investigationNotes">
            <span class="label">Notes</span>
            <span class="value">{{ incident.investigationNotes }}</span>
          </div>
        </div>

        <!-- Photo evidence -->
        <div class="photos-section" *ngIf="photoAttachments.length > 0">
          <h3>
            <i class="material-icons">photo_library</i>
            Photos ({{ photoAttachments.length }})
          </h3>
          <div class="photos-grid">
            <button
              type="button"
              class="photo-thumb"
              *ngFor="let photo of photoAttachments"
              (click)="openPhoto(photo.url)">
              <img [src]="photo.url" [alt]="photo.fileName || 'Incident photo'" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Full-screen photo viewer -->
    <div class="photo-modal" *ngIf="selectedPhotoUrl" (click)="closePhoto()">
      <button type="button" class="close-photo" (click)="closePhoto()">
        <i class="material-icons">close</i>
      </button>
      <img [src]="selectedPhotoUrl" alt="Incident photo" (click)="$event.stopPropagation()" />
    </div>

    <div class="loading" *ngIf="isLoading">Loading incident…</div>
    <div class="error" *ngIf="errorMessage">{{ errorMessage }}</div>
  `,
  styles: [`
    .incident-detail-page {
      min-height: 100vh;
      background: #f5f7fa;
      padding-bottom: 88px;
    }

    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .back-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
    }

    .header-content h1 { margin: 0; font-size: 18px; }
    .header-content p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }

    .content { padding: 12px; }

    .hero {
      background: white;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
    }

    .hero h2 {
      margin: 10px 0 8px;
      font-size: 20px;
      color: #2c3e50;
    }

    .description {
      margin: 0;
      color: #64748b;
      line-height: 1.5;
      font-size: 14px;
    }

    .severity, .status {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 8px;
      margin-right: 6px;
      text-transform: uppercase;
    }

    .severity.severity-critical, .status.status-reported { background: #ffebee; color: #c62828; }
    .severity.severity-high { background: #fff3e0; color: #ef6c00; }
    .severity.severity-medium { background: #e3f2fd; color: #1565c0; }
    .severity.severity-low { background: #e8f5e9; color: #2e7d32; }
    .status.status-under_investigation { background: #eef2ff; color: #4338ca; }
    .status.status-resolved, .status.status-closed { background: #e8f5e9; color: #2e7d32; }

    .detail-grid {
      background: white;
      border-radius: 14px;
      padding: 4px 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child { border-bottom: none; }

    .label {
      font-size: 11px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 600;
    }

    .value {
      font-size: 14px;
      color: #1e293b;
      line-height: 1.4;
    }

    .loading, .error {
      padding: 24px 16px;
      text-align: center;
      font-size: 14px;
    }

    .error { color: #c92a2a; }

    .photos-section {
      background: white;
      border-radius: 14px;
      padding: 16px;
      margin-top: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
    }

    .photos-section h3 {
      margin: 0 0 12px;
      font-size: 14px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .photos-section h3 .material-icons { font-size: 18px; color: #667eea; }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .photo-thumb {
      border: none;
      padding: 0;
      background: #f1f5f9;
      border-radius: 10px;
      overflow: hidden;
      aspect-ratio: 1;
      cursor: pointer;
    }

    .photo-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .photo-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .photo-modal img {
      max-width: 100%;
      max-height: 90vh;
      border-radius: 8px;
    }

    .close-photo {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
    }
  `]
})
export class IncidentDetailComponent implements OnInit {
  incident: IncidentReport | null = null;
  isLoading = false;
  errorMessage = '';
  selectedPhotoUrl: string | null = null;

  /** Photo attachments from the persisted incident payload. */
  get photoAttachments(): NonNullable<IncidentReport['attachments']> {
    return (this.incident?.attachments ?? []).filter(a => a.type === 'PHOTO' && a.url);
  }

  constructor(
    private incidentService: IncidentReportService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Incident not found.';
      return;
    }
    this.isLoading = true;
    this.incidentService.getIncidentById(id).subscribe({
      next: incident => {
        this.incident = incident;
        this.isLoading = false;
        if (!incident) {
          this.errorMessage = 'Incident not found.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Could not load incident.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/mobile/guard/incidents']);
  }

  severityClass(severity: string): string {
    return `severity-${(severity || 'medium').toLowerCase()}`;
  }

  statusClass(status: string): string {
    return `status-${(status || 'reported').toLowerCase()}`;
  }

  formatStatus(value: string): string {
    return (value || '').replace(/_/g, ' ');
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openPhoto(url: string): void {
    this.selectedPhotoUrl = url;
  }

  closePhoto(): void {
    this.selectedPhotoUrl = null;
  }
}
