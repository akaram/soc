import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomesticStaffService } from '../domestic-staff/services/domestic-staff.service';
import { DomesticStaff, StaffStatus } from '../domestic-staff/models/domestic-staff.model';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Guard gate list: cooks/maids from admin Domestic Staff — open detail to approve entry.
 */
@Component({
  selector: 'app-guard-domestic-staff-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="page">
      <div class="intro">
        <h2>Cooks &amp; daily staff</h2>
        <p>Tap a person to view photo, flat, ID and approve entry at the gate.</p>
      </div>

      <a class="verify-cta" routerLink="/mobile/guard/domestic-staff/verify">
        <i class="material-icons">vpn_key</i>
        <span>Enter 6-digit passcode</span>
        <i class="material-icons">chevron_right</i>
      </a>

      <div class="search">
        <i class="material-icons">search</i>
        <input type="search" [(ngModel)]="searchTerm" placeholder="Search name, flat, phone, or role" />
      </div>

      <div class="loading" *ngIf="loading">Loading staff…</div>
      <div class="error" *ngIf="loadError">{{ loadError }}</div>

      <div class="empty" *ngIf="!loading && !loadError && filtered.length === 0">
        <i class="material-icons">restaurant</i>
        <p>No active cooks or domestic staff for your society.</p>
        <p class="hint">Admin must add them under Domestic Staff (same society as this guard login).</p>
      </div>

      <article class="card" *ngFor="let s of filtered" (click)="openDetail(s)">
        <div class="card-top">
          <app-profile-avatar
            [name]="s.name"
            [photoUrl]="s.photoUrl"
            size="md"
          ></app-profile-avatar>
          <div class="meta">
            <h3>{{ s.name }}</h3>
            <span class="role">{{ s.role }}</span>
            <span class="flat">Flat {{ s.flatNumber }}</span>
          </div>
          <span class="status" [class.active]="s.status === activeStatus">{{ s.status }}</span>
        </div>

        <div class="rows">
          <div class="row" *ngIf="s.documentType">
            <i class="material-icons">badge</i>
            <span>{{ s.documentType }}{{ s.documentUrl ? ' · ID on file' : '' }}</span>
          </div>
          <div class="row">
            <i class="material-icons">phone</i>
            <span>{{ s.phoneNumber }}</span>
          </div>
        </div>

        <div class="actions" (click)="$event.stopPropagation()">
          <button type="button" class="btn-view" (click)="viewId(s)" [disabled]="!s.documentUrl && !s.documentType">
            <i class="material-icons">visibility</i>
            View ID
          </button>
          <button type="button" class="btn-allow" (click)="openDetail(s)">
            <i class="material-icons">check_circle</i>
            Review &amp; approve
          </button>
        </div>
      </article>

      <div class="modal-bg" *ngIf="idStaff" (click)="idStaff = null">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-h">
            <h3>ID — {{ idStaff.name }}</h3>
            <button type="button" (click)="idStaff = null">×</button>
          </div>
          <p><strong>Type:</strong> {{ idStaff.documentType || '—' }}</p>
          <p *ngIf="idStaff.documentNumber"><strong>Number:</strong> {{ idStaff.documentNumber }}</p>
          <img *ngIf="idStaff.documentUrl && !isPdf(idStaff.documentUrl)" [src]="idStaff.documentUrl" alt="ID scan" />
          <a *ngIf="idStaff.documentUrl && isPdf(idStaff.documentUrl)" [href]="idStaff.documentUrl" target="_blank" rel="noopener">Open PDF</a>
          <p class="muted" *ngIf="!idStaff.documentUrl">No scan attached.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 16px 16px 100px; background: #f5f7fa; min-height: 100%; }
    .intro h2 { margin: 0 0 4px; font-size: 20px; color: #1e293b; }
    .intro p { margin: 0 0 14px; font-size: 13px; color: #64748b; }
    .verify-cta {
      display: flex; align-items: center; gap: 10px;
      background: #0f766e; color: white; text-decoration: none;
      padding: 14px 16px; border-radius: 12px; font-weight: 600; margin-bottom: 14px;
    }
    .verify-cta .material-icons:last-child { margin-left: auto; }
    .search {
      display: flex; align-items: center; gap: 8px; background: white;
      border-radius: 12px; padding: 10px 14px; margin-bottom: 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .search input { border: none; outline: none; flex: 1; font-size: 14px; }
    .loading, .error, .empty { text-align: center; padding: 28px 12px; color: #64748b; }
    .error { color: #b91c1c; }
    .empty .material-icons { font-size: 40px; display: block; margin-bottom: 8px; }
    .hint { font-size: 12px; color: #94a3b8; }
    .card {
      background: white; border-radius: 14px; padding: 14px; margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer;
    }
    .card-top { display: flex; gap: 12px; align-items: flex-start; }
    .meta { flex: 1; min-width: 0; }
    .meta h3 { margin: 0 0 4px; font-size: 16px; color: #1e293b; }
    .role {
      display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase;
      background: #fce7f3; color: #831843; padding: 2px 8px; border-radius: 999px; margin-right: 6px;
    }
    .flat { font-size: 13px; color: #64748b; }
    .status { font-size: 11px; font-weight: 700; color: #64748b; }
    .status.active { color: #065f46; }
    .rows { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
    .row .material-icons { font-size: 18px; color: #94a3b8; }
    .actions { display: flex; gap: 8px; margin-top: 12px; }
    .btn-view, .btn-allow {
      flex: 1; border: none; border-radius: 10px; padding: 10px; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font-size: 13px;
    }
    .btn-view { background: #e0f2fe; color: #0369a1; }
    .btn-view:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-allow { background: #0f766e; color: white; }
    .modal-bg {
      position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .modal {
      background: white; border-radius: 16px; width: min(480px, 100%); max-height: 90vh;
      overflow: auto; padding: 16px;
    }
    .modal-h { display: flex; justify-content: space-between; align-items: center; }
    .modal-h h3 { margin: 0; }
    .modal-h button { border: none; background: #f1f5f9; width: 36px; height: 36px; border-radius: 50%; font-size: 22px; cursor: pointer; }
    .modal img { width: 100%; max-height: 55vh; object-fit: contain; margin-top: 12px; border-radius: 8px; background: #f8fafc; }
    .muted { color: #94a3b8; }
  `]
})
export class GuardDomesticStaffListComponent implements OnInit {
  staff: DomesticStaff[] = [];
  searchTerm = '';
  loading = true;
  loadError = '';
  idStaff: DomesticStaff | null = null;
  readonly activeStatus = StaffStatus.ACTIVE;

  constructor(
    private domesticStaffApi: DomesticStaffService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filtered(): DomesticStaff[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.staff;
    }
    return this.staff.filter(
      s =>
        s.name.toLowerCase().includes(term) ||
        s.flatNumber.toLowerCase().includes(term) ||
        s.phoneNumber.includes(term) ||
        String(s.role).toLowerCase().includes(term) ||
        (s.passcode && s.passcode.includes(term))
    );
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    // JWT-scoped active list so guard always sees cooks for their society.
    this.domesticStaffApi.getActiveStaffForGuard().subscribe({
      next: rows => {
        this.staff = rows ?? [];
        this.loading = false;
        if (!this.staff.length) {
          this.toast.warning('No active cooks/staff for your society yet');
        }
      },
      error: () => {
        this.staff = [];
        this.loading = false;
        this.loadError = 'Could not load domestic staff. Re-login as guard and try again.';
      }
    });
  }

  viewId(s: DomesticStaff): void {
    this.idStaff = s;
  }

  openDetail(s: DomesticStaff): void {
    this.router.navigate(['/mobile/guard/domestic-staff', s.id]);
  }

  isPdf(url: string): boolean {
    return url.startsWith('data:application/pdf');
  }
}
