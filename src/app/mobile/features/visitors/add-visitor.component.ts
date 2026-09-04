import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { VisitorApiService } from './visitor-api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Add Visitor (Mobile) — resident registers a guest via POST /visitors.
 */
@Component({
  selector: 'app-add-visitor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>{{ pageTitle }}</h2>
        <span style="width: 40px;"></span>
      </div>

      <div class="card" *ngIf="form">
        <p class="hint">{{ hintText }}</p>

        <form [formGroup]="form" (ngSubmit)="save()">
          <label>
            Visitor name
            <input class="ctrl" formControlName="name" placeholder="Full name" />
            <span class="field-error" *ngIf="showError('name')">Name is required (min 2 characters).</span>
          </label>

          <label>
            Phone number
            <input class="ctrl" formControlName="phone" type="tel" placeholder="e.g., 9876543210" />
            <span class="field-error" *ngIf="showError('phone')">Valid 10-digit phone is required.</span>
          </label>

          <label>
            Purpose of visit
            <select class="ctrl" formControlName="purpose">
              <option value="">Select purpose</option>
              <option value="Personal Visit">Personal Visit</option>
              <option value="Delivery">Delivery</option>
              <option value="Service">Service</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Guest">Guest</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Visiting flat
            <input class="ctrl" formControlName="visitingFlat" placeholder="e.g., A-101" />
          </label>

          <label>
            Tower / block (optional)
            <input class="ctrl" formControlName="visitingUnit" placeholder="e.g., Tower A" />
          </label>

          <div class="row">
            <label class="half">
              Visit date
              <input class="ctrl" formControlName="visitDate" type="date" />
            </label>
            <label class="half">
              Visit time
              <input class="ctrl" formControlName="visitTime" type="time" />
            </label>
          </div>

          <label>
            Expected duration (minutes)
            <input class="ctrl" formControlName="expectedDuration" type="number" min="1" />
            <span class="field-error" *ngIf="showError('expectedDuration')">
              Enter at least 1 minute.
            </span>
          </label>

          <label>
            Vehicle number (optional)
            <input class="ctrl" formControlName="vehicleNumber" placeholder="e.g., DL 01 AB 1234" />
          </label>

          <label>
            Number of visitors
            <input class="ctrl" formControlName="numberOfVisitors" type="number" min="1" />
          </label>

          <p class="error" *ngIf="submitError">{{ submitError }}</p>
          <p class="form-hint" *ngIf="form.invalid && form.touched && !saving">
            Please complete all required fields (name, phone, purpose, flat, date, time).
          </p>

          <button class="btn primary" type="submit" [disabled]="form.invalid || saving" [class.ready]="form.valid && !saving">
            {{ saving ? 'Submitting…' : 'Add Visitor' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      h2 { margin: 0; font-size: 18px; font-weight: 700; color: #2c3e50; }
      .icon-btn {
        background: none; border: none; width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; cursor: pointer; color: #2c3e50;
      }
      .card { margin: 16px; background: white; border-radius: 16px; padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
      .hint { font-size: 13px; color: #64748b; margin: 0 0 14px; line-height: 1.4; }
      label { display: block; margin: 10px 0; font-size: 13px; color: #64748b; }
      .row { display: flex; gap: 12px; }
      .half { flex: 1; }
      .ctrl {
        width: 100%; margin-top: 6px; padding: 12px; border: 1px solid #e2e8f0;
        border-radius: 12px; box-sizing: border-box; outline: none;
      }
      .btn {
        width: 100%; margin-top: 14px; padding: 12px 14px; border: none; border-radius: 12px;
        font-weight: 700; cursor: pointer;
      }
      .btn.primary { background: #667eea; color: white; }
      .btn.primary.ready {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.45);
      }
      .btn:disabled { opacity: 0.45; cursor: not-allowed; background: #c7d2fe; color: #64748b; }
      .field-error { display: block; margin-top: 4px; font-size: 12px; color: #dc2626; }
      .form-hint { font-size: 12px; color: #94a3b8; margin: 8px 0 0; }
      .error { color: #dc2626; font-size: 13px; margin-top: 8px; }
    `
  ]
})
export class AddVisitorComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  submitError = '';
  pageTitle = 'Add Visitor';
  hintText = 'Visitor will appear as Pending until approved at the gate.';

  constructor(
    private fb: FormBuilder,
    private auth: MobileAuthService,
    private visitorApi: VisitorApiService,
    private toast: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.data['preInvite']) {
      this.pageTitle = 'Pre-invite Visitor';
      this.hintText = 'Schedule a visitor in advance. They will appear as Pending until approved.';
    }

    const user = this.auth.getCurrentUser();
    if (!user) {
      this.router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl: '/mobile/visitors/add' } });
      return;
    }

    const now = new Date();
    const visitDate = now.toISOString().split('T')[0];
    const visitTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.minLength(10)]],
      purpose: ['', Validators.required],
      visitingFlat: [user.flatNumber || '', Validators.required],
      visitingUnit: [user.tower || ''],
      visitDate: [visitDate, Validators.required],
      visitTime: [visitTime, Validators.required],
      expectedDuration: [60, [Validators.required, Validators.min(1)]],
      vehicleNumber: [''],
      numberOfVisitors: [1, [Validators.required, Validators.min(1)]]
    });
  }

  save(): void {
    const user = this.auth.getCurrentUser();
    if (!user || this.form.invalid) return;

    if (!user.societyId) {
      this.submitError = 'Society not set. Please log in again or complete society setup.';
      this.toast.warning('Society not set. Please log in again.');
      return;
    }

    this.saving = true;
    this.submitError = '';

    const v = this.form.value;
    let visitTime = String(v.visitTime || '09:00').trim();
    if (visitTime.split(':').length === 2) {
      visitTime = `${visitTime}:00`;
    }

    const visitingUnit = String(v.visitingUnit || '').trim();
    const requiresTower = !!visitingUnit && /tower\s*[abc]/i.test(visitingUnit);

    const payload: Record<string, unknown> = {
      societyId: user.societyId,
      name: String(v.name).trim(),
      phone: String(v.phone).trim(),
      purpose: String(v.purpose).trim(),
      visitingFlat: String(v.visitingFlat).trim(),
      visitingUnit: visitingUnit || undefined,
      hostName: user.name,
      hostPhone: user.phone || '0000000000',
      hostId: user.id,
      visitDate: String(v.visitDate),
      visitTime,
      expectedDuration: Number(v.expectedDuration) || 60,
      vehicleNumber: String(v.vehicleNumber || '').trim() || undefined,
      vehicleType: v.vehicleNumber?.trim() ? 'FOUR_WHEELER' : 'NONE',
      numberOfVisitors: Number(v.numberOfVisitors) || 1,
      status: 'PENDING',
      approvalStatus: 'PENDING',
      approvalLevel: requiresTower ? 'BOTH' : 'GATE_LEVEL',
      invitedBy: user.id
    };

    this.visitorApi.createVisitor(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Visitor added successfully. Awaiting approval.');
        this.router.navigate(['/mobile/visitors']);
      },
      error: err => {
        this.saving = false;
        const status = err?.status;
        if (status === 401) {
          const msg = 'Session expired. Please log out and log in again.';
          this.submitError = msg;
          this.toast.error(msg);
          return;
        }
        const msg =
          err?.error?.message || err?.message || 'Could not add visitor. Check your connection.';
        this.submitError = msg;
        this.toast.error(msg);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/mobile/visitors']);
  }

  /** Show inline validation after the user has touched a field. */
  showError(controlName: string): boolean {
    const c = this.form?.get(controlName);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }
}
