import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  SchoolBus,
  BusStatus,
  BusLocation,
  BusRoute,
  SchoolBusStatistics,
  SchoolBusFilter
} from '../models/school-bus-tracking.model';

@Component({
  selector: 'app-school-bus-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="school-bus-tracking-container">
      <div class="page-header">
        <div class="page-header-text">
          <h1><i class="material-icons">school</i> School Bus Tracking</h1>
          <p>Track school buses, routes, and live GPS for your society</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/school-buses</strong> API — no demo records.</span>
          </div>
        </div>
        <div class="header-actions">
          <a class="btn-primary" routerLink="/admin/visitors/school-bus/add">
            <i class="material-icons">add</i>
            <span>Add School Bus</span>
          </a>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">directions_bus</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalBuses }}</div>
            <div class="stat-label">Total Buses</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">radio_button_checked</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeBuses }}</div>
            <div class="stat-label">Active</div>
          </div>
        </div>
        <div class="stat-card on-route">
          <div class="stat-icon">
            <i class="material-icons">navigation</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onRoute }}</div>
            <div class="stat-label">On Route</div>
          </div>
        </div>
        <div class="stat-card students">
          <div class="stat-icon">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.studentsOnBoard }}/{{ statistics.totalStudents }}</div>
            <div class="stat-label">Students On Board</div>
          </div>
        </div>
        <div class="stat-card delayed">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.delayed }}</div>
            <div class="stat-label">Delayed</div>
          </div>
        </div>
        <div class="stat-card speed">
          <div class="stat-icon">
            <i class="material-icons">speed</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.averageSpeed }} km/h</div>
            <div class="stat-label">Avg Speed</div>
          </div>
        </div>
      </div>

      <!-- Map View Toggle -->
      <div class="view-toggle">
        <button 
          class="toggle-btn" 
          [class.active]="viewMode === 'list'"
          (click)="viewMode = 'list'">
          <i class="material-icons">list</i>
          List View
        </button>
        <button 
          class="toggle-btn" 
          [class.active]="viewMode === 'map'"
          (click)="viewMode = 'map'">
          <i class="material-icons">map</i>
          Map View
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <input 
          type="text" 
          placeholder="Search by bus number, driver, vehicle..." 
          [(ngModel)]="filter.searchTerm"
          (input)="applyFilters()"
          class="search-input">
        <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
          <option value="">All Status</option>
          <option [value]="BusStatus.NOT_STARTED">Not Started</option>
          <option [value]="BusStatus.ON_ROUTE">On Route</option>
          <option [value]="BusStatus.AT_SCHOOL">At School</option>
          <option [value]="BusStatus.RETURNING">Returning</option>
          <option [value]="BusStatus.DELAYED">Delayed</option>
          <option [value]="BusStatus.BREAKDOWN">Breakdown</option>
        </select>
        <button class="btn-refresh" (click)="refreshData()" [disabled]="isRefreshing">
          <i class="material-icons">{{ isRefreshing ? 'hourglass_empty' : 'refresh' }}</i>
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <!-- List View -->
      <div class="buses-list" *ngIf="viewMode === 'list' && !isLoading && buses.length > 0">
        <div *ngFor="let bus of buses" class="bus-card" [ngClass]="getStatusClass(bus.status)">
          <div class="bus-card-header">
            <div class="bus-info">
              <div class="bus-number">{{ bus.busNumber }}</div>
              <div class="vehicle-number">{{ bus.vehicleNumber }}</div>
            </div>
            <div class="status-badge" [ngClass]="getStatusClass(bus.status)">
              <i class="material-icons">{{ getStatusIcon(bus.status) }}</i>
              {{ getStatusName(bus.status) }}
            </div>
          </div>

          <div class="bus-card-body">
            <div class="info-grid">
              <div class="info-item">
                <label>Driver</label>
                <span class="value">{{ bus.driverName }}</span>
                <span class="phone">{{ bus.driverPhone }}</span>
              </div>
              <div class="info-item">
                <label>Route</label>
                <span class="value">{{ bus.route?.routeName || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Students</label>
                <span class="value">{{ bus.studentCount }}/{{ bus.maxCapacity }}</span>
              </div>
              <div class="info-item" *ngIf="bus.currentLocation">
                <label>Current Location</label>
                <span class="value">{{ formatLocation(bus.currentLocation) }}</span>
              </div>
              <div class="info-item" *ngIf="bus.currentLocation?.speed as speed">
                <label>Speed</label>
                <span class="value">{{ speed }} km/h</span>
              </div>
              <div class="info-item" *ngIf="bus.lastLocationUpdate">
                <label>Last Update</label>
                <span class="value">{{ formatTime(bus.lastLocationUpdate) }}</span>
              </div>
            </div>

            <div class="location-indicator" *ngIf="bus.isLocationTrackingEnabled">
              <i class="material-icons" [ngClass]="{'tracking': bus.currentLocation, 'offline': !bus.currentLocation}">
                {{ bus.currentLocation ? 'location_on' : 'location_off' }}
              </i>
              <span>{{ bus.currentLocation ? 'Live Tracking' : 'Tracking Offline' }}</span>
            </div>

            <div class="bus-actions">
              <button class="btn-action btn-view" (click)="viewBusDetails(bus)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
              <button class="btn-action btn-location" (click)="viewOnMap(bus)" *ngIf="bus.currentLocation">
                <i class="material-icons">map</i>
                View on Map
              </button>
              <button class="btn-action btn-call" (click)="callDriver(bus.driverPhone)">
                <i class="material-icons">phone</i>
                Call Driver
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Map View -->
      <div class="map-container" *ngIf="viewMode === 'map'">
        <div class="map-placeholder">
          <i class="material-icons">map</i>
          <h3>Interactive Map View</h3>
          <p>Real-time bus locations would be displayed here</p>
          <p class="map-note">In production, integrate with Google Maps or Mapbox API</p>
          <div class="map-legend">
            <div class="legend-item">
              <div class="legend-marker on-route"></div>
              <span>On Route</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker at-school"></div>
              <span>At School</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker returning"></div>
              <span>Returning</span>
            </div>
            <div class="legend-item">
              <div class="legend-marker delayed"></div>
              <span>Delayed</span>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!isLoading && buses.length === 0">
        <i class="material-icons empty-hero-icon">directions_bus</i>
        <h3>No School Buses Found</h3>
        <p *ngIf="loadError">{{ loadError }}</p>
        <p *ngIf="!loadError && (filter.searchTerm || filter.status)">No buses match your filters.</p>
        <p *ngIf="!loadError && !filter.searchTerm && !filter.status">Add a school bus to start tracking for your society.</p>
        <div class="empty-state-actions" *ngIf="!filter.searchTerm && !filter.status">
          <a class="btn-primary" routerLink="/admin/visitors/school-bus/add">
            <i class="material-icons">add</i>
            <span>Add School Bus</span>
          </a>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading buses...</p>
      </div>
    </div>
  `,
  styles: [`
    .school-bus-tracking-container {
      padding: 0;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .page-header-text {
      flex: 1;
      min-width: 0;
    }

    .header-actions {
      flex-shrink: 0;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-primary .material-icons {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .api-banner {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      color: #1b5e20;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .api-banner .material-icons {
      font-size: 20px;
      color: #2e7d32;
      flex-shrink: 0;
    }

    .load-error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      color: #721c24;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
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

    .stat-card.active .stat-icon {
      background: #28a745;
    }

    .stat-card.on-route .stat-icon {
      background: #17a2b8;
    }

    .stat-card.students .stat-icon {
      background: #ffc107;
    }

    .stat-card.delayed .stat-icon {
      background: #dc3545;
    }

    .stat-card.speed .stat-icon {
      background: #43e97b;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 24px;
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

    .view-toggle {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      background: white;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .toggle-btn {
      flex: 1;
      padding: 12px;
      border: none;
      background: transparent;
      border-radius: 6px;
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

    .toggle-btn.active {
      background: #667eea;
      color: white;
    }

    .filters-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-select {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-refresh {
      padding: 12px 24px;
      background: #667eea;
      color: white;
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

    .btn-refresh:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .buses-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .bus-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .bus-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .bus-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .bus-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bus-number {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .vehicle-number {
      font-size: 14px;
      color: #7f8c8d;
    }

    .status-badge {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-badge.not-started {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-badge.on-route {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.at-school {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.returning {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.delayed {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.breakdown {
      background: #f5c6cb;
      color: #721c24;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-item .value {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .info-item .phone {
      font-size: 13px;
      color: #667eea;
    }

    .location-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 500;
    }

    .location-indicator .material-icons.tracking {
      color: #28a745;
      animation: pulse 2s infinite;
    }

    .location-indicator .material-icons.offline {
      color: #dc3545;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .bus-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-action {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
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

    .btn-location {
      background: #28a745;
      color: white;
    }

    .btn-call {
      background: #43e97b;
      color: white;
    }

    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .map-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-height: 600px;
      margin-bottom: 24px;
    }

    .map-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .map-placeholder .material-icons {
      font-size: 80px;
      color: #ddd;
      margin-bottom: 20px;
    }

    .map-placeholder h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .map-placeholder p {
      margin: 0 0 8px 0;
      color: #7f8c8d;
    }

    .map-note {
      font-size: 13px;
      font-style: italic;
      color: #95a5a6;
    }

    .map-legend {
      display: flex;
      gap: 24px;
      margin-top: 32px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .legend-marker {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }

    .legend-marker.on-route {
      background: #17a2b8;
    }

    .legend-marker.at-school {
      background: #28a745;
    }

    .legend-marker.returning {
      background: #ffc107;
    }

    .legend-marker.delayed {
      background: #dc3545;
    }

    .empty-state,
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

    .empty-state .empty-hero-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0 0 20px;
      color: #7f8c8d;
    }

    .empty-state-actions {
      display: flex;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions .btn-primary,
      .empty-state-actions .btn-primary {
        width: 100%;
        max-width: 320px;
        margin: 0 auto;
        justify-content: center;
      }

      .statistics-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .filters-bar {
        flex-direction: column;
      }
    }
  `]
})
export class SchoolBusTrackingComponent implements OnInit, OnDestroy {
  buses: SchoolBus[] = [];
  statistics: SchoolBusStatistics | null = null;
  isLoading = false;
  isRefreshing = false;
  loadError = '';
  viewMode: 'list' | 'map' = 'list';
  filter: SchoolBusFilter = {};
  refreshInterval: any;

  BusStatus = BusStatus;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    // Auto-refresh every 30 seconds for real-time GPS updates
    this.refreshInterval = setInterval(() => {
      this.refreshData(true);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.buses = [];
      this.statistics = null;
      return;
    }

    this.visitorService.getAllSchoolBuses(this.filter).subscribe({
      next: buses => {
        this.buses = buses;
        this.isLoading = false;
      },
      error: error => {
        console.error('Error loading buses:', error);
        this.loadError = 'Failed to load school buses from the API. Ensure the backend is running.';
        this.isLoading = false;
        this.buses = [];
      }
    });

    this.visitorService.getSchoolBusStatistics().subscribe({
      next: stats => {
        this.statistics = stats;
      },
      error: error => {
        console.error('Error loading statistics:', error);
        if (!this.loadError) {
          this.loadError = 'Failed to load bus statistics from the API.';
        }
      }
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  refreshData(silent: boolean = false): void {
    if (!this.resolveSocietyId()) {
      if (!silent) {
        this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      }
      return;
    }

    if (!silent) {
      this.isRefreshing = true;
      this.loadError = '';
    }

    this.visitorService.getAllSchoolBuses(this.filter).subscribe({
      next: buses => {
        this.buses = buses;
        this.isRefreshing = false;
      },
      error: error => {
        console.error('Error refreshing buses:', error);
        if (!silent) {
          this.loadError = 'Failed to refresh school buses from the API.';
        }
        this.isRefreshing = false;
      }
    });

    this.visitorService.getSchoolBusStatistics().subscribe({
      next: stats => {
        this.statistics = stats;
      },
      error: error => {
        console.error('Error refreshing statistics:', error);
      }
    });
  }

  private resolveSocietyId(): string {
    const direct = localStorage.getItem('societyId');
    if (direct) return direct;
    for (const key of ['adminUser', 'adminSession'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { societyId?: string };
        if (parsed.societyId) return parsed.societyId;
      } catch {
        /* ignore */
      }
    }
    return '';
  }

  viewBusDetails(bus: SchoolBus): void {
    this.router.navigate(['/admin/visitors/school-bus', bus.id]);
  }

  viewOnMap(bus: SchoolBus): void {
    if (bus.currentLocation) {
      const url = `https://www.google.com/maps?q=${bus.currentLocation.latitude},${bus.currentLocation.longitude}`;
      window.open(url, '_blank');
    }
  }

  callDriver(phone: string): void {
    window.location.href = `tel:${phone}`;
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

  formatTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /** Human-readable location from GPS payload (address or coordinates). */
  formatLocation(loc: BusLocation): string {
    if (loc.address && !loc.address.toLowerCase().includes('(demo)')) {
      return loc.address;
    }
    if (loc.latitude != null && loc.longitude != null) {
      return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
    }
    return 'Location updating…';
  }
}

