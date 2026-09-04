import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { EIntercomService } from '../services/e-intercom.service';
import {
  IntercomContact,
  IntercomCall,
  CallStatus,
  CallDirection,
  ContactType,
  EIntercomStatistics,
  IntercomFilter
} from '../models/e-intercom.model';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-e-intercom',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="intercom-container">
      <div class="page-header">
        <h1><i class="material-icons">phone</i> E-Intercom</h1>
        <p>Call contacts without showing phone numbers</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Contacts from <strong>/users</strong> and <strong>/societies</strong>; calls via <strong>/video-calls</strong> signaling — no demo records.</span>
        </div>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">phone</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalCalls }}</div>
            <div class="stat-label">Total Calls</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.callsToday }}</div>
            <div class="stat-label">Calls Today</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">call</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeCalls }}</div>
            <div class="stat-label">Active Calls</div>
          </div>
        </div>
        <div class="stat-card contacts">
          <div class="stat-icon">
            <i class="material-icons">contacts</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.availableContacts }}</div>
            <div class="stat-label">Available</div>
          </div>
        </div>
        <div class="stat-card duration">
          <div class="stat-icon">
            <i class="material-icons">timer</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDuration(statistics.averageCallDuration) }}</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      <!-- Active Call Display -->
      <div class="active-call-card" *ngIf="activeCall">
        <div class="call-header">
          <div class="call-info">
            <div class="call-contact-name">{{ activeCall.contact?.displayName || 'Unknown' }}</div>
            <div class="call-status" [ngClass]="getCallStatusClass(activeCall.status)">
              {{ getCallStatusText(activeCall.status) }}
            </div>
          </div>
          <button class="btn-end-call" (click)="endCurrentCall()">
            <i class="material-icons">call_end</i>
            End Call
          </button>
        </div>
        <div class="call-timer" *ngIf="activeCall.status === CallStatus.CONNECTED">
          <span>{{ formatCallDuration() }}</span>
        </div>
      </div>

      <!-- Main Content -->
      <div class="intercom-content">
        <!-- Contacts Panel -->
        <div class="contacts-panel">
          <div class="panel-header">
            <h2>Contacts</h2>
            <div class="search-filter">
              <input 
                type="text" 
                placeholder="Search contacts..." 
                [(ngModel)]="filter.searchTerm"
                (input)="applyFilters()"
                class="search-input">
              <select [(ngModel)]="filter.contactType" (change)="applyFilters()" class="filter-select">
                <option value="">All Types</option>
                <option [value]="ContactType.RESIDENT">Resident</option>
                <option [value]="ContactType.STAFF">Staff</option>
                <option [value]="ContactType.SECURITY">Security</option>
                <option [value]="ContactType.MANAGEMENT">Management</option>
                <option [value]="ContactType.EMERGENCY">Emergency</option>
                <option [value]="ContactType.VENDOR">Vendor</option>
              </select>
            </div>
          </div>

          <div class="contacts-list" *ngIf="!isLoading && contacts.length > 0">
            <div 
              *ngFor="let contact of contacts" 
              class="contact-card"
              [ngClass]="{ 'unavailable': !contact.isAvailable, 'calling': isCalling(contact.id) }"
              (click)="makeCall(contact)">
              <div class="contact-avatar">
                <i class="material-icons">{{ getContactIcon(contact.contactType) }}</i>
              </div>
              <div class="contact-info">
                <div class="contact-name">{{ contact.displayName }}</div>
                <div class="contact-meta">
                  <span class="contact-type">{{ contact.contactType }}</span>
                  <span *ngIf="contact.extension" class="extension">Ext: {{ contact.extension }}</span>
                </div>
              </div>
              <div class="contact-status">
                <div class="status-indicator" [ngClass]="contact.isAvailable ? 'available' : 'unavailable'"></div>
                <button class="btn-call" (click)="makeCall(contact); $event.stopPropagation()">
                  <i class="material-icons">phone</i>
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="!isLoading && contacts.length === 0">
            <i class="material-icons">contacts</i>
            <h3>No Contacts Found</h3>
            <p *ngIf="!loadError">No society users with callable phone numbers yet. Add residents in User Management or ensure users have valid phone numbers.</p>
            <p class="error-text" *ngIf="loadError">{{ loadError }}</p>
          </div>
        </div>

        <!-- Call History Panel -->
        <div class="history-panel">
          <div class="panel-header">
            <h2>Call History</h2>
            <button class="btn-refresh" (click)="loadCallHistory()">
              <i class="material-icons">refresh</i>
            </button>
          </div>

          <div class="history-list" *ngIf="callHistory.length > 0">
            <div *ngFor="let call of callHistory" class="history-item">
              <div class="history-icon" [ngClass]="getCallDirectionClass(call.direction)">
                <i class="material-icons">{{ call.direction === CallDirection.INCOMING ? 'call_received' : 'call_made' }}</i>
              </div>
              <div class="history-info">
                <div class="history-contact">{{ call.contact?.displayName || 'Unknown' }}</div>
                <div class="history-meta">
                  <span class="history-time">{{ formatDateTime(call.startTime) }}</span>
                  <span *ngIf="call.duration" class="history-duration">{{ formatDuration(call.duration) }}</span>
                </div>
              </div>
              <div class="history-status" [ngClass]="getCallStatusClass(call.status)">
                {{ call.status }}
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="callHistory.length === 0 && !historyLoading">
            <i class="material-icons">history</i>
            <p>No call history yet — calls appear here after you complete an intercom session.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .intercom-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .api-banner {
      margin-top: 12px;
      padding: 10px 14px;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 8px;
      color: #2e7d32;
      font-size: 13px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .api-banner .material-icons {
      font-size: 18px;
      flex-shrink: 0;
    }

    .error-text {
      color: #c0392b;
      font-weight: 500;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
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
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.today .stat-icon {
      background: #17a2b8;
    }

    .stat-card.active .stat-icon {
      background: #28a745;
    }

    .stat-card.contacts .stat-icon {
      background: #ffc107;
    }

    .stat-card.duration .stat-icon {
      background: #f5576c;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
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

    .active-call-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      color: white;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }

    .call-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .call-contact-name {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .call-status {
      font-size: 14px;
      opacity: 0.9;
    }

    .btn-end-call {
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-end-call:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .call-timer {
      font-size: 32px;
      font-weight: 700;
      text-align: center;
      font-family: 'Courier New', monospace;
    }

    .intercom-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .contacts-panel,
    .history-panel {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .search-filter {
      display: flex;
      gap: 12px;
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      flex: 1;
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-select {
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-refresh {
      padding: 8px;
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: #e0e0e0;
    }

    .contacts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 600px;
      overflow-y: auto;
    }

    .contact-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .contact-card:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
      transform: translateY(-2px);
    }

    .contact-card.unavailable {
      opacity: 0.6;
    }

    .contact-card.calling {
      border-color: #28a745;
      background: #f0f9ff;
    }

    .contact-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .contact-info {
      flex: 1;
    }

    .contact-name {
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 6px;
    }

    .contact-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .contact-type {
      text-transform: uppercase;
      font-weight: 600;
    }

    .extension {
      color: #667eea;
    }

    .contact-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .status-indicator.available {
      background: #28a745;
      box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
    }

    .status-indicator.unavailable {
      background: #dc3545;
    }

    .btn-call {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #28a745;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-call:hover {
      background: #218838;
      transform: scale(1.1);
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 600px;
      overflow-y: auto;
    }

    .history-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 2px solid #f0f0f0;
      border-radius: 12px;
      transition: all 0.2s;
    }

    .history-item:hover {
      border-color: #e0e0e0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .history-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .history-icon.incoming {
      background: #28a745;
    }

    .history-icon.outgoing {
      background: #667eea;
    }

    .history-info {
      flex: 1;
    }

    .history-contact {
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .history-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .history-status {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .history-status.ended {
      background: #d4edda;
      color: #155724;
    }

    .history-status.missed {
      background: #f8d7da;
      color: #721c24;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #7f8c8d;
    }

    .empty-state .material-icons {
      font-size: 48px;
      margin-bottom: 12px;
      color: #ddd;
    }

    @media (max-width: 1024px) {
      .intercom-content {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EIntercomComponent implements OnInit, OnDestroy {
  contacts: IntercomContact[] = [];
  callHistory: IntercomCall[] = [];
  statistics: EIntercomStatistics | null = null;
  activeCall: IntercomCall | null = null;
  isLoading = false;
  historyLoading = false;
  loadError = '';
  filter: IntercomFilter = {};
  private callTimer?: Subscription;
  private statusCheckInterval?: any;
  private callStartTime?: Date;

  CallStatus = CallStatus;
  CallDirection = CallDirection;
  ContactType = ContactType;

  constructor(
    private intercomService: EIntercomService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadCallHistory();
    this.checkActiveCall();
  }

  ngOnDestroy(): void {
    if (this.callTimer) {
      this.callTimer.unsubscribe();
    }
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = '';

    const societyId = localStorage.getItem('societyId') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
          return raw ? JSON.parse(raw).societyId : '';
        } catch { return ''; }
      })();

    if (!societyId) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.contacts = [];
      this.statistics = null;
      return;
    }

    this.intercomService.getAllContacts(this.filter).subscribe({
      next: (contacts) => {
        this.contacts = contacts;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading contacts:', error);
        this.loadError = 'Failed to load contacts from the API. Ensure the backend is running.';
        this.isLoading = false;
      }
    });

    this.intercomService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadCallHistory(): void {
    this.historyLoading = true;
    this.intercomService.getCallHistory().subscribe({
      next: (calls) => {
        this.callHistory = calls;
        this.historyLoading = false;
      },
      error: (error) => {
        console.error('Error loading call history:', error);
        this.historyLoading = false;
      }
    });
  }

  checkActiveCall(): void {
    this.intercomService.getActiveCall().subscribe({
      next: (call) => {
        this.activeCall = call;
        if (call && call.status === CallStatus.CONNECTED) {
          if (!this.callTimer) {
            this.startCallTimer();
          }
        } else {
          this.stopCallTimer();
        }
      }
    });
  }

  startCallTimer(): void {
    this.callStartTime = new Date();
    this.callTimer = interval(1000).subscribe(() => {
      // Timer updates handled in formatCallDuration
    });
  }

  stopCallTimer(): void {
    if (this.callTimer) {
      this.callTimer.unsubscribe();
      this.callTimer = undefined;
    }
  }

  applyFilters(): void {
    this.loadData();
  }

  makeCall(contact: IntercomContact): void {
    if (!contact.isAvailable) {
      alert(`${contact.displayName} is not available`);
      return;
    }

    if (this.activeCall) {
      if (confirm('You have an active call. End it and call ' + contact.displayName + '?')) {
        this.endCurrentCall();
        setTimeout(() => this.initiateCall(contact), 500);
      }
      return;
    }

    this.initiateCall(contact);
  }

  private initiateCall(contact: IntercomContact): void {
    this.intercomService.makeCall({ contactId: contact.id }).subscribe({
      next: (response) => {
        if (response.success && response.call) {
          this.activeCall = response.call;
          this.loadCallHistory();
          this.loadData();
          
          // Monitor call status changes
          if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
          }
          
          this.statusCheckInterval = setInterval(() => {
            if (this.activeCall) {
              this.intercomService.getActiveCall().subscribe({
                next: (call) => {
                  if (call && call.id === this.activeCall?.id) {
                    this.activeCall = call;
                    if (call.status === CallStatus.CONNECTED && !this.callTimer) {
                      this.startCallTimer();
                    } else if (call.status === CallStatus.ENDED || call.status === CallStatus.MISSED || call.status === CallStatus.REJECTED) {
                      if (this.statusCheckInterval) {
                        clearInterval(this.statusCheckInterval);
                        this.statusCheckInterval = undefined;
                      }
                      this.activeCall = null;
                      this.stopCallTimer();
                      this.loadCallHistory();
                      this.loadData();
                    }
                  } else if (!call) {
                    if (this.statusCheckInterval) {
                      clearInterval(this.statusCheckInterval);
                      this.statusCheckInterval = undefined;
                    }
                    this.activeCall = null;
                    this.stopCallTimer();
                    this.loadCallHistory();
                    this.loadData();
                  }
                }
              });
            } else {
              if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = undefined;
              }
            }
          }, 500);
          
          // Auto-clear after 30 seconds if still ringing
          setTimeout(() => {
            if (this.activeCall && this.activeCall.status === CallStatus.RINGING) {
              if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = undefined;
              }
            }
          }, 30000);
        } else {
          alert(response.message || 'Failed to make call');
        }
      },
      error: (error) => {
        console.error('Error making call:', error);
        alert('An error occurred while making the call');
      }
    });
  }

  endCurrentCall(): void {
    if (this.activeCall) {
      this.intercomService.endCall(this.activeCall.id).subscribe({
        next: (response) => {
          if (response.success) {
            if (this.statusCheckInterval) {
              clearInterval(this.statusCheckInterval);
              this.statusCheckInterval = undefined;
            }
            this.activeCall = null;
            this.stopCallTimer();
            this.loadCallHistory();
            this.loadData();
          } else {
            alert(response.message || 'Failed to end call');
          }
        },
        error: (error) => {
          console.error('Error ending call:', error);
          alert('An error occurred while ending the call');
        }
      });
    }
  }

  isCalling(contactId: string): boolean {
    return this.activeCall?.contactId === contactId && 
           this.activeCall?.status === CallStatus.RINGING;
  }

  getContactIcon(type: ContactType): string {
    switch (type) {
      case ContactType.RESIDENT:
        return 'person';
      case ContactType.STAFF:
        return 'badge';
      case ContactType.SECURITY:
        return 'security';
      case ContactType.MANAGEMENT:
        return 'business';
      case ContactType.EMERGENCY:
        return 'emergency';
      case ContactType.VENDOR:
        return 'store';
      default:
        return 'phone';
    }
  }

  getCallStatusClass(status: CallStatus): string {
    return status.toLowerCase();
  }

  getCallStatusText(status: CallStatus): string {
    switch (status) {
      case CallStatus.RINGING:
        return 'Ringing...';
      case CallStatus.CONNECTED:
        return 'Connected';
      case CallStatus.ENDED:
        return 'Ended';
      default:
        return status;
    }
  }

  getCallDirectionClass(direction: CallDirection): string {
    return direction.toLowerCase();
  }

  formatCallDuration(): string {
    if (!this.callStartTime || !this.activeCall || this.activeCall.status !== CallStatus.CONNECTED) {
      return '00:00';
    }
    const now = new Date();
    const seconds = Math.floor((now.getTime() - this.callStartTime.getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

