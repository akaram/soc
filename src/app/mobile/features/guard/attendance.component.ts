import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FacialAttendanceService } from '../../../modules/guard-management/services/facial-attendance.service';
import { SessionContextService } from '../../../core/services/session-context.service';

/**
 * Mobile guard attendance — mark check-in via facial capture API.
 */
@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="attendance-container">
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1><i class="material-icons">fingerprint</i> Attendance</h1>
        </div>
      </div>

      <div class="content">
        <div class="info-card">
          <i class="material-icons">face</i>
          <p>Take a selfie to mark your attendance for today's shift.</p>

          <div class="preview" *ngIf="previewUrl">
            <img [src]="previewUrl" alt="Selfie preview" />
          </div>

          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
          <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

          <button class="btn-capture" (click)="captureSelfie()" [disabled]="isSubmitting">
            <i class="material-icons">photo_camera</i>
            {{ isSubmitting ? 'Submitting…' : 'Capture & Mark Attendance' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .attendance-container { min-height: 100vh; background: #f5f7fa; }
    .page-header {
      background: linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%);
      color: white; padding: 16px; display: flex; align-items: center; gap: 12px;
    }
    .back-btn {
      background: rgba(255,255,255,0.2); border: none; color: white;
      width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    }
    .header-content h1 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px; }
    .content { padding: 24px; }
    .info-card {
      background: white; border-radius: 16px; padding: 24px; text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .info-card > i { font-size: 48px; color: #ff9f43; margin-bottom: 16px; }
    .info-card p { margin: 0 0 16px; color: #666; font-size: 14px; }
    .preview img { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; margin-bottom: 16px; }
    .btn-capture {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 14px 24px; background: #ff9f43; color: white; border: none;
      border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .btn-capture:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #c92a2a; font-size: 14px; }
    .success { color: #2b8a3e; font-size: 14px; }
  `]
})
export class AttendanceComponent implements OnInit {
  previewUrl = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private facialAttendance: FacialAttendanceService,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {}

  /** Open camera/file picker and submit selfie to attendance API. */
  captureSelfie(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.previewUrl = dataUrl;
        this.submitAttendance(dataUrl);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /** POST facial attendance capture for the logged-in guard. */
  private submitAttendance(faceImage: string): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.facialAttendance
      .captureAttendance({ faceImage, location: 'Mobile Guard App' })
      .subscribe({
        next: res => {
          this.isSubmitting = false;
          if (res.success) {
            this.successMessage = res.message || 'Attendance marked successfully.';
          } else {
            this.errorMessage = res.message || 'Attendance capture failed.';
          }
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = 'Could not mark attendance. Check API connection.';
        }
      });
  }

  goBack(): void {
    window.history.back();
  }
}
