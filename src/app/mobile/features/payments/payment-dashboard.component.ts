import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Payment hub — links to working bill screens (mobile).
 */
@Component({
  selector: 'app-payment-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <h2>Payments</h2>
      <p class="hint">Pay maintenance and utility bills for your flat.</p>

      <a class="card" routerLink="/mobile/payments/pending">
        <i class="material-icons">receipt_long</i>
        <div>
          <strong>Pending bills</strong>
          <span>View and pay outstanding amounts</span>
        </div>
        <i class="material-icons chev">chevron_right</i>
      </a>

      <a class="card" routerLink="/mobile/payments/history">
        <i class="material-icons">history</i>
        <div>
          <strong>Payment history</strong>
          <span>Paid bills and receipts</span>
        </div>
        <i class="material-icons chev">chevron_right</i>
      </a>

      <a class="card" routerLink="/mobile/billing-history">
        <i class="material-icons">account_balance</i>
        <div>
          <strong>Billing statements</strong>
          <span>Detailed billing (coming soon)</span>
        </div>
        <i class="material-icons chev">chevron_right</i>
      </a>
    </div>
  `,
  styles: [
    `
      .page { padding: 16px; }
      h2 { margin: 0 0 6px; font-size: 22px; color: #1e293b; }
      .hint { margin: 0 0 20px; font-size: 14px; color: #64748b; }
      .card {
        display: flex; align-items: center; gap: 14px;
        background: white; border-radius: 14px; padding: 16px; margin-bottom: 12px;
        text-decoration: none; color: inherit; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .card .material-icons { color: #667eea; font-size: 28px; }
      .card div { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .card strong { font-size: 15px; }
      .card span { font-size: 13px; color: #64748b; }
      .chev { color: #cbd5e1 !important; font-size: 22px !important; }
    `
  ]
})
export class PaymentDashboardComponent {}
