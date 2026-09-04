import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Cash & Bank Reconciliation Component
 * Reconciles cash and bank account balances with bank statements
 */

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  accountType: 'savings' | 'current' | 'cash';
  currentBalance: number;
  currency: string;
}

interface ReconciliationTransaction {
  id: string;
  transactionDate: Date;
  valueDate: Date;
  description: string;
  referenceNumber?: string;
  chequeNumber?: string;
  transactionType: 'deposit' | 'withdrawal' | 'interest' | 'charges' | 'transfer' | 'other';
  amount: number;
  balance: number;
  isMatched: boolean;
  matchedWith?: string; // ID of matched transaction
  isReconciled: boolean;
  reconciledDate?: Date;
  notes?: string;
}

interface BookTransaction {
  id: string;
  transactionDate: Date;
  description: string;
  referenceNumber?: string;
  chequeNumber?: string;
  transactionType: 'deposit' | 'withdrawal' | 'interest' | 'charges' | 'transfer' | 'other';
  amount: number;
  isMatched: boolean;
  matchedWith?: string;
  isReconciled: boolean;
}

interface ReconciliationData {
  accountId: string;
  accountName: string;
  statementStartDate: Date;
  statementEndDate: Date;
  openingBalance: number; // From bank statement
  closingBalance: number; // From bank statement
  bookOpeningBalance: number; // From books
  bookClosingBalance: number; // From books
  statementTransactions: ReconciliationTransaction[];
  bookTransactions: BookTransaction[];
  matchedTransactions: number;
  unmatchedStatementItems: number;
  unmatchedBookItems: number;
  variance: number;
  isReconciled: boolean;
  reconciledDate?: Date;
  reconciledBy?: string;
}

interface ReconciliationSummary {
  totalStatementDeposits: number;
  totalStatementWithdrawals: number;
  totalBookDeposits: number;
  totalBookWithdrawals: number;
  matchedDeposits: number;
  matchedWithdrawals: number;
  unmatchedStatementAmount: number;
  unmatchedBookAmount: number;
  variance: number;
  reconciliationStatus: 'reconciled' | 'pending' | 'variance';
}

