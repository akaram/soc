import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { distinctUntilChanged, filter, switchMap, tap, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { MobileAuthService, MobileUser } from '../services/mobile-auth.service';
import { VisitorApiService, VisitorUi } from '../features/visitors/visitor-api.service';
import { BillsApiService, BillRow } from '../../core/services/bills-api.service';
import { ComplaintsApiService } from '../../core/services/complaints-api.service';
import { SosApiService } from '../../core/services/sos-api.service';
import { ToastService } from '../../core/services/toast.service';
import { AnnouncementApiService, CommunityUpdateCard } from '../features/society/announcement-api.service';
import { MobileWeatherService, WeatherSnapshot } from '../services/mobile-weather.service';

interface QuickAction {
  icon: string;
  label: string;
  route: string;
  color: string;
  badge?: number;
}

interface Bill {
  id: string;
  month: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface Visitor {
  id: string;
  name: string;
  purpose: string;
  time: string;
  status: 'approved' | 'pending' | 'rejected';
  photo?: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="owner-dashboard">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-content">
          <h2>Welcome back, {{ userName }}! 👋</h2>
          <p>{{ societyName }}</p>
        </div>
        <div class="weather-widget" *ngIf="weather as w" [attr.title]="w.label">
          <i class="material-icons">{{ w.icon }}</i>
          <span>{{ w.tempC }}°C</span>
        </div>
        <div class="weather-widget weather-muted" *ngIf="weatherLoading">
          <i class="material-icons spin">sync</i>
        </div>
      </div>

      <!-- Menu Items / Quick Actions -->
      <div class="section">
        <h3 class="section-title">Menu</h3>
        <div class="menu-grid">
          <a *ngFor="let item of menuItems" 
             [routerLink]="item.route" 
             class="menu-card"
             [style.background]="item.color">
            <i class="material-icons">{{ item.icon }}</i>
            <span>{{ item.label }}</span>
            <span class="menu-badge" *ngIf="item.badge">{{ item.badge }}</span>
          </a>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="section">
        <h3 class="section-title">Quick Actions</h3>
        <div class="quick-actions">
          <a *ngFor="let action of quickActions" 
             [routerLink]="action.route" 
             class="action-card"
             [style.background]="action.color">
            <i class="material-icons">{{ action.icon }}</i>
            <span>{{ action.label }}</span>
            <span class="action-badge" *ngIf="action.badge && action.badge > 0">{{ action.badge }}</span>
          </a>
        </div>
      </div>

      <!-- Pending Bills -->
      <div class="section" *ngIf="pendingBills.length > 0">
        <div class="section-header">
          <h3 class="section-title">Pending Payments</h3>
          <a routerLink="/mobile/payments/all" class="view-all">View All</a>
        </div>
        <div class="bills-container">
          <div *ngFor="let bill of pendingBills" class="bill-card">
            <div class="bill-icon" [ngClass]="'status-' + bill.status">
              <i class="material-icons">receipt</i>
            </div>
            <div class="bill-details">
              <h4>{{ bill.month }} Maintenance</h4>
              <p class="bill-amount">₹{{ bill.amount | number }}</p>
              <p class="due-date">Due: {{ bill.dueDate }}</p>
            </div>
            <button class="pay-btn" [class.overdue]="bill.status === 'overdue'">
              {{ bill.status === 'overdue' ? 'Overdue' : 'Pay Now' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Visitors (today first, else recent from API) -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">{{ visitorsSectionTitle }}</h3>
          <a routerLink="/mobile/visitors" class="view-all">View All</a>
        </div>
        <p class="section-hint" *ngIf="visitorsLoading">Loading visitors…</p>
        <div class="visitors-container" *ngIf="!visitorsLoading">
          <div *ngFor="let visitor of todayVisitors" class="visitor-card">
            <div class="visitor-photo">
              <img [src]="visitor.photo || 'https://via.placeholder.com/50'" alt="{{ visitor.name }}">
              <span class="status-dot" [ngClass]="'status-' + visitor.status"></span>
            </div>
            <div class="visitor-details">
              <h4>{{ visitor.name }}</h4>
              <p class="visitor-purpose">{{ visitor.purpose }}</p>
              <p class="visitor-time">{{ visitor.time }}</p>
            </div>
            <div class="visitor-status" [ngClass]="'status-' + visitor.status">
              {{ visitor.status }}
            </div>
          </div>
          
          <div *ngIf="todayVisitors.length === 0" class="empty-state">
            <i class="material-icons">group_add</i>
            <p>No visitors yet. Add a guest from the Visitors screen.</p>
            <button routerLink="/mobile/visitors/add" class="add-visitor-btn">
              Add Visitor
            </button>
          </div>
        </div>
      </div>

      <!-- Community Updates (from society announcements API) -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Community Updates</h3>
          <a routerLink="/mobile/society" class="view-all">View All</a>
        </div>
        <p class="section-hint" *ngIf="communityUpdatesLoading">Loading updates…</p>
        <div class="updates-container" *ngIf="!communityUpdatesLoading">
          <div *ngFor="let update of communityUpdates" class="update-card">
            <div class="update-header">
              <i class="material-icons" [style.color]="update.iconColor">{{ update.icon }}</i>
              <h4>{{ update.title }}</h4>
            </div>
            <p>{{ update.message }}</p>
            <span class="update-time">{{ update.time }}</span>
          </div>
          <div *ngIf="communityUpdates.length === 0" class="empty-state compact">
            <i class="material-icons">campaign</i>
            <p>No updates yet. Society announcements will appear here.</p>
          </div>
        </div>
      </div>

      <!-- Important Numbers -->
      <div class="section">
        <h3 class="section-title">Emergency Contacts</h3>
        <div class="contacts-grid">
          <a href="tel:112" class="contact-card emergency">
            <i class="material-icons">emergency</i>
            <span>Emergency</span>
            <small>112</small>
          </a>
          <a href="tel:{{ guardNumber }}" class="contact-card">
            <i class="material-icons">security</i>
            <span>Guard</span>
            <small>{{ guardNumber }}</small>
          </a>
          <a href="tel:{{ adminNumber }}" class="contact-card">
            <i class="material-icons">admin_panel_settings</i>
            <span>Admin</span>
            <small>{{ adminNumber }}</small>
          </a>
          <a href="tel:{{ maintenanceNumber }}" class="contact-card">
            <i class="material-icons">build</i>
            <span>Maintenance</span>
            <small>{{ maintenanceNumber }}</small>
          </a>
        </div>
      </div>

      <!-- SOS Button -->
      <button class="sos-button" type="button" (click)="openSosConfirm()">
        <i class="material-icons">warning</i>
        <span>SOS</span>
      </button>

      <!-- Custom SOS modal (replaces browser alert/confirm) -->
      <div class="sos-modal-overlay" *ngIf="sosModal !== 'none'" (click)="closeSosModal()">
        <div class="sos-modal" (click)="$event.stopPropagation()">
          <!-- Confirm step -->
          <ng-container *ngIf="sosModal === 'confirm'">
            <div class="sos-modal-icon confirm">
              <i class="material-icons">sos</i>
            </div>
            <h3>Trigger SOS Alert?</h3>
            <p>This will immediately notify society security and your emergency contacts.</p>
            <div class="sos-modal-actions">
              <button type="button" class="btn-sos-cancel" (click)="closeSosModal()">Cancel</button>
              <button type="button" class="btn-sos-confirm" (click)="confirmSos()" [disabled]="sosSending">
                {{ sosSending ? 'Sending…' : 'Send SOS' }}
              </button>
            </div>
          </ng-container>

          <!-- Success step -->
          <ng-container *ngIf="sosModal === 'success'">
            <div class="sos-modal-icon success">
              <i class="material-icons">check_circle</i>
            </div>
            <h3>SOS Alert Sent</h3>
            <p>Security and emergency contacts have been notified. Help is on the way.</p>
            <p class="sos-modal-note">If this is life-threatening, also call <strong>112</strong> or tap Emergency below.</p>
            <div class="sos-modal-actions single">
              <button type="button" class="btn-sos-confirm" (click)="closeSosModal()">OK</button>
              <a class="btn-sos-call" href="tel:112">Call 112</a>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .owner-dashboard {
      padding: 16px;
      padding-bottom: 80px;
    }

    /* Welcome Banner */
    .welcome-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .welcome-content h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .welcome-content p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .weather-widget {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .weather-widget i {
      font-size: 32px;
    }

    .weather-muted {
      opacity: 0.85;
    }

    .weather-widget .spin {
      animation: weather-spin 1s linear infinite;
      font-size: 28px;
    }

    @keyframes weather-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Section */
    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #333;
    }

    .section-hint {
      font-size: 13px;
      color: #94a3b8;
      margin: -8px 0 12px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .view-all {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    /* Menu Grid */
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .menu-card {
      background: white;
      padding: 20px 12px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
      position: relative;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .menu-card:active {
      transform: scale(0.95);
    }

    .menu-card i {
      font-size: 32px;
      margin-bottom: 4px;
    }

    .menu-card span {
      font-size: 12px;
      font-weight: 500;
      display: block;
    }

    .menu-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      color: #ff4444;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      font-weight: 600;
    }

    /* Quick Actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .action-card {
      background: white;
      padding: 16px 8px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
      position: relative;
    }

    .action-card:active {
      transform: scale(0.95);
    }

    .action-card i {
      font-size: 28px;
      margin-bottom: 8px;
      display: block;
    }

    .action-card span {
      font-size: 12px;
      font-weight: 500;
      display: block;
    }

    .action-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #ff4444;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
    }

    /* Bills */
    .bills-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bill-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bill-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bill-icon.status-pending {
      background: #fff3cd;
      color: #ffc107;
    }

    .bill-icon.status-overdue {
      background: #f8d7da;
      color: #dc3545;
    }

    .bill-details {
      flex: 1;
    }

    .bill-details h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
    }

    .bill-amount {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #667eea;
    }

    .due-date {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #999;
    }

    .pay-btn {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .pay-btn.overdue {
      background: #dc3545;
    }

    /* Visitors */
    .visitors-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .visitor-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .visitor-photo {
      position: relative;
    }

    .visitor-photo img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }

    .status-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-dot.status-approved {
      background: #28a745;
    }

    .status-dot.status-pending {
      background: #ffc107;
    }

    .status-dot.status-rejected {
      background: #dc3545;
    }

    .visitor-details {
      flex: 1;
    }

    .visitor-details h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
    }

    .visitor-purpose {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .visitor-time {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #999;
    }

    .visitor-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .visitor-status.status-approved {
      background: #d4edda;
      color: #155724;
    }

    .visitor-status.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .visitor-status.status-rejected {
      background: #f8d7da;
      color: #721c24;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      background: white;
      border-radius: 12px;
    }

    .empty-state i {
      font-size: 48px;
      color: #ccc;
      margin-bottom: 12px;
    }

    .empty-state p {
      margin: 0 0 16px 0;
      color: #999;
    }

    .empty-state.compact {
      padding: 24px 16px;
    }

    .empty-state.compact i {
      font-size: 36px;
    }

    .empty-state.compact p {
      margin: 0;
      font-size: 14px;
    }

    .add-visitor-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    /* Community Updates */
    .updates-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .update-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .update-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .update-header h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }

    .update-card p {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    }

    .update-time {
      font-size: 12px;
      color: #999;
    }

    /* Emergency Contacts */
    .contacts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .contact-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .contact-card.emergency {
      background: #dc3545;
      color: white;
    }

    .contact-card i {
      font-size: 32px;
      color: #667eea;
      margin-bottom: 4px;
    }

    .contact-card.emergency i {
      color: white;
    }

    .contact-card span {
      font-weight: 600;
      font-size: 14px;
    }

    .contact-card small {
      font-size: 12px;
      opacity: 0.7;
    }

    /* SOS Button */
    .sos-button {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #dc3545;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 50;
    }

    .sos-button i {
      font-size: 28px;
    }

    .sos-button span {
      font-size: 10px;
      font-weight: 600;
    }

    /* Custom SOS modal */
    .sos-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.72);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: sos-fade-in 0.2s ease;
    }

    @keyframes sos-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .sos-modal {
      background: white;
      border-radius: 20px;
      max-width: 360px;
      width: 100%;
      padding: 28px 24px 24px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      animation: sos-slide-up 0.28s ease;
    }

    @keyframes sos-slide-up {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .sos-modal-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sos-modal-icon.confirm {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
    }

    .sos-modal-icon.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .sos-modal-icon .material-icons {
      font-size: 40px;
    }

    .sos-modal h3 {
      margin: 0 0 10px;
      font-size: 20px;
      color: #1e293b;
    }

    .sos-modal p {
      margin: 0 0 8px;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }

    .sos-modal-note {
      font-size: 13px;
      margin-top: 12px;
      padding: 10px 12px;
      background: #fef2f2;
      border-radius: 10px;
      color: #991b1b;
    }

    .sos-modal-actions {
      display: flex;
      gap: 10px;
      margin-top: 22px;
    }

    .sos-modal-actions.single {
      flex-direction: column;
    }

    .btn-sos-cancel,
    .btn-sos-confirm,
    .btn-sos-call {
      flex: 1;
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-sos-cancel {
      background: #f1f5f9;
      color: #475569;
    }

    .btn-sos-confirm {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
    }

    .btn-sos-confirm:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-sos-call {
      background: #dc2626;
      color: white;
    }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  /** Logged-in user pulled from mobile auth session. */
  user: MobileUser | null = null;
  
  guardNumber = '+91 98765 43210';
  adminNumber = '+91 98765 43211';
  maintenanceNumber = '+91 98765 43212';

  menuItems: QuickAction[] = [
    { icon: 'apartment', label: 'My Society', route: '/mobile/society', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'restaurant', label: 'My Cook & Staff', route: '/mobile/my-staff', color: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' },
    { icon: 'forum', label: 'Community', route: '/mobile/community', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'family_restroom', label: 'Family Members', route: '/mobile/profile/family', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { icon: 'directions_car', label: 'My Vehicles', route: '/mobile/profile/vehicles', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { icon: 'pets', label: 'My Pets', route: '/mobile/profile/pets', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { icon: 'event_available', label: 'Amenity Booking', route: '/mobile/amenities', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { icon: 'support_agent', label: 'Helpdesk', route: '/mobile/complaints', color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
    { icon: 'local_shipping', label: 'Deliveries', route: '/mobile/deliveries', color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { icon: 'emergency', label: 'Emergency', route: '/mobile/emergency', color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' },
    { icon: 'settings', label: 'Settings', route: '/mobile/settings', color: 'linear-gradient(135deg, #95afc0 0%, #c9ced6 100%)' }
  ];

  quickActions: QuickAction[] = [
    { icon: 'group_add', label: 'Add Visitor', route: '/mobile/visitors/add', color: '#667eea' },
    { icon: 'restaurant', label: 'My Cook', route: '/mobile/my-staff', color: '#0f766e' },
    { icon: 'payment', label: 'Pay Bill', route: '/mobile/payments', color: '#f093fb' },
    { icon: 'report_problem', label: 'Complaint', route: '/mobile/complaints/add', color: '#fa709a' },
    { icon: 'event', label: 'Book Amenity', route: '/mobile/amenities', color: '#4facfe' }
  ];

  pendingBills: Bill[] = [];
  todayVisitors: Visitor[] = [];
  visitorsSectionTitle = "Today's Visitors";
  visitorsLoading = false;
  communityUpdates: CommunityUpdateCard[] = [];
  communityUpdatesLoading = false;
  weather: WeatherSnapshot | null = null;
  weatherLoading = false;

  /** SOS modal step: none | confirm | success */
  sosModal: 'none' | 'confirm' | 'success' = 'none';
  sosSending = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private authService: MobileAuthService,
    private visitorApi: VisitorApiService,
    private billsApi: BillsApiService,
    private complaintsApi: ComplaintsApiService,
    private announcementsApi: AnnouncementApiService,
    private weatherService: MobileWeatherService,
    private sosApi: SosApiService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(
          (a, b) => a?.id === b?.id && a?.societyId === b?.societyId
        ),
        tap(u => {
          this.user = u;
          if (!u?.societyId) {
            this.todayVisitors = [];
            this.pendingBills = [];
            this.communityUpdates = [];
            this.communityUpdatesLoading = false;
            this.weather = null;
            this.weatherLoading = false;
            this.setQuickActionBadge('Complaint', 0);
          }
        }),
        filter((u): u is MobileUser => !!u?.societyId),
        switchMap(u => {
          this.loadPendingBills();
          this.loadOpenComplaintCount(u);
          this.loadWeather(u.societyId);
          this.loadEmergencyContacts(u.societyId);
          this.visitorsLoading = true;
          this.communityUpdatesLoading = true;
          return forkJoin({
            visitors: this.visitorApi.listForPortalUser(u),
            updates: this.announcementsApi
              .listDashboardUpdates(u.societyId, 5)
              .pipe(catchError(() => of([])))
          }).pipe(
            tap(({ visitors, updates }) => {
              this.applyDashboardVisitors(visitors ?? []);
              this.communityUpdates = updates;
              this.communityUpdatesLoading = false;
            })
          );
        })
      )
      .subscribe();
  }

  /** Load today's visitors from API; if none today, show up to 5 most recent. */
  private applyDashboardVisitors(rows: VisitorUi[]): void {
    const todayIso = new Date().toISOString().slice(0, 10);
    const today = rows.filter(v => v.visitDateIso === todayIso);
    const sorted = [...rows].sort((a, b) =>
      (b.visitDateIso || '').localeCompare(a.visitDateIso || '')
    );

    const pick = today.length > 0 ? today.slice(0, 5) : sorted.slice(0, 5);
    this.visitorsSectionTitle = today.length > 0 ? "Today's Visitors" : 'Recent Visitors';
    this.todayVisitors = pick.map(v => this.mapVisitorForDashboard(v));
    this.visitorsLoading = false;
  }

  private mapVisitorForDashboard(v: VisitorUi): Visitor {
    let status: Visitor['status'] = 'approved';
    if (v.status === 'pending') status = 'pending';
    else if (v.status === 'rejected') status = 'rejected';
    return {
      id: v.id,
      name: v.name,
      purpose: v.purpose,
      time: v.time ? `${v.date} · ${v.time}` : v.date,
      status,
      photo: v.photo
    };
  }

  private loadWeather(societyId: string): void {
    this.weatherLoading = true;
    this.weather = null;
    this.weatherService.getWeatherForSociety(societyId).subscribe({
      next: w => {
        this.weather = w;
        this.weatherLoading = false;
      },
      error: () => {
        this.weather = null;
        this.weatherLoading = false;
      }
    });
  }

  private loadPendingBills(): void {
    this.billsApi.listOutstanding().subscribe({
      next: rows => {
        this.pendingBills = rows.slice(0, 3).map(b => ({
          id: b.id,
          month: b.billType || 'Maintenance',
          amount: b.pendingAmount || b.totalAmount,
          dueDate: b.dueDate,
          status: b.paymentStatus === 'OVERDUE' ? 'overdue' : 'pending'
        }));
      },
      error: () => {
        this.pendingBills = [];
      }
    });
  }

  /** Quick Actions badge — only your open complaints, not a demo number. */
  private loadOpenComplaintCount(user: MobileUser): void {
    this.complaintsApi.countOpenForUser(user.societyId, user.id).subscribe({
      next: count => this.setQuickActionBadge('Complaint', count),
      error: () => this.setQuickActionBadge('Complaint', 0)
    });
  }

  private setQuickActionBadge(label: string, count: number): void {
    const action = this.quickActions.find(a => a.label === label);
    if (!action) {
      return;
    }
    if (count > 0) {
      action.badge = count;
    } else {
      delete action.badge;
    }
  }

  /** Display name used in the welcome banner (fallback is "User"). */
  get userName(): string {
    return this.user?.name?.trim() || 'User';
  }

  /** Compact society label shown under welcome (fallback is blank). */
  get societyName(): string {
    const flat = this.user?.flatNumber?.trim();
    const tower = this.user?.tower?.trim();
    if (flat && tower) return `${flat}, ${tower}`;
    if (flat) return flat;
    if (tower) return tower;
    return '';
  }

  /** Open custom SOS confirmation popup. */
  openSosConfirm(): void {
    this.sosModal = 'confirm';
    this.sosSending = false;
  }

  /** User confirmed — send SOS to backend (notifies admin & security). */
  confirmSos(): void {
    this.sosSending = true;
    this.sosApi
      .triggerForResident('Emergency SOS from owner dashboard')
      .subscribe({
        next: () => {
          this.sosSending = false;
          this.sosModal = 'success';
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        },
        error: err => {
          this.sosSending = false;
          this.toast.error(String(err));
          this.closeSosModal();
        }
      });
  }

  /** Close SOS modal. */
  closeSosModal(): void {
    this.sosModal = 'none';
    this.sosSending = false;
  }

  /** Load guard/admin/maintenance numbers from society users API. */
  private loadEmergencyContacts(societyId: string): void {
    this.sosApi.getContacts(societyId).subscribe(contacts => {
      const guard = contacts.find(c => c.role === 'SECURITY_GUARD');
      const admin = contacts.find(c => c.role === 'ADMIN');
      const maint = contacts.find(c => c.role === 'FACILITY_MANAGER' || c.role === 'STAFF');
      if (guard?.phone) this.guardNumber = guard.phone;
      if (admin?.phone) this.adminNumber = admin.phone;
      if (maint?.phone) this.maintenanceNumber = maint.phone;
    });
  }
}
