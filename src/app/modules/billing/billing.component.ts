import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

/**
 * Billing Component - Main Menu
 * Shows all billing-related features with navigation cards
 */
@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="billing-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>
            <i class="material-icons">receipt_long</i>
            Billing & Invoicing
          </h1>
          <p>Manage all billing and invoicing operations</p>
        </div>
      </div>

      <!-- Feature Cards Grid -->
      <div class="features-grid">
        <!-- Automated Monthly Maintenance Bills Card -->
        <div class="feature-card maintenance-bills" (click)="navigateTo('/admin/billing/maintenance-bills')">
          <div class="card-icon">
            <i class="material-icons">autorenew</i>
          </div>
          <div class="card-content">
            <h3>Automated Monthly Maintenance Bills</h3>
            <p>Automated generation and distribution of monthly maintenance bills</p>
            <div class="card-features">
              <span class="feature-tag">Auto Generation</span>
              <span class="feature-tag">Monthly Cycle</span>
              <span class="feature-tag">Notifications</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Utility Bills Card -->
        <div class="feature-card utility-bills" (click)="navigateTo('/admin/billing/utility-bills')">
          <div class="card-icon">
            <i class="material-icons">bolt</i>
          </div>
          <div class="card-content">
            <h3>Utility Bills</h3>
            <p>Manage electricity, water, and other utility bills</p>
            <div class="card-features">
              <span class="feature-tag">Electricity</span>
              <span class="feature-tag">Water</span>
              <span class="feature-tag">Gas</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Invoice Management Card -->
        <div class="feature-card invoices" (click)="navigateTo('/admin/billing/invoices')">
          <div class="card-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="card-content">
            <h3>Invoice Management</h3>
            <p>Create, manage, and track all invoices</p>
            <div class="card-features">
              <span class="feature-tag">Create</span>
              <span class="feature-tag">Track</span>
              <span class="feature-tag">Export</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Payment Tracking Card -->
        <div class="feature-card payments" (click)="navigateTo('/admin/billing/payment-tracking')">
          <div class="card-icon">
            <i class="material-icons">payment</i>
          </div>
          <div class="card-content">
            <h3>Payment Tracking</h3>
            <p>Track and manage all payment transactions</p>
            <div class="card-features">
              <span class="feature-tag">Online</span>
              <span class="feature-tag">Offline</span>
              <span class="feature-tag">Reports</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Bulk Invoice Generation Card -->
        <div class="feature-card bulk-invoice" (click)="navigateTo('/admin/billing/bulk-invoice-generation')">
          <div class="card-icon">
            <i class="material-icons">batch_prediction</i>
          </div>
          <div class="card-content">
            <h3>Bulk Invoice Generation</h3>
            <p>Generate multiple invoices at once for multiple residents</p>
            <div class="card-features">
              <span class="feature-tag">Templates</span>
              <span class="feature-tag">Bulk</span>
              <span class="feature-tag">Auto</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Customizable Billing Cycles Card -->
        <div class="feature-card billing-cycles" (click)="navigateTo('/admin/billing/customizable-billing-cycles')">
          <div class="card-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="card-content">
            <h3>Customizable Billing Cycles</h3>
            <p>Create and manage custom billing cycles for different billing scenarios</p>
            <div class="card-features">
              <span class="feature-tag">Flexible</span>
              <span class="feature-tag">Auto-Generate</span>
              <span class="feature-tag">Custom</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Late Payment Penalties Card -->
        <div class="feature-card late-penalties" (click)="navigateTo('/admin/billing/late-payment-penalties')">
          <div class="card-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="card-content">
            <h3>Late Payment Penalties</h3>
            <p>Automatically calculate and manage late payment penalties</p>
            <div class="card-features">
              <span class="feature-tag">Auto-Calculate</span>
              <span class="feature-tag">Flexible</span>
              <span class="feature-tag">Tracking</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Advance Payment Discounts Card -->
        <div class="feature-card advance-discounts" (click)="navigateTo('/admin/billing/advance-payment-discounts')">
          <div class="card-icon">
            <i class="material-icons">local_offer</i>
          </div>
          <div class="card-content">
            <h3>Advance Payment Discounts</h3>
            <p>Manage discounts for advance payments</p>
            <div class="card-features">
              <span class="feature-tag">Auto-Apply</span>
              <span class="feature-tag">Flexible</span>
              <span class="feature-tag">Tracking</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Metered Utilities Billing Card -->
        <div class="feature-card metered-utilities" (click)="navigateTo('/admin/billing/metered-utilities-billing')">
          <div class="card-icon">
            <i class="material-icons">speed</i>
          </div>
          <div class="card-content">
            <h3>Metered Utilities Billing</h3>
            <p>Manage billing for water, electricity, and gas based on meter readings</p>
            <div class="card-features">
              <span class="feature-tag">Water</span>
              <span class="feature-tag">Electricity</span>
              <span class="feature-tag">Gas</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Pro-rata Billing Card -->
        <div class="feature-card pro-rata" (click)="navigateTo('/admin/billing/pro-rata-billing')">
          <div class="card-icon">
            <i class="material-icons">calculate</i>
          </div>
          <div class="card-content">
            <h3>Pro-rata Billing for New Residents</h3>
            <p>Calculate and generate pro-rata bills for residents based on move-in dates</p>
            <div class="card-features">
              <span class="feature-tag">Auto-Calculate</span>
              <span class="feature-tag">Move-in Date</span>
              <span class="feature-tag">Proportional</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- GST-Compliant Invoices Card -->
        <div class="feature-card gst-invoices" (click)="navigateTo('/admin/billing/gst-compliant-invoices')">
          <div class="card-icon">
            <i class="material-icons">receipt_long</i>
          </div>
          <div class="card-content">
            <h3>GST-Compliant Invoices</h3>
            <p>Generate and manage GST-compliant invoices</p>
            <div class="card-features">
              <span class="feature-tag">GST</span>
              <span class="feature-tag">E-Way Bill</span>
              <span class="feature-tag">Compliant</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Custom Charges Card -->
        <div class="feature-card custom-charges" (click)="navigateTo('/admin/billing/custom-charges')">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <h3>Custom Charges</h3>
            <p>Manage corpus fund, sinking fund, and special assessments</p>
            <div class="card-features">
              <span class="feature-tag">Corpus</span>
              <span class="feature-tag">Sinking Fund</span>
              <span class="feature-tag">Assessments</span>
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
    .billing-container {
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

    .feature-card.maintenance-bills .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card.utility-bills .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card.invoices .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .feature-card.payments .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card.bulk-invoice .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .feature-card.billing-cycles .card-icon {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
    }

    .feature-card.late-penalties .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card.advance-discounts .card-icon {
      background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
    }

    .feature-card.metered-utilities .card-icon {
      background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);
    }

    .feature-card.pro-rata .card-icon {
      background: linear-gradient(135deg, #673ab7 0%, #512da8 100%);
    }

    .feature-card.gst-invoices .card-icon {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .feature-card.custom-charges .card-icon {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
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
      .billing-container {
        padding: 16px;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BillingComponent {
  constructor(private router: Router) {}

  /**
   * Navigate to the specified route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
