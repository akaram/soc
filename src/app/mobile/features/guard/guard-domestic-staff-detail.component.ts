import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomesticStaffService } from '../domestic-staff/services/domestic-staff.service';
import { DomesticStaff } from '../domestic-staff/models/domestic-staff.model';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { ToastService } from '../../../core/services/toast.service';
import { MobileAuthService } from '../../services/mobile-auth.service';

/**
 * Guard gate: full cook/maid profile + Approve entry (logs access via passcode API).
 */
@Component({
  selector: 'app-guard-domestic-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="page" *ngIf="staff; else loadingTpl">
      <button type="button" class="back" (click)="goBack()">
        <i class="material-icons">arrow_back</i> Back to list
      </button>

      <div class="hero">
        <app-profile-avatar [name]="staff.name" [photoUrl]="staff.photoUrl" size="lg"></app-profile-avatar>
        <h1>{{ staff.name }}</h1>
        <span class="role">{{ staff.role }}</span>
        <span class="status">{{ staff.status }}</span>
      </div>

      <section class="card">
        <h2>Gate details</h2>
        <p><i class="material-icons">home</i> Flat <strong>{{ staff.flatNumber }}</strong></p>
        <p><i class="material-icons">phone</i> {{ staff.phoneNumber }}</p>
        <p *ngIf="staff.documentType">
          <i class="material-icons">badge</i> {{ staff.documentType }}
          <span *ngIf="staff.documentNumber"> · {{ staff.documentNumber }}</span>
        </p>
        <p class="code-row">
          <i class="material-icons">lock</i>
          Passcode
          <strong>{{ staff.passcode }}</strong>
        </p>
      </section>

      <section class="card" *ngIf="staff.documentUrl">
        <h2>ID proof</h2>
        <img
          *ngIf="!isPdf(staff.documentUrl)"
          [src]="staff.documentUrl"
          [alt]="staff.documentType || 'ID'"
        />
        <a *ngIf="isPdf(staff.documentUrl)" [href]="staff.documentUrl" target="_blank" rel="noopener">Open PDF</a>
      </section>

      <div class="actions">
        <button type="button" class="btn-deny" [disabled]="busy" (click)="denyEntry()">Deny</button>
        <button type="button" class="btn-approve" [disabled]="busy" (click)="approveEntry()">
          {{ busy ? 'Saving…' : 'Approve entry' }}
        </button>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading">Loading staff…</div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 16px 16px 100px; background: #f5f7fa; min-height: 100%; }
    .back {
      border: none; background: transparent; color: #0f766e; font-weight: 600;
      display: flex; align-items: center; gap: 4px; margin-bottom: 12px; cursor: pointer; padding: 0;
    }
    .hero {
      text-align: center; background: white; border-radius: 16px; padding: 24px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 12px;
    }
    .hero h1 { margin: 12px 0 8px; font-size: 22px; color: #1e293b; }
    .role {
      display: inline-block; background: #fce7f3; color: #831843; font-size: 12px; font-weight: 700;
      text-transform: uppercase; padding: 4px 10px; border-radius: 999px; margin-right: 6px;
    }
    .status { font-size: 12px; font-weight: 700; color: #065f46; }
    .card {
      background: white; border-radius: 14px; padding: 16px; margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .card h2 { margin: 0 0 12px; font-size: 15px; color: #334155; }
    .card p {
      margin: 0 0 10px; display: flex; align-items: center; gap: 8px;
      color: #475569; font-size: 14px;
    }
    .card .material-icons { font-size: 18px; color: #94a3b8; }
    .code-row strong { margin-left: auto; letter-spacing: 0.2em; color: #0f766e; font-size: 18px; }
    .card img {
      width: 100%; max-height: 320px; object-fit: contain; border-radius: 10px;
      background: #f8fafc; border: 1px solid #e2e8f0;
    }
    .actions { display: flex; gap: 10px; margin-top: 8px; }
    .btn-deny, .btn-approve {
      flex: 1; border: none; border-radius: 12px; padding: 14px; font-weight: 700;
      font-size: 15px; cursor: pointer;
    }
    .btn-deny { background: #fee2e2; color: #b91c1c; }
    .btn-approve { background: #0f766e; color: white; }
    .btn-deny:disabled, .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
    .loading { padding: 40px; text-align: center; color: #64748b; }
  `]
})
export class GuardDomesticStaffDetailComponent implements OnInit {
  staff: DomesticStaff | null = null;
  busy = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: DomesticStaffService,
    private auth: MobileAuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }
    this.api.getDomesticStaffById(id).subscribe({
      next: s => {
        this.staff = s ?? null;
        if (!this.staff) {
          this.toast.error('Staff not found');
          this.goBack();
        }
      },
      error: () => {
        this.toast.error('Could not load staff');
        this.goBack();
      }
    });
  }

  isPdf(url: string): boolean {
    return url.startsWith('data:application/pdf');
  }

  approveEntry(): void {
    if (!this.staff?.id) {
      this.toast.error('Staff record missing');
      return;
    }
    if (!this.staff.passcode) {
      this.toast.error('No passcode on this staff record');
      return;
    }
    this.busy = true;
    const guard = this.auth.getCurrentUser();
    this.api
      .approveEntry(this.staff.id, {
        passcode: this.staff.passcode,
        entryGate: 'Main Gate',
        guardId: guard?.id || undefined
      })
      .subscribe({
        next: res => {
          this.busy = false;
          if (res.success) {
            this.toast.success(res.message || `Allowed ${this.staff?.name}`);
            this.router.navigate(['/mobile/guard/domestic-staff']);
          } else {
            this.toast.error(res.message || 'Access denied');
          }
        },
        error: err => {
          this.busy = false;
          const status = err?.status;
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            (typeof err?.error === 'string' ? err.error : null) ||
            (status === 404
              ? 'Approve API missing — restart the Spring Boot backend'
              : 'Approve failed — restart backend and try again');
          this.toast.error(String(msg));
        }
      });
  }

  /** Deny = refuse entry and return to list (no access log). */
  denyEntry(): void {
    this.toast.warning(`Denied entry for ${this.staff?.name || 'staff'}`);
    this.router.navigate(['/mobile/guard/domestic-staff']);
  }

  goBack(): void {
    this.router.navigate(['/mobile/guard/domestic-staff']);
  }
}
