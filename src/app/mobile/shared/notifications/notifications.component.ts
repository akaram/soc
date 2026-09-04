import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  MobileNotification,
  MobileNotificationsService
} from '../../services/mobile-notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notifications-page">
      <!-- Header -->
      <div class="notifications-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Notifications</h2>
        <button class="btn-mark-all" (click)="markAllAsRead()" *ngIf="hasUnread">
          <i class="material-icons">done_all</i>
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button *ngFor="let filter of filters"
                class="filter-tab"
                [class.active]="activeFilter === filter.value"
                (click)="setFilter(filter.value)">
          {{ filter.label }}
          <span class="filter-badge" *ngIf="filter.count > 0">{{ filter.count }}</span>
        </button>
      </div>

      <!-- Notifications List -->
      <div class="notifications-container">
        <div *ngIf="filteredNotifications.length === 0" class="empty-state">
          <i class="material-icons">notifications_off</i>
          <h3>No Notifications</h3>
          <p>You're all caught up!</p>
        </div>

        <div class="notifications-list" *ngIf="filteredNotifications.length > 0">
          <!-- Today's Notifications -->
          <div class="notification-section" *ngIf="todayNotifications.length > 0">
            <h3 class="section-title">Today</h3>
            <div *ngFor="let notification of todayNotifications" 
                 class="notification-item"
                 [class.unread]="!notification.read"
                 (click)="handleNotificationClick(notification)">
              <div class="notification-icon" [style.background]="getIconColor(notification.type)">
                <i class="material-icons">{{ notification.icon || getDefaultIcon(notification.category) }}</i>
              </div>
              <div class="notification-content">
                <h4>{{ notification.title }}</h4>
                <p>{{ notification.message }}</p>
                <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
              </div>
              <div class="notification-indicator" *ngIf="!notification.read"></div>
            </div>
          </div>

          <!-- Yesterday's Notifications -->
          <div class="notification-section" *ngIf="yesterdayNotifications.length > 0">
            <h3 class="section-title">Yesterday</h3>
            <div *ngFor="let notification of yesterdayNotifications" 
                 class="notification-item"
                 [class.unread]="!notification.read"
                 (click)="handleNotificationClick(notification)">
              <div class="notification-icon" [style.background]="getIconColor(notification.type)">
                <i class="material-icons">{{ notification.icon || getDefaultIcon(notification.category) }}</i>
              </div>
              <div class="notification-content">
                <h4>{{ notification.title }}</h4>
                <p>{{ notification.message }}</p>
                <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
              </div>
              <div class="notification-indicator" *ngIf="!notification.read"></div>
            </div>
          </div>

          <!-- Older Notifications -->
          <div class="notification-section" *ngIf="olderNotifications.length > 0">
            <h3 class="section-title">Older</h3>
            <div *ngFor="let notification of olderNotifications" 
                 class="notification-item"
                 [class.unread]="!notification.read"
                 (click)="handleNotificationClick(notification)">
              <div class="notification-icon" [style.background]="getIconColor(notification.type)">
                <i class="material-icons">{{ notification.icon || getDefaultIcon(notification.category) }}</i>
              </div>
              <div class="notification-content">
                <h4>{{ notification.title }}</h4>
                <p>{{ notification.message }}</p>
                <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
              </div>
              <div class="notification-indicator" *ngIf="!notification.read"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page {
      min-height: 100vh;
      background: #f5f7fa;
      padding-bottom: 80px;
    }

    .notifications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .notifications-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
      text-align: center;
    }

    .btn-back, .btn-mark-all {
      background: none;
      border: none;
      color: #667eea;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-back {
      color: #2c3e50;
    }

    .filter-tabs {
      display: flex;
      padding: 12px 16px;
      gap: 8px;
      background: white;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .filter-tabs::-webkit-scrollbar {
      display: none;
    }

    .filter-tab {
      background: #f5f5f5;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .filter-tab.active {
      background: #667eea;
      color: white;
    }

    .filter-badge {
      background: rgba(255,255,255,0.3);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .filter-tab.active .filter-badge {
      background: rgba(255,255,255,0.3);
    }

    .notifications-container {
      padding: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state .material-icons {
      font-size: 80px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #666;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .notification-section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #999;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notification-item {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .notification-item:active {
      transform: scale(0.98);
    }

    .notification-item.unread {
      background: #f8f9ff;
      border-left: 4px solid #667eea;
    }

    .notification-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .notification-icon .material-icons {
      font-size: 24px;
    }

    .notification-content {
      flex: 1;
    }

    .notification-content h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .notification-content p {
      margin: 0 0 6px 0;
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }

    .notification-time {
      font-size: 12px;
      color: #999;
    }

    .notification-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #667eea;
      position: absolute;
      top: 16px;
      right: 16px;
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: MobileNotification[] = [];
  activeFilter: string = 'all';
  private listSubscription?: Subscription;
  
  filters = [
    { label: 'All', value: 'all', count: 0 },
    { label: 'Unread', value: 'unread', count: 0 },
    { label: 'Visitors', value: 'visitor', count: 0 },
    { label: 'Payments', value: 'payment', count: 0 },
    { label: 'Announcements', value: 'announcement', count: 0 }
  ];

  constructor(
    private router: Router,
    private notificationsService: MobileNotificationsService
  ) {}

  ngOnInit() {
    this.notificationsService.refresh();
    this.listSubscription = this.notificationsService.notifications$.subscribe(list => {
      this.notifications = list;
      this.updateFilterCounts();
    });
  }

  ngOnDestroy() {
    this.listSubscription?.unsubscribe();
  }

  updateFilterCounts() {
    this.filters[0].count = this.notifications.length;
    this.filters[1].count = this.notifications.filter(n => !n.read).length;
    this.filters[2].count = this.notifications.filter(n => n.category === 'visitor').length;
    this.filters[3].count = this.notifications.filter(n => n.category === 'payment').length;
    this.filters[4].count = this.notifications.filter(n => n.category === 'announcement').length;
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  get filteredNotifications(): MobileNotification[] {
    if (this.activeFilter === 'all') {
      return this.notifications;
    } else if (this.activeFilter === 'unread') {
      return this.notifications.filter(n => !n.read);
    } else {
      return this.notifications.filter(n => n.category === this.activeFilter);
    }
  }

  get todayNotifications(): MobileNotification[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.filteredNotifications.filter(n => {
      const notifDate = new Date(n.timestamp);
      notifDate.setHours(0, 0, 0, 0);
      return notifDate.getTime() === today.getTime();
    });
  }

  get yesterdayNotifications(): MobileNotification[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    return this.filteredNotifications.filter(n => {
      const notifDate = new Date(n.timestamp);
      notifDate.setHours(0, 0, 0, 0);
      return notifDate.getTime() === yesterday.getTime();
    });
  }

  get olderNotifications(): MobileNotification[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    return this.filteredNotifications.filter(n => {
      const notifDate = new Date(n.timestamp);
      notifDate.setHours(0, 0, 0, 0);
      return notifDate.getTime() < yesterday.getTime();
    });
  }

  get hasUnread(): boolean {
    return this.notifications.some(n => !n.read);
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getDefaultIcon(category: string): string {
    const icons: Record<string, string> = {
      visitor: 'person',
      payment: 'payment',
      complaint: 'report_problem',
      announcement: 'campaign',
      system: 'notifications'
    };
    return icons[category] || 'notifications';
  }

  getIconColor(type: string): string {
    const colors: Record<string, string> = {
      info: '#667eea',
      success: '#10ac84',
      warning: '#ff9f43',
      error: '#ff6b6b'
    };
    return colors[type] || '#667eea';
  }

  handleNotificationClick(notification: MobileNotification) {
    this.notificationsService.markAsRead(notification.id);

    if (notification.actionUrl) {
      const queryParams = notification.visitorId
        ? { visitorId: notification.visitorId }
        : undefined;
      this.router.navigate([notification.actionUrl], { queryParams });
    }
  }

  markAllAsRead() {
    this.notificationsService.markAllAsRead();
  }

  goBack() {
    this.router.navigate(['/mobile/dashboard']);
  }
}
