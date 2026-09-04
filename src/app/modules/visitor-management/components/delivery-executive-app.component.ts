import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  DeliveryTracking,
  DeliveryStatus,
  UpdateDeliveryStatusRequest
} from '../models/delivery-tracking.model';

@Component({
  selector: 'app-delivery-executive-app',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delivery-executive-app">
      <!-- Header -->
      <div class="app-header">
        <div class="header-content">
          <div class="executive-info">
            <div class="executive-avatar">
              <i class="material-icons">person</i>
            </div>
            <div class="executive-details">
              <h2>{{ executiveName }}</h2>
              <p class="executive-id">ID: {{ executiveId }}</p>
            </div>
          </div>
          <button class="btn-logout" (click)="logout()">
            <i class="material-icons">logout</i>
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-value">{{ activeDeliveries.length }}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ completedToday }}</div>
          <div class="stat-label">Completed Today</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pendingDeliveries.length }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'active'"
          (click)="switchTab('active')">
          <i class="material-icons">local_shipping</i>
          Active Deliveries
          <span class="badge" *ngIf="activeDeliveries.length > 0">{{ activeDeliveries.length }}</span>
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'completed'"
          (click)="switchTab('completed')">
          <i class="material-icons">check_circle</i>
          Completed
        </button>
      </div>

      <!-- Active Deliveries -->
      <div class="deliveries-container" *ngIf="activeTab === 'active'">
        <div class="deliveries-list" *ngIf="!isLoading && activeDeliveries.length > 0">
          <div 
            *ngFor="let delivery of activeDeliveries" 
            class="delivery-card"
            [class.arrived]="delivery.status === DeliveryStatus.ARRIVED">
            <div class="delivery-card-header">
              <div class="service-badge" [ngClass]="getServiceClass(delivery.service)">
                <i class="material-icons">{{ getServiceIcon(delivery.service) }}</i>
                <span>{{ getServiceName(delivery.service) }}</span>
              </div>
              <div class="status-badge" [ngClass]="getStatusClass(delivery.status)">
                {{ getStatusName(delivery.status) }}
              </div>
            </div>

            <div class="delivery-card-body">
              <div class="order-id">
                <i class="material-icons">receipt</i>
                <span>{{ delivery.orderId }}</span>
              </div>

              <div class="delivery-info">
                <div class="info-item">
                  <i class="material-icons">person</i>
                  <div class="info-content">
                    <label>Recipient</label>
                    <span class="value">{{ delivery.recipientName }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <i class="material-icons">home</i>
                  <div class="info-content">
                    <label>Address</label>
                    <span class="value">{{ delivery.flatNumber }} <span *ngIf="delivery.unitNumber">- {{ delivery.unitNumber }}</span></span>
                  </div>
                </div>
                <div class="info-item">
                  <i class="material-icons">phone</i>
                  <div class="info-content">
                    <label>Phone</label>
                    <span class="value"><a [href]="'tel:' + delivery.recipientPhone">{{ delivery.recipientPhone }}</a></span>
                  </div>
                </div>
                <div class="info-item" *ngIf="delivery.estimatedArrival">
                  <i class="material-icons">schedule</i>
                  <div class="info-content">
                    <label>ETA</label>
                    <span class="value">{{ formatTime(delivery.estimatedArrival) }}</span>
                  </div>
                </div>
                <div class="info-item" *ngIf="delivery.specialInstructions">
                  <i class="material-icons">note</i>
                  <div class="info-content">
                    <label>Instructions</label>
                    <span class="value">{{ delivery.specialInstructions }}</span>
                  </div>
                </div>
              </div>

              <div class="delivery-actions">
                <button 
                  class="btn-action btn-call"
                  (click)="callRecipient(delivery.recipientPhone)">
                  <i class="material-icons">phone</i>
                  Call
                </button>
                <button 
                  class="btn-action btn-navigate"
                  (click)="navigateToLocation(delivery.flatNumber)">
                  <i class="material-icons">navigation</i>
                  Navigate
                </button>
                <button 
                  class="btn-action btn-status"
                  *ngIf="delivery.status === DeliveryStatus.OUT_FOR_DELIVERY"
                  (click)="markAsArrived(delivery)">
                  <i class="material-icons">location_on</i>
                  Mark Arrived
                </button>
                <button 
                  class="btn-action btn-deliver"
                  *ngIf="delivery.status === DeliveryStatus.ARRIVED"
                  (click)="markAsDelivered(delivery)">
                  <i class="material-icons">check_circle</i>
                  Mark Delivered
                </button>
                <button 
                  class="btn-action btn-failed"
                  (click)="markAsFailed(delivery)">
                  <i class="material-icons">error</i>
                  Failed
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoading && activeDeliveries.length === 0">
          <i class="material-icons">inbox</i>
          <h3>No Active Deliveries</h3>
          <p>You have no active deliveries at the moment</p>
        </div>
      </div>

      <!-- Completed Deliveries -->
      <div class="deliveries-container" *ngIf="activeTab === 'completed'">
        <div class="deliveries-list" *ngIf="!isLoading && completedDeliveries.length > 0">
          <div 
            *ngFor="let delivery of completedDeliveries" 
            class="delivery-card completed">
            <div class="delivery-card-header">
              <div class="service-badge" [ngClass]="getServiceClass(delivery.service)">
                <i class="material-icons">{{ getServiceIcon(delivery.service) }}</i>
                <span>{{ getServiceName(delivery.service) }}</span>
              </div>
              <div class="status-badge delivered">
                <i class="material-icons">check_circle</i>
                Delivered
              </div>
            </div>

            <div class="delivery-card-body">
              <div class="order-id">
                <i class="material-icons">receipt</i>
                <span>{{ delivery.orderId }}</span>
              </div>

              <div class="delivery-info">
                <div class="info-item">
                  <i class="material-icons">person</i>
                  <div class="info-content">
                    <label>Recipient</label>
                    <span class="value">{{ delivery.recipientName }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <i class="material-icons">home</i>
                  <div class="info-content">
                    <label>Address</label>
                    <span class="value">{{ delivery.flatNumber }} <span *ngIf="delivery.unitNumber">- {{ delivery.unitNumber }}</span></span>
                  </div>
                </div>
                <div class="info-item" *ngIf="delivery.deliveredAt">
                  <i class="material-icons">schedule</i>
                  <div class="info-content">
                    <label>Delivered At</label>
                    <span class="value">{{ formatDateTime(delivery.deliveredAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoading && completedDeliveries.length === 0">
          <i class="material-icons">check_circle</i>
          <h3>No Completed Deliveries</h3>
          <p>Your completed deliveries will appear here</p>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading deliveries...</p>
      </div>
    </div>
  `,
  styles: [`
    .delivery-executive-app {
      min-height: 100vh;
      background: #f5f7fa;
      padding-bottom: 20px;
    }

    /* Header */
    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .executive-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .executive-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .executive-details h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .executive-id {
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .btn-logout {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Stats Bar */
    .stats-bar {
      background: white;
      display: flex;
      justify-content: space-around;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      margin-bottom: 16px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Tabs */
    .tabs {
      display: flex;
      background: white;
      padding: 8px;
      margin: 0 16px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .tab-button {
      flex: 1;
      padding: 12px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #7f8c8d;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .tab-button.active {
      background: #667eea;
      color: white;
    }

    .tab-button .badge {
      background: rgba(255,255,255,0.3);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .tab-button.active .badge {
      background: rgba(255,255,255,0.2);
    }

    /* Deliveries Container */
    .deliveries-container {
      padding: 0 16px;
    }

    .deliveries-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .delivery-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .delivery-card.arrived {
      border: 2px solid #43e97b;
      background: rgba(67, 233, 123, 0.05);
    }

    .delivery-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .service-badge {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      color: white;
    }

    .service-badge.amazon {
      background: #ff9900;
    }

    .service-badge.zomato {
      background: #e23744;
    }

    .service-badge.swiggy {
      background: #fc8019;
    }

    .service-badge.flipkart {
      background: #2874f0;
    }

    .service-badge.other {
      background: #7f8c8d;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-badge.out-for-delivery {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.arrived {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.delivered {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.failed {
      background: #f8d7da;
      color: #721c24;
    }

    .order-id {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .delivery-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .info-item .material-icons {
      color: #667eea;
      font-size: 20px;
      margin-top: 2px;
    }

    .info-content {
      flex: 1;
    }

    .info-content label {
      display: block;
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .info-content value {
      display: block;
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .info-content value a {
      color: #667eea;
      text-decoration: none;
    }

    .delivery-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
      margin-top: 16px;
    }

    .btn-action {
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-call {
      background: #43e97b;
      color: white;
    }

    .btn-call:hover {
      background: #38d96b;
    }

    .btn-navigate {
      background: #667eea;
      color: white;
    }

    .btn-navigate:hover {
      background: #5568d3;
    }

    .btn-status {
      background: #ffc107;
      color: #2c3e50;
    }

    .btn-status:hover {
      background: #ffb300;
    }

    .btn-deliver {
      background: #43e97b;
      color: white;
    }

    .btn-deliver:hover {
      background: #38d96b;
    }

    .btn-failed {
      background: #f5576c;
      color: white;
    }

    .btn-failed:hover {
      background: #e4465a;
    }

    /* Empty and Loading States */
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      margin: 20px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .delivery-actions {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class DeliveryExecutiveAppComponent implements OnInit {
  executiveId: string = 'DEL-EXEC-001';
  executiveName: string = 'Rajesh Kumar';
  activeTab: 'active' | 'completed' = 'active';
  isLoading = false;
  
  allDeliveries: DeliveryTracking[] = [];
  activeDeliveries: DeliveryTracking[] = [];
  pendingDeliveries: DeliveryTracking[] = [];
  completedDeliveries: DeliveryTracking[] = [];
  completedToday: number = 0;

  DeliveryStatus = DeliveryStatus;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDeliveries();
  }

  loadDeliveries(): void {
    this.isLoading = true;
    // Get deliveries assigned to this executive
    this.visitorService.getDeliveriesByExecutive(this.executiveId, this.executiveName).subscribe({
      next: (deliveries) => {
        this.allDeliveries = deliveries;
        this.filterDeliveries();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading deliveries:', error);
        // Fallback to all deliveries if executive-specific fails
        this.visitorService.getAllDeliveries().subscribe({
          next: (deliveries) => {
            this.allDeliveries = deliveries;
            this.filterDeliveries();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error loading deliveries:', err);
            this.isLoading = false;
          }
        });
      }
    });
  }

  filterDeliveries(): void {
    // Filter deliveries assigned to this executive
    // For demo, we'll show deliveries that are out for delivery or arrived
    this.activeDeliveries = this.allDeliveries.filter(d => 
      d.status === DeliveryStatus.OUT_FOR_DELIVERY || 
      d.status === DeliveryStatus.ARRIVED ||
      (d.deliveryPersonName && d.deliveryPersonName.includes('Rajesh'))
    );

    this.pendingDeliveries = this.allDeliveries.filter(d => 
      d.status === DeliveryStatus.ORDERED || 
      d.status === DeliveryStatus.CONFIRMED ||
      d.status === DeliveryStatus.PREPARING
    );

    this.completedDeliveries = this.allDeliveries.filter(d => 
      d.status === DeliveryStatus.DELIVERED
    );

    // Count completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.completedToday = this.completedDeliveries.filter(d => {
      if (!d.deliveredAt) return false;
      const delivered = new Date(d.deliveredAt);
      delivered.setHours(0, 0, 0, 0);
      return delivered.getTime() === today.getTime();
    }).length;
  }

  switchTab(tab: 'active' | 'completed'): void {
    this.activeTab = tab;
  }

  markAsArrived(delivery: DeliveryTracking): void {
    if (confirm('Mark this delivery as arrived?')) {
      const request: UpdateDeliveryStatusRequest = {
        deliveryId: delivery.id,
        status: DeliveryStatus.ARRIVED,
        currentLocation: `At ${delivery.flatNumber}`,
        deliveryPersonName: this.executiveName,
        deliveryPersonPhone: '+91 98765 43250',
        notes: `Arrived at location by ${this.executiveName}`
      };

      this.visitorService.updateDeliveryStatus(request).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Delivery marked as arrived!');
            this.loadDeliveries();
          } else {
            alert(response.message || 'Failed to update status');
          }
        },
        error: (error) => {
          console.error('Error updating status:', error);
          alert('An error occurred while updating status');
        }
      });
    }
  }

  markAsDelivered(delivery: DeliveryTracking): void {
    if (confirm('Mark this delivery as delivered?')) {
      const request: UpdateDeliveryStatusRequest = {
        deliveryId: delivery.id,
        status: DeliveryStatus.DELIVERED,
        deliveryPersonName: this.executiveName,
        deliveryPersonPhone: '+91 98765 43250',
        notes: `Delivered successfully by ${this.executiveName}`
      };

      this.visitorService.updateDeliveryStatus(request).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Delivery marked as delivered!');
            this.loadDeliveries();
          } else {
            alert(response.message || 'Failed to update status');
          }
        },
        error: (error) => {
          console.error('Error updating status:', error);
          alert('An error occurred while updating status');
        }
      });
    }
  }

  markAsFailed(delivery: DeliveryTracking): void {
    const reason = prompt('Enter failure reason:');
    if (reason) {
      const request: UpdateDeliveryStatusRequest = {
        deliveryId: delivery.id,
        status: DeliveryStatus.FAILED,
        deliveryPersonName: this.executiveName,
        deliveryPersonPhone: '+91 98765 43250',
        notes: `Failed: ${reason}`
      };

      this.visitorService.updateDeliveryStatus(request).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Delivery marked as failed!');
            this.loadDeliveries();
          } else {
            alert(response.message || 'Failed to update status');
          }
        },
        error: (error) => {
          console.error('Error updating status:', error);
          alert('An error occurred while updating status');
        }
      });
    }
  }

  callRecipient(phone: string): void {
    window.location.href = `tel:${phone}`;
  }

  navigateToLocation(flatNumber: string): void {
    // In real app, open maps with the address
    const address = `Society Name, ${flatNumber}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  }

  logout(): void {
    if (confirm('Logout from delivery executive app?')) {
      this.router.navigate(['/admin/visitors/deliveries']);
    }
  }

  getServiceName(service: string): string {
    return service.replace('_', ' ');
  }

  getServiceClass(service: string): string {
    return service.toLowerCase();
  }

  getServiceIcon(service: string): string {
    switch (service) {
      case 'AMAZON':
      case 'FLIPKART':
        return 'shopping_cart';
      case 'ZOMATO':
      case 'SWIGGY':
        return 'restaurant';
      default:
        return 'local_shipping';
    }
  }

  getStatusName(status: DeliveryStatus): string {
    return status.replace(/_/g, ' ');
  }

  getStatusClass(status: DeliveryStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  formatTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
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

