import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DeliveriesApiService, DeliveryRow } from '../../../core/services/deliveries-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';

@Component({
  selector: 'app-delivery-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <h2>My deliveries</h2>
      <p class="hint" *ngIf="!session.getSocietyId()">Sign in to see deliveries for your flat.</p>
      <p class="loading" *ngIf="loading">Loading…</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <section *ngIf="!loading && awaiting.length > 0" class="section">
        <h3>Awaiting pickup ({{ awaiting.length }})</h3>
        <div class="list">
          <div class="card pending" *ngFor="let d of awaiting" [routerLink]="['/mobile/deliveries/track', d.id]">
            <div class="row">
              <strong>{{ d.deliveryType }}</strong>
              <span class="status" [class]="statusClass(d.status)">{{ statusLabel(d.status) }}</span>
            </div>
            <p class="items">{{ d.itemsDescription || 'Package' }}</p>
            <p class="meta" *ngIf="d.flatNumber">Flat {{ d.flatNumber }}</p>
            <p class="meta" *ngIf="d.trackingNumber && d.trackingNumber !== '—'">Tracking: {{ d.trackingNumber }}</p>
            <p class="cta">Tap to view &amp; mark received →</p>
          </div>
        </div>
      </section>

      <section *ngIf="!loading && delivered.length > 0" class="section">
        <h3>Collected</h3>
        <div class="list">
          <div class="card" *ngFor="let d of delivered" [routerLink]="['/mobile/deliveries/track', d.id]">
            <div class="row">
              <strong>{{ d.deliveryType }}</strong>
              <span class="status delivered">Delivered</span>
            </div>
            <p class="items">{{ d.itemsDescription || 'Package' }}</p>
            <p class="meta" *ngIf="d.receivedBy">Received by {{ d.receivedBy }}</p>
          </div>
        </div>
      </section>

      <p class="empty" *ngIf="!loading && !error && deliveries.length === 0">No deliveries for your flat yet.</p>
    </div>
  `,
  styles: [
    `
      .page { padding: 16px; }
      h2 { margin: 0 0 6px; }
      h3 { margin: 0 0 10px; font-size: 15px; color: #475569; }
      .section { margin-bottom: 20px; }
      .hint, .loading, .empty { color: #64748b; font-size: 14px; }
      .error { color: #dc2626; font-size: 14px; }
      .card {
        background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer;
      }
      .card.pending { border-left: 4px solid #3b82f6; }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .items { margin: 8px 0 4px; font-size: 14px; color: #334155; }
      .status {
        font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px;
        background: #fef3c7; color: #b45309; text-transform: uppercase; white-space: nowrap;
      }
      .status.arrived { background: #dbeafe; color: #1d4ed8; }
      .status.delivered { background: #dcfce7; color: #047857; }
      .meta { font-size: 12px; color: #94a3b8; margin: 4px 0 0; }
      .cta { font-size: 12px; color: #667eea; font-weight: 600; margin: 8px 0 0; }
    `
  ]
})
export class DeliveryListComponent implements OnInit {
  deliveries: DeliveryRow[] = [];
  awaiting: DeliveryRow[] = [];
  delivered: DeliveryRow[] = [];
  loading = false;
  error = '';

  constructor(
    public session: SessionContextService,
    private api: DeliveriesApiService
  ) {}

  ngOnInit(): void {
    if (!this.session.getSocietyId()) return;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.listForResident().subscribe({
      next: rows => {
        this.deliveries = rows;
        this.awaiting = rows.filter(r => this.api.isAwaitingPickup(r.status));
        this.delivered = rows.filter(r => !this.api.isAwaitingPickup(r.status));
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.error = String(err);
      }
    });
  }

  statusLabel(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }

  statusClass(status: string): string {
    return (status || 'pending').toLowerCase();
  }
}
