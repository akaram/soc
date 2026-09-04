import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';
import {
  DeliveriesApiService,
  DeliveryRow,
  DELIVERY_STATUSES,
  DELIVERY_TYPES
} from '../../core/services/deliveries-api.service';
import { PetService, ResolvedFlat } from '../../mobile/features/pets/services/pet.service';
import { UserManagementService } from '../user-management/services/user-management.service';
import { User, UserRole } from '../user-management/models/user.model';

/**
 * Admin delivery management — log packages for flat owners and track pickup status.
 */
@Component({
  selector: 'app-delivery-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">local_shipping</i> Delivery Management</h1>
        <p>Log incoming packages for flat owners — owners collect from gate/security</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to manage deliveries.
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
            <option *ngFor="let s of deliveryStatuses" [value]="s">{{ statusLabel(s) }}</option>
          </select>
        </label>
        <button type="button" class="btn-primary" (click)="showForm = !showForm">
          <i class="material-icons">{{ showForm ? 'close' : 'add' }}</i>
          {{ showForm ? 'Hide form' : 'Log delivery' }}
        </button>
      </div>

      <!-- Log delivery form -->
      <div class="card create-panel" *ngIf="societyId && showForm">
        <h3>Log package for flat owner</h3>
        <p class="hint">Select flat and owner, then enter courier and package details.</p>

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
            Courier / type <span class="req">*</span>
            <select [(ngModel)]="formType">
              <option *ngFor="let t of deliveryTypes" [value]="t">{{ t }}</option>
            </select>
          </label>

          <label>
            Tracking number
            <input type="text" [(ngModel)]="formTracking" placeholder="Optional tracking ID" />
          </label>

          <label>
            Courier executive name
            <input type="text" [(ngModel)]="formExecutiveName" placeholder="Delivery person name" />
          </label>

          <label>
            Courier phone
            <input type="tel" [(ngModel)]="formExecutivePhone" placeholder="+91…" />
          </label>

          <label class="full">
            Items / package description <span class="req">*</span>
            <textarea rows="2" [(ngModel)]="formItems" placeholder="e.g. Amazon parcel, food order, documents"></textarea>
          </label>

          <label class="full">
            Notes for owner
            <textarea rows="2" [(ngModel)]="formNotes" placeholder="e.g. Left at security desk, call on arrival"></textarea>
          </label>
        </div>

        <p class="error" *ngIf="formError">{{ formError }}</p>

        <button type="button" class="btn-primary" (click)="submitDelivery()" [disabled]="saving || !canSubmit()">
          {{ saving ? 'Saving…' : 'Log delivery (awaiting pickup)' }}
        </button>
      </div>

      <!-- Awaiting pickup -->
      <div class="card pending-panel" *ngIf="societyId && awaitingRows.length > 0">
        <h3>Awaiting owner pickup ({{ awaitingRows.length }})</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Flat</th>
                <th>Type</th>
                <th>Items</th>
                <th>Tracking</th>
                <th>Status</th>
                <th>Logged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of awaitingRows">
                <td>{{ displayOwner(d) }}</td>
                <td>{{ displayFlat(d) }}</td>
                <td>{{ d.deliveryType }}</td>
                <td>{{ d.itemsDescription || '—' }}</td>
                <td>{{ d.trackingNumber }}</td>
                <td><span class="status-pill" [class]="d.status.toLowerCase()">{{ d.status }}</span></td>
                <td>{{ formatDate(d.createdAt) }}</td>
                <td class="actions">
                  <button type="button" class="btn-approve" (click)="markCollected(d)" [disabled]="actionBusy">
                    Mark collected
                  </button>
                  <button type="button" class="btn-reject" (click)="deleteDelivery(d)" [disabled]="actionBusy">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- All deliveries -->
      <div class="card" *ngIf="societyId">
        <h3>Society deliveries</h3>
        <p class="loading-hint" *ngIf="loading">Loading…</p>
        <p class="error" *ngIf="loadError && !loading">{{ loadError }}</p>
        <p class="empty-hint" *ngIf="!loading && !loadError && filtered.length === 0">No deliveries logged yet.</p>

        <div class="table-wrap" *ngIf="!loading && filtered.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Flat</th>
                <th>Type</th>
                <th>Items</th>
                <th>Status</th>
                <th>Received by</th>
                <th>Logged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of filtered">
                <td>{{ displayOwner(d) }}</td>
                <td>{{ displayFlat(d) }}</td>
                <td>{{ d.deliveryType }}</td>
                <td>{{ d.itemsDescription || '—' }}</td>
                <td><span class="status-pill" [class]="d.status.toLowerCase()">{{ d.status }}</span></td>
                <td>{{ d.receivedBy || '—' }}</td>
                <td>{{ formatDate(d.createdAt) }}</td>
                <td class="actions">
                  <select
                    *ngIf="d.status !== 'DELIVERED'"
                    [ngModel]="d.status"
                    (ngModelChange)="changeStatus(d, $event)"
                    [disabled]="actionBusy"
                  >
                    <option *ngFor="let s of deliveryStatuses" [value]="s">{{ statusLabel(s) }}</option>
                  </select>
                  <button type="button" class="btn-reject" (click)="deleteDelivery(d)" [disabled]="actionBusy">
                    Delete
                  </button>
                </td>
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
      .table-wrap { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table th, .data-table td {
        padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9;
      }
      .data-table th { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
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
      .status-pill.pending, .status-pill.in_transit { background: #fef3c7; color: #b45309; }
      .status-pill.arrived { background: #dbeafe; color: #1d4ed8; }
      .status-pill.delivered { background: #d1fae5; color: #047857; }
      .status-pill.cancelled, .status-pill.returned { background: #fee2e2; color: #b91c1c; }
      .btn-primary, .btn-secondary {
        display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
        border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 14px;
      }
      .btn-primary { background: #667eea; color: white; }
      .btn-secondary { background: #ecf0f1; color: #2c3e50; }
      .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
      .pending-panel { border-left: 4px solid #3b82f6; }
      @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
    `
  ]
})
export class DeliveryManagementComponent implements OnInit {
  societyId = '';
  loading = false;
  optionsLoading = false;
  saving = false;
  actionBusy = false;
  showForm = true;
  statusFilter = '';
  loadError = '';

  deliveryTypes = [...DELIVERY_TYPES];
  deliveryStatuses = [...DELIVERY_STATUSES];

  societyFlats: ResolvedFlat[] = [];
  societyResidents: User[] = [];
  flatResidents: User[] = [];
  deliveries: DeliveryRow[] = [];
  filtered: DeliveryRow[] = [];
  awaitingRows: DeliveryRow[] = [];

  formFlatId = '';
  formOwnerId = '';
  formType = 'AMAZON';
  formTracking = '';
  formExecutiveName = '';
  formExecutivePhone = '';
  formItems = '';
  formNotes = '';
  formError = '';

  constructor(
    private session: SessionContextService,
    private api: DeliveriesApiService,
    private petService: PetService,
    private userService: UserManagementService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.loadOptions();
      this.loadAll();
    }
  }

  loadOptions(): void {
    this.optionsLoading = true;
    forkJoin({
      flats: this.petService.listFlatsBySociety(this.societyId),
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ flats, users }) => {
        this.societyFlats = flats;
        this.societyResidents = (users ?? []).filter(u => u.userRole === UserRole.RESIDENT);
        this.optionsLoading = false;
      },
      error: () => {
        this.optionsLoading = false;
        this.toast.error('Could not load flats or residents.');
      }
    });
  }

  loadAll(silent = false): void {
    if (!this.societyId) return;
    this.loading = true;
    this.loadError = '';
    this.api.listBySociety(this.societyId).subscribe({
      next: rows => {
        this.deliveries = rows.map(r => this.enrichDelivery(r));
        this.awaitingRows = this.deliveries.filter(d => this.api.isAwaitingPickup(d.status));
        this.applyFilter();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.loadError = String(err);
        if (!silent) {
          this.toast.error(this.loadError);
        }
      }
    });
  }

  applyFilter(): void {
    const filter = (this.statusFilter || '').toUpperCase();
    this.filtered = filter
      ? this.deliveries.filter(d => (d.status || '').toUpperCase() === filter)
      : [...this.deliveries];
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

  displayOwner(d: DeliveryRow): string {
    return d.recipientName || this.ownerNameById(d.recipientId) || '—';
  }

  displayFlat(d: DeliveryRow): string {
    return d.flatNumber || this.flatNumberById(d.flatId) || '—';
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

  canSubmit(): boolean {
    return !!(this.formFlatId && this.formOwnerId && this.formType && this.formItems.trim());
  }

  submitDelivery(): void {
    if (!this.canSubmit() || !this.societyId) return;
    this.saving = true;
    this.formError = '';

    this.api
      .create({
        societyId: this.societyId,
        flatId: this.formFlatId,
        recipientId: this.formOwnerId,
        deliveryType: this.formType,
        trackingNumber: this.formTracking.trim() || undefined,
        deliveryExecutiveName: this.formExecutiveName.trim() || undefined,
        deliveryExecutivePhone: this.formExecutivePhone.trim() || undefined,
        itemsDescription: this.formItems.trim(),
        status: 'ARRIVED',
        notes: this.formNotes.trim() || undefined
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: created => {
          this.toast.success('Delivery logged — owner can collect from gate.');
          this.formTracking = '';
          this.formExecutiveName = '';
          this.formExecutivePhone = '';
          this.formItems = '';
          this.formNotes = '';
          if (created?.id) {
            this.mergeDelivery(this.enrichDelivery(created));
          }
          this.loadAll(true);
        },
        error: err => {
          this.formError = String(err);
          this.toast.error(String(err));
        }
      });
  }

  markCollected(d: DeliveryRow): void {
    this.actionBusy = true;
    this.api
      .markReceived(d.id, 'Security / Admin')
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success('Marked as collected.');
          this.loadAll(true);
        },
        error: err => this.toast.error(String(err))
      });
  }

  changeStatus(d: DeliveryRow, status: string): void {
    this.actionBusy = true;
    this.api
      .updateStatus(d.id, status)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success('Status updated.');
          this.loadAll(true);
        },
        error: err => this.toast.error(String(err))
      });
  }

  deleteDelivery(d: DeliveryRow): void {
    this.actionBusy = true;
    this.api
      .delete(d.id)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.warning('Delivery deleted.');
          this.loadAll(true);
        },
        error: err => this.toast.error(String(err))
      });
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatDate(d?: Date): string {
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /** Fill flat/owner names when API omitted JOIN FETCH fields */
  private enrichDelivery(row: DeliveryRow): DeliveryRow {
    return {
      ...row,
      flatNumber: row.flatNumber || this.flatNumberById(row.flatId),
      recipientName: row.recipientName || this.ownerNameById(row.recipientId)
    };
  }

  private flatNumberById(flatId: string): string | undefined {
    return this.societyFlats.find(f => f.id === flatId)?.flatNumber;
  }

  private ownerNameById(userId: string): string | undefined {
    const u = this.societyResidents.find(r => r.id === userId);
    if (!u) return undefined;
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return name || u.email;
  }

  private mergeDelivery(row: DeliveryRow): void {
    this.deliveries = [row, ...this.deliveries.filter(d => d.id !== row.id)];
    this.awaitingRows = this.deliveries.filter(d => this.api.isAwaitingPickup(d.status));
    this.applyFilter();
  }
}
