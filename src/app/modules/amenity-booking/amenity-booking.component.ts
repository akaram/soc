import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';
import {
  AmenityApiService,
  AmenityBookingUi,
  AmenityUi
} from '../../mobile/features/amenities/amenity-api.service';
import { PetService, ResolvedFlat } from '../../mobile/features/pets/services/pet.service';
import { UserManagementService } from '../user-management/services/user-management.service';
import { User, UserRole } from '../user-management/models/user.model';

/**
 * Admin amenity booking — book on behalf of a flat owner and approve resident requests.
 */
@Component({
  selector: 'app-amenity-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">event_available</i> Amenity Booking</h1>
        <p>Book clubhouse, gym, and facilities for residents — approve owner requests</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to manage amenity bookings.
        </span>
      </div>

      <div class="toolbar" *ngIf="societyId">
        <button type="button" class="btn-secondary" (click)="loadAll()" [disabled]="loading">
          <i class="material-icons">refresh</i> Refresh
        </button>
        <label class="filter">
          Status
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <option value="">All</option>
            <option value="PENDING">Pending approval</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <button type="button" class="btn-primary" (click)="showForm = !showForm">
          <i class="material-icons">{{ showForm ? 'close' : 'add' }}</i>
          {{ showForm ? 'Hide form' : 'Book for resident' }}
        </button>
      </div>

      <!-- Admin booking form -->
      <div class="card create-panel" *ngIf="societyId && showForm">
        <h3>Book amenity for flat owner</h3>
        <p class="hint">Select flat and owner, then pick amenity, date, time, and duration.</p>

        <div class="form-grid">
          <label>
            Flat number <span class="req">*</span>
            <select [(ngModel)]="formFlatId" (ngModelChange)="onFlatSelected()" [disabled]="optionsLoading">
              <option value="">— Select flat —</option>
              <option *ngFor="let f of societyFlats" [value]="f.id">{{ flatLabel(f) }}</option>
            </select>
          </label>

          <label>
            Flat owner <span class="req">*</span>
            <select [(ngModel)]="formOwnerId" [disabled]="optionsLoading || !formFlatId">
              <option value="">— Select owner —</option>
              <option *ngFor="let r of flatResidents" [value]="r.id">{{ residentLabel(r) }}</option>
            </select>
          </label>

          <label>
            Amenity <span class="req">*</span>
            <select [(ngModel)]="formAmenityId" (ngModelChange)="onAmenitySelected()">
              <option value="">— Select amenity —</option>
              <option *ngFor="let a of amenities" [value]="a.id">{{ a.name }}</option>
            </select>
          </label>

          <label>
            Booking date <span class="req">*</span>
            <input type="date" [(ngModel)]="formDate" [min]="minDate" [max]="maxDate" (ngModelChange)="refreshSlots()" />
          </label>

          <label>
            Start time <span class="req">*</span>
            <select [(ngModel)]="formStartTime">
              <option value="">— Select slot —</option>
              <option *ngFor="let s of availableSlots" [value]="s">{{ formatTime(s) }}</option>
            </select>
          </label>

          <label>
            Duration (hours) <span class="req">*</span>
            <select [(ngModel)]="formDurationHours">
              <option [ngValue]="1">1 hour</option>
              <option [ngValue]="2">2 hours</option>
              <option [ngValue]="3">3 hours</option>
              <option [ngValue]="4">4 hours</option>
            </select>
          </label>

          <label>
            Guests
            <input type="number" [(ngModel)]="formGuests" min="1" [max]="maxGuests" />
          </label>

          <label class="full">
            Purpose / notes
            <textarea rows="2" [(ngModel)]="formNotes" placeholder="e.g. Birthday party, family gathering"></textarea>
          </label>
        </div>

        <p class="error" *ngIf="formError">{{ formError }}</p>

        <button type="button" class="btn-primary" (click)="submitBooking()" [disabled]="saving || !canSubmit()">
          {{ saving ? 'Booking…' : 'Confirm booking for owner' }}
        </button>
      </div>

      <!-- Pending approvals -->
      <div class="card pending-panel" *ngIf="societyId && pendingRows.length > 0">
        <h3>Pending owner requests ({{ pendingRows.length }})</h3>
        <div class="booking-table-wrap">
          <table class="booking-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Flat</th>
                <th>Amenity</th>
                <th>When</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of pendingRows">
                <td>{{ b.ownerName || '—' }}</td>
                <td>{{ b.flatNumber || b.flatId.slice(0, 8) }}</td>
                <td>{{ amenityName(b) }}</td>
                <td>{{ formatDate(b.bookingDate) }} · {{ formatTime(b.startTime) }}–{{ formatTime(b.endTime) }}</td>
                <td>{{ b.notes || '—' }}</td>
                <td class="actions">
                  <button type="button" class="btn-approve" (click)="approve(b)" [disabled]="actionBusy">Approve</button>
                  <button type="button" class="btn-reject" (click)="reject(b)" [disabled]="actionBusy">Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- All bookings -->
      <div class="card" *ngIf="societyId">
        <h3>Society bookings</h3>
        <p class="loading-hint" *ngIf="loading">Loading…</p>
        <p class="error" *ngIf="loadError && !loading">{{ loadError }}</p>
        <p class="empty-hint" *ngIf="!loading && !loadError && filtered.length === 0">No bookings yet.</p>

        <div class="booking-table-wrap" *ngIf="!loading && filtered.length > 0">
          <table class="booking-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Flat</th>
                <th>Amenity</th>
                <th>Date & time</th>
                <th>Guests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of filtered">
                <td>{{ b.ownerName || '—' }}</td>
                <td>{{ b.flatNumber || '—' }}</td>
                <td>{{ amenityName(b) }}</td>
                <td>{{ formatDate(b.bookingDate) }} · {{ formatTime(b.startTime) }}–{{ formatTime(b.endTime) }}</td>
                <td>{{ b.numberOfGuests }}</td>
                <td><span class="status-pill" [class]="b.status.toLowerCase()">{{ b.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .module-page { padding: 24px; max-width: 1200px; }
      .page-header h1 {
        display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 26px;
      }
      .page-header p { margin: 0; color: #64748b; }
      .banner {
        display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px;
        border-radius: 10px; margin: 16px 0;
      }
      .banner.warn { background: #fffbeb; color: #92400e; }
      .inline-link { color: #667eea; font-weight: 600; }
      .toolbar {
        display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 20px 0;
      }
      .filter { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: #475569; }
      .filter select { margin-top: 4px; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .card {
        background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .card h3 { margin: 0 0 12px; font-size: 18px; }
      .hint { color: #64748b; font-size: 14px; margin: 0 0 16px; }
      .form-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
      }
      .form-grid label { display: flex; flex-direction: column; font-size: 13px; font-weight: 600; color: #475569; }
      .form-grid label.full { grid-column: 1 / -1; }
      .form-grid input, .form-grid select, .form-grid textarea {
        margin-top: 6px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;
      }
      .req { color: #dc2626; }
      .error { color: #dc2626; font-size: 13px; margin: 12px 0 0; }
      .loading-hint, .empty-hint { color: #64748b; text-align: center; padding: 16px; }
      .error { color: #dc2626; text-align: center; padding: 8px 16px; font-size: 14px; }
      .booking-table-wrap { overflow-x: auto; }
      .booking-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .booking-table th, .booking-table td {
        padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9;
      }
      .booking-table th { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .btn-approve {
        padding: 6px 12px; border: none; border-radius: 8px; background: #10b981; color: white;
        font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .btn-reject {
        padding: 6px 12px; border: 1px solid #fecaca; border-radius: 8px; background: white;
        color: #dc2626; font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .btn-approve:disabled, .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
      .status-pill {
        display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px;
        font-weight: 700; text-transform: uppercase;
      }
      .status-pill.pending { background: #fef3c7; color: #b45309; }
      .status-pill.confirmed { background: #d1fae5; color: #047857; }
      .status-pill.cancelled { background: #fee2e2; color: #b91c1c; }
      .btn-primary, .btn-secondary {
        display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
        border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 14px;
      }
      .btn-primary { background: #667eea; color: white; }
      .btn-secondary { background: #ecf0f1; color: #2c3e50; }
      .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
      .pending-panel { border-left: 4px solid #f59e0b; }
      @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
    `
  ]
})
export class AmenityBookingComponent implements OnInit {
  societyId = '';
  loading = false;
  optionsLoading = false;
  saving = false;
  actionBusy = false;
  showForm = true;
  statusFilter = '';

  amenities: AmenityUi[] = [];
  societyFlats: ResolvedFlat[] = [];
  societyResidents: User[] = [];
  flatResidents: User[] = [];
  bookings: AmenityBookingUi[] = [];
  filtered: AmenityBookingUi[] = [];
  pendingRows: AmenityBookingUi[] = [];
  loadError = '';
  availableSlots: string[] = [];

  minDate = new Date().toISOString().slice(0, 10);
  maxDate = '';
  maxGuests = 99;

  formFlatId = '';
  formOwnerId = '';
  formAmenityId = '';
  formDate = this.minDate;
  formStartTime = '';
  formDurationHours = 2;
  formGuests = 1;
  formNotes = '';
  formError = '';

  constructor(
    private session: SessionContextService,
    private api: AmenityApiService,
    private petService: PetService,
    private userService: UserManagementService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    const max = new Date();
    max.setDate(max.getDate() + 14);
    this.maxDate = max.toISOString().slice(0, 10);

    if (this.societyId) {
      this.loadOptions();
      this.loadAll();
    }
  }

  loadOptions(): void {
    this.optionsLoading = true;
    forkJoin({
      amenities: this.api.listAmenitiesBySociety(this.societyId),
      flats: this.petService.listFlatsBySociety(this.societyId),
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ amenities, flats, users }) => {
        this.amenities = amenities;
        this.societyFlats = flats;
        this.societyResidents = (users ?? []).filter(u => u.userRole === UserRole.RESIDENT);
        this.optionsLoading = false;
      },
      error: () => {
        this.optionsLoading = false;
        this.toast.error('Could not load flats, residents, or amenities.');
      }
    });
  }

  loadAll(silent = false): void {
    if (!this.societyId) return;
    this.loading = true;
    this.loadError = '';
    this.api.listBookingsBySociety(this.societyId).subscribe({
      next: rows => {
        this.bookings = rows;
        this.pendingRows = rows.filter(b => b.status === 'PENDING');
        this.applyFilter();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.loadError = this.readError(err);
        if (!silent) {
          this.toast.error(this.loadError);
        }
      }
    });
  }

  applyFilter(): void {
    this.filtered = this.statusFilter
      ? this.bookings.filter(b => b.status === this.statusFilter)
      : [...this.bookings];
  }

  flatLabel(f: ResolvedFlat): string {
    const owner = f.ownerId ? this.societyResidents.find(r => r.id === f.ownerId) : undefined;
    const ownerName = owner
      ? `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim()
      : f.ownerId
        ? 'Owner linked'
        : 'Vacant';
    return `${f.flatNumber} — ${ownerName}`;
  }

  residentLabel(r: User): string {
    const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || r.email;
    return r.flatNumber ? `${name} · ${r.flatNumber}` : name;
  }

  onFlatSelected(): void {
    const flat = this.societyFlats.find(f => f.id === this.formFlatId);
    this.flatResidents = this.societyResidents.filter(
      r => r.flatId === this.formFlatId || (flat?.ownerId && r.id === flat.ownerId)
    );
    if (flat?.ownerId) {
      this.formOwnerId = flat.ownerId;
    } else if (this.flatResidents.length === 1) {
      this.formOwnerId = this.flatResidents[0].id;
    } else {
      this.formOwnerId = '';
    }
  }

  onAmenitySelected(): void {
    const amenity = this.amenities.find(a => a.id === this.formAmenityId);
    this.maxGuests = amenity && amenity.capacity > 0 ? amenity.capacity : 99;
    if (this.formGuests > this.maxGuests) {
      this.formGuests = this.maxGuests;
    }
    this.refreshSlots();
  }

  refreshSlots(): void {
    if (!this.formAmenityId || !this.formDate) {
      this.availableSlots = [];
      return;
    }
    this.api.getAvailableSlots(this.formAmenityId, this.formDate).subscribe({
      next: slots => {
        this.availableSlots = slots;
        if (this.formStartTime && !slots.includes(this.formStartTime)) {
          this.formStartTime = '';
        }
      },
      error: () => {
        this.availableSlots = [];
      }
    });
  }

  canSubmit(): boolean {
    return !!(
      this.formFlatId &&
      this.formOwnerId &&
      this.formAmenityId &&
      this.formDate &&
      this.formStartTime
    );
  }

  submitBooking(): void {
    if (!this.canSubmit() || !this.societyId) return;
    this.saving = true;
    this.formError = '';

    const start = this.formStartTime.slice(0, 5);
    const end = this.endTimeFor(start, this.formDurationHours);

    this.api
      .book(this.formAmenityId, {
        societyId: this.societyId,
        flatId: this.formFlatId,
        bookedBy: this.formOwnerId,
        bookingDate: this.formDate,
        startTime: `${start}:00`,
        endTime: `${end}:00`,
        numberOfGuests: this.formGuests,
        notes: this.formNotes.trim() || undefined,
        autoConfirm: true
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: created => {
          this.toast.success('Amenity booked for the flat owner.');
          this.formNotes = '';
          this.formStartTime = '';
          if (created?.id) {
            this.mergeBooking(created);
          }
          this.loadAll(true);
          this.refreshSlots();
        },
        error: err => {
          this.formError = String(err);
          this.toast.error(String(err));
        }
      });
  }

  approve(b: AmenityBookingUi): void {
    this.actionBusy = true;
    this.api
      .approve(b.id)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success('Booking approved — visible to owner.');
          this.loadAll();
        },
        error: err => this.toast.error(String(err))
      });
  }

  reject(b: AmenityBookingUi): void {
    this.actionBusy = true;
    this.api
      .reject(b.id)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.warning('Booking rejected.');
          this.loadAll();
        },
        error: err => this.toast.error(String(err))
      });
  }

  amenityName(b: AmenityBookingUi): string {
    return b.amenityName || this.amenities.find(a => a.id === b.amenityId)?.name || 'Amenity';
  }

  formatDate(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTime(hhMm: string): string {
    const [h, m] = hhMm.split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  private endTimeFor(startTime: string, hours: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const end = new Date();
    end.setHours((h ?? 0) + hours, m ?? 0, 0, 0);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  }

  /** Keep newly created booking visible even if list refresh fails. */
  private mergeBooking(row: AmenityBookingUi): void {
    const flat = this.societyFlats.find(f => f.id === this.formFlatId);
    const owner = this.societyResidents.find(r => r.id === this.formOwnerId);
    const amenity = this.amenities.find(a => a.id === this.formAmenityId);
    const enriched: AmenityBookingUi = {
      ...row,
      flatNumber: row.flatNumber || flat?.flatNumber,
      ownerName:
        row.ownerName ||
        (owner ? `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() : undefined),
      amenityName: row.amenityName || amenity?.name
    };
    this.bookings = [enriched, ...this.bookings.filter(b => b.id !== enriched.id)];
    this.pendingRows = this.bookings.filter(b => b.status === 'PENDING');
    this.applyFilter();
  }

  private readError(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string; status?: number };
    if (e?.status === 403) {
      return 'Could not load bookings — society in session does not match your login. Re-select society in Society Setup.';
    }
    if (e?.status === 401) {
      return 'Session expired. Please sign in again.';
    }
    return e?.error?.message || e?.message || 'Could not load bookings.';
  }
}
