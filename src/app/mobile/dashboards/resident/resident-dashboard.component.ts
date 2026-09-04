import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';
import { QuickAction, DashboardStats, Bill, Notice } from '../../models/mobile.models';

@Component({
  selector: 'app-resident-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="resident-dashboard">
      <!-- Welcome Card -->
      <div class="welcome-card">
        <div class="welcome-header">
          <div class="user-info">
            <h2>Welcome Home, {{ getFirstName() }}!</h2>
            <p class="flat-info">
              <i class="material-icons">apartment</i>
              {{ user?.flatNumber }}, {{ user?.tower }}
            </p>
          </div>
          <div class="weather-widget">
            <i class="material-icons">wb_sunny</i>
            <span>28°C</span>
          </div>
        </div>
      </div>

      <!-- Outstanding Bills Alert -->
      <div class="alert-card" *ngIf="outstandingBills > 0">
        <div class="alert-icon">
          <i class="material-icons">warning</i>
        </div>
        <div class="alert-content">
          <h4>Outstanding Bills</h4>
          <p>You have {{ outstandingBills }} unpaid bill(s)</p>
        </div>
        <button class="btn-pay" [routerLink]="['/mobile/bills']">
          Pay Now
        </button>
      </div>

      <!-- Quick Stats -->
      <div class="stats-row">
        <div class="stat-mini" *ngFor="let stat of quickStats">
          <i class="material-icons" [style.color]="stat.color">{{ stat.icon }}</i>
          <div class="stat-mini-content">
            <span class="stat-mini-value">{{ stat.value }}</span>
            <span class="stat-mini-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h3 class="section-title">Quick Actions</h3>
        <div class="action-grid">
          <a *ngFor="let action of quickActions" 
             [routerLink]="action.route" 
             class="action-button"
             [class.highlighted]="action.badge">
            <div class="action-icon" [style.background]="action.color">
              <i class="material-icons">{{ action.icon }}</i>
              <span class="action-badge" *ngIf="action.badge">{{ action.badge }}</span>
            </div>
            <span class="action-label">{{ action.label }}</span>
          </a>
        </div>
      </div>

      <!-- Recent Visitors -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Recent Visitors</h3>
          <a [routerLink]="['/mobile/my-visitors']" class="see-all">View All</a>
        </div>
        <div class="visitor-timeline">
          <div *ngFor="let visitor of recentVisitors" class="visitor-item">
            <div class="visitor-time">
              <span class="time">{{ formatTime(visitor.entryTime) }}</span>
              <span class="date">{{ formatDate(visitor.entryTime) }}</span>
            </div>
            <div class="visitor-line">
              <div class="visitor-dot" [class.active]="visitor.status === 'checked-in'"></div>
            </div>
            <div class="visitor-details">
              <h4>{{ visitor.name }}</h4>
              <p>{{ visitor.purpose }}</p>
              <span class="status-badge" [class]="visitor.status">
                {{ visitor.status === 'checked-in' ? 'Inside' : 'Left' }}
              </span>
            </div>
          </div>
        </div>
        <button class="btn-secondary" [routerLink]="['/mobile/my-visitors/pre-approve']">
          <i class="material-icons">qr_code</i>
          Pre-Approve Visitor
        </button>
      </div>

      <!-- Upcoming Bookings -->
      <div class="section" *ngIf="upcomingBookings.length > 0">
        <div class="section-header">
          <h3 class="section-title">Upcoming Bookings</h3>
          <a [routerLink]="['/mobile/bookings']" class="see-all">View All</a>
        </div>
        <div class="booking-list">
          <div *ngFor="let booking of upcomingBookings" class="booking-card">
            <div class="booking-icon" [style.background]="getAmenityColor(booking.amenityName)">
              <i class="material-icons">{{ getAmenityIcon(booking.amenityName) }}</i>
            </div>
            <div class="booking-info">
              <h4>{{ booking.amenityName }}</h4>
              <p>
                <i class="material-icons">event</i>
                {{ formatBookingDate(booking.date) }}
              </p>
              <p>
                <i class="material-icons">schedule</i>
                {{ booking.startTime }} - {{ booking.endTime }}
              </p>
            </div>
            <div class="booking-amount">
              <span class="amount">{{ booking.totalAmount }} SAR</span>
              <span class="status" [class]="booking.paymentStatus">
                {{ booking.paymentStatus === 'paid' ? 'Paid' : 'Pending' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Latest Notices -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Society Updates</h3>
          <a [routerLink]="['/mobile/notices']" class="see-all">View All</a>
        </div>
        <div class="notice-list">
          <div *ngFor="let notice of latestNotices" class="notice-card">
            <div class="notice-priority" [class]="notice.priority"></div>
            <div class="notice-type" [style.background]="getNoticeColor(notice.type)">
              <i class="material-icons">{{ getNoticeIcon(notice.type) }}</i>
            </div>
            <div class="notice-content">
              <h4>{{ notice.title }}</h4>
              <p>{{ notice.description | slice:0:80 }}{{ notice.description.length > 80 ? '...' : '' }}</p>
              <span class="notice-time">{{ getTimeAgo(notice.publishedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Community Highlights -->
      <div class="section">
        <h3 class="section-title">Community</h3>
        <div class="community-grid">
          <a [routerLink]="['/mobile/community']" class="community-card">
            <i class="material-icons">forum</i>
            <span>Community Feed</span>
            <div class="badge">12 new</div>
          </a>
          <a [routerLink]="['/mobile/events']" class="community-card">
            <i class="material-icons">celebration</i>
            <span>Events</span>
            <div class="badge">3 upcoming</div>
          </a>
          <a [routerLink]="['/mobile/marketplace']" class="community-card">
            <i class="material-icons">storefront</i>
            <span>Marketplace</span>
          </a>
          <a [routerLink]="['/mobile/polls']" class="community-card">
            <i class="material-icons">how_to_vote</i>
            <span>Active Polls</span>
            <div class="badge">2</div>
          </a>
        </div>
      </div>

      <!-- Emergency SOS Button -->
      <div class="sos-section">
        <button class="btn-sos" [routerLink]="['/mobile/emergency']">
          <i class="material-icons">emergency</i>
          <span>Emergency SOS</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .resident-dashboard {
      padding: 16px;
      padding-bottom: 80px;
      background: #f5f7fa;
    }

    .welcome-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 20px;
      margin-bottom: 16px;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .user-info h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 600;
    }

    .flat-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      opacity: 0.95;
      font-size: 15px;
    }

    .flat-info .material-icons {
      font-size: 18px;
    }

    .weather-widget {
      text-align: center;
      background: rgba(255,255,255,0.2);
      padding: 12px;
      border-radius: 12px;
    }

    .weather-widget .material-icons {
      font-size: 32px;
      display: block;
      margin-bottom: 4px;
    }

    .weather-widget span {
      font-size: 16px;
      font-weight: 600;
    }

    .alert-card {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
      padding: 16px;
      border-radius: 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    }

    .alert-icon {
      width: 48px;
      height: 48px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .alert-icon .material-icons {
      font-size: 28px;
    }

    .alert-content {
      flex: 1;
    }

    .alert-content h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .alert-content p {
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .btn-pay {
      background: white;
      color: #ff6b6b;
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .stat-mini {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stat-mini .material-icons {
      font-size: 32px;
    }

    .stat-mini-content {
      display: flex;
      flex-direction: column;
    }

    .stat-mini-value {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-mini-label {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 16px 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .see-all {
      color: #667eea;
      font-size: 14px;
      text-decoration: none;
      font-weight: 500;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .action-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: #2c3e50;
      transition: transform 0.2s;
    }

    .action-button:active {
      transform: scale(0.95);
    }

    .action-icon {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin-bottom: 8px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .action-icon .material-icons {
      font-size: 28px;
    }

    .action-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff4757;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      border: 2px solid white;
    }

    .action-label {
      font-size: 12px;
      text-align: center;
      font-weight: 500;
    }

    .visitor-timeline {
      margin-bottom: 16px;
    }

    .visitor-item {
      display: grid;
      grid-template-columns: 60px 20px 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .visitor-time {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 12px;
    }

    .visitor-time .time {
      font-weight: 600;
      color: #2c3e50;
    }

    .visitor-time .date {
      color: #999;
      font-size: 11px;
    }

    .visitor-line {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .visitor-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #e0e0e0;
      border: 2px solid white;
      box-shadow: 0 0 0 2px #e0e0e0;
    }

    .visitor-dot.active {
      background: #10ac84;
      box-shadow: 0 0 0 2px #10ac84;
    }

    .visitor-details {
      background: white;
      padding: 12px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .visitor-details h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #2c3e50;
    }

    .visitor-details p {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #666;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge.checked-in {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.checked-out {
      background: #f8d7da;
      color: #721c24;
    }

    .btn-secondary {
      width: 100%;
      padding: 14px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-secondary:active {
      background: #667eea;
      color: white;
    }

    .booking-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .booking-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .booking-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .booking-icon .material-icons {
      font-size: 28px;
    }

    .booking-info {
      flex: 1;
    }

    .booking-info h4 {
      margin: 0 0 8px 0;
      font-size: 15px;
      color: #2c3e50;
    }

    .booking-info p {
      margin: 0;
      font-size: 13px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .booking-info p .material-icons {
      font-size: 16px;
    }

    .booking-amount {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
    }

    .booking-amount .amount {
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
    }

    .booking-amount .status {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 8px;
      margin-top: 4px;
    }

    .booking-amount .status.paid {
      background: #d4edda;
      color: #155724;
    }

    .booking-amount .status.pending {
      background: #fff3cd;
      color: #856404;
    }

    .notice-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notice-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      position: relative;
      overflow: hidden;
    }

    .notice-priority {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    .notice-priority.high {
      background: #ff4757;
    }

    .notice-priority.medium {
      background: #ff9f43;
    }

    .notice-priority.low {
      background: #10ac84;
    }

    .notice-type {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .notice-type .material-icons {
      font-size: 24px;
    }

    .notice-content {
      flex: 1;
    }

    .notice-content h4 {
      margin: 0 0 6px 0;
      font-size: 15px;
      color: #2c3e50;
    }

    .notice-content p {
      margin: 0 0 6px 0;
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .notice-time {
      font-size: 11px;
      color: #999;
    }

    .community-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .community-card {
      background: white;
      padding: 20px 16px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: #2c3e50;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      position: relative;
      transition: transform 0.2s;
    }

    .community-card:active {
      transform: scale(0.95);
    }

    .community-card .material-icons {
      font-size: 36px;
      color: #667eea;
      margin-bottom: 8px;
    }

    .community-card span {
      font-size: 13px;
      font-weight: 500;
      display: block;
    }

    .community-card .badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #ff4757;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }

    .sos-section {
      margin-top: 32px;
      margin-bottom: 16px;
    }

    .btn-sos {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
      transition: transform 0.2s;
    }

    .btn-sos:active {
      transform: scale(0.98);
    }

    .btn-sos .material-icons {
      font-size: 28px;
    }
  `]
})
export class ResidentDashboardComponent implements OnInit {
  user: MobileUser | null = null;
  outstandingBills = 1;

  quickStats: DashboardStats[] = [
    { label: 'This Month', value: '2,450 SAR', icon: 'receipt', color: '#667eea' },
    { label: 'Visitors', value: '12', icon: 'group', color: '#10ac84' },
    { label: 'Bookings', value: '2', icon: 'event', color: '#ff9f43' },
    { label: 'Packages', value: '3', icon: 'local_shipping', color: '#764ba2' }
  ];

  quickActions: QuickAction[] = [
    { icon: 'qr_code', label: 'Pre-Invite', route: '/mobile/my-visitors/pre-approve', color: '#667eea', badge: 0 },
    { icon: 'receipt_long', label: 'Pay Bills', route: '/mobile/bills', color: '#ff6b6b', badge: 1 },
    { icon: 'event_available', label: 'Book', route: '/mobile/bookings', color: '#10ac84' },
    { icon: 'report_problem', label: 'Complaint', route: '/mobile/complaints/add', color: '#ff9f43' },
    { icon: 'local_shipping', label: 'Packages', route: '/mobile/packages', color: '#764ba2', badge: 3 },
    { icon: 'forum', label: 'Community', route: '/mobile/community', color: '#3498db' },
    { icon: 'storefront', label: 'Marketplace', route: '/mobile/marketplace', color: '#e74c3c' },
    { icon: 'support_agent', label: 'Support', route: '/mobile/support', color: '#9b59b6' }
  ];

  recentVisitors = [
    {
      id: '1',
      name: 'Ahmed Khan',
      purpose: 'Personal Visit',
      entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      exitTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      status: 'checked-out'
    },
    {
      id: '2',
      name: 'Sarah Ali (Maid)',
      purpose: 'Daily Help',
      entryTime: new Date(Date.now() - 30 * 60 * 1000),
      status: 'checked-in'
    },
    {
      id: '3',
      name: 'Amazon Delivery',
      purpose: 'Package Delivery',
      entryTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      exitTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      status: 'checked-out'
    }
  ];

  upcomingBookings = [
    {
      id: '1',
      amenityId: 'gym',
      amenityName: 'Gym',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '6:00 AM',
      endTime: '7:00 AM',
      totalAmount: 50,
      paymentStatus: 'paid'
    },
    {
      id: '2',
      amenityId: 'clubhouse',
      amenityName: 'Clubhouse',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startTime: '7:00 PM',
      endTime: '10:00 PM',
      totalAmount: 500,
      paymentStatus: 'pending'
    }
  ];

  latestNotices: Notice[] = [
    {
      id: '1',
      title: 'Water Supply Maintenance',
      description: 'Water supply will be temporarily interrupted on Sunday from 8 AM to 12 PM for tank cleaning.',
      type: 'maintenance',
      priority: 'high',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      publishedBy: 'Admin',
       readBy:"Akram"
    },
    {
      id: '2',
      title: 'Annual Sports Day - Registration Open',
      description: 'Register for the annual sports day happening next month. Multiple events for all age groups.',
      type: 'event',
      priority: 'medium',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      publishedBy: 'Committee',
       readBy:"Akram"
    },
    {
      id: '3',
      title: 'AGM Meeting Notice',
      description: 'Annual General Meeting scheduled for next Saturday at 6 PM in the clubhouse.',
      type: 'meeting',
      priority: 'high',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      publishedBy: 'Secretary',
      readBy:"Akram"
    }
  ];

  constructor(private authService: MobileAuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  getFirstName(): string {
    return this.user?.name.split(' ')[0] || 'User';
  }

  formatTime(date?: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  formatDate(date?: Date): string {
    if (!date) return '';
    const today = new Date();
    const compareDate = new Date(date);
    
    if (compareDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (compareDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return compareDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatBookingDate(date: Date): string {
    const today = new Date();
    const bookingDate = new Date(date);
    
    const diffTime = bookingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    
    return bookingDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getAmenityIcon(name: string): string {
    const icons: Record<string, string> = {
      'Gym': 'fitness_center',
      'Pool': 'pool',
      'Clubhouse': 'celebration',
      'Court': 'sports_tennis',
      'Garden': 'park'
    };
    return icons[name] || 'event';
  }

  getAmenityColor(name: string): string {
    const colors: Record<string, string> = {
      'Gym': '#ff9f43',
      'Pool': '#3498db',
      'Clubhouse': '#9b59b6',
      'Court': '#10ac84',
      'Garden': '#2ecc71'
    };
    return colors[name] || '#667eea';
  }

  getNoticeIcon(type: string): string {
    const icons: Record<string, string> = {
      'announcement': 'campaign',
      'event': 'celebration',
      'emergency': 'emergency',
      'maintenance': 'construction',
      'meeting': 'groups'
    };
    return icons[type] || 'notifications';
  }

  getNoticeColor(type: string): string {
    const colors: Record<string, string> = {
      'announcement': '#667eea',
      'event': '#10ac84',
      'emergency': '#ff4757',
      'maintenance': '#ff9f43',
      'meeting': '#3498db'
    };
    return colors[type] || '#667eea';
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
