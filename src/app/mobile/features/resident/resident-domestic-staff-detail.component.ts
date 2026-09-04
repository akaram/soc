import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomesticStaffService } from '../domestic-staff/services/domestic-staff.service';
import { DomesticStaff } from '../domestic-staff/models/domestic-staff.model';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Owner/Tenant view of one cook/staff for their flat — details + passcode (no gate approve).
 */
@Component({
  selector: 'app-resident-domestic-staff-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="page" *ngIf="staff; else loadingTpl">
      <button type="button" class="back" (click)="goBack()">
        <i class="material-icons">arrow_back</i> Back
      </button>

      <div class="hero">
        <app-profile-avatar [name]="staff.name" [photoUrl]="staff.photoUrl" size="lg"></app-profile-avatar>
        <h1>{{ staff.name }}</h1>
        <span class="role">{{ staff.role }}</span>
        <span class="status">{{ staff.status }}</span>
      </div>

      <section class="card passcode-card">
        <h2>Gate passcode</h2>
        <p class="hint">Share this with your cook / help so the guard can verify entry.</p>
        <div class="code">{{ staff.passcode || '—' }}</div>
        <button type="button" class="btn-copy" (click)="copyPasscode()" [disabled]="!staff.passcode">
          <i class="material-icons">content_copy</i> Copy passcode
        </button>
      </section>

      <section class="card">
        <h2>Details</h2>
        <p><i class="material-icons">home</i> Flat <strong>{{ staff.flatNumber }}</strong></p>
        <p><i class="material-icons">phone</i> {{ staff.phoneNumber }}</p>
        <p *ngIf="staff.documentType">
          <i class="material-icons">badge</i> {{ staff.documentType }}
          <span *ngIf="staff.documentNumber"> · {{ staff.documentNumber }}</span>
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
    </div>

    <ng-template #loadingTpl>
      <div class="loading">Loading…</div>
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
    .card h2 { margin: 0 0 10px; font-size: 15px; color: #334155; }
    .card p {
      margin: 0 0 10px; display: flex; align-items: center; gap: 8px;
      color: #475569; font-size: 14px;
    }
    .card .material-icons { font-size: 18px; color: #94a3b8; }
    .passcode-card .hint { display: block; margin: 0 0 12px; color: #64748b; font-size: 13px; }
    .code {
      text-align: center; letter-spacing: 0.35em; font-size: 28px; font-weight: 800;
      color: #0f766e; padding: 12px; background: #f0fdfa; border-radius: 12px; margin-bottom: 12px;
    }
    .btn-copy {
      width: 100%; border: none; border-radius: 10px; padding: 12px; font-weight: 600;
      background: #0f766e; color: white; display: flex; align-items: center; justify-content: center;
      gap: 6px; cursor: pointer;
    }
    .btn-copy:disabled { opacity: 0.5; cursor: not-allowed; }
    .card img {
      width: 100%; max-height: 320px; object-fit: contain; border-radius: 10px;
      background: #f8fafc; border: 1px solid #e2e8f0;
    }
    .loading { padding: 40px; text-align: center; color: #64748b; }
  `]
})
export class ResidentDomesticStaffDetailComponent implements OnInit {
  staff: DomesticStaff | null = null;

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
        if (!s) {
          this.toast.error('Staff not found');
          this.goBack();
          return;
        }
        // Soft check: staff should belong to resident's flat when we know it.
        const user = this.auth.getCurrentUser();
        const flatId = user?.flatId?.trim();
        const flatNumber = user?.flatNumber?.trim()?.toLowerCase();
        if (flatId && s.flatId && s.flatId !== flatId) {
          this.toast.error('This staff is not linked to your flat');
          this.goBack();
          return;
        }
        if (!flatId && flatNumber && s.flatNumber?.toLowerCase() !== flatNumber) {
          this.toast.error('This staff is not linked to your flat');
          this.goBack();
          return;
        }
        this.staff = s;
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

  copyPasscode(): void {
    const code = this.staff?.passcode;
    if (!code || !navigator.clipboard) {
      this.toast.warning('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(code).then(
      () => this.toast.success('Passcode copied'),
      () => this.toast.error('Could not copy')
    );
  }

  goBack(): void {
    this.router.navigate(['/mobile/my-staff']);
  }
}
