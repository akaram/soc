import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Resident Communication Component
 * Allows guards to communicate with residents through in-app messaging (without phone numbers)
 */
interface Resident {
  id: string;
  name: string;
  flatNumber: string;
  building?: string;
  profileImage?: string;
  isOnline: boolean;
  lastSeen?: Date;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'alert' | 'notification';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

@Component({
  selector: 'app-resident-communication',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="resident-communication-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()" *ngIf="!selectedResident">
          <i class="material-icons">arrow_back</i>
        </button>
        <button class="back-btn" (click)="closeChat()" *ngIf="selectedResident">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1 *ngIf="!selectedResident">
            <i class="material-icons">chat</i>
            Resident Communication
          </h1>
          <div class="chat-header" *ngIf="selectedResident">
            <div class="resident-avatar" *ngIf="selectedResident.profileImage">
              <img [src]="selectedResident.profileImage" [alt]="selectedResident.name" />
              <span class="online-indicator" *ngIf="selectedResident.isOnline"></span>
            </div>
            <div class="resident-avatar-placeholder" *ngIf="!selectedResident.profileImage">
              <i class="material-icons">person</i>
              <span class="online-indicator" *ngIf="selectedResident.isOnline"></span>
            </div>
            <div class="resident-info">
              <h2>{{ selectedResident.name }}</h2>
              <p>{{ selectedResident.flatNumber }}<span *ngIf="selectedResident.building">, {{ selectedResident.building }}</span></p>
            </div>
          </div>
        </div>
        <div class="header-actions" *ngIf="!selectedResident">
          <button class="icon-btn" (click)="refreshResidents()" [disabled]="isLoading">
            <i class="material-icons">refresh</i>
          </button>
        </div>
      </div>

      <!-- Residents List View -->
      <div class="residents-list-view" *ngIf="!selectedResident">
        <!-- Search Bar -->
        <div class="search-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search residents by name or flat number..." 
              [(ngModel)]="searchQuery"
              (input)="filterResidents()"
            />
            <button class="clear-search" *ngIf="searchQuery" (click)="clearSearch()">
              <i class="material-icons">close</i>
            </button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
          <button 
            class="filter-tab" 
            [class.active]="activeFilter === 'all'"
            (click)="setFilter('all')">
            All ({{ residents.length }})
          </button>
          <button 
            class="filter-tab" 
            [class.active]="activeFilter === 'online'"
            (click)="setFilter('online')">
            Online ({{ onlineResidents.length }})
          </button>
          <button 
            class="filter-tab" 
            [class.active]="activeFilter === 'unread'"
            (click)="setFilter('unread')">
            Unread ({{ unreadResidents.length }})
          </button>
        </div>

        <!-- Residents List -->
        <div class="residents-list">
          <div 
            class="resident-item" 
            *ngFor="let resident of filteredResidents"
            (click)="selectResident(resident)"
            [class.has-unread]="resident.unreadCount > 0">
            <div class="resident-avatar" *ngIf="resident.profileImage">
              <img [src]="resident.profileImage" [alt]="resident.name" />
              <span class="online-indicator" *ngIf="resident.isOnline"></span>
            </div>
            <div class="resident-avatar-placeholder" *ngIf="!resident.profileImage">
              <i class="material-icons">person</i>
              <span class="online-indicator" *ngIf="resident.isOnline"></span>
            </div>
            <div class="resident-details">
              <div class="resident-name-row">
                <h3>{{ resident.name }}</h3>
                <span class="timestamp" *ngIf="getLastMessage(resident.id)">
                  {{ getLastMessage(resident.id)?.timestamp | date:'short' }}
                </span>
              </div>
              <p class="flat-info">{{ resident.flatNumber }}<span *ngIf="resident.building">, {{ resident.building }}</span></p>
              <p class="last-message" *ngIf="getLastMessage(resident.id)">
                {{ getLastMessage(resident.id)?.content }}
              </p>
            </div>
            <div class="resident-actions">
              <span class="unread-badge" *ngIf="resident.unreadCount > 0">
                {{ resident.unreadCount }}
              </span>
              <i class="material-icons">chevron_right</i>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredResidents.length === 0 && !isLoading">
            <i class="material-icons">inbox</i>
            <p>No residents found</p>
            <span *ngIf="searchQuery">Try adjusting your search</span>
          </div>

          <!-- Loading State -->
          <div class="loading-state" *ngIf="isLoading">
            <i class="material-icons">refresh</i>
            <p>Loading residents...</p>
          </div>
        </div>
      </div>

      <!-- Chat View -->
      <div class="chat-view" *ngIf="selectedResident">
        <!-- Messages Area -->
        <div class="messages-container" #messagesContainer>
          <div class="messages-list">
            <div 
              class="message-item" 
              *ngFor="let message of currentMessages"
              [class.sent]="message.senderId === currentGuardId"
              [class.received]="message.senderId !== currentGuardId"
              [class.alert]="message.messageType === 'alert'"
              [class.priority-high]="message.priority === 'high'"
              [class.priority-urgent]="message.priority === 'urgent'">
              <div class="message-content">
                <div class="message-header" *ngIf="message.messageType === 'alert'">
                  <i class="material-icons">notifications</i>
                  <span class="priority-badge" *ngIf="message.priority">{{ message.priority }}</span>
                </div>
                <p>{{ message.content }}</p>
                <div class="message-footer">
                  <span class="timestamp">{{ message.timestamp | date:'short' }}</span>
                  <i class="material-icons read-indicator" *ngIf="message.senderId === currentGuardId">
                    {{ message.isRead ? 'done_all' : 'done' }}
                  </i>
                </div>
              </div>
            </div>

            <!-- Empty Chat State -->
            <div class="empty-chat" *ngIf="currentMessages.length === 0">
              <i class="material-icons">chat_bubble_outline</i>
              <p>No messages yet</p>
              <span>Start a conversation with {{ selectedResident.name }}</span>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="message-input-container">
          <div class="quick-actions">
            <button class="quick-action-btn" (click)="showQuickMessages = !showQuickMessages">
              <i class="material-icons">flash_on</i>
              Quick Messages
            </button>
            <button class="quick-action-btn" (click)="showAlertDialog = true">
              <i class="material-icons">warning</i>
              Send Alert
            </button>
          </div>

          <!-- Quick Messages Dropdown -->
          <div class="quick-messages-dropdown" *ngIf="showQuickMessages">
            <button 
              class="quick-message-item"
              *ngFor="let quickMsg of quickMessages"
              (click)="sendQuickMessage(quickMsg)">
              {{ quickMsg }}
            </button>
          </div>

          <div class="input-wrapper">
            <textarea 
              [(ngModel)]="newMessage"
              placeholder="Type your message..."
              (keydown)="onEnterKey($event)"
              rows="1"
              #messageInput>
            </textarea>
            <button 
              class="send-btn" 
              (click)="sendMessage()"
              [disabled]="!newMessage.trim() || isSending">
              <i class="material-icons">send</i>
            </button>
          </div>
        </div>
      </div>

      <!-- Alert Dialog -->
      <div class="modal-overlay" *ngIf="showAlertDialog" (click)="showAlertDialog = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Send Alert</h3>
            <button class="close-btn" (click)="showAlertDialog = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Priority Level</label>
              <select [(ngModel)]="alertPriority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div class="form-group">
              <label>Alert Message</label>
              <textarea 
                [(ngModel)]="alertMessage"
                placeholder="Enter alert message..."
                rows="4">
              </textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showAlertDialog = false">Cancel</button>
            <button class="btn btn-primary" (click)="sendAlert()" [disabled]="!alertMessage.trim()">
              Send Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .resident-communication-container {
      min-height: 100vh;
      background: #f5f7fa;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn {
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

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .resident-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      position: relative;
      overflow: hidden;
    }

    .resident-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .resident-avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .online-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #2ed573;
      border: 2px solid white;
    }

    .resident-info h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .resident-info p {
      margin: 2px 0 0 0;
      font-size: 12px;
      opacity: 0.9;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .icon-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .icon-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.3);
    }

    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Residents List View */
    .residents-list-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
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

