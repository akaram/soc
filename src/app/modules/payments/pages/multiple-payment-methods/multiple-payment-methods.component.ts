import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Multiple Payment Methods Component
 * Handles payments via mada, VISA, Mastercard, Apple Pay, Google Pay, SADAD, UPI, Net Banking
 */
interface PaymentMethod {
  id: string;
  name: string;
  type: 'mada' | 'visa' | 'mastercard' | 'apple_pay' | 'google_pay' | 'sadad' | 'upi' | 'net_banking';
  icon: string;
  isEnabled: boolean;
  processingFee: number; // Percentage
  minAmount?: number;
  maxAmount?: number;
  supportedCurrencies: string[];
  requiresAuth: boolean;
  isActive: boolean;
  createdAt: Date;
}

interface PaymentTransaction {
  id: string;
  transactionNumber: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodType: string;
  amount: number;
  currency: string;
  processingFee: number;
  totalAmount: number;
  residentId?: string;
  residentName?: string;
  flatNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  cardLast4?: string;
  cardType?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  failureReason?: string;
  paymentDate: Date;
  completedDate?: Date;
  refundedDate?: Date;
  refundAmount?: number;
  notes?: string;
  createdAt: Date;
}

interface PaymentGateway {
  id: string;
  name: string;
  provider: string;
  apiKey?: string;
  secretKey?: string;
  merchantId?: string;
  isActive: boolean;
  supportedMethods: string[];
  createdAt: Date;
}

