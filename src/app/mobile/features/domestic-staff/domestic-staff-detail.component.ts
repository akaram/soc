import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomesticStaffService } from './services/domestic-staff.service';
import { DomesticStaff, StaffStatus } from './models/domestic-staff.model';

@Component({
  selector: 'app-domestic-staff-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="staff-detail-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Staff Details</h1>
        <button class="edit-btn" (click)="editStaff()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>

      <div class="content" *ngIf="staff && !loading">
        <!-- Profile Section -->
        <div class="profile-card">
          <img [src]="staff.photoUrl || 'assets/default-avatar.png'" [alt]="staff.name" class="profile-photo">
          <h2>{{ staff.name }}</h2>
          <div class="role-badge" [ngClass]="getRoleClass(staff.role)">
            {{ staff.role }}
          </div>
          <span class="status-badge" [ngClass]="getStatusClass(staff.status)">
            {{ staff.status }}
          </span>
          
          <div class="rating-section" *ngIf="averageRating > 0">
            <div class="stars">
              <span *ngFor="let star of [1,2,3,4,5]" class="star" [class.filled]="star <= averageRating">★</span>
            </div>
            <span class="rating-text">{{ averageRating }} / 5.0</span>
          </div>
        </div>

        <!-- Passcode Section -->
        <div class="info-card passcode-card">
          <div class="card-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Access Passcode
            </h3>
          </div>
          <div class="passcode-display-large">
            <span class="passcode">{{ staff.passcode }}</span>
            <button class="regenerate-btn" (click)="regeneratePasscode()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Regenerate
            </button>
          </div>
          <p class="passcode-note">Share this passcode with the staff for gate entry verification</p>
        </div>

        <!-- Contact Information -->
        <div class="info-card">
          <div class="card-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Contact Information
            </h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Primary Phone</span>
              <span class="value">{{ staff.phoneNumber }}</span>
            </div>
            <div class="info-item" *ngIf="staff.alternatePhone">
              <span class="label">Alternate Phone</span>
              <span class="value">{{ staff.alternatePhone }}</span>
            </div>
            <div class="info-item" *ngIf="staff.address">
              <span class="label">Address</span>
              <span class="value">{{ staff.address }}</span>
            </div>
          </div>
        </div>

        <!-- Document Information -->
        <div class="info-card" *ngIf="staff.documentType || staff.documentNumber || staff.documentUrl">
          <div class="card-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Identity Document
            </h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Document Type</span>
              <span class="value">{{ staff.documentType }}</span>
            </div>
            <div class="info-item" *ngIf="staff.documentNumber">
              <span class="label">Document Number</span>
              <span class="value">{{ staff.documentNumber }}</span>
            </div>
          </div>
          <div class="doc-scan" *ngIf="staff.documentUrl">
            <img
              *ngIf="!staff.documentUrl.startsWith('data:application/pdf')"
              [src]="staff.documentUrl"
              alt="ID document"
            />
            <a *ngIf="staff.documentUrl.startsWith('data:application/pdf')" [href]="staff.documentUrl" target="_blank" rel="noopener">
              Open PDF
            </a>
          </div>
          <p class="doc-hint" *ngIf="!staff.documentUrl">No ID scan on file for this staff member.</p>
        </div>

        <!-- Emergency Contact -->
        <div class="info-card" *ngIf="staff.emergencyContact">
          <div class="card-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Emergency Contact
            </h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name</span>
              <span class="value">{{ staff.emergencyContact.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">Relationship</span>
              <span class="value">{{ staff.emergencyContact.relationship }}</span>
            </div>
            <div class="info-item">
              <span class="label">Phone Number</span>
              <span class="value">{{ staff.emergencyContact.phoneNumber }}</span>
            </div>
          </div>
        </div>

        <!-- Work Schedule -->
        <div class="info-card" *ngIf="staff.workSchedule">
          <div class="card-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Work Schedule
            </h3>
          </div>
          <div class="info-grid">
            <div class="info-item full-width">
              <span class="label">Employment Type</span>
              <span class="value">{{ staff.workSchedule.isFullTime ? 'Full-time' : 'Part-time' }}</span>
            </div>
            <div class="info-item full-width" *ngIf="staff.workSchedule.workingDays">
              <span class="label">Working Days</span>
              <div class="days-display">
                <span *ngFor="let day of staff.workSchedule.workingDays" class="day-badge">
                  {{ day.substring(0, 3) }}
                </span>
              </div>
            </div>
            <div class="info-item" *ngIf="staff.workSchedule.startTime">
              <span class="label">Start Time</span>
              <span class="value">{{ staff.workSchedule.startTime }}</span>
            </div>
            <div class="info-item" *ngIf="staff.workSchedule.endTime">
              <span class="label">End Time</span>
              <span class="value">{{ staff.workSchedule.endTime }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="action-buttons">
          <button class="action-button" (click)="viewAccessLog()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            View Access Log
          </button>
          <button class="action-button" (click)="viewAttendance()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
            </svg>
            View Attendance
          </button>
          <button class="action-button" (click)="rateStaff()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Rate Performance
          </button>
        </div>

        <!-- Danger Zone -->
        <div class="danger-zone">
          <h3>Danger Zone</h3>
          <button 
            class="danger-button" 
            *ngIf="staff.status === 'Active'"
            (click)="blockStaff()"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
            Block Staff Member
          </button>
          <button 
            class="warning-button" 
            *ngIf="staff.status === 'Blocked'"
            (click)="unblockStaff()"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9 11l3 3L22 4"></path>
            </svg>
            Unblock Staff Member
          </button>
          <button class="danger-button" (click)="deleteStaff()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete Staff Member
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading details...</p>
      </div>
    </div>
  `,
  styleUrls: ['./domestic-staff-detail.component.css']
})
export class DomesticStaffDetailComponent implements OnInit {
  staff: DomesticStaff | undefined;
  averageRating = 0;
  loading = true;
  staffId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private domesticStaffService: DomesticStaffService
  ) {}

  ngOnInit() {
    this.staffId = this.route.snapshot.paramMap.get('id')!;
    this.loadStaffDetails();
    this.loadRating();
  }

  loadStaffDetails() {
    this.domesticStaffService.getDomesticStaffById(this.staffId).subscribe({
      next: (staff) => {
        this.staff = staff;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading staff details:', err);
        this.loading = false;
      }
    });
  }

  loadRating() {
    this.domesticStaffService.getAverageRating(this.staffId).subscribe({
      next: (rating) => {
        this.averageRating = rating;
      }
    });
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace(/\s+/g, '-');
  }

  getStatusClass(status: StaffStatus): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  regeneratePasscode() {
    if (confirm('Generate a new 6-digit passcode? The old passcode will no longer work.')) {
      this.domesticStaffService.regeneratePasscode(this.staffId).subscribe({
        next: (newPasscode) => {
          if (this.staff) {
            this.staff.passcode = newPasscode;
            alert(`New passcode generated successfully!\n\nNew Passcode: ${newPasscode}\n\nPlease share this with the staff member.`);
          }
        },
        error: (err) => console.error('Error regenerating passcode:', err)
      });
    }
  }

  viewAccessLog() {
    this.router.navigate(['/mobile/domestic-staff/access-log', this.staffId]);
  }

  viewAttendance() {
    this.router.navigate(['/mobile/domestic-staff/attendance', this.staffId]);
  }

  rateStaff() {
    // Navigate to rating component or show rating dialog
    alert('Rating feature - to be implemented');
  }

  editStaff() {
    this.router.navigate(['/mobile/domestic-staff/edit', this.staffId]);
  }

  blockStaff() {
    if (confirm('Are you sure you want to block this staff member? They will not be able to access the premises.')) {
      this.domesticStaffService.blockStaff(this.staffId).subscribe({
        next: () => {
          alert('Staff member blocked successfully');
          this.loadStaffDetails();
        },
        error: (err) => console.error('Error blocking staff:', err)
      });
    }
  }

  unblockStaff() {
    if (confirm('Unblock this staff member? They will regain access to the premises.')) {
      this.domesticStaffService.unblockStaff(this.staffId).subscribe({
        next: () => {
          alert('Staff member unblocked successfully');
          this.loadStaffDetails();
        },
        error: (err) => console.error('Error unblocking staff:', err)
      });
    }
  }

  deleteStaff() {
    if (confirm('Are you sure you want to permanently delete this staff member? This action cannot be undone.')) {
      this.domesticStaffService.deleteDomesticStaff(this.staffId).subscribe({
        next: () => {
          alert('Staff member deleted successfully');
          this.router.navigate(['/mobile/domestic-staff']);
        },
        error: (err) => console.error('Error deleting staff:', err)
      });
    }
  }

  goBack() {
    this.router.navigate(['/mobile/domestic-staff']);
  }
}
