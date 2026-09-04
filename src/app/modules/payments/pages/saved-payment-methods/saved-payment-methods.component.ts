import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Saved Payment Methods Component
 * Handles saved payment methods with tokenization for secure storage
 */
interface SavedPaymentMethod {
  id: string;
  token: string; // Tokenized payment method identifier
  methodType: 'card' | 'upi' | 'net_banking' | 'wallet';
  displayName: string;
  maskedValue: string; // e.g., ****1234 for cards, masked UPI ID
  cardType?: 'visa' | 'mastercard' | 'mada' | 'amex' | 'rupay';
  expiryDate?: string; // For cards: MM/YY
  upiId?: string; // Masked UPI ID
  bankName?: string;
  accountNumber?: string; // Masked account number
  isDefault: boolean;
  isActive: boolean;
  lastUsed?: Date;
  addedDate: Date;
  residentId?: string;
  residentName?: string;
  securityCode?: string; // CVV/CVC (encrypted, not displayed)
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface TokenizationConfig {
  provider: string;
  isEnabled: boolean;
  tokenFormat: string;
  encryptionLevel: string;
}

@Component({
  selector: 'app-saved-payment-methods',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="saved-methods-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">credit_card</i>
            Saved Payment Methods
          </h1>
          <p>Manage saved payment methods with secure tokenization</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showTokenizationConfig = true" title="Tokenization Settings">
            <i class="material-icons">security</i>
            Security
          </button>
          <button class="icon-btn primary" (click)="showAddMethod = true" title="Add Payment Method">
            <i class="material-icons">add</i>
            Add Method
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
            <div class="stat-value">{{ savedMethods.length }}</div>
            <div class="stat-label">Saved Methods</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeMethodsCount }}</div>
            <div class="stat-label">Active Methods</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">star</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ defaultMethodsCount }}</div>
            <div class="stat-label">Default Methods</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">lock</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ tokenizedCount }}</div>
            <div class="stat-label">Tokenized</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by name, card number, UPI ID..." 
            [(ngModel)]="searchQuery"
            (input)="filterMethods()"
          />
        </div>
        <select [(ngModel)]="typeFilter" (change)="filterMethods()" class="filter-select">
          <option value="all">All Types</option>
          <option value="card">Cards</option>
          <option value="upi">UPI</option>
          <option value="net_banking">Net Banking</option>
          <option value="wallet">Wallets</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="filterMethods()" class="filter-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <!-- Saved Methods Grid -->
      <div class="methods-grid">
        <div *ngFor="let method of filteredMethods" class="method-card" [class.inactive]="!method.isActive" [class.default]="method.isDefault">
          <div class="method-header">
            <div class="method-icon" [ngClass]="method.methodType">
              <i class="material-icons">{{ getMethodIcon(method.methodType) }}</i>
            </div>
            <div class="method-badges">
              <span class="badge default" *ngIf="method.isDefault">
                <i class="material-icons">star</i>
                Default
              </span>
              <span class="badge tokenized" *ngIf="method.token">
                <i class="material-icons">lock</i>
                Tokenized
              </span>
            </div>
          </div>
          <div class="method-content">
            <h3>{{ method.displayName }}</h3>
            <div class="method-details">
              <div class="detail-item">
                <i class="material-icons">credit_card</i>
                <span class="masked-value">{{ method.maskedValue }}</span>
              </div>
              <div class="detail-item" *ngIf="method.cardType">
                <i class="material-icons">payment</i>
                <span class="card-type">{{ getCardTypeLabel(method.cardType) }}</span>
              </div>
              <div class="detail-item" *ngIf="method.expiryDate">
                <i class="material-icons">calendar_today</i>
                <span>Expires: {{ method.expiryDate }}</span>
              </div>
              <div class="detail-item" *ngIf="method.bankName">
                <i class="material-icons">account_balance</i>
                <span>{{ method.bankName }}</span>
              </div>
              <div class="detail-item" *ngIf="method.lastUsed">
                <i class="material-icons">schedule</i>
                <span>Last used: {{ formatDate(method.lastUsed) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span *ngIf="method.residentName">{{ method.residentName }}</span>
                <span *ngIf="!method.residentName">General</span>
              </div>
            </div>
            <div class="token-info" *ngIf="method.token">
              <div class="token-display">
                <i class="material-icons">vpn_key</i>
                <span>Token: {{ method.token.substring(0, 8) }}...{{ method.token.substring(method.token.length - 4) }}</span>
              </div>
            </div>
          </div>
          <div class="method-actions">
            <button class="action-btn use" (click)="useMethod(method)" title="Use for Payment">
              <i class="material-icons">payment</i>
              Use
            </button>
            <button class="action-btn default" (click)="setAsDefault(method)" title="Set as Default" *ngIf="!method.isDefault">
              <i class="material-icons">star</i>
              Set Default
            </button>
            <button class="action-btn edit" (click)="editMethod(method)" title="Edit">
              <i class="material-icons">edit</i>
              Edit
            </button>
            <button class="action-btn toggle" (click)="toggleMethod(method)" [title]="method.isActive ? 'Deactivate' : 'Activate'">
              <i class="material-icons">{{ method.isActive ? 'pause' : 'play_arrow' }}</i>
              {{ method.isActive ? 'Deactivate' : 'Activate' }}
            </button>
            <button class="action-btn delete" (click)="deleteMethod(method)" title="Delete">
              <i class="material-icons">delete</i>
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="filteredMethods.length === 0">
        <i class="material-icons">credit_card</i>
        <p>No saved payment methods found</p>
        <span *ngIf="searchQuery">Try adjusting your search</span>
        <button class="btn btn-primary" (click)="showAddMethod = true" *ngIf="!searchQuery">
          <i class="material-icons">add</i>
          Add Payment Method
        </button>
      </div>

      <!-- Add/Edit Payment Method Modal -->
      <div class="modal-overlay" *ngIf="showAddMethod || editingMethod" (click)="closeMethodModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingMethod ? 'Edit Payment Method' : 'Add Payment Method' }}</h2>
            <button class="close-btn" (click)="closeMethodModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>Payment Method Type <span class="required">*</span></label>
                <select [(ngModel)]="newMethod.methodType" (change)="onMethodTypeChange()" required>
                  <option value="">Select Type</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI</option>
                  <option value="net_banking">Net Banking</option>
                  <option value="wallet">Digital Wallet</option>
                </select>
              </div>

              <div class="form-group">
                <label>Display Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newMethod.displayName" placeholder="e.g., My Primary Card" required />
              </div>

              <!-- Card Fields -->
              <div *ngIf="newMethod.methodType === 'card'" class="card-fields">
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
                    <label>Card Type</label>
                    <select [(ngModel)]="newMethod.cardType">
                      <option value="">Auto-detect</option>
                      <option value="visa">VISA</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="mada">mada</option>
                      <option value="amex">American Express</option>
                      <option value="rupay">RuPay</option>
                    </select>
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
                <div class="form-group">
                  <label>Cardholder Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="cardholderName" placeholder="John Doe" required />
                </div>
              </div>

              <!-- UPI Fields -->
              <div *ngIf="newMethod.methodType === 'upi'" class="upi-fields">
                <div class="form-group">
                  <label>UPI ID <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newMethod.upiId" placeholder="user@upi" required />
                </div>
              </div>

              <!-- Net Banking Fields -->
              <div *ngIf="newMethod.methodType === 'net_banking'" class="net-banking-fields">
                <div class="form-row">
                  <div class="form-group">
                    <label>Bank Name <span class="required">*</span></label>
                    <select [(ngModel)]="newMethod.bankName" required>
                      <option value="">Select Bank</option>
                      <option value="SBI">State Bank of India</option>
                      <option value="HDFC">HDFC Bank</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="Axis">Axis Bank</option>
                      <option value="PNB">Punjab National Bank</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Account Number <span class="required">*</span></label>
                    <input type="text" [(ngModel)]="newMethod.accountNumber" placeholder="Account number" required />
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Resident (Optional)</label>
                  <input type="text" [(ngModel)]="newMethod.residentName" placeholder="Resident name" />
                </div>
                <div class="form-group">
                  <label>Set as Default</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newMethod.isDefault" id="isDefault" />
                    <label for="isDefault"></label>
                  </div>
                </div>
              </div>

              <!-- Billing Address (Optional) -->
              <div class="billing-address-section">
                <h4>Billing Address (Optional)</h4>
                <div class="form-group">
                  <label>Street Address</label>
                  <input type="text" [(ngModel)]="billingAddress.street" placeholder="Street address" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>City</label>
                    <input type="text" [(ngModel)]="billingAddress.city" placeholder="City" />
                  </div>
                  <div class="form-group">
                    <label>State</label>
                    <input type="text" [(ngModel)]="billingAddress.state" placeholder="State" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>ZIP Code</label>
                    <input type="text" [(ngModel)]="billingAddress.zipCode" placeholder="ZIP Code" />
                  </div>
                  <div class="form-group">
                    <label>Country</label>
                    <input type="text" [(ngModel)]="billingAddress.country" placeholder="Country" />
                  </div>
                </div>
              </div>

              <!-- Tokenization Info -->
              <div class="tokenization-info">
                <div class="info-box">
                  <i class="material-icons">security</i>
                  <div>
                    <strong>Secure Tokenization</strong>
                    <p>Your payment details will be securely tokenized and encrypted. The actual card/account numbers will never be stored.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeMethodModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveMethod()" [disabled]="!isMethodValid()">
              <i class="material-icons">save</i>
              {{ editingMethod ? 'Update' : 'Save' }} & Tokenize
            </button>
          </div>
        </div>
      </div>

      <!-- Tokenization Config Modal -->
      <div class="modal-overlay" *ngIf="showTokenizationConfig" (click)="showTokenizationConfig = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Tokenization Configuration</h2>
            <button class="close-btn" (click)="showTokenizationConfig = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="config-section">
              <h3>Tokenization Settings</h3>
              <div class="config-grid">
                <div class="config-item">
                  <span class="label">Provider:</span>
                  <span class="value">{{ tokenizationConfig.provider }}</span>
                </div>
                <div class="config-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="tokenizationConfig.isEnabled ? 'enabled' : 'disabled'">
                    {{ tokenizationConfig.isEnabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
                <div class="config-item">
                  <span class="label">Token Format:</span>
                  <span class="value">{{ tokenizationConfig.tokenFormat }}</span>
                </div>
                <div class="config-item">
                  <span class="label">Encryption Level:</span>
                  <span class="value">{{ tokenizationConfig.encryptionLevel }}</span>
                </div>
              </div>
            </div>

            <div class="config-section">
              <h3>Security Features</h3>
              <div class="features-list">
                <div class="feature-item">
                  <i class="material-icons">check_circle</i>
                  <span>PCI DSS Compliant</span>
                </div>
                <div class="feature-item">
                  <i class="material-icons">check_circle</i>
                  <span>AES-256 Encryption</span>
                </div>
                <div class="feature-item">
                  <i class="material-icons">check_circle</i>
                  <span>Token Vault Security</span>
                </div>
                <div class="feature-item">
                  <i class="material-icons">check_circle</i>
                  <span>No Card Data Storage</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showTokenizationConfig = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saved-methods-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
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
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
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

    /* Filters */
    .filters-section {
      padding: 0 24px 24px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
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

    /* Methods Grid */
    .methods-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
      padding: 0 24px 24px;
    }

    .method-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .method-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .method-card.default {
      border-color: #f39c12;
      background: linear-gradient(to bottom, #fff9e6 0%, white 20%);
    }

    .method-card.inactive {
      opacity: 0.7;
    }

    .method-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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

    .method-icon.card { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .method-icon.upi { background: linear-gradient(135deg, #6c5ce7 0%, #5a4fcf 100%); }
    .method-icon.net_banking { background: linear-gradient(135deg, #16a085 0%, #138d75 100%); }
    .method-icon.wallet { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }

    .method-badges {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .badge.default {
      background: #fff4e6;
      color: #e67e22;
    }

    .badge.tokenized {
      background: #e8f8f0;
      color: #1e9e5a;
    }

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
      margin-bottom: 12px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2c3e50;
    }

    .detail-item i {
      font-size: 18px;
      color: #9b59b6;
    }

    .masked-value {
      font-family: monospace;
      font-weight: 600;
      font-size: 14px;
    }

    .card-type {
      text-transform: uppercase;
      font-weight: 600;
      color: #7f8c8d;
    }

    .token-info {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .token-display {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #7f8c8d;
      font-family: monospace;
    }

    .method-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
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

    .action-btn.use { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.default { background: #fff4e6; color: #e67e22; }
    .action-btn.edit { background: #e7f3ff; color: #2980b9; }
    .action-btn.toggle { background: #f5f7fa; color: #7f8c8d; }
    .action-btn.delete { background: #ffeaea; color: #c0392b; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      grid-template-columns: repeat(2, 1fr);
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
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #9b59b6;
    }

    .card-fields,
    .upi-fields,
    .net-banking-fields {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .billing-address-section {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .billing-address-section h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
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
      background: #9b59b6;
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

    .tokenization-info {
      padding: 16px;
      background: #e8f8f0;
      border-radius: 8px;
      border: 1px solid #1e9e5a;
    }

    .info-box {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .info-box i {
      color: #1e9e5a;
      font-size: 24px;
    }

    .info-box strong {
      display: block;
      margin-bottom: 4px;
      color: #1e9e5a;
    }

    .info-box p {
      margin: 0;
      font-size: 13px;
      color: #2c3e50;
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

    .config-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .config-item .label {
      font-size: 13px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .config-item .value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .status-badge.enabled {
      background: #e8f8f0;
      color: #1e9e5a;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.disabled {
      background: #f5f7fa;
      color: #7f8c8d;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .feature-item i {
      color: #1e9e5a;
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
      background: #9b59b6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #8e44ad;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
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
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .empty-state span {
      font-size: 12px;
      display: block;
      margin-bottom: 16px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filters-section {
        flex-direction: column;
        padding: 0 16px 16px;
      }

      .methods-grid {
        grid-template-columns: 1fr;
        padding: 0 16px 16px;
      }
    }
  `]
})
export class SavedPaymentMethodsComponent implements OnInit, OnDestroy {
  savedMethods: SavedPaymentMethod[] = [];
  filteredMethods: SavedPaymentMethod[] = [];
  selectedMethod: SavedPaymentMethod | null = null;
  editingMethod: SavedPaymentMethod | null = null;
  searchQuery: string = '';
  typeFilter: string = 'all';
  statusFilter: string = 'all';
  showAddMethod: boolean = false;
  showTokenizationConfig: boolean = false;
  cardNumber: string = '';
  cardholderName: string = '';
  expiryDate: string = '';
  cvv: string = '';

  newMethod: Partial<SavedPaymentMethod> = {
    methodType: 'card',
    displayName: '',
    maskedValue: '',
    isDefault: false,
    isActive: true
  };

  billingAddress = {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  };

  tokenizationConfig: TokenizationConfig = {
    provider: 'Payment Gateway Tokenization',
    isEnabled: true,
    tokenFormat: 'UUID v4',
    encryptionLevel: 'AES-256'
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadSavedMethods();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load saved payment methods
   */
  loadSavedMethods(): void {
    this.savedMethods = [
      {
        id: 'method-1',
        token: 'tok_1234567890abcdef',
        methodType: 'card',
        displayName: 'My Primary Card',
        maskedValue: '****1234',
        cardType: 'visa',
        expiryDate: '12/25',
        isDefault: true,
        isActive: true,
        lastUsed: new Date(2024, 1, 1),
        addedDate: new Date(2024, 0, 1),
        residentId: 'res-1',
        residentName: 'Rajesh Kumar'
      },
      {
        id: 'method-2',
        token: 'tok_abcdef1234567890',
        methodType: 'upi',
        displayName: 'My UPI',
        maskedValue: 'raj***@paytm',
        upiId: 'rajesh@paytm',
        isDefault: false,
        isActive: true,
        lastUsed: new Date(2024, 1, 2),
        addedDate: new Date(2024, 0, 15),
        residentId: 'res-1',
        residentName: 'Rajesh Kumar'
      },
      {
        id: 'method-3',
        token: 'tok_9876543210fedcba',
        methodType: 'net_banking',
        displayName: 'HDFC Bank Account',
        maskedValue: '****5678',
        bankName: 'HDFC Bank',
        accountNumber: '1234567890',
        isDefault: false,
        isActive: true,
        addedDate: new Date(2024, 0, 20)
      }
    ];
    this.filterMethods();
  }

  /**
   * Filter methods
   */
  filterMethods(): void {
    let filtered = [...this.savedMethods];

    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(m => m.methodType === this.typeFilter);
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(m => 
        this.statusFilter === 'active' ? m.isActive : !m.isActive
      );
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.displayName.toLowerCase().includes(query) ||
        m.maskedValue.toLowerCase().includes(query) ||
        (m.upiId && m.upiId.toLowerCase().includes(query)) ||
        (m.residentName && m.residentName.toLowerCase().includes(query))
      );
    }

    // Sort: default first, then by last used
    filtered.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      if (a.lastUsed && b.lastUsed) {
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      }
      return 0;
    });

    this.filteredMethods = filtered;
  }

  /**
   * Get active methods count
   */
  get activeMethodsCount(): number {
    return this.savedMethods.filter(m => m.isActive).length;
  }

  /**
   * Get default methods count
   */
  get defaultMethodsCount(): number {
    return this.savedMethods.filter(m => m.isDefault).length;
  }

  /**
   * Get tokenized count
   */
  get tokenizedCount(): number {
    return this.savedMethods.filter(m => m.token).length;
  }

  /**
   * On method type change
   */
  onMethodTypeChange(): void {
    // Reset fields when type changes
    this.cardNumber = '';
    this.cardholderName = '';
    this.expiryDate = '';
    this.cvv = '';
    this.newMethod.upiId = '';
    this.newMethod.bankName = '';
    this.newMethod.accountNumber = '';
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
    
    // Auto-detect card type
    if (value.length >= 4) {
      const firstFour = value.substring(0, 4);
      if (firstFour.startsWith('4')) {
        this.newMethod.cardType = 'visa';
      } else if (firstFour.startsWith('5') || firstFour.startsWith('2')) {
        this.newMethod.cardType = 'mastercard';
      } else if (firstFour.startsWith('6')) {
        this.newMethod.cardType = 'rupay';
      } else if (firstFour.startsWith('3')) {
        this.newMethod.cardType = 'amex';
      }
    }
  }

  /**
   * Save method
   */
  saveMethod(): void {
    if (!this.isMethodValid()) {
      return;
    }

    // Generate token
    const token = this.generateToken();
    
    // Create masked value
    let maskedValue = '';
    if (this.newMethod.methodType === 'card') {
      const digits = this.cardNumber.replace(/\D/g, '');
      maskedValue = `****${digits.slice(-4)}`;
    } else if (this.newMethod.methodType === 'upi') {
      const upi = this.newMethod.upiId || '';
      const parts = upi.split('@');
      maskedValue = `${parts[0].substring(0, 3)}***@${parts[1]}`;
    } else if (this.newMethod.methodType === 'net_banking') {
      const account = this.newMethod.accountNumber || '';
      maskedValue = `****${account.slice(-4)}`;
    }

    // Format expiry date for cards
    let formattedExpiry = '';
    if (this.newMethod.methodType === 'card' && this.expiryDate) {
      const date = new Date(this.expiryDate);
      formattedExpiry = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
    }

    // If setting as default, unset other defaults
    if (this.newMethod.isDefault) {
      this.savedMethods.forEach(m => {
        if (m.id !== this.editingMethod?.id) {
          m.isDefault = false;
        }
      });
    }

    if (this.editingMethod) {
      // Update existing method
      const index = this.savedMethods.findIndex(m => m.id === this.editingMethod!.id);
      if (index > -1) {
        this.savedMethods[index] = {
          ...this.savedMethods[index],
          ...this.newMethod,
          token: this.editingMethod.token || token,
          maskedValue: maskedValue,
          expiryDate: formattedExpiry || this.editingMethod.expiryDate,
          billingAddress: Object.keys(this.billingAddress).some(k => this.billingAddress[k as keyof typeof this.billingAddress]) 
            ? this.billingAddress 
            : this.editingMethod.billingAddress
        } as SavedPaymentMethod;
      }
      alert('Payment method updated successfully!');
    } else {
      // Create new method
      const method: SavedPaymentMethod = {
        id: `method-${Date.now()}`,
        token: token,
        methodType: this.newMethod.methodType!,
        displayName: this.newMethod.displayName!,
        maskedValue: maskedValue,
        cardType: this.newMethod.cardType,
        expiryDate: formattedExpiry,
        upiId: this.newMethod.upiId,
        bankName: this.newMethod.bankName,
        accountNumber: this.newMethod.accountNumber,
        isDefault: this.newMethod.isDefault || false,
        isActive: true,
        addedDate: new Date(),
        residentId: this.newMethod.residentId,
        residentName: this.newMethod.residentName,
        billingAddress: Object.keys(this.billingAddress).some(k => this.billingAddress[k as keyof typeof this.billingAddress]) 
          ? this.billingAddress 
          : undefined
      };
      this.savedMethods.unshift(method);
      alert('Payment method saved and tokenized successfully!');
    }

    this.filterMethods();
    this.closeMethodModal();
  }

  /**
   * Generate token
   */
  generateToken(): string {
    // Generate a UUID-like token
    return 'tok_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Edit method
   */
  editMethod(method: SavedPaymentMethod): void {
    this.editingMethod = method;
    this.newMethod = { ...method };
    
    if (method.methodType === 'card' && method.expiryDate) {
      // Convert MM/YY to YYYY-MM format for date input
      const [month, year] = method.expiryDate.split('/');
      this.expiryDate = `20${year}-${month.padStart(2, '0')}`;
    }
    
    if (method.billingAddress) {
      this.billingAddress = { ...method.billingAddress };
    }
    
    this.showAddMethod = true;
  }

  /**
   * Delete method
   */
  deleteMethod(method: SavedPaymentMethod): void {
    if (confirm(`Delete payment method "${method.displayName}"? This action cannot be undone.`)) {
      this.savedMethods = this.savedMethods.filter(m => m.id !== method.id);
      this.filterMethods();
      alert('Payment method deleted successfully!');
    }
  }

  /**
   * Toggle method
   */
  toggleMethod(method: SavedPaymentMethod): void {
    method.isActive = !method.isActive;
    this.filterMethods();
    alert(`Payment method ${method.isActive ? 'activated' : 'deactivated'} successfully!`);
  }

  /**
   * Set as default
   */
  setAsDefault(method: SavedPaymentMethod): void {
    // Unset other defaults
    this.savedMethods.forEach(m => {
      if (m.id !== method.id) {
        m.isDefault = false;
      }
    });
    
    method.isDefault = true;
    this.filterMethods();
    alert('Payment method set as default!');
  }

  /**
   * Use method
   */
  useMethod(method: SavedPaymentMethod): void {
    method.lastUsed = new Date();
    this.filterMethods();
    alert(`Using payment method: ${method.displayName}\nToken: ${method.token}`);
  }

  /**
   * Close method modal
   */
  closeMethodModal(): void {
    this.showAddMethod = false;
    this.editingMethod = null;
    this.resetNewMethod();
  }

  /**
   * Reset new method
   */
  resetNewMethod(): void {
    this.newMethod = {
      methodType: 'card',
      displayName: '',
      maskedValue: '',
      isDefault: false,
      isActive: true
    };
    this.cardNumber = '';
    this.cardholderName = '';
    this.expiryDate = '';
    this.cvv = '';
    this.billingAddress = {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    };
  }

  /**
   * Is method valid
   */
  isMethodValid(): boolean {
    if (!this.newMethod.methodType || !this.newMethod.displayName) {
      return false;
    }

    if (this.newMethod.methodType === 'card') {
      return !!(
        this.cardNumber &&
        this.cardNumber.replace(/\D/g, '').length >= 13 &&
        this.expiryDate &&
        this.cvv &&
        this.cardholderName
      );
    }

    if (this.newMethod.methodType === 'upi') {
      return !!this.newMethod.upiId;
    }

    if (this.newMethod.methodType === 'net_banking') {
      return !!(this.newMethod.bankName && this.newMethod.accountNumber);
    }

    return true;
  }

  /**
   * Get method icon
   */
  getMethodIcon(type: string): string {
    const icons: { [key: string]: string } = {
      card: 'credit_card',
      upi: 'account_balance_wallet',
      net_banking: 'account_balance',
      wallet: 'phone_android'
    };
    return icons[type] || 'payment';
  }

  /**
   * Get card type label
   */
  getCardTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      visa: 'VISA',
      mastercard: 'Mastercard',
      mada: 'mada',
      amex: 'American Express',
      rupay: 'RuPay'
    };
    return labels[type] || type;
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

