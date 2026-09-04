import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  SchoolBus,
  BusStatus,
  BusLocation
} from '../models/school-bus-tracking.model';

@Component({
  selector: 'app-school-bus-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bus-detail-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1><i class="material-icons">directions_bus</i> School Bus Details</h1>
      </div>

      <div class="detail-content" *ngIf="bus && !isLoading">
        <!-- Bus Info Card -->
        <div class="info-card">
          <div class="card-header">
            <div class="bus-avatar-large">
              <i class="material-icons">directions_bus</i>
            </div>
            <div class="bus-title">
              <h2>{{ bus.busNumber }}</h2>
              <span class="status-badge" [ngClass]="getStatusClass(bus.status)">
                <i class="material-icons">{{ getStatusIcon(bus.status) }}</i>
                {{ getStatusName(bus.status) }}
              </span>
            </div>
          </div>

          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <label><i class="material-icons">confirmation_number</i> Vehicle Number</label>
                <span>{{ bus.vehicleNumber }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">person</i> Driver Name</label>
                <span>{{ bus.driverName }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">phone</i> Driver Phone</label>
                <span><a [href]="'tel:' + bus.driverPhone">{{ bus.driverPhone }}</a></span>
              </div>
              <div class="info-item" *ngIf="bus.driverLicense">
                <label><i class="material-icons">badge</i> Driver License</label>
                <span>{{ bus.driverLicense }}</span>
              </div>
              <div class="info-item" *ngIf="bus.conductorName">
                <label><i class="material-icons">person</i> Conductor Name</label>
                <span>{{ bus.conductorName }}</span>
              </div>
              <div class="info-item" *ngIf="bus.conductorPhone">
                <label><i class="material-icons">phone</i> Conductor Phone</label>
                <span><a [href]="'tel:' + bus.conductorPhone">{{ bus.conductorPhone }}</a></span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">route</i> Route</label>
                <span>{{ bus.route?.routeName || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">people</i> Students</label>
                <span>{{ bus.studentCount }}/{{ bus.maxCapacity }}</span>
              </div>
              <div class="info-item" *ngIf="bus.scheduledPickupTime">
                <label><i class="material-icons">schedule</i> Scheduled Pickup</label>
                <span>{{ bus.scheduledPickupTime }}</span>
              </div>
              <div class="info-item" *ngIf="bus.scheduledDropoffTime">
                <label><i class="material-icons">schedule</i> Scheduled Dropoff</label>
                <span>{{ bus.scheduledDropoffTime }}</span>
              </div>
              <div class="info-item" *ngIf="bus.actualPickupTime">
                <label><i class="material-icons">check_circle</i> Actual Pickup</label>
                <span>{{ formatDateTime(bus.actualPickupTime) }}</span>
              </div>
              <div class="info-item" *ngIf="bus.actualDropoffTime">
                <label><i class="material-icons">check_circle</i> Actual Dropoff</label>
                <span>{{ formatDateTime(bus.actualDropoffTime) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Real-time Location Card -->
        <div class="info-card" *ngIf="bus.currentLocation">
          <div class="card-header">
            <h3><i class="material-icons">location_on</i> Real-Time Location</h3>
            <div class="location-status" [ngClass]="{'tracking': bus.isLocationTrackingEnabled, 'offline': !bus.isLocationTrackingEnabled}">
              <i class="material-icons">{{ bus.isLocationTrackingEnabled ? 'location_on' : 'location_off' }}</i>
              {{ bus.isLocationTrackingEnabled ? 'Live Tracking' : 'Tracking Offline' }}
            </div>
          </div>
          <div class="card-body">
            <div class="location-info">
              <div class="location-item">
                <label>Address</label>
                <span class="value">{{ bus.currentLocation.address || 'Location Available' }}</span>
              </div>
              <div class="location-grid">
                <div class="location-item">
                  <label>Latitude</label>
                  <span class="value">{{ bus.currentLocation.latitude.toFixed(6) }}</span>
                </div>
                <div class="location-item">
                  <label>Longitude</label>
                  <span class="value">{{ bus.currentLocation.longitude.toFixed(6) }}</span>
                </div>
                <div class="location-item" *ngIf="bus.currentLocation.speed">
                  <label>Speed</label>
                  <span class="value">{{ bus.currentLocation.speed }} km/h</span>
                </div>
                <div class="location-item" *ngIf="bus.currentLocation.heading">
                  <label>Heading</label>
                  <span class="value">{{ bus.currentLocation.heading }}°</span>
                </div>
              </div>
              <div class="location-item" *ngIf="bus.lastLocationUpdate">
                <label>Last Update</label>
                <span class="value">{{ formatDateTime(bus.lastLocationUpdate) }}</span>
              </div>
              <div class="location-actions">
                <button class="btn-primary" (click)="viewOnMap()">
                  <i class="material-icons">map</i>
                  View on Google Maps
                </button>
                <button class="btn-secondary" (click)="refreshLocation()">
                  <i class="material-icons">refresh</i>
                  Refresh Location
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Route Information -->
        <div class="info-card" *ngIf="bus.route">
          <div class="card-header">
            <h3><i class="material-icons">route</i> Route Information</h3>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <label>Route Name</label>
                <span>{{ bus.route.routeName }}</span>
              </div>
              <div class="info-item">
                <label>Route Number</label>
                <span>{{ bus.route.routeNumber }}</span>
              </div>
              <div class="info-item">
                <label>Route Type</label>
                <span>{{ bus.route.routeType }}</span>
              </div>
              <div class="info-item">
                <label>Start Location</label>
                <span>{{ bus.route.startLocation.address }}</span>
              </div>
              <div class="info-item">
                <label>End Location</label>
                <span>{{ bus.route.endLocation.address }}</span>
              </div>
              <div class="info-item">
                <label>Estimated Duration</label>
                <span>{{ bus.route.estimatedDuration }} minutes</span>
              </div>
              <div class="info-item">
                <label>Scheduled Start</label>
                <span>{{ bus.route.scheduledStartTime }}</span>
              </div>
              <div class="info-item">
                <label>Scheduled End</label>
                <span>{{ bus.route.scheduledEndTime }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions Card -->
        <div class="info-card">
          <div class="card-header">
            <h3><i class="material-icons">settings</i> Actions</h3>
          </div>
          <div class="card-body">
            <div class="action-buttons-grid">
              <button class="btn-action call" (click)="callDriver()">
                <i class="material-icons">phone</i>
                Call Driver
              </button>
              <button class="btn-action call" *ngIf="bus.conductorPhone" (click)="callConductor()">
                <i class="material-icons">phone</i>
                Call Conductor
              </button>
              <button class="btn-action map" (click)="viewOnMap()" *ngIf="bus.currentLocation">
                <i class="material-icons">map</i>
                View on Map
              </button>
              <button class="btn-action refresh" (click)="refreshLocation()">
                <i class="material-icons">refresh</i>
                Refresh Location
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading bus details...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!isLoading && !bus">
        <i class="material-icons">error_outline</i>
        <h3>Bus Not Found</h3>
        <p>The bus you're looking for doesn't exist or has been removed.</p>
        <button class="btn-primary" (click)="goBack()">
          Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .bus-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .btn-back {
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #667eea;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .page-header h1 {
      margin: 0;
      font-size: 32px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .card-header {
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .card-header h3 {
      margin: 0;
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bus-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }

    .bus-title {
      flex: 1;
    }

    .bus-title h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .location-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(255,255,255,0.2);
    }

    .location-status.tracking {
      background: rgba(40, 167, 69, 0.3);
    }

    .location-status.offline {
      background: rgba(220, 53, 69, 0.3);
    }

    .card-body {
      padding: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-item label .material-icons {
      font-size: 18px;
    }

    .info-item span {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .info-item span a {
      color: #667eea;
      text-decoration: none;
    }

    .location-info {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .location-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .location-item label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .location-item .value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .location-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .location-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .action-buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .btn-action {
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-action.call {
      background: #28a745;
      color: white;
    }

    .btn-action.call:hover {
      background: #218838;
    }

    .btn-action.map {
      background: #17a2b8;
      color: white;
    }

    .btn-action.map:hover {
      background: #138496;
    }

    .btn-action.refresh {
      background: #667eea;
      color: white;
    }

    .btn-action.refresh:hover {
      background: #5568d3;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
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

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons,
    .error-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .error-state .material-icons {
      color: #e74c3c;
    }

    .error-state h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .error-state p {
      margin: 0 0 24px 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .bus-detail-container {
        padding: 16px;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .action-buttons-grid {
        grid-template-columns: 1fr;
      }

      .location-actions {
        flex-direction: column;
      }
    }
  `]
})
export class SchoolBusDetailComponent implements OnInit {
  bus: SchoolBus | null = null;
  isLoading = false;
  busId: string = '';

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.busId = params['id'];
      this.loadBusDetails();
    });
  }

  loadBusDetails(): void {
    this.isLoading = true;
    this.visitorService.getSchoolBusById(this.busId).subscribe({
      next: (bus) => {
        this.bus = bus || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bus details:', error);
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors/school-bus']);
  }

  viewOnMap(): void {
    if (this.bus?.currentLocation) {
      const url = `https://www.google.com/maps?q=${this.bus.currentLocation.latitude},${this.bus.currentLocation.longitude}`;
      window.open(url, '_blank');
    }
  }

  callDriver(): void {
    if (this.bus?.driverPhone) {
      window.location.href = `tel:${this.bus.driverPhone}`;
    }
  }

  callConductor(): void {
    if (this.bus?.conductorPhone) {
      window.location.href = `tel:${this.bus.conductorPhone}`;
    }
  }

  refreshLocation(): void {
    if (this.bus) {
      // In real app, this would trigger a location update request
      this.loadBusDetails();
    }
  }

  getStatusName(status: BusStatus): string {
    return status.replace(/_/g, ' ');
  }

  getStatusClass(status: BusStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  getStatusIcon(status: BusStatus): string {
    switch (status) {
      case BusStatus.ON_ROUTE:
        return 'navigation';
      case BusStatus.AT_SCHOOL:
        return 'school';
      case BusStatus.RETURNING:
        return 'arrow_back';
      case BusStatus.DELAYED:
        return 'schedule';
      case BusStatus.BREAKDOWN:
        return 'warning';
      default:
        return 'directions_bus';
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

