import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BillsApiService, BillRow } from '../../../core/services/bills-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" routerLink="/mobile/payments">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Payment history</h2>
        <span style="width:40px"></span>
      </div>

      <p class="hint" *ngIf="!session.getSocietyId()">Sign in to load payment history.</p>
      <p class="loading" *ngIf="loading">Loading…</p>

      <ul class="list" *ngIf="!loading">
        <li *ngFor="let b of paidBills" class="card">
          <div class="row">
            <span class="num">{{ b.billNumber }}</span>
            <span class="amt">₹ {{ b.paidAmount | number : '1.2-2' }}</span>
          </div>
          <div class="sub">{{ b.billType }} · Paid · {{ b.dueDate }}</div>
        </li>
        <li *ngIf="paidBills.length === 0" class="empty">No paid bills yet.</li>
      </ul>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: white;
      }
      h2 { margin: 0; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; width: 40px; height: 40px; }
      .hint, .empty, .loading { padding: 16px; color: #64748b; }
      .list { list-style: none; margin: 0; padding: 16px; }
      .card {
        background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .row { display: flex; justify-content: space-between; font-weight: 600; }
      .sub { font-size: 13px; color: #64748b; margin-top: 6px; }
      .amt { color: #16a34a; }
    `
  ]
})
export class PaymentHistoryComponent implements OnInit {
  paidBills: BillRow[] = [];
  loading = false;

  constructor(
    public session: SessionContextService,
    private bills: BillsApiService
  ) {}

  ngOnInit(): void {
    if (!this.session.getSocietyId()) return;
    this.loading = true;
    this.bills.listByOwner().subscribe({
      next: rows => {
        this.paidBills = rows.filter(b => b.paymentStatus === 'PAID');
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
