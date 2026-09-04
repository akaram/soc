import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { AmenityApiService, AmenityUi } from './amenity-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';

@Component({
  selector: 'app-book-amenity',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" routerLink="/mobile/amenities">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>{{ amenity?.name || 'Book amenity' }}</h2>
        <span style="width:40px"></span>
      </div>

      <p class="loading" *ngIf="loading">Loading…</p>

      <div class="card" *ngIf="amenity && form && !loading">
        <p class="desc">{{ amenity.description }}</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Date
            <input class="ctrl" type="date" formControlName="date" [min]="minDate" [max]="maxDate" />
          </label>

          <label>
            Time slot
            <select class="ctrl" formControlName="startTime">
              <option value="">Select slot</option>
              <option *ngFor="let s of availableSlots" [value]="s">{{ formatSlot(s) }}</option>
            </select>
            <span class="field-hint" *ngIf="slotsLoading">Loading available slots…</span>
            <span class="field-hint warn" *ngIf="!slotsLoading && slotsMessage">{{ slotsMessage }}</span>
            <span class="field-error" *ngIf="form.get('startTime')?.invalid && form.get('startTime')?.touched">
              Please select a time slot.
            </span>
          </label>

          <label>
            Duration (hours)
            <select class="ctrl" formControlName="durationHours">
              <option [ngValue]="1">1 hour</option>
              <option [ngValue]="2">2 hours</option>
              <option [ngValue]="3">3 hours</option>
              <option [ngValue]="4">4 hours</option>
            </select>
          </label>

          <label>
            Number of guests
            <input class="ctrl" type="number" formControlName="guests" [min]="1" [max]="maxGuests" />
            <span class="field-hint">Maximum {{ maxGuests }} for this amenity</span>
            <span class="field-error" *ngIf="form.get('guests')?.invalid && form.get('guests')?.touched">
              Enter 1–{{ maxGuests }} guests.
            </span>
          </label>

          <label>
            Notes (optional)
            <textarea class="ctrl" rows="2" formControlName="notes" placeholder="Purpose, equipment, etc."></textarea>
          </label>

          <p class="error" *ngIf="submitError">{{ submitError }}</p>

          <button class="btn" type="submit" [disabled]="!canSubmit()">
            {{ saving ? 'Submitting…' : 'Request booking' }}
          </button>
          <p class="hint" *ngIf="!canSubmit() && !saving && submitHint">{{ submitHint }}</p>
          <p class="hint">Your request will be sent to the admin for approval.</p>
        </form>
      </div>

      <p class="empty" *ngIf="!amenity && !loading">Amenity not found.</p>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; padding-bottom: 24px; }
      .header {
        display: flex; align-items: center; padding: 14px 16px; background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      h2 { margin: 0; flex: 1; text-align: center; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; }
      .loading, .empty { padding: 24px; text-align: center; color: #64748b; }
      .card { margin: 16px; background: white; border-radius: 16px; padding: 16px; }
      .desc { color: #64748b; font-size: 14px; margin: 0 0 16px; }
      label { display: block; margin-bottom: 14px; font-size: 13px; font-weight: 600; color: #475569; }
      .ctrl {
        display: block; width: 100%; margin-top: 6px; padding: 12px;
        border: 1px solid #e2e8f0; border-radius: 12px; box-sizing: border-box; font-size: 15px;
      }
      .btn {
        width: 100%; margin-top: 8px; padding: 14px; border: none; border-radius: 12px;
        background: #667eea; color: white; font-weight: 700; cursor: pointer;
      }
      .btn:disabled { opacity: 0.6; }
      .error { color: #dc2626; font-size: 13px; }
      .field-hint { display: block; margin-top: 4px; font-size: 12px; color: #64748b; font-weight: 400; }
      .field-hint.warn { color: #b45309; }
      .field-error { display: block; margin-top: 4px; font-size: 12px; color: #dc2626; font-weight: 500; }
      .hint { margin-top: 12px; font-size: 13px; color: #64748b; text-align: center; }
    `
  ]
})
export class BookAmenityComponent implements OnInit {
  amenity?: AmenityUi;
  form?: FormGroup;
  minDate = new Date().toISOString().slice(0, 10);
  maxDate = '';
  maxGuests = 99;
  availableSlots: string[] = [];
  slotsLoading = false;
  slotsMessage = '';
  submitHint = '';
  loading = false;
  saving = false;
  submitError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private auth: MobileAuthService,
    private api: AmenityApiService,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) return;

    this.loading = true;
    this.api.getById(id).subscribe({
      next: a => {
        this.amenity = a;
        this.maxGuests = a.capacity > 0 ? a.capacity : 99;
        const advanceDays = 14;
        const max = new Date();
        max.setDate(max.getDate() + advanceDays);
        this.maxDate = max.toISOString().slice(0, 10);

        this.form = this.fb.group({
          date: [this.minDate, Validators.required],
          startTime: ['', Validators.required],
          durationHours: [2, [Validators.required, Validators.min(1), Validators.max(4)]],
          guests: [1, [Validators.required, Validators.min(1), Validators.max(this.maxGuests)]],
          notes: ['']
        });
        this.form.get('date')?.valueChanges.subscribe(() => this.refreshSlots());
        this.form.get('guests')?.valueChanges.subscribe(() => this.updateSubmitHint());
        this.form.get('startTime')?.valueChanges.subscribe(() => this.updateSubmitHint());
        this.form.statusChanges.subscribe(() => this.updateSubmitHint());
        this.loading = false;
        this.refreshSlots();
      },
      error: err => {
        this.submitError = String(err);
        this.loading = false;
      }
    });
  }

  refreshSlots(): void {
    if (!this.amenity || !this.form) return;
    const date = this.form.get('date')?.value as string;
    if (!date) return;

    this.slotsLoading = true;
    this.slotsMessage = '';
    this.api.getAvailableSlots(this.amenity.id, date).subscribe({
      next: slots => {
        this.slotsLoading = false;
        if (slots.length > 0) {
          this.availableSlots = slots;
        } else if (this.amenity?.slots?.length) {
          // All catalog slots taken on this date.
          this.availableSlots = [];
          this.slotsMessage = 'No time slots left on this date — pick another date.';
        } else {
          this.availableSlots = this.fallbackSlots();
        }
        const current = this.form?.get('startTime')?.value;
        if (current && !this.availableSlots.includes(current)) {
          this.form?.patchValue({ startTime: '' });
        }
        this.updateSubmitHint();
      },
      error: () => {
        this.slotsLoading = false;
        // API failed — use amenity catalog slots so owner can still request a booking.
        this.availableSlots = this.fallbackSlots();
        this.slotsMessage = this.availableSlots.length
          ? 'Using standard slots — final availability is confirmed on submit.'
          : 'Could not load time slots. Try another date or refresh the page.';
        this.updateSubmitHint();
      }
    });
  }

  /** Slots from amenity catalog when live availability API is empty or unavailable. */
  private fallbackSlots(): string[] {
    return this.amenity?.slots?.length ? [...this.amenity.slots] : [];
  }

  canSubmit(): boolean {
    if (!this.form || this.saving || this.form.invalid) {
      return false;
    }
    return !!this.form.get('startTime')?.value;
  }

  updateSubmitHint(): void {
    if (!this.form || this.canSubmit()) {
      this.submitHint = '';
      return;
    }
    const guestsCtrl = this.form.get('guests');
    if (guestsCtrl?.invalid) {
      this.submitHint = `Guest count must be between 1 and ${this.maxGuests} for this amenity.`;
      return;
    }
    if (!this.form.get('startTime')?.value) {
      this.submitHint = this.availableSlots.length
        ? 'Select a time slot to continue.'
        : 'No slots available for this date — choose another date.';
      return;
    }
    this.submitHint = 'Complete all required fields to request booking.';
  }

  formatSlot(hhMm: string): string {
    const [h, m] = hhMm.split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  private endTimeFor(startTime: string, hours: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const end = new Date();
    end.setHours((h ?? 0) + hours, m ?? 0, 0, 0);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:00`;
  }

  submit(): void {
    if (!this.form || !this.amenity) return;
    this.form.markAllAsTouched();
    this.updateSubmitHint();
    if (this.form.invalid || !this.form.get('startTime')?.value) return;
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const flatId = this.session.getFlatId() ?? '';

    const startTime = this.form.value.startTime as string;
    const durationHours = Number(this.form.value.durationHours) || 2;
    this.saving = true;
    this.submitError = '';

    this.api
      .book(this.amenity.id, {
        societyId: user.societyId,
        flatId: flatId || undefined,
        bookedBy: user.id,
        bookingDate: this.form.value.date,
        startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
        endTime: this.endTimeFor(startTime.slice(0, 5), durationHours),
        numberOfGuests: Number(this.form.value.guests),
        notes: (this.form.value.notes as string)?.trim() || undefined,
        autoConfirm: false
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/mobile/amenities/my-bookings'], { queryParams: { booked: 'pending' } });
        },
        error: err => {
          this.submitError = String(err);
          this.saving = false;
          this.refreshSlots();
        }
      });
  }
}
