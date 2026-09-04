import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  DeliveryTracking,
  DeliveryStatus,
  UpdateDeliveryStatusRequest
} from '../models/delivery-tracking.model';

@Component({
  selector: 'app-delivery-tracking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delivery-detail-container" *ngIf="delivery">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1><i class="material-icons">local_shipping</i> Delivery Details</h1>
      </div>

      <div class="detail-grid">
        <!-- Main Info -->
        <div class="detail-card">
          <div class="card-header">
            <h2>Order Information</h2>
            <div class="status-badge" [ngClass]="getStatusClass(delivery.status)">
              <i class="material-icons">{{ getStatusIcon(delivery.status) }}</i>
              <span>{{ getStatusName(delivery.status) }}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <label>Order ID</label>
                <span class="value">{{ delivery.orderId }}</span>
              </div>
              <div class="info-item">
                <label>Service</label>
                <span class="value">{{ getServiceName(delivery.service) }}</span>
              </div>
              <div class="info-item">
                <label>Type</label>
                <span class="value">{{ getTypeName(delivery.deliveryType) }}</span>
              </div>
              <div class="info-item">
                <label>Recipient</label>
                <span class="value">{{ delivery.recipientName }}</span>
              </div>
              <div class="info-item">
                <label>Phone</label>
                <span class="value">{{ delivery.recipientPhone }}</span>
              </div>
              <div class="info-item">
                <label>Flat</label>
                <span class="value">{{ delivery.flatNumber }} <span *ngIf="delivery.unitNumber">- {{ delivery.unitNumber }}</span></span>
              </div>
              <div class="info-item" *ngIf="delivery.estimatedArrival">
                <label>Estimated Arrival</label>
                <span class="value">{{ formatDateTime(delivery.estimatedArrival) }}</span>
              </div>
              <div class="info-item" *ngIf="delivery.actualArrival">
                <label>Actual Arrival</label>
                <span class="value">{{ formatDateTime(delivery.actualArrival) }}</span>
              </div>
              <div class="info-item" *ngIf="delivery.deliveredAt">
                <label>Delivered At</label>
                <span class="value">{{ formatDateTime(delivery.deliveredAt) }}</span>
              </div>
              <div class="info-item" *ngIf="delivery.totalAmount">
                <label>Total Amount</label>
                <span class="value">₹{{ delivery.totalAmount }}</span>
              </div>
              <div class="info-item" *ngIf="delivery.paymentMethod">
                <label>Payment Method</label>
                <span class="value">{{ delivery.paymentMethod }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div class="detail-card" *ngIf="delivery.items && delivery.items.length > 0">
          <div class="card-header">
            <h2>Order Items</h2>
          </div>
          <div class="card-body">
            <div class="items-list">
              <div *ngFor="let item of delivery.items" class="item-row">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-quantity">Qty: {{ item.quantity }}</div>
                <div class="item-price" *ngIf="item.price">₹{{ item.price * item.quantity }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Delivery Person -->
        <div class="detail-card" *ngIf="delivery.deliveryPersonName">
          <div class="card-header">
            <h2>Delivery Person</h2>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <label>Name</label>
                <span class="value">{{ delivery.deliveryPersonName }}</span>
              </div>
              <div class="info-item" *ngIf="delivery.deliveryPersonPhone">
                <label>Phone</label>
                <span class="value"><a [href]="'tel:' + delivery.deliveryPersonPhone">{{ delivery.deliveryPersonPhone }}</a></span>
              </div>
              <div class="info-item" *ngIf="delivery.vehicleNumber">
                <label>Vehicle Number</label>
                <span class="value">{{ delivery.vehicleNumber }}</span>
              </div>
              <div class="info-item" *ngIf="delivery.currentLocation">
                <label>Current Location</label>
                <span class="value">{{ delivery.currentLocation }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Special Instructions -->
        <div class="detail-card" *ngIf="delivery.specialInstructions">
          <div class="card-header">
            <h2>Special Instructions</h2>
          </div>
          <div class="card-body">
            <p>{{ delivery.specialInstructions }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="delivery.notes">
          <div class="card-header">
            <h2>Notes</h2>
          </div>
          <div class="card-body">
            <p>{{ delivery.notes }}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-card">
        <button 
          class="btn-primary" 
          *ngIf="delivery.trackingUrl"
          (click)="openTracking(delivery.trackingUrl)">
          <i class="material-icons">open_in_new</i>
          Track on {{ getServiceName(delivery.service) }}
        </button>
        <button 
          class="btn-success" 
          *ngIf="delivery.requiresApproval && !delivery.approved"
          (click)="approveDelivery()">
          <i class="material-icons">check_circle</i>
          Approve Delivery
        </button>
        <button 
          class="btn-secondary" 
          (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to List
        </button>
      </div>
    </div>

    <div class="loading-state" *ngIf="!delivery && !isLoading">
      <i class="material-icons">error</i>
      <h3>Delivery Not Found</h3>
      <button class="btn-primary" (click)="goBack()">Back to List</button>
    </div>

    <div class="loading-state" *ngIf="isLoading">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading delivery details...</p>
    </div>
  `,
  styles: [`
    .delivery-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .btn-back:hover {
      background: #f5f5f5;
      border-radius: 8px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .detail-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .card-header h2 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
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

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 600;
      text-transform: uppercase;
    }

    .info-item .value {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .info-item .value a {
      color: #667eea;
      text-decoration: none;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .item-name {
      flex: 1;
      font-weight: 500;
      color: #2c3e50;
    }

    .item-quantity {
      margin: 0 16px;
      color: #7f8c8d;
      font-size: 14px;
    }

    .item-price {
      font-weight: 600;
      color: #2c3e50;
    }

    .actions-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-primary,
    .btn-success,
    .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-success {
      background: #43e97b;
      color: white;
    }

    .btn-success:hover {
      background: #38d96b;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .loading-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    @media (max-width: 768px) {
      .delivery-detail-container {
        padding: 16px;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DeliveryTrackingDetailComponent implements OnInit {
  delivery: DeliveryTracking | null = null;
  isLoading = false;
  deliveryId: string = '';

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.deliveryId = params['id'];
      this.loadDelivery();
    });
  }

  loadDelivery(): void {
    this.isLoading = true;
    this.visitorService.getDeliveryById(this.deliveryId).subscribe({
      next: (delivery) => {
        this.delivery = delivery || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading delivery:', error);
        this.isLoading = false;
      }
    });
  }

  approveDelivery(): void {
    if (!this.delivery) return;

    if (confirm('Approve this delivery?')) {
      this.visitorService.approveDelivery(this.delivery.id, 'ADMIN-001').subscribe({
        next: (response) => {
          if (response.success) {
            alert('Delivery approved successfully!');
            this.loadDelivery();
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

  openTracking(url: string): void {
    window.open(url, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors/deliveries']);
  }

  getServiceName(service: string): string {
    return service.replace('_', ' ');
  }

  getTypeName(type: string): string {
    return type.replace('_', ' ');
  }

  getStatusName(status: DeliveryStatus): string {
    return status.replace(/_/g, ' ');
  }

  getStatusClass(status: DeliveryStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  getStatusIcon(status: DeliveryStatus): string {
    switch (status) {
      case DeliveryStatus.ORDERED:
        return 'receipt';
      case DeliveryStatus.OUT_FOR_DELIVERY:
        return 'local_shipping';
      case DeliveryStatus.ARRIVED:
        return 'location_on';
      case DeliveryStatus.DELIVERED:
        return 'check_circle';
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

