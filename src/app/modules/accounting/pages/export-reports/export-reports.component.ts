import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

/**
 * Interface representing a single exportable report definition.
 */
interface ExportableReport {
  id: string;
  name: string;
  category: 'accounting' | 'tax' | 'member' | 'cash-bank';
  description: string;
  supportsTally: boolean;
  supportsExcel: boolean;
  supportsPdf: boolean;
}

/**
 * Interface for quick summary of what will be exported.
 */
interface ExportSummary {
  totalReports: number;
  selectedReportName: string;
  periodLabel: string;
}

@Component({
  selector: 'app-export-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="export-reports-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">file_download</i>
            Export to Tally / Excel / PDF
          </h1>
          <p>Export accounting data for your CA, internal analysis, or member communication</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="exportAllExcel()" title="Export all to Excel">
            <i class="material-icons">download</i>
            Export All (Excel)
          </button>
        </div>
      </div>

      <!-- Filters and selection -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Report</label>
          <select [(ngModel)]="selectedReportId" (change)="onSelectionChange()">
            <option *ngFor="let r of reports" [value]="r.id">{{ r.name }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Financial Year</label>
          <select [(ngModel)]="selectedFinancialYear" (change)="onSelectionChange()">
            <option *ngFor="let fy of financialYears" [value]="fy">{{ fy }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Period</label>
          <select [(ngModel)]="selectedPeriod" (change)="onSelectionChange()">
            <option value="full-year">Full Year</option>
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>
        </div>
      </div>

      <!-- Summary and actions -->
      <div class="content-section">
        <div class="summary-panel">
          <h2>Export Summary</h2>
          <div class="summary-row">
            <span class="label">Selected Report</span>
            <span class="value">{{ exportSummary.selectedReportName }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Period</span>
            <span class="value">{{ exportSummary.periodLabel }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Available Formats</span>
            <span class="value">
              <span *ngIf="currentReport?.supportsTally">Tally</span>
              <span *ngIf="currentReport?.supportsExcel"> · Excel</span>
              <span *ngIf="currentReport?.supportsPdf"> · PDF</span>
            </span>
          </div>

          <div class="actions">
            <button class="btn btn-primary" [disabled]="!currentReport?.supportsTally" (click)="exportTally()">
              <i class="material-icons">sync_alt</i>
              Export to Tally
            </button>
            <button class="btn btn-secondary" [disabled]="!currentReport?.supportsExcel" (click)="exportExcel()">
              <i class="material-icons">table_view</i>
              Export to Excel
            </button>
            <button class="btn btn-secondary" [disabled]="!currentReport?.supportsPdf" (click)="exportPdf()">
              <i class="material-icons">picture_as_pdf</i>
              Export to PDF
            </button>
          </div>

          <p class="hint">
            These exports are designed to be audit-friendly and easy for CAs to import into their tools.
          </p>
        </div>

        <div class="details-panel" *ngIf="currentReport">
          <h2>Report Details</h2>
          <p class="description">{{ currentReport.description }}</p>

          <div class="details-grid">
            <div class="detail-card">
              <h3>Tally Export</h3>
              <p>Generates a Tally-compatible XML/CSV file (as per final integration) with proper ledger mapping.</p>
              <ul>
                <li>Correct ledger names and groups</li>
                <li>Voucher dates and references</li>
                <li>Debit / Credit values</li>
              </ul>
            </div>

            <div class="detail-card">
              <h3>Excel Export</h3>
              <p>Creates a structured Excel file for deeper analysis and sharing.</p>
              <ul>
                <li>Tabular format with filters</li>
                <li>Separate sheets for summary and details (in future)</li>
                <li>Easy to email or upload</li>
              </ul>
            </div>

            <div class="detail-card">
              <h3>PDF Export</h3>
              <p>Ideal for member statements, management review, and quick printing.</p>
              <ul>
                <li>Clean, printable layout</li>
                <li>Branding header and footer (later)</li>
                <li>Optional digital signature area</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .export-reports-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .page-header {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn,
    .icon-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .icon-btn {
      padding: 8px 16px;
      width: auto;
      border-radius: 20px;
      gap: 6px;
    }

    .back-btn:hover,
    .icon-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .filters-section {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px 24px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filter-group label {
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .filter-group select {
      min-width: 180px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #dfe6e9;
      font-size: 13px;
    }

    .content-section {
      display: grid;
      grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
      gap: 16px;
      padding: 24px;
    }

    .summary-panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .summary-panel h2 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .summary-row .label {
      color: #7f8c8d;
    }

    .summary-row .value {
      font-weight: 500;
      color: #2c3e50;
      text-align: right;
    }

    .actions {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }

    .btn-primary {
      background: #2c3e50;
      color: white;
    }

    .btn-secondary {
      background: #ecf0f1;
      color: #2c3e50;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }

    .hint {
      margin-top: 12px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .details-panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .details-panel h2 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .details-panel .description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #34495e;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .detail-card {
      border-radius: 10px;
      border: 1px solid #ecf0f1;
      padding: 14px;
      background: #fbfcfd;
    }

    .detail-card h3 {
      margin: 0 0 6px 0;
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-card p {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .detail-card ul {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
      color: #34495e;
    }

    @media (max-width: 900px) {
      .content-section {
        grid-template-columns: 1fr;
        padding: 16px;
      }
    }

    @media (max-width: 768px) {
      .filters-section {
        padding: 12px 16px;
      }
    }
  `]
})
export class ExportReportsComponent implements OnInit {
  // Expose Math if needed in templates later
  Math = Math;

  // Available financial years
  financialYears: string[] = [];
  selectedFinancialYear: string = '';

  // Period selection
  selectedPeriod: 'full-year' | 'q1' | 'q2' | 'q3' | 'q4' = 'full-year';

  // Exportable reports
  reports: ExportableReport[] = [];
  selectedReportId: string = '';
  currentReport: ExportableReport | null = null;

  // Summary for header panel
  exportSummary!: ExportSummary;

  constructor(private router: Router) {}

  /**
   * Initialize years, sample reports, and default selections.
   */
  ngOnInit(): void {
    this.initializeFinancialYears();
    this.initializeReports();
    this.selectedFinancialYear = this.financialYears[0];
    this.selectedReportId = this.reports[0]?.id || '';
    this.onSelectionChange();
  }

  /**
   * Navigate back to Accounting dashboard.
   */
  goBack(): void {
    this.router.navigateByUrl('/admin/accounting');
  }

  /**
   * Update current report and summary when filters change.
   */
  onSelectionChange(): void {
    this.currentReport = this.reports.find(r => r.id === this.selectedReportId) || null;

    this.exportSummary = {
      totalReports: this.reports.length,
      selectedReportName: this.currentReport ? this.currentReport.name : '-',
      periodLabel: this.buildPeriodLabel()
    };
  }

  /**
   * Build a human readable label for the selected period.
   */
  private buildPeriodLabel(): string {
    const fy = this.selectedFinancialYear || '';
    switch (this.selectedPeriod) {
      case 'q1':
        return `${fy} · Q1 (Apr - Jun)`;
      case 'q2':
        return `${fy} · Q2 (Jul - Sep)`;
      case 'q3':
        return `${fy} · Q3 (Oct - Dec)`;
      case 'q4':
        return `${fy} · Q4 (Jan - Mar)`;
      default:
        return `${fy} · Full Financial Year`;
    }
  }

  /**
   * Initialize last few financial years for selection.
   */
  private initializeFinancialYears(): void {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    const list: string[] = [];

    for (let y = startYear; y <= currentYear; y++) {
      const fy = `${y}-${(y + 1).toString().slice(-2)}`;
      list.unshift(fy);
    }

    this.financialYears = list;
  }

  /**
   * Initialize sample exportable reports for the UI.
   */
  private initializeReports(): void {
    this.reports = [
      {
        id: 'trial-balance',
        name: 'Trial Balance',
        category: 'accounting',
        description: 'Complete trial balance for the selected financial year and period.',
        supportsTally: true,
        supportsExcel: true,
        supportsPdf: true
      },
      {
        id: 'balance-sheet',
        name: 'Balance Sheet',
        category: 'accounting',
        description: 'Year-end balance sheet with assets, liabilities and equity.',
        supportsTally: false,
        supportsExcel: true,
        supportsPdf: true
      },
      {
        id: 'income-expenditure',
        name: 'Income & Expenditure Statement',
        category: 'accounting',
        description: 'Income and expenditure statement (P&L style) for the selected period.',
        supportsTally: false,
        supportsExcel: true,
        supportsPdf: true
      },
      {
        id: 'member-statement',
        name: 'Member Statements (All Flats)',
        category: 'member',
        description: 'Individual member statements for all flats with opening balance, transactions, and closing balance.',
        supportsTally: false,
        supportsExcel: true,
        supportsPdf: true
      },
      {
        id: 'gst-summary',
        name: 'GST Summary',
        category: 'tax',
        description: 'GST summary for outward and inward supplies, useful for return preparation.',
        supportsTally: true,
        supportsExcel: true,
        supportsPdf: true
      },
      {
        id: 'cash-bank',
        name: 'Cash & Bank Book',
        category: 'cash-bank',
        description: 'Cash and bank book details for reconciliation with bank statements.',
        supportsTally: true,
        supportsExcel: true,
        supportsPdf: false
      }
    ];
  }

  /**
   * Export currently selected report in Tally compatible format.
   * This is a placeholder – wire it to backend when API is available.
   */
  exportTally(): void {
    if (!this.currentReport || !this.currentReport.supportsTally) {
      return;
    }

    console.log('Export to Tally requested for', this.currentReport, this.selectedFinancialYear, this.selectedPeriod);
    alert(`Tally export for "${this.currentReport.name}" will be generated (placeholder). Later this will download a Tally-compatible file.`);
  }

  /**
   * Export currently selected report to Excel.
   * This can later call an API to get a real XLSX file.
   */
  exportExcel(): void {
    if (!this.currentReport || !this.currentReport.supportsExcel) {
      return;
    }

    console.log('Export to Excel requested for', this.currentReport, this.selectedFinancialYear, this.selectedPeriod);
    alert(`Excel export for "${this.currentReport.name}" will be generated (placeholder). In production this will download an .xlsx file.`);
  }

  /**
   * Export currently selected report to PDF.
   * Ideal for statements and management reports.
   */
  exportPdf(): void {
    if (!this.currentReport || !this.currentReport.supportsPdf) {
      return;
    }

    console.log('Export to PDF requested for', this.currentReport, this.selectedFinancialYear, this.selectedPeriod);
    alert(`PDF export for "${this.currentReport.name}" will be generated (placeholder). Later this will download a formatted PDF.`);
  }

  /**
   * Quick action: export all major accounting reports to Excel at once.
   */
  exportAllExcel(): void {
    console.log('Export all reports to Excel requested for', this.selectedFinancialYear, this.selectedPeriod);
    alert('Bulk Excel export for all key reports will be generated (placeholder). This can later trigger a ZIP with multiple Excel files.');
  }
}


