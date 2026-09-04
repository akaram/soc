import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import { RecurringVisitor } from '../models/recurring-visitor.model';

@Component({
  selector: 'app-recurring-visitor-qr',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="qr-container">
      <div class="page-header">
        <button type="button" class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Recurring Visitor QR Code</h2>
      </div>

      <div class="qr-card" *ngIf="visitor && !isLoading">
        <h3>{{ visitor.name }}</h3>
        <p class="sub">{{ visitor.visitingFlat }} · {{ visitor.purpose }}</p>
        <p class="sub">{{ visitor.visitTime }} · {{ getPatternLabel(visitor.recurringPattern) }}</p>

        <div class="qr-wrap" *ngIf="visitor.qrCode">
          <img [src]="visitor.qrCode" alt="Recurring visitor QR code" />
        </div>

        <p class="hint">Show this QR code at the gate for daily help entry</p>

        <div class="actions">
          <button type="button" class="btn-secondary" (click)="downloadQr()" *ngIf="visitor.qrCode">
            <i class="material-icons">download</i>
            Download
          </button>
          <button type="button" class="btn-primary" (click)="printQr()" *ngIf="visitor.qrCode">
            <i class="material-icons">print</i>
            Print
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading QR code...</p>
      </div>

      <div class="error-state" *ngIf="!isLoading && !visitor">
        <i class="material-icons">error_outline</i>
        <h3>Visitor Not Found</h3>
        <button type="button" class="btn-primary" (click)="goBack()">Go Back</button>
      </div>
    </div>
  `,
  styles: [`
    .qr-container {
      max-width: 520px;
      margin: 0 auto;
      padding: 0;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn-back {
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      color: #667eea;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-header h2 {
      margin: 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .qr-card {
      background: white;
      border-radius: 16px;
      padding: 32px 24px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .qr-card h3 {
      margin: 0 0 8px;
      font-size: 24px;
      color: #2c3e50;
    }

    .sub {
      margin: 0 0 4px;
      color: #7f8c8d;
      font-size: 14px;
    }

    .qr-wrap {
      margin: 24px auto;
      padding: 16px;
      border: 3px solid #667eea;
      border-radius: 12px;
      display: inline-block;
    }

    .qr-wrap img {
      width: 280px;
      height: 280px;
      display: block;
    }

    .hint {
      color: #555;
      font-size: 14px;
      margin: 0 0 20px;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary,
    .btn-secondary {
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 48px 20px;
      background: white;
      border-radius: 12px;
    }
  `]
})
export class RecurringVisitorQRComponent implements OnInit {
  visitor: RecurringVisitor | null = null;
  isLoading = true;
  visitorId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private visitorService: VisitorManagementService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.visitorId = params['id'];
      if (this.visitorId) {
        this.loadVisitor();
      } else {
        this.isLoading = false;
      }
    });
  }

  loadVisitor(): void {
    this.isLoading = true;
    this.visitorService.getRecurringVisitorById(this.visitorId).subscribe({
      next: visitor => {
        if (!visitor) {
          this.visitor = null;
          this.isLoading = false;
          return;
        }
        void this.visitorService.ensureRecurringVisitorQrCode(visitor).then(enriched => {
          this.visitor = enriched;
          this.isLoading = false;
        });
      },
      error: () => {
        this.visitor = null;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    if (this.visitorId) {
      this.router.navigate(['/admin/visitors/recurring', this.visitorId]);
      return;
    }
    this.router.navigate(['/admin/visitors/recurring']);
  }

  getPatternLabel(pattern: string): string {
    const labels: Record<string, string> = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      CUSTOM: 'Custom'
    };
    return labels[pattern] || pattern;
  }

  downloadQr(): void {
    if (!this.visitor?.qrCode) return;
    const link = document.createElement('a');
    link.href = this.visitor.qrCode;
    link.download = `recurring-visitor-${this.visitor.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** Print only the pass (not the admin shell). */
  printQr(): void {
    if (!this.visitor?.qrCode) return;
    const v = this.visitor;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the QR code.');
      return;
    }
    printWindow.document.write(`
      <html><head><title>QR - ${v.name}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 24px; }
        img { width: 280px; height: 280px; margin: 16px 0; }
        h2 { margin: 0 0 8px; }
        p { color: #555; }
      </style></head><body>
        <h2>${v.name}</h2>
        <p>${v.visitingFlat} · ${v.purpose}</p>
        <img src="${v.qrCode}" alt="QR" />
        <p>Show at gate for entry</p>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }
}
