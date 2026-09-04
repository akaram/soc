import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Payment Reminders Component
 * Handles payment reminders via push notifications, SMS, and email
 */
interface ReminderRule {
  id: string;
  name: string;
  description: string;
  triggerType: 'due_date' | 'overdue' | 'upcoming' | 'custom';
  daysBefore?: number; // Days before due date
  daysAfter?: number; // Days after due date (for overdue)
  applicableTo: 'all' | 'invoices' | 'bills' | 'installments' | 'custom';
  billTypes?: string[]; // For custom applicableTo
  deliveryMethods: ('push' | 'sms' | 'email')[];
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  pushTemplate?: string;
  smsTemplate?: string;
  emailTemplate?: string;
  isActive: boolean;
  autoSend: boolean;
  sendTime?: string; // HH:mm format
  maxReminders?: number; // Maximum reminders per payment
  reminderInterval?: number; // Days between reminders
  createdAt: Date;
  updatedAt: Date;
}

interface ReminderTemplate {
  id: string;
  name: string;
  type: 'push' | 'sms' | 'email';
  subject?: string; // For email
  content: string;
  variables: string[]; // Available variables like {{residentName}}, {{amount}}, etc.
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ReminderHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  installmentId?: string;
  amount: number;
  dueDate: Date;
  deliveryMethod: 'push' | 'sms' | 'email';
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  recipient: string; // Email, phone, or device token
  templateId?: string;
  templateName?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-payment-reminders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="payment-reminders-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">notifications_active</i>
            Payment Reminders
          </h1>
          <p>Configure and manage payment reminders via push notifications, SMS, and email</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="activeTab = 'templates'" title="Templates">
            <i class="material-icons">description</i>
            Templates
          </button>
          <button class="icon-btn primary" (click)="showCreateRule = true" title="Create Reminder Rule">
            <i class="material-icons">add</i>
            Create Rule
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">rule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeRulesCount }}</div>
            <div class="stat-label">Active Rules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">send</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalSentCount }}</div>
            <div class="stat-label">Reminders Sent</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ deliveredCount }}</div>
            <div class="stat-label">Delivered</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingCount }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button class="tab" [class.active]="activeTab === 'rules'" (click)="activeTab = 'rules'">
            <i class="material-icons">rule</i>
            Reminder Rules
          </button>
          <button class="tab" [class.active]="activeTab === 'templates'" (click)="activeTab = 'templates'">
            <i class="material-icons">description</i>
            Templates
          </button>
          <button class="tab" [class.active]="activeTab === 'history'" (click)="activeTab = 'history'">
            <i class="material-icons">history</i>
            Reminder History
          </button>
          <button class="tab" [class.active]="activeTab === 'scheduled'" (click)="activeTab = 'scheduled'">
            <i class="material-icons">schedule</i>
            Scheduled
          </button>
        </div>
      </div>

      <!-- Rules Tab -->
      <div class="content-section" *ngIf="activeTab === 'rules'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input type="text" placeholder="Search by rule name..." [(ngModel)]="searchQuery" (input)="filterRules()" />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <!-- Rules Grid -->
        <div class="rules-grid">
          <div *ngFor="let rule of filteredRules" class="rule-card" [class.inactive]="!rule.isActive">
            <div class="rule-header">
              <div class="rule-title">
                <h3>{{ rule.name }}</h3>
                <span class="rule-badge" [ngClass]="rule.triggerType">
                  {{ getTriggerTypeLabel(rule.triggerType) }}
                </span>
              </div>
              <div class="rule-status">
                <span class="status-badge" [ngClass]="rule.isActive ? 'active' : 'inactive'">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <div class="rule-details">
              <div class="detail-item">
                <i class="material-icons">info</i>
                <span>{{ rule.description }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">schedule</i>
                <span>{{ getTriggerDescription(rule) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">category</i>
                <span>Applies to: {{ getApplicableToLabel(rule.applicableTo) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">notifications</i>
                <span>Methods: {{ getDeliveryMethodsLabel(rule) }}</span>
              </div>
              <div class="detail-item" *ngIf="rule.autoSend">
                <i class="material-icons">autorenew</i>
                <span>Auto-send: {{ rule.sendTime || 'Immediate' }}</span>
              </div>
            </div>
            <div class="rule-actions">
              <button class="action-btn view" (click)="viewRule(rule)" title="View Details">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn edit" (click)="editRule(rule)" title="Edit">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn toggle" (click)="toggleRule(rule)" [title]="rule.isActive ? 'Deactivate' : 'Activate'">
                <i class="material-icons">{{ rule.isActive ? 'pause' : 'play_arrow' }}</i>
                {{ rule.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button class="action-btn delete" (click)="deleteRule(rule)" title="Delete">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredRules.length === 0">
          <i class="material-icons">rule</i>
          <p>No reminder rules found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreateRule = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Rule
          </button>
        </div>
      </div>

      <!-- Templates Tab -->
      <div class="content-section" *ngIf="activeTab === 'templates'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input type="text" placeholder="Search templates..." [(ngModel)]="templateSearchQuery" (input)="filterTemplates()" />
          </div>
          <select [(ngModel)]="templateTypeFilter" (change)="filterTemplates()" class="filter-select">
            <option value="all">All Types</option>
            <option value="push">Push</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>

        <!-- Templates Grid -->
        <div class="templates-grid">
          <div *ngFor="let template of filteredTemplates" class="template-card">
            <div class="template-header">
              <div class="template-title">
                <h3>{{ template.name }}</h3>
                <span class="template-badge" [ngClass]="template.type">
                  {{ getTemplateTypeLabel(template.type) }}
                </span>
                <span class="default-badge" *ngIf="template.isDefault">Default</span>
              </div>
            </div>
            <div class="template-content">
              <div class="template-preview" *ngIf="template.type === 'email'">
                <div class="preview-subject" *ngIf="template.subject">
                  <strong>Subject:</strong> {{ template.subject }}
                </div>
                <div class="preview-body">{{ template.content }}</div>
              </div>
              <div class="template-preview" *ngIf="template.type !== 'email'">
                {{ template.content }}
              </div>
            </div>
            <div class="template-actions">
              <button class="action-btn view" (click)="viewTemplate(template)" title="View">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn edit" (click)="editTemplate(template)" title="Edit">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn test" (click)="sendTestReminder(template)" title="Send Test">
                <i class="material-icons">send</i>
                Test
              </button>
              <button class="action-btn delete" (click)="deleteTemplate(template)" title="Delete" *ngIf="!template.isDefault">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredTemplates.length === 0">
          <i class="material-icons">description</i>
          <p>No templates found</p>
          <button class="btn btn-primary" (click)="showCreateTemplate = true" *ngIf="!templateSearchQuery">
            <i class="material-icons">add</i>
            Create First Template
          </button>
        </div>
      </div>

      <!-- History Tab -->
      <div class="content-section" *ngIf="activeTab === 'history'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input type="text" placeholder="Search by resident, rule..." [(ngModel)]="historySearchQuery" (input)="filterHistory()" />
          </div>
          <select [(ngModel)]="historyStatusFilter" (change)="filterHistory()" class="filter-select">
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <select [(ngModel)]="deliveryMethodFilter" (change)="filterHistory()" class="filter-select">
            <option value="all">All Methods</option>
            <option value="push">Push</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>

        <!-- History Table -->
        <div class="history-table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Resident</th>
                <th>Invoice/Bill</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Method</th>
                <th>Recipient</th>
                <th>Sent At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let reminder of filteredHistory">
                <td><strong>{{ reminder.ruleName }}</strong></td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ reminder.residentName }}</div>
                    <div class="resident-flat">{{ reminder.flatNumber }}</div>
                  </div>
                </td>
                <td>
                  <span *ngIf="reminder.invoiceNumber">{{ reminder.invoiceNumber }}</span>
                  <span *ngIf="reminder.billNumber">{{ reminder.billNumber }}</span>
                  <span *ngIf="!reminder.invoiceNumber && !reminder.billNumber">-</span>
                </td>
                <td class="amount">{{ formatCurrency(reminder.amount) }}</td>
                <td>{{ formatDate(reminder.dueDate) }}</td>
                <td>
                  <span class="method-badge" [ngClass]="reminder.deliveryMethod">
                    {{ getDeliveryMethodLabel(reminder.deliveryMethod) }}
                  </span>
                </td>
                <td class="recipient">{{ reminder.recipient }}</td>
                <td>{{ formatDateTime(reminder.sentAt) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="reminder.status">
                    {{ getReminderStatusLabel(reminder.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewReminder(reminder)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn retry" (click)="retryReminder(reminder)" title="Retry" *ngIf="reminder.status === 'failed'">
                      <i class="material-icons">refresh</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredHistory.length === 0">
            <i class="material-icons">history</i>
            <p>No reminder history found</p>
          </div>
        </div>
      </div>

      <!-- Scheduled Tab -->
      <div class="content-section" *ngIf="activeTab === 'scheduled'">
        <div class="scheduled-reminders-grid">
          <div *ngFor="let reminder of scheduledReminders" class="scheduled-card">
            <div class="scheduled-header">
              <h3>{{ reminder.ruleName }}</h3>
              <span class="days-badge" [ngClass]="getDaysUntilClass(reminder.daysUntil)">
                {{ reminder.daysUntil }} days
              </span>
            </div>
            <div class="scheduled-details">
              <div class="detail-item">
                <span class="label">Resident:</span>
                <span class="value">{{ reminder.residentName }} - {{ reminder.flatNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Amount:</span>
                <span class="value amount">{{ formatCurrency(reminder.amount) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Due Date:</span>
                <span class="value">{{ formatDate(reminder.dueDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Methods:</span>
                <span class="value">{{ getDeliveryMethodsLabel(reminder) }}</span>
              </div>
            </div>
            <div class="scheduled-actions">
              <button class="btn btn-secondary" (click)="cancelScheduledReminder(reminder)">Cancel</button>
              <button class="btn btn-primary" (click)="sendReminderNow(reminder)">Send Now</button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="scheduledReminders.length === 0">
          <i class="material-icons">schedule</i>
          <p>No scheduled reminders</p>
        </div>
      </div>

      <!-- Create/Edit Rule Modal -->
      <div class="modal-overlay" *ngIf="showCreateRule || editingRule" (click)="closeRuleModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingRule ? 'Edit Reminder Rule' : 'Create Reminder Rule' }}</h2>
            <button class="close-btn" (click)="closeRuleModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>Rule Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newRule.name" placeholder="e.g., Payment Due Reminder" required />
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newRule.description" placeholder="Rule description" rows="2"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Trigger Type <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.triggerType" (change)="onTriggerTypeChange()" required>
                    <option value="">Select Type</option>
                    <option value="due_date">Before Due Date</option>
                    <option value="overdue">After Due Date (Overdue)</option>
                    <option value="upcoming">Upcoming Payment</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div class="form-group" *ngIf="newRule.triggerType === 'due_date' || newRule.triggerType === 'upcoming'">
                  <label>Days Before <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newRule.daysBefore" min="0" placeholder="e.g., 3" required />
                </div>
                <div class="form-group" *ngIf="newRule.triggerType === 'overdue'">
                  <label>Days After Due Date <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newRule.daysAfter" min="0" placeholder="e.g., 1" required />
                </div>
              </div>

              <div class="form-group">
                <label>Applicable To <span class="required">*</span></label>
                <select [(ngModel)]="newRule.applicableTo" (change)="onApplicableToChange()" required>
                  <option value="">Select</option>
                  <option value="all">All Payments</option>
                  <option value="invoices">Invoices Only</option>
                  <option value="bills">Bills Only</option>
                  <option value="installments">Installments Only</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div class="form-section-title">Delivery Methods</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Push Notifications</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.pushEnabled" id="pushEnabled" (change)="updateDeliveryMethods()" />
                    <label for="pushEnabled"></label>
                  </div>
                </div>
                <div class="form-group">
                  <label>SMS</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.smsEnabled" id="smsEnabled" (change)="updateDeliveryMethods()" />
                    <label for="smsEnabled"></label>
                  </div>
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.emailEnabled" id="emailEnabled" (change)="updateDeliveryMethods()" />
                    <label for="emailEnabled"></label>
                  </div>
                </div>
              </div>

              <div class="form-group" *ngIf="newRule.pushEnabled">
                <label>Push Template</label>
                <select [(ngModel)]="newRule.pushTemplate">
                  <option value="">Select Template</option>
                  <option *ngFor="let template of getTemplatesByType('push')" [value]="template.id">
                    {{ template.name }}
                  </option>
                </select>
              </div>

              <div class="form-group" *ngIf="newRule.smsEnabled">
                <label>SMS Template</label>
                <select [(ngModel)]="newRule.smsTemplate">
                  <option value="">Select Template</option>
                  <option *ngFor="let template of getTemplatesByType('sms')" [value]="template.id">
                    {{ template.name }}
                  </option>
                </select>
              </div>

              <div class="form-group" *ngIf="newRule.emailEnabled">
                <label>Email Template</label>
                <select [(ngModel)]="newRule.emailTemplate">
                  <option value="">Select Template</option>
                  <option *ngFor="let template of getTemplatesByType('email')" [value]="template.id">
                    {{ template.name }}
                  </option>
                </select>
              </div>

              <div class="form-section-title">Scheduling</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Auto Send</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.autoSend" id="autoSend" />
                    <label for="autoSend"></label>
                  </div>
                </div>
                <div class="form-group" *ngIf="newRule.autoSend">
                  <label>Send Time (HH:mm)</label>
                  <input type="time" [(ngModel)]="newRule.sendTime" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Max Reminders</label>
                  <input type="number" [(ngModel)]="newRule.maxReminders" min="1" max="10" placeholder="e.g., 3" />
                </div>
                <div class="form-group">
                  <label>Reminder Interval (Days)</label>
                  <input type="number" [(ngModel)]="newRule.reminderInterval" min="1" placeholder="e.g., 1" />
                </div>
              </div>

              <div class="form-section-title">Status</div>
              <div class="form-group">
                <label>Active</label>
                <div class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="newRule.isActive" id="isActive" />
                  <label for="isActive"></label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeRuleModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveRule()" [disabled]="!isRuleValid()">
              <i class="material-icons">save</i>
              {{ editingRule ? 'Update' : 'Create' }} Rule
            </button>
          </div>
        </div>
      </div>

      <!-- Create/Edit Template Modal -->
      <div class="modal-overlay" *ngIf="showCreateTemplate || editingTemplate" (click)="closeTemplateModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingTemplate ? 'Edit Template' : 'Create Template' }}</h2>
            <button class="close-btn" (click)="closeTemplateModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Template Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newTemplate.name" placeholder="e.g., Payment Due Email" required />
                </div>
                <div class="form-group">
                  <label>Type <span class="required">*</span></label>
                  <select [(ngModel)]="newTemplate.type" required>
                    <option value="">Select Type</option>
                    <option value="push">Push Notification</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <div class="form-group" *ngIf="newTemplate.type === 'email'">
                <label>Subject <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newTemplate.subject" placeholder="e.g., Payment Reminder - Invoice Due" required />
              </div>

              <div class="form-group">
                <label>Content <span class="required">*</span></label>
                <textarea [(ngModel)]="newTemplate.content" [placeholder]="templateContentPlaceholder" rows="8" required></textarea>
                <div class="template-variables">
                  <strong>Available Variables:</strong>
                  <div class="variable-tags">
                    <span class="variable-tag" *ngFor="let variable of availableVariables" (click)="insertVariable(variable)">
                      {{ variable }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Set as Default</label>
                <div class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="newTemplate.isDefault" id="isDefault" />
                  <label for="isDefault"></label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeTemplateModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveTemplate()" [disabled]="!isTemplateValid()">
              <i class="material-icons">save</i>
              {{ editingTemplate ? 'Update' : 'Create' }} Template
            </button>
          </div>
        </div>
      </div>

      <!-- Send Test Modal -->
      <div class="modal-overlay" *ngIf="showSendTest" (click)="showSendTest = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Send Test Reminder</h2>
            <button class="close-btn" (click)="showSendTest = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>Delivery Method <span class="required">*</span></label>
                <select [(ngModel)]="testDeliveryMethod" required>
                  <option value="push">Push Notification</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div class="form-group">
                <label>Recipient <span class="required">*</span></label>
                <input type="text" [(ngModel)]="testRecipient" [placeholder]="getTestRecipientPlaceholder()" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showSendTest = false">Cancel</button>
            <button class="btn btn-primary" (click)="sendTest()" [disabled]="!testRecipient">
              <i class="material-icons">send</i>
              Send Test
            </button>
          </div>
        </div>
      </div>

      <!-- Rule Details Modal -->
      <div class="modal-overlay" *ngIf="selectedRule && showRuleDetails" (click)="showRuleDetails = false; selectedRule = null">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedRule.name }}</h2>
            <button class="close-btn" (click)="showRuleDetails = false; selectedRule = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedRule">
            <div class="rule-detail-section">
              <h3>Rule Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Name:</span>
                  <span class="value">{{ selectedRule.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Description:</span>
                  <span class="value">{{ selectedRule.description || 'No description' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Trigger Type:</span>
                  <span class="value">{{ getTriggerTypeLabel(selectedRule.triggerType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Trigger:</span>
                  <span class="value">{{ getTriggerDescription(selectedRule) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Applicable To:</span>
                  <span class="value">{{ getApplicableToLabel(selectedRule.applicableTo) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Delivery Methods:</span>
                  <span class="value">{{ getDeliveryMethodsLabel(selectedRule) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Auto Send:</span>
                  <span class="value">{{ selectedRule.autoSend ? 'Yes' : 'No' }}</span>
                </div>
                <div class="detail-item" *ngIf="selectedRule.sendTime">
                  <span class="label">Send Time:</span>
                  <span class="value">{{ selectedRule.sendTime }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedRule.isActive ? 'active' : 'inactive'">
                    {{ selectedRule.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showRuleDetails = false; selectedRule = null">Close</button>
            <button class="btn btn-primary" (click)="editRule(selectedRule!)">
              <i class="material-icons">edit</i>
              Edit Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-reminders-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .page-header {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn, .icon-btn {
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

    .back-btn:hover, .icon-btn:hover {
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
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
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

    .tabs-section {
      padding: 0 24px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .tab {
      padding: 12px 24px;
      border: none;
      background: none;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #16a085;
    }

    .tab.active {
      color: #16a085;
      border-bottom-color: #16a085;
    }

    .content-section {
      padding: 24px;
    }

    .filters-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 24px;
      align-items: center;
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

    .rules-grid, .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .rule-card, .template-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .rule-card:hover, .template-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .rule-card.inactive {
      opacity: 0.7;
    }

    .rule-header, .template-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .rule-title, .template-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      flex-wrap: wrap;
    }

    .rule-title h3, .template-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .rule-badge, .template-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .rule-badge.due_date { background: #e7f3ff; color: #2980b9; }
    .rule-badge.overdue { background: #ffeaea; color: #c0392b; }
    .rule-badge.upcoming { background: #fff4e6; color: #e67e22; }
    .rule-badge.custom { background: #f4e7ff; color: #8e44ad; }

    .template-badge.push { background: #e7f3ff; color: #2980b9; }
    .template-badge.sms { background: #e8f8f0; color: #1e9e5a; }
    .template-badge.email { background: #fff4e6; color: #e67e22; }

    .default-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: #16a085;
      color: white;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.inactive { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.sent { background: #e7f3ff; color: #2980b9; }
    .status-badge.delivered { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.failed { background: #ffeaea; color: #c0392b; }
    .status-badge.pending { background: #fff4e6; color: #e67e22; }

    .method-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .method-badge.push { background: #e7f3ff; color: #2980b9; }
    .method-badge.sms { background: #e8f8f0; color: #1e9e5a; }
    .method-badge.email { background: #fff4e6; color: #e67e22; }

    .rule-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
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
      color: #16a085;
    }

    .rule-actions, .template-actions {
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

    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.edit { background: #fff4e6; color: #e67e22; }
    .action-btn.toggle { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.delete { background: #ffeaea; color: #c0392b; }
    .action-btn.test { background: #f4e7ff; color: #8e44ad; }
    .action-btn.retry { background: #e8f8f0; color: #1e9e5a; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .template-content {
      margin-bottom: 16px;
    }

    .template-preview {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 13px;
      color: #2c3e50;
      line-height: 1.5;
    }

    .preview-subject {
      margin-bottom: 8px;
      font-weight: 600;
    }

    .template-variables {
      margin-top: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .template-variables strong {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .variable-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .variable-tag {
      padding: 4px 8px;
      background: #16a085;
      color: white;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .variable-tag:hover {
      background: #138d75;
    }

    .history-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .history-table {
      width: 100%;
    }

    .history-table thead {
      background: #f8f9fa;
    }

    .history-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .history-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
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

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .recipient {
      font-size: 12px;
      color: #7f8c8d;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    .scheduled-reminders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .scheduled-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #16a085;
    }

    .scheduled-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .scheduled-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .days-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .days-badge.urgent { background: #ffeaea; color: #c0392b; }
    .days-badge.soon { background: #fff4e6; color: #e67e22; }
    .days-badge.upcoming { background: #e7f3ff; color: #2980b9; }

    .scheduled-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .scheduled-details .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .scheduled-details .label {
      color: #7f8c8d;
    }

    .scheduled-details .value {
      color: #2c3e50;
      font-weight: 500;
    }

    .scheduled-details .value.amount {
      font-weight: 600;
      font-size: 16px;
    }

    .scheduled-actions {
      display: flex;
      gap: 8px;
    }

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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin: 16px 0 8px 0;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
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
      border-color: #16a085;
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
      background: #16a085;
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
      background: #16a085;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #138d75;
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

    .rule-detail-section {
      margin-bottom: 24px;
    }

    .rule-detail-section h3 {
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

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filters-section {
        flex-direction: column;
      }

      .rules-grid, .templates-grid {
        grid-template-columns: 1fr;
      }

      .scheduled-reminders-grid {
        grid-template-columns: 1fr;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PaymentRemindersComponent implements OnInit, OnDestroy {
  rules: ReminderRule[] = [];
  filteredRules: ReminderRule[] = [];
  templates: ReminderTemplate[] = [];
  filteredTemplates: ReminderTemplate[] = [];
  history: ReminderHistory[] = [];
  filteredHistory: ReminderHistory[] = [];
  selectedRule: ReminderRule | null = null;
  editingRule: ReminderRule | null = null;
  selectedTemplate: ReminderTemplate | null = null;
  editingTemplate: ReminderTemplate | null = null;
  searchQuery: string = '';
  templateSearchQuery: string = '';
  historySearchQuery: string = '';
  statusFilter: string = 'all';
  deliveryMethodFilter: string = 'all';
  historyStatusFilter: string = 'all';
  templateTypeFilter: string = 'all';
  activeTab: 'rules' | 'templates' | 'history' | 'scheduled' = 'rules';
  showCreateRule: boolean = false;
  showCreateTemplate: boolean = false;
  showRuleDetails: boolean = false;
  showTemplateDetails: boolean = false;
  showSendTest: boolean = false;
  testRecipient: string = '';
  testDeliveryMethod: 'push' | 'sms' | 'email' = 'email';

  newRule: Partial<ReminderRule> = {
    name: '',
    description: '',
    triggerType: 'due_date',
    daysBefore: 3,
    applicableTo: 'all',
    deliveryMethods: ['email'],
    pushEnabled: false,
    smsEnabled: false,
    emailEnabled: true,
    isActive: true,
    autoSend: true
  };

  newTemplate: Partial<ReminderTemplate> = {
    name: '',
    type: 'email',
    content: '',
    isDefault: false
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadRules();
    this.loadTemplates();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRules(): void {
    this.rules = [
      {
        id: 'rule-1',
        name: 'Payment Due Reminder',
        description: 'Send reminder 3 days before payment due date',
        triggerType: 'due_date',
        daysBefore: 3,
        applicableTo: 'all',
        deliveryMethods: ['email', 'push'],
        pushEnabled: true,
        smsEnabled: false,
        emailEnabled: true,
        pushTemplate: 'template-1',
        emailTemplate: 'template-2',
        isActive: true,
        autoSend: true,
        sendTime: '09:00',
        maxReminders: 3,
        reminderInterval: 1,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'rule-2',
        name: 'Overdue Payment Alert',
        description: 'Send alert when payment is overdue',
        triggerType: 'overdue',
        daysBefore: 0,
        daysAfter: 1,
        applicableTo: 'all',
        deliveryMethods: ['email', 'sms', 'push'],
        pushEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        isActive: true,
        autoSend: true,
        sendTime: '10:00',
        maxReminders: 5,
        reminderInterval: 2,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      }
    ];
    this.filterRules();
  }

  loadTemplates(): void {
    this.templates = [
      {
        id: 'template-1',
        name: 'Default Push Notification',
        type: 'push',
        content: 'Payment reminder: ₹{{amount}} due on {{dueDate}} for {{residentName}}',
        variables: ['{{amount}}', '{{dueDate}}', '{{residentName}}'],
        isDefault: true,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'template-2',
        name: 'Payment Due Email',
        type: 'email',
        subject: 'Payment Reminder - Invoice {{invoiceNumber}} Due',
        content: 'Dear {{residentName}},\n\nThis is a reminder that your payment of ₹{{amount}} for invoice {{invoiceNumber}} is due on {{dueDate}}.\n\nPlease make the payment at your earliest convenience.\n\nThank you.',
        variables: ['{{residentName}}', '{{amount}}', '{{invoiceNumber}}', '{{dueDate}}'],
        isDefault: true,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'template-3',
        name: 'Payment Due SMS',
        type: 'sms',
        content: 'Hi {{residentName}}, payment of ₹{{amount}} for {{invoiceNumber}} is due on {{dueDate}}. Pay now: {{paymentLink}}',
        variables: ['{{residentName}}', '{{amount}}', '{{invoiceNumber}}', '{{dueDate}}', '{{paymentLink}}'],
        isDefault: true,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      }
    ];
    this.filterTemplates();
  }

  loadHistory(): void {
    this.history = [
      {
        id: 'reminder-1',
        ruleId: 'rule-1',
        ruleName: 'Payment Due Reminder',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        amount: 5000,
        dueDate: new Date(2024, 1, 15),
        deliveryMethod: 'email',
        status: 'delivered',
        sentAt: new Date(2024, 1, 12, 9, 0),
        deliveredAt: new Date(2024, 1, 12, 9, 0, 30),
        recipient: 'rajesh@example.com',
        templateId: 'template-2',
        templateName: 'Payment Due Email',
        createdAt: new Date(2024, 1, 12)
      },
      {
        id: 'reminder-2',
        ruleId: 'rule-1',
        ruleName: 'Payment Due Reminder',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        amount: 5000,
        dueDate: new Date(2024, 1, 15),
        deliveryMethod: 'push',
        status: 'delivered',
        sentAt: new Date(2024, 1, 12, 9, 0),
        deliveredAt: new Date(2024, 1, 12, 9, 0, 5),
        recipient: 'device-token-123',
        templateId: 'template-1',
        templateName: 'Default Push Notification',
        createdAt: new Date(2024, 1, 12)
      },
      {
        id: 'reminder-3',
        ruleId: 'rule-2',
        ruleName: 'Overdue Payment Alert',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        billId: 'bill-1',
        billNumber: 'BILL-2024-001',
        amount: 3000,
        dueDate: new Date(2024, 1, 10),
        deliveryMethod: 'sms',
        status: 'sent',
        sentAt: new Date(2024, 1, 11, 10, 0),
        recipient: '+91 9876543210',
        templateId: 'template-3',
        templateName: 'Payment Due SMS',
        createdAt: new Date(2024, 1, 11)
      }
    ];
    this.filterHistory();
  }

  filterRules(): void {
    let filtered = [...this.rules];
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(r => this.statusFilter === 'active' ? r.isActive : !r.isActive);
    }
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(query) || r.description.toLowerCase().includes(query));
    }
    this.filteredRules = filtered;
  }

  filterTemplates(): void {
    let filtered = [...this.templates];
    if (this.templateTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === this.templateTypeFilter);
    }
    if (this.templateSearchQuery.trim()) {
      const query = this.templateSearchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(query));
    }
    this.filteredTemplates = filtered;
  }

  filterHistory(): void {
    let filtered = [...this.history];
    if (this.historyStatusFilter !== 'all') {
      filtered = filtered.filter(h => h.status === this.historyStatusFilter);
    }
    if (this.deliveryMethodFilter !== 'all') {
      filtered = filtered.filter(h => h.deliveryMethod === this.deliveryMethodFilter);
    }
    if (this.historySearchQuery.trim()) {
      const query = this.historySearchQuery.toLowerCase();
      filtered = filtered.filter(h => h.residentName.toLowerCase().includes(query) || h.ruleName.toLowerCase().includes(query));
    }
    filtered.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
    this.filteredHistory = filtered;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  goBack(): void {
    window.history.back();
  }

  // Statistics getters
  get activeRulesCount(): number {
    return this.rules.filter(r => r.isActive).length;
  }

  get totalSentCount(): number {
    return this.history.filter(h => h.status === 'sent' || h.status === 'delivered').length;
  }

  get deliveredCount(): number {
    return this.history.filter(h => h.status === 'delivered').length;
  }

  get pendingCount(): number {
    return this.history.filter(h => h.status === 'pending').length;
  }

  get scheduledReminders(): any[] {
    // Return scheduled reminders based on rules
    return [];
  }

  get availableVariables(): string[] {
    return ['{{residentName}}', '{{flatNumber}}', '{{amount}}', '{{dueDate}}', '{{invoiceNumber}}', '{{billNumber}}', '{{paymentLink}}'];
  }

  templateContentPlaceholder: string = 'Enter template content. Use variables like {{residentName}}, {{amount}}, {{dueDate}}';

  // Rule methods
  viewRule(rule: ReminderRule): void {
    this.selectedRule = rule;
    this.showRuleDetails = true;
  }

  editRule(rule: ReminderRule): void {
    this.editingRule = rule;
    this.newRule = { ...rule };
    this.showCreateRule = true;
  }

  toggleRule(rule: ReminderRule): void {
    rule.isActive = !rule.isActive;
    // In real app, save to backend
  }

  deleteRule(rule: ReminderRule): void {
    if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      const index = this.rules.findIndex(r => r.id === rule.id);
      if (index > -1) {
        this.rules.splice(index, 1);
        this.filterRules();
      }
    }
  }

  closeRuleModal(): void {
    this.showCreateRule = false;
    this.editingRule = null;
    this.newRule = {
      name: '',
      description: '',
      triggerType: 'due_date',
      daysBefore: 3,
      applicableTo: 'all',
      deliveryMethods: ['email'],
      pushEnabled: false,
      smsEnabled: false,
      emailEnabled: true,
      isActive: true,
      autoSend: true
    };
  }

  saveRule(): void {
    if (!this.isRuleValid()) return;

    const rule: ReminderRule = {
      id: this.editingRule?.id || 'rule-' + Date.now(),
      name: this.newRule.name!,
      description: this.newRule.description || '',
      triggerType: this.newRule.triggerType!,
      daysBefore: this.newRule.daysBefore || 0,
      daysAfter: this.newRule.daysAfter,
      applicableTo: this.newRule.applicableTo!,
      billTypes: this.newRule.billTypes,
      deliveryMethods: this.newRule.deliveryMethods || [],
      pushEnabled: this.newRule.pushEnabled || false,
      smsEnabled: this.newRule.smsEnabled || false,
      emailEnabled: this.newRule.emailEnabled || false,
      pushTemplate: this.newRule.pushTemplate,
      smsTemplate: this.newRule.smsTemplate,
      emailTemplate: this.newRule.emailTemplate,
      isActive: this.newRule.isActive ?? true,
      autoSend: this.newRule.autoSend ?? false,
      sendTime: this.newRule.sendTime,
      maxReminders: this.newRule.maxReminders,
      reminderInterval: this.newRule.reminderInterval,
      createdAt: this.editingRule?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (this.editingRule) {
      const index = this.rules.findIndex(r => r.id === rule.id);
      if (index > -1) {
        this.rules[index] = rule;
      }
    } else {
      this.rules.push(rule);
    }

    this.filterRules();
    this.closeRuleModal();
  }

  isRuleValid(): boolean {
    return !!(this.newRule.name && this.newRule.triggerType && this.newRule.applicableTo &&
      (this.newRule.pushEnabled || this.newRule.smsEnabled || this.newRule.emailEnabled));
  }

  onTriggerTypeChange(): void {
    if (this.newRule.triggerType === 'overdue') {
      this.newRule.daysBefore = undefined;
    } else {
      this.newRule.daysAfter = undefined;
    }
  }

  onApplicableToChange(): void {
    if (this.newRule.applicableTo !== 'custom') {
      this.newRule.billTypes = undefined;
    }
  }

  updateDeliveryMethods(): void {
    const methods: ('push' | 'sms' | 'email')[] = [];
    if (this.newRule.pushEnabled) methods.push('push');
    if (this.newRule.smsEnabled) methods.push('sms');
    if (this.newRule.emailEnabled) methods.push('email');
    this.newRule.deliveryMethods = methods;
  }

  // Template methods
  viewTemplate(template: ReminderTemplate): void {
    this.selectedTemplate = template;
    this.showTemplateDetails = true;
  }

  editTemplate(template: ReminderTemplate): void {
    this.editingTemplate = template;
    this.newTemplate = { ...template };
    this.showCreateTemplate = true;
  }

  deleteTemplate(template: ReminderTemplate): void {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      const index = this.templates.findIndex(t => t.id === template.id);
      if (index > -1) {
        this.templates.splice(index, 1);
        this.filterTemplates();
      }
    }
  }

  sendTestReminder(template: ReminderTemplate): void {
    this.selectedTemplate = template;
    this.testDeliveryMethod = template.type;
    this.showSendTest = true;
  }

  sendTest(): void {
    if (!this.testRecipient || !this.selectedTemplate) return;
    // In real app, send test reminder
    alert(`Test ${this.testDeliveryMethod} reminder sent to ${this.testRecipient}`);
    this.showSendTest = false;
    this.testRecipient = '';
  }

  getTestRecipientPlaceholder(): string {
    switch (this.testDeliveryMethod) {
      case 'email': return 'email@example.com';
      case 'sms': return '+91 9876543210';
      case 'push': return 'Device token';
      default: return 'Recipient';
    }
  }

  closeTemplateModal(): void {
    this.showCreateTemplate = false;
    this.editingTemplate = null;
    this.selectedTemplate = null;
    this.newTemplate = {
      name: '',
      type: 'email',
      content: '',
      isDefault: false
    };
  }

  saveTemplate(): void {
    if (!this.isTemplateValid()) return;

    const template: ReminderTemplate = {
      id: this.editingTemplate?.id || 'template-' + Date.now(),
      name: this.newTemplate.name!,
      type: this.newTemplate.type!,
      subject: this.newTemplate.subject,
      content: this.newTemplate.content!,
      variables: this.extractVariables(this.newTemplate.content!),
      isDefault: this.newTemplate.isDefault || false,
      createdAt: this.editingTemplate?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (this.editingTemplate) {
      const index = this.templates.findIndex(t => t.id === template.id);
      if (index > -1) {
        this.templates[index] = template;
      }
    } else {
      this.templates.push(template);
    }

    if (template.isDefault) {
      // Unset other defaults of same type
      this.templates.filter(t => t.type === template.type && t.id !== template.id).forEach(t => t.isDefault = false);
    }

    this.filterTemplates();
    this.closeTemplateModal();
  }

  isTemplateValid(): boolean {
    return !!(this.newTemplate.name && this.newTemplate.type && this.newTemplate.content &&
      (this.newTemplate.type !== 'email' || this.newTemplate.subject));
  }

  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? [...new Set(matches.map(m => m))] : [];
  }

  insertVariable(variable: string): void {
    if (this.newTemplate.content) {
      this.newTemplate.content += variable;
    } else {
      this.newTemplate.content = variable;
    }
  }

  getTemplatesByType(type: 'push' | 'sms' | 'email'): ReminderTemplate[] {
    return this.templates.filter(t => t.type === type);
  }

  // History methods
  viewReminder(reminder: ReminderHistory): void {
    // Show reminder details
    console.log('View reminder:', reminder);
  }

  retryReminder(reminder: ReminderHistory): void {
    if (confirm('Retry sending this reminder?')) {
      // In real app, retry sending
      reminder.status = 'pending';
      this.filterHistory();
    }
  }

  // Scheduled methods
  cancelScheduledReminder(reminder: any): void {
    if (confirm('Cancel this scheduled reminder?')) {
      // In real app, cancel scheduled reminder
      console.log('Cancel reminder:', reminder);
    }
  }

  sendReminderNow(reminder: any): void {
    if (confirm('Send this reminder now?')) {
      // In real app, send reminder immediately
      console.log('Send reminder now:', reminder);
    }
  }

  // Label methods
  getTriggerTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'due_date': 'Before Due Date',
      'overdue': 'Overdue',
      'upcoming': 'Upcoming',
      'custom': 'Custom'
    };
    return labels[type] || type;
  }

  getTriggerDescription(rule: ReminderRule): string {
    switch (rule.triggerType) {
      case 'due_date':
        return `${rule.daysBefore || 0} days before due date`;
      case 'overdue':
        return `${rule.daysAfter || 0} days after due date`;
      case 'upcoming':
        return `${rule.daysBefore || 0} days before upcoming payment`;
      default:
        return 'Custom trigger';
    }
  }

  getApplicableToLabel(applicableTo: string): string {
    const labels: { [key: string]: string } = {
      'all': 'All Payments',
      'invoices': 'Invoices Only',
      'bills': 'Bills Only',
      'installments': 'Installments Only',
      'custom': 'Custom'
    };
    return labels[applicableTo] || applicableTo;
  }

  getDeliveryMethodsLabel(rule: ReminderRule | any): string {
    const methods: string[] = [];
    if (rule.pushEnabled || rule.deliveryMethod === 'push') methods.push('Push');
    if (rule.smsEnabled || rule.deliveryMethod === 'sms') methods.push('SMS');
    if (rule.emailEnabled || rule.deliveryMethod === 'email') methods.push('Email');
    return methods.length > 0 ? methods.join(', ') : 'None';
  }

  getTemplateTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'push': 'Push',
      'sms': 'SMS',
      'email': 'Email'
    };
    return labels[type] || type;
  }

  getDeliveryMethodLabel(method: string): string {
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  getReminderStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'sent': 'Sent',
      'delivered': 'Delivered',
      'failed': 'Failed',
      'pending': 'Pending'
    };
    return labels[status] || status;
  }

  getDaysUntilClass(days: number): string {
    if (days <= 1) return 'urgent';
    if (days <= 3) return 'soon';
    return 'upcoming';
  }
}