@Component({
  selector: 'app-multiple-payment-methods',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="payment-methods-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">payment</i>
            Multiple Payment Methods
          </h1>
          <p>Accept payments via mada, VISA, Mastercard, Apple Pay, Google Pay, SADAD, UPI, Net Banking</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showGateways = true" title="Payment Gateways">
            <i class="material-icons">settings</i>
            Gateways
          </button>
          <button class="icon-btn primary" (click)="showProcessPayment = true" title="Process Payment">
            <i class="material-icons">add</i>
            Process Payment
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">credit_card</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ enabledMethodsCount }}</div>
            <div class="stat-label">Enabled Methods</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ transactions.length }}</div>
            <div class="stat-label">Total Transactions</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ completedTransactionsCount }}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
      </div>

      <!-- Payment Methods Grid -->
      <div class="methods-section">
        <h2 class="section-title">
          <i class="material-icons">payment</i>
          Available Payment Methods
        </h2>
        <div class="methods-grid">
          <div *ngFor="let method of paymentMethods" class="method-card" [class.disabled]="!method.isEnabled">
            <div class="method-header">
              <div class="method-icon" [ngClass]="method.type">
                <i class="material-icons">{{ method.icon }}</i>
              </div>
              <div class="method-status">
                <span class="status-badge" [ngClass]="method.isEnabled ? 'enabled' : 'disabled'">
                  {{ method.isEnabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
            <div class="method-content">
              <h3>{{ method.name }}</h3>
              <div class="method-details">
                <div class="detail-item">
                  <span>Processing Fee:</span>
                  <strong>{{ method.processingFee }}%</strong>
                </div>
                <div class="detail-item" *ngIf="method.minAmount">
                  <span>Min Amount:</span>
                  <strong>{{ formatCurrency(method.minAmount) }}</strong>
                </div>
                <div class="detail-item" *ngIf="method.maxAmount">
                  <span>Max Amount:</span>
                  <strong>{{ formatCurrency(method.maxAmount) }}</strong>
                </div>
                <div class="detail-item">
                  <span>Auth Required:</span>
                  <strong>{{ method.requiresAuth ? 'Yes' : 'No' }}</strong>
                </div>
              </div>
            </div>
            <div class="method-actions">
              <button class="action-btn toggle" (click)="toggleMethod(method)" [title]="method.isEnabled ? 'Disable' : 'Enable'">
                <i class="material-icons">{{ method.isEnabled ? 'toggle_on' : 'toggle_off' }}</i>
                {{ method.isEnabled ? 'Disable' : 'Enable' }}
              </button>
              <button class="action-btn configure" (click)="configureMethod(method)" title="Configure">
                <i class="material-icons">settings</i>
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Transactions Section -->
      <div class="transactions-section">
        <div class="section-header">
          <h2 class="section-title">
            <i class="material-icons">history</i>
            Recent Transactions
          </h2>
          <div class="filters-section">
            <div class="search-box">
              <i class="material-icons">search</i>
              <input 
                type="text" 
                placeholder="Search by transaction number, resident..." 
                [(ngModel)]="searchQuery"
                (input)="filterTransactions()"
              />
            </div>
            <select [(ngModel)]="methodFilter" (change)="filterTransactions()" class="filter-select">
              <option value="all">All Methods</option>
              <option *ngFor="let method of paymentMethods" [value]="method.type">
                {{ method.name }}
              </option>
            </select>
            <select [(ngModel)]="statusFilter" (change)="filterTransactions()" class="filter-select">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <!-- Transactions Table -->
        <div class="transactions-table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Transaction #</th>
                <th>Payment Method</th>
                <th>Resident</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let transaction of filteredTransactions">
                <td>
                  <strong>{{ transaction.transactionNumber }}</strong>
                </td>
                <td>
                  <div class="method-info">
                    <span class="method-badge" [ngClass]="transaction.paymentMethodType">
                      {{ transaction.paymentMethodName }}
                    </span>
                    <div class="method-details-small" *ngIf="transaction.cardLast4">
                      ****{{ transaction.cardLast4 }} ({{ transaction.cardType }})
                    </div>
                    <div class="method-details-small" *ngIf="transaction.upiId">
                      {{ transaction.upiId }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="resident-info" *ngIf="transaction.residentName">
                    <div class="resident-name">{{ transaction.residentName }}</div>
                    <div class="resident-flat" *ngIf="transaction.flatNumber">{{ transaction.flatNumber }}</div>
                  </div>
                  <span *ngIf="!transaction.residentName">-</span>
                </td>
                <td>{{ formatCurrency(transaction.amount) }}</td>
                <td>{{ formatCurrency(transaction.processingFee) }}</td>
                <td class="total-amount">{{ formatCurrency(transaction.totalAmount) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="transaction.status">
                    {{ getStatusLabel(transaction.status) }}
                  </span>
                </td>
                <td>{{ formatDate(transaction.paymentDate) }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewTransaction(transaction)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn refund" (click)="refundTransaction(transaction)" title="Refund" *ngIf="transaction.status === 'completed'">
                      <i class="material-icons">undo</i>
                    </button>
                    <button class="action-btn retry" (click)="retryTransaction(transaction)" title="Retry" *ngIf="transaction.status === 'failed'">
                      <i class="material-icons">refresh</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredTransactions.length === 0">
            <i class="material-icons">receipt</i>
            <p>No transactions found</p>
          </div>
        </div>
      </div>

      <!-- Process Payment Modal -->
      <div class="modal-overlay" *ngIf="showProcessPayment" (click)="showProcessPayment = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Process Payment</h2>
            <button class="close-btn" (click)="showProcessPayment = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Select Payment Method <span class="required">*</span></label>
                  <select [(ngModel)]="newTransaction.paymentMethodId" (change)="onPaymentMethodChange()" required>
                    <option value="">Select Method</option>
                    <option *ngFor="let method of enabledMethods" [value]="method.id">
                      {{ method.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Amount <span class="required">*</span></label>
                  <input 
                    type="number" 
                    [(ngModel)]="newTransaction.amount" 
                    (input)="calculateTotal()"
                    min="0" 
                    step="0.01" 
                    placeholder="0.00" 
                    required 
                  />
                </div>
                <div class="form-group">
                  <label>Currency</label>
                  <select [(ngModel)]="newTransaction.currency" (change)="calculateTotal()">
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              <!-- Payment Method Specific Fields -->
              <div class="payment-fields" *ngIf="selectedPaymentMethod">
                <!-- Card Payment Fields (VISA, Mastercard, mada) -->
                <div *ngIf="['visa', 'mastercard', 'mada'].includes(selectedPaymentMethod.type)" class="card-fields">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Card Number <span class="required">*</span></label>
                      <input 
                        type="text" 
                        [(ngModel)]="cardNumber" 
                        (input)="formatCardNumber()"
                        placeholder="1234 5678 9012 3456" 
                        maxlength="19"
                        required 
                      />
                    </div>
                    <div class="form-group">
                      <label>Cardholder Name <span class="required">*</span></label>
                      <input type="text" [(ngModel)]="cardholderName" placeholder="John Doe" required />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Expiry Date <span class="required">*</span></label>
                      <input type="month" [(ngModel)]="expiryDate" required />
                    </div>
                    <div class="form-group">
                      <label>CVV <span class="required">*</span></label>
                      <input type="text" [(ngModel)]="cvv" placeholder="123" maxlength="4" required />
                    </div>
                  </div>
                </div>

                <!-- UPI Fields -->
                <div *ngIf="selectedPaymentMethod.type === 'upi'" class="upi-fields">
                  <div class="form-group">
                    <label>UPI ID <span class="required">*</span></label>
                    <input type="text" [(ngModel)]="newTransaction.upiId" placeholder="user@upi" required />
                  </div>
                </div>

                <!-- Net Banking Fields -->
                <div *ngIf="selectedPaymentMethod.type === 'net_banking'" class="net-banking-fields">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Bank Name <span class="required">*</span></label>
                      <select [(ngModel)]="newTransaction.bankName" required>
                        <option value="">Select Bank</option>
                        <option value="SBI">State Bank of India</option>
                        <option value="HDFC">HDFC Bank</option>
                        <option value="ICICI">ICICI Bank</option>
                        <option value="Axis">Axis Bank</option>
                        <option value="PNB">Punjab National Bank</option>
                        <option value="BOI">Bank of India</option>
                        <option value="BOB">Bank of Baroda</option>
                        <option value="Canara">Canara Bank</option>
                        <option value="Union">Union Bank</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Account Number <span class="required">*</span></label>
                      <input type="text" [(ngModel)]="newTransaction.accountNumber" placeholder="Account number" required />
                    </div>
                  </div>
                </div>

                <!-- SADAD Fields -->
                <div *ngIf="selectedPaymentMethod.type === 'sadad'" class="sadad-fields">
                  <div class="form-group">
                    <label>Bill Number <span class="required">*</span></label>
                    <input type="text" [(ngModel)]="sadadBillNumber" placeholder="Bill number" required />
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Resident/Flat (Optional)</label>
                  <input type="text" [(ngModel)]="newTransaction.flatNumber" placeholder="e.g., A-101" />
                </div>
                <div class="form-group">
                  <label>Invoice/Bill Number (Optional)</label>
                  <input type="text" [(ngModel)]="invoiceBillNumber" placeholder="Invoice or Bill number" />
                </div>
              </div>

              <!-- Calculation Preview -->
              <div class="calculation-preview" *ngIf="newTransaction.amount && selectedPaymentMethod">
                <h3>Payment Summary</h3>
                <div class="calc-details">
                  <div class="calc-row">
                    <span>Amount:</span>
                    <strong>{{ formatCurrency(newTransaction.amount || 0) }}</strong>
                  </div>
                  <div class="calc-row">
                    <span>Processing Fee ({{ selectedPaymentMethod.processingFee }}%):</span>
                    <strong>{{ formatCurrency(processingFeeAmount) }}</strong>
                  </div>
                  <div class="calc-row total">
                    <span>Total Amount:</span>
                    <strong>{{ formatCurrency(newTransaction.totalAmount || 0) }}</strong>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea [(ngModel)]="newTransaction.notes" placeholder="Additional notes" rows="3"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showProcessPayment = false">Cancel</button>
            <button class="btn btn-primary" (click)="processPayment()" [disabled]="!isPaymentValid()">
              <i class="material-icons">payment</i>
              Process Payment
            </button>
          </div>
        </div>
      </div>

      <!-- Configure Method Modal -->
      <div class="modal-overlay" *ngIf="showConfigureMethod && configuringMethod" (click)="showConfigureMethod = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Configure {{ configuringMethod.name }}</h2>
            <button class="close-btn" (click)="showConfigureMethod = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="config-section">
                <h3>Basic Settings</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Method Name</label>
                    <input type="text" [(ngModel)]="configuringMethod.name" readonly />
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <div class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="configuringMethod.isEnabled" id="methodEnabled" />
                      <label for="methodEnabled"></label>
                      <span class="toggle-label">{{ configuringMethod.isEnabled ? 'Enabled' : 'Disabled' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="config-section">
                <h3>Fee & Limits</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Processing Fee (%) <span class="required">*</span></label>
                    <input 
                      type="number" 
                      [(ngModel)]="configuringMethod.processingFee" 
                      min="0" 
                      max="100" 
                      step="0.01" 
                      placeholder="0.00" 
                      required 
                    />
                  </div>
                  <div class="form-group">
                    <label>Minimum Amount</label>
                    <input 
                      type="number" 
                      [(ngModel)]="configuringMethod.minAmount" 
                      min="0" 
                      step="0.01" 
                      placeholder="No minimum" 
                    />
                  </div>
                  <div class="form-group">
                    <label>Maximum Amount</label>
                    <input 
                      type="number" 
                      [(ngModel)]="configuringMethod.maxAmount" 
                      min="0" 
                      step="0.01" 
                      placeholder="No maximum" 
                    />
                  </div>
                </div>
              </div>

              <div class="config-section">
                <h3>Supported Currencies</h3>
                <div class="currencies-list">
                  <label *ngFor="let currency of availableCurrencies" class="currency-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="configuringMethod.supportedCurrencies.includes(currency)"
                      (change)="toggleCurrency(currency, $event)"
                    />
                    <span>{{ currency }}</span>
                  </label>
                </div>
              </div>

              <div class="config-section">
                <h3>Security Settings</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Requires Authentication</label>
                    <div class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="configuringMethod.requiresAuth" id="requiresAuth" />
                      <label for="requiresAuth"></label>
                      <span class="toggle-label">{{ configuringMethod.requiresAuth ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="config-section" *ngIf="getGatewayForMethod(configuringMethod.type)">
                <h3>Payment Gateway Configuration</h3>
                <div class="gateway-info">
                  <div class="info-item">
                    <span class="label">Gateway:</span>
                    <span class="value">{{ getGatewayForMethod(configuringMethod.type)?.name }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Provider:</span>
                    <span class="value">{{ getGatewayForMethod(configuringMethod.type)?.provider }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Status:</span>
                    <span class="value status-badge" [ngClass]="getGatewayForMethod(configuringMethod.type)?.isActive ? 'active' : 'inactive'">
                      {{ getGatewayForMethod(configuringMethod.type)?.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Merchant ID</label>
                    <input 
                      type="text" 
                      [value]="getGatewayForMethod(configuringMethod.type)?.merchantId || 'MERCHANT_' + configuringMethod.type.toUpperCase()" 
                      readonly 
                    />
                  </div>
                  <div class="form-group">
                    <label>API Key (Masked)</label>
                    <input 
                      type="password" 
                      value="••••••••••••••••" 
                      readonly 
                    />
                  </div>
                </div>
              </div>

              <div class="config-section">
                <h3>Method Statistics</h3>
                <div class="stats-grid-small">
                  <div class="stat-item">
                    <span class="stat-label">Total Transactions:</span>
                    <span class="stat-value">{{ getMethodTransactionCount(configuringMethod.id) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Total Amount:</span>
                    <span class="stat-value">{{ formatCurrency(getMethodTotalAmount(configuringMethod.id)) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Success Rate:</span>
                    <span class="stat-value">{{ getMethodSuccessRate(configuringMethod.id) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showConfigureMethod = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveMethodConfiguration()">
              <i class="material-icons">save</i>
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction Details Modal -->
      <div class="modal-overlay" *ngIf="selectedTransaction" (click)="selectedTransaction = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Transaction Details - {{ selectedTransaction.transactionNumber }}</h2>
            <button class="close-btn" (click)="selectedTransaction = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedTransaction">
            <div class="transaction-details">
              <div class="detail-section">
                <h3>Payment Information</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Payment Method:</span>
                    <span class="value">{{ selectedTransaction.paymentMethodName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Amount:</span>
                    <span class="value">{{ formatCurrency(selectedTransaction.amount) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Processing Fee:</span>
                    <span class="value">{{ formatCurrency(selectedTransaction.processingFee) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Total Amount:</span>
                    <span class="value total">{{ formatCurrency(selectedTransaction.totalAmount) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Status:</span>
                    <span class="value status-badge" [ngClass]="selectedTransaction.status">
                      {{ getStatusLabel(selectedTransaction.status) }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Transaction ID:</span>
                    <span class="value transaction-id">{{ selectedTransaction.transactionId }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section" *ngIf="selectedTransaction.residentName">
                <h3>Resident Information</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Name:</span>
                    <span class="value">{{ selectedTransaction.residentName }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedTransaction.flatNumber">
                    <span class="label">Flat Number:</span>
                    <span class="value">{{ selectedTransaction.flatNumber }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section" *ngIf="selectedTransaction.failureReason">
                <h3>Failure Reason</h3>
                <p class="failure-reason">{{ selectedTransaction.failureReason }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedTransaction = null">Close</button>
            <button class="btn btn-warning" (click)="refundTransaction(selectedTransaction!)" *ngIf="selectedTransaction?.status === 'completed'">
              <i class="material-icons">undo</i>
              Refund
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-methods-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
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

    .icon-btn.primary {
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

    /* Statistics */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Methods Section */
    .methods-section {
      padding: 24px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 20px 0;
    }

    .methods-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .method-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .method-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .method-card.disabled {
      opacity: 0.7;
    }

    .method-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .method-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }

    .method-icon.mada { background: linear-gradient(135deg, #00a859 0%, #008a4a 100%); }
    .method-icon.visa { background: linear-gradient(135deg, #1434cb 0%, #0f2a9e 100%); }
    .method-icon.mastercard { background: linear-gradient(135deg, #eb001b 0%, #c41e3a 100%); }
    .method-icon.apple_pay { background: linear-gradient(135deg, #000000 0%, #333333 100%); }
    .method-icon.google_pay { background: linear-gradient(135deg, #4285f4 0%, #357ae8 100%); }
    .method-icon.sadad { background: linear-gradient(135deg, #00a859 0%, #008a4a 100%); }
    .method-icon.upi { background: linear-gradient(135deg, #6c5ce7 0%, #5a4fcf 100%); }
    .method-icon.net_banking { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.enabled { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.disabled { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.processing { background: #e7f3ff; color: #2980b9; }
    .status-badge.completed { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.failed { background: #ffeaea; color: #c0392b; }
    .status-badge.refunded { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.cancelled { background: #f5f7fa; color: #95a5a6; }

    .method-content h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .method-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #2c3e50;
    }

    .method-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .action-btn.toggle { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.configure { background: #e7f3ff; color: #2980b9; }
    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.refund { background: #fff4e6; color: #e67e22; }
    .action-btn.retry { background: #e8f8f0; color: #1e9e5a; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* Transactions Section */
    .transactions-section {
      padding: 24px;
    }

    .section-header {
      margin-bottom: 20px;
    }

    .filters-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .search-box {
      flex: 1;
      min-width: 300px;
      position: relative;
      display: flex;
      align-items: center;
      background: white;
      border-radius: 24px;
      padding: 8px 16px;
      border: 2px solid #e9ecef;
    }

    .search-box i {
      color: #95a5a6;
      margin-right: 8px;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      color: #2c3e50;
    }

    .filter-select {
      padding: 8px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      outline: none;
      min-width: 150px;
    }

    .transactions-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .transactions-table {
      width: 100%;
    }

    .transactions-table thead {
      background: #f8f9fa;
    }

    .transactions-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .transactions-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .method-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .method-badge.mada { background: #e8f8f0; color: #1e9e5a; }
    .method-badge.visa { background: #e7f3ff; color: #2980b9; }
    .method-badge.mastercard { background: #ffeaea; color: #c0392b; }
    .method-badge.apple_pay { background: #f5f7fa; color: #2c3e50; }
    .method-badge.google_pay { background: #e7f3ff; color: #2980b9; }
    .method-badge.sadad { background: #e8f8f0; color: #1e9e5a; }
    .method-badge.upi { background: #f4e7ff; color: #8e44ad; }
    .method-badge.net_banking { background: #e7f3ff; color: #2980b9; }

    .method-details-small {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .resident-info {
      display: flex;
      flex-direction: column;
    }

    .resident-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .resident-flat {
      font-size: 12px;
      color: #7f8c8d;
    }

    .total-amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-buttons .action-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      flex: none;
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
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .required {
      color: #e74c3c;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #3498db;
    }

    .payment-fields {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .calculation-preview {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 16px;
    }

    .calculation-preview h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .calc-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
    }

    .calc-row.total {
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
      margin-top: 8px;
      font-weight: 700;
      font-size: 18px;
    }

    .transaction-details {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .detail-item .value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .detail-item .value.total {
      font-weight: 700;
      font-size: 18px;
    }

    .transaction-id {
      font-family: monospace;
      font-size: 12px;
      color: #7f8c8d;
    }

    .failure-reason {
      padding: 12px;
      background: #ffeaea;
      border-radius: 8px;
      color: #c0392b;
      margin: 0;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
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
      background: #3498db;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2980b9;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .btn-warning {
      background: #f39c12;
      color: white;
    }

    .btn-warning:hover {
      background: #e67e22;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #95a5a6;
    }

    .empty-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    .config-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e9ecef;
    }

    .config-section:last-child {
      border-bottom: none;
    }

    .config-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toggle-switch input[type="checkbox"] {
      width: 48px;
      height: 24px;
      appearance: none;
      background: #ccc;
      border-radius: 24px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
    }

    .toggle-switch input[type="checkbox"]:checked {
      background: #3498db;
    }

    .toggle-switch input[type="checkbox"]::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
    }

    .toggle-switch input[type="checkbox"]:checked::before {
      transform: translateX(24px);
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .currencies-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .currency-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .currency-checkbox:hover {
      background: #e9ecef;
    }

    .currency-checkbox input[type="checkbox"] {
      cursor: pointer;
    }

    .gateway-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .info-item .label {
      font-size: 13px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .info-item .value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .status-badge.active {
      background: #e8f8f0;
      color: #1e9e5a;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.inactive {
      background: #f5f7fa;
      color: #7f8c8d;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .stats-grid-small {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-item .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .stat-item .stat-value {
      font-size: 18px;
      color: #2c3e50;
      font-weight: 700;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .methods-grid {
        grid-template-columns: 1fr;
      }

      .filters-section {
        flex-direction: column;
      }

      .transactions-table-container {
        overflow-x: auto;
      }

      .transactions-table {
        min-width: 1200px;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MultiplePaymentMethodsComponent implements OnInit, OnDestroy {
  paymentMethods: PaymentMethod[] = [];
  transactions: PaymentTransaction[] = [];
  filteredTransactions: PaymentTransaction[] = [];
  gateways: PaymentGateway[] = [];
  selectedPaymentMethod: PaymentMethod | null = null;
  selectedTransaction: PaymentTransaction | null = null;
  searchQuery: string = '';
  methodFilter: string = 'all';
  statusFilter: string = 'all';
  showProcessPayment: boolean = false;
  showGateways: boolean = false;
  showConfigureMethod: boolean = false;
  configuringMethod: PaymentMethod | null = null;
  availableCurrencies: string[] = ['SAR', 'USD', 'EUR', 'INR', 'GBP', 'AED'];
  cardNumber: string = '';
  cardholderName: string = '';
  expiryDate: string = '';
  cvv: string = '';
  sadadBillNumber: string = '';
  invoiceBillNumber: string = '';
  processingFeeAmount: number = 0;

  newTransaction: Partial<PaymentTransaction> = {
    amount: 0,
    currency: 'SAR',
    processingFee: 0,
    totalAmount: 0,
    status: 'pending'
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadPaymentMethods();
    this.loadTransactions();
    this.loadGateways();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load payment methods
   */
  loadPaymentMethods(): void {
    this.paymentMethods = [
      {
        id: 'method-1',
        name: 'mada',
        type: 'mada',
        icon: 'credit_card',
        isEnabled: true,
        processingFee: 1.5,
        minAmount: 10,
        maxAmount: 50000,
        supportedCurrencies: ['SAR'],
        requiresAuth: true,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-2',
        name: 'VISA',
        type: 'visa',
        icon: 'credit_card',
        isEnabled: true,
        processingFee: 2.0,
        minAmount: 10,
        maxAmount: 100000,
        supportedCurrencies: ['SAR', 'USD', 'EUR'],
        requiresAuth: true,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-3',
        name: 'Mastercard',
        type: 'mastercard',
        icon: 'credit_card',
        isEnabled: true,
        processingFee: 2.0,
        minAmount: 10,
        maxAmount: 100000,
        supportedCurrencies: ['SAR', 'USD', 'EUR'],
        requiresAuth: true,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-4',
        name: 'Apple Pay',
        type: 'apple_pay',
        icon: 'phone_iphone',
        isEnabled: true,
        processingFee: 1.0,
        minAmount: 5,
        maxAmount: 50000,
        supportedCurrencies: ['SAR', 'USD', 'EUR'],
        requiresAuth: false,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-5',
        name: 'Google Pay',
        type: 'google_pay',
        icon: 'phone_android',
        isEnabled: true,
        processingFee: 1.0,
        minAmount: 5,
        maxAmount: 50000,
        supportedCurrencies: ['SAR', 'USD', 'EUR'],
        requiresAuth: false,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-6',
        name: 'SADAD',
        type: 'sadad',
        icon: 'account_balance',
        isEnabled: true,
        processingFee: 0.5,
        minAmount: 1,
        maxAmount: 100000,
        supportedCurrencies: ['SAR'],
        requiresAuth: false,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-7',
        name: 'UPI',
        type: 'upi',
        icon: 'account_balance_wallet',
        isEnabled: true,
        processingFee: 0.5,
        minAmount: 1,
        maxAmount: 100000,
        supportedCurrencies: ['INR'],
        requiresAuth: false,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'method-8',
        name: 'Net Banking',
        type: 'net_banking',
        icon: 'account_balance',
        isEnabled: true,
        processingFee: 1.0,
        minAmount: 100,
        maxAmount: 500000,
        supportedCurrencies: ['INR', 'SAR', 'USD'],
        requiresAuth: true,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      }
    ];
  }

  /**
   * Load transactions
   */
  loadTransactions(): void {
    this.transactions = [
      {
        id: 'txn-1',
        transactionNumber: 'TXN-2024-001',
        paymentMethodId: 'method-1',
        paymentMethodName: 'mada',
        paymentMethodType: 'mada',
        amount: 5000,
        currency: 'SAR',
        processingFee: 75,
        totalAmount: 5075,
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        cardLast4: '1234',
        cardType: 'mada',
        transactionId: 'TXN123456789',
        status: 'completed',
        paymentDate: new Date(2024, 1, 1),
        completedDate: new Date(2024, 1, 1),
        createdAt: new Date(2024, 1, 1)
      },
      {
        id: 'txn-2',
        transactionNumber: 'TXN-2024-002',
        paymentMethodId: 'method-7',
        paymentMethodName: 'UPI',
        paymentMethodType: 'upi',
        amount: 3000,
        currency: 'INR',
        processingFee: 15,
        totalAmount: 3015,
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        upiId: 'priya@paytm',
        transactionId: 'UPI987654321',
        status: 'completed',
        paymentDate: new Date(2024, 1, 2),
        completedDate: new Date(2024, 1, 2),
        createdAt: new Date(2024, 1, 2)
      }
    ];
    this.filterTransactions();
  }

  /**
   * Load gateways
   */
  loadGateways(): void {
    this.gateways = [
      {
        id: 'gateway-1',
        name: 'Payment Gateway 1',
        provider: 'Provider A',
        isActive: true,
        supportedMethods: ['mada', 'visa', 'mastercard', 'apple_pay', 'google_pay'],
        createdAt: new Date(2024, 0, 1)
      }
    ];
  }

  /**
   * Filter transactions
   */
  filterTransactions(): void {
    let filtered = [...this.transactions];

    if (this.methodFilter !== 'all') {
      filtered = filtered.filter(t => t.paymentMethodType === this.methodFilter);
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === this.statusFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.transactionNumber.toLowerCase().includes(query) ||
        (t.residentName && t.residentName.toLowerCase().includes(query)) ||
        (t.transactionId && t.transactionId.toLowerCase().includes(query))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

    this.filteredTransactions = filtered;
  }

  /**
   * Get enabled methods count
   */
  get enabledMethodsCount(): number {
    return this.paymentMethods.filter(m => m.isEnabled).length;
  }

  /**
   * Get enabled methods
   */
  get enabledMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(m => m.isEnabled);
  }

  /**
   * Get completed transactions count
   */
  get completedTransactionsCount(): number {
    return this.transactions.filter(t => t.status === 'completed').length;
  }

  /**
   * Get total amount
   */
  get totalAmount(): number {
    return this.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }

  /**
   * Toggle method
   */
  toggleMethod(method: PaymentMethod): void {
    method.isEnabled = !method.isEnabled;
    alert(`Payment method ${method.isEnabled ? 'enabled' : 'disabled'} successfully!`);
  }

  /**
   * Configure method
   */
  configureMethod(method: PaymentMethod): void {
    this.configuringMethod = { ...method };
    this.showConfigureMethod = true;
  }

  /**
   * Toggle currency
   */
  toggleCurrency(currency: string, event: Event): void {
    if (!this.configuringMethod) return;
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.configuringMethod.supportedCurrencies.includes(currency)) {
        this.configuringMethod.supportedCurrencies.push(currency);
      }
    } else {
      this.configuringMethod.supportedCurrencies = this.configuringMethod.supportedCurrencies.filter(c => c !== currency);
    }
  }

  /**
   * Get gateway for method
   */
  getGatewayForMethod(methodType: string): PaymentGateway | null {
    return this.gateways.find(g => g.supportedMethods.includes(methodType)) || null;
  }

  /**
   * Get method transaction count
   */
  getMethodTransactionCount(methodId: string): number {
    return this.transactions.filter(t => t.paymentMethodId === methodId).length;
  }

  /**
   * Get method total amount
   */
  getMethodTotalAmount(methodId: string): number {
    return this.transactions
      .filter(t => t.paymentMethodId === methodId && t.status === 'completed')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }

  /**
   * Get method success rate
   */
  getMethodSuccessRate(methodId: string): number {
    const methodTransactions = this.transactions.filter(t => t.paymentMethodId === methodId);
    if (methodTransactions.length === 0) return 0;
    const completed = methodTransactions.filter(t => t.status === 'completed').length;
    return Math.round((completed / methodTransactions.length) * 100);
  }

  /**
   * Save method configuration
   */
  saveMethodConfiguration(): void {
    if (!this.configuringMethod) return;

    // Find and update the method
    const index = this.paymentMethods.findIndex(m => m.id === this.configuringMethod!.id);
    if (index > -1) {
      this.paymentMethods[index] = { ...this.configuringMethod };
      alert(`${this.configuringMethod.name} configuration saved successfully!`);
    }

    this.showConfigureMethod = false;
    this.configuringMethod = null;
  }

  /**
   * On payment method change
   */
  onPaymentMethodChange(): void {
    if (this.newTransaction.paymentMethodId) {
      this.selectedPaymentMethod = this.paymentMethods.find(m => m.id === this.newTransaction.paymentMethodId) || null;
      this.calculateTotal();
    } else {
      this.selectedPaymentMethod = null;
    }
  }

  /**
   * Calculate total
   */
  calculateTotal(): void {
    if (!this.selectedPaymentMethod || !this.newTransaction.amount) {
      this.processingFeeAmount = 0;
      this.newTransaction.processingFee = 0;
      this.newTransaction.totalAmount = this.newTransaction.amount || 0;
      return;
    }

    this.processingFeeAmount = (this.newTransaction.amount * this.selectedPaymentMethod.processingFee) / 100;
    this.newTransaction.processingFee = this.processingFeeAmount;
    this.newTransaction.totalAmount = this.newTransaction.amount + this.processingFeeAmount;
  }

  /**
   * Format card number
   */
  formatCardNumber(): void {
    // Remove all non-digits
    let value = this.cardNumber.replace(/\D/g, '');
    
    // Add spaces every 4 digits
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    this.cardNumber = value;
  }

  /**
   * Process payment
   */
  processPayment(): void {
    if (!this.isPaymentValid()) {
      return;
    }

    if (!this.selectedPaymentMethod) return;

    // Extract last 4 digits for card payments
    let cardLast4 = '';
    let cardType = '';
    if (['visa', 'mastercard', 'mada'].includes(this.selectedPaymentMethod.type)) {
      const digits = this.cardNumber.replace(/\D/g, '');
      cardLast4 = digits.slice(-4);
      cardType = this.selectedPaymentMethod.type;
    }

    const transaction: PaymentTransaction = {
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-${new Date().getFullYear()}-${String(this.transactions.length + 1).padStart(3, '0')}`,
      paymentMethodId: this.selectedPaymentMethod.id,
      paymentMethodName: this.selectedPaymentMethod.name,
      paymentMethodType: this.selectedPaymentMethod.type,
      amount: this.newTransaction.amount!,
      currency: this.newTransaction.currency || 'SAR',
      processingFee: this.newTransaction.processingFee!,
      totalAmount: this.newTransaction.totalAmount!,
      flatNumber: this.newTransaction.flatNumber,
      invoiceNumber: this.invoiceBillNumber || undefined,
      cardLast4: cardLast4 || undefined,
      cardType: cardType || undefined,
      upiId: this.newTransaction.upiId,
      bankName: this.newTransaction.bankName,
      accountNumber: this.newTransaction.accountNumber,
      transactionId: `TXN${Date.now()}`,
      status: 'processing',
      paymentDate: new Date(),
      notes: this.newTransaction.notes,
      createdAt: new Date()
    };

    this.transactions.unshift(transaction);
    
    // Simulate payment processing
    setTimeout(() => {
      transaction.status = 'completed';
      transaction.completedDate = new Date();
      this.filterTransactions();
    }, 2000);

    this.filterTransactions();
    this.resetNewTransaction();
    this.showProcessPayment = false;
    alert('Payment processing initiated!');
  }

  /**
   * Reset new transaction
   */
  resetNewTransaction(): void {
    this.newTransaction = {
      amount: 0,
      currency: 'SAR',
      processingFee: 0,
      totalAmount: 0,
      status: 'pending'
    };
    this.selectedPaymentMethod = null;
    this.cardNumber = '';
    this.cardholderName = '';
    this.expiryDate = '';
    this.cvv = '';
    this.sadadBillNumber = '';
    this.invoiceBillNumber = '';
    this.processingFeeAmount = 0;
  }

  /**
   * View transaction
   */
  viewTransaction(transaction: PaymentTransaction): void {
    this.selectedTransaction = transaction;
  }

  /**
   * Refund transaction
   */
  refundTransaction(transaction: PaymentTransaction): void {
    if (confirm(`Refund transaction ${transaction.transactionNumber}?`)) {
      transaction.status = 'refunded';
      transaction.refundedDate = new Date();
      transaction.refundAmount = transaction.totalAmount;
      this.filterTransactions();
      alert('Refund processed successfully!');
    }
  }

  /**
   * Retry transaction
   */
  retryTransaction(transaction: PaymentTransaction): void {
    if (confirm(`Retry failed transaction ${transaction.transactionNumber}?`)) {
      transaction.status = 'processing';
      setTimeout(() => {
        transaction.status = 'completed';
        transaction.completedDate = new Date();
        this.filterTransactions();
      }, 2000);
      this.filterTransactions();
      alert('Retrying transaction...');
    }
  }

  /**
   * Is payment valid
   */
  isPaymentValid(): boolean {
    if (!this.selectedPaymentMethod || !this.newTransaction.amount || this.newTransaction.amount <= 0) {
      return false;
    }

    // Check min/max amount
    if (this.selectedPaymentMethod.minAmount && this.newTransaction.amount < this.selectedPaymentMethod.minAmount) {
      return false;
    }
    if (this.selectedPaymentMethod.maxAmount && this.newTransaction.amount > this.selectedPaymentMethod.maxAmount) {
      return false;
    }

    // Card payment validation
    if (['visa', 'mastercard', 'mada'].includes(this.selectedPaymentMethod.type)) {
      if (!this.cardNumber || !this.cardholderName || !this.expiryDate || !this.cvv) {
        return false;
      }
    }

    // UPI validation
    if (this.selectedPaymentMethod.type === 'upi' && !this.newTransaction.upiId) {
      return false;
    }

    // Net banking validation
    if (this.selectedPaymentMethod.type === 'net_banking') {
      if (!this.newTransaction.bankName || !this.newTransaction.accountNumber) {
        return false;
      }
    }

    // SADAD validation
    if (this.selectedPaymentMethod.type === 'sadad' && !this.sadadBillNumber) {
      return false;
    }

    return true;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      refunded: 'Refunded',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

