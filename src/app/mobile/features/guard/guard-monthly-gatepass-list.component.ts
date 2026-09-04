import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  GuardActiveGatepass,
  GuardDashboardService
} from '../../services/guard-dashboard.service';
import { ToastService } from '../../../core/services/toast.service';
import { VisitorManagementService } from '../../../modules/visitor-management/services/visitor-management.service';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';

/**
 * Guard view: active monthly gatepasses valid today (e.g. 31-day family pass).
 */
@Component({
  selector: 'app-guard-monthly-gatepass-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="gatepass-page">
      <div class="page-intro">
        <h2>Monthly Gatepasses</h2>
        <p>Approved passes valid today — allow entry after verifying visitor ID.</p>
      </div>

      <div class="search-bar">
        <i class="material-icons">search</i>
        <input
          type="search"
          [(ngModel)]="searchTerm"
          placeholder="Search name, flat, or phone"
        />
      </div>

      <div class="loading" *ngIf="loading">Loading gatepasses…</div>
      <div class="error" *ngIf="loadError">{{ loadError }}</div>

      <div class="empty" *ngIf="!loading && !loadError && filtered.length === 0">
        <i class="material-icons">badge</i>
        <p>No active monthly gatepasses for today.</p>
      </div>

      <div class="gatepass-list" *ngIf="!loading && filtered.length > 0">
        <article class="gatepass-card" *ngFor="let gp of filtered">
          <div class="card-head">
            <app-profile-avatar
              [photoUrl]="gp.photo"
              [name]="gp.visitorName"
              role="GUARD"
              size="md"
              fallbackGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            ></app-profile-avatar>
            <div class="head-text">
              <h3>{{ gp.visitorName }}</h3>
              <span class="validity-pill">{{ gp.validityDays }} days left</span>
            </div>
          </div>

          <div class="details">
            <p><i class="material-icons">home</i> Flat {{ gp.flatNumber }}</p>
            <p><i class="material-icons">phone</i> {{ gp.phone }}</p>
            <p><i class="material-icons">info</i> {{ gp.purpose }}</p>
            <p><i class="material-icons">event</i> Valid until {{ formatDate(gp.endDate) }}</p>
            <p class="notes" *ngIf="gp.notes"><i class="material-icons">notes</i> {{ gp.notes }}</p>
          </div>

          <button type="button" class="allow-btn" (click)="allowEntry(gp)" [disabled]="entryBusy === gp.id">
            <i class="material-icons">how_to_reg</i>
            {{ entryBusy === gp.id ? 'Logging…' : 'Allow entry' }}
          </button>
        </article>
      </div>
    </div>
  `,
  styles: [`
    .gatepass-page {
      padding: 16px 16px 100px;
      background: #f5f7fa;
      min-height: 100%;
    }

    .page-intro h2 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #1e293b;
    }

    .page-intro p {
      margin: 0 0 16px;
      font-size: 13px;
      color: #64748b;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .search-bar .material-icons { color: #94a3b8; font-size: 20px; }
    .search-bar input {
      border: none;
      outline: none;
      flex: 1;
      font-size: 14px;
    }

    .loading, .error, .empty {
      text-align: center;
      padding: 24px 16px;
      color: #64748b;
      background: white;
      border-radius: 12px;
    }

    .error { color: #dc2626; }

    .empty .material-icons {
      font-size: 40px;
      color: #cbd5e1;
      display: block;
      margin-bottom: 8px;
    }

    .gatepass-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gatepass-card {
      background: white;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-left: 4px solid #667eea;
    }

    .card-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
    }

    .head-text h3 {
      margin: 0 0 6px;
      font-size: 18px;
      color: #1e293b;
    }

    .validity-pill {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
    }

    .details p {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 0 8px;
      font-size: 14px;
      color: #475569;
    }

    .details .material-icons {
      font-size: 18px;
      color: #667eea;
      flex-shrink: 0;
    }

    .details .notes {
      font-size: 13px;
      color: #64748b;
    }

    .allow-btn {
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      border: none;
      border-radius: 10px;
      background: #667eea;
      color: white;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }

    .allow-btn:disabled {
      opacity: 0.7;
      cursor: wait;
    }
  `]
})
export class GuardMonthlyGatepassListComponent implements OnInit {
  gatepasses: GuardActiveGatepass[] = [];
  searchTerm = '';
  loading = false;
  loadError = '';
  entryBusy = '';

  constructor(
    private guardDashboard: GuardDashboardService,
    private visitorService: VisitorManagementService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filtered(): GuardActiveGatepass[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) {
      return this.gatepasses;
    }
    return this.gatepasses.filter(
      gp =>
        gp.visitorName.toLowerCase().includes(q) ||
        gp.flatNumber.toLowerCase().includes(q) ||
        gp.phone.includes(q)
    );
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.guardDashboard.loadActiveGatepasses().subscribe({
      next: rows => {
        this.gatepasses = rows;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load monthly gatepasses.';
        this.loading = false;
      }
    });
  }

  allowEntry(gp: GuardActiveGatepass): void {
    this.entryBusy = gp.id;
    this.visitorService.recordGatepassVisit(gp.id).subscribe({
      next: res => {
        this.entryBusy = '';
        if (res.success) {
          this.toast.success(`${gp.visitorName} allowed — monthly gatepass valid.`);
        } else {
          this.toast.warning(res.message || 'Could not log entry.');
        }
      },
      error: () => {
        this.entryBusy = '';
        this.toast.error('Failed to log gatepass entry.');
      }
    });
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
