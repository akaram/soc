import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomesticStaffService } from '../domestic-staff/services/domestic-staff.service';
import { DomesticStaff, StaffStatus } from '../domestic-staff/models/domestic-staff.model';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { ToastService } from '../../../core/services/toast.service';
import { switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Owner/Tenant: cooks & domestic help registered for their flat (view + share passcode).
 */
@Component({
  selector: 'app-resident-domestic-staff-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="page">
      <div class="intro">
        <h2>My Cook &amp; Staff</h2>
        <p *ngIf="flatLabel">Help registered for <strong>{{ flatLabel }}</strong> — share the passcode at the gate.</p>
        <p *ngIf="!flatLabel">Staff linked to your flat.</p>
      </div>

      <div class="search" *ngIf="staff.length">
        <i class="material-icons">search</i>
        <input type="search" [(ngModel)]="searchTerm" placeholder="Search name or role" />
      </div>

      <div class="loading" *ngIf="loading">Loading your staff…</div>
      <div class="error" *ngIf="loadError">{{ loadError }}</div>

      <div class="empty" *ngIf="!loading && !loadError && filtered.length === 0">
        <i class="material-icons">restaurant</i>
        <p>No cook or domestic staff for your flat yet.</p>
        <p class="hint">Ask society admin to add them under Domestic Staff for your flat.</p>
      </div>

      <article class="card" *ngFor="let s of filtered" (click)="openDetail(s)">
        <div class="card-top">
          <app-profile-avatar [name]="s.name" [photoUrl]="s.photoUrl" size="md"></app-profile-avatar>
          <div class="meta">
            <h3>{{ s.name }}</h3>
            <span class="role">{{ s.role }}</span>
            <span class="status" [class.active]="s.status === activeStatus">{{ s.status }}</span>
          </div>
          <i class="material-icons chevron">chevron_right</i>
        </div>
        <div class="pass-row">
          <i class="material-icons">lock</i>
          <span>Gate passcode</span>
          <strong>{{ s.passcode || '—' }}</strong>
        </div>
      </article>
    </div>
  `,
  styles: [`
    .page { padding: 16px 16px 100px; background: #f5f7fa; min-height: 100%; }
    .intro h2 { margin: 0 0 4px; font-size: 20px; color: #1e293b; }
    .intro p { margin: 0 0 14px; font-size: 13px; color: #64748b; }
    .search {
      display: flex; align-items: center; gap: 8px; background: white;
      border-radius: 12px; padding: 10px 14px; margin-bottom: 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .search input { border: none; outline: none; flex: 1; font-size: 14px; }
    .loading, .error, .empty { text-align: center; padding: 28px 12px; color: #64748b; }
    .error { color: #b91c1c; }
    .empty .material-icons { font-size: 40px; display: block; margin-bottom: 8px; color: #94a3b8; }
    .hint { font-size: 12px; color: #94a3b8; }
    .card {
      background: white; border-radius: 14px; padding: 14px; margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer;
    }
    .card-top { display: flex; gap: 12px; align-items: center; }
    .meta { flex: 1; min-width: 0; }
    .meta h3 { margin: 0 0 4px; font-size: 16px; color: #1e293b; }
    .role {
      display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase;
      background: #fce7f3; color: #831843; padding: 2px 8px; border-radius: 999px; margin-right: 6px;
    }
    .status { font-size: 11px; font-weight: 700; color: #64748b; }
    .status.active { color: #065f46; }
    .chevron { color: #cbd5e1; }
    .pass-row {
      margin-top: 12px; display: flex; align-items: center; gap: 8px;
      background: #f8fafc; padding: 10px 12px; border-radius: 10px; font-size: 13px; color: #475569;
    }
    .pass-row .material-icons { font-size: 18px; color: #94a3b8; }
    .pass-row strong { margin-left: auto; letter-spacing: 0.15em; color: #0f766e; font-size: 16px; }
  `]
})
export class ResidentDomesticStaffListComponent implements OnInit {
  staff: DomesticStaff[] = [];
  searchTerm = '';
  loading = true;
  loadError = '';
  flatLabel = '';
  readonly activeStatus = StaffStatus.ACTIVE;

  constructor(
    private api: DomesticStaffService,
    private auth: MobileAuthService,
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
        String(s.role).toLowerCase().includes(term) ||
        (s.passcode && s.passcode.includes(term))
    );
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    const user = this.auth.getCurrentUser();
    const flatId = user?.flatId?.trim();
    const flatNumber = user?.flatNumber?.trim();
    this.flatLabel = flatNumber ? `Flat ${flatNumber}` : '';

    // Prefer flat API; if no flatId, match society list by flat number.
    const source$ = flatId
      ? this.api.getDomesticStaffByFlat(flatId)
      : this.api.getDomesticStaffBySociety().pipe(
          map(rows =>
            flatNumber
              ? rows.filter(s => s.flatNumber?.toLowerCase() === flatNumber.toLowerCase())
              : []
          )
        );

    // Refresh profile once if flat is missing, then retry flat load.
    const load$ =
      !flatId && !flatNumber
        ? this.auth.refreshProfileFromServer().pipe(
            switchMap(() => {
              const u = this.auth.getCurrentUser();
              const id = u?.flatId?.trim();
              const num = u?.flatNumber?.trim();
              this.flatLabel = num ? `Flat ${num}` : '';
              if (id) {
                return this.api.getDomesticStaffByFlat(id);
              }
              if (num) {
                return this.api.getDomesticStaffBySociety().pipe(
                  map(rows => rows.filter(s => s.flatNumber?.toLowerCase() === num.toLowerCase()))
                );
              }
              return of([] as DomesticStaff[]);
            }),
            catchError(() => of([] as DomesticStaff[]))
          )
        : source$;

    load$.subscribe({
      next: rows => {
        this.staff = rows ?? [];
        this.loading = false;
        if (!flatId && !flatNumber && !this.staff.length) {
          this.loadError = 'Your account has no flat linked. Contact society admin.';
        }
      },
      error: () => {
        this.staff = [];
        this.loading = false;
        this.loadError = 'Could not load staff for your flat.';
        this.toast.error(this.loadError);
      }
    });
  }

  openDetail(s: DomesticStaff): void {
    this.router.navigate(['/mobile/my-staff', s.id]);
  }
}
