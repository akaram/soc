import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

/**
 * Payments Component - Main Menu
 * Shows all payment-related features with navigation cards
 */
@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="payments-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>
            <i class="material-icons">payment</i>
            Payment Gateway
          </h1>
          <p>Manage all payment operations and methods</p>
        </div>
      </div>

      <!-- Feature Cards Grid -->
      <div class="features-grid">
        <!-- Multiple Payment Methods Card -->
        <div class="feature-card multiple-methods" (click)="navigateTo('/admin/payments/multiple-payment-methods')">
          <div class="card-icon">
            <i class="material-icons">payment</i>
          </div>
          <div class="card-content">
            <h3>Multiple Payment Methods</h3>
            <p>Accept payments via mada, VISA, Mastercard, Apple Pay, Google Pay, SADAD, UPI, Net Banking</p>
            <div class="card-features">
              <span class="feature-tag">Cards</span>
              <span class="feature-tag">Digital Wallets</span>
              <span class="feature-tag">Banking</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- NEFT Auto-Reconciliation Card -->
        <div class="feature-card neft-reconciliation" (click)="navigateTo('/admin/payments/neft-auto-reconciliation')">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <h3>NEFT Auto-Reconciliation</h3>
            <p>Collect and automatically reconcile NEFT payments with invoices and bills</p>
            <div class="card-features">
              <span class="feature-tag">Auto-Match</span>
              <span class="feature-tag">Reconciliation</span>
              <span class="feature-tag">Reports</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Saved Payment Methods Card -->
        <div class="feature-card saved-methods" (click)="navigateTo('/admin/payments/saved-payment-methods')">
          <div class="card-icon">
            <i class="material-icons">credit_card</i>
          </div>
          <div class="card-content">
            <h3>Saved Payment Methods</h3>
            <p>Save and manage payment methods with secure tokenization</p>
            <div class="card-features">
              <span class="feature-tag">Tokenization</span>
              <span class="feature-tag">Secure</span>
              <span class="feature-tag">Quick Pay</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Auto-pay/Recurring Payments Card -->
        <div class="feature-card auto-pay" (click)="navigateTo('/admin/payments/auto-pay-recurring')">
          <div class="card-icon">
            <i class="material-icons">autorenew</i>
          </div>
          <div class="card-content">
            <h3>Auto-pay / Recurring Payments</h3>
            <p>Set up and manage automatic recurring payments for bills and invoices</p>
            <div class="card-features">
              <span class="feature-tag">Auto-Pay</span>
              <span class="feature-tag">Recurring</span>
              <span class="feature-tag">Scheduled</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Installment Plans Card -->
        <div class="feature-card installment-plans" (click)="navigateTo('/admin/payments/installment-plans')">
          <div class="card-icon">
            <i class="material-icons">payment_plan</i>
          </div>
          <div class="card-content">
            <h3>Installment Plans</h3>
            <p>Create and manage installment payment plans for invoices and bills</p>
            <div class="card-features">
              <span class="feature-tag">Flexible</span>
              <span class="feature-tag">Scheduled</span>
              <span class="feature-tag">Tracking</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Payment Reminders Card -->
        <div class="feature-card payment-reminders" (click)="navigateTo('/admin/payments/payment-reminders')">
          <div class="card-icon">
            <i class="material-icons">notifications_active</i>
          </div>
          <div class="card-content">
            <h3>Payment Reminders</h3>
            <p>Configure and manage payment reminders via push notifications, SMS, and email</p>
            <div class="card-features">
              <span class="feature-tag">Push</span>
              <span class="feature-tag">SMS</span>
              <span class="feature-tag">Email</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Digital Receipts Card -->
        <div class="feature-card digital-receipts" (click)="navigateTo('/admin/payments/digital-receipts')">
          <div class="card-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="card-content">
            <h3>Digital Receipts</h3>
            <p>View, download, and manage digital payment receipts with PDF download</p>
            <div class="card-features">
              <span class="feature-tag">PDF</span>
              <span class="feature-tag">Download</span>
              <span class="feature-tag">Email</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payments-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .page-header {
      margin-bottom: 32px;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 8px 0;
    }

    .header-content h1 .material-icons {
      font-size: 36px;
      color: #3498db;
    }

    .header-content p {
      margin: 0;
      font-size: 16px;
      color: #7f8c8d;
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    .feature-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      align-items: flex-start;
      gap: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .feature-card:hover::before {
      transform: scaleX(1);
    }

    .feature-card.multiple-methods .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card.neft-reconciliation .card-icon {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
    }

    .feature-card.saved-methods .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card.auto-pay .card-icon {
      background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
    }

    .feature-card.installment-plans .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card.payment-reminders .card-icon {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
    }

    .feature-card.digital-receipts .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .card-icon .material-icons {
      font-size: 32px;
    }

    .card-content {
      flex: 1;
    }

    .card-content h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .card-content p {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .card-features {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .feature-tag {
      background: #f5f7fa;
      color: #3498db;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-arrow {
      color: #bdc3c7;
      transition: all 0.3s ease;
    }

    .feature-card:hover .card-arrow {
      color: #3498db;
      transform: translateX(4px);
    }

    .card-arrow .material-icons {
      font-size: 24px;
    }

    @media (max-width: 768px) {
      .payments-container {
        padding: 16px;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PaymentsComponent {
  constructor(private router: Router) {}

  /**
   * Navigate to the specified route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
