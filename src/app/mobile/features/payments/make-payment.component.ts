import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BillsApiService, BillRow } from '../../../core/services/bills-api.service';

@Component({
  selector: 'app-make-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" routerLink="/mobile/payments/pending">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Pay bill</h2>
        <span style="width:40px"></span>
      </div>

      <div class="card" *ngIf="bill">
        <p class="label">Bill</p>
        <p class="value">{{ bill.billNumber }} · {{ bill.billType }}</p>
        <p class="amount">₹ {{ bill.pendingAmount | number : '1.2-2' }}</p>
        <p class="due">Due {{ bill.dueDate }}</p>
        <button class="btn" type="button" (click)="pay()" [disabled]="paying">
          {{ paying ? 'Processing…' : 'Mark as paid (demo)' }}
        </button>
        <p class="err" *ngIf="error">{{ error }}</p>
      </div>

      <p class="empty" *ngIf="!bill && !loading">Bill not found.</p>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; padding-bottom: 24px; }
      .header { display: flex; align-items: center; padding: 14px 16px; background: white; }
      h2 { margin: 0; flex: 1; text-align: center; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; }
      .card { margin: 16px; background: white; border-radius: 16px; padding: 20px; }
      .label { margin: 0; font-size: 13px; color: #64748b; }
      .value { margin: 4px 0 12px; font-weight: 600; }
      .amount { font-size: 28px; font-weight: 700; color: #667eea; margin: 0; }
      .due { color: #64748b; font-size: 14px; }
      .btn {
        width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px;
        background: #667eea; color: white; font-weight: 700; cursor: pointer;
      }
      .btn:disabled { opacity: 0.6; }
      .err { color: #dc2626; font-size: 13px; }
      .empty { padding: 24px; text-align: center; color: #64748b; }
    `
  ]
})
export class MakePaymentComponent implements OnInit {
  bill: BillRow | null = null;
  loading = true;
  paying = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bills: BillsApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.bills.listOutstanding().subscribe({
      next: rows => {
        this.bill = rows.find(b => b.id === id) ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  pay(): void {
    if (!this.bill) return;
    this.paying = true;
    this.error = '';
    this.bills.markPaid(this.bill.id, this.bill.pendingAmount || this.bill.totalAmount).subscribe({
      next: () => {
        this.paying = false;
        alert('Payment recorded (demo).');
        this.router.navigate(['/mobile/payments/history']);
      },
      error: err => {
        this.paying = false;
        this.error = err?.error?.message || 'Payment failed';
      }
    });
  }
}
