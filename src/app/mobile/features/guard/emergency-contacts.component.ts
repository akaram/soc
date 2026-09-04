import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Emergency Contacts Quick Dial Component
 * Allows guards to quickly dial emergency contacts without phone numbers
 */
interface EmergencyContact {
  id: string;
  name: string;
  category: 'police' | 'fire' | 'medical' | 'security' | 'management' | 'maintenance' | 'other';
  department?: string;
  designation?: string;
  extension?: string;
  isAvailable: boolean;
  lastCalled?: Date;
  callCount: number;
  isFavorite: boolean;
  notes?: string;
}

@Component({
  selector: 'app-emergency-contacts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="emergency-contacts-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">phone</i>
            Emergency Contacts
          </h1>
          <p>Quick dial emergency contacts</p>
        </div>
        <button class="icon-btn" (click)="showAddContact = true" title="Add Contact">
          <i class="material-icons">add</i>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search contacts..." 
            [(ngModel)]="searchQuery"
            (input)="filterContacts()"
          />
          <button class="clear-search" *ngIf="searchQuery" (click)="clearSearch()">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="category-tabs">
        <button 
          class="category-tab" 
          [class.active]="activeCategory === 'all'"
          (click)="setCategory('all')">
          <i class="material-icons">apps</i>
          All
        </button>
        <button 
          class="category-tab" 
          [class.active]="activeCategory === 'police'"
          (click)="setCategory('police')">
          <i class="material-icons">local_police</i>
          Police
        </button>
        <button 
          class="category-tab" 
          [class.active]="activeCategory === 'fire'"
          (click)="setCategory('fire')">
          <i class="material-icons">fire_truck</i>
          Fire
        </button>
        <button 
          class="category-tab" 
          [class.active]="activeCategory === 'medical'"
          (click)="setCategory('medical')">
          <i class="material-icons">medical_services</i>
          Medical
        </button>
        <button 
          class="category-tab" 
          [class.active]="activeCategory === 'security'"
          (click)="setCategory('security')">
          <i class="material-icons">security</i>
          Security
        </button>
        <button 
          class="category-tab" 
          [class.active]="activeCategory === 'favorites'"
          (click)="setCategory('favorites')">
          <i class="material-icons">star</i>
          Favorites
        </button>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-section" *ngIf="activeCategory === 'all' || activeCategory === 'favorites'">
        <h3>Quick Dial</h3>
        <div class="quick-dial-grid">
          <button 
            class="quick-dial-btn police" 
            (click)="quickDial('police')"
            *ngIf="getQuickDialContact('police')">
            <i class="material-icons">local_police</i>
            <span>Police</span>
            <small>{{ getQuickDialContact('police')?.name }}</small>
          </button>
          <button 
            class="quick-dial-btn fire" 
            (click)="quickDial('fire')"
            *ngIf="getQuickDialContact('fire')">
            <i class="material-icons">fire_truck</i>
            <span>Fire</span>
            <small>{{ getQuickDialContact('fire')?.name }}</small>
          </button>
          <button 
            class="quick-dial-btn medical" 
            (click)="quickDial('medical')"
            *ngIf="getQuickDialContact('medical')">
            <i class="material-icons">medical_services</i>
            <span>Medical</span>
            <small>{{ getQuickDialContact('medical')?.name }}</small>
          </button>
          <button 
            class="quick-dial-btn security" 
            (click)="quickDial('security')"
            *ngIf="getQuickDialContact('security')">
            <i class="material-icons">security</i>
            <span>Security</span>
            <small>{{ getQuickDialContact('security')?.name }}</small>
          </button>
        </div>
      </div>

      <!-- Contacts List -->
      <div class="contacts-list">
        <div 
          class="contact-item" 
          *ngFor="let contact of filteredContacts"
          [class.favorite]="contact.isFavorite"
          [class.unavailable]="!contact.isAvailable">
          <div class="contact-icon" [ngClass]="contact.category">
            <i class="material-icons">{{ getCategoryIcon(contact.category) }}</i>
          </div>
          <div class="contact-info">
            <div class="contact-header">
              <h3>{{ contact.name }}</h3>
              <button 
                class="favorite-btn" 
                (click)="toggleFavorite(contact)"
                [class.active]="contact.isFavorite">
                <i class="material-icons">{{ contact.isFavorite ? 'star' : 'star_border' }}</i>
              </button>
            </div>
            <p class="contact-details">
              <span *ngIf="contact.department">{{ contact.department }}</span>
              <span *ngIf="contact.designation">{{ contact.designation }}</span>
              <span *ngIf="contact.extension">Ext: {{ contact.extension }}</span>
            </p>
            <div class="contact-meta">
              <span class="category-badge" [ngClass]="contact.category">
                {{ getCategoryLabel(contact.category) }}
              </span>
              <span class="call-count" *ngIf="contact.callCount > 0">
                <i class="material-icons">phone</i>
                {{ contact.callCount }}
              </span>
              <span class="last-called" *ngIf="contact.lastCalled">
                Last: {{ formatTime(contact.lastCalled) }}
              </span>
            </div>
          </div>
          <div class="contact-actions">
            <button 
              class="call-btn" 
              (click)="dialContact(contact)"
              [disabled]="!contact.isAvailable"
              [title]="contact.isAvailable ? 'Call' : 'Unavailable'">
              <i class="material-icons">phone</i>
            </button>
            <button 
              class="info-btn" 
              (click)="viewContactDetails(contact)"
              title="View Details">
              <i class="material-icons">info</i>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredContacts.length === 0">
          <i class="material-icons">contacts</i>
          <p>No contacts found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Contact Details Modal -->
      <div class="modal-overlay" *ngIf="selectedContact" (click)="closeContactDetails()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Contact Details</h2>
            <button class="close-btn" (click)="closeContactDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedContact">
            <div class="detail-section">
              <div class="detail-icon" [ngClass]="selectedContact.category">
                <i class="material-icons">{{ getCategoryIcon(selectedContact.category) }}</i>
              </div>
              <h3>{{ selectedContact.name }}</h3>
              <div class="detail-info">
                <div class="detail-row" *ngIf="selectedContact.department">
                  <span class="label">Department:</span>
                  <span class="value">{{ selectedContact.department }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedContact.designation">
                  <span class="label">Designation:</span>
                  <span class="value">{{ selectedContact.designation }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedContact.extension">
                  <span class="label">Extension:</span>
                  <span class="value">{{ selectedContact.extension }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Category:</span>
                  <span class="value category-badge" [ngClass]="selectedContact.category">
                    {{ getCategoryLabel(selectedContact.category) }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span>
                  <span class="value" [ngClass]="selectedContact.isAvailable ? 'available' : 'unavailable'">
                    {{ selectedContact.isAvailable ? 'Available' : 'Unavailable' }}
                  </span>
                </div>
                <div class="detail-row" *ngIf="selectedContact.notes">
                  <span class="label">Notes:</span>
                  <span class="value">{{ selectedContact.notes }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedContact.callCount > 0">
                  <span class="label">Total Calls:</span>
                  <span class="value">{{ selectedContact.callCount }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedContact.lastCalled">
                  <span class="label">Last Called:</span>
                  <span class="value">{{ formatDateTime(selectedContact.lastCalled) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeContactDetails()">Close</button>
            <button 
              class="btn btn-primary" 
              (click)="dialContact(selectedContact!)"
              [disabled]="!selectedContact?.isAvailable">
              <i class="material-icons">phone</i>
              Call Now
            </button>
          </div>
        </div>
      </div>

      <!-- Add Contact Modal -->
      <div class="modal-overlay" *ngIf="showAddContact" (click)="showAddContact = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Emergency Contact</h2>
            <button class="close-btn" (click)="showAddContact = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newContact.name" placeholder="Contact name" />
            </div>
            <div class="form-group">
              <label>Category <span class="required">*</span></label>
              <select [(ngModel)]="newContact.category">
                <option value="police">Police</option>
                <option value="fire">Fire</option>
                <option value="medical">Medical</option>
                <option value="security">Security</option>
                <option value="management">Management</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Department</label>
              <input type="text" [(ngModel)]="newContact.department" placeholder="Department name" />
            </div>
            <div class="form-group">
              <label>Designation</label>
              <input type="text" [(ngModel)]="newContact.designation" placeholder="Job title" />
            </div>
            <div class="form-group">
              <label>Extension</label>
              <input type="text" [(ngModel)]="newContact.extension" placeholder="Extension number" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newContact.notes" placeholder="Additional notes" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showAddContact = false">Cancel</button>
            <button class="btn btn-primary" (click)="addContact()" [disabled]="!newContact.name || !newContact.category">
              Add Contact
            </button>
          </div>
        </div>
      </div>

      <!-- Calling Modal -->
      <div class="calling-modal" *ngIf="isCalling">
        <div class="calling-content">
          <div class="calling-icon">
            <i class="material-icons">phone</i>
          </div>
          <h3>Calling...</h3>
          <p>{{ callingContact?.name }}</p>
          <button class="btn-end-call" (click)="endCall()">
            <i class="material-icons">call_end</i>
            End Call
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .emergency-contacts-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 16px;
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

    .back-btn:hover,
    .icon-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    /* Search Section */
    .search-section {
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      background: #f5f7fa;
      border-radius: 24px;
      padding: 8px 16px;
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

    .clear-search {
      background: none;
      border: none;
      color: #95a5a6;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }

    /* Category Tabs */
    .category-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
      overflow-x: auto;
    }

    .category-tab {
      padding: 8px 16px;
      border: none;
      background: #f5f7fa;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      color: #7f8c8d;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .category-tab.active {
      background: #e74c3c;
      color: white;
    }

    .category-tab .material-icons {
      font-size: 18px;
    }

    /* Quick Actions */
    .quick-actions-section {
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
    }

    .quick-actions-section h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .quick-dial-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .quick-dial-btn {
      padding: 16px;
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }

    .quick-dial-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .quick-dial-btn .material-icons {
      font-size: 32px;
    }

    .quick-dial-btn small {
      font-size: 11px;
      opacity: 0.9;
    }

    .quick-dial-btn.police { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .quick-dial-btn.fire { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .quick-dial-btn.medical { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .quick-dial-btn.security { background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); }

    /* Contacts List */
    .contacts-list {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-item {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: all 0.2s;
    }

    .contact-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .contact-item.favorite {
      border-left: 4px solid #f39c12;
    }

    .contact-item.unavailable {
      opacity: 0.6;
    }

    .contact-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .contact-icon.police { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .contact-icon.fire { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .contact-icon.medical { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .contact-icon.security { background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); }
    .contact-icon.management { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .contact-icon.maintenance { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .contact-icon.other { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); }

    .contact-info {
      flex: 1;
      min-width: 0;
    }

    .contact-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .contact-info h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .favorite-btn {
      background: none;
      border: none;
      color: #f39c12;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
    }

    .favorite-btn.active {
      color: #f39c12;
    }

    .contact-details {
      margin: 4px 0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .contact-details span {
      margin-right: 8px;
    }

    .contact-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .category-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .category-badge.police { background: #e7f3ff; color: #2980b9; }
    .category-badge.fire { background: #ffeaea; color: #c0392b; }
    .category-badge.medical { background: #e8f8f0; color: #1e9e5a; }
    .category-badge.security { background: #f0f0f0; color: #7f8c8d; }
    .category-badge.management { background: #f4e7ff; color: #8e44ad; }
    .category-badge.maintenance { background: #fff4e6; color: #e67e22; }
    .category-badge.other { background: #e9ecef; color: #2c3e50; }

    .call-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #95a5a6;
    }

    .call-count .material-icons {
      font-size: 14px;
    }

    .last-called {
      font-size: 11px;
      color: #95a5a6;
    }

    .contact-actions {
      display: flex;
      gap: 8px;
    }

    .call-btn,
    .info-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .call-btn {
      background: #2ed573;
      color: white;
    }

    .call-btn:hover:not(:disabled) {
      background: #1e9e5a;
      transform: scale(1.1);
    }

    .call-btn:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .info-btn {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .info-btn:hover {
      background: #e9ecef;
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
      max-width: 500px;
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

    .detail-section {
      text-align: center;
    }

    .detail-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: white;
    }

    .detail-section h3 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-info {
      text-align: left;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f5f7fa;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-weight: 500;
      color: #7f8c8d;
      font-size: 14px;
    }

    .detail-row .value {
      color: #2c3e50;
      font-size: 14px;
      font-weight: 500;
    }

    .value.available {
      color: #2ed573;
    }

    .value.unavailable {
      color: #e74c3c;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
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

    /* Calling Modal */
    .calling-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .calling-content {
      text-align: center;
      color: white;
    }

    .calling-icon {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: #2ed573;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .calling-icon .material-icons {
      font-size: 64px;
      color: white;
    }

    .calling-content h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .calling-content p {
      margin: 0 0 32px 0;
      font-size: 18px;
      opacity: 0.9;
    }

    .btn-end-call {
      padding: 16px 32px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto;
    }

    .btn-end-call:hover {
      background: #c0392b;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
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
    }

    @media (max-width: 768px) {
      .quick-dial-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EmergencyContactsComponent implements OnInit, OnDestroy {
  contacts: EmergencyContact[] = [];
  filteredContacts: EmergencyContact[] = [];
  selectedContact: EmergencyContact | null = null;
  callingContact: EmergencyContact | null = null;
  searchQuery: string = '';
  activeCategory: 'all' | 'police' | 'fire' | 'medical' | 'security' | 'favorites' = 'all';
  showAddContact: boolean = false;
  isCalling: boolean = false;

  newContact: Partial<EmergencyContact> = {
    name: '',
    category: 'other',
    isAvailable: true,
    callCount: 0,
    isFavorite: false
  };

  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.loadContacts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load emergency contacts
   */
  loadContacts(): void {
    // Simulate loading contacts
    this.contacts = [
      {
        id: '1',
        name: 'Police Control Room',
        category: 'police',
        department: 'Police Department',
        extension: '100',
        isAvailable: true,
        callCount: 5,
        isFavorite: true
      },
      {
        id: '2',
        name: 'Fire Department',
        category: 'fire',
        department: 'Fire Services',
        extension: '101',
        isAvailable: true,
        callCount: 2,
        isFavorite: true
      },
      {
        id: '3',
        name: 'Ambulance Service',
        category: 'medical',
        department: 'Medical Emergency',
        extension: '102',
        isAvailable: true,
        callCount: 8,
        isFavorite: true
      },
      {
        id: '4',
        name: 'Security Control',
        category: 'security',
        department: 'Security Department',
        extension: '200',
        isAvailable: true,
        callCount: 12,
        isFavorite: false
      },
      {
        id: '5',
        name: 'Society Manager',
        category: 'management',
        department: 'Management',
        designation: 'Manager',
        extension: '300',
        isAvailable: true,
        callCount: 3,
        isFavorite: false
      },
      {
        id: '6',
        name: 'Maintenance Team',
        category: 'maintenance',
        department: 'Maintenance',
        extension: '400',
        isAvailable: false,
        callCount: 1,
        isFavorite: false
      }
    ];
    this.filterContacts();
  }

  /**
   * Filter contacts based on search and category
   */
  filterContacts(): void {
    let filtered = [...this.contacts];

    // Apply category filter
    if (this.activeCategory !== 'all') {
      if (this.activeCategory === 'favorites') {
        filtered = filtered.filter(c => c.isFavorite);
      } else {
        filtered = filtered.filter(c => c.category === this.activeCategory);
      }
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.department && c.department.toLowerCase().includes(query)) ||
        (c.designation && c.designation.toLowerCase().includes(query))
      );
    }

    // Sort: favorites first, then by call count
    filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return b.callCount - a.callCount;
    });

    this.filteredContacts = filtered;
  }

  /**
   * Set active category
   */
  setCategory(category: 'all' | 'police' | 'fire' | 'medical' | 'security' | 'favorites'): void {
    this.activeCategory = category;
    this.filterContacts();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterContacts();
  }

  /**
   * Get quick dial contact for category
   */
  getQuickDialContact(category: 'police' | 'fire' | 'medical' | 'security'): EmergencyContact | null {
    return this.contacts.find(c => c.category === category && c.isAvailable) || null;
  }

  /**
   * Quick dial by category
   */
  quickDial(category: 'police' | 'fire' | 'medical' | 'security'): void {
    const contact = this.getQuickDialContact(category);
    if (contact) {
      this.dialContact(contact);
    }
  }

  /**
   * Dial a contact
   */
  dialContact(contact: EmergencyContact): void {
    if (!contact.isAvailable) {
      return;
    }

    this.callingContact = contact;
    this.isCalling = true;

    // Update call count and last called
    contact.callCount++;
    contact.lastCalled = new Date();

    // Simulate call
    setTimeout(() => {
      // In real app, this would initiate the actual call
      console.log('Calling:', contact.name);
    }, 1000);
  }

  /**
   * End call
   */
  endCall(): void {
    this.isCalling = false;
    this.callingContact = null;
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(contact: EmergencyContact): void {
    contact.isFavorite = !contact.isFavorite;
    this.filterContacts();
  }

  /**
   * View contact details
   */
  viewContactDetails(contact: EmergencyContact): void {
    this.selectedContact = contact;
  }

  /**
   * Close contact details
   */
  closeContactDetails(): void {
    this.selectedContact = null;
  }

  /**
   * Add new contact
   */
  addContact(): void {
    if (!this.newContact.name || !this.newContact.category) {
      return;
    }

    const contact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: this.newContact.name!,
      category: this.newContact.category as any,
      department: this.newContact.department,
      designation: this.newContact.designation,
      extension: this.newContact.extension,
      isAvailable: this.newContact.isAvailable ?? true,
      callCount: 0,
      isFavorite: this.newContact.isFavorite ?? false,
      notes: this.newContact.notes
    };

    this.contacts.push(contact);
    this.filterContacts();
    this.showAddContact = false;
    this.newContact = {
      name: '',
      category: 'other',
      isAvailable: true,
      callCount: 0,
      isFavorite: false
    };
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      police: 'local_police',
      fire: 'fire_truck',
      medical: 'medical_services',
      security: 'security',
      management: 'business',
      maintenance: 'build',
      other: 'contact_phone'
    };
    return icons[category] || 'contact_phone';
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      police: 'Police',
      fire: 'Fire',
      medical: 'Medical',
      security: 'Security',
      management: 'Management',
      maintenance: 'Maintenance',
      other: 'Other'
    };
    return labels[category] || 'Other';
  }

  /**
   * Format time
   */
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Format date time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