@Component({
  selector: 'app-cash-bank-reconciliation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="reconciliation-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance</i>
            Cash & Bank Reconciliation
          </h1>
          <p>Reconcile bank statements with your books and identify discrepancies</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportReconciliation()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
          <button class="icon-btn" (click)="printReconciliation()" title="Print">
            <i class="material-icons">print</i>
            Print
          </button>
        </div>
      </div>

      <!-- Account & Period Selection -->
      <div class="selection-section">
        <div class="selection-controls">
          <div class="control-group">
            <label>Bank Account <span class="required">*</span></label>
            <select [(ngModel)]="selectedAccountId" (change)="onAccountChange()" required>
              <option value="">Select Account</option>
              <option *ngFor="let account of bankAccounts" [value]="account.id">
                {{ account.name }} - {{ account.accountNumber }} ({{ account.bankName }})
              </option>
            </select>
          </div>
          <div class="control-group">
            <label>Statement Start Date</label>
            <input type="date" [(ngModel)]="statementStartDate" (change)="loadReconciliation()" />
          </div>
          <div class="control-group">
            <label>Statement End Date</label>
            <input type="date" [(ngModel)]="statementEndDate" (change)="loadReconciliation()" />
          </div>
          <button class="btn btn-primary" (click)="loadReconciliation()">
            <i class="material-icons">refresh</i>
            Load Reconciliation
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card opening-balance">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <div class="card-label">Opening Balance</div>
            <div class="card-value">{{ formatCurrency(reconciliationData.openingBalance) }}</div>
            <div class="card-hint">Book: {{ formatCurrency(reconciliationData.bookOpeningBalance) }}</div>
          </div>
        </div>
        <div class="summary-card closing-balance">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Closing Balance</div>
            <div class="card-value">{{ formatCurrency(reconciliationData.closingBalance) }}</div>
            <div class="card-hint">Book: {{ formatCurrency(reconciliationData.bookClosingBalance) }}</div>
          </div>
        </div>
        <div class="summary-card matched">
          <div class="card-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="card-content">
            <div class="card-label">Matched Transactions</div>
            <div class="card-value">{{ reconciliationData.matchedTransactions }}</div>
            <div class="card-hint">Out of {{ reconciliationData.statementTransactions.length + reconciliationData.bookTransactions.length }} total</div>
          </div>
        </div>
        <div class="summary-card variance" [ngClass]="{'reconciled': reconciliationData.isReconciled, 'pending': !reconciliationData.isReconciled && reconciliationData.variance === 0, 'unreconciled': reconciliationData.variance !== 0}">
          <div class="card-icon">
            <i class="material-icons">{{ reconciliationData.isReconciled ? 'check_circle' : reconciliationData.variance === 0 ? 'schedule' : 'error' }}</i>
          </div>
          <div class="card-content">
            <div class="card-label">Variance</div>
            <div class="card-value">{{ formatCurrency(Math.abs(reconciliationData.variance)) }}</div>
            <div class="card-hint" [ngClass]="{'reconciled': reconciliationData.isReconciled, 'pending': !reconciliationData.isReconciled && reconciliationData.variance === 0, 'unreconciled': reconciliationData.variance !== 0}">
              {{ reconciliationData.isReconciled ? 'Reconciled' : reconciliationData.variance === 0 ? 'Ready to Reconcile' : 'Unreconciled' }}
            </div>
          </div>
        </div>
        <div class="summary-card unmatched-statement">
          <div class="card-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="card-content">
            <div class="card-label">Unmatched Statement Items</div>
            <div class="card-value">{{ reconciliationData.unmatchedStatementItems }}</div>
            <div class="card-hint">Amount: {{ formatCurrency(summary.unmatchedStatementAmount) }}</div>
          </div>
        </div>
        <div class="summary-card unmatched-book">
          <div class="card-icon">
            <i class="material-icons">book</i>
          </div>
          <div class="card-content">
            <div class="card-label">Unmatched Book Items</div>
            <div class="card-value">{{ reconciliationData.unmatchedBookItems }}</div>
            <div class="card-hint">Amount: {{ formatCurrency(summary.unmatchedBookAmount) }}</div>
          </div>
        </div>
      </div>

      <!-- Reconciliation Tabs -->
      <div class="reconciliation-tabs">
        <div class="tab-buttons">
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'statement'}" (click)="activeTab = 'statement'">
            <i class="material-icons">description</i>
            Bank Statement ({{ reconciliationData.statementTransactions.length }})
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'book'}" (click)="activeTab = 'book'">
            <i class="material-icons">book</i>
            Book Transactions ({{ reconciliationData.bookTransactions.length }})
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'unmatched'}" (click)="activeTab = 'unmatched'">
            <i class="material-icons">warning</i>
            Unmatched Items ({{ reconciliationData.unmatchedStatementItems + reconciliationData.unmatchedBookItems }})
          </button>
        </div>

        <!-- Bank Statement Tab -->
        <div class="tab-content" *ngIf="activeTab === 'statement'">
          <div class="table-header">
            <h3>Bank Statement Transactions</h3>
            <div class="table-actions">
              <button class="btn btn-secondary" (click)="autoMatchTransactions()">
                <i class="material-icons">auto_fix_high</i>
                Auto Match
              </button>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="reconciliation-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value Date</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let transaction of reconciliationData.statementTransactions" 
                    [ngClass]="{'matched': transaction.isMatched, 'unmatched': !transaction.isMatched}">
                  <td>{{ formatDate(transaction.transactionDate) }}</td>
                  <td>{{ formatDate(transaction.valueDate) }}</td>
                  <td class="description">{{ transaction.description }}</td>
                  <td>
                    <span *ngIf="transaction.referenceNumber">{{ transaction.referenceNumber }}</span>
                    <span *ngIf="transaction.chequeNumber">Chq: {{ transaction.chequeNumber }}</span>
                    <span *ngIf="!transaction.referenceNumber && !transaction.chequeNumber">-</span>
                  </td>
                  <td>
                    <span class="type-badge" [ngClass]="transaction.transactionType">
                      {{ getTransactionTypeLabel(transaction.transactionType) }}
                    </span>
                  </td>
                  <td class="amount" [ngClass]="{'deposit': transaction.transactionType === 'deposit' || transaction.transactionType === 'interest', 'withdrawal': transaction.transactionType === 'withdrawal' || transaction.transactionType === 'charges'}">
                    {{ transaction.transactionType === 'deposit' || transaction.transactionType === 'interest' ? '+' : '-' }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                  </td>
                  <td class="amount">{{ formatCurrency(transaction.balance) }}</td>
                  <td>
                    <span class="status-badge" [ngClass]="{'matched': transaction.isMatched, 'unmatched': !transaction.isMatched}">
                      <i class="material-icons">{{ transaction.isMatched ? 'check_circle' : 'radio_button_unchecked' }}</i>
                      {{ transaction.isMatched ? 'Matched' : 'Unmatched' }}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn match" (click)="openMatchModal(transaction)" *ngIf="!transaction.isMatched" title="Match Transaction">
                      <i class="material-icons">link</i>
                    </button>
                    <button class="action-btn view" (click)="viewTransaction(transaction)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Book Transactions Tab -->
        <div class="tab-content" *ngIf="activeTab === 'book'">
          <div class="table-header">
            <h3>Book Transactions</h3>
          </div>
          <div class="table-wrapper">
            <table class="reconciliation-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let transaction of reconciliationData.bookTransactions" 
                    [ngClass]="{'matched': transaction.isMatched, 'unmatched': !transaction.isMatched}">
                  <td>{{ formatDate(transaction.transactionDate) }}</td>
                  <td class="description">{{ transaction.description }}</td>
                  <td>
                    <span *ngIf="transaction.referenceNumber">{{ transaction.referenceNumber }}</span>
                    <span *ngIf="transaction.chequeNumber">Chq: {{ transaction.chequeNumber }}</span>
                    <span *ngIf="!transaction.referenceNumber && !transaction.chequeNumber">-</span>
                  </td>
                  <td>
                    <span class="type-badge" [ngClass]="transaction.transactionType">
                      {{ getTransactionTypeLabel(transaction.transactionType) }}
                    </span>
                  </td>
                  <td class="amount" [ngClass]="{'deposit': transaction.transactionType === 'deposit' || transaction.transactionType === 'interest', 'withdrawal': transaction.transactionType === 'withdrawal' || transaction.transactionType === 'charges'}">
                    {{ transaction.transactionType === 'deposit' || transaction.transactionType === 'interest' ? '+' : '-' }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="{'matched': transaction.isMatched, 'unmatched': !transaction.isMatched}">
                      <i class="material-icons">{{ transaction.isMatched ? 'check_circle' : 'radio_button_unchecked' }}</i>
                      {{ transaction.isMatched ? 'Matched' : 'Unmatched' }}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn match" (click)="openMatchModal(null, transaction)" *ngIf="!transaction.isMatched" title="Match Transaction">
                      <i class="material-icons">link</i>
                    </button>
                    <button class="action-btn view" (click)="viewTransaction(null, transaction)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Unmatched Items Tab -->
        <div class="tab-content" *ngIf="activeTab === 'unmatched'">
          <div class="unmatched-section">
            <div class="unmatched-group">
              <h4>Unmatched Statement Items ({{ reconciliationData.unmatchedStatementItems }})</h4>
              <div class="unmatched-list">
                <div *ngFor="let transaction of getUnmatchedStatementItems()" class="unmatched-item">
                  <div class="item-info">
                    <div class="item-date">{{ formatDate(transaction.transactionDate) }}</div>
                    <div class="item-description">{{ transaction.description }}</div>
                    <div class="item-reference" *ngIf="transaction.referenceNumber || transaction.chequeNumber">
                      {{ transaction.referenceNumber || transaction.chequeNumber }}
                    </div>
                  </div>
                  <div class="item-amount" [ngClass]="{'deposit': transaction.transactionType === 'deposit' || transaction.transactionType === 'interest', 'withdrawal': transaction.transactionType === 'withdrawal' || transaction.transactionType === 'charges'}">
                    {{ transaction.transactionType === 'deposit' || transaction.transactionType === 'interest' ? '+' : '-' }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                  </div>
                  <button class="btn btn-sm btn-primary" (click)="openMatchModal(transaction)">
                    <i class="material-icons">link</i>
                    Match
                  </button>
                </div>
              </div>
            </div>
            <div class="unmatched-group">
              <h4>Unmatched Book Items ({{ reconciliationData.unmatchedBookItems }})</h4>
              <div class="unmatched-list">
                <div *ngFor="let transaction of getUnmatchedBookItems()" class="unmatched-item">
                  <div class="item-info">
                    <div class="item-date">{{ formatDate(transaction.transactionDate) }}</div>
                    <div class="item-description">{{ transaction.description }}</div>
                    <div class="item-reference" *ngIf="transaction.referenceNumber || transaction.chequeNumber">
                      {{ transaction.referenceNumber || transaction.chequeNumber }}
                    </div>
                  </div>
                  <div class="item-amount" [ngClass]="{'deposit': transaction.transactionType === 'deposit' || transaction.transactionType === 'interest', 'withdrawal': transaction.transactionType === 'withdrawal' || transaction.transactionType === 'charges'}">
                    {{ transaction.transactionType === 'deposit' || transaction.transactionType === 'interest' ? '+' : '-' }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                  </div>
                  <button class="btn btn-sm btn-primary" (click)="openMatchModal(null, transaction)">
                    <i class="material-icons">link</i>
                    Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reconciliation Actions -->
      <div class="reconciliation-actions" *ngIf="selectedAccountId">
        <div class="actions-bar">
          <button class="btn btn-success" (click)="reconcileAccount()" [disabled]="reconciliationData.variance !== 0 || reconciliationData.isReconciled">
            <i class="material-icons">check_circle</i>
            {{ reconciliationData.isReconciled ? 'Reconciled' : 'Complete Reconciliation' }}
          </button>
          <button class="btn btn-secondary" (click)="resetReconciliation()" *ngIf="!reconciliationData.isReconciled">
            <i class="material-icons">refresh</i>
            Reset Matching
          </button>
        </div>
      </div>

      <!-- Match Transaction Modal -->
      <div class="modal-overlay" *ngIf="showMatchModal" (click)="closeMatchModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Match Transaction</h2>
            <button class="close-btn" (click)="closeMatchModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="match-section" *ngIf="selectedStatementTransaction">
              <h4>Statement Transaction</h4>
              <div class="transaction-details">
                <div class="detail-row">
                  <span>Date:</span>
                  <span>{{ formatDate(selectedStatementTransaction.transactionDate) }}</span>
                </div>
                <div class="detail-row">
                  <span>Description:</span>
                  <span>{{ selectedStatementTransaction.description }}</span>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <span class="amount">{{ formatCurrency(selectedStatementTransaction.amount) }}</span>
                </div>
              </div>
            </div>
            <div class="match-section" *ngIf="selectedBookTransaction">
              <h4>Book Transaction</h4>
              <div class="transaction-details">
                <div class="detail-row">
                  <span>Date:</span>
                  <span>{{ formatDate(selectedBookTransaction.transactionDate) }}</span>
                </div>
                <div class="detail-row">
                  <span>Description:</span>
                  <span>{{ selectedBookTransaction.description }}</span>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <span class="amount">{{ formatCurrency(selectedBookTransaction.amount) }}</span>
                </div>
              </div>
            </div>
            <div class="match-options" *ngIf="selectedStatementTransaction && !selectedBookTransaction">
              <h4>Select Book Transaction to Match</h4>
              <div class="match-list">
                <div *ngFor="let bookTx of getMatchableBookTransactions(selectedStatementTransaction)" 
                     class="match-item" 
                     (click)="selectBookTransactionForMatch(bookTx)">
                  <div class="match-item-info">
                    <div>{{ formatDate(bookTx.transactionDate) }}</div>
                    <div>{{ bookTx.description }}</div>
                    <div *ngIf="bookTx.referenceNumber || bookTx.chequeNumber">
                      {{ bookTx.referenceNumber || bookTx.chequeNumber }}
                    </div>
                  </div>
                  <div class="match-item-amount">{{ formatCurrency(bookTx.amount) }}</div>
                </div>
              </div>
            </div>
            <div class="match-options" *ngIf="selectedBookTransaction && !selectedStatementTransaction">
              <h4>Select Statement Transaction to Match</h4>
              <div class="match-list">
                <div *ngFor="let stmtTx of getMatchableStatementTransactions(selectedBookTransaction)" 
                     class="match-item" 
                     (click)="selectStatementTransactionForMatch(stmtTx)">
                  <div class="match-item-info">
                    <div>{{ formatDate(stmtTx.transactionDate) }}</div>
                    <div>{{ stmtTx.description }}</div>
                    <div *ngIf="stmtTx.referenceNumber || stmtTx.chequeNumber">
                      {{ stmtTx.referenceNumber || stmtTx.chequeNumber }}
                    </div>
                  </div>
                  <div class="match-item-amount">{{ formatCurrency(stmtTx.amount) }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeMatchModal()">Cancel</button>
            <button class="btn btn-primary" (click)="confirmMatch()" [disabled]="!canConfirmMatch()">
              <i class="material-icons">link</i>
              Confirm Match
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Reconciliation Settings</h2>
            <button class="close-btn" (click)="showSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Auto-match Tolerance (days)</label>
              <input type="number" [(ngModel)]="autoMatchTolerance" min="0" max="30" />
              <small>Allow matching transactions within this many days</small>
            </div>
            <div class="form-group">
              <label>Auto-match Amount Tolerance (%)</label>
              <input type="number" [(ngModel)]="autoMatchAmountTolerance" min="0" max="10" step="0.1" />
              <small>Allow matching transactions with amount difference within this percentage</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showSettings = false">Close</button>
            <button class="btn btn-primary" (click)="saveSettings()">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reconciliation-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
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
      font-size: 24px;
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

    /* Selection Section */
    .selection-section {
      background: white;
      padding: 20px 24px;
      margin: 24px 24px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .selection-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group label {
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .required {
      color: #e74c3c;
    }

    .control-group input,
    .control-group select {
      padding: 8px 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      min-width: 150px;
    }

    .control-group input:focus,
    .control-group select:focus {
      border-color: #16a085;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      padding: 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .summary-card.opening-balance .card-icon {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
    }

    .summary-card.closing-balance .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-card.matched .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.variance.reconciled .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.variance.pending .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .summary-card.variance.unreconciled .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.unmatched-statement .card-icon {
      background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
    }

    .summary-card.unmatched-book .card-icon {
      background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%);
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
    }

    .card-content {
      flex: 1;
    }

    .card-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .card-hint {
      font-size: 11px;
      margin-top: 4px;
      color: #7f8c8d;
    }

    .card-hint.reconciled {
      color: #2ed573;
      font-weight: 600;
    }

    .card-hint.pending {
      color: #f39c12;
      font-weight: 600;
    }

    .card-hint.unreconciled {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Reconciliation Tabs */
    .reconciliation-tabs {
      padding: 0 24px 24px;
    }

    .tab-buttons {
      display: flex;
      gap: 8px;
      background: white;
      padding: 8px;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-btn {
      flex: 1;
      padding: 12px 20px;
      border: none;
      background: transparent;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: #f8f9fa;
    }

    .tab-btn.active {
      background: #16a085;
      color: white;
    }

    .tab-content {
      background: white;
      padding: 24px;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .table-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .reconciliation-table {
      width: 100%;
      border-collapse: collapse;
    }

    .reconciliation-table thead {
      background: #f8f9fa;
    }

    .reconciliation-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .reconciliation-table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .reconciliation-table tbody tr:hover {
      background: #f8f9fa;
    }

    .reconciliation-table tbody tr.matched {
      background: #e8f8f0;
    }

    .reconciliation-table tbody tr.unmatched {
      background: #fff4e6;
    }

    .description {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.deposit {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .type-badge.withdrawal {
      background: #ffeaea;
      color: #e74c3c;
    }

    .type-badge.interest {
      background: #e7f3ff;
      color: #2980b9;
    }

    .type-badge.charges {
      background: #fff4e6;
      color: #e67e22;
    }

    .amount {
      text-align: right;
      font-weight: 500;
    }

    .amount.deposit {
      color: #2ed573;
    }

    .amount.withdrawal {
      color: #e74c3c;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.matched {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.unmatched {
      background: #fff4e6;
      color: #e67e22;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .action-btn.match {
      background: #e7f3ff;
      color: #2980b9;
    }

    .action-btn.view {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    /* Unmatched Items */
    .unmatched-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .unmatched-group h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .unmatched-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .unmatched-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #f39c12;
    }

    .item-info {
      flex: 1;
    }

    .item-date {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .item-description {
      font-weight: 500;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .item-reference {
      font-size: 12px;
      color: #7f8c8d;
    }

    .item-amount {
      font-weight: 600;
      font-size: 16px;
      min-width: 120px;
      text-align: right;
    }

    .item-amount.deposit {
      color: #2ed573;
    }

    .item-amount.withdrawal {
      color: #e74c3c;
    }

    /* Reconciliation Actions */
    .reconciliation-actions {
      padding: 0 24px 24px;
    }

    .actions-bar {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #16a085;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #138d75;
    }

    .btn-success {
      background: #2ed573;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #1e9e5a;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content.large {
      max-width: 900px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .close-btn {
      background: none;
      border: none;
      color: #95a5a6;
      cursor: pointer;
      padding: 4px;
    }

    .modal-body {
      padding: 20px;
    }

    .match-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .match-section h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .transaction-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .detail-row span:first-child {
      color: #7f8c8d;
      font-weight: 500;
    }

    .match-options h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .match-list {
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .match-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .match-item:hover {
      background: #e9ecef;
    }

    .match-item-info {
      flex: 1;
    }

    .match-item-info div {
      font-size: 14px;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .match-item-info div:first-child {
      font-size: 12px;
      color: #7f8c8d;
    }

    .match-item-amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .form-group input {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    .form-group input:focus {
      border-color: #16a085;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    @media (max-width: 1024px) {
      .unmatched-section {
        grid-template-columns: 1fr;
      }

      .reconciliation-table {
        min-width: 1200px;
      }
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .selection-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .tab-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class CashBankReconciliationComponent implements OnInit, OnDestroy {
  // Expose Math for use in templates
  Math = Math;
  
  bankAccounts: BankAccount[] = [];
  selectedAccountId: string = '';
  statementStartDate: string = '';
  statementEndDate: string = '';
  reconciliationData: ReconciliationData;
  summary: ReconciliationSummary;
  activeTab: 'statement' | 'book' | 'unmatched' = 'statement';
  showMatchModal: boolean = false;
  selectedStatementTransaction: ReconciliationTransaction | null = null;
  selectedBookTransaction: BookTransaction | null = null;
  showSettings: boolean = false;
  autoMatchTolerance: number = 3; // days
  autoMatchAmountTolerance: number = 1; // percentage

  private destroy$ = new Subject<void>();

  constructor() {
    // Set default dates to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    this.statementStartDate = firstDay.toISOString().split('T')[0];
    this.statementEndDate = lastDay.toISOString().split('T')[0];

    // Initialize empty reconciliation data
    this.reconciliationData = this.createEmptyReconciliation();
    this.summary = this.calculateSummary();
  }

  ngOnInit(): void {
    this.loadBankAccounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load bank accounts
   */
  loadBankAccounts(): void {
    // In real app, load from API
    this.bankAccounts = [
      {
        id: '1',
        name: 'Main Current Account',
        accountNumber: '1234567890',
        bankName: 'State Bank of India',
        accountType: 'current',
        currentBalance: 2500000,
        currency: 'INR'
      },
      {
        id: '2',
        name: 'Savings Account',
        accountNumber: '9876543210',
        bankName: 'HDFC Bank',
        accountType: 'savings',
        currentBalance: 500000,
        currency: 'INR'
      },
      {
        id: '3',
        name: 'Cash Account',
        accountNumber: 'CASH-001',
        bankName: 'Cash',
        accountType: 'cash',
        currentBalance: 100000,
        currency: 'INR'
      }
    ];
  }

  /**
   * Create empty reconciliation data
   */
  createEmptyReconciliation(): ReconciliationData {
    return {
      accountId: '',
      accountName: '',
      statementStartDate: this.statementStartDate ? new Date(this.statementStartDate) : new Date(),
      statementEndDate: this.statementEndDate ? new Date(this.statementEndDate) : new Date(),
      openingBalance: 0,
      closingBalance: 0,
      bookOpeningBalance: 0,
      bookClosingBalance: 0,
      statementTransactions: [],
      bookTransactions: [],
      matchedTransactions: 0,
      unmatchedStatementItems: 0,
      unmatchedBookItems: 0,
      variance: 0,
      isReconciled: false
    };
  }

  /**
   * Handle account change
   */
  onAccountChange(): void {
    if (this.selectedAccountId) {
      this.loadReconciliation();
    }
  }

  /**
   * Load reconciliation data
   */
  loadReconciliation(): void {
    if (!this.selectedAccountId) return;

    const account = this.bankAccounts.find(a => a.id === this.selectedAccountId);
    if (!account) return;

    // In real app, load from API
    this.reconciliationData = this.createEmptyReconciliation();
    this.reconciliationData.accountId = account.id;
    this.reconciliationData.accountName = account.name;
    this.reconciliationData.statementStartDate = new Date(this.statementStartDate);
    this.reconciliationData.statementEndDate = new Date(this.statementEndDate);

    // Load sample data
    this.loadSampleData();
    
    // Calculate summary
    this.calculateReconciliation();
    this.summary = this.calculateSummary();
  }

  /**
   * Load sample data
   */
  loadSampleData(): void {
    // Sample statement transactions
    this.reconciliationData.openingBalance = 2000000;
    this.reconciliationData.closingBalance = 2500000;
    this.reconciliationData.bookOpeningBalance = 2000000;
    this.reconciliationData.bookClosingBalance = 2480000;

    this.reconciliationData.statementTransactions = [
      {
        id: 'stmt1',
        transactionDate: new Date(2024, 0, 5),
        valueDate: new Date(2024, 0, 5),
        description: 'Maintenance Charges Collection',
        referenceNumber: 'TXN-001',
        transactionType: 'deposit',
        amount: 500000,
        balance: 2500000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'stmt2',
        transactionDate: new Date(2024, 0, 10),
        valueDate: new Date(2024, 0, 10),
        description: 'Salary Payment',
        referenceNumber: 'TXN-002',
        chequeNumber: 'CHQ-001',
        transactionType: 'withdrawal',
        amount: 400000,
        balance: 2100000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'stmt3',
        transactionDate: new Date(2024, 0, 15),
        valueDate: new Date(2024, 0, 15),
        description: 'Interest Credit',
        transactionType: 'interest',
        amount: 5000,
        balance: 2105000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'stmt4',
        transactionDate: new Date(2024, 0, 20),
        valueDate: new Date(2024, 0, 20),
        description: 'Vendor Payment',
        referenceNumber: 'TXN-003',
        transactionType: 'withdrawal',
        amount: 200000,
        balance: 1905000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'stmt5',
        transactionDate: new Date(2024, 0, 25),
        valueDate: new Date(2024, 0, 25),
        description: 'Parking Fees Collection',
        referenceNumber: 'TXN-004',
        transactionType: 'deposit',
        amount: 100000,
        balance: 2005000,
        isMatched: false,
        isReconciled: false
      }
    ];

    // Sample book transactions
    this.reconciliationData.bookTransactions = [
      {
        id: 'book1',
        transactionDate: new Date(2024, 0, 5),
        description: 'Maintenance Charges Received',
        referenceNumber: 'TXN-001',
        transactionType: 'deposit',
        amount: 500000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'book2',
        transactionDate: new Date(2024, 0, 10),
        description: 'Staff Salary Payment',
        referenceNumber: 'TXN-002',
        chequeNumber: 'CHQ-001',
        transactionType: 'withdrawal',
        amount: 400000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'book3',
        transactionDate: new Date(2024, 0, 18),
        description: 'Vendor Payment - ABC Corp',
        referenceNumber: 'TXN-003',
        transactionType: 'withdrawal',
        amount: 200000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'book4',
        transactionDate: new Date(2024, 0, 25),
        description: 'Parking Fees Collection',
        referenceNumber: 'TXN-004',
        transactionType: 'deposit',
        amount: 100000,
        isMatched: false,
        isReconciled: false
      },
      {
        id: 'book5',
        transactionDate: new Date(2024, 0, 28),
        description: 'Security Deposit Refund',
        referenceNumber: 'TXN-005',
        transactionType: 'withdrawal',
        amount: 50000,
        isMatched: false,
        isReconciled: false
      }
    ];
  }

  /**
   * Calculate reconciliation
   */
  calculateReconciliation(): void {
    // Count matched transactions
    this.reconciliationData.matchedTransactions = 
      this.reconciliationData.statementTransactions.filter(t => t.isMatched).length +
      this.reconciliationData.bookTransactions.filter(t => t.isMatched).length;

    // Count unmatched items
    this.reconciliationData.unmatchedStatementItems = 
      this.reconciliationData.statementTransactions.filter(t => !t.isMatched).length;
    this.reconciliationData.unmatchedBookItems = 
      this.reconciliationData.bookTransactions.filter(t => !t.isMatched).length;

    // Calculate variance
    const statementNet = this.reconciliationData.closingBalance - this.reconciliationData.openingBalance;
    const bookNet = this.reconciliationData.bookClosingBalance - this.reconciliationData.bookOpeningBalance;
    this.reconciliationData.variance = statementNet - bookNet;
  }

  /**
   * Calculate summary
   */
  calculateSummary(): ReconciliationSummary {
    const statementDeposits = this.reconciliationData.statementTransactions
      .filter(t => (t.transactionType === 'deposit' || t.transactionType === 'interest') && !t.isMatched)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const statementWithdrawals = this.reconciliationData.statementTransactions
      .filter(t => (t.transactionType === 'withdrawal' || t.transactionType === 'charges') && !t.isMatched)
      .reduce((sum, t) => sum + t.amount, 0);

    const bookDeposits = this.reconciliationData.bookTransactions
      .filter(t => (t.transactionType === 'deposit' || t.transactionType === 'interest') && !t.isMatched)
      .reduce((sum, t) => sum + t.amount, 0);

    const bookWithdrawals = this.reconciliationData.bookTransactions
      .filter(t => (t.transactionType === 'withdrawal' || t.transactionType === 'charges') && !t.isMatched)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalStatementDeposits: statementDeposits,
      totalStatementWithdrawals: statementWithdrawals,
      totalBookDeposits: bookDeposits,
      totalBookWithdrawals: bookWithdrawals,
      matchedDeposits: 0,
      matchedWithdrawals: 0,
      unmatchedStatementAmount: statementDeposits - statementWithdrawals,
      unmatchedBookAmount: bookDeposits - bookWithdrawals,
      variance: this.reconciliationData.variance,
      reconciliationStatus: this.reconciliationData.isReconciled ? 'reconciled' : 
        (this.reconciliationData.variance === 0 ? 'pending' : 'variance')
    };
  }

  /**
   * Get unmatched statement items
   */
  getUnmatchedStatementItems(): ReconciliationTransaction[] {
    return this.reconciliationData.statementTransactions.filter(t => !t.isMatched);
  }

  /**
   * Get unmatched book items
   */
  getUnmatchedBookItems(): BookTransaction[] {
    return this.reconciliationData.bookTransactions.filter(t => !t.isMatched);
  }

  /**
   * Open match modal
   */
  openMatchModal(statementTx?: ReconciliationTransaction | null, bookTx?: BookTransaction | null): void {
    this.selectedStatementTransaction = statementTx || null;
    this.selectedBookTransaction = bookTx || null;
    this.showMatchModal = true;
  }

  /**
   * Close match modal
   */
  closeMatchModal(): void {
    this.showMatchModal = false;
    this.selectedStatementTransaction = null;
    this.selectedBookTransaction = null;
  }

  /**
   * Get matchable book transactions
   */
  getMatchableBookTransactions(statementTx: ReconciliationTransaction): BookTransaction[] {
    return this.reconciliationData.bookTransactions.filter(bookTx => 
      !bookTx.isMatched &&
      Math.abs(bookTx.amount - statementTx.amount) <= (statementTx.amount * this.autoMatchAmountTolerance / 100) &&
      Math.abs((bookTx.transactionDate.getTime() - statementTx.transactionDate.getTime()) / (1000 * 60 * 60 * 24)) <= this.autoMatchTolerance
    );
  }

  /**
   * Get matchable statement transactions
   */
  getMatchableStatementTransactions(bookTx: BookTransaction): ReconciliationTransaction[] {
    return this.reconciliationData.statementTransactions.filter(stmtTx => 
      !stmtTx.isMatched &&
      Math.abs(stmtTx.amount - bookTx.amount) <= (bookTx.amount * this.autoMatchAmountTolerance / 100) &&
      Math.abs((stmtTx.transactionDate.getTime() - bookTx.transactionDate.getTime()) / (1000 * 60 * 60 * 24)) <= this.autoMatchTolerance
    );
  }

  /**
   * Select book transaction for match
   */
  selectBookTransactionForMatch(bookTx: BookTransaction): void {
    this.selectedBookTransaction = bookTx;
  }

  /**
   * Select statement transaction for match
   */
  selectStatementTransactionForMatch(stmtTx: ReconciliationTransaction): void {
    this.selectedStatementTransaction = stmtTx;
  }

  /**
   * Check if can confirm match
   */
  canConfirmMatch(): boolean {
    return !!(this.selectedStatementTransaction && this.selectedBookTransaction);
  }

  /**
   * Confirm match
   */
  confirmMatch(): void {
    if (!this.selectedStatementTransaction || !this.selectedBookTransaction) return;

    // Mark as matched
    this.selectedStatementTransaction.isMatched = true;
    this.selectedStatementTransaction.matchedWith = this.selectedBookTransaction.id;
    this.selectedBookTransaction.isMatched = true;
    this.selectedBookTransaction.matchedWith = this.selectedStatementTransaction.id;

    // Recalculate
    this.calculateReconciliation();
    this.summary = this.calculateSummary();

    // Close modal
    this.closeMatchModal();
  }

  /**
   * Auto match transactions
   */
  autoMatchTransactions(): void {
    let matchedCount = 0;

    this.reconciliationData.statementTransactions.forEach(stmtTx => {
      if (stmtTx.isMatched) return;

      const matchable = this.getMatchableBookTransactions(stmtTx);
      if (matchable.length === 1) {
        // Exact match found
        const bookTx = matchable[0];
        stmtTx.isMatched = true;
        stmtTx.matchedWith = bookTx.id;
        bookTx.isMatched = true;
        bookTx.matchedWith = stmtTx.id;
        matchedCount++;
      }
    });

    this.calculateReconciliation();
    this.summary = this.calculateSummary();

    if (matchedCount > 0) {
      alert(`Auto-matched ${matchedCount} transaction(s)`);
    } else {
      alert('No transactions could be auto-matched');
    }
  }

  /**
   * Reconcile account
   */
  reconcileAccount(): void {
    if (this.reconciliationData.variance !== 0) {
      alert('Cannot reconcile: Variance exists. Please match all transactions first.');
      return;
    }

    this.reconciliationData.isReconciled = true;
    this.reconciliationData.reconciledDate = new Date();
    this.reconciliationData.reconciledBy = 'Current User'; // In real app, get from auth

    // Mark all matched transactions as reconciled
    this.reconciliationData.statementTransactions.forEach(t => {
      if (t.isMatched) {
        t.isReconciled = true;
        t.reconciledDate = new Date();
      }
    });

    this.reconciliationData.bookTransactions.forEach(t => {
      if (t.isMatched) {
        t.isReconciled = true;
      }
    });

    alert('Account reconciled successfully!');
  }

  /**
   * Reset reconciliation
   */
  resetReconciliation(): void {
    if (confirm('Are you sure you want to reset all matching? This cannot be undone.')) {
      this.reconciliationData.statementTransactions.forEach(t => {
        t.isMatched = false;
        t.matchedWith = undefined;
        t.isReconciled = false;
      });

      this.reconciliationData.bookTransactions.forEach(t => {
        t.isMatched = false;
        t.matchedWith = undefined;
        t.isReconciled = false;
      });

      this.calculateReconciliation();
      this.summary = this.calculateSummary();
    }
  }

  /**
   * View transaction details
   */
  viewTransaction(statementTx?: ReconciliationTransaction | null, bookTx?: BookTransaction | null): void {
    // In real app, show detailed transaction view
    console.log('View transaction:', statementTx || bookTx);
  }

  /**
   * Export reconciliation
   */
  exportReconciliation(): void {
    console.log('Export reconciliation');
    alert('Reconciliation export functionality will be implemented');
  }

  /**
   * Print reconciliation
   */
  printReconciliation(): void {
    window.print();
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    localStorage.setItem('reconciliation_settings', JSON.stringify({
      autoMatchTolerance: this.autoMatchTolerance,
      autoMatchAmountTolerance: this.autoMatchAmountTolerance
    }));
    this.showSettings = false;
    alert('Settings saved successfully!');
  }

  /**
   * Get transaction type label
   */
  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'deposit': 'Deposit',
      'withdrawal': 'Withdrawal',
      'interest': 'Interest',
      'charges': 'Charges',
      'transfer': 'Transfer',
      'other': 'Other'
    };
    return labels[type] || type;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}