    /* Filter Tabs */
    .filter-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
      overflow-x: auto;
    }

    .filter-tab {
      padding: 8px 16px;
      border: none;
      background: #f5f7fa;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      color: #7f8c8d;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .filter-tab.active {
      background: #3498db;
      color: white;
    }

    /* Residents List */
    .residents-list {
      flex: 1;
      overflow-y: auto;
      background: white;
    }

    .resident-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #f5f7fa;
      cursor: pointer;
      transition: background 0.2s;
    }

    .resident-item:hover {
      background: #f8f9fa;
    }

    .resident-item.has-unread {
      background: #f0f7ff;
    }

    .resident-item .resident-avatar,
    .resident-item .resident-avatar-placeholder {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .resident-item .resident-avatar-placeholder {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
    }

    .resident-details {
      flex: 1;
      min-width: 0;
    }

    .resident-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .resident-details h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .timestamp {
      font-size: 11px;
      color: #95a5a6;
    }

    .flat-info {
      margin: 2px 0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .last-message {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #7f8c8d;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .resident-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .unread-badge {
      background: #e74c3c;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      min-width: 20px;
      text-align: center;
    }

    .resident-actions .material-icons {
      color: #bdc3c7;
      font-size: 20px;
    }

    /* Chat View */
    .chat-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      background: #f5f7fa;
      padding: 16px;
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message-item {
      display: flex;
      max-width: 75%;
    }

    .message-item.sent {
      align-self: flex-end;
      margin-left: auto;
    }

    .message-item.received {
      align-self: flex-start;
    }

    .message-content {
      padding: 12px 16px;
      border-radius: 16px;
      background: white;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .message-item.sent .message-content {
      background: #3498db;
      color: white;
    }

    .message-item.alert .message-content {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
    }

    .message-item.priority-high .message-content {
      border-left-color: #ff9800;
    }

    .message-item.priority-urgent .message-content {
      background: #f8d7da;
      border-left-color: #dc3545;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .priority-badge {
      background: #ffc107;
      color: #856404;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .message-content p {
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
    }

    .message-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      gap: 8px;
    }

    .message-footer .timestamp {
      font-size: 11px;
      opacity: 0.7;
    }

    .read-indicator {
      font-size: 16px !important;
      opacity: 0.7;
    }

    .empty-chat {
      text-align: center;
      padding: 40px 20px;
      color: #95a5a6;
    }

    .empty-chat .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    /* Message Input */
    .message-input-container {
      background: white;
      border-top: 1px solid #e9ecef;
      padding: 12px 16px;
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .quick-action-btn {
      padding: 6px 12px;
      border: 1px solid #e9ecef;
      background: white;
      border-radius: 16px;
      font-size: 12px;
      color: #7f8c8d;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }

    .quick-action-btn:hover {
      background: #f5f7fa;
      border-color: #3498db;
      color: #3498db;
    }

    .quick-messages-dropdown {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 8px;
      max-height: 200px;
      overflow-y: auto;
    }

    .quick-message-item {
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: white;
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      color: #2c3e50;
      transition: background 0.2s;
    }

    .quick-message-item:hover {
      background: #f5f7fa;
    }

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: #f5f7fa;
      border-radius: 24px;
      padding: 8px 12px;
    }

    .input-wrapper textarea {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      resize: none;
      font-size: 14px;
      font-family: inherit;
      max-height: 100px;
      overflow-y: auto;
    }

    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: #3498db;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      background: #2980b9;
    }

    .send-btn:disabled {
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

    .modal-header h3 {
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

    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #3498db;
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

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Empty States */
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 40px 20px;
      color: #95a5a6;
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .loading-state .material-icons {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .message-item {
        max-width: 85%;
      }
    }
  `]
})
export class ResidentCommunicationComponent implements OnInit, OnDestroy {
  residents: Resident[] = [];
  filteredResidents: Resident[] = [];
  selectedResident: Resident | null = null;
  currentMessages: Message[] = [];
  searchQuery: string = '';
  activeFilter: 'all' | 'online' | 'unread' = 'all';
  isLoading: boolean = false;
  isSending: boolean = false;
  newMessage: string = '';
  showQuickMessages: boolean = false;
  showAlertDialog: boolean = false;
  alertPriority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  alertMessage: string = '';
  currentGuardId: string = 'guard-001'; // In real app, get from auth service

  private destroy$ = new Subject<void>();

  // Quick messages for common communications
  quickMessages: string[] = [
    'Visitor arrived at gate',
    'Package delivery received',
    'Maintenance request update',
    'Security alert - please check',
    'Gate access granted',
    'Emergency - please respond',
    'Document verification required',
    'Parking space available'
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadResidents();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load residents list (without phone numbers)
   */
  loadResidents(): void {
    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.residents = [
        {
          id: 'res-001',
          name: 'Rajesh Kumar',
          flatNumber: 'A-101',
          building: 'Tower A',
          isOnline: true,
          unreadCount: 2
        },
        {
          id: 'res-002',
          name: 'Priya Sharma',
          flatNumber: 'B-205',
          building: 'Tower B',
          isOnline: false,
          unreadCount: 0
        },
        {
          id: 'res-003',
          name: 'Amit Patel',
          flatNumber: 'C-301',
          building: 'Tower C',
          isOnline: true,
          unreadCount: 1
        },
        {
          id: 'res-004',
          name: 'Sneha Reddy',
          flatNumber: 'A-102',
          building: 'Tower A',
          isOnline: false,
          unreadCount: 0
        },
        {
          id: 'res-005',
          name: 'Vikram Singh',
          flatNumber: 'B-103',
          building: 'Tower B',
          isOnline: true,
          unreadCount: 3
        }
      ];
      this.filterResidents();
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Filter residents based on search query and active filter
   */
  filterResidents(): void {
    let filtered = [...this.residents];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.flatNumber.toLowerCase().includes(query) ||
        (r.building && r.building.toLowerCase().includes(query))
      );
    }

    // Apply active filter
    switch (this.activeFilter) {
      case 'online':
        filtered = filtered.filter(r => r.isOnline);
        break;
      case 'unread':
        filtered = filtered.filter(r => r.unreadCount > 0);
        break;
    }

    this.filteredResidents = filtered;
  }

  /**
   * Set active filter
   */
  setFilter(filter: 'all' | 'online' | 'unread'): void {
    this.activeFilter = filter;
    this.filterResidents();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterResidents();
  }

  /**
   * Get online residents count
   */
  get onlineResidents(): Resident[] {
    return this.residents.filter(r => r.isOnline);
  }

  /**
   * Get unread residents count
   */
  get unreadResidents(): Resident[] {
    return this.residents.filter(r => r.unreadCount > 0);
  }

  /**
   * Select resident and load messages
   */
  selectResident(resident: Resident): void {
    this.selectedResident = resident;
    this.loadMessages(resident.id);
    // Mark as read
    resident.unreadCount = 0;
  }

  /**
   * Close chat and return to list
   */
  closeChat(): void {
    this.selectedResident = null;
    this.currentMessages = [];
  }

  /**
   * Load messages for selected resident
   */
  loadMessages(residentId: string): void {
    // Simulate loading messages
    setTimeout(() => {
      this.currentMessages = [
        {
          id: 'msg-001',
          senderId: 'res-001',
          senderName: 'Rajesh Kumar',
          receiverId: this.currentGuardId,
          receiverName: 'Guard',
          content: 'Hello, I have a visitor coming in 10 minutes.',
          timestamp: new Date(Date.now() - 3600000),
          isRead: true,
          messageType: 'text'
        },
        {
          id: 'msg-002',
          senderId: this.currentGuardId,
          senderName: 'Guard',
          receiverId: 'res-001',
          receiverName: 'Rajesh Kumar',
          content: 'Noted. I will inform you when they arrive.',
          timestamp: new Date(Date.now() - 3300000),
          isRead: true,
          messageType: 'text'
        }
      ];
      this.scrollToBottom();
    }, 500);
  }

  /**
   * Get last message for a resident
   */
  getLastMessage(residentId: string): Message | null {
    // In real app, get from messages cache
    return null;
  }

  /**
   * Send message
   */
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedResident || this.isSending) {
      return;
    }

    this.isSending = true;
    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: this.currentGuardId,
      senderName: 'Guard',
      receiverId: this.selectedResident.id,
      receiverName: this.selectedResident.name,
      content: this.newMessage.trim(),
      timestamp: new Date(),
      isRead: false,
      messageType: 'text'
    };

    // Simulate sending
    setTimeout(() => {
      this.currentMessages.push(message);
      this.newMessage = '';
      this.isSending = false;
      this.scrollToBottom();
    }, 300);
  }

  /**
   * Send quick message
   */
  sendQuickMessage(message: string): void {
    this.newMessage = message;
    this.showQuickMessages = false;
    this.sendMessage();
  }

  /**
   * Send alert message
   */
  sendAlert(): void {
    if (!this.alertMessage.trim() || !this.selectedResident) {
      return;
    }

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: this.currentGuardId,
      senderName: 'Guard',
      receiverId: this.selectedResident.id,
      receiverName: this.selectedResident.name,
      content: this.alertMessage.trim(),
      timestamp: new Date(),
      isRead: false,
      messageType: 'alert',
      priority: this.alertPriority
    };

    this.currentMessages.push(message);
    this.alertMessage = '';
    this.showAlertDialog = false;
    this.scrollToBottom();
  }

  /**
   * Handle Enter key in textarea
   */
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  /**
   * Refresh residents list
   */
  refreshResidents(): void {
    this.loadResidents();
  }

  /**
   * Setup auto-refresh for residents and messages
   */
  setupAutoRefresh(): void {
    // In real app, use WebSocket or polling for real-time updates
    // setInterval(() => {
    //   if (!this.selectedResident) {
    //     this.loadResidents();
    //   } else {
    //     this.loadMessages(this.selectedResident.id);
    //   }
    // }, 30000);
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

