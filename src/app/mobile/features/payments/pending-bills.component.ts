import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillsApiService, BillRow } from '../../../core/services/bills-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';

@Component({
  selector: 'app-pending-bills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Pending bills</h2>
      <p class="hint" *ngIf="!session.getSocietyId()">Sign in to load bills.</p>
      <p class="loading" *ngIf="loading">Loading…</p>
      <ul class="list" *ngIf="!loading">
        <li *ngFor="let b of bills" class="card">
          <div class="row">
            <span class="num">{{ b.billNumber }}</span>
            <span class="amt">₹ {{ b.pendingAmount | number : '1.2-2' }}</span>
          </div>
          <div class="sub">{{ b.billType }} · Due {{ b.dueDate }} · {{ b.paymentStatus }}</div>
          <button type="button" class="pay" *ngIf="b.paymentStatus !== 'PAID'" (click)="pay(b)" [disabled]="payingId === b.id">
            {{ payingId === b.id ? 'Updating…' : 'Mark paid (demo)' }}
          </button>
        </li>
        <li *ngIf="bills.length === 0" class="empty">No outstanding bills.</li>
      </ul>
      <p class="err" *ngIf="payError">{{ payError }}</p>
    </div>
  `,
  styles: [
    `
      .container {
        padding: 16px;
      }
      .hint,
      .empty,
      .loading {
        color: #64748b;
      }
      .list {
        list-style: none;
        margin: 16px 0 0;
        padding: 0;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 10px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }
      .row {
        display: flex;
        justify-content: space-between;
        font-weight: 600;
      }
      .sub {
        font-size: 0.85rem;
        color: #64748b;
        margin-top: 6px;
      }
      .pay {
        margin-top: 10px;
        padding: 8px 14px;
        background: #10b981;
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      .pay:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      .err {
        color: #b91c1c;
        margin-top: 8px;
      }
    `
  ]
})
export class PendingBillsComponent implements OnInit {
  bills: BillRow[] = [];
  loading = false;
  payingId: string | null = null;
  payError = '';

  constructor(
    private billsApi: BillsApiService,
    public session: SessionContextService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.billsApi.listOutstanding().subscribe({
      next: rows => {
        this.bills = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  pay(b: BillRow): void {
    this.payError = '';
    this.payingId = b.id;
    this.billsApi.markPaid(b.id, b.totalAmount).subscribe({
      next: () => {
        this.payingId = null;
        this.bills = this.bills.filter(x => x.id !== b.id);
      },
      error: () => {
        this.payingId = null;
        this.payError = 'Could not update payment.';
      }
    });
  }
}
