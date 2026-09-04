import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { AmenityApiService, AmenityBookingUi, AmenityUi } from './amenity-api.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" routerLink="/mobile/amenities">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>My bookings</h2>
        <span style="width:40px"></span>
      </div>

      <p class="toast" *ngIf="showBookedToast">{{ bookedToastMessage }}</p>
      <p class="loading" *ngIf="loading">Loading bookings…</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <div class="empty" *ngIf="!loading && !error && pending.length === 0 && upcoming.length === 0 && past.length === 0">
        <i class="material-icons">event_busy</i>
        <h3>No bookings yet</h3>
        <p>Reserve pool, gym, clubhouse, and more.</p>
        <a class="btn" routerLink="/mobile/amenities">Browse amenities</a>
      </div>

      <section *ngIf="pending.length > 0">
        <h3 class="section-title">Awaiting approval</h3>
        <div class="booking-card pending" *ngFor="let b of pending">
          <ng-container *ngTemplateOutlet="bookingTpl; context: { $implicit: b, showCancel: true }"></ng-container>
        </div>
      </section>

      <section *ngIf="upcoming.length > 0">
        <h3 class="section-title">Upcoming</h3>
        <div class="booking-card" *ngFor="let b of upcoming">
          <ng-container *ngTemplateOutlet="bookingTpl; context: { $implicit: b, showCancel: true }"></ng-container>
        </div>
      </section>

      <section *ngIf="past.length > 0">
        <h3 class="section-title">Past & cancelled</h3>
        <div class="booking-card muted" *ngFor="let b of past">
          <ng-container *ngTemplateOutlet="bookingTpl; context: { $implicit: b, showCancel: false }"></ng-container>
        </div>
      </section>
    </div>

    <ng-template #bookingTpl let-b let-showCancel="showCancel">
      <div class="booking-row">
        <div>
          <strong>{{ amenityName(b) }}</strong>
          <p>{{ formatDate(b.bookingDate) }} · {{ formatSlot(b.startTime) }} – {{ formatSlot(b.endTime) }}</p>
          <p class="sub">{{ b.numberOfGuests }} guest(s)<span *ngIf="b.notes"> · {{ b.notes }}</span></p>
          <span class="status" [class.cancelled]="b.status === 'CANCELLED'" [class.pending]="b.status === 'PENDING'">{{ statusLabel(b.status) }}</span>
        </div>
        <button
          *ngIf="showCancel && (b.status === 'CONFIRMED' || b.status === 'PENDING')"
          type="button"
          class="cancel-btn"
          (click)="cancel(b)"
        >
          Cancel
        </button>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; padding-bottom: 88px; }
      .header {
        display: flex; align-items: center; padding: 14px 16px; background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      h2 { margin: 0; flex: 1; text-align: center; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; }
      .toast {
        margin: 12px 16px; padding: 12px; background: #d1fae5; color: #065f46;
        border-radius: 12px; font-size: 14px; font-weight: 600;
      }
      .loading, .error { padding: 16px; text-align: center; }
      .error { color: #dc2626; }
      .section-title { margin: 16px 16px 8px; font-size: 14px; color: #64748b; text-transform: uppercase; }
      .booking-card {
        margin: 0 16px 10px; background: white; border-radius: 14px; padding: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .booking-card.muted { opacity: 0.75; }
      .booking-row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .booking-row strong { font-size: 16px; color: #1e293b; }
      .booking-row p { margin: 4px 0 0; font-size: 14px; color: #475569; }
      .sub { font-size: 13px !important; color: #94a3b8 !important; }
      .status {
        display: inline-block; margin-top: 8px; font-size: 11px; text-transform: uppercase;
        font-weight: 700; color: #10ac84; background: rgba(16,172,132,0.12); padding: 2px 8px; border-radius: 6px;
      }
      .status.cancelled { color: #dc2626; background: rgba(220,38,38,0.1); }
      .status.pending { color: #b45309; background: rgba(245,158,11,0.15); }
      .booking-card.pending { border-left: 4px solid #f59e0b; }
      .cancel-btn {
        border: 1px solid #fecaca; background: white; color: #dc2626;
        padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .empty { text-align: center; padding: 48px 24px; color: #64748b; }
      .empty .material-icons { font-size: 56px; opacity: 0.4; }
      .btn {
        display: inline-block; margin-top: 16px; padding: 12px 24px;
        background: #667eea; color: white; text-decoration: none; border-radius: 12px; font-weight: 600;
      }
    `
  ]
})
export class MyBookingsComponent implements OnInit {
  pending: AmenityBookingUi[] = [];
  upcoming: AmenityBookingUi[] = [];
  past: AmenityBookingUi[] = [];
  showBookedToast = false;
  bookedToastMessage = '';
  loading = false;
  error = '';
  private amenityMap = new Map<string, AmenityUi>();

  constructor(
    private auth: MobileAuthService,
    private api: AmenityApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const booked = this.route.snapshot.queryParamMap.get('booked');
    this.showBookedToast = booked === '1' || booked === 'pending';
    this.bookedToastMessage =
      booked === 'pending'
        ? 'Booking request submitted — awaiting admin approval.'
        : 'Booking confirmed.';
    this.load();
  }

  load(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id) {
      this.error = 'Please sign in to view bookings.';
      return;
    }

    this.loading = true;
    this.error = '';

    // Load bookings first — do not block on amenity catalog fetch.
    this.api.listByUser(user.id).subscribe({
      next: bookings => {
        this.applyBookings(bookings);
        this.loading = false;
        if (user.societyId) {
          this.api
            .listAmenitiesBySociety(user.societyId)
            .pipe(catchError(() => of([] as AmenityUi[])))
            .subscribe(amenities => amenities.forEach(a => this.amenityMap.set(a.id, a)));
        }
      },
      error: err => {
        this.error = this.readError(err);
        this.loading = false;
      }
    });
  }

  private applyBookings(bookings: AmenityBookingUi[]): void {
    const today = new Date().toISOString().slice(0, 10);
    this.pending = bookings.filter(b => b.status === 'PENDING' && b.bookingDate >= today);
    this.upcoming = bookings.filter(b => b.status === 'CONFIRMED' && b.bookingDate >= today);
    this.past = bookings.filter(
      b =>
        b.status === 'CANCELLED' ||
        b.bookingDate < today ||
        (b.status === 'PENDING' && b.bookingDate < today)
    );
  }

  amenityName(b: AmenityBookingUi): string {
    return b.amenityName || this.amenityMap.get(b.amenityId)?.name || 'Amenity';
  }

  statusLabel(status: string): string {
    if (status === 'PENDING') return 'Awaiting approval';
    if (status === 'CONFIRMED') return 'Confirmed';
    if (status === 'CANCELLED') return 'Cancelled';
    return status;
  }

  cancel(b: AmenityBookingUi): void {
    if (!confirm(`Cancel booking on ${b.bookingDate}?`)) return;
    this.api.cancel(b.id).subscribe({
      next: () => this.load(),
      error: err => (this.error = this.readError(err))
    });
  }

  private readError(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string; status?: number };
    if (e?.status === 403) {
      return 'Could not load bookings for this society. Sign in again or check society access.';
    }
    return e?.error?.message || e?.message || 'Could not load bookings.';
  }

  formatDate(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  formatSlot(hhMm: string): string {
    const [h, m] = hhMm.split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
