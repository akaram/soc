import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  DeliveryTracking,
  DeliveryService,
  DeliveryStatus,
  DeliveryType,
  DeliveryStatistics,
  DeliveryFilter
} from '../models/delivery-tracking.model';

@Component({
  selector: 'app-delivery-tracking-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delivery-tracking-container">
      <div class="page-header">
        <h1><i class="material-icons">local_shipping</i> Delivery Tracking</h1>
        <p>Track deliveries from Amazon, Zomato, Swiggy, and more</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">inventory</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalToday }}</div>
            <div class="stat-label">Today's Deliveries</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.pending }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card out-for-delivery">
          <div class="stat-icon">
            <i class="material-icons">local_shipping</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.outForDelivery }}</div>
            <div class="stat-label">Out for Delivery</div>
          </div>
        </div>
        <div class="stat-card delivered">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.delivered }}</div>
            <div class="stat-label">Delivered</div>
          </div>
        </div>
      </div>

      <!-- Service Statistics -->
      <div class="service-stats" *ngIf="statistics">
        <h3><i class="material-icons">store</i> By Service</h3>
        <div class="service-badges">
          <div class="service-badge amazon">
            <i class="material-icons">shopping_cart</i>
            <span>Amazon: {{ statistics.byService.amazon }}</span>
          </div>
          <div class="service-badge zomato">
            <i class="material-icons">restaurant</i>
            <span>Zomato: {{ statistics.byService.zomato }}</span>
          </div>
          <div class="service-badge swiggy">
            <i class="material-icons">restaurant_menu</i>
            <span>Swiggy: {{ statistics.byService.swiggy }}</span>
          </div>
          <div class="service-badge flipkart">
            <i class="material-icons">store</i>
            <span>Flipkart: {{ statistics.byService.flipkart }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="filter-row">
          <div class="filter-group">
            <label for="serviceFilter">Service</label>
            <select id="serviceFilter" [(ngModel)]="filter.service" (change)="applyFilters()">
              <option [value]="undefined">All Services</option>
              <option [value]="service" *ngFor="let service of serviceOptions">{{ getServiceName(service) }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="typeFilter">Type</label>
            <select id="typeFilter" [(ngModel)]="filter.deliveryType" (change)="applyFilters()">
              <option [value]="undefined">All Types</option>
              <option [value]="type" *ngFor="let type of typeOptions">{{ getTypeName(type) }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="statusFilter">Status</label>
            <select id="statusFilter" [(ngModel)]="filter.status" (change)="applyFilters()">
              <option [value]="undefined">All Statuses</option>
              <option [value]="status" *ngFor="let status of statusOptions">{{ getStatusName(status) }}</option>
            </select>
          </div>
          <div class="filter-group search">
            <label for="searchTerm">Search</label>
            <input 
              type="text" 
              id="searchTerm"
              [(ngModel)]="filter.searchTerm"
              (input)="applyFilters()"
              placeholder="Order ID, Name, Phone...">
          </div>
        </div>
      </div>

      <!-- Executive App Link -->
      <div class="executive-app-link">
        <a routerLink="/admin/visitors/deliveries/executive/app" class="btn-executive-app">
          <i class="material-icons">phone_android</i>
          Delivery Executive App
        </a>
      </div>

      <!-- Deliveries List -->
      <div class="deliveries-list" *ngIf="!isLoading && deliveries.length > 0">
        <div 
          *ngFor="let delivery of deliveries" 
          class="delivery-card"
          [class.requires-approval]="delivery.requiresApproval && !delivery.approved"
          (click)="viewDetails(delivery.id)">
          <div class="delivery-header">
            <div class="service-badge-large" [ngClass]="getServiceClass(delivery.service)">
              <i class="material-icons">{{ getServiceIcon(delivery.service) }}</i>
              <span>{{ getServiceName(delivery.service) }}</span>
            </div>
            <div class="status-badge" [ngClass]="getStatusClass(delivery.status)">
              <i class="material-icons">{{ getStatusIcon(delivery.status) }}</i>
              <span>{{ getStatusName(delivery.status) }}</span>
            </div>
          </div>

          <div class="delivery-body">
            <div class="order-info">
              <div class="info-row">
                <span class="label">Order ID:</span>
                <span class="value">{{ delivery.orderId }}</span>
              </div>
              <div class="info-row">
                <span class="label">Recipient:</span>
                <span class="value">{{ delivery.recipientName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Flat:</span>
                <span class="value">{{ delivery.flatNumber }} <span *ngIf="delivery.unitNumber">- {{ delivery.unitNumber }}</span></span>
              </div>
              <div class="info-row" *ngIf="delivery.estimatedArrival">
                <span class="label">ETA:</span>
                <span class="value">{{ formatDateTime(delivery.estimatedArrival) }}</span>
              </div>
              <div class="info-row" *ngIf="delivery.totalAmount">
                <span class="label">Amount:</span>
                <span class="value">₹{{ delivery.totalAmount }}</span>
              </div>
            </div>

            <div class="delivery-actions">
              <button 
                class="btn-view" 
                (click)="viewDetails(delivery.id); $event.stopPropagation()">
                <i class="material-icons">visibility</i>
                View Details
              </button>
              <button 
                class="btn-track" 
                *ngIf="delivery.trackingUrl"
                (click)="openTracking(delivery.trackingUrl); $event.stopPropagation()">
                <i class="material-icons">open_in_new</i>
                Track
              </button>
              <button 
                class="btn-approve" 
                *ngIf="delivery.requiresApproval && !delivery.approved"
                (click)="approveDelivery(delivery.id); $event.stopPropagation()">
                <i class="material-icons">check_circle</i>
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && deliveries.length === 0">
        <i class="material-icons">local_shipping</i>
        <h3>No Deliveries Found</h3>
        <p>No deliveries match your current filters</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading deliveries...</p>
      </div>
    </div>
  `,
  styles: [`
    .delivery-tracking-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    /* Statistics */
    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-card.pending .stat-icon {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .stat-card.out-for-delivery .stat-icon {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }

    .stat-card.delivered .stat-icon {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
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

    /* Service Stats */
    .service-stats {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .service-stats h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .service-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .service-badge {
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .service-badge.amazon {
      background: #ff9900;
      color: white;
    }

    .service-badge.zomato {
      background: #e23744;
      color: white;
    }

    .service-badge.swiggy {
      background: #fc8019;
      color: white;
    }

    .service-badge.flipkart {
      background: #2874f0;
      color: white;
    }

    /* Filters */
    .filters-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .filter-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-group.search {
      grid-column: 1 / -1;
    }

    .filter-group label {
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .filter-group select,
    .filter-group input {
      padding: 10px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-group select:focus,
    .filter-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    /* Deliveries List */
    .executive-app-link {
      margin-bottom: 24px;
      text-align: center;
    }

    .btn-executive-app {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transition: all 0.2s;
    }

    .btn-executive-app:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
    }

    .deliveries-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }

    .delivery-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .delivery-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .delivery-card.requires-approval {
      border-color: #f5576c;
      background: rgba(245, 87, 108, 0.05);
    }

    .delivery-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .service-badge-large {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
    }

    .service-badge-large.amazon {
      background: #ff9900;
    }

    .service-badge-large.zomato {
      background: #e23744;
    }

    .service-badge-large.swiggy {
      background: #fc8019;
    }

    .service-badge-large.flipkart {
      background: #2874f0;
    }

    .service-badge-large.other {
      background: #7f8c8d;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-badge.ordered {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.confirmed {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-badge.preparing {
      background: #d4edda;
      color: #155724;
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

    .delivery-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .order-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .info-row .label {
      color: #7f8c8d;
      font-weight: 500;
    }

    .info-row .value {
      color: #2c3e50;
      font-weight: 600;
    }

    .delivery-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-view,
    .btn-track,
    .btn-approve {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-view {
      background: #667eea;
      color: white;
    }

    .btn-view:hover {
      background: #5568d3;
    }

    .btn-track {
      background: #43e97b;
      color: white;
    }

    .btn-track:hover {
      background: #38d96b;
    }

    .btn-approve {
      background: #f5576c;
      color: white;
    }

    .btn-approve:hover {
      background: #e4465a;
    }

    /* Empty and Loading States */
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
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
      .delivery-tracking-container {
        padding: 16px;
      }

      .statistics-grid {
        grid-template-columns: 1fr;
      }

      .deliveries-list {
        grid-template-columns: 1fr;
      }

      .filter-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DeliveryTrackingListComponent implements OnInit {
  deliveries: DeliveryTracking[] = [];
  statistics: DeliveryStatistics | null = null;
  isLoading = false;
  filter: DeliveryFilter = {};

  serviceOptions = Object.values(DeliveryService);
  typeOptions = Object.values(DeliveryType);
  statusOptions = Object.values(DeliveryStatus);

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadDeliveries();
  }

  loadStatistics(): void {
    this.visitorService.getDeliveryStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadDeliveries(): void {
    this.isLoading = true;
    this.visitorService.getAllDeliveries(this.filter).subscribe({
      next: (deliveries) => {
        this.deliveries = deliveries;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading deliveries:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadDeliveries();
  }

  viewDetails(deliveryId: string): void {
    this.router.navigate(['/admin/visitors/deliveries', deliveryId]);
  }

  openTracking(url: string): void {
    window.open(url, '_blank');
  }

  approveDelivery(deliveryId: string): void {
    if (confirm('Approve this delivery?')) {
      this.visitorService.approveDelivery(deliveryId, 'ADMIN-001').subscribe({
        next: (response) => {
          if (response.success) {
            alert('Delivery approved successfully!');
            this.loadDeliveries();
            this.loadStatistics();
          } else {
            alert(response.message || 'Failed to approve delivery');
          }
        },
        error: (error) => {
          console.error('Error approving delivery:', error);
          alert('An error occurred while approving the delivery');
        }
      });
    }
  }

  getServiceName(service: DeliveryService): string {
    return service.replace('_', ' ');
  }

  getTypeName(type: DeliveryType): string {
    return type.replace('_', ' ');
  }

  getStatusName(status: DeliveryStatus): string {
    return status.replace(/_/g, ' ');
  }

  getServiceClass(service: DeliveryService): string {
    return service.toLowerCase();
  }

  getServiceIcon(service: DeliveryService): string {
    switch (service) {
      case DeliveryService.AMAZON:
      case DeliveryService.FLIPKART:
        return 'shopping_cart';
      case DeliveryService.ZOMATO:
      case DeliveryService.SWIGGY:
        return 'restaurant';
      default:
        return 'local_shipping';
    }
  }

  getStatusClass(status: DeliveryStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  getStatusIcon(status: DeliveryStatus): string {
    switch (status) {
      case DeliveryStatus.ORDERED:
        return 'receipt';
      case DeliveryStatus.CONFIRMED:
        return 'check_circle_outline';
      case DeliveryStatus.PREPARING:
        return 'restaurant';
      case DeliveryStatus.OUT_FOR_DELIVERY:
        return 'local_shipping';
      case DeliveryStatus.ARRIVED:
        return 'location_on';
      case DeliveryStatus.DELIVERED:
        return 'check_circle';
      case DeliveryStatus.FAILED:
        return 'error';
      case DeliveryStatus.CANCELLED:
        return 'cancel';
      default:
        return 'help_outline';
    }
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

