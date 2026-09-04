import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import { Visitor } from '../models/visitor.model';

@Component({
  selector: 'app-visitor-qr-code',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="qr-code-container">
      <div class="qr-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Visitor QR Code</h2>
      </div>

      <div class="qr-content" *ngIf="visitor && !isLoading">
        <!-- Visitor Information Card -->
        <div class="visitor-card">
          <div class="visitor-header">
            <div class="visitor-avatar">
              {{ visitor.name.charAt(0).toUpperCase() }}
            </div>
            <div class="visitor-info">
              <h3>{{ visitor.name }}</h3>
              <p class="visitor-phone">
                <i class="material-icons">phone</i>
                {{ visitor.phone }}
              </p>
            </div>
          </div>

          <div class="visitor-details">
            <div class="detail-item">
              <span class="label">Visiting:</span>
              <span class="value">{{ visitor.visitingFlat }} <span *ngIf="visitor.visitingUnit">- {{ visitor.visitingUnit }}</span></span>
            </div>
            <div class="detail-item">
              <span class="label">Host:</span>
              <span class="value">{{ visitor.hostName }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Purpose:</span>
              <span class="value">{{ visitor.purpose }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Visit Date:</span>
              <span class="value">{{ formatDate(visitor.visitDate) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Visit Time:</span>
              <span class="value">{{ visitor.visitTime }}</span>
            </div>
            <div class="detail-item" *ngIf="visitor.vehicleNumber">
              <span class="label">Vehicle:</span>
              <span class="value">{{ visitor.vehicleNumber }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="status-badge" [ngClass]="'status-' + visitor.status.toLowerCase()">
                {{ getStatusLabel(visitor.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- QR Code Card -->
        <div class="qr-card">
          <div class="qr-code-wrapper">
            <div class="qr-code-border">
              <img 
                *ngIf="visitor.qrCode" 
                [src]="visitor.qrCode" 
                alt="QR Code"
                class="qr-code-image">
              <div *ngIf="!visitor.qrCode" class="qr-placeholder">
                <i class="material-icons">qr_code</i>
                <p>QR Code not available</p>
              </div>
            </div>
            <p class="qr-instructions">
              Show this QR code at the gate for entry
            </p>
            <div class="qr-expiry" *ngIf="visitor.expiryDate">
              <i class="material-icons">schedule</i>
              Valid until: {{ formatDateTime(visitor.expiryDate) }}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="btn-secondary" (click)="downloadQRCode()" *ngIf="visitor.qrCode">
            <i class="material-icons">download</i>
            Download QR Code
          </button>
          <button class="btn-secondary" (click)="shareQRCode()" *ngIf="visitor.qrCode">
            <i class="material-icons">share</i>
            Share QR Code
          </button>
          <button class="btn-primary" (click)="printQRCode()" *ngIf="visitor.qrCode">
            <i class="material-icons">print</i>
            Print QR Code
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading QR code...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!isLoading && !visitor">
        <i class="material-icons">error_outline</i>
        <h3>Visitor Not Found</h3>
        <p>The visitor you're looking for doesn't exist or has been removed.</p>
        <button class="btn-primary" (click)="goBack()">
          Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .qr-code-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .qr-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .btn-back {
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #667eea;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .qr-header h2 {
      margin: 0;
      font-size: 28px;
      color: #2c3e50;
    }

    .qr-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Visitor Card */
    .visitor-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .visitor-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .visitor-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 24px;
    }

    .visitor-info h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .visitor-phone {
      margin: 0;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .visitor-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .detail-item .value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: fit-content;
    }

    .status-badge.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.status-approved {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-badge.status-checked_in {
      background: #d4edda;
      color: #155724;
    }

    /* QR Code Card */
    .qr-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
    }

    .qr-code-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .qr-code-border {
      padding: 24px;
      background: white;
      border: 4px solid #667eea;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
    }

    .qr-code-image {
      width: 300px;
      height: 300px;
      display: block;
    }

    .qr-placeholder {
      width: 300px;
      height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 8px;
      color: #999;
    }

    .qr-placeholder .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .qr-instructions {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .qr-expiry {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #7f8c8d;
      font-size: 14px;
      margin-top: 8px;
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      min-width: 150px;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
    }

    /* Loading and Error States */
    .loading-state,
    .error-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons,
    .error-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .error-state .material-icons {
      color: #e74c3c;
    }

    .error-state h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .error-state p {
      margin: 0 0 24px 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .qr-code-container {
        padding: 16px;
      }

      .qr-code-image {
        width: 250px;
        height: 250px;
      }

      .action-buttons {
        flex-direction: column;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class VisitorQRCodeComponent implements OnInit {
  visitor: Visitor | null = null;
  isLoading = true;
  visitorId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private visitorService: VisitorManagementService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.visitorId = params['id'];
      if (!this.visitorId) {
        this.isLoading = false;
        return;
      }
      const fromState = history.state?.['visitor'] as Visitor | undefined;
      if (fromState?.id === this.visitorId) {
        void this.applyVisitor(fromState);
        return;
      }
      this.loadVisitor();
    });
  }

  /** Apply visitor to the view (with QR image if missing). */
  private async applyVisitor(visitor: Visitor): Promise<void> {
    this.isLoading = true;
    try {
      this.visitor = await this.visitorService.ensureVisitorQrCode(visitor);
    } catch (e) {
      console.error('Error preparing visitor QR:', e);
      this.visitor = visitor;
    }
    this.isLoading = false;
  }

  loadVisitor(): void {
    this.isLoading = true;
    this.visitorService.getVisitorById(this.visitorId).subscribe({
      next: visitor => void this.applyVisitor(visitor),
      error: error => {
        console.error('Error loading visitor:', error);
        this.visitor = null;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors']);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CHECKED_IN': 'Checked In',
      'CHECKED_OUT': 'Checked Out',
      'EXPIRED': 'Expired',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  downloadQRCode(): void {
    if (!this.visitor?.qrCode) return;

    const link = document.createElement('a');
    link.href = this.visitor.qrCode;
    link.download = `visitor-qr-${this.visitor.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  shareQRCode(): void {
    if (!this.visitor) return;

    const shareData = {
      title: `Visitor QR Code - ${this.visitor.name}`,
      text: `QR code for ${this.visitor.name} visiting ${this.visitor.visitingFlat}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  }

  /** Open a minimal print view with only the visitor pass / QR (not the admin portal). */
  printQRCode(): void {
    if (!this.visitor?.qrCode) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the QR code.');
      return;
    }

    const v = this.visitor;
    const unitSuffix = v.visitingUnit ? ` - ${this.escapeHtml(v.visitingUnit)}` : '';
    const vehicleRow = v.vehicleNumber
      ? `<p><strong>Vehicle:</strong> ${this.escapeHtml(v.vehicleNumber)}</p>`
      : '';
    const expiryRow = v.expiryDate
      ? `<p class="expiry">Valid until: ${this.escapeHtml(this.formatDateTime(v.expiryDate))}</p>`
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Visitor Pass - ${this.escapeHtml(v.name)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 24px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .pass {
              text-align: center;
              border: 2px solid #333;
              border-radius: 12px;
              padding: 28px 32px;
              max-width: 420px;
              width: 100%;
            }
            .pass h1 {
              margin: 0 0 8px;
              font-size: 20px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .pass h2 {
              margin: 0 0 16px;
              font-size: 26px;
              color: #222;
            }
            .pass .meta {
              margin: 4px 0;
              font-size: 14px;
              color: #444;
            }
            .pass .meta strong { color: #111; }
            .qr-wrap {
              margin: 20px auto;
              padding: 16px;
              border: 3px solid #667eea;
              border-radius: 12px;
              display: inline-block;
              background: #fff;
            }
            .qr-wrap img {
              width: 280px;
              height: 280px;
              display: block;
            }
            .hint {
              margin: 16px 0 0;
              font-size: 13px;
              color: #555;
            }
            .expiry {
              margin-top: 12px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
              .pass { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="pass">
            <h1>Visitor Entry Pass</h1>
            <h2>${this.escapeHtml(v.name)}</h2>
            <p class="meta"><strong>Visiting:</strong> ${this.escapeHtml(v.visitingFlat)}${unitSuffix}</p>
            <p class="meta"><strong>Host:</strong> ${this.escapeHtml(v.hostName)}</p>
            <p class="meta"><strong>Purpose:</strong> ${this.escapeHtml(v.purpose)}</p>
            <p class="meta"><strong>Date:</strong> ${this.escapeHtml(this.formatDate(v.visitDate))} · ${this.escapeHtml(v.visitTime)}</p>
            ${vehicleRow}
            <div class="qr-wrap">
              <img src="${v.qrCode}" alt="Visitor QR code" />
            </div>
            <p class="hint">Show this QR code at the gate for entry</p>
            ${expiryRow}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  /** Prevent HTML injection when writing the print document. */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

