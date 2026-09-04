import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">account_balance</i> Accounting & Reports</h1>
        <p>30+ financial reports and GST compliance</p>
      </div>
      
      <!-- Feature Cards Grid -->
      <div class="features-grid">
        <!-- Invoices with Automatic GST Calculation Card -->
        <div class="feature-card invoices" (click)="navigateTo('/admin/billing/invoices')">
          <div class="card-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="card-content">
            <h3>Invoice Management</h3>
            <p>Create, manage, and track invoices with automatic GST calculation</p>
            <div class="card-features">
              <span class="feature-tag">Auto GST</span>
              <span class="feature-tag">CGST/SGST/IGST</span>
              <span class="feature-tag">Compliant</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- GST Return Preparation Card -->
        <div class="feature-card gst-returns" (click)="navigateTo('/admin/accounting/gst-return-preparation')">
          <div class="card-icon">
            <i class="material-icons">assessment</i>
          </div>
          <div class="card-content">
            <h3>GST Return Preparation</h3>
            <p>Prepare and file GST returns (GSTR-1, GSTR-3B) with ease</p>
            <div class="card-features">
              <span class="feature-tag">GSTR-1</span>
              <span class="feature-tag">GSTR-3B</span>
              <span class="feature-tag">Auto Fill</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Financial Reports Card -->
        <div class="feature-card financial-reports">
          <div class="card-icon">
            <i class="material-icons">bar_chart</i>
          </div>
          <div class="card-content">
            <h3>Financial Reports</h3>
            <p>Comprehensive financial reports and analytics</p>
            <div class="card-features">
              <span class="feature-tag">P&L</span>
              <span class="feature-tag">Balance Sheet</span>
              <span class="feature-tag">Coming Soon</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Vendor Payments with TDS Card -->
        <div class="feature-card vendor-payments" (click)="navigateTo('/admin/accounting/vendor-payments')">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <h3>Vendor Payments</h3>
            <p>Manage vendor payments with automatic TDS deduction</p>
            <div class="card-features">
              <span class="feature-tag">Auto TDS</span>
              <span class="feature-tag">TDS Certificates</span>
              <span class="feature-tag">Compliant</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Form 26AS Reconciliation Card -->
        <div class="feature-card form26as" (click)="navigateTo('/admin/accounting/form26as-reconciliation')">
          <div class="card-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="card-content">
            <h3>Form 26AS Reconciliation</h3>
            <p>Reconcile TDS entries with Form 26AS data for compliance</p>
            <div class="card-features">
              <span class="feature-tag">Auto Match</span>
              <span class="feature-tag">Discrepancy Detection</span>
              <span class="feature-tag">Compliant</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- TDS Certificate Generation Card -->
        <div class="feature-card tds-certificates" (click)="navigateTo('/admin/accounting/tds-certificates')">
          <div class="card-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="card-content">
            <h3>TDS Certificate Generation</h3>
            <p>Generate and manage TDS certificates (Form 16/16A) for vendor payments</p>
            <div class="card-features">
              <span class="feature-tag">Form 16</span>
              <span class="feature-tag">Form 16A</span>
              <span class="feature-tag">Bulk Generate</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Balance Sheet Card -->
        <div class="feature-card balance-sheet" (click)="navigateTo('/admin/accounting/balance-sheet')">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <h3>Real-time Balance Sheet</h3>
            <p>View and analyze your financial position with real-time balance sheet</p>
            <div class="card-features">
              <span class="feature-tag">Real-time</span>
              <span class="feature-tag">Assets & Liabilities</span>
              <span class="feature-tag">Equity</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Income & Expenditure Statement Card -->
        <div class="feature-card income-expenditure" (click)="navigateTo('/admin/accounting/income-expenditure')">
          <div class="card-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="card-content">
            <h3>Income & Expenditure Statement</h3>
            <p>View income, expenses, and profitability with real-time P&L statement</p>
            <div class="card-features">
              <span class="feature-tag">Real-time</span>
              <span class="feature-tag">Income & Expenses</span>
              <span class="feature-tag">Profit/Loss</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Receipt & Payment Statement Card -->
        <div class="feature-card receipt-payment" (click)="navigateTo('/admin/accounting/receipt-payment')">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <h3>Receipt & Payment Statement</h3>
            <p>Track actual cash receipts and payments with cash flow statement</p>
            <div class="card-features">
              <span class="feature-tag">Cash Flow</span>
              <span class="feature-tag">Receipts & Payments</span>
              <span class="feature-tag">Real-time</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Defaulters Report Card -->
        <div class="feature-card defaulters-report" (click)="navigateTo('/admin/accounting/defaulters-report')">
          <div class="card-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="card-content">
            <h3>Defaulters Report</h3>
            <p>Track overdue payments with aging analysis and defaulter management</p>
            <div class="card-features">
              <span class="feature-tag">Aging Analysis</span>
              <span class="feature-tag">Overdue Tracking</span>
              <span class="feature-tag">Reminders</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Budget vs Actual Variance Report Card -->
        <div class="feature-card budget-variance" (click)="navigateTo('/admin/accounting/budget-variance')">
          <div class="card-icon">
            <i class="material-icons">compare_arrows</i>
          </div>
          <div class="card-content">
            <h3>Budget vs Actual Variance</h3>
            <p>Compare budgeted amounts with actual performance and analyze variances</p>
            <div class="card-features">
              <span class="feature-tag">Budget Analysis</span>
              <span class="feature-tag">Variance Report</span>
              <span class="feature-tag">Performance</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Cash & Bank Reconciliation Card -->
        <div class="feature-card cash-bank-reconciliation" (click)="navigateTo('/admin/accounting/cash-bank-reconciliation')">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <h3>Cash & Bank Reconciliation</h3>
            <p>Reconcile bank statements with your books and identify discrepancies</p>
            <div class="card-features">
              <span class="feature-tag">Bank Reconciliation</span>
              <span class="feature-tag">Transaction Matching</span>
              <span class="feature-tag">Variance Analysis</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Petty Cash Management Card -->
        <div class="feature-card petty-cash" (click)="navigateTo('/admin/accounting/petty-cash')">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <h3>Petty Cash Management</h3>
            <p>Control small day-to-day expenses with petty cash limits and approvals</p>
            <div class="card-features">
              <span class="feature-tag">Petty Cash</span>
              <span class="feature-tag">Vouchers</span>
              <span class="feature-tag">Approvals</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Export to Tally / Excel / PDF Card -->
        <div class="feature-card export-reports" (click)="navigateTo('/admin/accounting/export-reports')">
          <div class="card-icon">
            <i class="material-icons">file_download</i>
          </div>
          <div class="card-content">
            <h3>Export to Tally / Excel / PDF</h3>
            <p>Export trial balance, statements, and ledgers for CA and analysis</p>
            <div class="card-features">
              <span class="feature-tag">Tally</span>
              <span class="feature-tag">Excel</span>
              <span class="feature-tag">PDF</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Audit-ready Reports for CA Card -->
        <div class="feature-card audit-ready-reports" (click)="navigateTo('/admin/accounting/audit-ready-reports')">
          <div class="card-icon">
            <i class="material-icons">assignment</i>
          </div>
          <div class="card-content">
            <h3>Audit-ready Reports for CA</h3>
            <p>Provide your CA with clean trial balance, key ledgers and audit checklist</p>
            <div class="card-features">
              <span class="feature-tag">Trial Balance</span>
              <span class="feature-tag">Key Ledgers</span>
              <span class="feature-tag">Checklist</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Member Statement Card -->
        <div class="feature-card member-statement" (click)="navigateTo('/admin/accounting/member-statement')">
          <div class="card-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="card-content">
            <h3>Member Statement (Per Flat)</h3>
            <p>Generate detailed financial statements for each flat/unit member</p>
            <div class="card-features">
              <span class="feature-tag">Per Flat</span>
              <span class="feature-tag">Transaction History</span>
              <span class="feature-tag">Aging Analysis</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Tax Management Card -->
        <div class="feature-card tax-management" (click)="navigateTo('/admin/accounting/tax-management')">
          <div class="card-icon">
            <i class="material-icons">calculate</i>
          </div>
          <div class="card-content">
            <h3>Tax Management</h3>
            <p>Manage tax calculations and compliance</p>
            <div class="card-features">
              <span class="feature-tag">GST</span>
              <span class="feature-tag">TDS</span>
              <span class="feature-tag">Compliance</span>
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
    .module-page { 
      max-width: 1400px; 
      margin: 0 auto; 
      padding: 24px;
    }
    
    .page-header { 
      margin-bottom: 32px; 
    }
    
    .page-header h1 { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      font-size: 32px; 
      margin: 0 0 10px 0; 
      color: #2c3e50; 
    }
    
    .page-header h1 .material-icons { 
      font-size: 40px; 
      color: #3498db; 
    }
    
    .page-header p { 
      margin: 0; 
      color: #7f8c8d; 
      font-size: 16px; 
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
      user-select: none;
      text-decoration: none;
      color: inherit;
    }

    a.feature-card {
      display: flex;
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
      pointer-events: none;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .feature-card:hover::before {
      transform: scaleX(1);
    }

    .feature-card.invoices .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .feature-card.gst-returns .card-icon {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .feature-card.financial-reports .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card.vendor-payments .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .feature-card.form26as .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card.tds-certificates .card-icon {
      background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%);
    }

    .feature-card.balance-sheet .card-icon {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    }

    .feature-card.income-expenditure .card-icon {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .feature-card.receipt-payment .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card.defaulters-report .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .feature-card.budget-variance .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card.cash-bank-reconciliation .card-icon {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
    }

    .feature-card.petty-cash .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card.export-reports .card-icon {
      background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
    }

    .feature-card.audit-ready-reports .card-icon {
      background: linear-gradient(135deg, #2c3e50 0%, #4a6074 100%);
    }

    .feature-card.member-statement .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card.tax-management .card-icon {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
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
      pointer-events: none;
    }

    .card-icon .material-icons {
      font-size: 32px;
    }

    .card-content {
      flex: 1;
      pointer-events: none;
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
      pointer-events: none;
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
      pointer-events: none;
    }

    .card-arrow {
      color: #bdc3c7;
      transition: all 0.3s ease;
      pointer-events: none;
    }

    .feature-card:hover .card-arrow {
      color: #3498db;
      transform: translateX(4px);
    }

    .card-arrow .material-icons {
      font-size: 24px;
    }

    @media (max-width: 768px) {
      .module-page {
        padding: 16px;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AccountingComponent {
  constructor(private router: Router) {}

  /**
   * Navigate to the specified route
   */
  navigateTo(route: string): void {
    console.log('navigateTo called with route:', route);
    
    if (!this.router) {
      console.error('Router is not available!');
      return;
    }

    // Ensure route starts with /
    const absoluteRoute = route.startsWith('/') ? route : '/' + route;
    
    console.log('Navigating to absolute route:', absoluteRoute);
    
    // Use navigateByUrl for absolute paths - more reliable
    this.router.navigateByUrl(absoluteRoute).then(
      (success) => {
        console.log('Navigation success:', success);
      },
      (error) => {
        console.error('Navigation error:', error);
        // Fallback: try with router.navigate using route array
        const routeArray = absoluteRoute.substring(1).split('/').filter(r => r);
        console.log('Trying fallback navigation with route array:', routeArray);
        this.router.navigate(routeArray).catch((err) => {
          console.error('Fallback navigation also failed:', err);
        });
      }
    );
  }

  /**
   * Show coming soon message for features not yet implemented
   */
  showComingSoon(): void {
    console.log('Tax Management clicked');
    alert('Tax Management feature is coming soon!');
  }
}
