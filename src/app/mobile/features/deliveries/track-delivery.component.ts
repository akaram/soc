import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { DeliveriesApiService, DeliveryRow } from '../../../core/services/deliveries-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-track-delivery',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" routerLink="/mobile/deliveries">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Delivery details</h2>
        <span style="width:40px"></span>
      </div>

      <p class="loading" *ngIf="loading">Loading…</p>

      <div class="card" *ngIf="delivery && !loading">
        <div class="status-banner" [class]="statusClass(delivery.status)">
          {{ statusLabel(delivery.status) }}
        </div>

        <div class="detail-row">
          <span class="label">Flat</span>
          <span>{{ delivery.flatNumber || '—' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Courier</span>
          <span>{{ delivery.deliveryType }}</span>
        </div>
        <div class="detail-row" *ngIf="delivery.trackingNumber && delivery.trackingNumber !== '—'">
          <span class="label">Tracking</span>
          <span>{{ delivery.trackingNumber }}</span>
        </div>
        <div class="detail-row" *ngIf="delivery.itemsDescription">
          <span class="label">Items</span>
          <span>{{ delivery.itemsDescription }}</span>
        </div>
        <div class="detail-row" *ngIf="delivery.executiveName && delivery.executiveName !== '—'">
          <span class="label">Delivery person</span>
          <span>{{ delivery.executiveName }}</span>
        </div>
        <div class="detail-row" *ngIf="delivery.executivePhone">
          <span class="label">Phone</span>
          <a [href]="'tel:' + delivery.executivePhone">{{ delivery.executivePhone }}</a>
        </div>
        <div class="detail-row" *ngIf="delivery.notes">
          <span class="label">Notes</span>
          <span>{{ delivery.notes }}</span>
        </div>
        <div class="detail-row" *ngIf="delivery.receivedBy">
          <span class="label">Received by</span>
          <span>{{ delivery.receivedBy }}</span>
        </div>
        <div class="detail-row" *ngIf="delivery.actualDeliveryTime">
          <span class="label">Collected at</span>
          <span>{{ formatDateTime(delivery.actualDeliveryTime) }}</span>
        </div>

        <button
          *ngIf="canReceive"
          type="button"
          class="receive-btn"
          (click)="markReceived()"
          [disabled]="receiving"
        >
          {{ receiving ? 'Updating…' : 'I received my package' }}
        </button>

        <p class="hint" *ngIf="canReceive">
          Confirm after you collect the package from security or the gate.
        </p>
      </div>

      <p class="empty" *ngIf="!delivery && !loading">Delivery not found.</p>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; }
      .header { display: flex; align-items: center; padding: 14px 16px; background: white; }
      h2 { margin: 0; flex: 1; text-align: center; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; }
      .loading, .empty { padding: 24px; text-align: center; color: #64748b; }
      .card { margin: 16px; background: white; border-radius: 16px; padding: 16px; }
      .status-banner {
        text-align: center; font-weight: 700; font-size: 13px; text-transform: uppercase;
        padding: 10px; border-radius: 10px; margin-bottom: 16px;
        background: #fef3c7; color: #b45309;
      }
      .status-banner.arrived { background: #dbeafe; color: #1d4ed8; }
      .status-banner.delivered { background: #dcfce7; color: #047857; }
      .detail-row {
        display: flex; justify-content: space-between; gap: 12px;
        padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;
      }
      .detail-row .label { color: #64748b; font-weight: 600; flex-shrink: 0; }
      .detail-row a { color: #667eea; text-decoration: none; }
      .receive-btn {
        width: 100%; margin-top: 20px; padding: 14px; border: none; border-radius: 12px;
        background: #667eea; color: white; font-size: 16px; font-weight: 700; cursor: pointer;
      }
      .receive-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .hint { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 10px; }
    `
  ]
})
export class TrackDeliveryComponent implements OnInit {
  delivery: DeliveryRow | null = null;
  loading = true;
  receiving = false;

  constructor(
    private route: ActivatedRoute,
    private api: DeliveriesApiService,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.api.getById(id).subscribe({
      next: row => {
        this.delivery = row;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get canReceive(): boolean {
    return !!this.delivery && this.api.isAwaitingPickup(this.delivery.status);
  }

  markReceived(): void {
    if (!this.delivery || !this.canReceive) return;
    const receivedBy = this.residentDisplayName() || 'Resident';
    this.receiving = true;
    this.api
      .markReceived(this.delivery.id, receivedBy)
      .pipe(finalize(() => (this.receiving = false)))
      .subscribe({
        next: updated => {
          this.delivery = updated;
          this.toast.success('Package marked as received. Thank you!');
        },
        error: err => this.toast.error(String(err))
      });
  }

  statusLabel(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }

  statusClass(status: string): string {
    return (status || 'pending').toLowerCase();
  }

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Read logged-in resident name for receivedBy field */
  private residentDisplayName(): string {
    for (const key of ['mobileUser', 'currentUser'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      try {
        const o = JSON.parse(raw) as { firstName?: string; lastName?: string; email?: string };
        const name = `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim();
        if (name) return name;
        if (o.email) return o.email;
      } catch {
        /* ignore */
      }
    }
    return '';
  }
}
