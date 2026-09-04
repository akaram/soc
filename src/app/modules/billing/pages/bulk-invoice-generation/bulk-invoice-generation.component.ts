import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { BulkInvoiceService } from '../../services/bulk-invoice.service';
import {
  BulkInvoiceGeneration,
  BulkInvoiceItem,
  BulkInvoiceResident,
  BulkInvoiceTemplate
} from '../../models/bulk-invoice.model';

/**
 * Bulk Invoice Generation Component
 * Handles generation of multiple invoices at once
 */
@Component({
  selector: 'app-bulk-invoice-generation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="bulk-invoice-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">batch_prediction</i>
            Bulk Invoice Generation
          </h1>
          <p>Generate multiple invoices at once for multiple residents</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/bulk-invoice-generations</strong> and <strong>/invoice-templates</strong> APIs.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showTemplates = true" title="Templates">
            <i class="material-icons">description</i>
            Templates
          </button>
          <button class="icon-btn primary" (click)="showCreateTemplate = true" title="Create Template">
            <i class="material-icons">add</i>
            Create Template
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ templates.length }}</div>
            <div class="stat-label">Templates</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ residents.length }}</div>
            <div class="stat-label">Total Residents</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ completedGenerationsCount }}</div>
            <div class="stat-label">Completed Generations</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalGeneratedInvoices }}</div>
            <div class="stat-label">Total Invoices Generated</div>
          </div>
        </div>
      </div>

      <!-- Generation Form -->
      <div class="generation-form">
        <div class="form-section">
          <h2>
            <i class="material-icons">settings</i>
            Generation Settings
          </h2>

          <div class="form-row">
            <div class="form-group">
              <label>Select Template <span class="required">*</span></label>
              <select [(ngModel)]="selectedTemplateId" (change)="onTemplateChange()" required>
                <option value="">Select a template</option>
                <option *ngFor="let template of templates" [value]="template.id">
                  {{ template.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Invoice Date <span class="required">*</span></label>
              <input type="date" [(ngModel)]="invoiceDate" required />
            </div>
            <div class="form-group">
              <label>Due Date <span class="required">*</span></label>
              <input type="date" [(ngModel)]="dueDate" required />
            </div>
          </div>

          <div class="form-group">
            <label>Additional Notes</label>
            <textarea [(ngModel)]="notes" placeholder="Optional notes for all invoices" rows="3"></textarea>
          </div>
        </div>

        <!-- Resident Selection -->
        <div class="form-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">people</i>
              Select Residents
            </h2>
            <div class="selection-actions">
              <button class="btn-link" (click)="selectAll()">Select All</button>
              <button class="btn-link" (click)="deselectAll()">Deselect All</button>
              <button class="btn-link" (click)="selectByFlat()">Select by Flat Range</button>
            </div>
          </div>

          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search residents by name or flat number..." 
              [(ngModel)]="residentSearchQuery"
              (input)="filterResidents()"
            />
          </div>

          <div class="residents-grid">
            <div 
              *ngFor="let resident of filteredResidents" 
              class="resident-card"
              [class.selected]="isResidentSelected(resident.id)"
              (click)="toggleResident(resident.id)"
            >
              <div class="resident-checkbox">
                <i class="material-icons" *ngIf="isResidentSelected(resident.id)">check_circle</i>
                <i class="material-icons" *ngIf="!isResidentSelected(resident.id)">radio_button_unchecked</i>
              </div>
              <div class="resident-info">
                <div class="resident-name">{{ resident.name }}</div>
                <div class="resident-flat">{{ resident.flatNumber }}</div>
                <div class="resident-contact" *ngIf="resident.email">{{ resident.email }}</div>
              </div>
            </div>
          </div>

          <div class="selection-summary">
            <strong>{{ selectedResidents.length }} of {{ residents.length }} residents selected</strong>
          </div>
        </div>

        <!-- Preview -->
        <div class="form-section" *ngIf="selectedTemplateId && selectedResidents.length > 0">
          <h2>
            <i class="material-icons">preview</i>
            Preview
          </h2>
          <div class="preview-card">
            <div class="preview-header">
              <div>
                <strong>Invoice Preview</strong>
                <p>This is how the generated invoices will look</p>
              </div>
              <div class="preview-stats">
                <span>{{ selectedResidents.length }} invoices will be generated</span>
              </div>
            </div>
            <div class="preview-content">
              <div class="preview-item" *ngFor="let item of currentItems">
                <div class="item-description">{{ item.description }}</div>
                <div class="item-details">
                  <span>Qty: {{ item.quantity }}</span>
                  <span>Price: {{ formatCurrency(item.unitPrice) }}</span>
                  <span class="item-amount">{{ formatCurrency(item.amount) }}</span>
                </div>
              </div>
              <div class="preview-totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>{{ formatCurrency(currentSubtotal) }}</span>
                </div>
                <div class="total-row" *ngIf="currentTaxRate > 0">
                  <span>Tax ({{ currentTaxRate }}%):</span>
                  <span>{{ formatCurrency(currentTax) }}</span>
                </div>
                <div class="total-row grand-total">
                  <span>Total:</span>
                  <span>{{ formatCurrency(currentTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="resetForm()">
            <i class="material-icons">refresh</i>
            Reset
          </button>
          <button 
            class="btn btn-primary" 
            (click)="generateInvoices()" 
            [disabled]="!canGenerate() || isGenerating"
          >
            <i class="material-icons">batch_prediction</i>
            {{ isGenerating ? 'Generating...' : 'Generate ' + selectedResidents.length + ' Invoices' }}
          </button>
        </div>
      </div>

      <!-- Generation History -->
      <div class="history-section">
        <h2>
          <i class="material-icons">history</i>
          Generation History
        </h2>
        <div class="history-list">
          <div *ngFor="let generation of generationHistory" class="history-item">
            <div class="history-header">
              <div class="history-info">
                <strong>{{ generation.templateName }}</strong>
                <span class="history-date">{{ formatDateTime(generation.createdAt) }}</span>
              </div>
              <span class="status-badge" [ngClass]="generation.status">
                {{ getStatusLabel(generation.status) }}
              </span>
            </div>
            <div class="history-details">
              <span>{{ generation.generatedInvoices }} / {{ generation.totalInvoices }} invoices generated</span>
              <span *ngIf="generation.status === 'generating'" class="progress-indicator">
                <i class="material-icons">sync</i>
                Generating...
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Template Modal -->
      <div class="modal-overlay" *ngIf="showCreateTemplate" (click)="showCreateTemplate = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Create Invoice Template</h2>
            <button class="close-btn" (click)="showCreateTemplate = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Template Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newTemplate.name" placeholder="e.g., Monthly Maintenance" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newTemplate.description" placeholder="Template description" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>Tax Rate (%)</label>
              <input type="number" [(ngModel)]="newTemplate.taxRate" min="0" max="100" step="0.01" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newTemplate.notes" placeholder="Default notes for invoices" rows="3"></textarea>
            </div>

            <div class="items-section">
              <div class="section-header">
                <h3>Invoice Items</h3>
                <button class="btn btn-sm" (click)="addTemplateItem()">
                  <i class="material-icons">add</i>
                  Add Item
                </button>
              </div>
              <div class="items-list">
                <div *ngFor="let item of newTemplate.items; let i = index" class="item-row">
                  <input type="text" [(ngModel)]="item.description" placeholder="Item description" class="item-description" />
                  <input type="number" [(ngModel)]="item.quantity" min="1" placeholder="Qty" class="item-qty" />
                  <input type="number" [(ngModel)]="item.unitPrice" min="0" step="0.01" placeholder="Price" class="item-price" />
                  <div class="item-amount">{{ formatCurrency(item.quantity * item.unitPrice) }}</div>
                  <button class="btn-icon" (click)="removeTemplateItem(i)">
                    <i class="material-icons">delete</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showCreateTemplate = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveTemplate()" [disabled]="!isTemplateValid()">
              <i class="material-icons">save</i>
              Save Template
            </button>
          </div>
        </div>
      </div>

      <!-- Templates Modal -->
      <div class="modal-overlay" *ngIf="showTemplates" (click)="showTemplates = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Invoice Templates</h2>
            <button class="close-btn" (click)="showTemplates = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="templates-grid">
              <div *ngFor="let template of templates" class="template-card">
                <div class="template-header">
                  <h3>{{ template.name }}</h3>
                  <div class="template-actions">
                    <button class="btn-icon" (click)="editTemplate(template)">
                      <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-icon" (click)="deleteTemplate(template.id)">
                      <i class="material-icons">delete</i>
                    </button>
                  </div>
                </div>
                <p class="template-description">{{ template.description || 'No description' }}</p>
                <div class="template-items">
                  <div *ngFor="let item of template.items" class="template-item">
                    <span>{{ item.description }}</span>
                    <span>{{ formatCurrency(item.amount) }}</span>
                  </div>
                </div>
                <div class="template-footer">
                  <span>Tax: {{ template.taxRate }}%</span>
                  <span>Items: {{ template.items.length }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showTemplates = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bulk-invoice-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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

    .api-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      font-size: 12px;
    }

    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 24px 0;
      padding: 12px 16px;
      background: rgba(231, 76, 60, 0.1);
      color: #c0392b;
      border-radius: 8px;
      font-size: 14px;
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
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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

    /* Form */
    .generation-form {
      padding: 0 24px 24px;
    }

    .form-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .selection-actions {
      display: flex;
      gap: 12px;
    }

    .btn-link {
      background: none;
      border: none;
      color: #3498db;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      padding: 4px 8px;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
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
      border-color: #e74c3c;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 8px 16px;
      margin-bottom: 16px;
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

    /* Residents Grid */
    .residents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
      max-height: 400px;
      overflow-y: auto;
    }

    .resident-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .resident-card:hover {
      background: #e9ecef;
    }

    .resident-card.selected {
      background: #e7f3ff;
      border-color: #3498db;
    }

    .resident-checkbox {
      color: #95a5a6;
    }

    .resident-card.selected .resident-checkbox {
      color: #3498db;
    }

    .resident-info {
      flex: 1;
    }

    .resident-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .resident-flat {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 2px;
    }

    .resident-contact {
      font-size: 11px;
      color: #95a5a6;
    }

    .selection-summary {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      text-align: center;
      color: #2c3e50;
    }

    /* Preview */
    .preview-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e9ecef;
    }

    .preview-stats {
      font-size: 14px;
      color: #7f8c8d;
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .item-description {
      flex: 1;
      font-weight: 500;
      color: #2c3e50;
    }

    .item-details {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .item-amount {
      font-weight: 600;
      color: #2c3e50;
      min-width: 100px;
      text-align: right;
    }

    .preview-totals {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #e9ecef;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .total-row.grand-total {
      font-weight: 700;
      font-size: 18px;
      color: #2c3e50;
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
      margin-top: 8px;
    }

    /* Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .btn {
      padding: 12px 24px;
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
      background: #e74c3c;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #c0392b;
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

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    /* History */
    .history-section {
      padding: 0 24px 24px;
    }

    .history-section h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .history-list {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .history-item {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .history-item:last-child {
      border-bottom: none;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .history-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-date {
      font-size: 12px;
      color: #7f8c8d;
    }

    .history-details {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #7f8c8d;
    }

    .progress-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #3498db;
    }

    .progress-indicator i {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.draft { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.generating { background: #e7f3ff; color: #8e44ad; }
    .status-badge.completed { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.failed { background: #ffeaea; color: #c0392b; }

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
      max-width: 1000px;
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

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    /* Template Items */
    .items-section {
      margin-top: 24px;
    }

    .items-section h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .item-row {
      display: grid;
      grid-template-columns: 2fr 80px 120px 100px 40px;
      gap: 8px;
      align-items: center;
    }

    .item-row input {
      padding: 8px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
    }

    .item-amount {
      font-weight: 600;
      color: #2c3e50;
      text-align: right;
    }

    .btn-icon {
      background: none;
      border: none;
      color: #e74c3c;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Templates Grid */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .template-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      border: 2px solid #e9ecef;
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .template-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .template-actions {
      display: flex;
      gap: 4px;
    }

    .template-description {
      font-size: 13px;
      color: #7f8c8d;
      margin: 0 0 12px 0;
    }

    .template-items {
      margin-bottom: 12px;
    }

    .template-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid #e9ecef;
    }

    .template-item:last-child {
      border-bottom: none;
    }

    .template-footer {
      display: flex;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
      font-size: 12px;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .generation-form {
        padding: 0 16px 16px;
      }

      .residents-grid {
        grid-template-columns: 1fr;
      }

      .item-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BulkInvoiceGenerationComponent implements OnInit, OnDestroy {
  templates: BulkInvoiceTemplate[] = [];
  residents: BulkInvoiceResident[] = [];
  filteredResidents: BulkInvoiceResident[] = [];
  selectedResidents: string[] = [];
  residentSearchQuery: string = '';
  selectedTemplateId: string = '';
  invoiceDate: string = '';
  dueDate: string = '';
  notes: string = '';
  showCreateTemplate: boolean = false;
  showTemplates: boolean = false;
  generationHistory: BulkInvoiceGeneration[] = [];
  totalGeneratedInvoices: number = 0;
  loadError = '';
  isGenerating = false;
  editingTemplateId: string | null = null;

  newTemplate: BulkInvoiceTemplate = {
    id: '',
    name: '',
    description: '',
    items: [],
    taxRate: 0,
    notes: ''
  };

  private destroy$ = new Subject<void>();
  private bulkInvoiceService = inject(BulkInvoiceService);
  private session = inject(SessionContextService);

  constructor() {
    const today = new Date();
    this.invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load templates, residents, and generation history from APIs. */
  loadAll(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.templates = [];
      this.residents = [];
      this.filteredResidents = [];
      this.generationHistory = [];
      this.totalGeneratedInvoices = 0;
      return;
    }
    this.loadTemplates();
    this.loadResidents();
    this.loadGenerationHistory();
  }

  /**
   * Load templates from invoice-templates API
   */
  loadTemplates(): void {
    this.bulkInvoiceService
      .getTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: templates => {
          this.templates = templates;
        },
        error: () => {
          this.loadError = 'Failed to load invoice templates from the API. Ensure the backend is running.';
        }
      });
  }

  /**
   * Load residents eligible for bulk invoicing
   */
  loadResidents(): void {
    this.bulkInvoiceService
      .getResidents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: residents => {
          this.residents = residents;
          this.filterResidents();
        },
        error: () => {
          this.loadError = 'Failed to load residents from the API. Ensure the backend is running.';
        }
      });
  }

  /**
   * Load generation history
   */
  loadGenerationHistory(): void {
    this.bulkInvoiceService
      .getGenerationHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: history => {
          this.generationHistory = history;
          this.totalGeneratedInvoices = history.reduce((sum, g) => sum + g.generatedInvoices, 0);
        },
        error: () => {
          this.loadError = 'Failed to load generation history from the API. Ensure the backend is running.';
        }
      });
  }

  /**
   * Get completed generations count
   */
  get completedGenerationsCount(): number {
    return this.generationHistory.filter(g => g.status === 'completed').length;
  }

  /**
   * Filter residents
   */
  filterResidents(): void {
    if (!this.residentSearchQuery.trim()) {
      this.filteredResidents = [...this.residents];
      return;
    }

    const query = this.residentSearchQuery.toLowerCase();
    this.filteredResidents = this.residents.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.flatNumber.toLowerCase().includes(query) ||
      (r.email && r.email.toLowerCase().includes(query))
    );
  }

  /**
   * Toggle resident selection
   */
  toggleResident(residentId: string): void {
    const index = this.selectedResidents.indexOf(residentId);
    if (index > -1) {
      this.selectedResidents.splice(index, 1);
    } else {
      this.selectedResidents.push(residentId);
    }
  }

  /**
   * Check if resident is selected
   */
  isResidentSelected(residentId: string): boolean {
    return this.selectedResidents.includes(residentId);
  }

  /**
   * Select all residents
   */
  selectAll(): void {
    this.selectedResidents = this.filteredResidents.map(r => r.id);
  }

  /**
   * Deselect all residents
   */
  deselectAll(): void {
    this.selectedResidents = [];
  }

  /**
   * Select by flat range
   */
  selectByFlat(): void {
    const startFlat = prompt('Enter starting flat (e.g., A-101):');
    const endFlat = prompt('Enter ending flat (e.g., A-205):');
    if (startFlat && endFlat) {
      this.selectedResidents = this.residents
        .filter(r => r.flatNumber >= startFlat && r.flatNumber <= endFlat)
        .map(r => r.id);
    }
  }

  /**
   * On template change
   */
  onTemplateChange(): void {
    // Template change logic
  }

  /**
   * Get current template items
   */
  get currentItems(): BulkInvoiceItem[] {
    const template = this.templates.find(t => t.id === this.selectedTemplateId);
    return template ? template.items : [];
  }

  /**
   * Get current subtotal
   */
  get currentSubtotal(): number {
    return this.currentItems.reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * Get current tax rate
   */
  get currentTaxRate(): number {
    const template = this.templates.find(t => t.id === this.selectedTemplateId);
    return template ? template.taxRate : 0;
  }

  /**
   * Get current tax
   */
  get currentTax(): number {
    return (this.currentSubtotal * this.currentTaxRate) / 100;
  }

  /**
   * Get current total
   */
  get currentTotal(): number {
    return this.currentSubtotal + this.currentTax;
  }

  /**
   * Can generate invoices
   */
  canGenerate(): boolean {
    return !!(
      this.selectedTemplateId &&
      this.selectedResidents.length > 0 &&
      this.invoiceDate &&
      this.dueDate
    );
  }

  /**
   * Generate invoices
   */
  generateInvoices(): void {
    if (!this.canGenerate() || this.isGenerating) {
      return;
    }
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }

    const template = this.templates.find(t => t.id === this.selectedTemplateId);
    if (!template) {
      return;
    }

    this.isGenerating = true;
    this.bulkInvoiceService
      .generateInvoices({
        templateId: this.selectedTemplateId,
        invoiceDate: this.invoiceDate,
        dueDate: this.dueDate,
        selectedResidents: [...this.selectedResidents],
        notes: this.notes || template.notes
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: generation => {
          this.isGenerating = false;
          this.generationHistory.unshift(generation);
          this.totalGeneratedInvoices += generation.generatedInvoices;
          window.alert(`Successfully generated ${generation.generatedInvoices} invoices!`);
          this.resetForm();
        },
        error: err => {
          this.isGenerating = false;
          console.error('Bulk invoice generation failed', err);
          window.alert('Failed to generate invoices. Ensure the backend is running and residents exist.');
        }
      });
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.selectedTemplateId = '';
    this.selectedResidents = [];
    this.residentSearchQuery = '';
    this.notes = '';
    const today = new Date();
    this.invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
  }

  /**
   * Add template item
   */
  addTemplateItem(): void {
    this.newTemplate.items.push({
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    });
  }

  /**
   * Remove template item
   */
  removeTemplateItem(index: number): void {
    this.newTemplate.items.splice(index, 1);
  }

  /**
   * Is template valid
   */
  isTemplateValid(): boolean {
    return !!(
      this.newTemplate.name &&
      this.newTemplate.items.length > 0 &&
      this.newTemplate.items.every(item => item.description && item.quantity > 0 && item.unitPrice > 0)
    );
  }

  /**
   * Save template
   */
  saveTemplate(): void {
    if (!this.isTemplateValid()) {
      return;
    }

    // Calculate item amounts before persisting
    this.newTemplate.items.forEach(item => {
      item.amount = item.quantity * item.unitPrice;
      item.taxRate = this.newTemplate.taxRate;
    });

    const request$ = this.editingTemplateId
      ? this.bulkInvoiceService.updateTemplate({ ...this.newTemplate, id: this.editingTemplateId })
      : this.bulkInvoiceService.createTemplate(this.newTemplate);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        if (this.editingTemplateId) {
          const idx = this.templates.findIndex(t => t.id === saved.id);
          if (idx >= 0) {
            this.templates[idx] = saved;
          }
        } else {
          this.templates.push(saved);
        }
        this.resetNewTemplate();
        this.showCreateTemplate = false;
        window.alert('Template saved successfully!');
      },
      error: err => {
        console.error('Failed to save template', err);
        window.alert('Failed to save template. Ensure the backend is running.');
      }
    });
  }

  /**
   * Reset new template
   */
  resetNewTemplate(): void {
    this.editingTemplateId = null;
    this.newTemplate = {
      id: '',
      name: '',
      description: '',
      items: [],
      taxRate: 0,
      notes: ''
    };
  }

  /**
   * Edit template
   */
  editTemplate(template: BulkInvoiceTemplate): void {
    this.editingTemplateId = template.id;
    this.newTemplate = {
      ...template,
      items: template.items.map(item => ({ ...item }))
    };
    this.showTemplates = false;
    this.showCreateTemplate = true;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): void {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    this.bulkInvoiceService
      .deleteTemplate(templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.templates = this.templates.filter(t => t.id !== templateId);
          if (this.selectedTemplateId === templateId) {
            this.selectedTemplateId = '';
          }
          window.alert('Template deleted successfully!');
        },
        error: err => {
          console.error('Failed to delete template', err);
          window.alert('Failed to delete template.');
        }
      });
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
   * Format date time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      generating: 'Generating',
      completed: 'Completed',
      failed: 'Failed'
    };
    return labels[status] || status;
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

