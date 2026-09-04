import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { IncidentReportService } from '../services/incident-report.service';
import {
  IncidentReport,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  Priority
} from '../models/incident-report.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-incident-report-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="incident-report-detail-container" *ngIf="incident">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Incidents
        </button>
        <div class="header-actions">
          <button class="btn-edit" (click)="editIncident()">
            <i class="material-icons">edit</i>
            Edit
          </button>
          <button 
            class="btn-resolve" 
            *ngIf="incident.status !== IncidentStatus.RESOLVED && incident.status !== IncidentStatus.CLOSED"
            (click)="resolveIncident()">
            <i class="material-icons">done_all</i>
            Resolve
          </button>
          <button class="btn-danger" (click)="deleteIncident()">
            <i class="material-icons">delete</i>
            Delete
          </button>
        </div>
      </div>

      <div class="detail-card">
        <!-- Incident Header -->
        <div class="incident-header-section">
          <div class="incident-icon-large" [ngClass]="'severity-' + incident.severity.toLowerCase()">
            <i class="material-icons">{{ getIncidentTypeIcon(incident.type) }}</i>
          </div>
          <div class="incident-header-info">
            <h1>{{ incident.title }}</h1>
            <div class="incident-badges">
              <span class="badge-incident-number">{{ incident.incidentNumber }}</span>
              <span class="badge-severity" [ngClass]="'severity-' + incident.severity.toLowerCase()">
                {{ incident.severity }}
              </span>
              <span class="badge-priority" [ngClass]="'priority-' + incident.priority.toLowerCase()">
                {{ incident.priority }}
              </span>
              <span class="badge-status" [ngClass]="'status-' + incident.status.toLowerCase()">
                {{ getStatusLabel(incident.status) }}
              </span>
              <span class="badge-type">{{ getTypeLabel(incident.type) }}</span>
            </div>
            <p class="incident-description">{{ incident.description }}</p>
          </div>
        </div>

        <!-- Information Grid -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">place</i>
            </div>
            <div class="info-content">
              <div class="info-label">Location</div>
              <div class="info-value">{{ incident.location }}</div>
              <div class="info-subtext" *ngIf="incident.locationDetails">{{ incident.locationDetails }}</div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">person</i>
            </div>
            <div class="info-content">
              <div class="info-label">Reported By</div>
              <div class="info-value">{{ incident.reportedByGuardName }}</div>
              <div class="info-subtext" *ngIf="incident.reportedByGuardBadgeNumber">
                Badge: {{ incident.reportedByGuardBadgeNumber }}
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">schedule</i>
            </div>
            <div class="info-content">
              <div class="info-label">Incident Time</div>
              <div class="info-value">{{ formatDateTime(incident.incidentDateTime) }}</div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">history</i>
            </div>
            <div class="info-content">
              <div class="info-label">Reported At</div>
              <div class="info-value">{{ formatDateTime(incident.reportedDateTime) }}</div>
            </div>
          </div>

          <div class="info-card" *ngIf="incident.routeName">
            <div class="info-icon">
              <i class="material-icons">route</i>
            </div>
            <div class="info-content">
              <div class="info-label">Route</div>
              <div class="info-value">{{ incident.routeName }}</div>
            </div>
          </div>

          <div class="info-card" *ngIf="incident.assignedToName">
            <div class="info-icon">
              <i class="material-icons">assignment</i>
            </div>
            <div class="info-content">
              <div class="info-label">Assigned To</div>
              <div class="info-value">{{ incident.assignedToName }}</div>
            </div>
          </div>
        </div>

        <!-- Authorities Notified -->
        <div class="authorities-section" *ngIf="incident.policeNotified || incident.fireDepartmentNotified || incident.medicalServicesNotified">
          <h2>
            <i class="material-icons">notifications_active</i>
            Authorities Notified
          </h2>
          <div class="authorities-list">
            <div class="authority-item" *ngIf="incident.policeNotified">
              <i class="material-icons">local_police</i>
              <span>Police Department</span>
              <span class="authority-detail" *ngIf="incident.policeReportNumber">
                Report #: {{ incident.policeReportNumber }}
              </span>
            </div>
            <div class="authority-item" *ngIf="incident.fireDepartmentNotified">
              <i class="material-icons">fire_truck</i>
              <span>Fire Department</span>
            </div>
            <div class="authority-item" *ngIf="incident.medicalServicesNotified">
              <i class="material-icons">medical_services</i>
              <span>Medical Services</span>
            </div>
          </div>
        </div>

        <!-- Investigation -->
        <div class="investigation-section" *ngIf="incident.investigationNotes || incident.investigationStartedAt">
          <h2>
            <i class="material-icons">search</i>
            Investigation
          </h2>
          <div class="investigation-content">
            <div class="investigation-item" *ngIf="incident.investigationStartedAt">
              <strong>Started:</strong> {{ formatDateTime(incident.investigationStartedAt) }}
              <span *ngIf="incident.investigatorName"> by {{ incident.investigatorName }}</span>
            </div>
            <div class="investigation-item" *ngIf="incident.investigationCompletedAt">
              <strong>Completed:</strong> {{ formatDateTime(incident.investigationCompletedAt) }}
            </div>
            <div class="investigation-notes" *ngIf="incident.investigationNotes">
              <strong>Notes:</strong>
              <p>{{ incident.investigationNotes }}</p>
            </div>
          </div>
        </div>

        <!-- Resolution -->
        <div class="resolution-section" *ngIf="incident.resolvedAt">
          <h2>
            <i class="material-icons">check_circle</i>
            Resolution
          </h2>
          <div class="resolution-content">
            <div class="resolution-item">
              <strong>Resolved:</strong> {{ formatDateTime(incident.resolvedAt) }}
              <span *ngIf="incident.resolvedByName"> by {{ incident.resolvedByName }}</span>
            </div>
            <div class="resolution-notes" *ngIf="incident.resolutionNotes">
              <strong>Resolution Notes:</strong>
              <p>{{ incident.resolutionNotes }}</p>
            </div>
          </div>
        </div>

        <!-- Witnesses -->
        <div class="witnesses-section" *ngIf="incident.witnesses && incident.witnesses.length > 0">
          <h2>
            <i class="material-icons">people</i>
            Witnesses ({{ incident.witnesses.length }})
          </h2>
          <div class="witnesses-list">
            <div *ngFor="let witness of incident.witnesses" class="witness-item">
              <div class="witness-name">{{ witness.name }}</div>
              <div class="witness-contact" *ngIf="witness.contact">{{ witness.contact }}</div>
              <div class="witness-statement" *ngIf="witness.statement">{{ witness.statement }}</div>
            </div>
          </div>
        </div>

        <!-- Evidence -->
        <div class="evidence-section" *ngIf="incident.evidenceCollected || photoAttachments.length > 0">
          <h2>
            <i class="material-icons">folder</i>
            Evidence
          </h2>
          <div class="evidence-content">
            <div class="evidence-item" *ngIf="incident.evidenceCollected">
              <i class="material-icons">check_circle</i>
              <span>Evidence Collected</span>
            </div>
            <div class="evidence-description" *ngIf="incident.evidenceDescription">
              <strong>Description:</strong>
              <p>{{ incident.evidenceDescription }}</p>
            </div>
            <div class="photo-attachments" *ngIf="photoAttachments.length > 0">
              <strong>Photos ({{ photoAttachments.length }})</strong>
              <div class="photos-grid">
                <button
                  type="button"
                  class="photo-thumb"
                  *ngFor="let photo of photoAttachments"
                  (click)="openPhoto(photo.url)">
                  <img [src]="photo.url" [alt]="photo.fileName || 'Incident photo'" />
                  <span class="photo-name" *ngIf="photo.fileName">{{ photo.fileName }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Follow-up -->
        <div class="followup-section" *ngIf="incident.requiresFollowUp">
          <h2>
            <i class="material-icons">event</i>
            Follow-up Required
          </h2>
          <div class="followup-content">
            <div class="followup-item" *ngIf="incident.followUpDate">
              <strong>Follow-up Date:</strong> {{ formatDate(incident.followUpDate) }}
            </div>
            <div class="followup-notes" *ngIf="incident.followUpNotes">
              <strong>Follow-up Notes:</strong>
              <p>{{ incident.followUpNotes }}</p>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="tags-section" *ngIf="incident.tags && incident.tags.length > 0">
          <h2>
            <i class="material-icons">label</i>
            Tags
          </h2>
          <div class="tags-list">
            <span *ngFor="let tag of incident.tags" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div class="loading-state" *ngIf="isLoading">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading incident details...</p>
    </div>

    <!-- Error State -->
    <div class="error-state" *ngIf="!isLoading && !incident">
      <i class="material-icons">error_outline</i>
      <p>Incident not found</p>
      <button class="btn-primary" (click)="goBack()">Back to Incidents</button>
    </div>

    <!-- Full-screen photo viewer -->
    <div class="photo-modal" *ngIf="selectedPhotoUrl" (click)="closePhoto()">
      <button type="button" class="close-photo" (click)="closePhoto()">
        <i class="material-icons">close</i>
      </button>
      <img [src]="selectedPhotoUrl" alt="Incident photo" (click)="$event.stopPropagation()" />
    </div>
  `,
  styles: [`
    .incident-report-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .btn-back {
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
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-edit,
    .btn-resolve,
    .btn-danger {
      padding: 10px 20px;
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

    .btn-edit {
      background: #17a2b8;
      color: white;
    }

    .btn-edit:hover {
      background: #138496;
    }

    .btn-resolve {
      background: #28a745;
      color: white;
    }

    .btn-resolve:hover {
      background: #218838;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .detail-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .incident-header-section {
      display: flex;
      gap: 24px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .incident-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 40px;
      flex-shrink: 0;
    }

    .incident-icon-large.severity-critical {
      background: #dc3545;
    }

    .incident-icon-large.severity-high {
      background: #ffc107;
    }

    .incident-icon-large.severity-medium {
      background: #17a2b8;
    }

    .incident-icon-large.severity-low {
      background: #6c757d;
    }

    .incident-header-info {
      flex: 1;
    }

    .incident-header-info h1 {
      margin: 0 0 12px 0;
      font-size: 32px;
      color: #2c3e50;
    }

    .incident-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .badge-incident-number,
    .badge-severity,
    .badge-priority,
    .badge-status,
    .badge-type {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-incident-number {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-severity.severity-critical {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-severity.severity-high {
      background: #fff3cd;
      color: #856404;
    }

    .badge-severity.severity-medium {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-severity.severity-low {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-priority.priority-urgent {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-priority.priority-high {
      background: #fff3cd;
      color: #856404;
    }

    .badge-priority.priority-normal {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-priority.priority-low {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.status-reported {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.status-under_investigation {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-status.status-resolved {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.status-escalated {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-type {
      background: #e7f3ff;
      color: #004085;
    }

    .incident-description {
      margin: 12px 0 0 0;
      color: #7f8c8d;
      font-size: 15px;
      line-height: 1.6;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .info-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
    }

    .info-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;
    }

    .info-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .info-value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 600;
    }

    .info-subtext {
      font-size: 13px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .authorities-section,
    .investigation-section,
    .resolution-section,
    .witnesses-section,
    .evidence-section,
    .followup-section,
    .tags-section {
      margin-bottom: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .authorities-section h2,
    .investigation-section h2,
    .resolution-section h2,
    .witnesses-section h2,
    .evidence-section h2,
    .followup-section h2,
    .tags-section h2 {
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .authorities-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .authority-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .authority-detail {
      margin-left: auto;
      font-size: 13px;
      color: #7f8c8d;
    }

    .investigation-content,
    .resolution-content,
    .followup-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .investigation-item,
    .resolution-item,
    .followup-item {
      font-size: 14px;
      color: #2c3e50;
    }

    .investigation-notes,
    .resolution-notes,
    .followup-notes {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
    }

    .investigation-notes p,
    .resolution-notes p,
    .followup-notes p {
      margin: 8px 0 0 0;
      color: #2c3e50;
    }

    .witnesses-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .witness-item {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .witness-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .witness-contact {
      font-size: 13px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .witness-statement {
      font-size: 14px;
      color: #2c3e50;
      font-style: italic;
    }

    .evidence-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .evidence-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #d4edda;
      border-radius: 8px;
      color: #155724;
      font-weight: 600;
    }

    .evidence-description {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
    }

    .evidence-description p {
      margin: 8px 0 0 0;
      color: #2c3e50;
    }

    .photo-attachments {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .photo-attachments strong {
      font-size: 14px;
      color: #2c3e50;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }

    .photo-thumb {
      border: 1px solid #e2e8f0;
      padding: 0;
      background: #f8fafc;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      text-align: left;
    }

    .photo-thumb img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      display: block;
    }

    .photo-name {
      display: block;
      padding: 6px 8px;
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .photo-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .photo-modal img {
      max-width: min(1200px, 100%);
      max-height: 90vh;
      border-radius: 8px;
    }

    .close-photo {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
    }

    .tags-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tag {
      padding: 6px 12px;
      background: #e7f3ff;
      color: #004085;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .loading-state .material-icons,
    .error-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .btn-primary {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    @media (max-width: 768px) {
      .incident-header-section {
        flex-direction: column;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class IncidentReportDetailComponent implements OnInit, OnDestroy {
  incident: IncidentReport | null = null;
  isLoading = false;
  selectedPhotoUrl: string | null = null;

  /** Photo attachments from the persisted incident payload. */
  get photoAttachments(): NonNullable<IncidentReport['attachments']> {
    return (this.incident?.attachments ?? []).filter(a => a.type === 'PHOTO' && a.url);
  }

  IncidentType = IncidentType;
  IncidentSeverity = IncidentSeverity;
  IncidentStatus = IncidentStatus;
  Priority = Priority;

  private destroy$ = new Subject<void>();
  private incidentId: string | null = null;

  constructor(
    private incidentService: IncidentReportService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      if (params['id']) {
        this.incidentId = params['id'];
        if (this.incidentId) {
          this.loadIncident(this.incidentId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadIncident(id: string): void {
    this.isLoading = true;
    
    this.incidentService.getIncidentById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (incident) => {
          this.incident = incident;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading incident:', error);
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-patrol/incidents']);
  }

  editIncident(): void {
    if (this.incidentId) {
      this.router.navigate(['/admin/guard-patrol/incidents', this.incidentId, 'edit']);
    }
  }

  resolveIncident(): void {
    if (!this.incident) return;
    const notes = window.prompt('Enter resolution notes (optional):');
    if (notes === null) return;
    this.incidentService.updateIncident(this.incident.id, {
      status: IncidentStatus.RESOLVED,
      resolutionNotes: notes || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success && this.incidentId) {
            this.toast.success('Incident resolved.');
            this.loadIncident(this.incidentId);
          } else {
            this.toast.error(response.errors?.join(', ') || response.message || 'Could not resolve incident.');
          }
        },
        error: error => {
          console.error('Error resolving incident:', error);
          this.toast.error('Error resolving incident.');
        }
      });
  }

  deleteIncident(): void {
    if (!this.incident) return;
    this.incidentService.deleteIncident(this.incident.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success) {
            this.toast.warning('Incident deleted.');
            this.goBack();
          } else {
            this.toast.error(response.errors?.join(', ') || response.message || 'Could not delete incident.');
          }
        },
        error: error => {
          console.error('Error deleting incident:', error);
          this.toast.error('Error deleting incident.');
        }
      });
  }

  getTypeLabel(type: IncidentType): string {
    const labels: { [key: string]: string } = {
      'THEFT': 'Theft',
      'VANDALISM': 'Vandalism',
      'UNAUTHORIZED_ACCESS': 'Unauthorized Access',
      'TRESPASSING': 'Trespassing',
      'MEDICAL_EMERGENCY': 'Medical Emergency',
      'FIRE': 'Fire',
      'SUSPICIOUS_ACTIVITY': 'Suspicious Activity',
      'EQUIPMENT_FAILURE': 'Equipment Failure',
      'SECURITY_BREACH': 'Security Breach',
      'ASSAULT': 'Assault',
      'VEHICLE_ACCIDENT': 'Vehicle Accident',
      'NATURAL_DISASTER': 'Natural Disaster',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  }

  getIncidentTypeIcon(type: IncidentType): string {
    const icons: { [key: string]: string } = {
      'THEFT': 'shopping_bag',
      'VANDALISM': 'build',
      'UNAUTHORIZED_ACCESS': 'lock',
      'TRESPASSING': 'person_off',
      'MEDICAL_EMERGENCY': 'medical_services',
      'FIRE': 'local_fire_department',
      'SUSPICIOUS_ACTIVITY': 'visibility',
      'EQUIPMENT_FAILURE': 'settings',
      'SECURITY_BREACH': 'security',
      'ASSAULT': 'warning',
      'VEHICLE_ACCIDENT': 'directions_car',
      'NATURAL_DISASTER': 'nature',
      'OTHER': 'report_problem'
    };
    return icons[type] || 'report_problem';
  }

  getStatusLabel(status: IncidentStatus): string {
    const labels: { [key: string]: string } = {
      'REPORTED': 'Reported',
      'UNDER_INVESTIGATION': 'Under Investigation',
      'RESOLVED': 'Resolved',
      'ESCALATED': 'Escalated',
      'CLOSED': 'Closed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  openPhoto(url: string): void {
    this.selectedPhotoUrl = url;
  }

  closePhoto(): void {
    this.selectedPhotoUrl = null;
  }
}

